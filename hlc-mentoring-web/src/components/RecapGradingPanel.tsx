'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, App, Button, Descriptions, Form, Input, InputNumber, Modal, Segmented, Space, Table, Tag, Typography } from 'antd';
import FileThumbs from '@/components/FileThumbs';
import MonthPicker, { currentPeriodCode } from '@/components/MonthPicker';
import { errorMessage } from '@/lib/api';
import { PAIR_STATUS_COLOR, PAIR_STATUS_LABEL, REVIEW_STATUS_LABEL, formatDateTime } from '@/services/mentoringApi';
import { leaderApi, points, type RecapRubric, type RecapToScore } from '@/services/hlcApi';
import { getCurrentTime } from '@/utils/time';

/** Chấm recap mentoring thang 100 theo tiêu chí module "Recap mentoring" (Leader nhóm / Admin) */
export default function RecapGradingPanel({ groupId, extra }: { groupId?: string; extra?: React.ReactNode }) {
  const { message } = App.useApp();
  const [code, setCode] = useState(() => currentPeriodCode(getCurrentTime()));
  const [filter, setFilter] = useState('UNSCORED');
  const [rubric, setRubric] = useState<RecapRubric | null>(null);
  const [rows, setRows] = useState<RecapToScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [scoring, setScoring] = useState<RecapToScore | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await leaderApi.recaps({ period: code, groupId, filter });
      setRubric(result.rubric);
      setRows(result.rows);
    } catch (error) {
      message.error(errorMessage(error, 'Không tải được recap'));
    } finally {
      setLoading(false);
    }
  }, [code, groupId, filter, message]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);

  const open = (row: RecapToScore) => {
    form.resetFields();
    form.setFieldsValue({
      feedback: row.scoreFeedback ?? '',
      scores: Object.fromEntries((rubric?.criteria ?? []).map((criterion) => [criterion._id, row.scoreDetails.find((item) => item.criterionId === criterion._id)?.score]))
    });
    setScoring(row);
  };

  const submit = async (status: 'APPROVED' | 'REJECTED') => {
    if (!scoring || !rubric) return;
    const values = form.getFieldsValue();
    if (status === 'REJECTED' && !values.feedback?.trim()) {
      message.warning('Nhập nhận xét để người viết biết lý do trả recap');
      return;
    }
    if (status === 'APPROVED') {
      try { await form.validateFields(); } catch { return; }
    }
    setSaving(true);
    try {
      await leaderApi.score(scoring._id, {
        status,
        feedback: values.feedback,
        scores: status === 'APPROVED' ? rubric.criteria.map((criterion) => ({ criterionId: criterion._id, score: Number(values.scores?.[criterion._id] ?? 0) })) : undefined
      });
      message.success(status === 'APPROVED' ? 'Đã chấm recap' : 'Đã trả recap');
      setScoring(null);
      await load();
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const total = Form.useWatch('scores', form) as Record<string, number> | undefined;
  const maxSum = (rubric?.criteria ?? []).reduce((sum, item) => sum + item.maxScore, 0);
  const preview = maxSum ? Math.round((Object.values(total ?? {}).reduce((sum, value) => sum + Number(value || 0), 0) / maxSum) * (rubric?.module.maxScore ?? 100) * 100) / 100 : 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <MonthPicker value={code} onChange={setCode} />
        <Segmented value={filter} onChange={(value) => setFilter(String(value))} options={[{ value: 'UNSCORED', label: 'Chưa chấm' }, { value: 'SCORED', label: 'Đã chấm' }, { value: 'ALL', label: 'Tất cả' }]} />
        {extra}
      </div>
      {rubric && (
        <Typography.Text type="secondary">
          Barem thang {rubric.module.maxScore}: {rubric.criteria.map((item) => `${item.name} (${item.maxScore})`).join(' · ')}. Điểm trung bình 2 recap của cặp là căn cứ xếp giải Nhất/Nhì/Ba tháng.
        </Typography.Text>
      )}
      <Table<RecapToScore>
        rowKey="_id"
        size="small"
        loading={loading}
        dataSource={rows}
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 20 }}
        locale={{ emptyText: filter === 'UNSCORED' ? 'Không còn recap cần chấm' : 'Không có recap' }}
        onRow={(row) => ({ onClick: () => open(row), className: 'cursor-pointer' })}
        columns={[
          { title: 'Buổi', render: (_: unknown, row: RecapToScore) => <div><code className="text-xs">{row.session.code}</code><div className="text-xs text-gray-500">{formatDateTime(row.session.scheduledStartAt)}</div></div> },
          { title: 'Nhóm', dataIndex: 'groupName', render: (value: string | null) => value ?? '—' },
          { title: 'Người viết', render: (_: unknown, row: RecapToScore) => <div>{row.author?.fullName}<div><Tag color={row.role === 'MENTOR' ? 'blue' : 'green'}>{row.role === 'MENTOR' ? 'Mentor' : 'Mentee'}</Tag></div></div> },
          { title: 'Cặp', render: (_: unknown, row: RecapToScore) => <Tag color={PAIR_STATUS_COLOR[row.session.pairStatus]}>{PAIR_STATUS_LABEL[row.session.pairStatus]}</Tag> },
          { title: 'Nộp lúc', render: (_: unknown, row: RecapToScore) => <>{formatDateTime(row.firstSubmittedAt)}{row.isLate && <Tag color="orange" className="ml-1">Muộn</Tag>}</> },
          { title: 'Điểm', render: (_: unknown, row: RecapToScore) => row.score !== null ? <strong>{points(row.score)}/100</strong> : row.reviewStatus === 'REJECTED' ? <Tag color="red">Đã trả</Tag> : <Tag>Chưa chấm</Tag> },
          { title: '', render: (_: unknown, row: RecapToScore) => row.conflict ? <Tag color="purple" title="Leader không chấm recap của cặp mình tham gia">Cặp của bạn</Tag> : null }
        ]}
      />
      <Modal
        title={scoring ? `Recap ${scoring.role === 'MENTOR' ? 'mentor' : 'mentee'} · ${scoring.session.code}` : ''}
        open={Boolean(scoring)}
        onCancel={() => setScoring(null)}
        width="min(860px, calc(100vw - 24px))"
        destroyOnHidden
        forceRender
        footer={scoring?.canScore ? (
          <Space>
            <Button onClick={() => setScoring(null)}>Đóng</Button>
            <Button danger loading={saving} onClick={() => submit('REJECTED')}>Trả recap</Button>
            <Button type="primary" loading={saving} onClick={() => submit('APPROVED')}>Lưu điểm ({points(preview)}/100)</Button>
          </Space>
        ) : <Button onClick={() => setScoring(null)}>Đóng</Button>}
      >
        {scoring && (
          <div className="space-y-4">
            {scoring.conflict && <Alert type="warning" showIcon title="Đây là cặp mentoring của bạn. Phó nhóm hoặc admin sẽ chấm recap này." />}
            <Descriptions bordered size="small" column={{ xs: 1, md: 2 }} items={[
              { key: 'mentee', label: 'Mentee', children: scoring.mentee?.fullName },
              { key: 'mentor', label: 'Mentor', children: scoring.mentor?.fullName },
              { key: 'time', label: 'Buổi mentoring', children: formatDateTime(scoring.session.scheduledStartAt) },
              { key: 'deadline', label: 'Hạn recap', children: formatDateTime(scoring.session.recapDeadlineAt) },
              { key: 'status', label: 'Trạng thái duyệt', children: REVIEW_STATUS_LABEL[scoring.reviewStatus] }
            ]} />
            <div className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3">{scoring.content}</div>
            <FileThumbs files={scoring.files} size={88} />
            {scoring.canScore && rubric && (
              <Form form={form} layout="vertical">
                <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-3">
                  {rubric.criteria.map((criterion) => (
                    <Form.Item key={criterion._id} name={['scores', criterion._id]} label={`${criterion.name} (0–${criterion.maxScore})`} rules={[{ required: true, message: 'Nhập điểm' }, { type: 'number', min: 0, max: criterion.maxScore, message: `0–${criterion.maxScore}` }]}>
                      <InputNumber className="w-full" min={0} max={criterion.maxScore} step={1} />
                    </Form.Item>
                  ))}
                </div>
                <Form.Item name="feedback" label="Nhận xét"><Input.TextArea rows={3} /></Form.Item>
              </Form>
            )}
            {!scoring.canScore && scoring.score !== null && <Alert type="success" showIcon title={`Điểm ${points(scoring.score)}/100`} description={scoring.scoreFeedback} />}
          </div>
        )}
      </Modal>
    </div>
  );
}
