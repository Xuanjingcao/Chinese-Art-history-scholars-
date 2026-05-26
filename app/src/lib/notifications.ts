import { getDb, ensureAuth, isCloudBaseAvailable, isCloudBaseEnabled } from './cloudbase';
import type { CloudBaseRecord } from './cloudbase';

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

const LOCAL_NOTIFICATIONS_KEY = 'local_notifications';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function getDocId(doc: CloudBaseRecord): string {
  return readString(doc._id);
}

function cloudRecordToNotification(doc: CloudBaseRecord): Notification {
  return {
    id: getDocId(doc),
    toUserId: readString(doc.toUserId),
    toUserName: readString(doc.toUserName),
    fromUserId: readString(doc.fromUserId),
    fromUserName: readString(doc.fromUserName),
    professorId: readString(doc.professorId),
    professorName: readString(doc.professorName),
    commentId: readString(doc.commentId),
    content: readString(doc.content),
    isRead: Boolean(doc.isRead),
    createdAt: readString(doc.createdAt),
  };
}

function getLocalNotifications(): Notification[] {
  try {
    const raw = localStorage.getItem(LOCAL_NOTIFICATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalNotifications(notifications: Notification[]): void {
  localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(notifications));
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

  if (!isCloudBaseEnabled() || !(await isCloudBaseAvailable())) {
    const notifications = getLocalNotifications();
    notifications.unshift({
      id: `local_notification_${Date.now()}_${Math.random().toString(36).slice(2)}`,
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
    saveLocalNotifications(notifications);
    return;
  }

  try {
    await ensureAuth();
    const db = await getDb();
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
  } catch (e) {
    console.warn('[Notification] Create failed:', getErrorMessage(e));
  }
}

// Get notifications for a user by userId
export async function getNotifications(userId: string): Promise<Notification[]> {
  if (!userId) return [];
  if (!isCloudBaseEnabled() || !(await isCloudBaseAvailable())) {
    return getLocalNotifications()
      .filter(n => n.toUserId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  try {
    await ensureAuth();
    const db = await getDb();
    const result = await db.collection('notifications')
      .where({ toUserId: userId })
      .orderBy('createdAt', 'desc')
      .get();

    return result.data.map(cloudRecordToNotification);
  } catch (e) {
    console.warn('[Notification] Load failed:', getErrorMessage(e));
    return [];
  }
}

// Mark a notification as read
export async function markAsRead(notificationId: string): Promise<void> {
  if (!isCloudBaseEnabled() || !(await isCloudBaseAvailable())) {
    saveLocalNotifications(getLocalNotifications().map(n =>
      n.id === notificationId ? { ...n, isRead: true } : n,
    ));
    return;
  }

  try {
    await ensureAuth();
    const db = await getDb();
    await db.collection('notifications').doc(notificationId).update({
      isRead: true,
    });
  } catch (e) {
    console.warn('[Notification] Mark read failed:', getErrorMessage(e));
  }
}

// Mark all notifications as read for a user by userId
export async function markAllAsRead(userId: string): Promise<void> {
  if (!userId) return;
  if (!isCloudBaseEnabled() || !(await isCloudBaseAvailable())) {
    saveLocalNotifications(getLocalNotifications().map(n =>
      n.toUserId === userId ? { ...n, isRead: true } : n,
    ));
    return;
  }

  try {
    await ensureAuth();
    const db = await getDb();
    const result = await db.collection('notifications')
      .where({ toUserId: userId, isRead: false })
      .get();

    const updates = result.data.map((doc) =>
      db.collection('notifications').doc(getDocId(doc)).update({ isRead: true }),
    );

    await Promise.all(updates);
  } catch (e) {
    console.warn('[Notification] Mark all read failed:', getErrorMessage(e));
  }
}

// Count unread notifications by userId
export async function getUnreadCount(userId: string): Promise<number> {
  if (!userId) return 0;
  if (!isCloudBaseEnabled() || !(await isCloudBaseAvailable())) {
    return getLocalNotifications().filter(n => n.toUserId === userId && !n.isRead).length;
  }

  try {
    await ensureAuth();
    const db = await getDb();
    const result = await db.collection('notifications')
      .where({ toUserId: userId, isRead: false })
      .count();

    return result.total || 0;
  } catch (e) {
    console.warn('[Notification] Count failed:', getErrorMessage(e));
    return 0;
  }
}
