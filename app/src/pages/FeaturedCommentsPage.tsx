import { useState, useEffect } from 'react';
import { getFeaturedComments } from '@/lib/comments';
import type { Comment } from '@/lib/comments';
import { regions } from '@/data/professors';

interface FeaturedCommentsPageProps {
  onProfessorClick: (profId: string) => void;
}

// Build professor name lookup map
function buildProfessorMap(): Record<string, { name: string; university: string; id: string }> {
  const map: Record<string, { name: string; university: string; id: string }> = {};
  regions.forEach(region => {
    region.universities.forEach(uni => {
      uni.professors.forEach(prof => {
        map[prof.id] = { name: prof.name, university: uni.name, id: prof.id };
      });
    });
  });
  return map;
}

const professorMap = buildProfessorMap();

export default function FeaturedCommentsPage({ onProfessorClick }: FeaturedCommentsPageProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFeaturedComments().then(list => {
      setComments(list);
      setLoading(false);
    });
  }, []);

  return (
    <main className="relative z-10 max-w-[1200px] mx-auto px-4 md:px-6 py-10 pb-16">
      {/* Title */}
      <div className="text-center mb-10">
        <h1 className="font-title text-3xl font-bold mb-2" style={{ color: '#1a1410', letterSpacing: '0.08em' }}>
          精选评论
        </h1>
        <p className="font-kai text-sm" style={{ color: '#8a7d6e' }}>
          被标记为精选的用户评论
        </p>
        <div className="w-16 h-px mx-auto mt-4" style={{ background: 'linear-gradient(90deg, transparent, rgba(92,64,48,0.3), transparent)' }} />
      </div>

      {loading ? (
        <div className="text-center py-20">
          <p className="font-kai text-sm" style={{ color: '#b0a898' }}>加载中...</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-20">
          <div className="font-kai text-4xl mb-4" style={{ color: '#c4b9a5' }}>☆</div>
          <p className="font-kai text-sm" style={{ color: '#b0a898' }}>暂无精选评论</p>
          <p className="font-kai text-xs mt-2" style={{ color: '#c4b9a5' }}>在学者评价页面点击"精选评论"按钮添加</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map(comment => {
            const profInfo = professorMap[comment.professorId || ''] || { name: '未知学者', university: '', id: '' };
            return (
              <div
                key={comment.id}
                className="p-5 cursor-pointer transition-all duration-200 hover:translate-y-[-1px]"
                style={{
                  backgroundColor: 'rgba(250, 247, 240, 0.8)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(30, 24, 16, 0.08)',
                  boxShadow: '0 2px 8px rgba(30,24,16,0.04)',
                }}
                onClick={() => profInfo.id && onProfessorClick(profInfo.id)}
              >
                {/* Featured badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-kai text-sm font-medium" style={{ color: '#b8860b' }}>★ 精选</span>
                    <span className="font-kai text-xs px-2 py-0.5" style={{ color: '#5c4030', backgroundColor: 'rgba(92,64,48,0.06)', borderRadius: '4px' }}>
                      {profInfo.name}
                    </span>
                  </div>
                  <span className="font-serif text-[10px]" style={{ color: '#b0a898' }}>{comment.time}</span>
                </div>

                {/* Comment content */}
                <p className="font-kai text-sm leading-relaxed mb-2" style={{ color: '#4a3f32' }}>
                  {comment.content}
                </p>

                {/* Author */}
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center font-kai text-[10px]" style={{ backgroundColor: '#5c4030', color: '#f5f0e8' }}>
                    {comment.name.charAt(0)}
                  </div>
                  <span className="font-kai text-xs" style={{ color: '#8a7d6e' }}>{comment.name}</span>
                  {comment.isAnonymous && (
                    <span className="font-kai text-[10px] px-1 py-0.5" style={{ color: '#8a7d6e', backgroundColor: 'rgba(138,125,110,0.1)', borderRadius: '3px' }}>匿</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
