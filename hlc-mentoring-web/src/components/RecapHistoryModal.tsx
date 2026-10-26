'use client';

import { useEffect, useState } from 'react';
import { Alert, App, Button, Descriptions, Empty, Modal, Spin, Tag, Timeline, Typography } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
import ProposalModal from '@/components/ProposalModal';
import { errorMessage } from '@/lib/api';
import { formatDateTime } from '@/services/mentoringApi';
import { RECAP_LOG_LABEL, leaderApi, points, proposalApi, type ProposalType, type RecapHistory } from '@/services/hlcApi';

/** Mốc thưởng mentoring sớm (giờ VN): trước 23:59 ngày 7 (+2), trước 23:59 ngày 14 (+1) */
function earlyWindow(at: string) {
  const day = Number(new Intl.DateTimeFormat('en-GB', { day: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(at)));
  if (day <= 7) return { label: 'Trước 23:59 ngày 7 (mốc tuần 1)', color: 'green' };
  if (day <= 14) return { label: 'Trước 23:59 ngày 14 (mốc tuần 2)', color: 'blue' };
  return { label: 'Sau ngày 14 (không có thưởng sớm)', color: 'default' };
}

const fileNames = (files: { fileName: string | null }[] | null) => (files ?? []).map((item) => item.fileName ?? 'ảnh').join(', ') || '—';

/**
 * Nhật ký nộp / sửa recap (vòng 10) cho người duyệt: mốc thưởng sớm luôn tính theo LẦN NỘP ĐẦU TIÊN, kể cả khi lần đó
 * sơ sài. Người duyệt xem nội dung trước / sau từng lần sửa; thấy dấu hiệu nộp sơ sài giữ mốc thì đề xuất Trưởng ban
 * HLC Fund trừ thủ công điểm thưởng sớm của buổi đó.
 */
export default function RecapHistoryModal({ recapId, onClose }: { recapId: string | null; onClose: () => void }) {
  const { message } = App.useApp();
  const [data, setData] = useState<RecapHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [canPropose, setCanPropose] = useState<ProposalType[]>([]);
  const [proposing, setProposing] = useState(false);

  useEffect(() => {
    if (!recapId) return;
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      setLoading(true);
      setData(null);
      Promise.all([leaderApi.recapHistory(recapId), proposalApi.summary().catch(() => null)])
        .then(([history, summary]) => {
          if (!active) return;
          setData(history);
          setCanPropose(summary?.canPropose ?? []);
        })
        .catch((error) => message.error(errorMessage(error, 'Không tải được nhật ký recap')))
        .finally(() => { if (active) setLoading(false); });
    });
    return () => { active = false; };
  }, [recapId, message]);

  const early = data ? earlyWindow(data.initialSubmittedAt) : null;
  const allowProposal = Boolean(data && data.role === 'MENTEE' && data.earlyBonus > 0 && canPropose.includes('MENTORING_POINT'));

  return (
    <>
      <Modal
        title={<span className="inline-flex items-center gap-2"><HistoryOutlined />Nhật ký nộp / sửa recap{data ? ` · ${data.sessionCode}` : ''}</span>}
        open={Boolean(recapId)}
        onCancel={onClose}
        footer={(
          <div className="flex flex-wrap justify-end gap-2">
            {allowProposal && <Button danger onClick={() => setProposing(true)}>Đề xuất trừ điểm thưởng sớm</Button>}
            <Button onClick={onClose}>Đóng</Button>
          </div>
        )}
        width="min(900px, calc(100vw - 24px))"
        destroyOnHidden
      >
        {loading && <div className="py-8 text-center"><Spin /></div>}
        {data && early && (
          <div className="space-y-4">
            <Descriptions bordered size="small" column={{ xs: 1, md: 2 }} items={[
              { key: 'who', label: 'Người viết', children: data.member ? `${data.member.fullName} (${data.member.memberCode})` : '—' },
              { key: 'deadline', label: 'Hạn recap (kết thúc + 24 giờ)', children: <>{formatDateTime(data.recapDeadlineAt)}{data.isLate && <Tag color="orange" className="ml-2">Nộp muộn</Tag>}</> },
              { key: 'initial', label: 'Nộp lần đầu (mốc thưởng sớm)', children: <><strong>{formatDateTime(data.initialSubmittedAt)}</strong><div><Tag color={early.color} className="mt-1">{early.label}</Tag></div></> },
              { key: 'last', label: 'Lần nộp / sửa gần nhất', children: formatDateTime(data.lastSubmittedAt) },
              { key: 'edits', label: 'Số lần sửa / nộp lại', children: data.editCount ? <Tag color="gold">{data.editCount} lần</Tag> : 'Chưa sửa' },
              { key: 'bonus', label: 'Điểm thưởng sớm đang tính', children: data.role === 'MENTEE' ? (data.earlyBonus ? <strong>+{points(data.earlyBonus)} điểm</strong> : 'Chưa có (chỉ tính sau khi recap được duyệt)') : 'Không áp dụng (recap MTO)' }
            ]} />
            <Alert
              type="info"
              showIcon
              title="Mốc thưởng sớm luôn tính theo lần nộp đầu tiên; sửa recap về sau không đổi mốc."
              description={allowProposal
                ? 'Nếu lần nộp đầu sơ sài rồi được sửa nhiều để giữ mốc thưởng, bạn có thể gửi đề xuất cho Trưởng ban HLC Fund trừ thủ công điểm thưởng sớm của buổi này (kèm lý do).'
                : 'Nếu thấy dấu hiệu nộp sơ sài để giữ mốc thưởng, người duyệt gửi đề xuất cho Trưởng ban HLC Fund trừ thủ công điểm thưởng sớm của buổi này.'}
            />
            {!data.logs.length && <Empty description="Recap này được nộp trước khi có nhật ký (chưa có lần sửa nào được ghi)" />}
            <Timeline
              items={data.logs.map((log) => ({
                color: log.action === 'SUBMIT' || log.action === 'PROXY' ? 'green' : 'gold',
                children: (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Tag color={log.action === 'SUBMIT' || log.action === 'PROXY' ? 'green' : 'gold'} className="!m-0">{RECAP_LOG_LABEL[log.action]}</Tag>
                      <strong>{formatDateTime(log.at)}</strong>
                      {log.actorName && <span className="text-gray-500">bởi {log.actorName}</span>}
                    </div>
                    {log.contentBefore !== null && log.contentBefore !== log.contentAfter ? (
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        <div>
                          <Typography.Text type="secondary">Trước ({log.contentBefore.length} ký tự)</Typography.Text>
                          <div className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-2 text-sm">{log.contentBefore || '—'}</div>
                        </div>
                        <div>
                          <Typography.Text type="secondary">Sau ({log.contentAfter.length} ký tự)</Typography.Text>
                          <div className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-2 text-sm">{log.contentAfter}</div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Typography.Text type="secondary">{log.contentBefore !== null ? 'Nội dung không đổi' : `Nội dung (${log.contentAfter.length} ký tự)`}</Typography.Text>
                        <div className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-2 text-sm">{log.contentAfter}</div>
                      </div>
                    )}
                    {log.filesBefore && fileNames(log.filesBefore) !== fileNames(log.filesAfter)
                      ? <div className="text-sm text-gray-600">Ảnh: {fileNames(log.filesBefore)} → {fileNames(log.filesAfter)}</div>
                      : <div className="text-sm text-gray-600">Ảnh: {fileNames(log.filesAfter)}</div>}
                  </div>
                )
              }))}
            />
          </div>
        )}
      </Modal>
      {data && (
        <ProposalModal
          open={proposing}
          allowed={['MENTORING_POINT']}
          preset={{
            type: 'MENTORING_POINT',
            memberId: data.member?._id,
            periodCode: data.periodCode ?? undefined,
            points: -data.earlyBonus,
            pointTypeCode: data.earlyBonusPointTypeCode ?? 'MENTORING_EARLY',
            recap: { id: data.recapId, sessionCode: data.sessionCode },
            reason: `Đề nghị trừ điểm thưởng mentoring sớm của buổi ${data.sessionCode}: lần nộp đầu (${formatDateTime(data.initialSubmittedAt)}) có dấu hiệu sơ sài để giữ mốc, sau đó sửa ${data.editCount} lần.`
          }}
          onClose={() => setProposing(false)}
          onDone={() => { setProposing(false); message.success('Đã gửi đề xuất cho Trưởng ban HLC Fund'); }}
        />
      )}
    </>
  );
}
