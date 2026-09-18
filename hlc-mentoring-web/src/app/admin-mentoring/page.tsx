'use client';

import { useEffect, useMemo, useState } from 'react';
import { App, Button, Card, Descriptions, Form, Input, Modal, Select, Space, Table, Tabs, Tag, Typography } from 'antd';
import { EyeOutlined, EditOutlined, PlusOutlined, CheckOutlined } from '@ant-design/icons';
import { apiFetch } from '@/lib/api';

interface Cycle { code: string; name: string; }
interface UserOption { userId: string; fullName: string; mentorId?: string; }
interface Pair {
  _id: string;
  pairId: string;
  pairCode?: string;
  monthlyCode?: string;
  cycleId: string;
  mentorId: string;
  menteeId: string;
  status: string;
  recapStatus?: string;
}

function pairMonth(pair: Pair, cycleId: string) {
  const code = pair.pairCode || pair.monthlyCode || '';
  const formattedMatch = /^(\d{2})\/\d{4}-\d{5}-\d{5}$/.exec(code);
  if (formattedMatch) return Number(formattedMatch[1]);
  const numericMonth = Number(code.slice(0, 2));
  if (numericMonth >= 1 && numericMonth <= 12) return numericMonth;
  const match = new RegExp(`^${cycleId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}M([1-3])$`, 'i').exec(code);
  if (!match) return undefined;
  const quarter = Number(cycleId.slice(-1));
  return (quarter - 1) * 3 + Number(match[1]);
}
interface Schedule {
  _id: string;
  pairId: string;
  cycleId: string;
  monthCode?: string;
  startTime: string;
  endTime: string;
  confirmedAt?: string;
  status: string;
  meetingLink?: string;
  location?: string;
  note?: string;
}
interface Recap {
  _id: string;
  pairId: string;
  scheduleId?: string;
  userId: string;
  role: string;
  status: string;
  createdAt: string;
  content?: string;
  mediaUrls?: string[];
  note?: string;
}
interface PairForm { cycleId: string; month: number; mentorId: string; menteeId: string; }

const recapLabels: Record<string, string> = {
  PENDING: 'Chờ',
  SUBMITTED: 'Đã nộp',
  APPROVED: 'Đã nộp',
  'ĐÃ NỘP/ĐÃ XONG': 'Đã nộp',
  'CHƯA XONG': 'Chưa xong',
  'NỘP MUỘN': 'Nộp muộn',
  MISSING: 'Chưa xong'
};

function recapColor(status?: string) {
  if (status === 'SUBMITTED' || status === 'APPROVED' || status === 'ĐÃ NỘP/ĐÃ XONG') return 'green';
  if (status === 'LATE' || status === 'NỘP MUỘN' || status === 'CHƯA XONG') return 'red';
  return 'gold';
}

function toDateTimeLocal(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  const pad = (number: number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdminMentoringPage() {
  const { message } = App.useApp();
  const [createForm] = Form.useForm<PairForm>();
  const [editForm] = Form.useForm<PairForm>();
  const [overrideForm] = Form.useForm();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [mentors, setMentors] = useState<UserOption[]>([]);
  const [mentees, setMentees] = useState<UserOption[]>([]);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [recaps, setRecaps] = useState<Recap[]>([]);
  const ADMIN_PAIRING_CYCLE = '2026Q4';
  const [selectedCycle, setSelectedCycle] = useState(ADMIN_PAIRING_CYCLE);
  const [selectedPair, setSelectedPair] = useState<Pair | null>(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<'create' | 'edit' | 'detail' | null>(null);
  const [overrideSchedule, setOverrideSchedule] = useState<Schedule | null>(null);
  const [reviewingRecap, setReviewingRecap] = useState<Recap | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const unlockCycle = async () => {
    if (!selectedCycle) return;
    try {
      const response = await apiFetch(`/cycles/${encodeURIComponent(selectedCycle)}/unlock`, { method: 'PATCH' });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      message.success('Đã mở khóa quý để test tạo lịch mentoring');
      await loadData(selectedCycle);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể mở khóa quý');
    }
  };

  const mentorName = (id: string) => mentors.find((item) => item.userId === id)?.fullName || id;
  const menteeName = (id: string) => mentees.find((item) => item.userId === id)?.fullName || id;

  const loadData = async (cycleId = selectedCycle) => {
    setLoading(true);
    try {
      const query = cycleId ? `?cycleId=${encodeURIComponent(cycleId)}` : '';
      const responses = await Promise.all([
        apiFetch('/cycles'),
        apiFetch('/users/mentors'),
        apiFetch('/users/mentees'),
        apiFetch(`/mentoring/pairs${query}`),
        apiFetch(`/mentoring/schedules${query}`),
        apiFetch(`/mentoring/recaps${query}`),
        apiFetch(`/mentoring/pairs/status${query}`)
      ]);
      const results = await Promise.all(responses.map((response) => response.json()));
      const [cycleResult, mentorResult, menteeResult, pairResult, scheduleResult, recapResult, statusResult] = results;
      if (cycleResult.success) {
        setCycles(cycleResult.data);
        if (!cycleResult.data.some((cycle: Cycle) => cycle.code === ADMIN_PAIRING_CYCLE)) {
          message.warning(`Không tìm thấy kỳ ${ADMIN_PAIRING_CYCLE} trong danh sách kỳ hoạt động`);
        }
      }
      if (mentorResult.success) setMentors(mentorResult.data);
      if (menteeResult.success) setMentees(menteeResult.data);
      if (scheduleResult.success) setSchedules(scheduleResult.data);
      if (recapResult.success) setRecaps(recapResult.data);
      if (statusResult.success) {
        setPairs(cycleId ? statusResult.data.filter((item: Pair) => item.cycleId === cycleId) : statusResult.data);
      } else if (pairResult.success) {
        setPairs(cycleId ? pairResult.data.filter((item: Pair) => item.cycleId === cycleId) : pairResult.data);
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể tải danh sách ghép cặp');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(ADMIN_PAIRING_CYCLE); }, []);
  useEffect(() => { if (selectedCycle) loadData(selectedCycle); }, [selectedCycle]);

  const cycleOptions = cycles
    .filter((cycle) => cycle.code === ADMIN_PAIRING_CYCLE)
    .map((cycle) => ({ value: cycle.code, label: `${cycle.code} - ${cycle.name}` }));
  const createCycleCode = Form.useWatch('cycleId', createForm) || selectedCycle;
  const createMonth = Form.useWatch('month', createForm);
  const monthOptions = monthsForCycleOptions(createCycleCode);
  const pairedMenteeIds = useMemo(
    () => new Set(pairs
      .filter((pair) => pair.cycleId === createCycleCode && pair.status !== 'CANCELLED')
      .filter((pair) => !createMonth || Number(pair.monthlyCode?.slice(0, 2)) === Number(createMonth))
      .map((pair) => pair.menteeId)),
    [pairs, createCycleCode, createMonth]
  );
  const availableMentees = mentees.filter((mentee) => !pairedMenteeIds.has(mentee.userId));
  const monthlyPairs = useMemo(
    () => [10, 11, 12].map((month) => ({
      month,
      pairs: pairs.filter((pair) => {
        if (pair.cycleId !== ADMIN_PAIRING_CYCLE) return false;
        return pairMonth(pair, ADMIN_PAIRING_CYCLE) === month;
      })
    })),
    [pairs]
  );
  const buildMonthlyCode = (values: PairForm) => {
    return String(values.month);
  };

  function monthsForCycleOptions(cycleCode: string) {
    const match = /^(\d{4})Q([1-4])$/i.exec(String(cycleCode || '').replace('-', ''));
    const firstMonth = match ? (Number(match[2]) - 1) * 3 + 1 : 1;
    return [0, 1, 2].map((offset) => {
      const month = firstMonth + offset;
      return { value: month, label: `Tháng ${month}` };
    });
  }

  const submitCreate = async (values: PairForm) => {
    try {
      const response = await apiFetch('/mentoring/pairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, monthCode: buildMonthlyCode(values) })
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      message.success('Đã thêm cặp mentoring');
      createForm.resetFields();
      setModal(null);
      await loadData(values.cycleId);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể thêm cặp mentoring');
    }
  };

  const submitEdit = async (values: PairForm) => {
    if (!selectedPair) return;
    try {
      const response = await apiFetch(`/mentoring/pairs/${selectedPair.pairId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mentorId: values.mentorId, menteeId: values.menteeId, monthlyCode: buildMonthlyCode(values) })
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      message.success('Đã cập nhật cặp mentoring');
      setModal(null);
      await loadData(values.cycleId);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể cập nhật cặp mentoring');
    }
  };

  const detailSchedules = useMemo(() => schedules.filter((item) => item.pairId === selectedPair?.pairId), [schedules, selectedPair]);
  const detailRecaps = useMemo(() => recaps.filter((item) => item.pairId === selectedPair?.pairId), [recaps, selectedPair]);

  const reviewRecap = async (recap: Recap, status: 'APPROVED' | 'REJECTED') => {
    try {
      const response = await apiFetch(`/mentoring/recaps/${recap._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note: reviewNote })
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      message.success(status === 'APPROVED' ? 'Đã duyệt recap' : 'Đã từ chối recap');
      setReviewingRecap(null);
      setReviewNote('');
      await loadData(selectedCycle);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể cập nhật recap');
    }
  };

  const columns = [
    { title: 'Mã mentoring', dataIndex: 'pairCode', render: (value: string, row: Pair) => value || row.pairCode || row.pairId },
    { title: 'Họ và tên Mentee', dataIndex: 'menteeId', render: (value: string) => menteeName(value) },
    { title: 'Mentor phụ trách', dataIndex: 'mentorId', render: (value: string) => mentorName(value) },
    { title: 'Trạng thái recap', dataIndex: 'recapStatus', render: (value: string) => <Tag color={recapColor(value)}>{recapLabels[value] || value || 'Chờ'}</Tag> },
    { title: 'Trạng thái hoạt động', dataIndex: 'status', render: (value: string) => <Tag color={value === 'ACTIVE' ? 'green' : value === 'COMPLETED' ? 'blue' : 'default'}>{value}</Tag> },
    {
      title: 'Thao tác',
      render: (_: unknown, row: Pair) => (
        <Space>
          <Button type="text" icon={<EyeOutlined />} onClick={(event) => { event.stopPropagation(); setSelectedPair(row); setModal('detail'); }} />
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={(event) => {
              event.stopPropagation();
              setSelectedPair(row);
              editForm.setFieldsValue({
                cycleId: row.cycleId,
                mentorId: row.mentorId,
                menteeId: row.menteeId,
                month: pairMonth(row, row.cycleId) || monthOptions[0]?.value
              });
              setModal('edit');
            }}
          >
            Chỉnh sửa
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Typography.Title level={3} className="!mb-0">Quản lý Ghép cặp</Typography.Title>
        <Space>
          <Select value={ADMIN_PAIRING_CYCLE} options={cycleOptions} className="min-w-52" disabled />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { createForm.setFieldsValue({ cycleId: selectedCycle, month: monthOptions[0]?.value }); setModal('create'); }}>Thêm mới</Button>
          <Button icon={<EditOutlined />} disabled={!selectedPair} onClick={() => { if (selectedPair) { editForm.setFieldsValue({ cycleId: selectedPair.cycleId, mentorId: selectedPair.mentorId, menteeId: selectedPair.menteeId, month: pairMonth(selectedPair, selectedPair.cycleId) || monthOptions[0]?.value }); setModal('edit'); } }}>Chỉnh sửa</Button>
          <Button onClick={unlockCycle} disabled={!selectedCycle}>Mở khóa quý</Button>
        </Space>
      </div>

      <Card styles={{ body: { padding: 0 } }}>
        <Tabs
          defaultActiveKey="10"
          items={monthlyPairs.map(({ month, pairs: monthPairs }) => ({
            key: String(month),
            label: `Q4-T${month}`,
            children: (
              <Table
                rowKey="_id"
                loading={loading}
                columns={columns}
                dataSource={monthPairs}
                pagination={{ pageSize: 10 }}
                onRow={(row) => ({ onClick: () => { setSelectedPair(row); setModal('detail'); }, className: 'cursor-pointer' })}
                locale={{ emptyText: `Chưa có dữ liệu ghép cặp tháng ${month}/2026` }}
              />
            )
          }))}
        />
      </Card>

      <Card title="Duyệt recap mentoring" extra={<Tag>{recaps.filter((recap) => recap.status === 'SUBMITTED' || recap.status === 'LATE').length} chờ duyệt</Tag>}>
        <Table
          rowKey="_id"
          size="small"
          loading={loading}
          dataSource={recaps}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: 'Cặp', dataIndex: 'pairId' },
            { title: 'Vai trò', dataIndex: 'role', render: (value: string) => <Tag color={value === 'MENTOR' ? 'blue' : 'green'}>{value}</Tag> },
            { title: 'Ngày nộp', dataIndex: 'createdAt', render: (value: string) => new Date(value).toLocaleString() },
            { title: 'Trạng thái', dataIndex: 'status', render: (value: string) => <Tag color={recapColor(value)}>{recapLabels[value] || value}</Tag> },
            { title: 'Ảnh', dataIndex: 'mediaUrls', render: (value: string[]) => value?.length ? <a href={value[0]} target="_blank" rel="noreferrer">Xem ảnh</a> : 'Thiếu ảnh' },
            { title: 'Thao tác', render: (_: unknown, recap: Recap) => <Button disabled={!['SUBMITTED', 'LATE'].includes(recap.status)} onClick={() => setReviewingRecap(recap)}>Xem & duyệt</Button> }
          ]}
        />
      </Card>

      <Modal title="Thêm cặp mentoring" open={modal === 'create'} onCancel={() => setModal(null)} footer={null} forceRender destroyOnHidden>
        <PairForm form={createForm} cycles={cycleOptions} months={monthOptions} mentors={mentors} mentees={availableMentees} onFinish={submitCreate} />
      </Modal>
      <Modal title="Sửa cặp mentoring" open={modal === 'edit'} onCancel={() => { editForm.resetFields(); setModal(null); }} footer={null} forceRender destroyOnHidden>
        <PairForm form={editForm} cycles={cycleOptions} months={monthOptions} mentors={mentors} mentees={mentees} onFinish={submitEdit} />
      </Modal>
      <Modal title="Chi tiết cặp mentoring" open={modal === 'detail'} onCancel={() => setModal(null)} footer={null} width={800}>
        {selectedPair && (
          <div className="space-y-5">
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Mã mentoring">{selectedPair.pairCode || selectedPair.pairId}</Descriptions.Item>
              <Descriptions.Item label="Quý">{selectedPair.cycleId}</Descriptions.Item>
              <Descriptions.Item label="Mentee">{menteeName(selectedPair.menteeId)}</Descriptions.Item>
              <Descriptions.Item label="Mentor">{mentorName(selectedPair.mentorId)}</Descriptions.Item>
            </Descriptions>
            <div>
              <Typography.Title level={5}>Lịch mentoring</Typography.Title>
              <Table rowKey="_id" size="small" pagination={false} dataSource={detailSchedules} columns={[
                { title: 'Tháng', dataIndex: 'monthCode' },
                { title: 'Thời gian', render: (row: Schedule) => `${new Date(row.startTime).toLocaleString()} - ${new Date(row.endTime).toLocaleString()}` },
                { title: 'Đã chốt', render: (row: Schedule) => row.confirmedAt ? new Date(row.confirmedAt).toLocaleString() : 'Chưa chốt' },
                { title: 'Trạng thái', dataIndex: 'status' },
                { title: 'Thao tác', render: (_: unknown, row: Schedule) => <Space>
                  <Button size="small" icon={<CheckOutlined />} disabled={row.status === 'CONFIRMED' || row.status === 'COMPLETED'} onClick={async (event) => {
                    event.stopPropagation();
                    const response = await apiFetch(`/mentoring/schedules/${row._id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'CONFIRMED' }) });
                    const result = await response.json();
                    if (!result.success) { message.error(result.message); return; }
                    message.success('Đã chốt lịch mentoring');
                    await loadData(selectedCycle);
                  }}>Chốt lịch</Button>
                  <Button size="small" onClick={(event) => {
                    event.stopPropagation();
                    setOverrideSchedule(row);
                    overrideForm.setFieldsValue({ startTime: toDateTimeLocal(row.startTime), endTime: toDateTimeLocal(row.endTime), meetingLink: row.meetingLink, location: row.location, note: row.note });
                  }}>Ghi đè</Button>
                </Space> }
              ]} locale={{ emptyText: 'Chưa có lịch mentoring' }} />
            </div>
            <div>
              <Typography.Title level={5}>Trạng thái recap</Typography.Title>
              {detailSchedules.map((schedule) => {
                const deadline = schedule.confirmedAt ? new Date(new Date(schedule.confirmedAt).getTime() + 24 * 3600000) : null;
                const scheduleRecaps = detailRecaps.filter((recap) => recap.scheduleId === schedule._id);
                return <Card size="small" key={schedule._id} className="mb-2">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span>{schedule.monthCode || schedule._id}</span>
                    <span>Mốc 24h: {deadline ? deadline.toLocaleString() : 'Chưa chốt lịch'}</span>
                  </div>
                  <Space wrap className="mt-2">
                    {['MENTEE', 'MENTOR'].map((role) => {
                      const recap = scheduleRecaps.find((item) => item.role === role);
                      return <Tag key={role} color={recapColor(recap?.status)}>{role}: {recapLabels[recap?.status || 'PENDING'] || 'Chờ'}</Tag>;
                    })}
                  </Space>
                </Card>;
              })}
              {!detailSchedules.length && <Typography.Text type="secondary">Chưa có lịch để theo dõi recap.</Typography.Text>}
            </div>
          </div>
        )}
      </Modal>
      <Modal title="Ghi đè lịch mentoring" open={Boolean(overrideSchedule)} onCancel={() => { overrideForm.resetFields(); setOverrideSchedule(null); }} footer={null} forceRender destroyOnHidden>
        <Form form={overrideForm} layout="vertical" onFinish={async (values) => {
          if (!overrideSchedule) return;
          const response = await apiFetch(`/mentoring/schedules/${overrideSchedule._id}/override`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...values, startTime: new Date(values.startTime).toISOString(), endTime: new Date(values.endTime).toISOString() })
          });
          const result = await response.json();
          if (!result.success) { message.error(result.message); return; }
          message.success('Đã ghi đè và chốt lịch mentoring');
          setOverrideSchedule(null);
          await loadData(selectedCycle);
        }}>
          <Form.Item name="startTime" label="Bắt đầu" rules={[{ required: true }]}><Input type="datetime-local" /></Form.Item>
          <Form.Item name="endTime" label="Kết thúc" rules={[{ required: true }]}><Input type="datetime-local" /></Form.Item>
          <Form.Item name="meetingLink" label="Link meeting"><Input /></Form.Item>
          <Form.Item name="location" label="Địa điểm"><Input /></Form.Item>
          <Form.Item name="note" label="Ghi chú"><Input /></Form.Item>
          <Button type="primary" htmlType="submit" block>Lưu và chốt lịch</Button>
        </Form>
      </Modal>
      <Modal
        title="Review recap"
        open={Boolean(reviewingRecap)}
        onCancel={() => { setReviewingRecap(null); setReviewNote(''); }}
        footer={null}
        destroyOnHidden
      >
        {reviewingRecap && (
          <div className="space-y-4">
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Cặp">{reviewingRecap.pairId}</Descriptions.Item>
              <Descriptions.Item label="Vai trò">{reviewingRecap.role}</Descriptions.Item>
              <Descriptions.Item label="Nội dung">{reviewingRecap.content || 'Không có nội dung'}</Descriptions.Item>
              <Descriptions.Item label="Ảnh minh chứng">
                {reviewingRecap.mediaUrls?.[0] ? <a href={reviewingRecap.mediaUrls[0]} target="_blank" rel="noreferrer">Mở ảnh Cloudinary</a> : 'Không có'}
              </Descriptions.Item>
            </Descriptions>
            <Input.TextArea rows={3} value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="Ghi chú phản hồi (bắt buộc khi từ chối)" />
            <Space>
              <Button type="primary" onClick={() => reviewRecap(reviewingRecap, 'APPROVED')}>Duyệt recap</Button>
              <Button danger onClick={() => reviewRecap(reviewingRecap, 'REJECTED')} disabled={!reviewNote.trim()}>Từ chối</Button>
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
}

function PairForm({ form, cycles, months, mentors, mentees, onFinish }: {
  form: ReturnType<typeof Form.useForm<PairForm>>[0];
  cycles: { value: string; label: string }[];
  months: { value: number; label: string }[];
  mentors: UserOption[];
  mentees: UserOption[];
  onFinish: (values: PairForm) => void;
}) {
  return <Form form={form} layout="vertical" onFinish={onFinish}>
    <Form.Item name="cycleId" label="Quý" rules={[{ required: true, message: 'Chọn quý' }]}><Select options={cycles} /></Form.Item>
    <Form.Item name="month" label="Tháng mentoring trong quý" rules={[{ required: true, message: 'Chọn tháng' }]}><Select options={months} /></Form.Item>
    <Form.Item name="mentorId" label="Mentor" rules={[{ required: true, message: 'Chọn mentor' }]}><Select showSearch optionFilterProp="label" options={mentors.map((item) => ({ value: item.userId, label: `${item.userId} - ${item.fullName}` }))} /></Form.Item>
    <Form.Item name="menteeId" label="Mentee" rules={[{ required: true, message: 'Chọn mentee' }]}><Select showSearch optionFilterProp="label" options={mentees.map((item) => ({ value: item.userId, label: `${item.userId} - ${item.fullName}` }))} /></Form.Item>
    <Button type="primary" htmlType="submit" block>Lưu</Button>
  </Form>;
}
