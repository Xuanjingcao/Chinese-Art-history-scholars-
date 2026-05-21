import { useEffect, useRef, useCallback, useState } from 'react';
import type { Professor } from '@/types';
import { getComments, addComment, deleteComment, voteComment } from '@/lib/comments';
import type { Comment } from '@/lib/comments';
import { createNotification } from '@/lib/notifications';
import type { AuthUser } from '@/lib/auth';

interface ProfessorModalProps {
  professor: Professor | null;
  onClose: () => void;
  currentUser?: AuthUser | null;
  onLoginClick?: () => void;
}

// Reply form component
function ReplyForm({
  onSubmit,
  onCancel,
  placeholder,
}: {
  onSubmit: (content: string, isAnonymous: boolean) => void;
  onCancel: () => void;
  placeholder: string;
}) {
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  return (
    <div className="mt-2 p-3" style={{ backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: '8px' }}>
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="font-kai text-sm w-full mb-2 px-3 py-2 outline-none resize-none"
        style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '6px', border: '1px solid rgba(30,24,16,0.08)', color: '#1a1410' }}
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={e => setIsAnonymous(e.target.checked)}
            className="w-3.5 h-3.5"
          />
          <span className="font-kai text-xs" style={{ color: '#6a5e50' }}>匿名发表</span>
        </label>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="font-kai text-xs px-3 py-1.5"
            style={{ color: '#8a7d6e', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            取消
          </button>
          <button
            onClick={() => { if (content.trim()) { onSubmit(content, isAnonymous); setContent(''); } }}
            disabled={!content.trim()}
            className="font-kai text-xs px-3 py-1.5 transition-all duration-200 hover:opacity-80 disabled:opacity-40"
            style={{ backgroundColor: '#5c4030', color: '#f5f0e8', borderRadius: '6px' }}
          >
            回复
          </button>
        </div>
      </div>
    </div>
  );
}

// Single comment item (recursive for replies)
function CommentItem({
  comment,
  currentUser,
  profId,
  onReplyAdded,
  onDelete,
  onVote,
  depth = 0,
}: {
  comment: Comment;
  currentUser?: AuthUser | null;
  profId: string;
  onReplyAdded: () => void;
  onDelete: (id: string) => void;
  onVote: (commentId: string, newVote: 'like' | 'dislike' | null) => void;
  depth?: number;
}) {
  const [showReplyForm, setShowReplyForm] = useState(false);

  const handleReply = async (content: string, isAnonymous: boolean) => {
    const name = currentUser?.nickname || '匿名用户';
    // parentId: 顶级评论ID（回复回复时用 comment.parentId，回复顶级评论时用 comment.id）
    const parentId = comment.parentId || comment.id;
    const newComment = await addComment(profId, name, content, isAnonymous, comment.id, comment.name, parentId, currentUser?.userId);
    if (newComment) {
      // Create notification for the person being replied to
      await createNotification(
        comment.ownerUserId || '',   // recipient userId
        comment.name,                // recipient display name
        currentUser?.userId || '',   // sender userId
        name,                        // sender display name
        profId,                      // professor id
        '',                          // professor name (will be resolved by receiver)
        comment.id,                  // comment id being replied to
        content,                     // reply content
      );
    }
    setShowReplyForm(false);
    onReplyAdded();
  };

  return (
    <div className={depth > 0 ? 'mt-2 ml-6 pl-3' : ''} style={depth > 0 ? { borderLeft: '2px solid rgba(92,74,50,0.1)' } : {}}>
      <div className="p-3" style={{ backgroundColor: depth > 0 ? 'rgba(250,247,240,0.3)' : 'rgba(250, 247, 240, 0.5)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(30, 24, 16, 0.04)' }}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span className="font-kai text-sm font-medium" style={{ color: '#5c4030' }}>
              {comment.name}
              {comment.isAnonymous && (
                <span className="font-kai text-[10px] ml-1 px-1 py-0.5" style={{ color: '#8a7d6e', backgroundColor: 'rgba(138,125,110,0.1)', borderRadius: '3px' }}>匿</span>
              )}
            </span>
            {comment.replyToName && (
              <span className="font-kai text-xs" style={{ color: '#8a7d6e' }}>
                回复 <span style={{ color: '#5c4030' }}>{comment.replyToName}</span>
              </span>
            )}
          </div>
          <span className="font-serif text-[10px]" style={{ color: '#b0a898' }}>{comment.time}</span>
        </div>
        <p className="font-kai text-sm" style={{ color: '#4a3f32', lineHeight: 1.7 }}>{comment.content}</p>
        <div className="flex items-center gap-3 mt-2">
          {currentUser && (
            <button
              onClick={() => setShowReplyForm(v => !v)}
              className="font-kai text-[11px] transition-opacity hover:opacity-70"
              style={{ color: '#8a7d6e', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {showReplyForm ? '取消回复' : '回复'}
            </button>
          )}
          {/* Like / Dislike buttons */}
          <button
            onClick={async (e) => {
              e.stopPropagation();
              if (!currentUser) { alert('请先登录'); return; }
              const result = await voteComment(comment.id, 'like', currentUser.userId);
              if (result === null) { alert('操作失败，请刷新页面重试'); return; }
              onVote(comment.id, result === 'removed' ? null : 'like');
            }}
            className="font-kai text-[11px] transition-opacity hover:opacity-70 flex items-center gap-1"
            style={{ color: comment.userVote === 'like' ? '#b03530' : '#8a7d6e', background: 'none', border: 'none', cursor: 'pointer' }}
            title="点赞"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={comment.userVote === 'like' ? '#b03530' : 'none'} stroke={comment.userVote === 'like' ? '#b03530' : '#8a7d6e'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '2px' }}>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {(comment.likes || 0) > 0 && <span>{comment.likes}</span>}
          </button>
          <button
            onClick={async (e) => {
              e.stopPropagation();
              if (!currentUser) { alert('请先登录'); return; }
              const result = await voteComment(comment.id, 'dislike', currentUser.userId);
              if (result === null) { alert('操作失败，请刷新页面重试'); return; }
              onVote(comment.id, result === 'removed' ? null : 'dislike');
            }}
            className="font-kai text-[11px] transition-opacity hover:opacity-70 flex items-center gap-1"
            style={{ color: comment.userVote === 'dislike' ? '#555' : '#8a7d6e', background: 'none', border: 'none', cursor: 'pointer' }}
            title="灭灯"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={comment.userVote === 'dislike' ? '#bbb' : 'none'} stroke={comment.userVote === 'dislike' ? '#888' : '#8a7d6e'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '2px' }}>
              <path d="M9 18h6" />
              <path d="M10 22h4" />
              <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
              {comment.userVote === 'dislike' && (
                <>
                  {/* Cracks when disliked */}
                  <line x1="9" y1="7" x2="11" y2="9" stroke="#888" strokeWidth="1" />
                  <line x1="11" y1="9" x2="10" y2="12" stroke="#888" strokeWidth="1" />
                  <line x1="15" y1="6" x2="13" y2="9" stroke="#888" strokeWidth="1" />
                  <line x1="13" y1="9" x2="14" y2="11" stroke="#888" strokeWidth="1" />
                </>
              )}
              {comment.userVote !== 'dislike' && (
                <>
                  {/* Light rays when not disliked */}
                  <line x1="6.5" y1="10" x2="3" y2="10" />
                  <line x1="17.5" y1="10" x2="21" y2="10" />
                  <line x1="7" y1="5.5" x2="4.5" y2="3" />
                  <line x1="17" y1="5.5" x2="19.5" y2="3" />
                </>
              )}
            </svg>
            {(comment.dislikes || 0) > 0 && <span>{comment.dislikes}</span>}
          </button>
          {/* Delete button - only for owner (ownerUserId = CloudBase _openid) */}
          {currentUser && (
            comment.ownerUserId
              ? comment.ownerUserId === currentUser.userId
              : (comment.name === currentUser.nickname) && !comment.isAnonymous
          ) && (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                if (window.confirm('确定要删除这条评论吗？')) {
                  const success = await deleteComment(comment.id);
                  if (success) {
                    onDelete(comment.id);
                  } else {
                    alert('删除失败，请检查网络连接或刷新页面重试');
                  }
                }
              }}
              className="font-kai text-[11px] transition-opacity hover:opacity-70"
              style={{ color: '#b03530', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              删除
            </button>
          )}
        </div>
        {showReplyForm && (
          <ReplyForm
            onSubmit={handleReply}
            onCancel={() => setShowReplyForm(false)}
            placeholder={`回复 ${comment.name}...`}
          />
        )}
      </div>

      {/* Render replies */}
      {comment.replies.length > 0 && (
        <div>
          {comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUser={currentUser}
              profId={profId}
              onReplyAdded={onReplyAdded}
              onDelete={onDelete}
              onVote={onVote}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CommentSection({ profId, currentUser, onLoginClick }: { profId: string; currentUser?: AuthUser | null; onLoginClick?: () => void }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    getComments(profId, currentUser?.userId).then((list) => {
      setComments(list);
      setLoading(false);
    });
  };

  const handleDelete = (id: string) => {
    setComments(prev => {
      // Check if it's a top-level comment
      const isTopLevel = prev.some(c => c.id === id);
      if (isTopLevel) {
        // Remove the top-level comment and all its replies
        return prev.filter(c => c.id !== id);
      } else {
        // Remove a reply from its parent comment
        return prev.map(c => ({
          ...c,
          replies: c.replies.filter(r => r.id !== id),
        }));
      }
    });
  };

  const handleVote = (commentId: string, newVote: 'like' | 'dislike' | null) => {
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        const oldVote = c.userVote;
        let likes = c.likes || 0;
        let dislikes = c.dislikes || 0;
        // Revert old vote
        if (oldVote === 'like') likes--;
        if (oldVote === 'dislike') dislikes--;
        // Apply new vote
        if (newVote === 'like') likes++;
        if (newVote === 'dislike') dislikes++;
        return { ...c, userVote: newVote, likes: Math.max(0, likes), dislikes: Math.max(0, dislikes) };
      }
      // Also check replies
      if (c.replies.some(r => r.id === commentId)) {
        return {
          ...c,
          replies: c.replies.map(r => {
            if (r.id !== commentId) return r;
            const oldVote = r.userVote;
            let likes = r.likes || 0;
            let dislikes = r.dislikes || 0;
            if (oldVote === 'like') likes--;
            if (oldVote === 'dislike') dislikes--;
            if (newVote === 'like') likes++;
            if (newVote === 'dislike') dislikes++;
            return { ...r, userVote: newVote, likes: Math.max(0, likes), dislikes: Math.max(0, dislikes) };
          }),
        };
      }
      return c;
    }));
  };

  useEffect(() => {
    load();
  }, [profId, currentUser]);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    const name = currentUser?.nickname || '匿名用户';
    const newComment = await addComment(profId, name, content, isAnonymous, '', '', '', currentUser?.userId);
    if (newComment) {
      load();
      setContent('');
      setIsAnonymous(false);
    }
  };

  return (
    <div className="mt-8">
      <p className="font-serif text-[10px] tracking-[0.2em] mb-4 uppercase" style={{ color: 'var(--mist)' }}>
        学者评价
      </p>

      {currentUser ? (
        <div
          className="mb-5 p-4"
          style={{ backgroundColor: 'rgba(250, 247, 240, 0.85)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(30, 24, 16, 0.06)' }}
        >
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-6 h-6 rounded-full flex items-center justify-center font-kai text-xs" style={{ backgroundColor: '#5c4030', color: '#f5f0e8' }}>
              {(currentUser.nickname || currentUser.userId.slice(0, 6)).charAt(0)}
            </div>
            <span className="font-kai text-sm" style={{ color: '#5c4030' }}>{currentUser.nickname || currentUser.userId.slice(0, 8)}</span>
          </div>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="写下您对这位学者的评价..."
            rows={3}
            className="font-kai text-sm w-full mb-2 px-3 py-2 outline-none resize-none"
            style={{ backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: '6px', border: '1px solid rgba(30,24,16,0.08)', color: '#1a1410' }}
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={e => setIsAnonymous(e.target.checked)}
                className="w-3.5 h-3.5"
              />
              <span className="font-kai text-xs" style={{ color: '#6a5e50' }}>匿名发表</span>
            </label>
            <button
              onClick={handleSubmit}
              disabled={!content.trim()}
              className="font-kai text-xs px-4 py-2 transition-all duration-200 hover:opacity-80 disabled:opacity-40"
              style={{ backgroundColor: '#5c4030', color: '#f5f0e8', borderRadius: '8px', letterSpacing: '0.06em' }}
            >
              提交评价
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={onLoginClick}
          className="mb-5 p-4 text-center w-full transition-all duration-200 hover:opacity-80"
          style={{ backgroundColor: 'rgba(250, 247, 240, 0.5)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(30, 24, 16, 0.06)', cursor: 'pointer' }}
        >
          <p className="font-kai text-sm" style={{ color: '#5c4030' }}>
            登录后可为学者撰写评价
            <span className="ml-2 underline" style={{ color: '#8a7d6e' }}>去登录 →</span>
          </p>
        </button>
      )}

      {loading ? (
        <p className="font-kai text-xs text-center py-4" style={{ color: '#b0a898' }}>加载中...</p>
      ) : comments.length === 0 ? (
        <p className="font-kai text-xs text-center py-4" style={{ color: '#b0a898' }}>暂无评价，写下第一条评论吧</p>
      ) : (
        <div className="space-y-3">
          {comments.map(c => (
            <CommentItem
              key={c.id}
              comment={c}
              currentUser={currentUser}
              profId={profId}
              onReplyAdded={load}
              onDelete={handleDelete}
              onVote={handleVote}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProfessorModal({ professor, onClose, currentUser, onLoginClick }: ProfessorModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    if (panelRef.current) {
      panelRef.current.classList.remove('animate-slide-in');
      panelRef.current.classList.add('animate-slide-out');
    }
    if (overlayRef.current) {
      overlayRef.current.classList.remove('animate-overlay-in');
      overlayRef.current.classList.add('animate-overlay-out');
    }
    setTimeout(onClose, 280);
  }, [onClose]);

  useEffect(() => {
    if (professor) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [professor]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && professor) handleClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [professor, handleClose]);

  if (!professor) return null;

  const titleColor =
    professor.title === 'professor' ? '#7A1F1F' :
    professor.title === 'associate' ? '#1F4E79' :
    professor.title === 'assistant' ? '#4C7A6D' : '#5B6E64';

  const titleBg =
    professor.title === 'professor' ? 'rgba(122,31,31,0.08)' :
    professor.title === 'associate' ? 'rgba(31,78,121,0.08)' :
    professor.title === 'assistant' ? 'rgba(76,122,109,0.08)' : 'rgba(91,110,100,0.08)';

  const titleLabel =
    professor.title === 'professor' ? '教授' :
    professor.title === 'associate' ? '副教授' :
    professor.title === 'assistant' ? '助理教授' : '讲师';

  return (
    <div className="fixed inset-0" style={{ zIndex: 1000 }}>
      <div ref={overlayRef} className="absolute inset-0 animate-overlay-in" style={{ backgroundColor: 'rgba(44, 36, 22, 0.55)' }} onClick={handleClose} />
      <div
        ref={panelRef}
        className="absolute right-0 top-0 h-full w-full md:w-[520px] animate-slide-in overflow-y-auto"
        style={{
          backgroundColor: 'rgba(252, 248, 240, 0.95)',
          borderRadius: 'var(--radius-md) 0 0 var(--radius-md)',
          boxShadow: '-16px 0 48px rgba(30, 24, 16, 0.12)',
          backdropFilter: 'blur(24px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
        }}
      >
        <button onClick={handleClose} className="absolute top-6 right-6 z-10 font-serif text-xs tracking-[0.15em] transition-colors duration-200 hover:text-[var(--ink)] px-3 py-1.5" style={{ color: 'var(--ink-faint)', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(92,74,50,0.04)' }}>
          <span className="flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            关闭
          </span>
        </button>

        <div className="px-10 py-20">
          <span className="inline-block font-serif text-[10px] tracking-[0.12em] mb-5 px-3 py-1.5" style={{ color: titleColor, backgroundColor: titleBg, borderRadius: 'var(--radius-sm)' }}>
            {titleLabel}
          </span>

          <h2 className="font-title text-3xl font-normal mb-1" style={{ color: 'var(--ink)', letterSpacing: '0.06em' }}>
            {professor.name}
          </h2>
          <p className="font-serif text-xs mb-8" style={{ color: 'var(--ink-faint)', letterSpacing: '0.04em' }}>
            {professor.nameEn}
          </p>

          <div className="flex items-center gap-3 mb-8 px-4 py-3" style={{ backgroundColor: 'rgba(92,74,50,0.03)', borderRadius: 'var(--radius-sm)' }}>
            <span className="font-serif text-sm" style={{ color: 'var(--ink-light)', letterSpacing: '0.08em' }}>{professor.university}</span>
          </div>

          <div className="mb-10">
            <p className="font-serif text-[10px] tracking-[0.2em] mb-3 uppercase" style={{ color: 'var(--mist)' }}>研究方向</p>
            <div className="flex flex-wrap gap-2">
              {professor.specialties.map(s => (
                <span key={s} className="font-serif text-[11px] px-3 py-1.5" style={{ color: 'var(--gold)', backgroundColor: 'rgba(184,151,42,0.06)', borderRadius: 'var(--radius-sm)' }}>{s}</span>
              ))}
            </div>
          </div>

          <div className="w-full h-px mb-8" style={{ background: 'linear-gradient(90deg, transparent, rgba(92,74,50,0.10), transparent)' }} />

          <div className="mb-8">
            <p className="font-serif text-[10px] tracking-[0.2em] mb-3 uppercase" style={{ color: 'var(--mist)' }}>学者简介</p>
            <p className="font-serif text-sm leading-relaxed" style={{ color: 'var(--ink-light)', lineHeight: 1.9 }}>{professor.bio}</p>
          </div>

          {professor.achievements.length > 0 && (
            <>
              <div className="w-full h-px mb-8" style={{ background: 'linear-gradient(90deg, transparent, rgba(92,74,50,0.10), transparent)' }} />
              <div className="mb-8">
                <p className="font-serif text-[10px] tracking-[0.2em] mb-3 uppercase" style={{ color: 'var(--mist)' }}>学术成就</p>
                {professor.achievements.map((a, i) => (
                  <div key={i} className="flex mb-3">
                    <div className="w-1.5 h-1.5 rounded-full mt-2 mr-3 shrink-0" style={{ backgroundColor: 'var(--mountain)', opacity: 0.6 }} />
                    <p className="font-serif text-sm" style={{ color: 'var(--ink-light)', lineHeight: 1.7 }}>{a}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          <div>
            <p className="font-serif text-[10px] tracking-[0.2em] mb-3 uppercase" style={{ color: 'var(--mist)' }}>代表著作</p>
            {professor.publications.map((p, i) => (
              <div key={i} className="flex mb-3">
                <div className="w-1.5 h-1.5 rounded-full mt-2 mr-3 shrink-0" style={{ backgroundColor: 'var(--water)', opacity: 0.6 }} />
                <p className="font-serif text-sm" style={{ color: 'var(--ink-light)', lineHeight: 1.7 }}>{p}</p>
              </div>
            ))}
          </div>

          {professor.link && (
            <>
              <div className="w-full h-px mb-8" style={{ background: 'linear-gradient(90deg, transparent, rgba(92,74,50,0.10), transparent)' }} />
              <a href={professor.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-serif text-sm px-5 py-2.5 transition-all duration-200 hover:opacity-80" style={{ color: 'var(--accent)', backgroundColor: 'rgba(122, 61, 15, 0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(122, 61, 15, 0.15)', letterSpacing: '0.04em' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                访问个人主页
              </a>
            </>
          )}

          <div className="w-full h-px mb-8 mt-8" style={{ background: 'linear-gradient(90deg, transparent, rgba(92,74,50,0.10), transparent)' }} />
          <CommentSection profId={professor.id} currentUser={currentUser} onLoginClick={onLoginClick} />
        </div>
      </div>
    </div>
  );
}
