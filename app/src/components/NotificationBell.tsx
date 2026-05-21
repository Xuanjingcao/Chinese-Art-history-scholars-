import { useState, useEffect, useRef, useCallback } from 'react';
import { getNotifications, markAsRead, markAllAsRead, getUnreadCount } from '@/lib/notifications';
import type { Notification } from '@/lib/notifications';

interface NotificationBellProps {
  userId: string;
  professorNames: Record<string, string>;
  onProfessorClick: (profId: string) => void;
}

export default function NotificationBell({ userId, professorNames, onProfessorClick }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const [notifs, count] = await Promise.all([
        getNotifications(userId),
        getUnreadCount(userId),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (e) {
      console.warn('[NotificationBell] Load failed:', e);
    }
  }, [userId]);

  useEffect(() => {
    loadNotifications();
    // Poll every 30 seconds for new notifications
    intervalRef.current = setInterval(loadNotifications, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenPanel = async () => {
    const willShow = !showPanel;
    setShowPanel(willShow);
    if (willShow) {
      setLoading(true);
      await loadNotifications();
      setLoading(false);
    }
  };

  const handleReadOne = async (notif: Notification) => {
    await markAsRead(notif.id);
    setNotifications(prev =>
      prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n),
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleReadAll = async () => {
    await markAllAsRead(userId);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleClickProfessor = (notif: Notification) => {
    handleReadOne(notif);
    setShowPanel(false);
    onProfessorClick(notif.professorId);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={handleOpenPanel}
        className="relative p-2 transition-opacity hover:opacity-70"
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5c4030" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 font-kai text-[9px] min-w-[16px] h-4 flex items-center justify-center px-1"
            style={{
              backgroundColor: '#b03530',
              color: '#fff',
              borderRadius: '8px',
              fontWeight: 600,
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification panel */}
      {showPanel && (
        <div
          className="absolute right-0 top-full mt-2 w-[320px] max-h-[400px] overflow-y-auto"
          style={{
            backgroundColor: 'rgba(252, 248, 240, 0.98)',
            borderRadius: '12px',
            border: '1px solid rgba(30, 24, 16, 0.08)',
            boxShadow: '0 8px 32px rgba(30, 24, 16, 0.12)',
            backdropFilter: 'blur(12px)',
            zIndex: 1000,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(30,24,16,0.06)' }}>
            <span className="font-kai text-sm font-medium" style={{ color: '#1a1410' }}>消息</span>
            {unreadCount > 0 && (
              <button
                onClick={handleReadAll}
                className="font-kai text-[11px] transition-opacity hover:opacity-70"
                style={{ color: '#5c4030', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                全部已读
              </button>
            )}
          </div>

          {/* List */}
          {loading ? (
            <div className="px-4 py-6 text-center">
              <span className="font-kai text-xs" style={{ color: '#b0a898' }}>加载中...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <span className="font-kai text-xs" style={{ color: '#b0a898' }}>暂无消息</span>
            </div>
          ) : (
            <div>
              {notifications.map(notif => (
                <div
                  key={notif.id}
                  className="px-4 py-3 cursor-pointer transition-colors hover:bg-[rgba(92,64,48,0.04)]"
                  style={{
                    borderBottom: '1px solid rgba(30,24,16,0.04)',
                    backgroundColor: notif.isRead ? 'transparent' : 'rgba(92,64,48,0.03)',
                  }}
                  onClick={() => handleClickProfessor(notif)}
                >
                  <div className="flex items-start gap-2">
                    {/* Unread dot */}
                    {!notif.isRead && (
                      <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: '#b03530' }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-kai text-xs" style={{ color: '#4a3f32', lineHeight: 1.5 }}>
                        <span className="font-medium" style={{ color: '#5c4030' }}>{notif.fromUserName}</span>
                        {' '}回复了你在{' '}
                        <span className="font-medium" style={{ color: '#5c4030' }}>{notif.professorName || professorNames[notif.professorId] || '学者'}</span>
                        {' '}下的评论
                      </p>
                      <p className="font-kai text-[11px] mt-1 truncate" style={{ color: '#8a7d6e' }}>
                        {notif.content}
                      </p>
                      <span className="font-serif text-[10px]" style={{ color: '#b0a898' }}>
                        {formatTime(notif.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
