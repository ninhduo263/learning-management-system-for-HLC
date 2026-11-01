'use client';

import { App, Form, Input, Modal } from 'antd';
import ImageUpload, { type UploadedImage } from '@/components/ImageUpload';
import { errorMessage } from '@/lib/api';
import { fromDateTimeLocal } from '@/services/mentoringApi';
import { historyApi } from '@/services/hlcApi';

/** Admin Mentoring nhập recap hộ khi MTE / MTO không tự đăng được */
export default function ProxyRecapModal({ target, onClose, onSaved }: {
  target: { sessionId: string; code: string; role: 'MENTOR' | 'MENTEE' } | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<{ content: string; submittedAt?: string; reason: string; images?: UploadedImage[] }>();
  return (
    <Modal
      title={target ? `Nhập recap hộ ${target.role === 'MENTOR' ? 'MTO' : 'MTE'} · ${target.code}` : ''}
      open={Boolean(target)}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Lưu recap hộ"
      destroyOnHidden
      width={680}
    >
      <Form form={form} layout="vertical" onFinish={async (values) => {
        if (!target) return;
        try {
          await historyApi.proxyRecap(target.sessionId, {
            role: target.role,
            content: values.content,
            reason: values.reason,
            submittedAt: values.submittedAt ? fromDateTimeLocal(values.submittedAt) : undefined,
            fileIds: (values.images ?? []).map((item) => item.fileId)
          });
          message.success('Đã nhập recap hộ');
          onSaved();
          onClose();
        } catch (error) {
          message.error(errorMessage(error));
        }
      }}>
        <Form.Item name="content" label="Nội dung recap" rules={[{ required: true, whitespace: true, message: 'Nhập nội dung' }]}><Input.TextArea rows={6} /></Form.Item>
        <Form.Item name="submittedAt" label="Thời điểm thành viên thực sự gửi (để tính đúng hạn; trống = bây giờ)"><Input type="datetime-local" /></Form.Item>
        <Form.Item name="images" label="Ảnh minh chứng (không bắt buộc)"><ImageUpload /></Form.Item>
        <Form.Item name="reason" label="Lý do nhập hộ (bắt buộc)" rules={[{ required: true, whitespace: true, message: 'Nhập lý do' }]}><Input.TextArea rows={2} placeholder="VD: MTE gửi recap qua Zalo vì chưa biết đăng bài" /></Form.Item>
      </Form>
    </Modal>
  );
}
