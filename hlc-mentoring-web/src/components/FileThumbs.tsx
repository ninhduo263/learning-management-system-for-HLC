'use client';

import { Image } from 'antd';
import type { FileView } from '@/services/hlcApi';

/** Ảnh minh chứng (bấm để phóng to); file không phải ảnh hiện thành link */
export default function FileThumbs({ files, size = 56 }: { files: FileView[]; size?: number }) {
  if (!files?.length) return <span className="text-gray-400">—</span>;
  const images = files.filter((file) => file.mimeType?.startsWith('image/'));
  const others = files.filter((file) => !file.mimeType?.startsWith('image/'));
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Image.PreviewGroup>
        {images.map((file) => <Image key={file._id} src={file.url} alt={file.fileName} width={size} height={size} className="rounded object-cover" />)}
      </Image.PreviewGroup>
      {others.map((file) => <a key={file._id} href={file.url} target="_blank" rel="noreferrer" className="text-xs">{file.fileName}</a>)}
    </div>
  );
}
