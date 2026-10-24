'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, App, Button, Card, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Segmented, Select, Space, Statistic, Table, Tag, Tooltip, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip as ChartTooltip } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { errorMessage } from '@/lib/api';
import { PERIOD_STATUS_COLOR, PERIOD_STATUS_LABEL, formatDate, fundApi, money, type FundLedger, type GroupKind, type PayoutExpense } from '@/services/hlcApi';
import { getCurrentTime } from '@/utils/time';

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTooltip, Legend);

type MonthRow = FundLedger['byMonth'][number];
type PeriodRow = FundLedger['allowancePeriods'][number];
const SOURCE_LABEL = { MTE: 'Nhóm MTE', MTO: 'Nhóm HLC Fund của MTO', EXTERNAL: 'Thầy cô ngoài danh sách' } as const;
const openSheet = (periodCode: string) => window.open(`/admin-points?period=${periodCode}`, '_blank');

/**
 * Dashboard thu chi HLC Fund. Thu: minh chứng đã duyệt theo ngày đóng. Chi: theo ngày chi thực tế; chi phụ cấp
 * sinh tự động khi bảng phụ cấp được "Xác nhận đã chi" (gắn mã PC-YYYY-MM), khớp với bảng tổng hợp và file xuất.
 */
export default function FundLedgerPanel() {
  const { message } = App.useApp();
  const now = getCurrentTime();
  const [year, setYear] = useState(() => now.getFullYear());
  const [view, setView] = useState<'month' | 'quarter' | 'year'>('quarter');
  const [quarter, setQuarter] = useState(() => Math.floor(now.getMonth() / 3) + 1);
  const [month, setMonth] = useState(() => now.getMonth() + 1);
  const [groupKind, setGroupKind] = useState<GroupKind | undefined>(undefined);
  const [data, setData] = useState<FundLedger | null>(null);
  const [editing, setEditing] = useState<PayoutExpense | 'new' | null>(null);
  const [form] = Form.useForm<{ expenseDate: Dayjs; amount: number; description: string; category?: string }>();

  const load = useCallback(async () => {
    try {
      setData(await fundApi.ledger({
        year,
        quarter: view === 'quarter' ? quarter : undefined,
        month: view === 'month' ? month : undefined,
        groupKind
      }));
    } catch (error) {
      message.error(errorMessage(error, 'Không tải được sổ thu chi'));
    }
  }, [year, view, quarter, month, groupKind, message]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);

  const save = async (values: { expenseDate: Dayjs; amount: number; description: string; category?: string }) => {
    try {
      await fundApi.saveExpense({ ...values, expenseDate: values.expenseDate.format('YYYY-MM-DD') }, editing && editing !== 'new' ? editing._id : undefined);
      message.success('Đã lưu khoản chi');
      setEditing(null);
      await load();
    } catch (error) {
      message.error(errorMessage(error));
    }
  };

  const years = Array.from({ length: now.getFullYear() - 2022 }, (_, index) => 2023 + index);
  const totals = data?.totals;
  const sourceLabel = groupKind === 'MENTEE' ? ' (nhóm MTE)' : groupKind === 'FUND' ? ' (nhóm HLC Fund: MTO + thầy cô)' : '';
  return (
    <div className="space-y-4">
      <Space wrap>
        <Select className="w-28" value={year} onChange={setYear} options={years.map((value) => ({ value, label: `Năm ${value}` }))} />
        <Segmented value={view} onChange={(value) => setView(value as typeof view)} options={[{ value: 'month', label: 'Theo tháng' }, { value: 'quarter', label: 'Theo quý' }, { value: 'year', label: 'Cả năm' }]} />
        {view === 'quarter' && <Select className="w-28" value={quarter} onChange={setQuarter} options={[1, 2, 3, 4].map((value) => ({ value, label: `Quý ${value}` }))} />}
        {view === 'month' && <Select className="w-32" value={month} onChange={setMonth} options={Array.from({ length: 12 }, (_, index) => ({ value: index + 1, label: `Tháng ${index + 1}` }))} />}
        <Select className="w-72" allowClear placeholder="Mọi loại nhóm" value={groupKind} onChange={setGroupKind} options={[{ value: 'MENTEE', label: 'Nhóm MTE' }, { value: 'FUND', label: 'Nhóm HLC Fund (MTO & thầy cô)' }]} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); form.setFieldsValue({ expenseDate: dayjs(now) }); setEditing('new'); }}>Thêm khoản chi khác</Button>
      </Space>
      {data && totals && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card size="small"><Statistic title={`Tổng thu${sourceLabel}`} value={money(totals.income)} /></Card>
            <Card size="small"><Statistic title="Tổng chi (theo ngày chi thực tế)" value={money(totals.expense)} /></Card>
            <Card size="small"><Statistic title="Chênh lệch kỳ" value={money(totals.net)} /><div className="text-xs text-gray-500">Tồn quỹ cuối kỳ: {money(totals.balance)}</div></Card>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Card size="small" title="Nguồn thu">
              <Table size="small" pagination={false} rowKey="key" dataSource={(['MTE', 'MTO', 'EXTERNAL'] as const).map((key) => ({ key, label: SOURCE_LABEL[key], amount: totals.incomeByKind[key] }))} columns={[
                { title: 'Nguồn', dataIndex: 'label' },
                { title: 'Số tiền', dataIndex: 'amount', align: 'right' as const, render: (value: number) => money(value) }
              ]} />
            </Card>
            <Card size="small" title="Loại chi">
              <Table size="small" pagination={false} rowKey="key" dataSource={[
                { key: 'ALLOWANCE', label: 'Chi phụ cấp (từ bảng PC đã chi)', amount: totals.expenseByType.ALLOWANCE },
                { key: 'OTHER', label: 'Các khoản chi khác', amount: totals.expenseByType.OTHER }
              ]} columns={[
                { title: 'Loại', dataIndex: 'label' },
                { title: 'Số tiền', dataIndex: 'amount', align: 'right' as const, render: (value: number) => money(value) }
              ]} />
            </Card>
          </div>
          {view !== 'month' && (
            <Card size="small" title="Theo tháng (chi tính theo ngày chi thực tế)">
              <Bar
                height={90}
                data={{
                  labels: data.byMonth.map((row) => `T${row.month}`),
                  datasets: [
                    { label: SOURCE_LABEL.MTE, data: data.byMonth.map((row) => row.income.MTE), backgroundColor: '#6d5dfc', stack: 'thu' },
                    { label: SOURCE_LABEL.MTO, data: data.byMonth.map((row) => row.income.MTO), backgroundColor: '#4b91eb', stack: 'thu' },
                    { label: SOURCE_LABEL.EXTERNAL, data: data.byMonth.map((row) => row.income.EXTERNAL), backgroundColor: '#ec9a50', stack: 'thu' },
                    { label: 'Chi phụ cấp', data: data.byMonth.map((row) => row.expenseByType.ALLOWANCE), backgroundColor: '#e5484d', stack: 'chi' },
                    { label: 'Chi khác', data: data.byMonth.map((row) => row.expenseByType.OTHER), backgroundColor: '#f59e9e', stack: 'chi' }
                  ]
                }}
                options={{ responsive: true, scales: { x: { stacked: true }, y: { stacked: true } } }}
              />
              <Table<MonthRow>
                className="mt-3"
                rowKey="code"
                size="small"
                pagination={false}
                dataSource={data.byMonth}
                scroll={{ x: 'max-content' }}
                columns={[
                  { title: 'Tháng', dataIndex: 'code', render: (value: string) => `${value.slice(5)}/${value.slice(0, 4)}` },
                  { title: SOURCE_LABEL.MTE, align: 'right' as const, render: (_: unknown, row: MonthRow) => money(row.income.MTE) },
                  { title: SOURCE_LABEL.MTO, align: 'right' as const, render: (_: unknown, row: MonthRow) => money(row.income.MTO) },
                  { title: 'Thầy cô', align: 'right' as const, render: (_: unknown, row: MonthRow) => money(row.income.EXTERNAL) },
                  { title: 'Tổng thu', align: 'right' as const, render: (_: unknown, row: MonthRow) => <strong>{money(row.income.total)}</strong> },
                  { title: 'Chi phụ cấp', align: 'right' as const, render: (_: unknown, row: MonthRow) => <span className="text-red-500">{money(row.expenseByType.ALLOWANCE)}</span> },
                  { title: 'Chi khác', align: 'right' as const, render: (_: unknown, row: MonthRow) => <span className="text-red-500">{money(row.expenseByType.OTHER)}</span> },
                  { title: 'Chênh lệch', align: 'right' as const, render: (_: unknown, row: MonthRow) => money(row.net) }
                ]}
              />
            </Card>
          )}
          {view === 'year' && (
            <Card size="small" title="Theo quý">
              <Table rowKey="quarter" size="small" pagination={false} dataSource={data.byQuarter} columns={[
                { title: 'Quý', dataIndex: 'quarter', render: (value: number) => `Quý ${value}/${data.year}` },
                { title: 'Thu', align: 'right' as const, dataIndex: 'income', render: (value: number) => money(value) },
                { title: 'Chi', align: 'right' as const, dataIndex: 'expense', render: (value: number) => money(value) },
                { title: 'Trong đó chi phụ cấp', align: 'right' as const, dataIndex: 'expenseAllowance', render: (value: number) => money(value) },
                { title: 'Chênh lệch', align: 'right' as const, dataIndex: 'net', render: (value: number) => money(value) }
              ]} />
            </Card>
          )}
          <Card size="small" title="Đối chiếu theo kỳ phụ cấp">
            <Alert className="!mb-3" type="info" showIcon title="Khoản chi phụ cấp chỉ vào sổ quỹ khi bảng được “Xác nhận đã chi” (ngày chi thực tế, thường mùng 10 tháng sau). Bảng đã chốt nhưng chưa chi chưa tính vào tổng chi." />
            <Table<PeriodRow> rowKey="periodCode" size="small" pagination={false} dataSource={data.allowancePeriods} scroll={{ x: 'max-content' }} locale={{ emptyText: 'Chưa có kỳ phụ cấp' }} columns={[
              { title: 'Bảng', render: (_: unknown, row: PeriodRow) => <Button size="small" type="link" className="!px-0" onClick={() => openSheet(row.periodCode)}>{row.sheetCode}</Button> },
              { title: 'Trạng thái', render: (_: unknown, row: PeriodRow) => <Tag color={PERIOD_STATUS_COLOR[row.status]}>{PERIOD_STATUS_LABEL[row.status]}</Tag> },
              { title: 'Tổng bảng tổng hợp', align: 'right' as const, render: (_: unknown, row: PeriodRow) => money(row.summaryAmount) },
              { title: 'Đã ghi sổ quỹ', align: 'right' as const, render: (_: unknown, row: PeriodRow) => row.recordedAmount === null ? <Typography.Text type="secondary">Chưa chi</Typography.Text> : money(row.recordedAmount) },
              { title: 'Ngày chi', render: (_: unknown, row: PeriodRow) => row.paidDate ? formatDate(row.paidDate) : '—' },
              { title: 'Trong đó bù chênh lệch', align: 'right' as const, render: (_: unknown, row: PeriodRow) => row.carryOverTotal ? money(row.carryOverTotal) : '' },
              {
                title: 'Lệch sau khi sửa', align: 'right' as const, render: (_: unknown, row: PeriodRow) => row.difference
                  ? <Tooltip title="Bảng đã được mở khóa sửa sau khi chi: xử lý bằng dòng bù chênh lệch ở tháng sau"><Tag color="orange">{money(row.difference)}</Tag></Tooltip>
                  : ''
              }
            ]} />
          </Card>
          <Card size="small" title="Khoản chi trong kỳ">
            <Table<PayoutExpense> rowKey="_id" size="small" pagination={{ pageSize: 10 }} dataSource={data.expenses} locale={{ emptyText: 'Chưa có khoản chi' }} scroll={{ x: 'max-content' }} columns={[
              { title: 'Ngày chi', dataIndex: 'expenseDate', render: (value: string) => formatDate(value) },
              {
                title: 'Nội dung', render: (_: unknown, row: PayoutExpense) => (
                  <div>
                    {row.description}
                    {row.detail?.carryOvers?.length ? (
                      <div className="text-xs text-gray-500">Gồm bù chênh lệch: {row.detail.carryOvers.map((item) => `${item.fullName ?? item.memberCode} ${money(item.amount)} (${item.reason})`).join('; ')}</div>
                    ) : null}
                  </div>
                )
              },
              { title: 'Loại', render: (_: unknown, row: PayoutExpense) => row.source === 'ALLOWANCE' ? <Tag color="red">Chi phụ cấp</Tag> : <Tag>{row.category || 'Chi khác'}</Tag> },
              { title: 'Số tiền', align: 'right' as const, dataIndex: 'amount', render: (value: number) => money(value) },
              {
                title: '', render: (_: unknown, row: PayoutExpense) => row.source === 'ALLOWANCE'
                  ? <Button size="small" onClick={() => row.sheetCode && openSheet(row.sheetCode.replace('PC-', ''))}>Mở bảng {row.sheetCode}</Button>
                  : (
                    <Space>
                      <Button size="small" onClick={() => { form.setFieldsValue({ ...row, category: row.category ?? undefined, expenseDate: dayjs(row.expenseDate) }); setEditing(row); }}>Sửa</Button>
                      <Popconfirm title="Xóa khoản chi?" onConfirm={async () => { try { await fundApi.removeExpense(row._id); await load(); } catch (error) { message.error(errorMessage(error)); } }}><Button size="small" danger>Xóa</Button></Popconfirm>
                    </Space>
                  )
              }
            ]} />
          </Card>
        </>
      )}
      <Typography.Text type="secondary" className="text-xs">Thu tính theo ngày đóng của các khoản đã duyệt. Chi phụ cấp lấy tự động từ bảng tổng hợp (điểm x đơn giá + bù chênh lệch), không nhập tay. Tồn quỹ = mọi khoản thu đã duyệt trừ mọi khoản chi tính đến cuối kỳ đang xem.</Typography.Text>
      <Modal title={editing && editing !== 'new' ? 'Sửa khoản chi' : 'Thêm khoản chi khác'} open={Boolean(editing)} onCancel={() => setEditing(null)} onOk={() => form.submit()} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item name="expenseDate" label="Ngày chi" rules={[{ required: true }]}><DatePicker className="w-full" format="DD/MM/YYYY" /></Form.Item>
          <Form.Item name="amount" label="Số tiền (đ)" rules={[{ required: true }]}><InputNumber<number> className="w-full" min={1000} step={10000} /></Form.Item>
          <Form.Item name="description" label="Nội dung" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="category" label="Nhóm chi"><Input placeholder="VD: Học bổng, Sự kiện, Văn phòng phẩm" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
