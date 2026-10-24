'use client';

import { useEffect, useState } from 'react';
import { accessApi, type MyAccess } from '@/services/hlcApi';

let cache: Promise<MyAccess> | null = null;

/** Quyền của tài khoản đang đăng nhập (dùng chung, gọi API 1 lần) */
export function loadAccess(force = false) {
  if (!cache || force) cache = accessApi.mine().catch((error) => { cache = null; throw error; });
  return cache;
}

export function resetAccessCache() {
  cache = null;
}

export function useAccess() {
  const [access, setAccess] = useState<MyAccess | null>(null);
  useEffect(() => {
    let active = true;
    loadAccess().then((value) => { if (active) setAccess(value); }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  return access;
}

/** Có hành động cấp hệ thống (Admin toàn cục luôn có) */
export const can = (access: MyAccess | null, action: string) => Boolean(access?.isSuperAdmin || access?.actions?.includes(action));
