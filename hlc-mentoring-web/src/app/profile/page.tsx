'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, App, Button, Card, DatePicker, Form, Input, Select, Table, Tag, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { errorMessage } from '@/lib/api';
import { formatDateTime } from '@/services/mentoringApi';
import { PROFILE_FIELD_LABEL, profileApi, type Member, type ProfileLog } from '@/services/hlcApi';

type Values = Omit<Partial<Member>, 'dateOfBirth'> & { dateOfBirth?: Dayjs };

/** Mentor / mentee tự cập nhật hồ sơ; số tài khoản có lịch sử thay đổi để đối soát */
export default function ProfilePage() {
  const { message } = App.useApp();
  const [member, setMember] = useState<Member | null>(null);
  const [logs, setLogs] = useState<ProfileLog[]>([]);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<Values>();

  const load = useCallback(async () => {
    try {
      const [profile, history] = await Promise.all([profileApi.mine(), profileApi.logs()]);
      setMember(profile);
      setLogs(history);
      form.setFieldsValue({ ...profile, dateOfBirth: profile.dateOfBirth ? dayjs(profile.dateOfBirth) : undefined });
    } catch (error) {
      message.error(errorMessage(error, 'Không tải được hồ sơ'));
    }
  }, [form, message]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);

  const save = async (values: Values) => {
    setSaving(true);
    try {
      const clean = (value?: string | null) => (value ?? '').trim() || undefined;
      await profileApi.update({
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') : undefined,
        gender: values.gender ?? undefined,
        phone: clean(values.phone),
        email: clean(values.email),
        address: clean(values.address),
        hometown: clean(values.hometown),
        profileUrl: clean(values.profileUrl),
        bankAccount: clean(values.bankAccount)?.replace(/\s+/g, ''),
        bankName: clean(values.bankName)
      });
      message.success('Đã lưu hồ sơ');
      await load();
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Typography.Title level={3} className="!mb-0">Hồ sơ cá nhân</Typography.Title>
      <Card title={member ? `${member.fullName} · ${member.memberCode}` : 'Hồ sơ'} loading={!member}>
        <Form form={form} layout="vertical" onFinish={save}>
          <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
            <Form.Item name="dateOfBirth" label="Ngày sinh"><DatePicker className="w-full" format="DD/MM/YYYY" /></Form.Item>
            <Form.Item name="gender" label="Giới tính"><Select allowClear options={[{ value: 'MALE', label: 'Nam' }, { value: 'FEMALE', label: 'Nữ' }, { value: 'OTHER', label: 'Khác' }]} /></Form.Item>
            <Form.Item name="phone" label="Số điện thoại"><Input /></Form.Item>
            <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Email không hợp lệ' }]}><Input /></Form.Item>
            <Form.Item name="address" label="Địa chỉ hiện tại"><Input /></Form.Item>
            <Form.Item name="hometown" label="Quê quán"><Input /></Form.Item>
            <Form.Item name="profileUrl" label="Link profile (Facebook, LinkedIn...)"><Input /></Form.Item>
          </div>
          <Typography.Title level={5}>Tài khoản nhận phụ cấp</Typography.Title>
          <Alert className="!mb-3" type="info" showIcon title="Chỉ bạn và admin xem được số tài khoản. Mỗi lần đổi đều được ghi lại (ai đổi, lúc nào) để đối soát khi chi trả." />
          <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
            <Form.Item name="bankAccount" label="Số tài khoản" rules={[{ pattern: /^[0-9 ]{4,30}$/, message: 'Chỉ gồm chữ số' }]}><Input inputMode="numeric" /></Form.Item>
            <Form.Item name="bankName" label="Ngân hàng"><Input placeholder="VD: Vietcombank - CN Huế" /></Form.Item>
          </div>
          <Button type="primary" htmlType="submit" loading={saving}>Lưu hồ sơ</Button>
        </Form>
      </Card>
      <Card title="Lịch sử thay đổi">
        <Table<ProfileLog>
          rowKey="_id"
          size="small"
          dataSource={logs}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'Chưa có thay đổi' }}
          scroll={{ x: 'max-content' }}
          columns={[
            { title: 'Thời gian', render: (_: unknown, row: ProfileLog) => formatDateTime(row.createdAt) },
            { title: 'Thông tin', render: (_: unknown, row: ProfileLog) => <span className={row.field.startsWith('bank') ? 'font-semibold' : ''}>{PROFILE_FIELD_LABEL[row.field] ?? row.field}</span> },
            { title: 'Giá trị cũ', dataIndex: 'oldValue', render: (value: string | null) => value ?? '—' },
            { title: 'Giá trị mới', dataIndex: 'newValue', render: (value: string | null) => value ?? '—' },
            { title: 'Người sửa', dataIndex: 'changedByRole', render: (value: string) => <Tag color={value === 'ADMIN' ? 'purple' : 'blue'}>{value === 'ADMIN' ? 'Admin' : 'Bạn'}</Tag> }
          ]}
        />
      </Card>
    </div>
  );
}
