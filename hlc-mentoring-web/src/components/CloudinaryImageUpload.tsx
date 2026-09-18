'use client';

import { CheckCircleOutlined, UploadOutlined } from '@ant-design/icons';
import { Alert, Button, Image, Space } from 'antd';
import { CldUploadWidget } from 'next-cloudinary';

interface CloudinaryImageUploadProps {
  value?: string;
  onChange?: (value?: string) => void;
  required?: boolean;
}

export default function CloudinaryImageUpload({ value, onChange, required = false }: CloudinaryImageUploadProps) {
  return (
    <CldUploadWidget
      uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
      options={{ multiple: false, maxFiles: 1, resourceType: 'image' }}
      onSuccess={(result: any) => onChange?.(result?.info?.secure_url)}
    >
      {({ open }) => (
        <Space direction="vertical" size="small">
          <Button icon={<UploadOutlined />} onClick={() => open()}>
            {value ? 'Tải lại ảnh' : 'Tải ảnh lên Cloudinary'}
          </Button>
          {value ? (
            <div className="relative inline-block rounded border border-green-400 p-1">
              <CheckCircleOutlined className="absolute right-1 top-1 z-10 rounded-full bg-white text-green-500" />
              <Image src={value} alt="Ảnh recap" width={180} height={120} className="object-contain" />
            </div>
          ) : required ? (
            <Alert type="info" showIcon message="Bắt buộc tải lên ảnh minh chứng cho recap." />
          ) : null}
        </Space>
      )}
    </CldUploadWidget>
  );
}
