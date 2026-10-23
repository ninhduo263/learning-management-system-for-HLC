'use client';

import { useCallback, useEffect, useState } from 'react';
import { App, Button, Card, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Statistic, Table, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { errorMessage } from '@/lib/api';
import { PAYER_KIND_LABEL, formatDate, fundApi, money, type FundLedger, type PayerKind } from '@/services/hlcApi';
import { getCurrentTime } from '@/utils/time';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type Expense = FundLedger['expenses'][number];

/** Sổ thu chi chung của HLC Fund: thu (MTO + MTE + thầy cô ngoài danh sách) và chi, theo tháng / quý */
export default function FundLedgerPanel() {
  const { message } = App.useApp();
  const [year, setYear] = useState(() => getCurrentTime().getFullYear());
  const [quarter, setQuarter] = useState<number | undefined>(undefined);
  const [kind, setKind] = useState<PayerKind | undefined>(undefined);
  const [data, setData] = useState<FundLedger | null>(null);
  const [editing, setEditing] = useState<Expense | 'new' | null>(null);
  const [form] = Form.useForm<{ expenseDate: Dayjs; amount: number; description: string; category?: string }>();

  const load = useCallback(async () => {
    try {
      setData(await fundApi.ledger({ year, quarter, kind }));
    } catch (error) {
      message.error(errorMessage(error, 'Không tải được sổ thu chi'));
    }
  }, [year, quarter, kind, message]);

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

  const years = Array.from({ length: getCurrentTime().getFullYear() - 2022 }, (_, index) => 2023 + index);
  return (
    <div className="space-y-4">
      <Space wrap>
        <Select className="w-28" value={year} onChange={setYear} options={years.map((value) => ({ value, label: `Năm ${value}` }))} />
        <Select className="w-32" allowClear placeholder="Cả năm" value={quarter} onChange={setQuarter} options={[1, 2, 3, 4].map((value) => ({ value, label: `Quý ${value}` }))} />
        <Select className="w-56" allowClear placeholder="Mọi người đóng" value={kind} onChange={setKind} options={Object.entries(PAYER_KIND_LABEL).map(([value, label]) => ({ value, label }))} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); form.setFieldsValue({ expenseDate: dayjs(getCurrentTime()) }); setEditing('new'); }}>Thêm khoản chi</Button>
      </Space>
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Card size="small"><Statistic title={`Thu${kind ? ` (${PAYER_KIND_LABEL[kind]})` : ''}`} value={money(data.totals.income)} /></Card>
            <Card size="small"><Statistic title="Chi" value={money(data.totals.expense)} /></Card>
            <Card size="small"><Statistic title="Chênh lệch kỳ" value={money(data.totals.net)} /></Card>
            <Card size="small"><Statistic title="Tồn quỹ cuối kỳ" value={money(data.totals.balance)} /></Card>
          </div>
          <Card size="small" title="Theo tháng">
            <Bar
              height={90}
              data={{
                labels: data.byMonth.map((row) => `T${row.month}`),
                datasets: [
                  { label: 'Thu MTO', data: data.byMonth.map((row) => row.income.MTO), backgroundColor: '#4b91eb', stack: 'thu' },
                  { label: 'Thu MTE', data: data.byMonth.map((row) => row.income.MTE), backgroundColor: '#6d5dfc', stack: 'thu' },
                  { label: 'Thu thầy cô', data: data.byMonth.map((row) => row.income.EXTERNAL), backgroundColor: '#ec9a50', stack: 'thu' },
                  { label: 'Chi', data: data.byMonth.map((row) => row.expense), backgroundColor: '#e5484d', stack: 'chi' }
                ]
              }}
              options={{ responsive: true, scales: { x: { stacked: true }, y: { stacked: true } } }}
            />
            <Table
              className="mt-3"
              rowKey="code"
              size="small"
              pagination={false}
              dataSource={data.byMonth}
              scroll={{ x: 'max-content' }}
              columns={[
                { title: 'Tháng', dataIndex: 'code', render: (value: string) => `${value.slice(5)}/${value.slice(0, 4)}` },
                { title: 'Thu MTO', align: 'right' as const, render: (_: unknown, row: FundLedger['byMonth'][number]) => money(row.income.MTO) },
                { title: 'Thu MTE', align: 'right' as const, render: (_: unknown, row: FundLedger['byMonth'][number]) => money(row.income.MTE) },
                { title: 'Thu thầy cô', align: 'right' as const, render: (_: unknown, row: FundLedger['byMonth'][number]) => money(row.income.EXTERNAL) },
                { title: 'Tổng thu', align: 'right' as const, render: (_: unknown, row: FundLedger['byMonth'][number]) => <strong>{money(row.income.total)}</strong> },
                { title: 'Chi', align: 'right' as const, render: (_: unknown, row: FundLedger['byMonth'][number]) => <span className="text-red-500">{money(row.expense)}</span> }
              ]}
            />
          </Card>
          <Card size="small" title="Theo quý">
            <Table rowKey="quarter" size="small" pagination={false} dataSource={data.byQuarter} columns={[
              { title: 'Quý', dataIndex: 'quarter', render: (value: number) => `Quý ${value}/${data.year}` },
              { title: 'Thu', align: 'right' as const, dataIndex: 'income', render: (value: number) => money(value) },
              { title: 'Chi', align: 'right' as const, dataIndex: 'expense', render: (value: number) => money(value) },
              { title: 'Chênh lệch', align: 'right' as const, render: (_: unknown, row: FundLedger['byQuarter'][number]) => money(row.income - row.expense) }
            ]} />
          </Card>
          <Card size="small" title="Khoản chi trong kỳ">
            <Table<Expense> rowKey="_id" size="small" pagination={{ pageSize: 10 }} dataSource={data.expenses} locale={{ emptyText: 'Chưa có khoản chi' }} columns={[
              { title: 'Ngày', dataIndex: 'expenseDate', render: (value: string) => formatDate(value) },
              { title: 'Nội dung', dataIndex: 'description' },
              { title: 'Nhóm chi', dataIndex: 'category' },
              { title: 'Số tiền', align: 'right' as const, dataIndex: 'amount', render: (value: number) => money(value) },
              {
                title: '', render: (_: unknown, row: Expense) => (
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
      <Typography.Text type="secondary" className="text-xs">Thu tính theo ngày đóng của các khoản đã duyệt (Đã xong). Tồn quỹ = mọi khoản thu đã duyệt trừ mọi khoản chi tính đến cuối kỳ đang xem.</Typography.Text>
      <Modal title={editing && editing !== 'new' ? 'Sửa khoản chi' : 'Thêm khoản chi'} open={Boolean(editing)} onCancel={() => setEditing(null)} onOk={() => form.submit()} destroyOnHidden>
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
