import type { CommunityImage } from '../types/community.ts';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;

export function validateCommunityImageFile(file: Pick<File, 'type' | 'size'>): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) return '仅支持 JPG、PNG 或 WebP 图片';
  if (file.size > MAX_SOURCE_BYTES) return '单张图片不能超过 10MB';
  return null;
}

export function createCommunityImageState(images: CommunityImage[]): { images: CommunityImage[]; coverImageId: string } {
  return {
    images,
    coverImageId: images[0]?.id || '',
  };
}

export function removeCommunityImage(
  images: CommunityImage[],
  imageId: string,
): { images: CommunityImage[]; coverImageId: string } {
  return createCommunityImageState(images.filter((image) => image.id !== imageId));
}

export function reorderCommunityImages(
  images: CommunityImage[],
  draggedId: string,
  targetId: string,
): CommunityImage[] {
  const draggedIndex = images.findIndex((image) => image.id === draggedId);
  const targetIndex = images.findIndex((image) => image.id === targetId);
  if (draggedIndex < 0 || targetIndex < 0 || draggedIndex === targetIndex) return images;
  const next = [...images];
  const [dragged] = next.splice(draggedIndex, 1);
  next.splice(targetIndex, 0, dragged);
  return next;
}

function readImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('无法读取图片'));
    };
    image.src = url;
  });
}

export async function compressCommunityImage(file: File): Promise<{
  file: File;
  dataUrl: string;
  width: number;
  height: number;
}> {
  const validationError = validateCommunityImageFile(file);
  if (validationError) throw new Error(validationError);

  const image = await readImage(file);
  const ratio = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * ratio));
  const height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')?.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error('图片压缩失败')), 'image/jpeg', 0.82);
  });
  if (blob.size > 1024 * 1024) throw new Error('压缩后图片仍超过 1MB，请选择尺寸更小的图片');
  const compressedFile = new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' });
  return { file: compressedFile, dataUrl: canvas.toDataURL('image/jpeg', 0.82), width, height };
}
