'use client';

import { LockOutlined } from '@ant-design/icons';

/** Chuẩn hóa số để ghép liên kết Zalo: bỏ khoảng trắng / dấu chấm / gạch, +84 đổi về 0, GIỮ số 0 đầu */
export function zaloNumber(phone?: string | null) {
  let digits = (phone ?? '').replace(/[^\d+]/g, '');
  if (digits.startsWith('+84')) digits = `0${digits.slice(3)}`;
  else if (digits.startsWith('84') && digits.length === 11) digits = `0${digits.slice(2)}`;
  digits = digits.replace(/\D/g, '');
  return digits.length >= 9 ? digits : null;
}

/** Liên kết Zalo tạo tự động từ số điện thoại liên hệ, ví dụ 0912345678 -> https://zalo.me/0912345678 */
export const zaloUrl = (phone?: string | null) => {
  const number = zaloNumber(phone);
  return number ? `https://zalo.me/${number}` : null;
};

/**
 * Hiển thị số điện thoại; bấm vào số thì mở Zalo ở tab mới. Không có số: để trống. Số bị chủ số ẩn (máy chủ không trả
 * số cho người ngoài cặp / nhóm): hiện dấu ẩn.
 */
export default function PhoneLink({ phone, hidden, empty = '—', hiddenTitle = 'Thành viên đã ẩn số điện thoại với người ngoài cặp và nhóm' }: { phone?: string | null; hidden?: boolean; empty?: string; hiddenTitle?: string }) {
  if (!phone) {
    return hidden
      ? <span className="inline-flex items-center gap-1 text-gray-500" title={hiddenTitle}><LockOutlined aria-hidden />Đã ẩn số</span>
      : <span className="text-gray-500">{empty}</span>;
  }
  const url = zaloUrl(phone);
  if (!url) return <span>{phone}</span>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="phone-zalo" title="Mở Zalo để nhắn tin">
      {phone}<span className="phone-zalo-badge">Zalo</span>
    </a>
  );
}
