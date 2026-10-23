'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, App, Button, Card, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Progress, Select, Table, Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import FileThumbs from '@/components/FileThumbs';
import ImageUpload, { type UploadedImage } from '@/components/ImageUpload';
import MonthPicker, { currentPeriodCode } from '@/components/MonthPicker';
import { errorMessage } from '@/lib/api';
import { FUND_CYCLE_LABEL, type FundCycle, FUND_STATUS_COLOR, FUND_STATUS_LABEL, WEEK_STATUS_COLOR, WEEK_STATUS_LABEL, formatDate, fundApi, money, periodLabel, type ContributionView, type MyFund } from '@/services/hlcApi';
import { getCurrentTime } from '@/utils/time';

interface FormValues { contributionDate: Dayjs; amount: number; note?: string; images: UploadedImage[]; cycleType?: FundCycle; coverUntil?: Dayjs }

export default function MemberFundView({ role }: { role: 'MENTOR' | 'MENTEE' }) {
  const { message } = App.useApp();
  const [code, setCode] = useState(() => currentPeriodCode(getCurrentTime()));
  const [data, setData] = useState<MyFund | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<ContributionView | 'new' | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<FormValues>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fundApi.mine(code));
    } catch (error) {
      message.error(errorMessage(error, 'Không tải được dữ liệu quỹ'));
    } finally {
      setLoading(false);
    }
  }, [code, message]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);

  const openForm = (row?: ContributionView) => {
    form.resetFields();
    form.setFieldsValue(row
      ? { contributionDate: dayjs(row.contributionDate), amount: row.amount, note: row.note ?? '', cycleType: row.cycleType ?? 'ONCE', coverUntil: row.coverUntil ? dayjs(row.coverUntil) : undefined, images: row.files.map((file) => ({ fileId: file.fileId, url: file.url, name: file.fileName })) }
      : { contributionDate: dayjs(getCurrentTime()), images: [], cycleType: role === 'MENTOR' ? 'WEEKLY' : 'ONCE' });
    setEditing(row ?? 'new');
  };

  const save = async (values: FormValues) => {
    setSaving(true);
    try {
      const body = { contributionDate: values.contributionDate.format('YYYY-MM-DD'), amount: values.amount, note: values.note, cycleType: values.cycleType, coverUntil: values.coverUntil ? values.coverUntil.format('YYYY-MM-DD') : undefined, fileIds: values.images.map((image) => image.fileId) };
      if (editing && editing !== 'new') await fundApi.update(editing._id, body);
      else await fundApi.submit(body);
      message.success('Đã gửi minh chứng, chờ ban HLC Fund duyệt');
      setEditing(null);
      await load();
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const percent = data ? Math.min(100, Math.round((data.approvedAmount / Math.max(1, data.target.minApprovedAmount)) * 100)) : 0;
  const today = getCurrentTime();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Typography.Title level={3} className="!mb-0">HLC Fund</Typography.Title>
          <MonthPicker value={code} onChange={setCode} />
        </div>
        <Button type="primary" icon={<PlusOutlined />} disabled={data?.period.isLocked} onClick={() => openForm()}>Gửi minh chứng</Button>
      </div>
      {data && (
        <Card title={role === 'MENTOR' ? 'Minh chứng theo tuần' : 'Theo tuần'} size="small">
          <div className="flex flex-wrap gap-2">
            {data.weeks.map((week) => (
              <div key={week.weekKey} className="rounded-lg border border-gray-100 px-3 py-2 text-center">
                <div className="text-xs text-gray-500">{week.weekKey.slice(-3)} · {formatDate(week.from).slice(0, 5)}–{formatDate(week.to).slice(0, 5)}</div>
                <Tag className="!mt-1 !mr-0" color={WEEK_STATUS_COLOR[week.status]}>{WEEK_STATUS_LABEL[week.status]}</Tag>
                {week.amount > 0 && <div className="text-xs">{money(week.amount)}</div>}
              </div>
            ))}
          </div>
          {role === 'MENTOR' && <Typography.Paragraph type="secondary" className="!mt-3 !mb-0">Mỗi tuần gửi ảnh minh chứng đóng quỹ; Leader nhóm của bạn sẽ duyệt Đã xong / Chưa xong.{!data.groupId && ' Bạn chưa được xếp vào nhóm nào, hãy báo admin.'}</Typography.Paragraph>}
        </Card>
      )}
      {data && role === 'MENTEE' && (
        <Card>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Progress type="circle" percent={percent} status={data.reached ? 'success' : 'active'} size={110} />
            <div className="space-y-1">
              <Typography.Title level={4} className="!mb-1">{periodLabel(data.period.code)}: đã duyệt {money(data.approvedAmount)} / {money(data.target.minApprovedAmount)}</Typography.Title>
              {data.pendingAmount > 0 && <div className="text-gray-500">Đang chờ duyệt: {money(data.pendingAmount)}</div>}
              {data.isEligible
                ? <div>{data.reached ? <Tag color="green">Đã đạt mức – được +{data.target.points} điểm phụ cấp</Tag> : <Tag color="gold">Đóng đủ {money(data.target.minApprovedAmount)} trong tháng để được +{data.target.points} điểm</Tag>}</div>
                : <Alert type="info" showIcon title="Điểm quỹ hiện chỉ áp dụng cho mentee." />}
              {data.period.isLocked && <Tag color="purple">Kỳ đã chốt, không gửi thêm được</Tag>}
            </div>
          </div>
        </Card>
      )}
      <Card title="Minh chứng đã gửi">
        <Table<ContributionView>
          rowKey="_id"
          size="small"
          loading={loading}
          dataSource={data?.contributions ?? []}
          scroll={{ x: 'max-content' }}
          pagination={false}
          columns={[
            { title: 'Ngày đóng', render: (_: unknown, row: ContributionView) => formatDate(row.contributionDate) },
            { title: 'Số tiền', align: 'right' as const, render: (_: unknown, row: ContributionView) => money(row.amount) },
            { title: 'Chu kỳ', render: (_: unknown, row: ContributionView) => `${FUND_CYCLE_LABEL[row.cycleType ?? 'ONCE']}${row.coverUntil ? ` · đến ${formatDate(row.coverUntil)}` : ''}${row.isProxy ? ` · nộp hộ: ${row.proxyByName}` : ''}` },
            { title: 'Ảnh', render: (_: unknown, row: ContributionView) => <FileThumbs files={row.files} size={44} /> },
            { title: 'Trạng thái', render: (_: unknown, row: ContributionView) => <div><Tag color={FUND_STATUS_COLOR[row.status]}>{FUND_STATUS_LABEL[row.status]}</Tag>{row.reviewNote && <div className="text-xs text-red-500">{row.reviewNote}</div>}</div> },
            {
              title: '', render: (_: unknown, row: ContributionView) => row.status === 'DONE' || data?.period.isLocked ? null : (
                <div className="flex gap-2">
                  <Button size="small" onClick={() => openForm(row)}>{row.status === 'NOT_DONE' ? 'Gửi lại' : 'Sửa'}</Button>
                  <Popconfirm title="Xóa minh chứng này?" onConfirm={async () => { try { await fundApi.remove(row._id); await load(); } catch (error) { message.error(errorMessage(error)); } }}>
                    <Button size="small" danger>Xóa</Button>
                  </Popconfirm>
                </div>
              )
            }
          ]}
        />
      </Card>
      <Modal title={editing && editing !== 'new' ? 'Sửa minh chứng' : 'Gửi minh chứng đóng quỹ'} open={Boolean(editing)} onCancel={() => setEditing(null)} onOk={() => form.submit()} okText="Gửi" confirmLoading={saving} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item name="contributionDate" label="Ngày đóng" rules={[{ required: true, message: 'Chọn ngày' }]}>
            <DatePicker className="w-full" format="DD/MM/YYYY" inputReadOnly disabledDate={(value) => value.isAfter(dayjs(today), 'day')} />
          </Form.Item>
          <Form.Item name="amount" label="Số tiền (đ)" rules={[{ required: true, message: 'Nhập số tiền' }]}>
            <InputNumber<number> className="w-full" min={1000} step={10000} formatter={(value) => `${value ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} parser={(value) => Number((value ?? '').replace(/\./g, ''))} />
          </Form.Item>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="cycleType" label="Chu kỳ"><Select options={Object.entries(FUND_CYCLE_LABEL).map(([value, label]) => ({ value, label }))} /></Form.Item>
            <Form.Item name="coverUntil" label="Đóng đến ngày (nếu đóng trước)"><DatePicker className="w-full" format="DD/MM/YYYY" inputReadOnly /></Form.Item>
          </div>
          <Form.Item name="images" label="Ảnh chuyển khoản" rules={[{ validator: (_, value: UploadedImage[]) => value?.length ? Promise.resolve() : Promise.reject(new Error('Cần ít nhất 1 ảnh')) }]}>
            <ImageUpload max={5} />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
