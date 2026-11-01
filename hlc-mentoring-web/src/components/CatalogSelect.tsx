'use client';

import { useEffect, useState } from 'react';
import { Select } from 'antd';
import { catalogApi, type CatalogItem } from '@/services/hlcApi';

const cache: Partial<Record<CatalogItem['type'], Promise<CatalogItem[]>>> = {};
export const loadCatalog = (type: CatalogItem['type']) => {
  if (!cache[type]) cache[type] = catalogApi.list(type).catch((error) => { delete cache[type]; throw error; });
  return cache[type]!;
};

export function useCatalog(type: CatalogItem['type']) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  useEffect(() => {
    let active = true;
    loadCatalog(type).then((list) => { if (active) setItems(list); }).catch(() => undefined);
    return () => { active = false; };
  }, [type]);
  return items;
}

export const catalogLabel = (item: CatalogItem) => (item.type === 'BANK' && item.shortName ? `${item.shortName} - ${item.name}` : item.name);

/** Ô chọn từ danh mục chung (nhóm ngành nghề: chọn nhiều; ngân hàng: chọn một), có tìm kiếm */
export default function CatalogSelect(props: {
  id?: string;
  type: CatalogItem['type'];
  multiple?: boolean;
  value?: string | string[] | null;
  onChange?: (value: string | string[] | null) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const items = useCatalog(props.type);
  return (
    <Select
      id={props.id}
      allowClear
      showSearch
      mode={props.multiple ? 'multiple' : undefined}
      disabled={props.disabled}
      value={props.value ?? (props.multiple ? [] : undefined)}
      onChange={(value: string | string[] | undefined) => props.onChange?.(value ?? (props.multiple ? [] : null))}
      placeholder={props.placeholder ?? (props.type === 'BANK' ? 'Chọn ngân hàng (gõ để tìm)' : 'Chọn nhóm ngành (gõ để tìm, chọn nhiều)')}
      optionFilterProp="label"
      maxTagCount="responsive"
      options={items.map((item) => ({ value: item.code, label: catalogLabel(item) }))}
    />
  );
}
