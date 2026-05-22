import { getDb, ensureAuth, isCloudBaseEnabled } from './cloudbase';

export interface Comment {
  id: string;
  name: string;
  content: string;
  time: string;
  isAnonymous: boolean;
  replyTo?: string;
  replyToName?: string;
  parentId?: string;
  replies: Comment[];
  featured?: boolean;
  professorId?: string;
  ownerUserId?: string;    // = CloudBase _openid
  likes?: number;
  dislikes?: number;
  userVote?: 'like' | 'dislike' | null;
}

type FlatComment = Omit<Comment, 'replies' | 'time' | 'userVote'> & { createdAt: string };

const LOCAL_COMMENTS_KEY = 'local_comments';
const LOCAL_COMMENT_VOTES_KEY = 'local_comment_votes';

function getLocalComments(): FlatComment[] {
  try {
    const raw = localStorage.getItem(LOCAL_COMMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalComments(comments: FlatComment[]): void {
  localStorage.setItem(LOCAL_COMMENTS_KEY, JSON.stringify(comments));
}

function getLocalVoteMap(): Record<string, 'like' | 'dislike'> {
  try {
    const raw = localStorage.getItem(LOCAL_COMMENT_VOTES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalVoteMap(votes: Record<string, 'like' | 'dislike'>): void {
  localStorage.setItem(LOCAL_COMMENT_VOTES_KEY, JSON.stringify(votes));
}

function toComment(doc: FlatComment): Comment {
  return {
    ...doc,
    time: doc.createdAt
      ? new Date(doc.createdAt).toLocaleDateString('zh-CN')
      : new Date().toLocaleDateString('zh-CN'),
    replies: [],
  };
}

function buildCommentTree(comments: FlatComment[], currentUserId?: string): Comment[] {
  const votes = getLocalVoteMap();
  const allComments = comments.map(doc => ({
    ...toComment(doc),
    userVote: currentUserId ? votes[`${currentUserId}:${doc.id}`] || null : null,
  }));

  const topLevel: Comment[] = [];
  const replyMap: Record<string, Comment[]> = {};

  allComments.forEach(c => {
    if (c.parentId) {
      if (!replyMap[c.parentId]) replyMap[c.parentId] = [];
      replyMap[c.parentId].push(c);
    } else {
      topLevel.push(c);
    }
  });

  return topLevel.map(c => ({
    ...c,
    replies: replyMap[c.id] || [],
  }));
}

// ---------- comment_votes collection helpers ----------

export async function getMyVotes(commentIds: string[], userId: string): Promise<Record<string, 'like' | 'dislike'>> {
  if (!commentIds.length || !userId) return {};
  if (!isCloudBaseEnabled()) {
    const votes = getLocalVoteMap();
    return commentIds.reduce<Record<string, 'like' | 'dislike'>>((acc, commentId) => {
      const vote = votes[`${userId}:${commentId}`];
      if (vote) acc[commentId] = vote;
      return acc;
    }, {});
  }

  try {
    await ensureAuth();
    const db = await getDb();
    const command = db.command;
    const result = await db.collection('comment_votes')
      .where({
        userId,
        commentId: command.in(commentIds),
      })
      .get();

    const map: Record<string, 'like' | 'dislike'> = {};
    result.data.forEach((doc: any) => {
      map[doc.commentId] = doc.voteType;
    });
    return map;
  } catch (e: any) {
    console.warn('[Comments] getMyVotes failed:', e.message || e);
    return {};
  }
}

/**
 * Vote on a comment using comment_votes collection.
 * Rules:
 * 1. Each user has one vote per comment (commentId + username unique)
 * 2. Clicking the same button again removes the vote and decrements the counter
 * 3. Switching vote type transfers the count (like-1, dislike+1 or vice versa)
 * 4. Uses CloudBase atomic increment to avoid race conditions
 */
export async function voteComment(
  commentId: string,
  action: 'like' | 'dislike',
  userId: string,
): Promise<'added' | 'removed' | 'switched' | null> {
  if (!userId) {
    alert('请先登录');
    return null;
  }
  if (!isCloudBaseEnabled()) {
    const voteKey = `${userId}:${commentId}`;
    const votes = getLocalVoteMap();
    const comments = getLocalComments();
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return null;

    const prevType = votes[voteKey] || null;
    if (prevType === action) {
      delete votes[voteKey];
      const field = action === 'like' ? 'likes' : 'dislikes';
      comment[field] = Math.max(0, (comment[field] || 0) - 1);
      saveLocalVoteMap(votes);
      saveLocalComments(comments);
      return 'removed';
    }

    if (prevType && prevType !== action) {
      const decField = prevType === 'like' ? 'likes' : 'dislikes';
      const incField = action === 'like' ? 'likes' : 'dislikes';
      comment[decField] = Math.max(0, (comment[decField] || 0) - 1);
      comment[incField] = (comment[incField] || 0) + 1;
      votes[voteKey] = action;
      saveLocalVoteMap(votes);
      saveLocalComments(comments);
      return 'switched';
    }

    const incField = action === 'like' ? 'likes' : 'dislikes';
    comment[incField] = (comment[incField] || 0) + 1;
    votes[voteKey] = action;
    saveLocalVoteMap(votes);
    saveLocalComments(comments);
    return 'added';
  }

  try {
    await ensureAuth();
    const db = await getDb();
    const command = db.command;

    // 1. Check existing vote for this user + comment
    const existing = await db.collection('comment_votes')
      .where({ commentId, userId })
      .get();

    const prevVote = existing.data.length > 0 ? existing.data[0] : null;
    const prevType = prevVote ? prevVote.voteType as 'like' | 'dislike' : null;
    const prevDocId = prevVote ? prevVote._id : null;

    // 2. Same button clicked again -> remove vote
    if (prevType === action) {
      // Remove vote record
      if (prevDocId) {
        await db.collection('comment_votes').doc(prevDocId).remove();
      }
      // Atomic decrement on comments collection
      const field = action === 'like' ? 'likes' : 'dislikes';
      await db.collection('comments').doc(commentId).update({
        [field]: command.inc(-1),
      });
      return 'removed';
    }

    // 3. Switching vote type
    if (prevType && prevType !== action) {
      // Update vote record to new type
      if (prevDocId) {
        await db.collection('comment_votes').doc(prevDocId).update({
          voteType: action,
          updatedAt: new Date().toISOString(),
        });
      }
      // Decrement old type, increment new type (both atomic)
      const decField = prevType === 'like' ? 'likes' : 'dislikes';
      const incField = action === 'like' ? 'likes' : 'dislikes';
      await db.collection('comments').doc(commentId).update({
        [decField]: command.inc(-1),
        [incField]: command.inc(1),
      });
      return 'switched';
    }

    // 4. New vote (no previous vote)
    await db.collection('comment_votes').add({
      commentId,
      userId,
      voteType: action,
      createdAt: new Date().toISOString(),
    });
    const incField = action === 'like' ? 'likes' : 'dislikes';
    await db.collection('comments').doc(commentId).update({
      [incField]: command.inc(1),
    });
    return 'added';
  } catch (e: any) {
    console.warn('[Comments] voteComment failed:', e.message || e);
    return null;
  }
}

// ---------- comments collection CRUD ----------

export async function getComments(profId: string, currentUserId?: string): Promise<Comment[]> {
  if (!isCloudBaseEnabled()) {
    const comments = getLocalComments()
      .filter(c => c.professorId === profId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return buildCommentTree(comments, currentUserId);
  }

  try {
    await ensureAuth();
    const db = await getDb();
    const result = await db.collection('comments')
      .where({ professorId: profId })
      .orderBy('createdAt', 'desc')
      .get();

    const allComments = result.data.map((doc: any) => ({
      id: doc._id as string,
      name: (doc.name || '匿名用户') as string,
      content: (doc.content || '') as string,
      time: doc.createdAt
        ? new Date(doc.createdAt).toLocaleDateString('zh-CN')
        : new Date().toLocaleDateString('zh-CN'),
      isAnonymous: !!doc.isAnonymous,
      replyTo: (doc.replyTo || '') as string,
      replyToName: (doc.replyToName || '') as string,
      parentId: (doc.parentId || '') as string,
      professorId: (doc.professorId || '') as string,
      featured: !!doc.featured,
      ownerUserId: (doc.ownerUserId || '') as string,
      likes: (doc.likes || 0) as number,
      dislikes: (doc.dislikes || 0) as number,
      replies: [] as Comment[],
    }));

    // Fetch user's votes for all comments
    if (currentUserId) {
      const allIds = allComments.map((c: any) => c.id);
      const voteMap = await getMyVotes(allIds, currentUserId);
      allComments.forEach((c: any) => {
        c.userVote = voteMap[c.id] || null;
      });
    }

    // Build tree: separate top-level comments and replies
    const topLevel: Comment[] = [];
    const replyMap: Record<string, Comment[]> = {};

    allComments.forEach((c: any) => {
      if (c.parentId && c.parentId !== '') {
        if (!replyMap[c.parentId]) replyMap[c.parentId] = [];
        replyMap[c.parentId].push(c as Comment);
      } else {
        topLevel.push(c as Comment);
      }
    });

    // Attach replies to top-level comments
    return topLevel.map(c => ({
      ...c,
      replies: replyMap[c.id] || [],
    }));
  } catch (e: any) {
    console.warn('[Comments] CloudBase read failed:', e.message || e);
    return [];
  }
}

// Get total comment count for a professor (including replies)
export async function getCommentCount(profId: string): Promise<number> {
  if (!isCloudBaseEnabled()) {
    return getLocalComments().filter(c => c.professorId === profId).length;
  }

  try {
    await ensureAuth();
    const db = await getDb();
    const result = await db.collection('comments')
      .where({ professorId: profId })
      .count();
    return result.total || 0;
  } catch (e: any) {
    console.warn('[Comments] Count failed:', e.message || e);
    return 0;
  }
}

// Delete a comment by ID (also deletes all replies)
export async function deleteComment(commentId: string): Promise<boolean> {
  if (!isCloudBaseEnabled()) {
    const comments = getLocalComments().filter(c => c.id !== commentId && c.parentId !== commentId);
    const votes = getLocalVoteMap();
    Object.keys(votes).forEach(key => {
      if (key.endsWith(`:${commentId}`)) delete votes[key];
    });
    saveLocalComments(comments);
    saveLocalVoteMap(votes);
    return true;
  }

  try {
    await ensureAuth();
    const db = await getDb();
    // Delete the main comment
    await db.collection('comments').doc(commentId).remove();
    // Also delete all replies
    const replies = await db.collection('comments')
      .where({ parentId: commentId })
      .get();
    for (const reply of replies.data) {
      await db.collection('comments').doc(reply._id).remove();
    }
    // Delete associated votes
    const votes = await db.collection('comment_votes')
      .where({ commentId })
      .get();
    for (const v of votes.data) {
      await db.collection('comment_votes').doc(v._id).remove();
    }
    return true;
  } catch (e: any) {
    console.warn('[Comments] Delete failed:', e.message || e);
    return false;
  }
}

// Toggle featured status for a comment
export async function toggleFeatured(commentId: string, featured: boolean): Promise<boolean> {
  if (!isCloudBaseEnabled()) {
    const comments = getLocalComments();
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return false;
    comment.featured = featured;
    saveLocalComments(comments);
    return true;
  }

  try {
    await ensureAuth();
    const db = await getDb();
    console.log(`[Comments] Toggling featured for ${commentId} to ${featured}`);
    await db.collection('comments').doc(commentId).update({ featured });
    console.log(`[Comments] Successfully toggled featured for ${commentId}`);
    return true;
  } catch (e: any) {
    console.error('[Comments] Toggle featured failed:', e.code || e.message || e);
    return false;
  }
}

// Get all featured comments
export async function getFeaturedComments(): Promise<Comment[]> {
  if (!isCloudBaseEnabled()) {
    return getLocalComments()
      .filter(c => c.featured)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toComment);
  }

  try {
    await ensureAuth();
    const db = await getDb();
    const result = await db.collection('comments')
      .where({ featured: true })
      .orderBy('createdAt', 'desc')
      .get();

    return result.data.map((doc: any) => ({
      id: doc._id as string,
      name: (doc.name || '匿名用户') as string,
      content: (doc.content || '') as string,
      time: doc.createdAt
        ? new Date(doc.createdAt).toLocaleDateString('zh-CN')
        : new Date().toLocaleDateString('zh-CN'),
      isAnonymous: !!doc.isAnonymous,
      replyTo: (doc.replyTo || '') as string,
      replyToName: (doc.replyToName || '') as string,
      parentId: (doc.parentId || '') as string,
      featured: true,
      professorId: (doc.professorId || '') as string,
      ownerUserId: (doc.ownerUserId || '') as string,
      likes: (doc.likes || 0) as number,
      dislikes: (doc.dislikes || 0) as number,
      replies: [],
    }));
  } catch (e: any) {
    console.warn('[Comments] Get featured failed:', e.message || e);
    return [];
  }
}

export async function addComment(
  profId: string,
  name: string,
  content: string,
  isAnonymous: boolean,
  replyTo?: string,
  replyToName?: string,
  parentId?: string,
  ownerUserId?: string,
): Promise<Comment | null> {
  if (!isCloudBaseEnabled()) {
    const displayName = isAnonymous ? '匿名用户' : (name.trim() || '匿名用户');
    const now = new Date().toISOString();
    const comment: FlatComment = {
      id: `local_comment_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      professorId: profId,
      name: displayName,
      content: content.trim(),
      isAnonymous,
      replyTo: replyTo || '',
      replyToName: replyToName || '',
      parentId: parentId || '',
      ownerUserId: ownerUserId || '',
      likes: 0,
      dislikes: 0,
      createdAt: now,
    };
    const comments = getLocalComments();
    comments.unshift(comment);
    saveLocalComments(comments);
    return toComment(comment);
  }

  try {
    await ensureAuth();
    const db = await getDb();

    const displayName = isAnonymous ? '匿名用户' : (name.trim() || '匿名用户');

    const result = await db.collection('comments').add({
      professorId: profId,
      name: displayName,
      content: content.trim(),
      isAnonymous,
      replyTo: replyTo || '',
      replyToName: replyToName || '',
      parentId: parentId || '',
      ownerUserId: ownerUserId || '',
      likes: 0,
      dislikes: 0,
      createdAt: new Date().toISOString(),
    });

    return {
      id: result.id as string,
      name: displayName,
      content: content.trim(),
      time: new Date().toLocaleDateString('zh-CN'),
      isAnonymous,
      replyTo: replyTo || '',
      replyToName: replyToName || '',
      parentId: parentId || '',
      replies: [],
      ownerUserId: ownerUserId || '',
      likes: 0,
      dislikes: 0,
    };
  } catch (e: any) {
    console.warn('[Comments] CloudBase write failed:', e.message || e);
    return null;
  }
}
