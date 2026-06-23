import { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { compressCommunityImage, createCommunityImageState, removeCommunityImage, reorderCommunityImages } from '@/lib/communityImage';
import type { CommunityImage } from '@/types/community';

export default function CommunityImageGrid({
  images,
  coverImageId,
  onChange,
}: {
  images: CommunityImage[];
  coverImageId: string;
  onChange: (state: { images: CommunityImage[]; coverImageId: string }) => void;
}) {
  const draggedId = useRef('');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleFiles = async (input: HTMLInputElement) => {
    const files = input.files;
    if (!files?.length) return;
    if (images.length + files.length > 6) {
      setError('最多上传 6 张图片');
      input.value = '';
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
      onChange(createCommunityImageState(next));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '图片处理失败');
    } finally {
      setProcessing(false);
      input.value = '';
    }
  };

  const handleRemove = (imageId: string) => {
    onChange(removeCommunityImage(images, imageId));
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
            onDrop={() => onChange(createCommunityImageState(reorderCommunityImages(images, draggedId.current, image.id)))}
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
            {image.id === coverImageId && (
              <span className="absolute bottom-1 left-1 rounded-md px-2 py-1 font-kai text-[10px] text-white" style={{ backgroundColor: '#97352f' }}>
                封面
              </span>
            )}
          </div>
        ))}
        {images.length < 6 && (
          <label
            htmlFor="community-image-upload"
            aria-disabled={processing}
            className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed font-kai text-xs ${processing ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
            style={{ borderColor: '#aa9a87', color: '#837361', backgroundColor: 'rgba(255,255,255,0.35)' }}
          >
            <ImagePlus size={22} strokeWidth={1.5} />
            {processing ? '处理中…' : '继续添加'}
          </label>
        )}
      </div>
      <input
        id="community-image-upload"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={processing}
        className="sr-only"
        onChange={(event) => void handleFiles(event.currentTarget)}
      />
      <p className="mt-2 font-kai text-[11px]" style={{ color: error ? '#a13b32' : '#948676' }}>
        {error || '第一张图片会自动作为封面；拖动图片可排序。'}
      </p>
    </div>
  );
}
