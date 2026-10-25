'use client';

import { useCallback, useEffect, useState } from 'react';
import { App, Button, Card, DatePicker, Empty, Form, Input, InputNumber, Modal, Popconfirm, Select, Table, Tag, Typography } from 'antd';
import { HeartFilled, PlusOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import ImageUpload, { type UploadedImage } from '@/components/ImageUpload';
import MonthPicker, { currentPeriodCode } from '@/components/MonthPicker';
import { EvidenceButton, FundStatusTag, periodOf, weekLabel } from '@/components/fund/FundStatus';
import { errorMessage } from '@/lib/api';
import { FUND_CYCLE_LABEL, type FundCycle, fundApi, money, periodLabel, type ContributionView, type MyFund } from '@/services/hlcApi';
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
      message.success('Đã gửi minh chứng. Cảm ơn bạn! Khoản đóng góp đang chờ xác nhận');
      setEditing(null);
      await load();
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const today = getCurrentTime();
  const weeks = data?.weeks ?? [];
  const rows = data?.contributions ?? [];
  const canEdit = (row: ContributionView) => row.status !== 'DONE' && !data?.period.isLocked;
  const actions = (row: ContributionView) => canEdit(row) ? (
    <div className="flex flex-wrap gap-2">
      <Button size="large" onClick={() => openForm(row)}>{row.status === 'NOT_DONE' ? 'Gửi lại minh chứng' : 'Sửa'}</Button>
      <Popconfirm title="Xóa minh chứng này?" okText="Xóa" cancelText="Không" onConfirm={async () => { try { await fundApi.remove(row._id); await load(); } catch (error) { message.error(errorMessage(error)); } }}>
        <Button size="large">Xóa</Button>
      </Popconfirm>
    </div>
  ) : null;
  const statusCell = (row: ContributionView) => (
    <div>
      <FundStatusTag status={row.status} detail large />
      {row.status === 'DONE' && <div className="fund-thanks"><HeartFilled aria-hidden />Cảm ơn bạn đã đóng góp</div>}
      {row.status === 'NOT_DONE' && row.reviewNote && <div className="fund-sub mt-1">Lời nhắn: {row.reviewNote}</div>}
    </div>
  );
  const periodCell = (row: ContributionView) => (
    <div>
      <div>{periodOf(row, weeks)}</div>
      <div className="fund-sub">{FUND_CYCLE_LABEL[row.cycleType ?? 'ONCE']}{row.isProxy ? ` · nộp hộ: ${row.proxyByName}` : ''}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Typography.Title level={3} className="!mb-0">HLC Fund</Typography.Title>
          <MonthPicker value={code} onChange={setCode} />
          {data?.period.isLocked && <Tag color="purple">Kỳ đã chốt</Tag>}
        </div>
        <Button type="primary" size="large" icon={<PlusOutlined />} disabled={data?.period.isLocked} onClick={() => openForm()}>Nộp minh chứng</Button>
      </div>
      {data && (
        <section className="fund-hero" aria-label="Tổng đã ghi nhận">
          <div>
            <div className="fund-hero-label">Đã ghi nhận vào sổ quỹ · {periodLabel(data.period.code)}</div>
            <div className="fund-hero-value">{money(data.approvedAmount)}</div>
            <div className="fund-hero-note">Cảm ơn bạn đã cùng HLC lan tỏa nguồn quỹ tình nguyện.</div>
          </div>
          <div className="fund-hero-side">
            {data.pendingAmount > 0 && <div className="fund-hero-chip">Đang chờ xác nhận<b>{money(data.pendingAmount)}</b></div>}
            {role === 'MENTEE' && data.isEligible && (data.reached
              ? <div className="fund-hero-chip is-green">Đã đạt mức tháng<b>+{data.target.points} điểm</b></div>
              : <div className="fund-hero-chip is-green">Mức để được +{data.target.points} điểm<b>{money(data.target.minApprovedAmount)}</b></div>)}
          </div>
        </section>
      )}
      {data && (
        <Card title="Theo tuần">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {data.weeks.map((week) => (
              <div key={week.weekKey} className="fund-week rounded-xl border border-[var(--line)] bg-white px-2 py-3 text-center">
                <div className="mb-2 font-bold">{weekLabel(week)}</div>
                <FundStatusTag status={week.status} />
                {(week.status === 'DONE' || week.status === 'PENDING') && week.amount > 0 && <div className="mt-1 text-base font-extrabold">{money(week.amount)}</div>}
              </div>
            ))}
          </div>
          {role === 'MENTOR' && <Typography.Paragraph type="secondary" className="!mt-3 !mb-0 text-base">Mỗi lần đóng góp, bạn gửi ảnh chuyển khoản. Leader nhóm sẽ xem và bấm Ghi nhận.{!data.groupId && ' Bạn chưa được xếp vào nhóm nào, hãy báo admin.'}</Typography.Paragraph>}
        </Card>
      )}
      <Card title="Các khoản đã gửi">
        <Table<ContributionView>
          className="fund-easy-table has-cards"
          rowKey="_id"
          loading={loading}
          dataSource={rows}
          scroll={{ x: 'max-content' }}
          pagination={false}
          locale={{ emptyText: 'Chưa có khoản nào trong tháng này' }}
          columns={[
            { title: 'Kỳ', render: (_: unknown, row: ContributionView) => periodCell(row) },
            { title: 'Số tiền', align: 'right' as const, render: (_: unknown, row: ContributionView) => <span className="fund-amount">{money(row.amount)}</span> },
            { title: 'Trạng thái', render: (_: unknown, row: ContributionView) => statusCell(row) },
            { title: 'Ảnh minh chứng', render: (_: unknown, row: ContributionView) => <EvidenceButton files={row.files} size="large" /> },
            { title: '', render: (_: unknown, row: ContributionView) => actions(row) }
          ]}
        />
        <div className="fund-cards">
          {!loading && !rows.length && <Empty description="Chưa có khoản nào trong tháng này" />}
          {rows.map((row) => (
            <div key={row._id} className="fund-card">
              <div className="fund-card-top">{periodCell(row)}{statusCell(row)}</div>
              <div className="fund-amount">{money(row.amount)}</div>
              <div className="fund-card-actions"><EvidenceButton files={row.files} size="large" />{actions(row)}</div>
            </div>
          ))}
        </div>
      </Card>
      <Modal title={editing && editing !== 'new' ? 'Sửa minh chứng' : 'Nộp minh chứng đóng góp'} open={Boolean(editing)} onCancel={() => setEditing(null)} onOk={() => form.submit()} okText="Gửi minh chứng" cancelText="Hủy" confirmLoading={saving} destroyOnHidden>
        <Form form={form} layout="vertical" size="large" onFinish={save}>
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
