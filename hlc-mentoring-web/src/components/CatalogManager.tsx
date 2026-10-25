'use client';

import { useCallback, useEffect, useState } from 'react';
import { App, Button, Card, Form, Input, Modal, Select, Switch, Table, Tag, Typography } from 'antd';
import { errorMessage } from '@/lib/api';
import { catalogApi, type CatalogItem } from '@/services/hlcApi';

const TITLE: Record<CatalogItem['type'], string> = { CAREER: 'Nhóm ngành nghề (ngành học, ngành nghề)', BANK: 'Ngân hàng nhận chi trả từ MB Bank' };

/** Quản lý danh mục chung: thêm, đổi tên, ẩn, gộp (hồ sơ lưu mã nên không hỏng dữ liệu đã lưu) */
export default function CatalogManager({ type }: { type: CatalogItem['type'] }) {
  const { message } = App.useApp();
  const [rows, setRows] = useState<CatalogItem[]>([]);
  const [keyword, setKeyword] = useState('');
  const [editing, setEditing] = useState<CatalogItem | 'new' | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    try {
      setRows(await catalogApi.list(type, true));
    } catch (error) {
      message.error(errorMessage(error));
    }
  }, [type, message]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);

  const active = rows.filter((row) => row.isActive);
  const query = keyword.trim().toLowerCase();
  const shown = rows.filter((row) => !query || `${row.code} ${row.name} ${row.shortName ?? ''} ${row.aliases.join(' ')}`.toLowerCase().includes(query));
  return (
    <Card size="small" title={`${TITLE[type]} (${active.length} đang dùng)`} extra={<Button size="small" onClick={() => { form.resetFields(); form.setFieldsValue({ isActive: true, aliases: [] }); setEditing('new'); }}>Thêm</Button>}>
      {type === 'BANK' && <Typography.Paragraph type="secondary" className="text-xs">Chỉ đưa vào ngân hàng nhận được chuyển khoản chi phụ cấp từ MB Bank (Ban HLC Fund kiểm tra thực tế). Ngân hàng sáp nhập: chọn “Gộp vào”, hồ sơ cũ tự chuyển sang mã mới.</Typography.Paragraph>}
      <Input.Search allowClear placeholder="Tìm theo tên, mã, cách viết khác" className="!mb-3 sm:max-w-xs" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
      <Table<CatalogItem>
        rowKey="_id"
        size="small"
        dataSource={shown}
        pagination={{ pageSize: 10, size: 'small' }}
        scroll={{ x: 'max-content' }}
        columns={[
          { title: 'Tên', render: (_: unknown, row: CatalogItem) => <div><strong>{row.shortName ?? row.name}</strong>{row.shortName && <div className="text-xs text-gray-500">{row.name}</div>}<div className="text-xs text-gray-400">{row.code}</div></div> },
          { title: 'Cách viết khác', render: (_: unknown, row: CatalogItem) => <span className="text-xs text-gray-500">{row.aliases.join(', ')}</span> },
          { title: '', render: (_: unknown, row: CatalogItem) => row.mergedInto ? <Tag>Gộp vào {row.mergedInto}</Tag> : row.isActive ? <Tag color="green">Đang dùng</Tag> : <Tag>Đã ẩn</Tag> },
          { title: '', render: (_: unknown, row: CatalogItem) => <Button size="small" onClick={() => { form.setFieldsValue(row); setEditing(row); }}>Sửa</Button> }
        ]}
      />
      <Modal title={editing && editing !== 'new' ? `Sửa ${editing.shortName ?? editing.name}` : 'Thêm vào danh mục'} open={Boolean(editing)} onCancel={() => setEditing(null)} onOk={() => form.submit()} destroyOnHidden>
        <Form form={form} name={`catalog-${type}`} layout="vertical" onFinish={async (values) => {
          try {
            await catalogApi.save(type, values);
            message.success('Đã lưu danh mục và quy đổi hồ sơ liên quan');
            setEditing(null);
            await load();
          } catch (error) {
            message.error(errorMessage(error));
          }
        }}>
          <Form.Item name="code" label="Mã (không đổi được)" rules={[{ required: true, pattern: /^[A-Z0-9_]{2,30}$/, message: 'Chữ in hoa, số, dấu _' }]}><Input disabled={editing !== 'new'} /></Form.Item>
          <Form.Item name="name" label={type === 'BANK' ? 'Tên đầy đủ' : 'Tên nhóm ngành'} rules={[{ required: true, message: 'Nhập tên' }]}><Input /></Form.Item>
          {type === 'BANK' && <Form.Item name="shortName" label="Tên thường gọi (VD: Vietcombank)"><Input /></Form.Item>}
          <Form.Item name="aliases" label="Cách viết khác / tên cũ (để quy đổi dữ liệu nhập tự do)"><Select mode="tags" tokenSeparators={[',']} /></Form.Item>
          <Form.Item name="mergedInto" label="Gộp vào (nếu sáp nhập)"><Select allowClear showSearch optionFilterProp="label" options={active.filter((row) => editing === 'new' || row.code !== editing?.code).map((row) => ({ value: row.code, label: row.shortName ?? row.name }))} /></Form.Item>
          <Form.Item name="isActive" label="Đang dùng (tắt = ẩn khỏi ô chọn, dữ liệu cũ giữ nguyên)" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
