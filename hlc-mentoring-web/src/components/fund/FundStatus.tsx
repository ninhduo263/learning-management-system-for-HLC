'use client';

import { useState } from 'react';
import { Button, Image } from 'antd';
import { CheckCircleFilled, ClockCircleOutlined, PictureOutlined } from '@ant-design/icons';
import { FUND_STATUS_LABEL, formatDate, type ContributionView, type FileView, type FundStatus, type WeekStatus } from '@/services/hlcApi';

type WeekRange = { weekKey: string; from: string; to: string };
export const weekLabel = (week: WeekRange) => `Tuần ${formatDate(week.from).slice(0, 5)}–${formatDate(week.to).slice(0, 5)}`;
/** Kỳ của một khoản: tuần chứa ngày đóng (kèm "đóng đến" nếu đóng trước nhiều tuần) */
export const periodOf = (row: Pick<ContributionView, 'contributionDate' | 'coverUntil'>, weeks: WeekRange[]) => {
  const day = row.contributionDate.slice(0, 10);
  const week = weeks.find((item) => day >= item.from.slice(0, 10) && day <= item.to.slice(0, 10));
  const base = week ? weekLabel(week) : `Ngày ${formatDate(row.contributionDate)}`;
  return row.coverUntil ? `${base}, đóng đến ${formatDate(row.coverUntil)}` : base;
};

/**
 * Trạng thái khoản đóng góp HLC Fund, dùng thống nhất ở bảng, dashboard và báo cáo:
 * - Đã ghi nhận: nền xanh lá, chữ navy, dấu tích;
 * - Đang chờ xác nhận: nền vàng, chữ navy, đồng hồ;
 * - Chưa có khoản: dấu gạch ngang trung tính (không nhãn, không màu cảnh báo).
 * `detail`: ở chi tiết từng khoản, khoản trả lại để bổ sung hiện chữ trung tính "Chưa ghi nhận".
 */
export function FundStatusTag({ status, detail = false, large = false }: { status: FundStatus | WeekStatus; detail?: boolean; large?: boolean }) {
  const size = large ? ' fund-status-lg' : '';
  if (status === 'DONE') return <span className={`fund-status fund-status-done${size}`}><CheckCircleFilled aria-hidden />{FUND_STATUS_LABEL.DONE}</span>;
  if (status === 'PENDING') return <span className={`fund-status fund-status-pending${size}`}><ClockCircleOutlined aria-hidden />{FUND_STATUS_LABEL.PENDING}</span>;
  if (status === 'NOT_DONE' && detail) return <span className={`fund-status fund-status-neutral${size}`}>{FUND_STATUS_LABEL.NOT_DONE}</span>;
  return <span className="fund-status-empty" aria-label="Chưa có khoản đóng góp">—</span>;
}

/** Nút chữ rõ "Xem minh chứng": mở ảnh cỡ lớn, phóng to / xoay / chuyển ảnh được; file không phải ảnh mở tab mới */
export function EvidenceButton({ files, size = 'middle' }: { files: FileView[]; size?: 'small' | 'middle' | 'large' }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(0);
  if (!files?.length) return <span className="fund-status-empty" aria-label="Chưa có ảnh">—</span>;
  const images = files.filter((file) => file.mimeType?.startsWith('image/'));
  const others = files.filter((file) => !file.mimeType?.startsWith('image/'));
  return (
    <div className="flex flex-wrap items-center gap-2">
      {images.length > 0 && (
        <>
          <Button size={size} icon={<PictureOutlined />} onClick={() => { setCurrent(0); setOpen(true); }}>Xem minh chứng</Button>
          {images.length > 1 && <span className="fund-sub">{images.length} ảnh</span>}
          <Image.PreviewGroup
            items={images.map((file) => ({ src: file.url, alt: file.fileName }))}
            preview={{ open, current, onOpenChange: (value) => setOpen(value), onChange: (index) => setCurrent(index) }}
          />
        </>
      )}
      {others.map((file) => <a key={file._id} href={file.url} target="_blank" rel="noreferrer" className="font-semibold underline">{file.fileName || 'Mở tệp'}</a>)}
    </div>
  );
}
