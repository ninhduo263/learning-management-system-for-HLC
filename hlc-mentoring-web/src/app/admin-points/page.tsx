'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, App, Button, Card, Descriptions, Drawer, Form, Input, InputNumber, Modal, Popconfirm, Progress, Select, Space, Statistic, Switch, Table, Tabs, Tag, Typography
} from 'antd';
import { PrinterOutlined, CalculatorOutlined, DownloadOutlined, LockOutlined, PlusOutlined, SettingOutlined, UnlockOutlined, CheckCircleOutlined } from '@ant-design/icons';
import MonthPicker, { currentPeriodCode } from '@/components/MonthPicker';
import { errorMessage } from '@/lib/api';
import { formatDateTime } from '@/services/mentoringApi';
import {
  PERIOD_STATUS_COLOR, PERIOD_STATUS_LABEL, POINT_CATEGORY_LABEL, SOURCE_TYPE_LABEL,
  GROUP_KIND_LABEL, PERIOD_FIELD_LABEL, PERIOD_LOG_LABEL, type PeriodLog, completionApi, type GroupCompletion, memberCrudApi, money, pointApi, pointRuleApi, pointTypeApi, points, periodLabel,
  type AdjustmentView, type Member, type MemberBreakdown, type PeriodExportView, type PeriodSummary, type PointRule, type PointType, type SummaryRow
} from '@/services/hlcApi';
import { getCurrentTime } from '@/utils/time';

const ADJ_STATUS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Chờ duyệt', color: 'gold' },
  APPROVED: { label: 'Đã áp dụng', color: 'green' },
  REJECTED: { label: 'Từ chối / hủy', color: 'default' }
};

export default function AdminPointsPage() {
  const { message, modal } = App.useApp();
  const [code, setCode] = useState(() => currentPeriodCode(getCurrentTime()));
  const [summary, setSummary] = useState<PeriodSummary | null>(null);
  const [adjustments, setAdjustments] = useState<AdjustmentView[]>([]);
  const [exports, setExports] = useState<PeriodExportView[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [detail, setDetail] = useState<MemberBreakdown | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [carryOpen, setCarryOpen] = useState(false);
  const [carryForm] = Form.useForm();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [review, setReview] = useState<AdjustmentView | null>(null);
  const [search, setSearch] = useState('');
  const [adjustForm] = Form.useForm();
  const [settingsForm] = Form.useForm();
  const [reviewForm] = Form.useForm();

  const load = useCallback(async (periodCode: string) => {
    setLoading(true);
    try {
      await pointApi.ensure(periodCode);
      const [nextSummary, nextAdjustments, nextExports] = await Promise.all([
        pointApi.summary(periodCode), pointApi.adjustments(periodCode), pointApi.exports(periodCode)
      ]);
      setSummary(nextSummary);
      setAdjustments(nextAdjustments);
      setExports(nextExports);
    } catch (error) {
      message.error(errorMessage(error, 'Không tải được dữ liệu điểm'));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) void load(code); });
    return () => { active = false; };
  }, [code, load]);

  useEffect(() => {
    let active = true;
    memberCrudApi.many(undefined, { memberCode: 1 }).then((list) => { if (active) setMembers(list); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const run = async (key: string, action: () => Promise<unknown>, success: string) => {
    setBusy(key);
    try {
      await action();
      message.success(success);
      await load(code);
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const recalc = () => run('recalc', async () => {
    const result = await pointApi.recalculate(code);
    modal.info({
      title: 'Đã tính lại điểm',
      content: (
        <div>
          <p>Tạo mới {result.created}, bật lại {result.reactivated}, cập nhật {result.updated}, hủy {result.voided}, giữ nguyên {result.unchanged} dòng điểm.</p>
          {result.awards.length > 0
            ? <p>Giải mentoring (xếp theo điểm recap MTE, rồi lịch sớm hơn): {result.awards.map((item) => `${['', 'Nhất', 'Nhì', 'Ba'][item.rank]} – ${item.sessionCode} (${item.recapScore} điểm)`).join('; ')}</p>
            : <p>Chưa có cặp nào “Đã xong” để xếp giải.</p>}
          {result.unscoredRecaps > 0 && <p className="text-orange-600">Còn {result.unscoredRecaps} recap MTE của các cặp “Đã xong” chưa được chấm (đang tính 0 điểm). Leader nhóm chấm xong rồi bấm Tính lại.</p>}
        </div>
      )
    });
  }, 'Tính lại xong');

  const openDetail = async (row: SummaryRow) => {
    try {
      setDetail(await pointApi.breakdown(code, row.memberId));
    } catch (error) {
      message.error(errorMessage(error));
    }
  };

  const period = summary?.period;
  const locked = Boolean(period?.isLocked);
  const rows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return (summary?.rows ?? []).filter((row) => !keyword || `${row.member?.memberCode} ${row.member?.fullName}`.toLowerCase().includes(keyword));
  }, [summary, search]);
  const pending = adjustments.filter((item) => item.status === 'PENDING');

  const summaryTab = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input.Search allowClear placeholder="Tìm theo mã hoặc tên" className="max-w-xs" onChange={(event) => setSearch(event.target.value)} />
        <Typography.Text type="secondary">Bấm vào một dòng để xem chi tiết từng điểm.</Typography.Text>
      </div>
      <Table<SummaryRow>
        rowKey="_id"
        size="small"
        loading={loading}
        dataSource={rows}
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 50 }}
        onRow={(row) => ({ onClick: () => void openDetail(row), className: 'cursor-pointer' })}
        columns={[
          { title: 'STT', width: 60, render: (_: unknown, __: SummaryRow, index: number) => index + 1 },
          { title: 'Thành viên', fixed: 'left', width: 220, render: (_: unknown, row: SummaryRow) => <div><strong>{row.member?.fullName}</strong><div className="text-xs text-gray-500">{row.member?.memberCode}</div></div> },
          ...(summary?.pointTypes ?? []).map((type) => ({
            title: type.name,
            width: 110,
            align: 'right' as const,
            render: (_: unknown, row: SummaryRow) => {
              const value = Number(row.pointsByType?.[type.code] ?? 0);
              return value ? <span className={value < 0 ? 'text-red-500' : ''}>{points(value)}</span> : <span className="text-gray-300">0</span>;
            }
          })),
          { title: 'Tổng điểm', width: 100, align: 'right' as const, sorter: (a: SummaryRow, b: SummaryRow) => a.totalPoints - b.totalPoints, render: (_: unknown, row: SummaryRow) => <strong>{points(row.totalPoints)}</strong> },
          { title: 'Bù chênh lệch', width: 120, align: 'right' as const, render: (_: unknown, row: SummaryRow) => Number(row.adjustmentAmount ?? 0) ? money(row.adjustmentAmount) : '' },
          { title: 'Thành tiền', width: 130, align: 'right' as const, sorter: (a: SummaryRow, b: SummaryRow) => a.amount - b.amount, render: (_: unknown, row: SummaryRow) => money(row.amount) },
          { title: 'Tài khoản', width: 190, render: (_: unknown, row: SummaryRow) => row.member?.bankAccount ? `${row.member.bankAccount} · ${row.member.bankName ?? ''}` : <Tag>Chưa có STK</Tag> }
        ]}
      />
    </div>
  );

  const adjustmentTab = (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button type="primary" icon={<PlusOutlined />} disabled={locked} onClick={() => { adjustForm.resetFields(); setAdjustOpen(true); }}>Cộng / trừ điểm</Button>
      </div>
      <Table<AdjustmentView>
        rowKey="_id"
        size="small"
        dataSource={adjustments}
        scroll={{ x: 'max-content' }}
        columns={[
          { title: 'Thời gian', width: 140, render: (_: unknown, row: AdjustmentView) => formatDateTime(row.createdAt) },
          { title: 'Loại', width: 110, render: (_: unknown, row: AdjustmentView) => <Tag color={row.kind === 'APPEAL' ? 'magenta' : 'blue'}>{row.kind === 'APPEAL' ? 'Khiếu nại' : 'Thủ công'}</Tag> },
          { title: 'Thành viên', width: 200, render: (_: unknown, row: AdjustmentView) => <div>{row.member?.fullName}<div className="text-xs text-gray-500">{row.member?.memberCode}</div></div> },
          { title: 'Điểm', width: 80, align: 'right' as const, render: (_: unknown, row: AdjustmentView) => <strong className={row.points < 0 ? 'text-red-500' : 'text-green-600'}>{row.points > 0 ? '+' : ''}{points(row.points)}</strong> },
          { title: 'Loại điểm', width: 150, render: (_: unknown, row: AdjustmentView) => row.pointType?.name ?? '—' },
          { title: 'Lý do', render: (_: unknown, row: AdjustmentView) => <div className="max-w-md whitespace-pre-wrap">{row.reason}{row.reviewNote && <div className="text-xs text-gray-500">Ghi chú: {row.reviewNote}</div>}</div> },
          { title: 'Trạng thái', width: 120, render: (_: unknown, row: AdjustmentView) => <Tag color={ADJ_STATUS[row.status].color}>{ADJ_STATUS[row.status].label}</Tag> },
          {
            title: '', width: 150, render: (_: unknown, row: AdjustmentView) => locked ? null : row.status === 'PENDING'
              ? <Button size="small" type="primary" onClick={() => { reviewForm.setFieldsValue({ points: row.points, note: '' }); setReview(row); }}>Xử lý</Button>
              : row.status === 'APPROVED'
                ? <Popconfirm title="Hủy điều chỉnh này?" onConfirm={() => run(`cancel-${row._id}`, () => pointApi.cancelAdjustment(row._id), 'Đã hủy điều chỉnh')}><Button size="small" danger>Hủy</Button></Popconfirm>
                : null
          }
        ]}
      />
    </div>
  );

  const exportTab = (
    <div className="space-y-3">
      <Alert type="info" showIcon title={locked ? `Xuất bảng ${period?.sheetCode} để gửi bộ phận chi trả.` : `Kỳ chưa chốt: file xuất là bản tạm tính (${period?.sheetCode}-tam-tinh). Chốt kỳ để lưu cố định tên và số tài khoản.`} />
      <Space wrap>
        <Button type="primary" icon={<DownloadOutlined />} loading={busy === 'xlsx'} onClick={() => run('xlsx', () => pointApi.exportFile(code, 'xlsx', locked), 'Đã xuất file Excel')}>Xuất Excel</Button>
        <Button icon={<DownloadOutlined />} loading={busy === 'csv'} onClick={() => run('csv', () => pointApi.exportFile(code, 'csv', locked), 'Đã xuất file CSV')}>Xuất CSV</Button>
        {locked && <Button onClick={() => { carryForm.resetFields(); setCarryOpen(true); }}>Bù chênh lệch sang tháng sau</Button>}
        <Button icon={<PrinterOutlined />} onClick={() => window.open(`/admin-points/report?period=${code}`, '_blank')}>Báo cáo PDF mùng 10</Button>
      </Space>
      <Table<PeriodExportView>
        rowKey="_id"
        size="small"
        dataSource={exports}
        pagination={false}
        columns={[
          { title: 'Thời gian', render: (_: unknown, row: PeriodExportView) => formatDateTime(row.exportedAt) },
          { title: 'Loại', dataIndex: 'exportType', render: (value: string) => value.endsWith('CSV') ? 'CSV' : 'Excel' },
          { title: 'Ghi chú', dataIndex: 'note' },
          { title: 'Checksum', dataIndex: 'checksum', render: (value: string) => <code className="text-xs">{value?.slice(0, 12)}</code> }
        ]}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Typography.Title level={3} className="!mb-0">Điểm phụ cấp</Typography.Title>
          <MonthPicker value={code} onChange={setCode} />
          <Tag color="geekblue" className="!text-sm">Bảng {period?.sheetCode ?? `PC-${code}`}</Tag>
          {period && <Tag color={PERIOD_STATUS_COLOR[period.status]}>{PERIOD_STATUS_LABEL[period.status]}</Tag>}
        </div>
        <Space wrap>
          <Button icon={<SettingOutlined />} disabled={locked} onClick={() => { settingsForm.setFieldsValue({ pointRate: Number(period?.pointRate ?? 0), baseAllowance: Number(period?.baseAllowance ?? 0), payoutDate: period?.payoutDate ?? '', reason: '' }); setSettingsOpen(true); }}>Đơn giá</Button>
          <Button type="primary" icon={<CalculatorOutlined />} disabled={locked} loading={busy === 'recalc'} onClick={recalc}>Tính lại</Button>
          {!locked && <Popconfirm title={`Chốt ${periodLabel(code)}?`} description="Sau khi chốt không thể tính lại hay điều chỉnh điểm." onConfirm={() => run('lock', () => pointApi.lock(code), 'Đã chốt kỳ')}><Button icon={<LockOutlined />} loading={busy === 'lock'}>Chốt kỳ</Button></Popconfirm>}
          {locked && period?.status !== 'PAID' && <Button icon={<UnlockOutlined />} loading={busy === 'unlock'} onClick={() => { setUnlockReason(''); setUnlockOpen(true); }}>Mở khóa</Button>}
          {locked && period?.status !== 'PAID' && <Popconfirm title="Xác nhận đã chi trả kỳ này?" onConfirm={() => run('paid', () => pointApi.paid(code), 'Đã đánh dấu chi trả')}><Button icon={<CheckCircleOutlined />}>Đã chi trả</Button></Popconfirm>}
        </Space>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card size="small"><Statistic title="Thành viên" value={summary?.totals.members ?? 0} /></Card>
        <Card size="small"><Statistic title="Tổng điểm" value={summary?.totals.points ?? 0} /></Card>
        <Card size="small"><Statistic title="Tổng chi trả" value={money(summary?.totals.amount)} /></Card>
        <Card size="small"><Statistic title="Khiếu nại chờ" value={pending.length} /></Card>
      </div>
      {period && (
        <Typography.Text type="secondary">
          Đơn giá {money(period.pointRate)}/điểm · Phụ cấp cơ bản {money(period.baseAllowance)} · Ngày chi trả {period.payoutDate ? period.payoutDate.split('-').reverse().join('/') : '—'}.
          Hệ thống tự tính lại lúc 01:00 hằng ngày cho kỳ chưa chốt.
        </Typography.Text>
      )}

      <Card>
        <Tabs items={[
          { key: 'summary', label: 'Bảng tổng hợp', children: summaryTab },
          { key: 'completion', label: 'Leader / Phó nhóm', children: <CompletionPanel code={code} /> },
          { key: 'adjust', label: `Điều chỉnh & khiếu nại${pending.length ? ` (${pending.length})` : ''}`, children: adjustmentTab },
          { key: 'export', label: 'Xuất file chi trả', children: exportTab },
          { key: 'logs', label: 'Nhật ký kỳ', children: <PeriodLogPanel code={code} /> },
          { key: 'config', label: 'Cấu hình loại điểm & quy tắc', children: <PointConfig /> }
        ]} />
      </Card>

      <Drawer title={detail ? `${detail.member.fullName} · ${periodLabel(code)}` : ''} open={Boolean(detail)} onClose={() => setDetail(null)} size="large">
        {detail && (
          <div className="space-y-4">
            <Descriptions size="small" column={1} bordered items={[
              { key: 'code', label: 'Mã', children: detail.member.memberCode },
              { key: 'total', label: 'Tổng điểm', children: points(detail.summary?.totalPoints) },
              { key: 'amount', label: 'Thành tiền', children: money(detail.summary?.amount) }
            ]} />
            <Table
              rowKey="_id"
              size="small"
              pagination={false}
              dataSource={detail.entries}
              columns={[
                { title: 'Loại điểm', render: (_: unknown, row: MemberBreakdown['entries'][number]) => <div>{row.pointType?.name}<div className="text-xs text-gray-500">{SOURCE_TYPE_LABEL[row.sourceType] ?? row.sourceType}</div></div> },
                { title: 'Diễn giải', dataIndex: 'description' },
                { title: 'Điểm', align: 'right' as const, render: (_: unknown, row: MemberBreakdown['entries'][number]) => <strong className={row.status === 'VOID' ? 'line-through text-gray-400' : ''}>{points(row.points)}</strong> },
                { title: '', render: (_: unknown, row: MemberBreakdown['entries'][number]) => row.status === 'VOID' ? <Tag title={row.voidReason ?? ''}>Đã hủy</Tag> : null }
              ]}
            />
          </div>
        )}
      </Drawer>

      <Modal title="Cộng / trừ điểm thủ công" open={adjustOpen} onCancel={() => setAdjustOpen(false)} onOk={() => adjustForm.submit()} confirmLoading={busy === 'adjust'} okText="Áp dụng" destroyOnHidden>
        <Form form={adjustForm} layout="vertical" onFinish={(values) => run('adjust', async () => { await pointApi.createAdjustment(code, values); setAdjustOpen(false); }, 'Đã áp dụng điều chỉnh')}>
          <Form.Item name="memberId" label="Thành viên" rules={[{ required: true, message: 'Chọn thành viên' }]}>
            <Select showSearch={{ optionFilterProp: 'label' }} options={members.map((member) => ({ value: member._id, label: `${member.memberCode} – ${member.fullName}` }))} />
          </Form.Item>
          <Form.Item name="points" label="Số điểm (âm = trừ)" rules={[{ required: true, message: 'Nhập số điểm' }]}><InputNumber className="w-full" step={0.5} /></Form.Item>
          <Form.Item name="pointTypeId" label="Loại điểm (để trống: tự chọn cộng/trừ thủ công)">
            <Select allowClear options={summary?.pointTypes.map((type) => ({ value: type._id, label: type.name }))} />
          </Form.Item>
          <Form.Item name="reason" label="Lý do" rules={[{ required: true, message: 'Nhập lý do' }]}><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      <Modal title={`Mở khóa ${period?.sheetCode ?? ''}`} open={unlockOpen} onCancel={() => setUnlockOpen(false)} okText="Mở khóa" okButtonProps={{ disabled: !unlockReason.trim() }} confirmLoading={busy === 'unlock'}
        onOk={() => run('unlock', async () => { await pointApi.unlock(code, unlockReason); setUnlockOpen(false); }, 'Đã mở khóa kỳ (đã ghi nhật ký)')} destroyOnHidden>
        <Typography.Paragraph type="secondary">Mở khóa để sửa bảng đang chờ chi. Thao tác được ghi nhật ký. Kỳ đã chi không mở khóa được: dùng “Bù chênh lệch” sang tháng sau.</Typography.Paragraph>
        <Input.TextArea rows={3} placeholder="Lý do mở khóa (bắt buộc)" value={unlockReason} onChange={(event) => setUnlockReason(event.target.value)} />
      </Modal>

      <Modal title={`Bù chênh lệch từ ${period?.sheetCode ?? ''} sang tháng sau`} open={carryOpen} onCancel={() => setCarryOpen(false)} onOk={() => carryForm.submit()} okText="Ghi dòng bù" confirmLoading={busy === 'carry'} destroyOnHidden>
        <Form form={carryForm} layout="vertical" onFinish={(values) => run('carry', async () => {
          const result = await pointApi.carryOver(code, { memberId: values.memberId, reason: values.reason, ...(values.mode === 'points' ? { points: Number(values.value) } : { amount: Number(values.value) }) });
          setCarryOpen(false);
          message.info(`Đã ghi dòng bù vào ${result.targetSheet}`);
        }, 'Đã ghi bù chênh lệch')}>
          <Typography.Paragraph type="secondary">Bảng đã chốt/đã chi không sửa trực tiếp. Khoản chênh lệch được ghi thành một dòng điều chỉnh ở bảng tháng kế tiếp, kèm lý do, tháng gốc và người duyệt.</Typography.Paragraph>
          <Form.Item name="memberId" label="Thành viên" rules={[{ required: true, message: 'Chọn thành viên' }]}>
            <Select showSearch={{ optionFilterProp: 'label' }} options={members.map((member) => ({ value: member._id, label: `${member.memberCode} – ${member.fullName}` }))} />
          </Form.Item>
          <Form.Item name="mode" label="Bù theo" initialValue="amount"><Select options={[{ value: 'amount', label: 'Số tiền (đ)' }, { value: 'points', label: 'Số điểm (theo đơn giá tháng sau)' }]} /></Form.Item>
          <Form.Item name="value" label="Chênh lệch (âm = thu hồi)" rules={[{ required: true, message: 'Nhập giá trị' }]}><InputNumber<number> className="w-full" /></Form.Item>
          <Form.Item name="reason" label="Lý do" rules={[{ required: true, message: 'Nhập lý do' }]}><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Đơn giá kỳ" open={settingsOpen} onCancel={() => setSettingsOpen(false)} onOk={() => settingsForm.submit()} confirmLoading={busy === 'settings'} destroyOnHidden>
        <Form form={settingsForm} layout="vertical" onFinish={(values) => run('settings', async () => {
          await pointApi.settings(code, {
            pointRate: Number(values.pointRate),
            baseAllowance: Number(values.baseAllowance),
            payoutDate: values.payoutDate ? String(values.payoutDate) : undefined,
            reason: values.reason
          });
          setSettingsOpen(false);
        }, 'Đã lưu đơn giá, thành tiền đã tính lại')}>
          <Typography.Paragraph type="secondary">Đơn giá lưu riêng cho {period?.sheetCode}; đổi đơn giá tháng này không làm đổi tiền của tháng đã chốt. Mỗi lần sửa được ghi nhật ký.</Typography.Paragraph>
          <Form.Item name="pointRate" label="Số tiền cho 1 điểm (đ)" rules={[{ required: true, message: 'Nhập đơn giá' }, { type: 'number', min: 0, message: 'Đơn giá không được âm' }]}><InputNumber<number> className="w-full" min={0} step={1000} /></Form.Item>
          <Form.Item name="baseAllowance" label="Phụ cấp cơ bản mỗi người (đ)" rules={[{ required: true, message: 'Nhập phụ cấp cơ bản (có thể là 0)' }, { type: 'number', min: 0, message: 'Không được âm' }]}><InputNumber<number> className="w-full" min={0} step={1000} /></Form.Item>
          <Form.Item name="payoutDate" label="Ngày chi trả (YYYY-MM-DD)" rules={[{ pattern: /^\d{4}-\d{2}-\d{2}$/, message: 'Dạng YYYY-MM-DD, ví dụ 2026-11-10' }]}><Input placeholder="2026-11-10" /></Form.Item>
          <Form.Item name="reason" label="Lý do sửa (ghi nhật ký)"><Input /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Xử lý khiếu nại" open={Boolean(review)} onCancel={() => setReview(null)} footer={null} destroyOnHidden>
        {review && (
          <Form form={reviewForm} layout="vertical">
            <p><strong>{review.member?.fullName}</strong> đề nghị {review.points > 0 ? 'cộng' : 'trừ'} {points(Math.abs(review.points))} điểm.</p>
            <p className="whitespace-pre-wrap text-gray-600">{review.reason}</p>
            <Form.Item name="points" label="Số điểm áp dụng"><InputNumber className="w-full" step={0.5} /></Form.Item>
            <Form.Item name="note" label="Ghi chú phản hồi"><Input.TextArea rows={2} /></Form.Item>
            <Space>
              <Button type="primary" onClick={() => run('review', async () => { await pointApi.reviewAdjustment(review._id, { status: 'APPROVED', ...reviewForm.getFieldsValue() }); setReview(null); }, 'Đã duyệt khiếu nại')}>Duyệt</Button>
              <Button danger onClick={() => run('review', async () => { await pointApi.reviewAdjustment(review._id, { status: 'REJECTED', note: reviewForm.getFieldValue('note') }); setReview(null); }, 'Đã từ chối khiếu nại')}>Từ chối</Button>
            </Space>
          </Form>
        )}
      </Modal>
    </div>
  );
}

const CONDITION_HINT: Record<string, string> = {
  MENTORING_RECAP: '{"recapRole":"MENTEE","submittedDayFrom":1,"submittedDayTo":7}',
  MENTORING_AWARD: '{"rank":1}',
  FUND_MONTHLY: '{"minApprovedAmount":150000}',
  MEMBER_POSITION: '{"positionCode":"LEADER"}',
  SUBMISSION: '{"moduleCode":"READING","minScore":50}'
};

/** Cấu hình loại điểm (cột bảng tổng hợp) và quy tắc tính tự động */
function PointConfig() {
  const { message } = App.useApp();
  const [types, setTypes] = useState<PointType[]>([]);
  const [rules, setRules] = useState<PointRule[]>([]);
  const [editingRule, setEditingRule] = useState<Partial<PointRule> | null>(null);
  const [editingType, setEditingType] = useState<Partial<PointType> | null>(null);
  const [saving, setSaving] = useState(false);
  const [ruleForm] = Form.useForm();
  const [typeForm] = Form.useForm();

  const load = useCallback(async () => {
    try {
      const [nextTypes, nextRules] = await Promise.all([pointTypeApi.many(undefined, { sortOrder: 1 }), pointRuleApi.many(undefined, { code: 1 })]);
      setTypes(nextTypes);
      setRules(nextRules);
    } catch (error) {
      message.error(errorMessage(error));
    }
  }, [message]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);

  const saveRule = async (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      let conditions: unknown = {};
      try { conditions = values.conditions ? JSON.parse(String(values.conditions)) : {}; } catch { throw new Error('Điều kiện phải là JSON hợp lệ'); }
      const body = { ...values, conditions } as Partial<PointRule>;
      if (editingRule?._id) await pointRuleApi.update(editingRule._id, body);
      else await pointRuleApi.create(body);
      message.success('Đã lưu quy tắc');
      setEditingRule(null);
      await load();
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const saveType = async (values: Partial<PointType>) => {
    setSaving(true);
    try {
      if (editingType?._id) await pointTypeApi.update(editingType._id, values);
      else await pointTypeApi.create(values);
      message.success('Đã lưu loại điểm');
      setEditingType(null);
      await load();
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const typeName = (id: string) => types.find((type) => type._id === id)?.name ?? '—';

  return (
    <div className="space-y-4">
      <Alert type="info" showIcon title="Thay đổi quy tắc có hiệu lực ở lần “Tính lại” tiếp theo của kỳ chưa chốt. Quy tắc điểm 0 hoặc đang tắt sẽ không tính." />
      <Card size="small" title="Quy tắc điểm" extra={<Button size="small" icon={<PlusOutlined />} onClick={() => { ruleForm.resetFields(); ruleForm.setFieldsValue({ targetMemberType: 'MENTEE', ruleKind: 'AUTO', isActive: true, priority: 0, conditions: '{}' }); setEditingRule({}); }}>Thêm quy tắc</Button>}>
        <Table<PointRule>
          rowKey="_id"
          size="small"
          dataSource={rules}
          scroll={{ x: 'max-content' }}
          pagination={false}
          columns={[
            { title: 'Mã', dataIndex: 'code', width: 200 },
            { title: 'Tên', dataIndex: 'name' },
            { title: 'Loại điểm', render: (_: unknown, row: PointRule) => typeName(row.pointTypeId) },
            { title: 'Nguồn', render: (_: unknown, row: PointRule) => SOURCE_TYPE_LABEL[row.sourceType] ?? row.sourceType },
            { title: 'Đối tượng', dataIndex: 'targetMemberType' },
            { title: 'Điểm', dataIndex: 'points', align: 'right' as const, render: (value: number) => points(value) },
            { title: 'Điều kiện', render: (_: unknown, row: PointRule) => <code className="text-xs">{JSON.stringify(row.conditions)}</code> },
            { title: 'Bật', render: (_: unknown, row: PointRule) => <Switch size="small" checked={row.isActive} onChange={async (checked) => { try { await pointRuleApi.update(row._id, { isActive: checked }); await load(); } catch (error) { message.error(errorMessage(error)); } }} /> },
            { title: '', render: (_: unknown, row: PointRule) => <Button size="small" onClick={() => { ruleForm.setFieldsValue({ ...row, conditions: JSON.stringify(row.conditions ?? {}) }); setEditingRule(row); }}>Sửa</Button> }
          ]}
        />
      </Card>
      <Card size="small" title="Loại điểm (cột bảng tổng hợp)" extra={<Button size="small" icon={<PlusOutlined />} onClick={() => { typeForm.resetFields(); typeForm.setFieldsValue({ isAllowance: true, isActive: true, sortOrder: 50, category: 'OTHER' }); setEditingType({}); }}>Thêm loại điểm</Button>}>
        <Table<PointType>
          rowKey="_id"
          size="small"
          dataSource={types}
          pagination={false}
          columns={[
            { title: 'Mã', dataIndex: 'code' },
            { title: 'Tên', dataIndex: 'name' },
            { title: 'Nhóm', dataIndex: 'category', render: (value: string) => POINT_CATEGORY_LABEL[value] ?? value },
            { title: 'Tính phụ cấp', dataIndex: 'isAllowance', render: (value: boolean) => value ? <Tag color="green">Có</Tag> : <Tag>Không</Tag> },
            { title: 'Thứ tự', dataIndex: 'sortOrder' },
            { title: '', render: (_: unknown, row: PointType) => <Button size="small" onClick={() => { typeForm.setFieldsValue(row); setEditingType(row); }}>Sửa</Button> }
          ]}
        />
      </Card>

      <Modal title={editingRule?._id ? 'Sửa quy tắc' : 'Thêm quy tắc'} open={Boolean(editingRule)} onCancel={() => setEditingRule(null)} onOk={() => ruleForm.submit()} confirmLoading={saving} width={640} destroyOnHidden>
        <Form form={ruleForm} layout="vertical" onFinish={saveRule}>
          <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
            <Form.Item name="code" label="Mã" rules={[{ required: true }]}><Input disabled={Boolean(editingRule?._id)} /></Form.Item>
            <Form.Item name="name" label="Tên" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="pointTypeId" label="Loại điểm" rules={[{ required: true }]}><Select options={types.map((type) => ({ value: type._id, label: type.name }))} /></Form.Item>
            <Form.Item name="sourceType" label="Nguồn dữ liệu" rules={[{ required: true }]}>
              <Select options={Object.entries(SOURCE_TYPE_LABEL).filter(([key]) => key !== 'POINT_ADJUSTMENT').map(([value, label]) => ({ value, label }))} onChange={(value: string) => ruleForm.setFieldValue('conditions', CONDITION_HINT[value] ?? '{}')} />
            </Form.Item>
            <Form.Item name="ruleKind" label="Kiểu"><Select options={['AUTO', 'RANKING', 'POSITION', 'MANUAL'].map((value) => ({ value, label: value }))} /></Form.Item>
            <Form.Item name="targetMemberType" label="Áp dụng cho"><Select options={[{ value: 'MENTEE', label: 'Mentee' }, { value: 'MENTOR', label: 'Mentor' }, { value: 'ALL', label: 'Tất cả' }]} /></Form.Item>
            <Form.Item name="points" label="Điểm" rules={[{ required: true }]}><InputNumber className="w-full" step={0.5} /></Form.Item>
            <Form.Item name="maxPointsPerPeriod" label="Tối đa / kỳ (tùy chọn)"><InputNumber className="w-full" min={0} /></Form.Item>
            <Form.Item name="exclusiveGroup" label="Nhóm loại trừ (chỉ nhận 1 rule)"><Input /></Form.Item>
            <Form.Item name="priority" label="Ưu tiên (cao thắng)"><InputNumber className="w-full" /></Form.Item>
          </div>
          <Form.Item name="conditions" label="Điều kiện (JSON)"><Input.TextArea rows={3} className="font-mono" /></Form.Item>
          <Form.Item name="isActive" label="Đang bật" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>

      <Modal title={editingType?._id ? 'Sửa loại điểm' : 'Thêm loại điểm'} open={Boolean(editingType)} onCancel={() => setEditingType(null)} onOk={() => typeForm.submit()} confirmLoading={saving} destroyOnHidden>
        <Form form={typeForm} layout="vertical" onFinish={saveType}>
          <Form.Item name="code" label="Mã" rules={[{ required: true }]}><Input disabled={Boolean(editingType?._id)} /></Form.Item>
          <Form.Item name="name" label="Tên" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="category" label="Nhóm" rules={[{ required: true }]}><Select options={Object.entries(POINT_CATEGORY_LABEL).map(([value, label]) => ({ value, label }))} /></Form.Item>
          <Form.Item name="sortOrder" label="Thứ tự cột"><InputNumber className="w-full" /></Form.Item>
          <Form.Item name="isAllowance" label="Tính vào phụ cấp" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

/** Tỷ lệ hoàn tất từng nhóm: căn cứ thưởng +1 của Leader / Phó nhóm */
function CompletionPanel({ code }: { code: string }) {
  const { message } = App.useApp();
  const [rows, setRows] = useState<GroupCompletion[]>([]);
  useEffect(() => {
    let active = true;
    completionApi.admin(code).then((result) => { if (active) setRows(result); }).catch((error) => message.error(errorMessage(error)));
    return () => { active = false; };
  }, [code, message]);
  return (
    <div className="space-y-3">
      <Alert type="info" showIcon title="Điểm phụ cấp và điểm thưởng lấy theo cấu hình vai trò (Tổ chức & phân quyền → Vai trò & điểm). Thưởng khi tỷ lệ hoàn thành VƯỢT ngưỡng % của loại nhóm." description="Nhóm MTE: hoàn thành = buổi mentoring tháng “Đã xong” (recap MTE đã duyệt) và đủ số bài tối thiểu các module học tập. Nhóm HLC Fund: mọi tuần của tháng có khoản đóng được duyệt (MTO và thầy cô; Leader/Phó không tính vào mẫu số)." />
      <Table<GroupCompletion> rowKey="_id" size="small" pagination={false} dataSource={rows} columns={[
        { title: 'Nhóm', dataIndex: 'name' },
        { title: 'Loại', dataIndex: 'groupKind', render: (value: GroupCompletion['groupKind']) => GROUP_KIND_LABEL[value] },
        { title: 'Leader', dataIndex: 'leader', render: (value: string | null) => value ?? '—' },
        { title: 'Phó nhóm', dataIndex: 'deputy', render: (value: string | null) => value ?? '—' },
        { title: 'Hoàn tất', render: (_: unknown, row: GroupCompletion) => row.total ? <Progress size="small" className="!m-0 min-w-40" percent={row.rate ?? 0} format={() => `${row.done}/${row.total}`} status={row.passed ? 'success' : 'normal'} /> : 'Chưa có dữ liệu' },
        { title: 'Ngưỡng', dataIndex: 'threshold', render: (value: number) => `> ${value}%` },
        { title: 'Thưởng', render: (_: unknown, row: GroupCompletion) => row.passed ? <Tag color="green">Đạt</Tag> : <Tag>Chưa đạt</Tag> }
      ]} />
    </div>
  );
}

/** Nhật ký kỳ: ai sửa đơn giá, chốt, mở khóa, chi trả, bù chênh lệch; từ bao nhiêu thành bao nhiêu */
function PeriodLogPanel({ code }: { code: string }) {
  const { message } = App.useApp();
  const [rows, setRows] = useState<PeriodLog[]>([]);
  useEffect(() => {
    let active = true;
    pointApi.logs(code).then((result) => { if (active) setRows(result); }).catch((error) => message.error(errorMessage(error)));
    return () => { active = false; };
  }, [code, message]);
  return (
    <Table<PeriodLog> rowKey="_id" size="small" dataSource={rows} pagination={{ pageSize: 15 }} scroll={{ x: 'max-content' }} locale={{ emptyText: 'Chưa có thay đổi' }} columns={[
      { title: 'Thời gian', render: (_: unknown, row: PeriodLog) => formatDateTime(row.createdAt) },
      { title: 'Thao tác', dataIndex: 'action', render: (value: string) => <Tag>{PERIOD_LOG_LABEL[value] ?? value}</Tag> },
      { title: 'Nội dung', render: (_: unknown, row: PeriodLog) => row.field ? `${PERIOD_FIELD_LABEL[row.field] ?? row.field}: ${row.oldValue ?? '—'} → ${row.newValue ?? '—'}` : (row.newValue ?? '') },
      { title: 'Lý do', dataIndex: 'reason', render: (value: string | null) => value ?? '—' },
      { title: 'Người thực hiện', dataIndex: 'changedByName' }
    ]} />
  );
}
