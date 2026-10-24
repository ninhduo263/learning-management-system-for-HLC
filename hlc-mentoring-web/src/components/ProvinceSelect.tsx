'use client';

import { useEffect, useState } from 'react';
import { Select } from 'antd';
import { provinceApi, type Province } from '@/services/hlcApi';

let cache: Promise<Province[]> | null = null;
export const loadProvinces = () => {
  if (!cache) cache = provinceApi.list().catch((error) => { cache = null; throw error; });
  return cache;
};

export function useProvinces() {
  const [items, setItems] = useState<Province[]>([]);
  useEffect(() => {
    let active = true;
    loadProvinces().then((list) => { if (active) setItems(list); }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  return items;
}

/** Ô chọn 1 tỉnh, thành phố trong danh mục 34 đơn vị sau sáp nhập (không nhập tự do) */
export default function ProvinceSelect(props: { value?: string | null; onChange?: (value: string | null) => void; placeholder?: string; disabled?: boolean }) {
  const provinces = useProvinces();
  return (
    <Select
      allowClear
      showSearch
      disabled={props.disabled}
      value={props.value ?? undefined}
      onChange={(value?: string) => props.onChange?.(value ?? null)}
      placeholder={props.placeholder ?? 'Chọn tỉnh, thành phố'}
      optionFilterProp="label"
      options={provinces.map((item) => ({ value: item.code, label: item.name }))}
    />
  );
}
