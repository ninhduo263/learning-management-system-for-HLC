'use client';

import { Button, Space } from 'antd';
import type { HookAPI } from 'antd/es/modal/useModal';

/**
 * Cảnh báo quên lưu: trang có thay đổi chưa lưu đăng ký guard; menu, thanh tab, nút đăng xuất gọi confirmLeave()
 * trước khi chuyển trang. Đóng / tải lại tab trình duyệt dùng sự kiện beforeunload (trang tự gắn).
 */
export interface UnsavedGuard {
  dirty: () => boolean;
  /** Lưu; trả false nếu lưu lỗi (ở lại trang) */
  save: () => Promise<boolean>;
  discard: () => Promise<void>;
}

let current: UnsavedGuard | null = null;

export function setUnsavedGuard(guard: UnsavedGuard | null) {
  current = guard;
}

export function hasUnsavedChanges() {
  return Boolean(current?.dirty());
}

/** true = được rời trang (không có thay đổi, đã lưu hoặc đã bỏ); false = ở lại */
export function confirmLeave(modal: HookAPI): Promise<boolean> {
  const guard = current;
  if (!guard || !guard.dirty()) return Promise.resolve(true);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      instance.destroy();
      resolve(value);
    };
    const instance = modal.confirm({
      title: 'Bạn có thay đổi chưa lưu',
      content: 'Lưu trước khi rời trang, hoặc bỏ các thay đổi để quay về thông tin chính thức.',
      closable: true,
      maskClosable: true,
      onCancel: () => finish(false),
      footer: () => (
        <Space wrap className="mt-4 flex w-full justify-end">
          <Button onClick={() => finish(false)}>Ở lại</Button>
          <Button danger onClick={async () => { await guard.discard(); finish(true); }}>Bỏ thay đổi</Button>
          <Button type="primary" onClick={async () => finish(await guard.save())}>Lưu và tiếp tục</Button>
        </Space>
      )
    });
  });
}
