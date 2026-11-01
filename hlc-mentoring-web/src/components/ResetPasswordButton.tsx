'use client';

import { useState } from 'react';
import { Alert, App, Button, Descriptions, Input, Modal, Typography } from 'antd';
import { CopyOutlined, KeyOutlined } from '@ant-design/icons';
import { errorMessage } from '@/lib/api';
import { memberAdminApi } from '@/services/hlcApi';

type Result = Awaited<ReturnType<typeof memberAdminApi.resetPassword>>;

/**
 * Ghi đè mật khẩu cho thành viên (chỉ Admin toàn cục). Không xem được mật khẩu cũ: hệ thống tự sinh mật khẩu mới và
 * chỉ hiện MỘT LẦN để Admin chuyển cho thành viên. Phiên đăng nhập cũ của thành viên bị đăng xuất, thành viên phải đổi
 * lại mật khẩu ở lần đăng nhập kế tiếp. Phải gõ đúng mã thành viên để xác nhận (tránh bấm nhầm).
 */
export default function ResetPasswordButton({ member }: { member: { _id: string; memberCode: string; fullName: string } }) {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const matches = typed.trim().toUpperCase() === member.memberCode.toUpperCase();

  const close = () => {
    setOpen(false);
    setTyped('');
    setResult(null);
  };

  const reset = async () => {
    setSaving(true);
    try {
      setResult(await memberAdminApi.resetPassword(member._id));
      message.success(`Đã đặt lại mật khẩu cho ${member.fullName}`);
    } catch (error) {
      message.error(errorMessage(error, 'Không đặt lại được mật khẩu'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button size="small" icon={<KeyOutlined />} onClick={() => setOpen(true)}>Đặt lại mật khẩu</Button>
      <Modal
        title={result ? 'Mật khẩu mới' : `Đặt lại mật khẩu · ${member.fullName}`}
        open={open}
        onCancel={close}
        destroyOnHidden
        maskClosable={false}
        footer={result
          ? <Button type="primary" onClick={close}>Tôi đã lưu mật khẩu, đóng</Button>
          : [
            <Button key="cancel" onClick={close}>Hủy</Button>,
            <Button key="ok" type="primary" danger disabled={!matches} loading={saving} onClick={reset}>Đặt lại mật khẩu</Button>
          ]}
      >
        {result ? (
          <div className="space-y-3">
            <Alert type="warning" showIcon title="Mật khẩu chỉ hiện một lần này. Hãy sao chép và gửi riêng cho thành viên; hệ thống không lưu dạng đọc được." />
            <Descriptions size="small" column={1} bordered items={[
              { key: 'name', label: 'Thành viên', children: `${member.fullName} (${member.memberCode})` },
              { key: 'user', label: 'Tên đăng nhập', children: <Typography.Text copyable>{result.username}</Typography.Text> },
              { key: 'pass', label: 'Mật khẩu mới', children: <Typography.Text copyable={{ icon: <CopyOutlined /> }} code className="text-lg">{result.password}</Typography.Text> }
            ]} />
            <Typography.Paragraph type="secondary" className="!mb-0">Thành viên đã bị đăng xuất khỏi mọi thiết bị và sẽ phải đổi sang mật khẩu của riêng mình ở lần đăng nhập kế tiếp.</Typography.Paragraph>
          </div>
        ) : (
          <div className="space-y-3">
            <Typography.Paragraph className="!mb-0">Dùng khi thành viên quên mật khẩu. Sau khi đặt lại:</Typography.Paragraph>
            <ul className="list-disc space-y-1 pl-5">
              <li>Hệ thống tự sinh mật khẩu mới và hiện cho bạn <b>một lần</b>. Không xem được mật khẩu cũ.</li>
              <li>Mọi phiên đăng nhập hiện tại của thành viên bị <b>đăng xuất</b>.</li>
              <li>Thành viên <b>phải đổi lại mật khẩu</b> ở lần đăng nhập kế tiếp.</li>
              <li>Thao tác được ghi vào nhật ký (không ghi mật khẩu).</li>
            </ul>
            <div>
              <div className="mb-1">Gõ mã thành viên <Typography.Text code>{member.memberCode}</Typography.Text> để xác nhận:</div>
              <Input value={typed} onChange={(event) => setTyped(event.target.value)} placeholder={member.memberCode} autoComplete="off" onPressEnter={() => { if (matches && !saving) void reset(); }} />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
