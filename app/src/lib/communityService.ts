import { canPublishCommunityDraft, normalizeCommunityDraft } from './communityRules.ts';
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
        status: 'draft',
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

export const communityService = typeof window === 'undefined'
  ? null
  : createCommunityService({ storage: window.localStorage, cloud: null });
