import { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { compressCommunityImage, removeCommunityImage, reorderCommunityImages } from '@/lib/communityImage';
import type { CommunityImage } from '@/types/community';

export default function CommunityImageGrid({
  images,
  coverImageId,
  onChange,
  onCoverChange,
}: {
  images: CommunityImage[];
  coverImageId: string;
  onChange: (images: CommunityImage[]) => void;
  onCoverChange: (imageId: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const draggedId = useRef('');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    if (images.length + files.length > 6) {
      setError('最多上传 6 张图片');
      return;
    }
    setProcessing(true);
    setError('');
    try {
      const created = await Promise.all(Array.from(files).map(async (file) => {
        const compressed = await compressCommunityImage(file);
        return {
          id: globalThis.crypto?.randomUUID?.() || `image-${Date.now()}-${Math.random()}`,
          source: compressed.dataUrl,
          width: compressed.width,
          height: compressed.height,
        } satisfies CommunityImage;
      }));
      const next = [...images, ...created];
      onChange(next);
      if (!coverImageId && next[0]) onCoverChange(next[0].id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '图片处理失败');
    } finally {
      setProcessing(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = (imageId: string) => {
    const next = removeCommunityImage(images, imageId, coverImageId);
    onChange(next.images);
    onCoverChange(next.coverImageId);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between font-kai text-xs" style={{ color: '#756758' }}>
        <span>文章配图（可选）</span>
        <span>{images.length} / 6</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {images.map((image) => (
          <div
            key={image.id}
            draggable
            onDragStart={() => { draggedId.current = image.id; }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => onChange(reorderCommunityImages(images, draggedId.current, image.id))}
            className="group relative aspect-square overflow-hidden rounded-xl"
            style={{ border: image.id === coverImageId ? '2px solid #97352f' : '1px solid rgba(92,64,48,0.16)' }}
          >
            <img src={image.source} alt="文章配图" className="h-full w-full object-cover" />
            <button
              type="button"
              aria-label="删除图片"
              onClick={() => handleRemove(image.id)}
              className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
            >
              <X size={13} />
            </button>
            <button
              type="button"
              onClick={() => onCoverChange(image.id)}
              className="absolute bottom-1 left-1 rounded-md px-2 py-1 font-kai text-[10px] text-white"
              style={{ backgroundColor: image.id === coverImageId ? '#97352f' : 'rgba(30,24,16,0.68)' }}
            >
              {image.id === coverImageId ? '封面 ✓' : '设为封面'}
            </button>
          </div>
        ))}
        {images.length < 6 && (
          <button
            type="button"
            disabled={processing}
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed font-kai text-xs disabled:opacity-50"
            style={{ borderColor: '#aa9a87', color: '#837361', backgroundColor: 'rgba(255,255,255,0.35)' }}
          >
            <ImagePlus size={22} strokeWidth={1.5} />
            {processing ? '处理中…' : '继续添加'}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(event) => void handleFiles(event.target.files)}
      />
      <p className="mt-2 font-kai text-[11px]" style={{ color: error ? '#a13b32' : '#948676' }}>
        {error || '拖动图片可排序；有图片时需确认一张封面。'}
      </p>
    </div>
  );
}
