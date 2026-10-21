'use client';

import { useEffect, useState } from 'react';
import { App, DatePicker, Form, Input, Modal, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { apiJson, errorMessage } from '@/lib/api';
import { memberCrudApi, type Member } from '@/services/hlcApi';

type Values = Omit<Partial<Member>, 'dateOfBirth' | 'joinedAt'> & { dateOfBirth?: Dayjs; joinedAt?: Dayjs };

/** Sửa hồ sơ thành viên (admin) */
export default function MemberEditModal({ memberId, onClose, onSaved }: { memberId: string | null; onClose: () => void; onSaved: () => void }) {
  const { message } = App.useApp();
  const [form] = Form.useForm<Values>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!memberId) return;
    let active = true;
    apiJson<Member>(`/member/${memberId}`)
      .then((member) => {
        if (!active) return;
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
      await memberCrudApi.update(memberId, {
        fullName: values.fullName,
        memberType: values.memberType,
        status: values.status,
        phone: nullable(values.phone),
        email: nullable(values.email),
        profileUrl: nullable(values.profileUrl),
        bankAccount: nullable(values.bankAccount),
        bankName: nullable(values.bankName),
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
      <Form form={form} layout="vertical" onFinish={save}>
        <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
          <Form.Item name="memberCode" label="Mã thành viên"><Input disabled /></Form.Item>
          <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="memberType" label="Vai trò"><Select options={[{ value: 'MENTEE', label: 'Mentee' }, { value: 'MENTOR', label: 'Mentor' }]} /></Form.Item>
          <Form.Item name="status" label="Trạng thái"><Select options={[{ value: 'ACTIVE', label: 'Đang hoạt động' }, { value: 'INACTIVE', label: 'Ngừng hoạt động' }]} /></Form.Item>
          <Form.Item name="dateOfBirth" label="Ngày sinh"><DatePicker className="w-full" format="DD/MM/YYYY" /></Form.Item>
          <Form.Item name="gender" label="Giới tính"><Select allowClear options={[{ value: 'MALE', label: 'Nam' }, { value: 'FEMALE', label: 'Nữ' }, { value: 'OTHER', label: 'Khác' }]} /></Form.Item>
          <Form.Item name="phone" label="Số điện thoại"><Input /></Form.Item>
          <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Email không hợp lệ' }]}><Input /></Form.Item>
          <Form.Item name="bankAccount" label="Số tài khoản"><Input /></Form.Item>
          <Form.Item name="bankName" label="Ngân hàng"><Input /></Form.Item>
          <Form.Item name="profileUrl" label="Link profile"><Input /></Form.Item>
          <Form.Item name="joinedAt" label="Ngày tham gia"><DatePicker className="w-full" format="DD/MM/YYYY" /></Form.Item>
        </div>
        <Form.Item name="note" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
      </Form>
    </Modal>
  );
}
