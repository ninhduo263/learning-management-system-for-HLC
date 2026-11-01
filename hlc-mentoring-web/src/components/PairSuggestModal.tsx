'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, App, Button, Checkbox, Empty, Modal, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { errorMessage } from '@/lib/api';
import { SUGGEST_CRITERIA_LABEL, mentoringApi, type PairSuggestions } from '@/services/mentoringApi';

type Row = PairSuggestions['rows'][number];

/**
 * Gợi ý MTO phù hợp cho từng MTE theo hồ sơ (ngành học, ngành nghề, khu vực, quê, nguyện vọng). Chỉ gợi ý:
 * Admin bấm "Ghép" để mở form ghép cặp và tự quyết định. MTO đã có cặp bị giảm thứ hạng, có cảnh báo.
 */
export default function PairSuggestModal({ quarterCode, open, onClose, onPick }: {
  quarterCode: string; open: boolean; onClose: () => void; onPick: (mentorCode: string, menteeCode: string) => void;
}) {
  const { message } = App.useApp();
  const [criteria, setCriteria] = useState<string[]>(Object.keys(SUGGEST_CRITERIA_LABEL));
  const [data, setData] = useState<PairSuggestions | null>(null);
  const [onlyUnpaired, setOnlyUnpaired] = useState(true);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await mentoringApi.pairSuggestions(quarterCode, { criteria, limit: 5 }));
    } catch (error) {
      message.error(errorMessage(error, 'Không tải được gợi ý'));
    } finally {
      setLoading(false);
    }
  }, [quarterCode, criteria, message]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
  }, [open, load]);

  const rows = (data?.rows ?? []).filter((row) => !onlyUnpaired || !row.pairedMentorIds.length);
  return (
    <Modal title={`Gợi ý ghép cặp theo hồ sơ · quý ${quarterCode}`} open={open} onCancel={onClose} footer={null} width="min(1100px, calc(100vw - 24px))" destroyOnHidden>
      <div className="space-y-3">
        <Alert type="info" showIcon title="Hệ thống chỉ gợi ý, Admin quyết định" description="Điểm tương đồng tính theo tiêu chí đã chọn. Một MTO có thể ghép nhiều MTE nhưng không khuyến khích: MTO đã có cặp được xếp sau và có cảnh báo." />
        <Space wrap>
          <Checkbox.Group value={criteria} onChange={(value) => setCriteria(value as string[])} options={Object.entries(SUGGEST_CRITERIA_LABEL).map(([value, label]) => ({ value, label }))} />
          <Checkbox checked={onlyUnpaired} onChange={(event) => setOnlyUnpaired(event.target.checked)}>Chỉ MTE chưa có cặp</Checkbox>
        </Space>
        {data && <Typography.Text type="secondary">{data.mentees} MTE · {data.mentors} MTO · tính trong {data.elapsedMs} ms</Typography.Text>}
        <Table<Row>
          rowKey={(row) => row.mentee._id}
          size="small"
          loading={loading}
          dataSource={rows}
          pagination={{ pageSize: 8 }}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: <Empty description="Không có MTE cần gợi ý" /> }}
          columns={[
            {
              title: 'MTE', width: 240, render: (_: unknown, row: Row) => (
                <div>
                  <strong>{row.mentee.fullName}</strong> <span className="text-xs text-gray-400">{row.mentee.memberCode}</span>
                  <div className="text-xs text-gray-500">{[row.mentee.major, row.mentee.occupation, row.mentee.address].filter(Boolean).join(' · ') || 'Chưa có thông tin hồ sơ'}</div>
                  {row.missingProfile.length > 0 && <Tag color="orange" className="mt-1">Thiếu {row.missingProfile.join(', ')}</Tag>}
                  {row.pairedMentorIds.length > 0 && <Tag color="green" className="mt-1">Đã có cặp</Tag>}
                </div>
              )
            },
            {
              title: 'MTO gợi ý (thứ hạng)', render: (_: unknown, row: Row) => row.candidates.length ? (
                <div className="space-y-2">
                  {row.candidates.map((item, index) => (
                    <div key={item.mentor._id} className="flex flex-wrap items-center gap-2">
                      <Tag color={index === 0 ? 'gold' : 'default'}>#{index + 1}</Tag>
                      <Tooltip title={[item.mentor.major, item.mentor.occupation, item.mentor.address].filter(Boolean).join(' · ')}><strong>{item.mentor.fullName}</strong></Tooltip>
                      <span className="text-xs text-gray-500">{item.reasons.join('; ')}</span>
                      {item.warning && <Tag color="red">{item.warning}</Tag>}
                      <Button size="small" type="link" onClick={() => onPick(item.mentor.memberCode, row.mentee.memberCode)}>Ghép</Button>
                    </div>
                  ))}
                </div>
              ) : <span className="text-gray-400">Chưa có MTO khớp tiêu chí (bổ sung hồ sơ để gợi ý chính xác hơn)</span>
            }
          ]}
        />
      </div>
    </Modal>
  );
}
