'use client';

import { PlusOutlined } from '@ant-design/icons';
import { useEffect, useRef } from 'react';
import { App, Upload } from 'antd';
import type { UploadFile } from 'antd';
import { errorMessage } from '@/lib/api';
import { uploadFile } from '@/services/mentoringApi';

export interface UploadedImage {
  fileId: string;
  url: string;
  name: string;
}

interface ImageUploadProps {
  value?: UploadedImage[];
  onChange?: (value: UploadedImage[]) => void;
  max?: number;
  /** false: nhận mọi loại file (ô FILE của module học tập) */
  imagesOnly?: boolean;
}

/** Upload ảnh lên backend (POST /file), giá trị là danh sách file đã upload */
export default function ImageUpload({ value = [], onChange, max = 5, imagesOnly = true }: ImageUploadProps) {
  const { message } = App.useApp();
  // Nhiều ảnh upload song song: luôn cộng dồn vào danh sách mới nhất
  const latest = useRef(value);
  useEffect(() => { latest.current = value; }, [value]);
  const fileList: UploadFile[] = value.map((item) => ({ uid: item.fileId, name: item.name, status: 'done', url: item.url }));

  return (
    <Upload
      accept={imagesOnly ? 'image/*' : undefined}
      listType="picture-card"
      fileList={fileList}
      multiple
      beforeUpload={(file) => {
        if (imagesOnly && !file.type.startsWith('image/')) {
          message.error('Chỉ nhận file ảnh');
          return Upload.LIST_IGNORE;
        }
        if (file.size > 10 * 1024 * 1024) {
          message.error('File tối đa 10MB');
          return Upload.LIST_IGNORE;
        }
        return true;
      }}
      customRequest={async ({ file, onSuccess, onError }) => {
        try {
          const result = await uploadFile(file as File);
          const next = [...latest.current, { fileId: result.file._id, url: result.url, name: result.file.name }].slice(0, max);
          latest.current = next;
          onChange?.(next);
          onSuccess?.(result);
        } catch (error) {
          message.error(errorMessage(error, 'Không thể tải ảnh lên'));
          onError?.(error as Error);
        }
      }}
      onRemove={(file) => {
        latest.current = latest.current.filter((item) => item.fileId !== file.uid);
        onChange?.(latest.current);
        return true;
      }}
    >
      {value.length >= max ? null : (
        <div>
          <PlusOutlined />
          <div className="mt-1 text-xs">{imagesOnly ? 'Tải ảnh' : 'Tải file'}</div>
        </div>
      )}
    </Upload>
  );
}
