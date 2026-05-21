import { db, ensureAuth } from './cloudbase';

export interface Notification {
  id: string;
  toUserId: string;
  toUserName: string;
  fromUserId: string;
  fromUserName: string;
  professorId: string;
  professorName: string;
  commentId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

// Create a notification when someone replies to a comment
export async function createNotification(
  toUserId: string,
  toUserName: string,
  fromUserId: string,
  fromUserName: string,
  professorId: string,
  professorName: string,
  commentId: string,
  content: string,
): Promise<void> {
  if (!toUserId || !toUserName || toUserName === '匿名用户') return;
  if (toUserId === fromUserId) return; // Don't notify self

  try {
    await ensureAuth();
    await db.collection('notifications').add({
      toUserId,
      toUserName,
      fromUserId,
      fromUserName,
      professorId,
      professorName,
      commentId,
      content: content.length > 50 ? content.slice(0, 50) + '...' : content,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  } catch (e: any) {
    console.warn('[Notification] Create failed:', e.message || e);
  }
}

// Get notifications for a user by userId
export async function getNotifications(userId: string): Promise<Notification[]> {
  if (!userId) return [];
  try {
    await ensureAuth();
    const result = await db.collection('notifications')
      .where({ toUserId: userId })
      .orderBy('createdAt', 'desc')
      .get();

    return result.data.map((doc: any) => ({
      id: doc._id as string,
      toUserId: doc.toUserId as string,
      toUserName: doc.toUserName as string,
      fromUserId: doc.fromUserId as string,
      fromUserName: doc.fromUserName as string,
      professorId: doc.professorId as string,
      professorName: doc.professorName as string,
      commentId: doc.commentId as string,
      content: doc.content as string,
      isRead: !!doc.isRead,
      createdAt: doc.createdAt as string,
    }));
  } catch (e: any) {
    console.warn('[Notification] Load failed:', e.message || e);
    return [];
  }
}

// Mark a notification as read
export async function markAsRead(notificationId: string): Promise<void> {
  try {
    await ensureAuth();
    await db.collection('notifications').doc(notificationId).update({
      isRead: true,
    });
  } catch (e: any) {
    console.warn('[Notification] Mark read failed:', e.message || e);
  }
}

// Mark all notifications as read for a user by userId
export async function markAllAsRead(userId: string): Promise<void> {
  if (!userId) return;
  try {
    await ensureAuth();
    const result = await db.collection('notifications')
      .where({ toUserId: userId, isRead: false })
      .get();

    const updates = result.data.map((doc: any) =>
      db.collection('notifications').doc(doc._id).update({ isRead: true }),
    );

    await Promise.all(updates);
  } catch (e: any) {
    console.warn('[Notification] Mark all read failed:', e.message || e);
  }
}

// Count unread notifications by userId
export async function getUnreadCount(userId: string): Promise<number> {
  if (!userId) return 0;
  try {
    await ensureAuth();
    const result = await db.collection('notifications')
      .where({ toUserId: userId, isRead: false })
      .count();

    return result.total || 0;
  } catch (e: any) {
    console.warn('[Notification] Count failed:', e.message || e);
    return 0;
  }
}
