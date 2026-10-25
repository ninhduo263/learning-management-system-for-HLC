'use client';

import { useEffect, useState } from 'react';
import { Alert, App, Button, DatePicker, Descriptions, Form, Input, Modal, Select, Table, Tag, Typography } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import ProvinceSelect from '@/components/ProvinceSelect';
import CatalogSelect from '@/components/CatalogSelect';
import { errorMessage } from '@/lib/api';
import { memberAdminApi, memberDirectoryApi, type DuplicateMember, type NewMemberInput, type NextMemberCode } from '@/services/hlcApi';

type Values = Omit<NewMemberInput, 'dateOfBirth'> & { dateOfBirth: Dayjs };
type Created = Awaited<ReturnType<typeof memberAdminApi.create>>;

/**
 * Admin toàn cục thêm thành viên mới (MTE, MTO): mã do hệ thống sinh, tạo tài khoản đăng nhập (tên đăng nhập = mã)
 * và mật khẩu khởi tạo hiển thị 1 lần. Trùng họ tên + ngày sinh: cảnh báo để đối chiếu; trùng CCCD: chặn.
 */
export default function AddMemberModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { message } = App.useApp();
  const [form] = Form.useForm<Values>();
  const memberType = Form.useWatch('memberType', form);
  const bankAccount = Form.useWatch('bankAccount', form);
  const [next, setNext] = useState<NextMemberCode | null>(null);
  const [groups, setGroups] = useState<{ _id: string; name: string; groupKind: string }[]>([]);
  const [duplicates, setDuplicates] = useState<{ values: Values; rows: DuplicateMember[] } | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    memberDirectoryApi.groups().then((groupList) => {
      if (!active) return;
      setGroups(groupList);
    }).catch((error) => message.error(errorMessage(error)));
    return () => { active = false; };
  }, [open, message]);

  useEffect(() => {
    if (!open || !memberType) return;
    let active = true;
    memberAdminApi.nextCode(memberType).then((value) => { if (active) setNext(value); }).catch((error) => { if (active) { setNext(null); message.error(errorMessage(error)); } });
    return () => { active = false; };
  }, [open, memberType, message]);

  const body = (values: Values, confirmDuplicate = false): NewMemberInput => ({
    ...values,
    fullName: values.fullName.trim(),
    dateOfBirth: values.dateOfBirth.format('YYYY-MM-DD'),
    phone: values.phone.trim(),
    email: values.email.trim(),
    nationalId: values.nationalId?.trim() || undefined,
    bankAccount: values.bankAccount?.replace(/\s+/g, '') || undefined,
    bankCode: values.bankAccount ? values.bankCode : undefined,
    confirmDuplicate
  });

  const create = async (values: Values, confirmDuplicate: boolean) => {
    setSaving(true);
    try {
      const result = await memberAdminApi.create(body(values, confirmDuplicate));
      setDuplicates(null);
      setCreated(result);
      onCreated();
    } catch (error) {
      message.error(errorMessage(error, 'Không thêm được thành viên'));
    } finally {
      setSaving(false);
    }
  };

  const submit = async (values: Values) => {
    setSaving(true);
    try {
      // Kiểm tra trước: trùng CCCD bị chặn ngay (lỗi), trùng họ tên + ngày sinh thì cảnh báo để đối chiếu
      const check = await memberAdminApi.precheck(body(values));
      if (check.duplicates.length) {
        setDuplicates({ values, rows: check.duplicates });
        return;
      }
      await create(values, false);
    } catch (error) {
      message.error(errorMessage(error, 'Không thêm được thành viên'));
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    form.resetFields();
    setNext(null);
    setCreated(null);
    setDuplicates(null);
    onClose();
  };

  const groupOptions = groups
    .filter((group) => (memberType === 'MENTOR' ? group.groupKind === 'FUND' : group.groupKind !== 'FUND'))
    .map((group) => ({ value: group._id, label: group.name }));

  return (
    <>
      <Modal title="Thêm thành viên mới" open={open && !created} onCancel={close} onOk={() => form.submit()} okText="Tạo thành viên và tài khoản" confirmLoading={saving} width={760} destroyOnHidden>
        <Form form={form} name="addMember" layout="vertical" onFinish={submit} initialValues={{ memberType: 'MENTEE' }}>
          <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
            <Form.Item name="memberType" label="Loại thành viên (để sinh mã)" rules={[{ required: true, message: 'Chọn loại thành viên' }]}>
              <Select options={[{ value: 'MENTEE', label: 'MTE (Mentee)' }, { value: 'MENTOR', label: 'MTO (Mentor)' }]} onChange={() => form.setFieldValue('groupId', undefined)} />
            </Form.Item>
            <Form.Item label="Mã sẽ cấp (hệ thống tự sinh)">
              <Input value={next?.code ?? ''} disabled />
            </Form.Item>
          </div>
          {next?.warning && <Alert className="!mb-3" type="warning" showIcon title="Cảnh báo cách sinh mã" description={next.warning} />}
          <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
            <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true, whitespace: true, message: 'Nhập họ và tên' }]}><Input /></Form.Item>
            <Form.Item name="gender" label="Giới tính" rules={[{ required: true, message: 'Chọn giới tính' }]}><Select options={[{ value: 'MALE', label: 'Nam' }, { value: 'FEMALE', label: 'Nữ' }, { value: 'OTHER', label: 'Khác' }]} /></Form.Item>
            <Form.Item name="dateOfBirth" label="Ngày sinh" rules={[{ required: true, message: 'Chọn ngày sinh' }]}><DatePicker className="w-full" format="DD/MM/YYYY" /></Form.Item>
            <Form.Item name="groupId" label={memberType === 'MENTOR' ? 'Nhóm HLC Fund (tùy chọn)' : 'Nhóm MTE (bắt buộc)'} rules={memberType === 'MENTOR' ? [] : [{ required: true, message: 'Thành viên MTE phải thuộc một nhóm' }]}>
              <Select allowClear options={groupOptions} placeholder={groupOptions.length ? 'Chọn nhóm' : 'Chưa có nhóm: hãy tạo nhóm trước'} />
            </Form.Item>
            <Form.Item name="hometownCode" label="Quê quán" rules={[{ required: true, message: 'Chọn quê quán' }]}><ProvinceSelect /></Form.Item>
            <Form.Item name="addressCode" label="Địa chỉ (tỉnh, thành phố)" rules={[{ required: true, message: 'Chọn địa chỉ' }]}><ProvinceSelect /></Form.Item>
            <Form.Item name="phone" label="Số điện thoại" rules={[{ required: true, message: 'Nhập số điện thoại' }, { pattern: /^(\+84|0)\d{9,10}$/, message: 'Số điện thoại không hợp lệ' }]}><Input inputMode="tel" /></Form.Item>
            <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Nhập email' }, { type: 'email', message: 'Email không hợp lệ' }]}><Input /></Form.Item>
            <Form.Item name="majorCodes" label="Ngành học (tùy chọn, chọn nhiều)"><CatalogSelect type="CAREER" multiple /></Form.Item>
            <Form.Item name="occupationCodes" label="Ngành nghề (tùy chọn, chọn nhiều)"><CatalogSelect type="CAREER" multiple /></Form.Item>
          </div>
          <Typography.Title level={5}>Thông tin tùy chọn (dữ liệu nhạy cảm)</Typography.Title>
          <Typography.Paragraph type="secondary" className="text-xs">Số CCCD và số tài khoản chỉ Admin toàn cục và chính chủ xem được; việc xem, sửa, xuất file đều ghi nhật ký. Số CCCD trùng với hồ sơ đã có sẽ bị chặn.</Typography.Paragraph>
          <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-3">
            <Form.Item name="nationalId" label="Số CCCD" rules={[{ pattern: /^\d{12}$/, message: 'CCCD gồm 12 chữ số' }]}><Input inputMode="numeric" maxLength={12} /></Form.Item>
            <Form.Item name="bankAccount" label="Số tài khoản" rules={[{ pattern: /^[0-9 ]{4,30}$/, message: 'Chỉ gồm chữ số' }]}><Input inputMode="numeric" /></Form.Item>
            <Form.Item name="bankCode" label="Ngân hàng" rules={bankAccount ? [{ required: true, message: 'Chọn ngân hàng' }] : []}>
              <CatalogSelect type="BANK" disabled={!bankAccount} />
            </Form.Item>
          </div>
          <Typography.Text type="secondary" className="text-xs">Link profile và các thông tin khác bổ sung sau ở “Sửa hồ sơ”.</Typography.Text>
        </Form>
      </Modal>

      <Modal title="Có hồ sơ trùng họ tên và ngày sinh" open={Boolean(duplicates)} onCancel={() => setDuplicates(null)} width={760} destroyOnHidden
        footer={[
          <Button key="cancel" onClick={() => setDuplicates(null)}>Hủy, không tạo</Button>,
          <Button key="ok" type="primary" danger loading={saving} onClick={() => duplicates && create(duplicates.values, true)}>Vẫn tạo hồ sơ mới</Button>
        ]}>
        <Alert className="!mb-3" type="warning" showIcon title="Có thể là cùng một người" description="Đối chiếu hồ sơ đã có (kể cả hồ sơ ngừng hoạt động) trước khi quyết định. Hai người khác nhau có thể trùng họ tên và ngày sinh." />
        <Table<DuplicateMember> rowKey="_id" size="small" pagination={false} dataSource={duplicates?.rows ?? []} columns={[
          { title: 'Mã', dataIndex: 'memberCode' },
          { title: 'Họ tên', dataIndex: 'fullName' },
          { title: 'Loại', dataIndex: 'memberType', render: (value: string) => value === 'MENTOR' ? 'MTO' : 'MTE' },
          { title: 'Trạng thái', dataIndex: 'status', render: (value: string) => value === 'INACTIVE' ? <Tag>Ngừng hoạt động</Tag> : <Tag color="green">Đang hoạt động</Tag> },
          { title: 'Liên hệ', render: (_: unknown, row: DuplicateMember) => [row.phone, row.email].filter(Boolean).join(' · ') || '—' }
        ]} />
      </Modal>

      <Modal title="Đã thêm thành viên" open={Boolean(created)} onCancel={close} footer={<Button type="primary" onClick={close}>Đã lưu thông tin đăng nhập</Button>} destroyOnHidden>
        {created && (
          <div className="space-y-3">
            <Alert type="warning" showIcon title="Mật khẩu khởi tạo chỉ hiển thị lần này" description="Hệ thống chỉ lưu mã băm, không xem lại được. Hãy gửi cho thành viên qua kênh riêng." />
            {created.codeWarning && <Alert type="info" showIcon title="Mã được cấp theo phương án số lớn nhất + 1" description={created.codeWarning} />}
            <Descriptions bordered size="small" column={1} items={[
              { key: 'code', label: 'Mã thành viên', children: <strong>{created.member.memberCode}</strong> },
              { key: 'name', label: 'Họ tên', children: created.member.fullName },
              { key: 'group', label: 'Nhóm', children: created.group?.name ?? '—' },
              { key: 'user', label: 'Tên đăng nhập', children: <Typography.Text copyable>{created.account.username}</Typography.Text> },
              { key: 'pass', label: 'Mật khẩu khởi tạo', children: <Typography.Text copyable={{ icon: <CopyOutlined /> }} code>{created.account.password}</Typography.Text> }
            ]} />
          </div>
        )}
      </Modal>
    </>
  );
}
