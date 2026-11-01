'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, App, Button, Card, Empty, Form, Modal, Popconfirm, Progress, Spin, Table, Tabs, Tag, Typography } from 'antd';
import { BookOutlined, PlusOutlined } from '@ant-design/icons';
import SubmissionData from '@/components/SubmissionData';
import SubmissionForm, { formToSubmission, submissionToForm } from '@/components/SubmissionForm';
import { errorMessage } from '@/lib/api';
import { formatDateTime } from '@/services/mentoringApi';
import {
  CYCLE_LABEL, SUBMISSION_STATUS_COLOR, SUBMISSION_STATUS_LABEL, learningApi, points,
  type LibraryItem, type MyLearningModule, type SubmissionView
} from '@/services/hlcApi';

const cycleText = (module: MyLearningModule) => {
  const { min, max } = module.currentCycle;
  const unit = { DAILY: 'ngày', WEEKLY: 'tuần', MONTHLY: 'tháng', ONCE: 'đợt' }[module.cycleType];
  if (max && min && max !== min) return `${min}–${max} bài/${unit}`;
  if (min) return `Tối thiểu ${min} bài/${unit}`;
  if (max) return `Tối đa ${max} bài/${unit}`;
  return CYCLE_LABEL[module.cycleType];
};

export default function MemberLearningView() {
  const { message } = App.useApp();
  const [modules, setModules] = useState<MyLearningModule[]>([]);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<string>('');
  const [editing, setEditing] = useState<{ module: MyLearningModule; submission?: SubmissionView } | null>(null);
  const [viewing, setViewing] = useState<{ module: MyLearningModule; submission: SubmissionView } | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    try {
      const [mine, items] = await Promise.all([learningApi.mine(), learningApi.library()]);
      setModules(mine.modules);
      setLibrary(items);
      setActive((current) => current || mine.modules[0]?._id || '');
    } catch (error) {
      message.error(errorMessage(error, 'Không tải được dữ liệu học tập'));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    let alive = true;
    Promise.resolve().then(() => { if (alive) void load(); });
    return () => { alive = false; };
  }, [load]);

  const openForm = (module: MyLearningModule, submission?: SubmissionView) => {
    form.resetFields();
    form.setFieldsValue(submissionToForm(module.fields, submission));
    setEditing({ module, submission });
  };

  const save = async (values: Record<string, unknown>) => {
    if (!editing) return;
    setSaving(true);
    try {
      await learningApi.submit(editing.module._id, formToSubmission(editing.module.fields, values), editing.submission?._id);
      message.success(editing.module.requireReview ? 'Đã nộp bài, chờ duyệt' : 'Đã nộp bài');
      setEditing(null);
      await load();
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Card className="flex justify-center py-12"><Spin size="large" /></Card>;
  if (!modules.length) return <Card><Empty description="Chưa có module học tập nào dành cho bạn" /></Card>;

  const libraryFor = (module: MyLearningModule) => library.filter((item) => !module.libraryType || item.libraryType === module.libraryType);

  return (
    <div className="space-y-4">
      <Typography.Title level={3} className="!mb-0">Học tập</Typography.Title>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((module) => {
          const { submitted, min, max } = module.currentCycle;
          const goal = min || max || 1;
          return (
            <Card key={module._id} size="small" hoverable className={active === module._id ? 'ring-2 ring-[var(--role)]' : ''} onClick={() => setActive(module._id)}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <strong>{module.name}</strong>
                  <div className="text-xs text-gray-500">{cycleText(module)} · Kỳ {module.currentCycle.cycleKey}</div>
                </div>
                <Button size="small" type="primary" icon={<PlusOutlined />} disabled={!module.currentCycle.canSubmit} onClick={(event) => { event.stopPropagation(); openForm(module); }}>Nộp</Button>
              </div>
              <Progress className="!mt-3 !mb-0" percent={Math.min(100, Math.round((submitted / goal) * 100))} format={() => (max ? `${submitted}/${max}` : submitted >= goal ? `${submitted} bài` : `${submitted}/${goal}`)} status={min && submitted >= min ? 'success' : 'active'} />
            </Card>
          );
        })}
      </div>
      <Card>
        <Tabs activeKey={active} onChange={setActive} items={[
          ...modules.map((module) => ({
            key: module._id,
            label: module.name,
            children: (
              <div className="space-y-3">
                {module.description && <Typography.Paragraph type="secondary">{module.description}</Typography.Paragraph>}
                {!module.currentCycle.canSubmit && <Alert type="success" showIcon title={`Bạn đã nộp đủ số bài tối đa của kỳ ${module.currentCycle.cycleKey}.`} />}
                <Table<SubmissionView>
                  rowKey="_id"
                  size="small"
                  dataSource={module.submissions}
                  scroll={{ x: 'max-content' }}
                  pagination={{ pageSize: 10 }}
                  locale={{ emptyText: 'Chưa nộp bài nào' }}
                  onRow={(submission) => ({ onClick: () => setViewing({ module, submission }), className: 'cursor-pointer' })}
                  columns={[
                    { title: 'Kỳ', dataIndex: 'cycleKey', width: 100 },
                    { title: 'Nộp lúc', width: 140, render: (_: unknown, row: SubmissionView) => formatDateTime(row.submittedAt) },
                    { title: 'Nội dung', render: (_: unknown, row: SubmissionView) => <span className="line-clamp-1 max-w-sm">{row.libraryItem?.title ?? String(Object.values(row.data ?? {}).find((value) => typeof value === 'string') ?? '')}</span> },
                    { title: 'Trạng thái', width: 120, render: (_: unknown, row: SubmissionView) => <Tag color={SUBMISSION_STATUS_COLOR[row.reviewStatus]}>{SUBMISSION_STATUS_LABEL[row.reviewStatus]}</Tag> },
                    { title: 'Điểm', width: 80, render: (_: unknown, row: SubmissionView) => row.totalScore !== null ? <strong>{points(row.totalScore)}/{module.maxScore}</strong> : '—' },
                    {
                      title: '', width: 140, render: (_: unknown, row: SubmissionView) => row.reviewStatus === 'APPROVED' ? null : (
                        <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
                          <Button size="small" onClick={() => openForm(module, row)}>{row.reviewStatus === 'REJECTED' ? 'Nộp lại' : 'Sửa'}</Button>
                          <Popconfirm title="Xóa bài này?" onConfirm={async () => { try { await learningApi.removeSubmission(row._id); await load(); } catch (error) { message.error(errorMessage(error)); } }}>
                            <Button size="small" danger>Xóa</Button>
                          </Popconfirm>
                        </div>
                      )
                    }
                  ]}
                />
              </div>
            )
          })),
          {
            key: 'library',
            label: <span><BookOutlined /> Thư viện</span>,
            children: (
              <Table<LibraryItem>
                rowKey="_id"
                size="small"
                dataSource={library}
                columns={[
                  { title: 'Loại', dataIndex: 'libraryType', width: 90, render: (value: string) => <Tag color={value === 'BOOK' ? 'purple' : 'blue'}>{value === 'BOOK' ? 'Sách' : 'Tài liệu'}</Tag> },
                  { title: 'Tên', dataIndex: 'title', render: (value: string, row: LibraryItem) => <div><strong>{value}</strong>{row.description && <div className="text-xs text-gray-500">{row.description}</div>}</div> },
                  { title: 'Tác giả', dataIndex: 'author' },
                  { title: 'Thể loại', dataIndex: 'category' },
                  { title: '', render: (_: unknown, row: LibraryItem) => (row.fileUrl || row.externalUrl) ? <a href={row.fileUrl || row.externalUrl || ''} target="_blank" rel="noreferrer">Mở</a> : null }
                ]}
              />
            )
          }
        ]} />
      </Card>

      <Modal title={editing ? `${editing.submission ? 'Sửa bài' : 'Nộp bài'}: ${editing.module.name}` : ''} open={Boolean(editing)} onCancel={() => setEditing(null)} onOk={() => form.submit()} okText="Nộp" confirmLoading={saving} width={640} destroyOnHidden>
        {editing && <SubmissionForm form={form} fields={editing.module.fields} library={libraryFor(editing.module)} onFinish={save} />}
      </Modal>

      <Modal title={viewing ? `${viewing.module.name} · ${viewing.submission.cycleKey}` : ''} open={Boolean(viewing)} onCancel={() => setViewing(null)} footer={null} width={640}>
        {viewing && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Tag color={SUBMISSION_STATUS_COLOR[viewing.submission.reviewStatus]}>{SUBMISSION_STATUS_LABEL[viewing.submission.reviewStatus]}</Tag>
              {viewing.submission.totalScore !== null && <Tag color="green">Điểm {points(viewing.submission.totalScore)}/{viewing.module.maxScore}</Tag>}
            </div>
            <SubmissionData fields={viewing.module.fields} submission={viewing.submission} />
            {viewing.submission.scores.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-500">Điểm theo tiêu chí</div>
                {viewing.submission.scores.map((score) => {
                  const criterion = viewing.module.criteria.find((item) => item._id === score.criterionId);
                  return <div key={score.criterionId}>{criterion?.name ?? 'Tiêu chí'}: <strong>{points(score.score)}</strong>/{criterion?.maxScore}</div>;
                })}
              </div>
            )}
            {viewing.submission.feedback && <Alert type={viewing.submission.reviewStatus === 'REJECTED' ? 'error' : 'info'} showIcon title="Nhận xét" description={viewing.submission.feedback} />}
          </div>
        )}
      </Modal>
    </div>
  );
}
