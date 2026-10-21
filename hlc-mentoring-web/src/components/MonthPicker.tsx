'use client';

import { DatePicker } from 'antd';
import dayjs from 'dayjs';

/** Chọn kỳ tháng, giá trị dạng YYYY-MM */
export default function MonthPicker({ value, onChange, allowClear = false }: { value?: string; onChange: (value: string) => void; allowClear?: boolean }) {
  return (
    <DatePicker
      picker="month"
      format="MM/YYYY"
      allowClear={allowClear}
      inputReadOnly
      value={value ? dayjs(`${value}-01`) : null}
      onChange={(date) => onChange(date ? date.format('YYYY-MM') : '')}
    />
  );
}

/** Kỳ tháng hiện tại theo ngày (có thể là ngày giả lập) */
export const currentPeriodCode = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit' }).format(date).slice(0, 7);
