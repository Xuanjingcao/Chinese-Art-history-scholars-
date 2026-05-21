import { db, ensureAuth } from './cloudbase';

const _ = db.command;

export interface Comment {
  id: string;
  name: string;
  content: string;
  time: string;
  isAnonymous: boolean;
  replyTo?: string;
  replyToName?: string;
  replies: Comment[];
  featured?: boolean;
  professorId?: string;
  ownerUserId?: string;    // = CloudBase _openid
  likes?: number;
  dislikes?: number;
  userVote?: 'like' | 'dislike' | null;
}

// ---------- comment_votes collection helpers ----------

export async function getMyVotes(commentIds: string[], userId: string): Promise<Record<string, 'like' | 'dislike'>> {
  if (!commentIds.length || !userId) return {};
  try {
    await ensureAuth();
    const result = await db.collection('comment_votes')
      .where({
        userId,
        commentId: _.in(commentIds),
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
  try {
    await ensureAuth();

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
        [field]: _.inc(-1),
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
        [decField]: _.inc(-1),
        [incField]: _.inc(1),
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
      [incField]: _.inc(1),
    });
    return 'added';
  } catch (e: any) {
    console.warn('[Comments] voteComment failed:', e.message || e);
    return null;
  }
}

// ---------- comments collection CRUD ----------

export async function getComments(profId: string, currentUserId?: string): Promise<Comment[]> {
  try {
    await ensureAuth();
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
  try {
    await ensureAuth();
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
  try {
    await ensureAuth();
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
  try {
    await ensureAuth();
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
  try {
    await ensureAuth();
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
  try {
    await ensureAuth();

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
