import { useEffect, useState, useCallback } from 'react';
import {
  Bookmark,
  FileText,
  StickyNote,
  Settings,
  User,
  Mail,
  LogOut,
  X,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Building2,
  Tag,
  Eye,
  Trash2,
  PenLine,
  Save,
  ArrowLeft,
} from 'lucide-react';
import { getCurrentUser, getBookmarks, getBrowsingHistory, getSubmissions, getNotes, updateProfile } from '@/lib/accountService';
import type { MockUser, Bookmark as BookmarkType, BrowsingRecord, Submission, Note } from '@/lib/mockAccountData';

// ─── Icons ──────────────────────────────────────────────────

function StatusBadge({ status }: { status: Submission['status'] }) {
  const config = {
    pending: { label: '待审核', color: '#b8860b', bg: 'rgba(184,134,11,0.1)', icon: Clock3 },
    approved: { label: '已采纳', color: '#5a7a5a', bg: 'rgba(90,122,90,0.1)', icon: CheckCircle2 },
    rejected: { label: '未采纳', color: '#b03530', bg: 'rgba(176,53,48,0.08)', icon: X },
  };
  const c = config[status];
  const Icon = c.icon;
  return (
    <span
      className="inline-flex items-center gap-1 font-kai text-[11px] px-2 py-0.5 rounded"
      style={{ color: c.color, backgroundColor: c.bg }}
    >
      <Icon size={11} />
      {c.label}
    </span>
  );
}

function BookmarkTag({ type }: { type: BookmarkType['type'] }) {
  const config = {
    professor: { label: '学者', icon: GraduationCap, color: '#5c4030' },
    university: { label: '院校', icon: Building2, color: '#4a5a6a' },
    specialty: { label: '方向', icon: Tag, color: '#6a5a4a' },
  };
  const c = config[type];
  const Icon = c.icon;
  return (
    <span className="inline-flex items-center gap-1 font-kai text-[10px] px-1.5 py-0.5 rounded" style={{ color: c.color, backgroundColor: `${c.color}15` }}>
      <Icon size={10} />
      {c.label}
    </span>
  );
}

// ─── Card Component ─────────────────────────────────────────

function SectionCard({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        backgroundColor: 'rgba(250, 247, 240, 0.85)',
        border: '1px solid rgba(180, 165, 145, 0.25)',
        boxShadow: '0 1px 4px rgba(90, 74, 58, 0.04)',
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: '1px solid rgba(180, 165, 145, 0.2)' }}
      >
        <div className="flex items-center gap-2.5">
          <span style={{ color: '#5c4030' }}>
            <Icon size={16} strokeWidth={1.6} />
          </span>
          <h3 className="font-serif text-base" style={{ color: '#3a2e22', letterSpacing: '0.04em' }}>
            {title}
          </h3>
        </div>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────

export default function MyAccountPage({
  userId,
  onBack,
  onLogout,
}: {
  userId: string;
  onBack?: () => void;
  onLogout?: () => void;
}) {
  const [user, setUser] = useState<MockUser | null>(null);
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [history, setHistory] = useState<BrowsingRecord[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit profile state
  const [editingProfile, setEditingProfile] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const u = await getCurrentUser();
      const uid = u?.userId || userId;
      const [b, h, s, n] = await Promise.all([
        getBookmarks(uid),
        getBrowsingHistory(uid),
        getSubmissions(uid),
        getNotes(uid),
      ]);
      setUser(u);
      setBookmarks(b);
      setHistory(h);
      setSubmissions(s);
      setNotes(n);
      if (u) {
        setEditNickname(u.nickname);
        setEditEmail(u.email);
      }
    } catch (e: any) {
      console.error('[MyAccount] loadAll failed:', e);
      // Show empty state on error
      setUser(null);
      setBookmarks([]);
      setHistory([]);
      setSubmissions([]);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleSaveProfile = async () => {
    const ok = await updateProfile(userId, { nickname: editNickname, email: editEmail });
    if (ok && user) {
      setUser({ ...user, nickname: editNickname, email: editEmail });
      setEditingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="font-kai text-sm" style={{ color: '#8a7d6e' }}>加载中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Page Header */}
      <div className="text-center mb-10">
        {onBack && (
          <div className="flex justify-start mb-7">
            <button
              onClick={onBack}
              className="font-kai inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm transition-all hover:opacity-85 hover:-translate-x-0.5"
              style={{
                color: '#5c4030',
                backgroundColor: 'rgba(250, 247, 240, 0.9)',
                border: '1px solid rgba(92, 64, 48, 0.18)',
                boxShadow: '0 4px 14px rgba(90, 74, 58, 0.08)',
                cursor: 'pointer',
                letterSpacing: '0.04em',
              }}
            >
              <ArrowLeft size={16} strokeWidth={1.7} />
              返回首页
            </button>
          </div>
        )}
        <div className="flex items-center justify-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(92,64,48,0.1)' }}
          >
            <User size={18} strokeWidth={1.6} style={{ color: '#5c4030' }} />
          </div>
          <h1
            className="font-serif text-2xl sm:text-3xl"
            style={{ color: '#3a2e22', letterSpacing: '0.08em' }}
          >
            我的账户
          </h1>
        </div>
        <p className="font-kai text-sm" style={{ color: '#8a7d6e', letterSpacing: '0.04em' }}>
          管理你的收藏、浏览记录与资料补充
        </p>
      </div>

      {/* User info bar */}
      {user && (
        <div
          className="flex items-center gap-4 mb-8 px-5 py-4 rounded-lg"
          style={{
            backgroundColor: 'rgba(250, 247, 240, 0.9)',
            border: '1px solid rgba(180, 165, 145, 0.25)',
          }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center font-serif text-lg shrink-0"
            style={{ backgroundColor: 'rgba(92,64,48,0.12)', color: '#5c4030' }}
          >
            {user.nickname.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-serif text-base" style={{ color: '#3a2e22' }}>
              {user.nickname}
            </div>
            <div className="font-kai text-xs mt-0.5" style={{ color: '#8a7d6e' }}>
              ID: {(user.userId || '').slice(0, 12)}... · 加入于 {new Date(user.createdAt).toLocaleDateString('zh-CN')}
            </div>
          </div>
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ─── Bookmarks ─────────────────────────── */}
        <SectionCard icon={Bookmark} title="我的书签">
          {bookmarks.length === 0 ? (
            <p className="font-kai text-xs py-4 text-center" style={{ color: '#9a8e7e' }}>暂无收藏</p>
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
              {bookmarks.map((bk) => (
                <div
                  key={bk.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors hover:bg-white/50"
                  style={{ backgroundColor: 'rgba(255,255,255,0.4)' }}
                >
                  <BookmarkTag type={bk.type} />
                  <div className="flex-1 min-w-0">
                    <div className="font-kai text-sm truncate" style={{ color: '#3a2e22' }}>
                      {bk.targetName}
                    </div>
                    {bk.targetDetail && (
                      <div className="font-kai text-[11px] truncate" style={{ color: '#8a7d6e' }}>
                        {bk.targetDetail}
                      </div>
                    )}
                  </div>
                  <button
                    className="shrink-0 p-1 rounded transition-colors hover:bg-red-50"
                    style={{ color: '#b0a898', background: 'none', border: 'none', cursor: 'pointer' }}
                    title="移除收藏"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* ─── Browsing History ──────────────────── */}
        <SectionCard icon={Eye} title="最近浏览" action={
          history.length > 0 && (
            <button
              className="font-kai text-[11px] transition-opacity hover:opacity-70"
              style={{ color: '#8a7d6e', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              清除全部
            </button>
          )
        }>
          {history.length === 0 ? (
            <p className="font-kai text-xs py-4 text-center" style={{ color: '#9a8e7e' }}>暂无浏览记录</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
              {history.map((h) => (
                <div
                  key={h.id}
                  className="flex items-start gap-3 px-3 py-2.5 rounded-md transition-colors hover:bg-white/50"
                  style={{ backgroundColor: 'rgba(255,255,255,0.4)' }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-kai text-sm" style={{ color: '#3a2e22' }}>{h.professorName}</span>
                      <span className="font-kai text-[10px] px-1.5 py-0.5 rounded" style={{ color: '#5c4030', backgroundColor: 'rgba(92,64,48,0.08)' }}>
                        {h.title}
                      </span>
                    </div>
                    <div className="font-kai text-[11px] mt-0.5" style={{ color: '#8a7d6e' }}>
                      {h.university} · {h.specialties.slice(0, 2).join('、')}
                    </div>
                  </div>
                  <span className="font-serif text-[10px] shrink-0 mt-0.5" style={{ color: '#b0a898' }}>
                    {new Date(h.viewedAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* ─── Submissions ───────────────────────── */}
        <SectionCard icon={FileText} title="我的贡献">
          {submissions.length === 0 ? (
            <p className="font-kai text-xs py-4 text-center" style={{ color: '#9a8e7e' }}>暂无提交记录</p>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
              {submissions.map((s) => (
                <div
                  key={s.id}
                  className="px-3.5 py-3 rounded-md"
                  style={{ backgroundColor: 'rgba(255,255,255,0.4)' }}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="font-kai text-sm flex-1" style={{ color: '#3a2e22' }}>{s.title}</div>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="font-kai text-[11px] leading-relaxed mb-2" style={{ color: '#6a5e4e' }}>
                    {s.description}
                  </p>
                  {s.adminReply && (
                    <div
                      className="font-kai text-[11px] px-2.5 py-1.5 rounded"
                      style={{ color: '#5a7a5a', backgroundColor: 'rgba(90,122,90,0.06)', lineHeight: 1.6 }}
                    >
                      管理员回复：{s.adminReply}
                    </div>
                  )}
                  <div className="font-serif text-[10px] mt-1.5" style={{ color: '#b0a898' }}>
                    提交于 {new Date(s.createdAt).toLocaleDateString('zh-CN')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* ─── Notes ─────────────────────────────── */}
        <SectionCard icon={StickyNote} title="我的笔记">
          {notes.length === 0 ? (
            <p className="font-kai text-xs py-4 text-center" style={{ color: '#9a8e7e' }}>暂无笔记</p>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="px-3.5 py-3 rounded-md"
                  style={{ backgroundColor: 'rgba(255,255,255,0.5)', borderLeft: '3px solid rgba(92,64,48,0.2)' }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-kai text-sm" style={{ color: '#5c4030' }}>{note.professorName}</span>
                    <div className="flex items-center gap-1">
                      <button
                        className="p-1 rounded transition-colors hover:bg-black/5"
                        style={{ color: '#8a7d6e', background: 'none', border: 'none', cursor: 'pointer' }}
                        title="编辑"
                      >
                        <PenLine size={12} />
                      </button>
                      <button
                        className="p-1 rounded transition-colors hover:bg-red-50"
                        style={{ color: '#b0a898', background: 'none', border: 'none', cursor: 'pointer' }}
                        title="删除"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <p className="font-kai text-[12px] leading-relaxed" style={{ color: '#4a3f32' }}>
                    {note.content}
                  </p>
                  <div className="font-serif text-[10px] mt-2" style={{ color: '#b0a898' }}>
                    {new Date(note.updatedAt).toLocaleDateString('zh-CN')} 更新
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* ─── Account Settings (full width on mobile, spans 2 cols on lg) ─── */}
        <div className="lg:col-span-2">
          <SectionCard
            icon={Settings}
            title="账户设置"
            action={
              !editingProfile && (
                <button
                  onClick={() => setEditingProfile(true)}
                  className="font-kai text-[11px] transition-opacity hover:opacity-70 flex items-center gap-1"
                  style={{ color: '#5c4030', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <PenLine size={12} />
                  编辑
                </button>
              )
            }
          >
            {user && (
              <div className="max-w-lg">
                {editingProfile ? (
                  <div className="space-y-4">
                    <div>
                      <label className="font-kai text-xs block mb-1.5" style={{ color: '#6a5e4e' }}>昵称</label>
                      <input
                        type="text"
                        value={editNickname}
                        onChange={(e) => setEditNickname(e.target.value)}
                        className="w-full font-kai text-sm px-3 py-2 rounded-md outline-none"
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.7)',
                          border: '1px solid rgba(180,165,145,0.3)',
                          color: '#3a2e22',
                        }}
                      />
                    </div>
                    <div>
                      <label className="font-kai text-xs block mb-1.5" style={{ color: '#6a5e4e' }}>邮箱</label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full font-kai text-sm px-3 py-2 rounded-md outline-none"
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.7)',
                          border: '1px solid rgba(180,165,145,0.3)',
                          color: '#3a2e22',
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={handleSaveProfile}
                        className="font-kai text-xs px-4 py-2 rounded-md transition-opacity hover:opacity-85 flex items-center gap-1.5"
                        style={{ backgroundColor: '#5c4030', color: '#f5f0e8', border: 'none', cursor: 'pointer' }}
                      >
                        <Save size={13} />
                        保存
                      </button>
                      <button
                        onClick={() => {
                          setEditingProfile(false);
                          setEditNickname(user.nickname);
                          setEditEmail(user.email);
                        }}
                        className="font-kai text-xs px-4 py-2 rounded-md transition-opacity hover:opacity-70"
                        style={{ backgroundColor: 'rgba(180,165,145,0.2)', color: '#6a5e4e', border: 'none', cursor: 'pointer' }}
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <User size={15} strokeWidth={1.5} style={{ color: '#8a7d6e' }} />
                      <div>
                        <div className="font-kai text-[10px]" style={{ color: '#8a7d6e' }}>昵称</div>
                        <div className="font-kai text-sm" style={{ color: '#3a2e22' }}>{user.nickname}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail size={15} strokeWidth={1.5} style={{ color: '#8a7d6e' }} />
                      <div>
                        <div className="font-kai text-[10px]" style={{ color: '#8a7d6e' }}>邮箱</div>
                        <div className="font-kai text-sm" style={{ color: '#3a2e22' }}>{user.email}</div>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ borderTop: '1px solid rgba(180,165,145,0.15)', marginTop: '16px', paddingTop: '16px' }}>
                  <button
                    onClick={onLogout}
                    className="font-kai text-xs flex items-center gap-2 transition-opacity hover:opacity-70"
                    style={{ color: '#b03530', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <LogOut size={14} />
                    退出登录
                  </button>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
