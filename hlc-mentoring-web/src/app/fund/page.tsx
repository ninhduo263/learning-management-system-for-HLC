'use client';
import { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { UploadOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { CldUploadWidget } from 'next-cloudinary';
import { apiFetch } from '@/lib/api';

export default function HlcFundPage() {
  // Biến lưu trữ link ảnh sau khi Cloudinary trả về
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [form] = Form.useForm();

  // Hàm xử lý khi bấm nút "Gửi báo cáo"
  const onFinish = async (values: any) => {
    if (!imageUrl) {
      message.error('Bạn chưa tải ảnh minh chứng lên!');
      return;
    }
    
    // 1. Đóng gói dữ liệu khớp chính xác với Schema của Backend
    const payload = {
      submissionType: 'HLC_FUND',
      content: {
        imageUrls: [imageUrl] // Đưa link Cloudinary vào mảng
      },
      note: values.note || ''
    };

    try {
      // Hiển thị trạng thái đang tải
      message.loading({ content: 'Đang gửi dữ liệu...', key: 'submitFund' });

      // 2. Bắn dữ liệu qua API Backend
      const response = await apiFetch('/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload), // Chuyển object thành chuỗi JSON
      });

      const data = await response.json();

      // 3. Xử lý kết quả trả về
      if (response.ok && data.success) {
        message.success({ content: 'Đã lưu minh chứng thành công vào Cơ sở dữ liệu!', key: 'submitFund', duration: 3 });
        
        // Xóa trắng form để chuẩn bị cho lần nộp sau
        form.resetFields();
        setImageUrl(null);
      } else {
        message.error({ content: 'Lỗi từ máy chủ: ' + data.message, key: 'submitFund', duration: 3 });
      }
    } catch (error) {
      console.error('Lỗi kết nối:', error);
      message.error({ content: 'Không thể kết nối đến Server Backend. Hãy kiểm tra xem Backend đã chạy chưa!', key: 'submitFund', duration: 3 });
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-sm border border-gray-100">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Nộp minh chứng quỹ HLC</h1>
      <p className="text-gray-500 mb-6">
        Vui lòng tải lên ảnh chụp màn hình giao dịch chuyển khoản quỹ HLC của bạn trong tháng này.
      </p>

      <Form form={form} layout="vertical" onFinish={onFinish}>
        
        {/* KHU VỰC TẢI ẢNH (CLOUDINARY WIDGET) */}
        <div className="mb-6">
          <label className="block pb-2 font-medium">Ảnh minh chứng giao dịch <span className="text-red-500">*</span></label>
          
          <CldUploadWidget 
            uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
            onSuccess={(result: any) => {
              // Khi upload thành công, lấy đường link ảnh bảo mật (secure_url) lưu vào biến
              setImageUrl(result.info.secure_url);
              message.success('Tải ảnh lên thành công!');
            }}
          >
            {({ open }) => {
              return (
                <div className="flex flex-col items-start gap-4">
                  {/* Nút bấm để mở bảng upload của Cloudinary */}
                  <Button 
                    icon={<UploadOutlined />} 
                    onClick={() => open()}
                    className="bg-gray-50"
                  >
                    {imageUrl ? 'Tải lại ảnh khác' : 'Chọn ảnh tải lên'}
                  </Button>
                  
                  {/* Hiển thị ảnh xem trước nếu đã upload xong */}
                  {imageUrl && (
                    <div className="relative border-2 border-green-400 rounded-md p-1">
                      <span className="absolute -top-3 -right-3 bg-white text-green-500 rounded-full">
                        <CheckCircleOutlined className="text-xl" />
                      </span>
                      <img src={imageUrl} alt="Minh chứng" className="h-40 object-contain rounded" />
                    </div>
                  )}
                </div>
              );
            }}
          </CldUploadWidget>
        </div>

        {/* FORM GHI CHÚ BỔ SUNG */}
        <Form.Item label="Ghi chú thêm (Nếu có)" name="note">
          <Input.TextArea 
            rows={3} 
            placeholder="Ví dụ: Em nộp quỹ tháng 9 muộn 1 ngày do lỗi ngân hàng ạ..." 
          />
        </Form.Item>

        <Form.Item className="mt-8 mb-0">
          <Button type="primary" htmlType="submit" size="large" className="bg-blue-600 w-full md:w-auto">
            Gửi báo cáo
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}