'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, App, Button, Card, DatePicker, Form, Input, Select, Table, Tag, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import ProvinceSelect, { useProvinces } from '@/components/ProvinceSelect';
import { errorMessage } from '@/lib/api';
import { loadAccess } from '@/lib/useAccess';
import { formatDateTime } from '@/services/mentoringApi';
import { PROFILE_FIELD_LABEL, passwordApi, profileApi, provinceNeedsReview, type Member, type ProfileLog } from '@/services/hlcApi';

type Values = Omit<Partial<Member>, 'dateOfBirth'> & { dateOfBirth?: Dayjs };
type PasswordValues = { oldPass: string; newPass: string; confirmPass: string };

/** Mật khẩu tối thiểu 8 ký tự, có cả chữ và số (giống quy tắc máy chủ) */
const strongPassword = (value?: string) => !value || (value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value));

/**
 * Mentor / mentee tự cập nhật hồ sơ (có lịch sử thay đổi), đổi mật khẩu. Quê quán và địa chỉ chọn từ danh mục
 * 34 tỉnh, thành phố. Link profile tạm thời chỉ Admin sửa.
 */
export default function ProfilePage() {
  const { message } = App.useApp();
  const router = useRouter();
  const provinces = useProvinces();
  const [member, setMember] = useState<Member | null>(null);
  const [logs, setLogs] = useState<ProfileLog[]>([]);
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);
  const [mustChange, setMustChange] = useState(false);
  const [profileUrlEditable, setProfileUrlEditable] = useState(false);
  const [form] = Form.useForm<Values>();
  const [passwordForm] = Form.useForm<PasswordValues>();

  const load = useCallback(async () => {
    try {
      const [profile, history, access] = await Promise.all([profileApi.mine(), profileApi.logs(), loadAccess()]);
      setMember(profile);
      setLogs(history);
      setMustChange(Boolean(access.mustChangePassword));
      setProfileUrlEditable(Boolean(access.profileUrlEditable));
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
        hometownCode: values.hometownCode ?? null,
        addressCode: values.addressCode ?? null,
        major: clean(values.major),
        occupation: clean(values.occupation),
        ...(profileUrlEditable && { profileUrl: clean(values.profileUrl) }),
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

  const changePassword = async (values: PasswordValues) => {
    setChanging(true);
    try {
      await passwordApi.change(values);
      message.success('Đổi mật khẩu thành công. Lần đăng nhập sau dùng mật khẩu mới.');
      passwordForm.resetFields();
      const access = await loadAccess(true);
      setMustChange(Boolean(access.mustChangePassword));
      window.dispatchEvent(new Event('hlc-access-change'));
      if (window.location.search.includes('doiMatKhau')) router.push('/');
    } catch (error) {
      message.error(errorMessage(error, 'Không đổi được mật khẩu'));
    } finally {
      setChanging(false);
    }
  };

  const provinceName = (code?: string | null) => provinces.find((item) => item.code === code)?.name ?? code ?? '—';
  const display = (row: ProfileLog, value: string | null) =>
    value && (row.field === 'hometownCode' || row.field === 'addressCode') ? provinceName(value) : value ?? '—';

  const passwordCard = (
    <Card title="Đổi mật khẩu">
      {mustChange && <Alert className="!mb-3" type="warning" showIcon title="Bạn cần đổi mật khẩu được cấp trước khi dùng các chức năng khác." />}
      <Form form={passwordForm} layout="vertical" onFinish={changePassword} className="max-w-md">
        <Form.Item name="oldPass" label="Mật khẩu hiện tại" rules={[{ required: true, message: 'Nhập mật khẩu hiện tại' }]}><Input.Password autoComplete="current-password" /></Form.Item>
        <Form.Item
          name="newPass"
          label="Mật khẩu mới"
          extra="Tối thiểu 8 ký tự, gồm cả chữ và số, khác mật khẩu hiện tại."
          dependencies={['oldPass']}
          rules={[
            { required: true, message: 'Nhập mật khẩu mới' },
            { validator: (_, value?: string) => strongPassword(value) ? Promise.resolve() : Promise.reject(new Error('Mật khẩu mới cần tối thiểu 8 ký tự, gồm cả chữ và số')) },
            ({ getFieldValue }) => ({ validator: (_, value?: string) => !value || value !== getFieldValue('oldPass') ? Promise.resolve() : Promise.reject(new Error('Mật khẩu mới phải khác mật khẩu hiện tại')) })
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirmPass"
          label="Xác nhận mật khẩu mới"
          dependencies={['newPass']}
          rules={[
            { required: true, message: 'Nhập lại mật khẩu mới' },
            ({ getFieldValue }) => ({ validator: (_, value?: string) => !value || value === getFieldValue('newPass') ? Promise.resolve() : Promise.reject(new Error('Xác nhận mật khẩu mới không khớp')) })
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={changing}>Đổi mật khẩu</Button>
      </Form>
    </Card>
  );

  if (mustChange) return <div className="space-y-4"><Typography.Title level={3} className="!mb-0">Đổi mật khẩu lần đầu</Typography.Title>{passwordCard}</div>;

  return (
    <div className="space-y-4">
      <Typography.Title level={3} className="!mb-0">Hồ sơ cá nhân</Typography.Title>
      <Card title={member ? `${member.fullName} · ${member.memberCode}` : 'Hồ sơ'} loading={!member}>
        {member && provinceNeedsReview(member) && (
          <Alert className="!mb-3" type="warning" showIcon title="Quê quán hoặc địa chỉ cũ chưa khớp danh mục tỉnh, thành phố" description={`Thông tin đã nhập trước đây: ${[member.hometown && `quê quán "${member.hometown}"`, member.address && `địa chỉ "${member.address}"`].filter(Boolean).join(', ')}. Hãy chọn lại tỉnh, thành phố bên dưới.`} />
        )}
        <Form form={form} layout="vertical" onFinish={save}>
          <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
            <Form.Item name="dateOfBirth" label="Ngày sinh"><DatePicker className="w-full" format="DD/MM/YYYY" /></Form.Item>
            <Form.Item name="gender" label="Giới tính"><Select allowClear options={[{ value: 'MALE', label: 'Nam' }, { value: 'FEMALE', label: 'Nữ' }, { value: 'OTHER', label: 'Khác' }]} /></Form.Item>
            <Form.Item name="phone" label="Số điện thoại"><Input /></Form.Item>
            <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Email không hợp lệ' }]}><Input /></Form.Item>
            <Form.Item name="hometownCode" label="Quê quán (tỉnh, thành phố)"><ProvinceSelect /></Form.Item>
            <Form.Item name="addressCode" label="Địa chỉ hiện tại (tỉnh, thành phố)"><ProvinceSelect /></Form.Item>
            <Form.Item name="major" label="Ngành học"><Input placeholder="VD: Công nghệ thông tin" /></Form.Item>
            <Form.Item name="occupation" label="Ngành nghề / lĩnh vực công việc"><Input placeholder="VD: Kỹ sư phần mềm, Kế toán..." /></Form.Item>
            <Form.Item name="profileUrl" label="Link profile (Facebook, LinkedIn...)" extra={profileUrlEditable ? undefined : 'Tạm thời chỉ Admin được sửa link profile. Cần đổi, hãy liên hệ Admin.'}>
              <Input disabled={!profileUrlEditable} />
            </Form.Item>
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
      {passwordCard}
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
            { title: 'Giá trị cũ', render: (_: unknown, row: ProfileLog) => display(row, row.oldValue) },
            { title: 'Giá trị mới', render: (_: unknown, row: ProfileLog) => display(row, row.newValue) },
            { title: 'Người sửa', render: (_: unknown, row: ProfileLog) => <Tag color={row.changedByRole === 'ADMIN' ? 'purple' : 'blue'}>{row.changedByRole === 'ADMIN' ? `Admin${row.changedByName ? ` · ${row.changedByName}` : ''}` : 'Bạn'}</Tag> }
          ]}
        />
      </Card>
    </div>
  );
}
