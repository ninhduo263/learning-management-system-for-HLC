'use client';

import { useState } from 'react';
import { Grid, Select, Tabs, type TabsProps } from 'antd';

type Item = NonNullable<TabsProps['items']>[number];

/**
 * Tabs nhiều mục: trên điện thoại thanh tab bị khuất, chạm vào tab ở mép chỉ cuộn thanh. Màn hình nhỏ thay thanh tab
 * bằng ô chọn mục (dễ chạm, thấy hết các mục); màn hình lớn giữ thanh tab.
 */
export default function ResponsiveTabs({ items, defaultActiveKey, ...rest }: TabsProps & { items: Item[] }) {
  const screens = Grid.useBreakpoint();
  const [active, setActive] = useState<string>(defaultActiveKey ?? String(items[0]?.key ?? ''));
  const current = items.some((item) => item.key === active) ? active : String(items[0]?.key ?? '');
  const labelText = (item: Item) => (typeof item.label === 'string' ? item.label : String(item.key));
  return (
    <Tabs
      {...rest}
      items={items}
      activeKey={current}
      onChange={(key) => { setActive(key); rest.onChange?.(key); }}
      renderTabBar={screens.md ? undefined : () => (
        <Select
          className="!mb-4 w-full"
          size="large"
          value={current}
          onChange={(key: string) => { setActive(key); rest.onChange?.(key); }}
          options={items.map((item) => ({ value: String(item.key), label: labelText(item) }))}
          aria-label="Chọn mục"
        />
      )}
    />
  );
}
