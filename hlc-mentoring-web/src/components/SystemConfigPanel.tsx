'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, App, Button, Card, Form, Input, Modal, Select, Switch, Table, Tag, Typography } from 'antd';
import { errorMessage } from '@/lib/api';
import { provinceApi, systemConfigApi, type Province, type SystemConfig } from '@/services/hlcApi';

/** Công tắc cấu hình (Admin toàn cục) và danh mục 34 tỉnh, thành phố */
export default function SystemConfigPanel() {
  const { message } = App.useApp();
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [editing, setEditing] = useState<Province | 'new' | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    try {
      const [nextConfig, list] = await Promise.all([systemConfigApi.get(), provinceApi.list(true)]);
      setConfig(nextConfig);
      setProvinces(list);
    } catch (error) {
      message.error(errorMessage(error));
    }
  }, [message]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);

  const toggle = async (key: keyof SystemConfig, value: boolean) => {
    try {
      setConfig(await systemConfigApi.save({ [key]: value }));
      message.success('Đã lưu cấu hình (có ghi nhật ký)');
    } catch (error) {
      message.error(errorMessage(error));
    }
  };

  const active = provinces.filter((item) => item.isActive);
  return (
    <div className="space-y-4">
      <Card size="small" title="Công tắc cấu hình">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Switch checked={config?.forcePasswordChangeOnFirstLogin} onChange={(value) => toggle('forcePasswordChangeOnFirstLogin', value)} />
            <div><strong>Bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên</strong><div className="text-xs text-gray-500">Tạm tắt trong giai đoạn thử nghiệm; bật khi lên môi trường chính thức. Tài khoản chưa tự đổi mật khẩu lần nào phải đổi trước khi dùng chức năng khác.</div></div>
          </div>
          <div className="flex items-start gap-3">
            <Switch checked={config?.memberCanEditProfileUrl} onChange={(value) => toggle('memberCanEditProfileUrl', value)} />
            <div><strong>MTE / MTO tự sửa link profile</strong><div className="text-xs text-gray-500">Tạm thời tắt: chỉ Admin sửa link profile (có nhật ký). Bật để mở lại quyền tự sửa.</div></div>
          </div>
          <div className="flex items-start gap-3">
            <Switch checked={config?.allowUnlockPaidPeriod} onChange={(value) => toggle('allowUnlockPaidPeriod', value)} />
            <div><strong>Cho mở khóa kỳ phụ cấp đã xác nhận đã chi (giai đoạn thử nghiệm)</strong><div className="text-xs text-gray-500">Bật: Admin toàn cục mở khóa được mọi kỳ để sửa rồi chốt lại (luôn bắt buộc lý do, có nhật ký); khoản chi đã ghi sổ quỹ giữ nguyên, chênh lệch ghi bằng bù tháng sau. Tắt khi lên production: chỉ mở khóa kỳ chưa chi.</div></div>
          </div>
        </div>
      </Card>
      <Card size="small" title={`Danh mục tỉnh, thành phố (${active.length} đang dùng)`} extra={<Button size="small" onClick={() => { form.resetFields(); form.setFieldsValue({ isActive: true, aliases: [] }); setEditing('new'); }}>Thêm đơn vị</Button>}>
        <Alert className="!mb-3" type="info" showIcon title="Hồ sơ lưu mã đơn vị nên đổi tên không làm hỏng dữ liệu đã lưu. Khi gộp đơn vị, chọn “Gộp vào”: hồ sơ của đơn vị cũ tự chuyển sang mã mới." />
        <Table<Province>
          rowKey="_id"
          size="small"
          dataSource={provinces}
          pagination={{ pageSize: 12 }}
          columns={[
            { title: 'Mã', dataIndex: 'code', width: 140 },
            { title: 'Tên', dataIndex: 'name' },
            { title: 'Tên cũ / cách viết khác', render: (_: unknown, row: Province) => <Typography.Text type="secondary" className="text-xs">{row.aliases.join(', ')}</Typography.Text> },
            { title: '', render: (_: unknown, row: Province) => row.mergedInto ? <Tag>Gộp vào {row.mergedInto}</Tag> : row.isActive ? null : <Tag>Ngừng dùng</Tag> },
            { title: '', render: (_: unknown, row: Province) => <Button size="small" onClick={() => { form.setFieldsValue(row); setEditing(row); }}>Sửa</Button> }
          ]}
        />
      </Card>
      <Modal title={editing && editing !== 'new' ? `Sửa ${editing.name}` : 'Thêm đơn vị hành chính'} open={Boolean(editing)} onCancel={() => setEditing(null)} onOk={() => form.submit()} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={async (values) => {
          try {
            await provinceApi.save(values);
            message.success('Đã lưu danh mục và quy đổi hồ sơ liên quan');
            setEditing(null);
            await load();
          } catch (error) {
            message.error(errorMessage(error));
          }
        }}>
          <Form.Item name="code" label="Mã (không đổi được)" rules={[{ required: true, pattern: /^[A-Z0-9_]{2,30}$/, message: 'Chữ in hoa, số, dấu _' }]}><Input disabled={editing !== 'new'} /></Form.Item>
          <Form.Item name="name" label="Tên" rules={[{ required: true, message: 'Nhập tên' }]}><Input /></Form.Item>
          <Form.Item name="aliases" label="Tên cũ / cách viết khác (để quy đổi dữ liệu nhập tự do)"><Select mode="tags" tokenSeparators={[',']} /></Form.Item>
          <Form.Item name="mergedInto" label="Gộp vào đơn vị (nếu bị sáp nhập)"><Select allowClear options={active.filter((item) => editing === 'new' || item.code !== editing?.code).map((item) => ({ value: item.code, label: item.name }))} /></Form.Item>
          <Form.Item name="isActive" label="Đang dùng" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
