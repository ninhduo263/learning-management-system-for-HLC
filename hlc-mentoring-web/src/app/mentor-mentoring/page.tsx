'use client';

import { useEffect, useState } from 'react';
import { Alert, App, Button, Card, Descriptions, Form, Input, Modal, Table, Tag } from 'antd';
import { apiFetch } from '@/lib/api';
import CloudinaryImageUpload from '@/components/CloudinaryImageUpload';
import MemberQuarterlyReport from '@/components/MemberQuarterlyReport';
import ProfileLink from '@/components/ProfileLink';
import { useMentoringData } from '@/utils/useMentoringData';
import { canWriteMentoringRecap } from '@/utils/mentoringSchedule';

export default function MentorMentoringPage() {
  const { message } = App.useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [detailSchedule, setDetailSchedule] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/dashboard/personal');
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      setData(result.data);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Lỗi tải dữ liệu mentor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);
  const mentoringData = useMentoringData(data?.pairs);
  const visibleMonthlyIds = new Set(mentoringData.currentPairs.map((pair) => pair.monthlyId).filter(Boolean));
  const visibleSchedules = (data?.schedules ?? [])
    .filter((schedule: any) => visibleMonthlyIds.has(schedule.monthlyId))
    .map((schedule: any) => {
      const pair = data?.pairs?.find((item: any) => item.monthlyId === schedule.monthlyId);
      return {
        ...schedule,
        mentor: schedule.mentor?.fullName ? schedule.mentor : pair?.mentor,
        mentee: schedule.mentee?.fullName ? schedule.mentee : pair?.mentee,
        recap: (data?.recaps ?? []).find((item: any) => (
          item.role === 'MENTOR'
          && item.monthlyId === schedule.monthlyId
          && (item.scheduleId === String(schedule._id) || !item.scheduleId)
        ))
      };
    });

  const handleSubmitRecap = async (values: any) => {
    if (!values.mediaUrl) {
      message.error('Vui lòng tải ảnh minh chứng lên trước khi gửi recap');
      return;
    }
    try {
      const pair = data?.pairs?.find((item: any) =>
        item.monthlyId === selectedSchedule?.monthlyId
      ) || data?.pairs?.[0];
      const response = await apiFetch('/mentoring/recaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyId: pair?.monthlyId,
          cycleId: selectedSchedule?.cycleId,
          scheduleId: selectedSchedule?._id,
          role: 'MENTOR',
          content: values.content,
          note: values.note || '',
          mediaUrls: [values.mediaUrl]
        })
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      message.success(selectedSchedule?.recap ? 'Đã cập nhật recap mentor' : 'Đã gửi recap mentor');
      form.resetFields();
      setSelectedSchedule(null);
      await loadData();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể lưu recap mentor');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Lịch mentoring & recap</h1>
      {!loading && !data && <Alert type="error" showIcon title="Không tải được dữ liệu mentoring" description="Vui lòng đăng nhập lại hoặc kiểm tra kết nối backend." />}
      {!loading && data && data.pairs.length === 0 && data.schedules.length === 0 && (
        <Alert type="info" showIcon title="Chưa có dữ liệu mentoring" description="Admin chưa ghép cặp hoặc chưa tạo request lịch cho tài khoản này." />
      )}
      <Card title={`Thông tin cặp hiện tại (${mentoringData.currentCycleId})`}>
        <Table
          rowKey="_id"
          loading={loading}
          dataSource={mentoringData.currentPairs}
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 5 }}
          columns={[
            { title: 'Quý', dataIndex: 'cycleId' },
            { title: 'Mã mentoring tháng', dataIndex: 'monthlyId' },
            { title: 'Mentor', render: (_: unknown, record: any) => <div><strong>{record.mentor?.fullName || 'Chưa có họ tên'}</strong><div className="text-xs text-gray-500">{record.mentor?.userId || record.mentorId || '—'}</div></div> },
            { title: 'Mentee', render: (_: unknown, record: any) => <div><strong>{record.mentee?.fullName || 'Chưa có họ tên'}</strong><div className="text-xs text-gray-500">{record.mentee?.userId || record.menteeId || '—'}</div></div> },
            { title: 'Profile Mentor', render: (_: unknown, record: any) => <ProfileLink url={record.mentor?.profileUrl} /> },
            { title: 'Profile Mentee', render: (_: unknown, record: any) => <ProfileLink url={record.mentee?.profileUrl} /> },
            { title: 'SĐT', dataIndex: ['counterpart', 'phone'], render: (value: string) => value || '—' },
          ]}
        />
      </Card>
      <MemberQuarterlyReport />
      <Card title="Lịch mentoring của mentor">
        <Table
          rowKey="_id"
          loading={loading}
          dataSource={visibleSchedules}
          scroll={{ x: 'max-content' }}
          columns={[
            { title: 'Quý', dataIndex: 'cycleId' },
            { title: 'Mã tháng', dataIndex: 'monthlyId' },
            { title: 'Mentor', render: (_: unknown, record: any) => <div><strong>{record.mentor?.fullName || 'Chưa có họ tên'}</strong><div className="text-xs text-gray-500">{record.mentor?.userId || record.mentorId || '—'}</div></div> },
            { title: 'Mentee', render: (_: unknown, record: any) => <div><strong>{record.mentee?.fullName || 'Chưa có họ tên'}</strong><div className="text-xs text-gray-500">{record.mentee?.userId || record.menteeId || '—'}</div></div> },
            { title: 'Profile Mentor', render: (_: unknown, record: any) => <ProfileLink url={record.mentor?.profileUrl} /> },
            { title: 'Profile Mentee', render: (_: unknown, record: any) => <ProfileLink url={record.mentee?.profileUrl} /> },
            { title: 'Bắt đầu', dataIndex: 'startTime', render: (value: string) => new Date(value).toLocaleString() },
            { title: 'Kết thúc', dataIndex: 'endTime', render: (value: string) => new Date(value).toLocaleString() },
            { title: 'Trạng thái', dataIndex: 'status', render: (value: string) => <Tag color={value === 'COMPLETED' ? 'green' : 'blue'}>{value}</Tag> },
            { title: 'Chi tiết', render: (_: unknown, record: any) => <Button onClick={() => setDetailSchedule(record)}>Xem chi tiết</Button> },
            { title: 'Recap', render: (_: unknown, record: any) => (
              <Button
                disabled={!canWriteMentoringRecap(record, record.recap)}
                onClick={() => {
                  form.setFieldsValue({
                    content: record.recap?.content || '',
                    mediaUrl: record.recap?.mediaUrls?.[0] || '',
                    note: record.recap?.note || ''
                  });
                  setSelectedSchedule(record);
                }}
              >
                {record.recap?.status === 'APPROVED' ? 'Đã duyệt' : record.recap ? 'Sửa recap' : 'Viết recap'}
              </Button>
            ) }
          ]}
        />
      </Card>

      <Modal title="Chi tiết lịch hẹn" open={Boolean(detailSchedule)} onCancel={() => setDetailSchedule(null)} footer={null}>
        {detailSchedule && <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="Mã cặp">{detailSchedule.monthlyId}</Descriptions.Item>
          <Descriptions.Item label="Quý">{detailSchedule.cycleId}</Descriptions.Item>
          <Descriptions.Item label="HLC ID Mentor">{detailSchedule.mentor?.userId || detailSchedule.mentorId}</Descriptions.Item>
          <Descriptions.Item label="Tên Mentor">{detailSchedule.mentor?.fullName || '—'}</Descriptions.Item>
          <Descriptions.Item label="HLC ID Mentee">{detailSchedule.mentee?.userId || detailSchedule.menteeId}</Descriptions.Item>
          <Descriptions.Item label="Tên Mentee">{detailSchedule.mentee?.fullName || '—'}</Descriptions.Item>
          <Descriptions.Item label="Bắt đầu">{new Date(detailSchedule.startTime).toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label="Kết thúc">{new Date(detailSchedule.endTime).toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label="Trạng thái">{detailSchedule.status}</Descriptions.Item>
          <Descriptions.Item label="Link meeting">{detailSchedule.meetingLink || 'Chưa có'}</Descriptions.Item>
          <Descriptions.Item label="Địa điểm">{detailSchedule.location || 'Chưa có'}</Descriptions.Item>
          <Descriptions.Item label="Ghi chú">{detailSchedule.note || 'Không có'}</Descriptions.Item>
        </Descriptions>}
      </Modal>

      <Modal
        title={selectedSchedule ? `${selectedSchedule.recap ? 'Sửa recap mentor' : 'Gửi recap mentor'} - ${selectedSchedule.monthCode || selectedSchedule.monthlyId}` : 'Gửi recap mentor'}
        open={Boolean(selectedSchedule && canWriteMentoringRecap(selectedSchedule, selectedSchedule.recap))}
        onCancel={() => {
          form.resetFields();
          setSelectedSchedule(null);
        }}
        footer={null}
        destroyOnHidden
      >
        {selectedSchedule && canWriteMentoringRecap(selectedSchedule, selectedSchedule.recap) && (
          <>
          <Descriptions bordered size="small" column={1} className="mb-4">
            <Descriptions.Item label="HLC ID Mentor">{selectedSchedule.mentor?.userId || selectedSchedule.mentorId}</Descriptions.Item>
            <Descriptions.Item label="Tên Mentor">{selectedSchedule.mentor?.fullName || '—'}</Descriptions.Item>
            <Descriptions.Item label="HLC ID Mentee">{selectedSchedule.mentee?.userId || selectedSchedule.menteeId}</Descriptions.Item>
            <Descriptions.Item label="Tên Mentee">{selectedSchedule.mentee?.fullName || '—'}</Descriptions.Item>
          </Descriptions>
          <Form form={form} layout="vertical" onFinish={handleSubmitRecap}>
            <Form.Item name="content" label="Nội dung recap" rules={[{ required: true }]}>
              <Input.TextArea rows={5} placeholder="Tóm tắt đầu buổi / nội dung mentor" />
            </Form.Item>
            <Form.Item name="mediaUrl" label="Link ảnh / tài liệu">
              <CloudinaryImageUpload required />
            </Form.Item>
            <Form.Item name="note" label="Ghi chú">
              <Input placeholder="Ghi chú" />
            </Form.Item>
            <Button type="primary" htmlType="submit">{selectedSchedule.recap ? 'Cập nhật recap' : 'Gửi recap'}</Button>
          </Form>
          </>
        )}
      </Modal>
    </div>
  );
}
