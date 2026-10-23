'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Alert, Button, Spin } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import { errorMessage } from '@/lib/api';
import { formatDateTime } from '@/services/mentoringApi';
import { GROUP_KIND_LABEL, PERIOD_STATUS_LABEL, SOURCE_TYPE_LABEL, completionApi, formatDate, money, periodLabel, points, type AllowanceReport } from '@/services/hlcApi';

/** Báo cáo chi trả phụ cấp mùng 10: in hoặc "Lưu thành PDF" từ trình duyệt */
function ReportView() {
  const code = useSearchParams().get('period') ?? '';
  const [data, setData] = useState<AllowanceReport | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    completionApi.report(code)
      .then((result) => { if (active) setData(result); })
      .catch((reason) => { if (active) setError(errorMessage(reason)); });
    return () => { active = false; };
  }, [code]);

  if (error) return <Alert type="error" showIcon title={error} />;
  if (!data) return <div className="flex justify-center py-12"><Spin /></div>;
  return (
    <div className="allowance-report mx-auto max-w-5xl bg-white p-6 text-sm">
      <div className="no-print mb-4 flex justify-end"><Button type="primary" icon={<PrinterOutlined />} onClick={() => window.print()}>In / Lưu PDF</Button></div>
      <h1 className="text-center text-xl font-bold">BÁO CÁO CHI TRẢ PHỤ CẤP HLC – {periodLabel(data.period.code).toUpperCase()}</h1>
      <p className="text-center text-gray-600">
        Trạng thái kỳ: {PERIOD_STATUS_LABEL[data.period.status]} · Ngày chi trả: {formatDate(data.period.payoutDate)} · Đơn giá {money(data.period.pointRate)}/điểm · Phụ cấp cơ bản {money(data.period.baseAllowance)} · Lập lúc {formatDateTime(data.generatedAt)}
      </p>
      {!data.period.isLocked && <p className="text-center font-semibold text-orange-600">Bản nháp: kỳ chưa chốt, số liệu có thể thay đổi.</p>}
      <table className="report-table mt-4 w-full">
        <thead>
          <tr><th>STT</th><th>Thành viên</th>{data.pointTypes.map((type) => <th key={type.code}>{type.name}</th>)}<th>Tổng điểm</th><th>Thành tiền</th><th>Tài khoản</th></tr>
        </thead>
        <tbody>
          {data.rows.map((row, index) => (
            <tr key={row._id}>
              <td>{index + 1}</td>
              <td>{row.member?.fullName}<div className="text-xs text-gray-500">{row.member?.memberCode}</div></td>
              {data.pointTypes.map((type) => <td key={type.code} className="text-right">{Number(row.pointsByType?.[type.code] ?? 0) ? points(row.pointsByType[type.code]) : ''}</td>)}
              <td className="text-right font-semibold">{points(row.totalPoints)}</td>
              <td className="text-right">{money(row.amount)}</td>
              <td>{row.member?.bankAccount ? `${row.member.bankAccount} – ${row.member.bankName ?? ''}` : 'Chưa có STK'}</td>
            </tr>
          ))}
          <tr className="font-semibold"><td colSpan={2 + data.pointTypes.length}>Tổng cộng {data.totals.members} thành viên</td><td className="text-right">{points(data.totals.points)}</td><td className="text-right">{money(data.totals.amount)}</td><td /></tr>
        </tbody>
      </table>

      <h2 className="mt-6 text-base font-bold">Phụ cấp chức vụ Leader / Phó nhóm và tỷ lệ hoàn tất</h2>
      <table className="report-table mt-2 w-full">
        <thead><tr><th>Nhóm</th><th>Loại</th><th>Leader</th><th>Phó nhóm</th><th>Hoàn tất</th><th>Thưởng (+1)</th></tr></thead>
        <tbody>
          {data.completion.map((group) => (
            <tr key={group._id}>
              <td>{group.name}</td><td>{GROUP_KIND_LABEL[group.groupKind]}</td><td>{group.leader ?? '—'}</td><td>{group.deputy ?? '—'}</td>
              <td>{group.total ? `${group.done}/${group.total} (${group.rate}%)` : 'Chưa có dữ liệu'}</td><td>{group.passed ? 'Có' : 'Không'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mt-6 text-base font-bold">Chi tiết nguồn điểm</h2>
      {data.rows.filter((row) => data.entriesByMember[row.memberId]?.length).map((row) => (
        <div key={row._id} className="report-block mt-2">
          <div className="font-semibold">{row.member?.fullName} ({row.member?.memberCode}): {points(row.totalPoints)} điểm</div>
          <ul className="ml-5 list-disc">
            {data.entriesByMember[row.memberId].map((entry, index) => (
              <li key={index}>{entry.points > 0 ? '+' : ''}{points(entry.points)} · {entry.pointType} ({SOURCE_TYPE_LABEL[entry.sourceType] ?? entry.sourceType}): {entry.description}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function AllowanceReportPage() {
  return <Suspense fallback={<Spin />}><ReportView /></Suspense>;
}
