'use client';

import { useEffect, useState } from 'react';
import { Alert, App, Button, Card, Form, Input, Modal, Select, Steps, Table, Tag, Typography } from 'antd';
import { apiFetch } from '@/lib/api';
import CloudinaryImageUpload from '@/components/CloudinaryImageUpload';

export default function MenteeMentoringPage() {
  const { message } = App.useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [scheduleForm] = Form.useForm();
  const [editScheduleForm] = Form.useForm();
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [preferenceForm] = Form.useForm();
  const [preference, setPreference] = useState<any>(null);
  const [mentors, setMentors] = useState<any[]>([]);
  const [preferenceCycleId, setPreferenceCycleId] = useState('');
  const [preferenceModalOpen, setPreferenceModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/dashboard/personal');
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      setData(result.data);
      const nextCycle = (result.data.cycles || [])
        .filter((cycle: any) => new Date(cycle.startDate).getTime() > Date.now())
        .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];
      if (nextCycle) {
        setPreferenceCycleId(nextCycle.code);
        preferenceForm.setFieldValue('cycleId', nextCycle.code);
      }
      const mentorsResponse = await apiFetch('/users/mentors');
      const mentorsResult = await mentorsResponse.json();
      if (mentorsResult.success) setMentors(mentorsResult.data);
      const preferenceResponse = await apiFetch('/mentoring/preferences');
      const preferenceResult = await preferenceResponse.json();
      if (preferenceResult.success) {
        setPreference(preferenceResult.data);
        preferenceForm.setFieldsValue(preferenceResult.data);
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const proposeSchedule = async (values: any) => {
    const pair = data?.pairs?.find((item: any) => item.pairId === values.pairId);
    if (!pair) {
      message.error('Vui lòng chọn cặp mentoring');
      return;
    }
    try {
      const response = await apiFetch('/mentoring/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pairId: pair.pairId,
          cycleId: pair.cycleId,
          mentorId: pair.mentorId,
          menteeId: pair.menteeId,
          startTime: new Date(values.startTime).toISOString(),
          endTime: new Date(values.endTime).toISOString(),
          meetingLink: values.meetingLink || '',
          location: values.location || '',
          note: values.note || ''
        })
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      message.success('Đã gửi thời điểm mentoring cho Mentor');
      scheduleForm.resetFields();
      setScheduleModalOpen(false);
      await loadData();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể gửi thời điểm mentoring');
    }
  };

  const submitRecap = async (values: any) => {
    if (!values.mediaUrl) {
      message.error('Vui lòng tải ảnh minh chứng lên trước khi gửi recap');
      return;
    }
    try {
      const pair = data?.pairs?.find((item: any) => item.pairId === selectedSchedule?.pairId) || data?.pairs?.[0];
      const response = await apiFetch('/mentoring/recaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pairId: pair?.pairId,
          cycleId: selectedSchedule?.cycleId,
          scheduleId: selectedSchedule?._id,
          userId: data?.user?.userId,
          role: 'MENTEE',
          content: values.content,
          note: values.note || '',
          mediaUrls: [values.mediaUrl]
        })
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      message.success('Đã lưu recap mentoring');
      form.resetFields();
      loadData();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể lưu recap');
    }
  };

  const submitPreference = async (values: any) => {
    try {
      const response = await apiFetch('/mentoring/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, cycleId: values.cycleId || preferenceCycleId, mentorIds: values.mentorIds ?? [] })
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      setPreference(result.data);
      message.success('Đã lưu nguyện vọng mentor cho quý tiếp theo');
      preferenceForm.resetFields();
      preferenceForm.setFieldValue('cycleId', preferenceCycleId);
      setPreferenceModalOpen(false);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể lưu nguyện vọng mentor');
    }
  };

  const updateSchedule = async (values: any) => {
    if (!editingSchedule) return;
    try {
      const response = await apiFetch(`/mentoring/schedules/${editingSchedule._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          startTime: new Date(values.startTime).toISOString(),
          endTime: new Date(values.endTime).toISOString()
        })
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      message.success('Đã cập nhật lịch đề xuất');
      setEditingSchedule(null);
      await loadData();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể cập nhật lịch');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Lịch Mentoring & Recap</h1>
      <Card title="Nguyện vọng mentor cho quý tiếp theo">
        <Typography.Paragraph type="secondary">
          Chọn từ 3 đến 10 mentor theo thứ tự ưu tiên. Ban tổ chức sẽ dùng nguyện vọng này để ghép cặp và gửi thông báo theo timeline.
        </Typography.Paragraph>
        <Steps
          size="small"
          current={preference?.status === 'SUBMITTED' ? 1 : 0}
          items={[
            { title: 'Gửi nguyện vọng', content: 'Trước ngày 5 tháng cuối quý' },
            { title: 'Admin ghép cặp', content: 'Bắt đầu từ ngày 10 tháng cuối quý' }
          ]}
        />
        <Button type="primary" onClick={() => {
          preferenceForm.setFieldsValue(preference || { cycleId: preferenceCycleId });
          setPreferenceModalOpen(true);
        }}>
          Tạo nguyện vọng
        </Button>
      </Card>
      <Modal
        title="Tạo nguyện vọng mentor"
        open={preferenceModalOpen}
        onCancel={() => {
          preferenceForm.resetFields();
          preferenceForm.setFieldValue('cycleId', preferenceCycleId);
          setPreferenceModalOpen(false);
        }}
        footer={null}
        forceRender
        destroyOnHidden
      >
        <Form form={preferenceForm} layout="vertical" onFinish={submitPreference}>
          <Form.Item name="cycleId" hidden><Input /></Form.Item>
          <Typography.Text type="secondary">Quý áp dụng: {preferenceCycleId || 'Chưa mở quý kế tiếp'}</Typography.Text>
          <Form.Item
            name="mentorIds"
            label="Danh sách mentor ưu tiên"
            rules={[
              { required: true, message: 'Chọn ít nhất 3 mentor' },
              { validator: (_, value) => value?.length >= 3 && value.length <= 10 ? Promise.resolve() : Promise.reject(new Error('Vui lòng chọn từ 3 đến 10 mentor')) }
            ]}
          >
            <Select
              mode="multiple"
              showSearch
              optionFilterProp="label"
              placeholder="Chọn 3–10 mentor"
              options={mentors.map((mentor: any) => ({
                value: mentor.userId,
                label: `${mentor.fullName || mentor.userId}${mentor.specialty ? ` — ${mentor.specialty}` : ''}`
              }))}
            />
          </Form.Item>
          <Form.Item name="message" label="Lời nhắn cho admin / mentor (không bắt buộc)">
            <Input.TextArea rows={3} maxLength={500} showCount placeholder="Mục tiêu, chủ đề hoặc thời gian phù hợp..." />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>Lưu nguyện vọng</Button>
        </Form>
      </Modal>
      {!loading && !data && <Alert type="error" showIcon title="Không tải được dữ liệu mentoring" description="Vui lòng đăng nhập lại hoặc kiểm tra kết nối backend." />}
      {!loading && data && data.pairs.length === 0 && data.schedules.length === 0 && (
        <Alert type="info" showIcon title="Chưa có dữ liệu mentoring" description="Admin chưa ghép cặp hoặc chưa tạo request lịch cho tài khoản này." />
      )}
      <Card title="Thông tin cặp hiện tại">
        <Table
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 5 }}
          dataSource={data?.pairs ?? []}
          columns={[
            { title: 'Quý', dataIndex: 'cycleId' },
            { title: 'Pair', dataIndex: 'pairId' },
            { title: 'Mentor', dataIndex: 'mentorId' },
            { title: 'Mentee', dataIndex: 'menteeId' },
            { title: 'Trạng thái', dataIndex: 'status', render: (value: string) => <Tag color={value === 'ACTIVE' ? 'green' : 'gold'}>{value}</Tag> }
          ]}
        />
      </Card>

      <Card title="Danh sách ghép cặp theo quý">
        <Table
          rowKey="_id"
          loading={loading}
          dataSource={data?.schedules ?? []}
          pagination={{ pageSize: 5 }}
          columns={[
            { title: 'Quý', dataIndex: 'cycleId' },
            { title: 'Mã tháng', dataIndex: 'monthCode' },
            { title: 'Thời gian', render: (record: any) => `${new Date(record.startTime).toLocaleString()} - ${new Date(record.endTime).toLocaleString()}` },
            { title: 'Trạng thái', dataIndex: 'status', render: (value: string) => <Tag color={value === 'CONFIRMED' ? 'green' : value === 'COMPLETED' ? 'blue' : 'gold'}>{value}</Tag> },
            {
              title: 'Thao tác',
              render: (_: unknown, record: any) => (
                <Button
                  disabled={record.status !== 'PROPOSED'}
                  onClick={() => {
                    setEditingSchedule(record);
                    editScheduleForm.setFieldsValue({
                      startTime: toDateTimeLocal(record.startTime),
                      endTime: toDateTimeLocal(record.endTime),
                      meetingLink: record.meetingLink,
                      location: record.location,
                      note: record.note
                    });
                  }}
                >
                  Sửa
                </Button>
              )
            },
            {
              title: 'Recap',
              render: (_: unknown, record: any) => (
                <Button
                  disabled={record.status !== 'COMPLETED'}
                  onClick={() => setSelectedSchedule(record)}
                >
                  Viết recap
                </Button>
              )
            }
          ]}
        />
      </Card>

      <Modal title="Sửa lịch mentoring đề xuất" open={Boolean(editingSchedule)} onCancel={() => { editScheduleForm.resetFields(); setEditingSchedule(null); }} footer={null} forceRender destroyOnHidden>
        <Form form={editScheduleForm} layout="vertical" onFinish={updateSchedule}>
          <Form.Item name="startTime" label="Ngày và giờ bắt đầu" rules={[{ required: true }]}><Input type="datetime-local" /></Form.Item>
          <Form.Item name="endTime" label="Ngày và giờ kết thúc" rules={[{ required: true }]}><Input type="datetime-local" /></Form.Item>
          <Form.Item name="meetingLink" label="Link meeting"><Input /></Form.Item>
          <Form.Item name="location" label="Địa điểm"><Input /></Form.Item>
          <Form.Item name="note" label="Ghi chú"><Input /></Form.Item>
          <Button type="primary" htmlType="submit" block>Lưu thay đổi</Button>
        </Form>
      </Modal>

      <Card title="Lịch mentoring">
        <p className="mb-4 text-sm text-gray-500">
          Mentee chọn ngày và giờ dự kiến. Lịch sẽ ở trạng thái đề xuất để Admin chốt.
        </p>
        <Button type="primary" onClick={() => {
          scheduleForm.resetFields();
          setScheduleModalOpen(true);
        }}>
          Tạo lịch mentoring
        </Button>
      </Card>
      <Modal
        title="Tạo lịch mentoring"
        open={scheduleModalOpen}
        onCancel={() => {
          scheduleForm.resetFields();
          setScheduleModalOpen(false);
        }}
        footer={null}
        forceRender
        destroyOnHidden
      >
        <Form form={scheduleForm} layout="vertical" onFinish={proposeSchedule}>
          <div className="grid gap-4 md:grid-cols-2">
            <Form.Item name="pairId" label="Cặp mentoring" rules={[{ required: true, message: 'Chọn cặp mentoring' }]}>
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="Chọn cặp mentoring"
                options={(data?.pairs ?? []).map((pair: any) => ({
                  value: pair.pairId,
                  label: `${pair.cycleId} - ${pair.pairId} - Mentor ${pair.mentorId}`
                }))}
              />
            </Form.Item>
            <Form.Item name="startTime" label="Ngày và giờ bắt đầu" rules={[{ required: true, message: 'Chọn thời điểm bắt đầu' }]}>
              <Input type="datetime-local" />
            </Form.Item>
            <Form.Item name="endTime" label="Ngày và giờ kết thúc" rules={[{ required: true, message: 'Chọn thời điểm kết thúc' }]}>
              <Input type="datetime-local" />
            </Form.Item>
            <Form.Item name="meetingLink" label="Link meeting">
              <Input placeholder="https://meet.google.com/..." />
            </Form.Item>
            <Form.Item name="location" label="Địa điểm">
              <Input placeholder="Online hoặc địa điểm offline" />
            </Form.Item>
            <Form.Item name="note" label="Ghi chú">
              <Input placeholder="Nội dung cần trao đổi" />
            </Form.Item>
          </div>
          <Button type="primary" htmlType="submit">Gửi thời điểm mentoring</Button>
        </Form>
      </Modal>

      {selectedSchedule && selectedSchedule.status === 'COMPLETED' && (
        <Card title={`Gửi recap - ${selectedSchedule.monthCode || selectedSchedule.pairId}`}>
          <Form form={form} layout="vertical" onFinish={submitRecap}>
            <Form.Item name="content" label="Nội dung recap" rules={[{ required: true }]}>
              <Input.TextArea rows={5} placeholder="Tóm tắt buổi mentoring / kế hoạch tuần tới" />
            </Form.Item>
            <Form.Item name="mediaUrl" label="Link ảnh / link meeting (nếu có)">
              <CloudinaryImageUpload required />
            </Form.Item>
            <Form.Item name="note" label="Ghi chú">
              <Input placeholder="Ghi chú" />
            </Form.Item>
            <Button type="primary" htmlType="submit">Gửi recap</Button>
          </Form>
        </Card>
      )}
    </div>
  );
}

function toDateTimeLocal(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  const pad = (number: number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
