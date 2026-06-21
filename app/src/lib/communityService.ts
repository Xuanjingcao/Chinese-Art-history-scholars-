import { canPublishCommunityDraft, normalizeCommunityDraft } from './communityRules.ts';
import {
  getDb,
  isCloudBaseAvailable,
  resolveCommunityImageUrls,
  uploadCommunityImage,
  type CloudBaseRecord,
} from './cloudbase.ts';
import type {
  CommunityComment,
  CommunityDraft,
  CommunityPost,
  CommunityPostStatus,
  CommunityTopic,
} from '../types/community.ts';

type ReactionType = 'like' | 'bookmark';
type ReactionRecord = { userId: string; postId: string; type: ReactionType };

const POSTS_KEY = 'community_posts_v1';
const COMMENTS_KEY = 'community_comments_v1';
const REACTIONS_KEY = 'community_reactions_v1';

interface CommunityServiceDependencies {
  storage: Storage;
  cloud: null;
  now?: () => string;
  id?: () => string;
}

export interface CommunityService {
  listPublished(topic?: CommunityTopic | ''): Promise<CommunityPost[]>;
  getPost(postId: string, userId?: string): Promise<CommunityPost | null>;
  listMine(userId: string, status?: CommunityPostStatus): Promise<CommunityPost[]>;
  saveDraft(userId: string, nickname: string, draft: CommunityDraft): Promise<CommunityPost>;
  publishPost(userId: string, nickname: string, draftId: string): Promise<CommunityPost>;
  updatePost(userId: string, postId: string, draft: CommunityDraft): Promise<CommunityPost | null>;
  deletePost(userId: string, postId: string): Promise<boolean>;
  toggleReaction(userId: string, postId: string, type: ReactionType): Promise<{ active: boolean }>;
  listComments(postId: string): Promise<CommunityComment[]>;
  addComment(userId: string, nickname: string, postId: string, content: string): Promise<CommunityComment>;
  deleteComment(userId: string, commentId: string): Promise<boolean>;
}

export function createCommunityDraftSaveQueue(
  write: (draft: CommunityDraft) => Promise<CommunityPost>,
): (draft: CommunityDraft) => Promise<CommunityPost> {
  let latestDraftId = '';
  let tail: Promise<void> = Promise.resolve();

  return (draft) => {
    const task = tail.then(() => write({
      ...draft,
      id: draft.id || latestDraftId || undefined,
    }));
    tail = task.then(
      (saved) => { latestDraftId = saved.id; },
      () => undefined,
    );
    return task;
  };
}

function parseList<T>(storage: Storage, key: string): T[] {
  try {
    const value = storage.getItem(key);
    return value ? JSON.parse(value) as T[] : [];
  } catch {
    return [];
  }
}

function saveList<T>(storage: Storage, key: string, values: T[]) {
  storage.setItem(key, JSON.stringify(values));
}

function defaultId() {
  return globalThis.crypto?.randomUUID?.() || `community-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createCommunityService({
  storage,
  now = () => new Date().toISOString(),
  id = defaultId,
}: CommunityServiceDependencies): CommunityService {
  const readPosts = () => parseList<CommunityPost>(storage, POSTS_KEY);
  const writePosts = (posts: CommunityPost[]) => saveList(storage, POSTS_KEY, posts);
  const readComments = () => parseList<CommunityComment>(storage, COMMENTS_KEY);
  const writeComments = (comments: CommunityComment[]) => saveList(storage, COMMENTS_KEY, comments);
  const readReactions = () => parseList<ReactionRecord>(storage, REACTIONS_KEY);
  const writeReactions = (reactions: ReactionRecord[]) => saveList(storage, REACTIONS_KEY, reactions);

  const withUserReactions = (post: CommunityPost, userId?: string): CommunityPost => {
    if (!userId) return post;
    const reactions = readReactions().filter((reaction) => reaction.postId === post.id && reaction.userId === userId);
    return {
      ...post,
      likedByCurrentUser: reactions.some((reaction) => reaction.type === 'like'),
      bookmarkedByCurrentUser: reactions.some((reaction) => reaction.type === 'bookmark'),
    };
  };

  return {
    async listPublished(topic = '') {
      return readPosts()
        .filter((post) => post.status === 'published' && (!topic || post.topic === topic))
        .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    },

    async getPost(postId, userId) {
      const post = readPosts().find((item) => item.id === postId && item.status !== 'deleted');
      return post ? withUserReactions(post, userId) : null;
    },

    async listMine(userId, status) {
      return readPosts()
        .filter((post) => post.userId === userId && post.status !== 'deleted' && (!status || post.status === status))
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    },

    async saveDraft(userId, nickname, draft) {
      const posts = readPosts();
      const timestamp = now();
      const existing = draft.id ? posts.find((post) => post.id === draft.id && post.userId === userId) : undefined;
      const post: CommunityPost = {
        ...normalizeCommunityDraft(draft),
        id: existing?.id || id(),
        userId,
        nickname,
        status: existing?.status === 'published' ? 'published' : 'draft',
        likes: existing?.likes || 0,
        comments: existing?.comments || 0,
        bookmarks: existing?.bookmarks || 0,
        createdAt: existing?.createdAt || timestamp,
        updatedAt: timestamp,
        publishedAt: existing?.publishedAt || '',
      };
      writePosts(existing ? posts.map((item) => item.id === post.id ? post : item) : [post, ...posts]);
      return post;
    },

    async publishPost(userId, nickname, draftId) {
      const posts = readPosts();
      const existing = posts.find((post) => post.id === draftId && post.userId === userId && post.status === 'draft');
      if (!existing) throw new Error('草稿不存在或无权发布');
      const errors = canPublishCommunityDraft(existing);
      if (errors.length) throw new Error(errors[0]);
      const timestamp = now();
      const post: CommunityPost = {
        ...existing,
        nickname,
        status: 'published',
        updatedAt: timestamp,
        publishedAt: timestamp,
      };
      writePosts(posts.map((item) => item.id === post.id ? post : item));
      return post;
    },

    async updatePost(userId, postId, draft) {
      const posts = readPosts();
      const existing = posts.find((post) => post.id === postId && post.userId === userId && post.status !== 'deleted');
      if (!existing) return null;
      const updated: CommunityPost = { ...existing, ...normalizeCommunityDraft(draft), id: postId, userId, updatedAt: now() };
      writePosts(posts.map((post) => post.id === postId ? updated : post));
      return updated;
    },

    async deletePost(userId, postId) {
      const posts = readPosts();
      const existing = posts.find((post) => post.id === postId && post.userId === userId && post.status !== 'deleted');
      if (!existing) return false;
      writePosts(posts.map((post) => post.id === postId ? { ...post, status: 'deleted', updatedAt: now() } : post));
      return true;
    },

    async toggleReaction(userId, postId, type) {
      const posts = readPosts();
      const post = posts.find((item) => item.id === postId && item.status === 'published');
      if (!post) throw new Error('帖子不存在');
      const reactions = readReactions();
      const index = reactions.findIndex((reaction) => reaction.userId === userId && reaction.postId === postId && reaction.type === type);
      const active = index < 0;
      if (active) reactions.push({ userId, postId, type });
      else reactions.splice(index, 1);
      writeReactions(reactions);
      const countKey = type === 'like' ? 'likes' : 'bookmarks';
      writePosts(posts.map((item) => item.id === postId
        ? { ...item, [countKey]: Math.max(0, item[countKey] + (active ? 1 : -1)) }
        : item));
      return { active };
    },

    async listComments(postId) {
      return readComments()
        .filter((comment) => comment.postId === postId)
        .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    },

    async addComment(userId, nickname, postId, content) {
      const value = content.trim();
      if (!value) throw new Error('评论不能为空');
      if (value.length > 1000) throw new Error('评论最多 1000 字');
      const comments = readComments();
      const comment: CommunityComment = { id: id(), postId, userId, nickname, content: value, createdAt: now() };
      writeComments([...comments, comment]);
      const posts = readPosts();
      writePosts(posts.map((post) => post.id === postId ? { ...post, comments: post.comments + 1 } : post));
      return comment;
    },

    async deleteComment(userId, commentId) {
      const comments = readComments();
      const existing = comments.find((comment) => comment.id === commentId && comment.userId === userId);
      if (!existing) return false;
      writeComments(comments.filter((comment) => comment.id !== commentId));
      const posts = readPosts();
      writePosts(posts.map((post) => post.id === existing.postId
        ? { ...post, comments: Math.max(0, post.comments - 1) }
        : post));
      return true;
    },
  };
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function numberValue(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

async function recordToPost(record: CloudBaseRecord): Promise<CommunityPost> {
  const rawImages = Array.isArray(record.images) ? record.images as CommunityPost['images'] : [];
  const fileIds = rawImages.map((image) => image.fileId).filter((value): value is string => Boolean(value));
  let urls: Record<string, string> = {};
  try { urls = await resolveCommunityImageUrls(fileIds); } catch { /* retain stored source */ }
  return {
    id: stringValue(record._id) || stringValue(record.id),
    userId: stringValue(record.userId),
    nickname: stringValue(record.nickname, '用户'),
    status: stringValue(record.status, 'draft') as CommunityPostStatus,
    title: stringValue(record.title),
    body: stringValue(record.body),
    topic: stringValue(record.topic) as CommunityTopic | '',
    images: rawImages.map((image) => ({ ...image, source: image.fileId ? urls[image.fileId] || image.source : image.source })),
    coverImageId: stringValue(record.coverImageId),
    relatedProfessorId: stringValue(record.relatedProfessorId) || undefined,
    relatedUniversity: stringValue(record.relatedUniversity) || undefined,
    likes: numberValue(record.likes),
    comments: numberValue(record.comments),
    bookmarks: numberValue(record.bookmarks),
    createdAt: stringValue(record.createdAt),
    updatedAt: stringValue(record.updatedAt),
    publishedAt: stringValue(record.publishedAt),
  };
}

async function dataUrlToFile(source: string, name: string): Promise<File> {
  const blob = await (await fetch(source)).blob();
  return new File([blob], `${name}.jpg`, { type: blob.type || 'image/jpeg' });
}

async function persistCloudImages(userId: string, postId: string, images: CommunityPost['images']) {
  return Promise.all(images.map(async (image, index) => {
    if (image.fileId || !image.source.startsWith('data:')) return image;
    const file = await dataUrlToFile(image.source, image.id);
    const fileId = await uploadCommunityImage(file, `community/${userId}/${postId}/${index}-${image.id}.jpg`);
    return { ...image, fileId, source: image.source };
  }));
}

function cloudPostData(post: CommunityPost): CloudBaseRecord {
  const data = { ...post } as unknown as CloudBaseRecord;
  delete data.id;
  delete data.likedByCurrentUser;
  delete data.bookmarkedByCurrentUser;
  return data;
}

function createCloudCommunityService(): CommunityService {
  return {
    async listPublished(topic = '') {
      const db = await getDb();
      const where = topic ? { status: 'published', topic } : { status: 'published' };
      const result = await db.collection('community_posts').where(where).orderBy('publishedAt', 'desc').limit(100).get();
      return Promise.all(result.data.map(recordToPost));
    },
    async getPost(postId, userId) {
      const db = await getDb();
      const result = await db.collection('community_posts').doc(postId).get();
      if (!result.data || result.data.status === 'deleted') return null;
      const post = await recordToPost(result.data);
      if (userId) {
        const reactions = await db.collection('community_reactions').where({ userId, postId }).get();
        post.likedByCurrentUser = reactions.data.some((item) => item.reactionType === 'like');
        post.bookmarkedByCurrentUser = reactions.data.some((item) => item.reactionType === 'bookmark');
      }
      return post;
    },
    async listMine(userId, status) {
      const db = await getDb();
      const result = await db.collection('community_posts').where(status ? { userId, status } : { userId }).orderBy('updatedAt', 'desc').get();
      const posts = await Promise.all(result.data.map(recordToPost));
      return posts.filter((post) => post.status !== 'deleted');
    },
    async saveDraft(userId, nickname, draft) {
      const db = await getDb();
      const timestamp = new Date().toISOString();
      const existingResult = draft.id ? await db.collection('community_posts').doc(draft.id).get() : null;
      const existing = existingResult?.data ? await recordToPost(existingResult.data) : null;
      if (existing && existing.userId !== userId) throw new Error('无权修改这篇内容');
      const base: CommunityPost = {
        ...normalizeCommunityDraft(draft), id: existing?.id || '', userId, nickname,
        status: existing?.status === 'published' ? 'published' : 'draft',
        likes: existing?.likes || 0, comments: existing?.comments || 0, bookmarks: existing?.bookmarks || 0,
        createdAt: existing?.createdAt || timestamp, updatedAt: timestamp, publishedAt: existing?.publishedAt || '',
      };
      let postId = base.id;
      if (!postId) {
        const added = await db.collection('community_posts').add(cloudPostData(base));
        postId = stringValue(added.id);
        if (!postId) throw new Error('草稿保存失败');
      }
      const images = await persistCloudImages(userId, postId, base.images);
      const post = { ...base, id: postId, images };
      await db.collection('community_posts').doc(postId).update(cloudPostData(post));
      return post;
    },
    async publishPost(userId, nickname, draftId) {
      const db = await getDb();
      const result = await db.collection('community_posts').doc(draftId).get();
      if (!result.data) throw new Error('草稿不存在');
      const existing = await recordToPost(result.data);
      if (existing.userId !== userId) throw new Error('无权发布这篇内容');
      const errors = canPublishCommunityDraft(existing);
      if (errors.length) throw new Error(errors[0]);
      const timestamp = new Date().toISOString();
      const post = { ...existing, nickname, status: 'published' as const, updatedAt: timestamp, publishedAt: existing.publishedAt || timestamp };
      await db.collection('community_posts').doc(draftId).update(cloudPostData(post));
      return post;
    },
    async updatePost(userId, postId, draft) {
      const db = await getDb();
      const result = await db.collection('community_posts').doc(postId).get();
      if (!result.data) return null;
      const existing = await recordToPost(result.data);
      if (existing.userId !== userId || existing.status === 'deleted') return null;
      const images = await persistCloudImages(userId, postId, draft.images);
      const post = { ...existing, ...normalizeCommunityDraft({ ...draft, images }), id: postId, userId, updatedAt: new Date().toISOString() };
      await db.collection('community_posts').doc(postId).update(cloudPostData(post));
      return post;
    },
    async deletePost(userId, postId) {
      const db = await getDb();
      const result = await db.collection('community_posts').doc(postId).get();
      if (!result.data || result.data.userId !== userId) return false;
      await db.collection('community_posts').doc(postId).update({ status: 'deleted', updatedAt: new Date().toISOString() });
      return true;
    },
    async toggleReaction(userId, postId, type) {
      const db = await getDb();
      const result = await db.collection('community_reactions').where({ userId, postId, reactionType: type }).limit(1).get();
      const active = result.data.length === 0;
      if (active) await db.collection('community_reactions').add({ userId, postId, reactionType: type, createdAt: new Date().toISOString() });
      else await db.collection('community_reactions').doc(stringValue(result.data[0]._id)).remove();
      const countKey = type === 'like' ? 'likes' : 'bookmarks';
      await db.collection('community_posts').doc(postId).update({ [countKey]: db.command.inc(active ? 1 : -1) });
      return { active };
    },
    async listComments(postId) {
      const db = await getDb();
      const result = await db.collection('community_comments').where({ postId }).orderBy('createdAt', 'asc').get();
      return result.data.map((item) => ({
        id: stringValue(item._id), postId, userId: stringValue(item.userId), nickname: stringValue(item.nickname, '用户'),
        content: stringValue(item.content), createdAt: stringValue(item.createdAt),
      }));
    },
    async addComment(userId, nickname, postId, content) {
      const value = content.trim();
      if (!value) throw new Error('评论不能为空');
      if (value.length > 1000) throw new Error('评论最多 1000 字');
      const db = await getDb();
      const data = { postId, userId, nickname, content: value, createdAt: new Date().toISOString() };
      const result = await db.collection('community_comments').add(data);
      await db.collection('community_posts').doc(postId).update({ comments: db.command.inc(1) });
      return { id: stringValue(result.id), ...data };
    },
    async deleteComment(userId, commentId) {
      const db = await getDb();
      const result = await db.collection('community_comments').doc(commentId).get();
      if (!result.data || result.data.userId !== userId) return false;
      const postId = stringValue(result.data.postId);
      await db.collection('community_comments').doc(commentId).remove();
      await db.collection('community_posts').doc(postId).update({ comments: db.command.inc(-1) });
      return true;
    },
  };
}

function createBrowserCommunityService(storage: Storage): CommunityService {
  const local = createCommunityService({ storage, cloud: null });
  const cloud = createCloudCommunityService();
  const choose = async () => await isCloudBaseAvailable() ? cloud : local;
  return {
    listPublished: async (...args) => (await choose()).listPublished(...args),
    getPost: async (...args) => (await choose()).getPost(...args),
    listMine: async (...args) => (await choose()).listMine(...args),
    saveDraft: async (...args) => (await choose()).saveDraft(...args),
    publishPost: async (...args) => (await choose()).publishPost(...args),
    updatePost: async (...args) => (await choose()).updatePost(...args),
    deletePost: async (...args) => (await choose()).deletePost(...args),
    toggleReaction: async (...args) => (await choose()).toggleReaction(...args),
    listComments: async (...args) => (await choose()).listComments(...args),
    addComment: async (...args) => (await choose()).addComment(...args),
    deleteComment: async (...args) => (await choose()).deleteComment(...args),
  };
}

export const communityService = typeof window === 'undefined' ? null : createBrowserCommunityService(window.localStorage);
