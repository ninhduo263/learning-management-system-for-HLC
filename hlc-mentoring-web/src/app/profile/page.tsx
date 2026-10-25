'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, App, Button, Card, Checkbox, DatePicker, Form, Input, Popconfirm, Select, Table, Tag, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import CatalogSelect, { useCatalog } from '@/components/CatalogSelect';
import ProvinceSelect, { useProvinces } from '@/components/ProvinceSelect';
import { zaloUrl } from '@/components/PhoneLink';
import { errorMessage } from '@/lib/api';
import { setUnsavedGuard } from '@/lib/unsavedGuard';
import { loadAccess } from '@/lib/useAccess';
import { formatDateTime } from '@/services/mentoringApi';
import {
  PROFILE_CHANGE_STATUS, PROFILE_FIELD_LABEL, catalogNeedsReview, passwordApi, profileApi, profileWorkflowApi, provinceNeedsReview,
  type Member, type ProfileChangeRequest, type ProfileLog
} from '@/services/hlcApi';

type Values = {
  dateOfBirth?: Dayjs | null; gender?: string | null; phone?: string | null; hidePhone?: boolean; email?: string | null;
  hometownCode?: string | null; addressCode?: string | null; majorCodes?: string[]; occupationCodes?: string[];
  bankAccount?: string | null; bankCode?: string | null; nationalId?: string | null; profileUrl?: string | null;
};
type PasswordValues = { oldPass: string; newPass: string; confirmPass: string };
const FIELDS: (keyof Values)[] = ['dateOfBirth', 'gender', 'phone', 'hidePhone', 'email', 'hometownCode', 'addressCode', 'majorCodes', 'occupationCodes', 'bankAccount', 'bankCode', 'nationalId', 'profileUrl'];
/** Thay đổi cần Admin duyệt trước khi thành chính thức */
const APPROVAL_FIELDS: (keyof Values)[] = ['bankAccount', 'bankCode', 'nationalId'];

const strongPassword = (value?: string) => !value || (value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value));
/** Giá trị so sánh (chuẩn hóa ngày, mảng, chuỗi rỗng) */
const norm = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return '';
  if (dayjs.isDayjs(value)) return value.format('YYYY-MM-DD');
  if (Array.isArray(value)) return [...value].map(String).sort().join(',');
  return String(value).trim();
};
const fromMember = (member: Member): Values => ({
  dateOfBirth: member.dateOfBirth ? dayjs(member.dateOfBirth) : null,
  gender: member.gender, phone: member.phone, hidePhone: Boolean(member.hidePhone), email: member.email,
  hometownCode: member.hometownCode, addressCode: member.addressCode,
  majorCodes: member.majorCodes ?? [], occupationCodes: member.occupationCodes ?? [],
  bankAccount: member.bankAccount, bankCode: member.bankCode ?? null, nationalId: member.nationalId ?? null, profileUrl: member.profileUrl
});
/** Giá trị gửi máy chủ / lưu bản nháp */
const toPayload = (values: Values) => ({
  ...values,
  dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') : null,
  phone: values.phone?.trim() || null,
  email: values.email?.trim() || null,
  bankAccount: values.bankAccount?.replace(/\s+/g, '') || null,
  nationalId: values.nationalId?.trim() || null
});
const fromDraft = (data: Record<string, unknown>): Values => ({
  ...(data as Values),
  dateOfBirth: data.dateOfBirth ? dayjs(String(data.dateOfBirth)) : null
});

/**
 * Hồ sơ cá nhân theo quy trình: sửa là bản nháp (chỉ mình thấy, tự lưu nháp) → nhấn Lưu: thông tin thường thành
 * chính thức ngay, số tài khoản / ngân hàng / CCCD chờ Admin duyệt → các trang khác chỉ dùng bản chính thức.
 */
export default function ProfilePage() {
  const { message } = App.useApp();
  const router = useRouter();
  const provinces = useProvinces();
  const careers = useCatalog('CAREER');
  const banks = useCatalog('BANK');
  const [member, setMember] = useState<Member | null>(null);
  const [logs, setLogs] = useState<ProfileLog[]>([]);
  const [requests, setRequests] = useState<ProfileChangeRequest[]>([]);
  const [draft, setDraft] = useState<{ data: Record<string, unknown>; updatedAt: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);
  const [mustChange, setMustChange] = useState(false);
  const [profileUrlEditable, setProfileUrlEditable] = useState(false);
  const [dirtyFields, setDirtyFields] = useState<(keyof Values)[]>([]);
  const [form] = Form.useForm<Values>();
  const zaloLink = zaloUrl(Form.useWatch('phone', form));
  const [passwordForm] = Form.useForm<PasswordValues>();
  const official = useRef<Values>({});
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const [profile, history, access, myDraft, myRequests] = await Promise.all([
        profileApi.mine(), profileApi.logs(), loadAccess(), profileWorkflowApi.draft(), profileWorkflowApi.myRequests()
      ]);
      setMember(profile);
      setLogs(history);
      setRequests(myRequests);
      setMustChange(Boolean(access.mustChangePassword));
      setProfileUrlEditable(Boolean(access.profileUrlEditable));
      official.current = fromMember(profile);
      form.setFieldsValue(official.current);
      setDirtyFields([]);
      // Quay lại hồ sơ mà còn bản nháp khác bản chính thức: nhắc tiếp tục hoặc hủy
      const pending = myDraft && FIELDS.some((field) => field in myDraft.data && norm(fromDraft(myDraft.data)[field]) !== norm(official.current[field]));
      setDraft(pending ? myDraft : null);
    } catch (error) {
      message.error(errorMessage(error, 'Không tải được hồ sơ'));
    }
  }, [form, message]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);

  const computeDirty = useCallback(() => {
    const values = form.getFieldsValue(true) as Values;
    return FIELDS.filter((field) => norm(values[field]) !== norm(official.current[field]));
  }, [form]);

  const save = useCallback(async (): Promise<boolean> => {
    try {
      await form.validateFields();
    } catch {
      message.error('Kiểm tra lại các ô đang báo lỗi trước khi lưu');
      return false;
    }
    setSaving(true);
    try {
      const values = form.getFieldsValue(true) as Values;
      const changed = computeDirty();
      const payload = Object.fromEntries(Object.entries(toPayload(values)).filter(([key]) => changed.includes(key as keyof Values)));
      if (!profileUrlEditable) delete (payload as Record<string, unknown>).profileUrl;
      const result = await profileWorkflowApi.save(payload);
      const parts = [
        result.applied.length ? `Đã lưu ${result.applied.length} thông tin thành chính thức` : '',
        result.pending ? 'Thay đổi số tài khoản / ngân hàng / CCCD đã gửi, đang chờ duyệt' : ''
      ].filter(Boolean);
      message.success(parts.join('. ') || 'Không có thay đổi');
      await load();
      return true;
    } catch (error) {
      message.error(errorMessage(error, 'Không lưu được hồ sơ'));
      return false;
    } finally {
      setSaving(false);
    }
  }, [form, message, computeDirty, profileUrlEditable, load]);

  const discard = useCallback(async () => {
    form.setFieldsValue(official.current);
    setDirtyFields([]);
    setDraft(null);
    await profileWorkflowApi.discardDraft().catch(() => undefined);
  }, [form]);

  // Cảnh báo khi rời trang trong ứng dụng / đóng tab mà còn thay đổi chưa lưu
  useEffect(() => {
    setUnsavedGuard({ dirty: () => computeDirty().length > 0, save, discard });
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (computeDirty().length) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      setUnsavedGuard(null);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [computeDirty, save, discard]);

  const onValuesChange = () => {
    const changed = computeDirty();
    setDirtyFields(changed);
    // Tự lưu bản nháp (chỉ mình thấy) sau 1 giây ngừng gõ
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      const payload = toPayload(form.getFieldsValue(true) as Values);
      if (changed.length) void profileWorkflowApi.saveDraft(payload).catch(() => undefined);
      else void profileWorkflowApi.discardDraft().catch(() => undefined);
    }, 1000);
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

  const pendingRequest = requests.find((item) => item.status === 'PENDING');
  const provinceName = (code?: string | null) => provinces.find((item) => item.code === code)?.name ?? code ?? '—';
  const careerNames = (value?: string | null) => (value ?? '').split(',').map((code) => code.trim()).filter(Boolean).map((code) => careers.find((item) => item.code === code)?.name ?? code).join(', ');
  const bankName = (code?: string | null) => banks.find((item) => item.code === code)?.shortName ?? code ?? '—';
  const display = (field: string, value: string | null) => {
    if (!value) return '—';
    if (field === 'hometownCode' || field === 'addressCode') return provinceName(value);
    if (field === 'majorCodes' || field === 'occupationCodes') return careerNames(value);
    if (field === 'bankCode') return bankName(value);
    if (field === 'hidePhone') return value === 'true' ? 'Bật ẩn số' : 'Hiện số';
    return value;
  };
  const review = member ? catalogNeedsReview(member) : { major: false, occupation: false, bank: false };

  /** Nhãn kèm dấu "chưa lưu" / "cần duyệt" */
  const label = (text: string, field: keyof Values) => (
    <span className="flex flex-wrap items-center gap-1">
      {text}
      {dirtyFields.includes(field) && <Tag color="orange" className="!m-0">Chưa lưu</Tag>}
      {APPROVAL_FIELDS.includes(field) && <Tag className="!m-0">Cần duyệt</Tag>}
    </span>
  );

  const passwordCard = (
    <Card title="Đổi mật khẩu">
      {mustChange && <Alert className="!mb-3" type="warning" showIcon title="Bạn cần đổi mật khẩu được cấp trước khi dùng các chức năng khác." />}
      <Form form={passwordForm} name="changePassword" layout="vertical" onFinish={changePassword} className="max-w-md">
        <Form.Item name="oldPass" label="Mật khẩu hiện tại" rules={[{ required: true, message: 'Nhập mật khẩu hiện tại' }]}><Input.Password autoComplete="current-password" /></Form.Item>
        <Form.Item
          name="newPass" label="Mật khẩu mới" extra="Tối thiểu 8 ký tự, gồm cả chữ và số, khác mật khẩu hiện tại." dependencies={['oldPass']}
          rules={[
            { required: true, message: 'Nhập mật khẩu mới' },
            { validator: (_, value?: string) => strongPassword(value) ? Promise.resolve() : Promise.reject(new Error('Mật khẩu mới cần tối thiểu 8 ký tự, gồm cả chữ và số')) },
            ({ getFieldValue }) => ({ validator: (_, value?: string) => !value || value !== getFieldValue('oldPass') ? Promise.resolve() : Promise.reject(new Error('Mật khẩu mới phải khác mật khẩu hiện tại')) })
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirmPass" label="Xác nhận mật khẩu mới" dependencies={['newPass']}
          rules={[
            { required: true, message: 'Nhập lại mật khẩu mới' },
            ({ getFieldValue }) => ({ validator: (_, value?: string) => !value || value === getFieldValue('newPass') ? Promise.resolve() : Promise.reject(new Error('Xác nhận mật khẩu mới không khớp')) })
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={changing} block className="sm:!w-auto">Đổi mật khẩu</Button>
      </Form>
    </Card>
  );

  const requestColumns = useMemo(() => [
    { title: 'Gửi lúc', render: (_: unknown, row: ProfileChangeRequest) => formatDateTime(row.createdAt) },
    {
      title: 'Thay đổi', render: (_: unknown, row: ProfileChangeRequest) => (
        <div className="space-y-1">
          {row.changes.filter((change) => change.field !== 'bankName').map((change) => (
            <div key={change.field} className="text-xs"><strong>{PROFILE_FIELD_LABEL[change.field] ?? change.field}:</strong> {display(change.field, change.oldValue)} → {display(change.field, change.newValue)}</div>
          ))}
        </div>
      )
    },
    {
      title: 'Trạng thái', render: (_: unknown, row: ProfileChangeRequest) => (
        <div>
          <Tag color={PROFILE_CHANGE_STATUS[row.status].color}>{PROFILE_CHANGE_STATUS[row.status].label}</Tag>
          {row.status === 'APPROVED' && row.effectivePeriodCode && <div className="text-xs text-gray-500">Ngân hàng áp dụng từ kỳ PC-{row.effectivePeriodCode}</div>}
          {row.reason && <div className="text-xs text-gray-500">{row.reason}</div>}
        </div>
      )
    },
    {
      title: '', render: (_: unknown, row: ProfileChangeRequest) => row.status === 'PENDING'
        ? <Popconfirm title="Hủy yêu cầu này?" onConfirm={async () => { try { await profileWorkflowApi.cancelRequest(row._id); await load(); } catch (error) { message.error(errorMessage(error)); } }}><Button size="small" danger>Hủy yêu cầu</Button></Popconfirm>
        : null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [careers, banks, provinces, load, message]);

  if (mustChange) return <div className="space-y-4"><Typography.Title level={3} className="!mb-0">Đổi mật khẩu lần đầu</Typography.Title>{passwordCard}</div>;

  return (
    <div className="space-y-4 pb-24">
      <Typography.Title level={3} className="!mb-0">Hồ sơ cá nhân</Typography.Title>
      {draft && (
        <Alert
          type="info"
          showIcon
          title={`Bạn còn bản nháp chưa lưu (sửa lúc ${formatDateTime(draft.updatedAt)})`}
          description="Bản nháp chỉ mình bạn thấy, chưa ảnh hưởng tới các trang khác."
          action={(
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button size="small" type="primary" onClick={() => { form.setFieldsValue(fromDraft(draft.data)); setDraft(null); onValuesChange(); }}>Tiếp tục bản nháp</Button>
              <Button size="small" danger onClick={() => void discard()}>Hủy bản nháp</Button>
            </div>
          )}
        />
      )}
      {pendingRequest && (
        <Alert type="warning" showIcon title="Đang chờ duyệt thay đổi thông tin nhạy cảm" description={`${pendingRequest.changes.filter((change) => change.field !== 'bankName').map((change) => PROFILE_FIELD_LABEL[change.field] ?? change.field).join(', ')} (gửi lúc ${formatDateTime(pendingRequest.createdAt)}). Trong lúc chờ, bảng phụ cấp vẫn dùng thông tin chính thức cũ.`} />
      )}
      <Card title={member ? `${member.fullName} · ${member.memberCode}` : 'Hồ sơ'} loading={!member}>
        {member && (provinceNeedsReview(member) || review.major || review.occupation || review.bank) && (
          <Alert className="!mb-3" type="warning" showIcon title="Một số thông tin cũ chưa khớp danh mục, hãy chọn lại" description={[
            provinceNeedsReview(member) && `quê quán / địa chỉ cũ "${[member.hometown, member.address].filter(Boolean).join(' · ')}"`,
            review.major && `ngành học cũ "${member.major}"`,
            review.occupation && `ngành nghề cũ "${member.occupation}"`,
            review.bank && `ngân hàng cũ "${member.bankName}"`
          ].filter(Boolean).join('; ')} />
        )}
        <Form form={form} name="profile" layout="vertical" onValuesChange={onValuesChange}>
          <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
            <Form.Item name="dateOfBirth" label={label('Ngày sinh', 'dateOfBirth')}><DatePicker className="w-full" format="DD/MM/YYYY" inputReadOnly /></Form.Item>
            <Form.Item name="gender" label={label('Giới tính', 'gender')}><Select allowClear options={[{ value: 'MALE', label: 'Nam' }, { value: 'FEMALE', label: 'Nữ' }, { value: 'OTHER', label: 'Khác' }]} /></Form.Item>
            <Form.Item name="phone" label={label('Số điện thoại', 'phone')} extra={zaloLink ? <span>Zalo cá nhân (tạo tự động từ số điện thoại): <a href={zaloLink} target="_blank" rel="noopener noreferrer" className="phone-zalo">{zaloLink}</a></span> : 'Nhập số điện thoại để có liên kết Zalo cá nhân.'}><Input inputMode="tel" /></Form.Item>
            <Form.Item name="email" label={label('Email', 'email')} rules={[{ type: 'email', message: 'Email không hợp lệ' }]}><Input inputMode="email" /></Form.Item>
            <Form.Item className="md:col-span-2" name="hidePhone" valuePropName="checked" extra="Khi bật, số điện thoại và liên kết Zalo chỉ hiện với bạn, người trong cặp mentoring, người cùng nhóm, Admin và các Trưởng ban. Khi tắt, mọi thành viên đều thấy. Có hiệu lực ngay khi Lưu và được ghi lịch sử.">
              <Checkbox><span className="font-semibold">{label('Ẩn số điện thoại với người ngoài cặp và nhóm của tôi', 'hidePhone')}</span></Checkbox>
            </Form.Item>
            <Form.Item name="hometownCode" label={label('Quê quán (tỉnh, thành phố)', 'hometownCode')}><ProvinceSelect /></Form.Item>
            <Form.Item name="addressCode" label={label('Địa chỉ hiện tại (tỉnh, thành phố)', 'addressCode')}><ProvinceSelect /></Form.Item>
            <Form.Item name="majorCodes" label={label('Ngành học (chọn nhiều)', 'majorCodes')}><CatalogSelect type="CAREER" multiple /></Form.Item>
            <Form.Item name="occupationCodes" label={label('Ngành nghề (chọn nhiều)', 'occupationCodes')}><CatalogSelect type="CAREER" multiple /></Form.Item>
            <Form.Item name="profileUrl" label={label('Link profile (Facebook, LinkedIn...)', 'profileUrl')} extra={profileUrlEditable ? undefined : 'Tạm thời chỉ Admin được sửa link profile.'}>
              <Input disabled={!profileUrlEditable} />
            </Form.Item>
          </div>
          <Typography.Title level={5}>Thông tin nhạy cảm (cần Admin duyệt)</Typography.Title>
          <Alert className="!mb-3" type="info" showIcon title="Số tài khoản, ngân hàng, số CCCD đổi xong phải được duyệt mới có hiệu lực" description="Trong lúc chờ duyệt, bảng phụ cấp vẫn dùng thông tin cũ. Đổi tài khoản trong khoảng từ lúc chốt kỳ đến ngày chi thì chỉ áp dụng từ kỳ sau. Mọi thay đổi đều được ghi lại." />
          <div className="grid grid-cols-1 gap-x-4 md:grid-cols-3">
            <Form.Item name="bankAccount" label={label('Số tài khoản', 'bankAccount')} rules={[{ pattern: /^[0-9 ]{4,30}$/, message: 'Chỉ gồm chữ số' }]}><Input inputMode="numeric" /></Form.Item>
            <Form.Item name="bankCode" label={label('Ngân hàng', 'bankCode')}><CatalogSelect type="BANK" /></Form.Item>
            <Form.Item name="nationalId" label={label('Số CCCD', 'nationalId')} rules={[{ pattern: /^\d{12}$/, message: 'CCCD gồm 12 chữ số' }]}><Input inputMode="numeric" maxLength={12} /></Form.Item>
          </div>
        </Form>
      </Card>

      {requests.length > 0 && (
        <Card title="Yêu cầu thay đổi thông tin nhạy cảm">
          <Table<ProfileChangeRequest> rowKey="_id" size="small" dataSource={requests} pagination={{ pageSize: 5 }} scroll={{ x: 'max-content' }} columns={requestColumns} />
        </Card>
      )}
      {passwordCard}
      <Card title="Lịch sử thay đổi (bản chính thức)">
        <Table<ProfileLog>
          rowKey="_id" size="small" dataSource={logs} pagination={{ pageSize: 10 }} locale={{ emptyText: 'Chưa có thay đổi' }} scroll={{ x: 'max-content' }}
          columns={[
            { title: 'Thời gian', render: (_: unknown, row: ProfileLog) => formatDateTime(row.createdAt) },
            { title: 'Thông tin', render: (_: unknown, row: ProfileLog) => <span className={row.field.startsWith('bank') ? 'font-semibold' : ''}>{PROFILE_FIELD_LABEL[row.field] ?? row.field}</span> },
            { title: 'Giá trị cũ', render: (_: unknown, row: ProfileLog) => display(row.field, row.oldValue) },
            { title: 'Giá trị mới', render: (_: unknown, row: ProfileLog) => display(row.field, row.newValue) },
            {
              title: 'Người sửa', render: (_: unknown, row: ProfileLog) => (
                <Tag color={row.changedByRole === 'SELF' ? 'blue' : 'purple'}>
                  {row.changedByRole === 'SELF' ? 'Bạn' : row.changedByRole === 'APPROVED' ? `Duyệt bởi ${row.changedByName ?? 'Admin'}` : `Admin${row.changedByName ? ` · ${row.changedByName}` : ''}`}
                </Tag>
              )
            }
          ]}
        />
      </Card>

      {/* Thanh lưu cố định: luôn thấy khi có thay đổi chưa lưu (cả trên điện thoại) */}
      {dirtyFields.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-orange-200 bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm"><Tag color="orange">{dirtyFields.length} thay đổi chưa lưu</Tag>{dirtyFields.some((field) => APPROVAL_FIELDS.includes(field)) && <span className="text-gray-500">Thông tin nhạy cảm sẽ chờ duyệt.</span>}</span>
            <div className="flex gap-2">
              <Popconfirm title="Bỏ mọi thay đổi chưa lưu?" onConfirm={() => void discard()}><Button className="flex-1 sm:flex-none">Bỏ thay đổi</Button></Popconfirm>
              <Button type="primary" className="flex-1 sm:flex-none" loading={saving} onClick={() => void save()}>Lưu hồ sơ</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
