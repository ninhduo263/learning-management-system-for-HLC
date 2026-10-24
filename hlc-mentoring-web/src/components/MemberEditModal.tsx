'use client';

import { useEffect, useState } from 'react';
import { Alert, App, Button, DatePicker, Form, Input, Modal, Select, Table, Tabs, Tag } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { apiJson, errorMessage } from '@/lib/api';
import { formatDateTime } from '@/services/mentoringApi';
import { PROFILE_FIELD_LABEL, memberAdminApi, profileApi, provinceNeedsReview, type Member, type ProfileLog } from '@/services/hlcApi';
import ProvinceSelect, { useProvinces } from '@/components/ProvinceSelect';

type Values = Omit<Partial<Member>, 'dateOfBirth' | 'joinedAt'> & { dateOfBirth?: Dayjs; joinedAt?: Dayjs };

/** Sửa hồ sơ thành viên (admin) */
export default function MemberEditModal({ memberId, onClose, onSaved }: { memberId: string | null; onClose: () => void; onSaved: () => void }) {
  const { message } = App.useApp();
  const [form] = Form.useForm<Values>();
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState<ProfileLog[]>([]);
  const [legacy, setLegacy] = useState<Member | null>(null);
  const [revealed, setRevealed] = useState(false);
  /** Xem đầy đủ CCCD / số tài khoản: chỉ Admin toàn cục, máy chủ ghi nhật ký */
  const reveal = async () => {
    if (!memberId) return;
    try {
      const data = await memberAdminApi.sensitive(memberId);
      form.setFieldsValue({ bankAccount: data.bankAccount, nationalId: data.nationalId, bankName: data.bankName });
      setRevealed(true);
    } catch (error) {
      message.error(errorMessage(error));
    }
  };
  const provinces = useProvinces();
  const provinceName = (code?: string | null) => provinces.find((item) => item.code === code)?.name ?? code ?? '—';
  const display = (row: ProfileLog, value: string | null) =>
    value && (row.field === 'hometownCode' || row.field === 'addressCode') ? provinceName(value) : value ?? '—';

  useEffect(() => {
    if (!memberId) return;
    let active = true;
    profileApi.adminLogs(memberId).then((rows) => { if (active) setLogs(rows); }).catch(() => undefined);
    apiJson<Member>(`/member/${memberId}`)
      .then((member) => {
        if (!active) return;
        setLegacy(member);
        setRevealed(false);
        form.setFieldsValue({
          ...member,
          dateOfBirth: member.dateOfBirth ? dayjs(member.dateOfBirth) : undefined,
          joinedAt: member.joinedAt ? dayjs(member.joinedAt) : undefined
        });
      })
      .catch((error) => message.error(errorMessage(error)));
    return () => { active = false; };
  }, [memberId, form, message]);

  const save = async (values: Values) => {
    if (!memberId) return;
    setSaving(true);
    try {
      const nullable = (value?: string | null) => (value && value.trim() ? value.trim() : null);
      await profileApi.adminUpdate(memberId, {
        fullName: values.fullName,
        memberType: values.memberType,
        status: values.status,
        phone: nullable(values.phone),
        email: nullable(values.email),
        profileUrl: nullable(values.profileUrl),
        // Chưa bấm "Hiện" thì không gửi dữ liệu nhạy cảm (giá trị đang bị che)
        ...(revealed && { bankAccount: nullable(values.bankAccount), nationalId: nullable(values.nationalId) }),
        bankName: nullable(values.bankName),
        hometownCode: values.hometownCode ?? null,
        addressCode: values.addressCode ?? null,
        major: nullable(values.major),
        occupation: nullable(values.occupation),
        gender: values.gender ?? null,
        note: nullable(values.note),
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') : null,
        joinedAt: values.joinedAt ? values.joinedAt.format('YYYY-MM-DD') : null
      });
      message.success('Đã lưu hồ sơ');
      onSaved();
      onClose();
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Sửa hồ sơ thành viên" open={Boolean(memberId)} onCancel={onClose} onOk={() => form.submit()} confirmLoading={saving} width={720} destroyOnHidden forceRender>
      <Tabs items={[
        {
          key: 'info',
          label: 'Thông tin',
          forceRender: true,
          children: (
          <Form form={form} name="editMember" layout="vertical" onFinish={save}>
            {legacy && provinceNeedsReview(legacy) && (
              <Alert className="!mb-3" type="warning" showIcon title="Cần chọn lại tỉnh, thành phố" description={`Dữ liệu cũ chưa quy đổi được: ${[legacy.hometown && `quê quán "${legacy.hometown}"`, legacy.address && `địa chỉ "${legacy.address}"`].filter(Boolean).join(', ')}.`} />
            )}
            <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
              <Form.Item name="memberCode" label="Mã thành viên"><Input disabled /></Form.Item>
              <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item name="memberType" label="Vai trò"><Select options={[{ value: 'MENTEE', label: 'Mentee' }, { value: 'MENTOR', label: 'Mentor' }]} /></Form.Item>
              <Form.Item name="status" label="Trạng thái"><Select options={[{ value: 'ACTIVE', label: 'Đang hoạt động' }, { value: 'INACTIVE', label: 'Ngừng hoạt động' }]} /></Form.Item>
              <Form.Item name="dateOfBirth" label="Ngày sinh"><DatePicker className="w-full" format="DD/MM/YYYY" /></Form.Item>
              <Form.Item name="gender" label="Giới tính"><Select allowClear options={[{ value: 'MALE', label: 'Nam' }, { value: 'FEMALE', label: 'Nữ' }, { value: 'OTHER', label: 'Khác' }]} /></Form.Item>
              <Form.Item name="phone" label="Số điện thoại"><Input /></Form.Item>
              <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Email không hợp lệ' }]}><Input /></Form.Item>
              <Form.Item name="bankAccount" label="Số tài khoản" extra={revealed ? 'Đã hiện đầy đủ (có ghi nhật ký)' : <span>Đang che bớt. <Button size="small" type="link" className="!px-0" onClick={reveal}>Hiện CCCD và số tài khoản</Button></span>}>
                <Input disabled={!revealed} />
              </Form.Item>
              <Form.Item name="bankName" label="Ngân hàng"><Input /></Form.Item>
              <Form.Item name="nationalId" label="Số CCCD" rules={revealed ? [{ pattern: /^\d{12}$/, message: 'CCCD gồm 12 chữ số' }] : []}>
                <Input disabled={!revealed} />
              </Form.Item>
              <Form.Item name="hometownCode" label="Quê quán (tỉnh, thành phố)"><ProvinceSelect /></Form.Item>
              <Form.Item name="addressCode" label="Địa chỉ (tỉnh, thành phố)"><ProvinceSelect /></Form.Item>
              <Form.Item name="major" label="Ngành học"><Input /></Form.Item>
              <Form.Item name="occupation" label="Ngành nghề"><Input /></Form.Item>
              <Form.Item name="profileUrl" label="Link profile" extra="Tạm thời chỉ Admin sửa; mọi thay đổi được ghi nhật ký."><Input /></Form.Item>
              <Form.Item name="joinedAt" label="Ngày tham gia"><DatePicker className="w-full" format="DD/MM/YYYY" /></Form.Item>
            </div>
            <Form.Item name="note" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
          </Form>
          )
        },
        {
          key: 'logs',
          label: `Lịch sử thay đổi (${logs.length})`,
          children: (
            <Table<ProfileLog> rowKey="_id" size="small" dataSource={logs} pagination={{ pageSize: 8 }} scroll={{ x: 'max-content' }} locale={{ emptyText: 'Chưa có thay đổi' }} columns={[
              { title: 'Thời gian', render: (_: unknown, row: ProfileLog) => formatDateTime(row.createdAt) },
              { title: 'Thông tin', render: (_: unknown, row: ProfileLog) => <span className={row.field.startsWith('bank') ? 'font-semibold text-red-600' : ''}>{PROFILE_FIELD_LABEL[row.field] ?? row.field}</span> },
              { title: 'Cũ', render: (_: unknown, row: ProfileLog) => display(row, row.oldValue) },
              { title: 'Mới', render: (_: unknown, row: ProfileLog) => display(row, row.newValue) },
              { title: 'Người sửa', render: (_: unknown, row: ProfileLog) => <Tag color={row.changedByRole === 'ADMIN' ? 'purple' : 'blue'}>{row.changedByRole === 'ADMIN' ? 'Admin' : 'Thành viên'}{row.changedByName ? ` · ${row.changedByName}` : ''}</Tag> }
            ]} />
          )
        }
      ]} />
    </Modal>
  );
}
