'use client';

import { useEffect, useState } from 'react';
import { getSessionUser, SESSION_CHANGE_EVENT } from '@/lib/api';
import { accessApi, type MyAccess } from '@/services/hlcApi';

/** Quyền lưu tạm kèm tài khoản sở hữu: đổi tài khoản (kể cả không tải lại trang) thì không dùng lại quyền cũ */
let cache: { owner: string; value: Promise<MyAccess> } | null = null;

const ownerKey = () => {
  const user = getSessionUser();
  return user ? `${user.role}:${user.userId}` : '';
};

/** Quyền của tài khoản đang đăng nhập (dùng chung, gọi API 1 lần cho mỗi tài khoản) */
export function loadAccess(force = false) {
  const owner = ownerKey();
  if (!cache || force || cache.owner !== owner) {
    const value = accessApi.mine().catch((error) => {
      if (cache?.value === value) cache = null;
      throw error;
    });
    cache = { owner, value };
  }
  return cache.value;
}

export function resetAccessCache() {
  cache = null;
}

if (typeof window !== 'undefined') window.addEventListener(SESSION_CHANGE_EVENT, resetAccessCache);

export function useAccess() {
  const [access, setAccess] = useState<MyAccess | null>(null);
  useEffect(() => {
    let active = true;
    const refresh = (force = false) => {
      if (!getSessionUser()) {
        setAccess(null);
        return;
      }
      loadAccess(force).then((value) => { if (active) setAccess(value); }).catch(() => undefined);
    };
    refresh();
    // Đăng nhập tài khoản khác: bỏ quyền đang hiện ngay, rồi tải quyền của tài khoản mới
    const onSession = () => { setAccess(null); refresh(true); };
    const onAccess = () => refresh(true);
    window.addEventListener(SESSION_CHANGE_EVENT, onSession);
    window.addEventListener('hlc-access-change', onAccess);
    return () => {
      active = false;
      window.removeEventListener(SESSION_CHANGE_EVENT, onSession);
      window.removeEventListener('hlc-access-change', onAccess);
    };
  }, []);
  return access;
}

/** Có hành động cấp hệ thống (Admin toàn cục luôn có) */
export const can = (access: MyAccess | null, action: string) => Boolean(access?.isSuperAdmin || access?.actions?.includes(action));
