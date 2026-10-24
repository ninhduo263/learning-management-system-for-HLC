'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, App, Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tabs, Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import ProposalModal from '@/components/ProposalModal';
import { DashHeader } from '@/components/dashboard/DashParts';
import { useAccess } from '@/lib/useAccess';
import { errorMessage } from '@/lib/api';
import { formatDateTime } from '@/services/mentoringApi';
import {
  PROPOSAL_STATUS_COLOR, PROPOSAL_STATUS_LABEL, PROPOSAL_TYPE_LABEL, proposalApi,
  type ProposalStatus, type ProposalSummary, type ProposalType, type ProposalView
} from '@/services/hlcApi';

type Box = 'inbox' | 'mine' | 'all';

/** Đề xuất giữa các chức vụ: gửi, duyệt / từ chối, lịch sử */
export default function ProposalsPage() {
  const { message } = App.useApp();
  const [summary, setSummary] = useState<ProposalSummary | null>(null);
  const access = useAccess();
  const isAdmin = Boolean(access?.isSuperAdmin);
  const [box, setBox] = useState<Box>('mine');
  const [status, setStatus] = useState<string | undefined>();
  const [type, setType] = useState<ProposalType | undefined>();
  const [rows, setRows] = useState<ProposalView[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deciding, setDeciding] = useState<{ row: ProposalView; status: 'APPROVED' | 'REJECTED' } | null>(null);
  const [form] = Form.useForm<{ note?: string }>();

  useEffect(() => {
    proposalApi.summary().then((value) => {
      setSummary(value);
      setBox(value.canDecide.length ? 'inbox' : 'mine');
      if (value.canDecide.length) setStatus('PENDING');
    }).catch((error) => message.error(errorMessage(error)));
  }, [message]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await proposalApi.list({ box, status, type }));
    } catch (error) {
      message.error(errorMessage(error, 'Không tải được đề xuất'));
    } finally {
      setLoading(false);
    }
  }, [box, status, type, message]);

  useEffect(() => {
    if (!summary) return;
    let active = true;
    Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load, summary]);

  const changed = async () => {
    window.dispatchEvent(new Event('hlc-proposal-change'));
    setSummary(await proposalApi.summary());
    await load();
  };

  const decide = async (values: { note?: string }) => {
    if (!deciding) return;
    try {
      await proposalApi.decide(deciding.row._id, { status: deciding.status, note: values.note });
      message.success(deciding.status === 'APPROVED' ? 'Đã duyệt và áp dụng đề xuất' : 'Đã từ chối đề xuất');
      setDeciding(null);
      await changed();
    } catch (error) {
      message.error(errorMessage(error));
    }
  };

  if (!summary) return null;
  const canPropose = summary.canPropose.length > 0;
  const tabs = [
    summary.canDecide.length > 0 && { key: 'inbox', label: `Chờ tôi duyệt${summary.pendingInbox ? ` (${summary.pendingInbox})` : ''}` },
    { key: 'mine', label: 'Tôi đã gửi' },
    isAdmin && { key: 'all', label: 'Toàn bộ lịch sử' }
  ].filter((item): item is { key: string; label: string } => Boolean(item));

  return (
    <div className="dash">
      <DashHeader title="Đề xuất giữa các chức vụ" subtitle="Chức vụ không có quyền sửa gửi đề xuất kèm lý do; người nắm quyền duyệt hoặc từ chối. Mọi đề xuất đều được lưu lịch sử.">
        {canPropose && <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setCreating(true)}>Gửi đề xuất</Button>}
      </DashHeader>

      {!canPropose && !summary.canDecide.length && !isAdmin && <Alert type="info" showIcon title="Chức vụ của bạn hiện không gửi hoặc duyệt đề xuất nào." />}
      {canPropose && (
        <Alert type="info" showIcon title="Bạn có thể gửi" description={summary.canPropose.map((item) => PROPOSAL_TYPE_LABEL[item]).join(' · ')} />
      )}

      <Card>
        <Tabs activeKey={box} onChange={(key) => { setBox(key as Box); setStatus(key === 'inbox' ? 'PENDING' : undefined); }} items={tabs} />
        <Space wrap className="mb-4">
          <Select allowClear placeholder="Mọi trạng thái" className="w-44" value={status} onChange={setStatus}
            options={(Object.keys(PROPOSAL_STATUS_LABEL) as ProposalStatus[]).filter((item) => item !== 'PROCESSING').map((value) => ({ value, label: PROPOSAL_STATUS_LABEL[value] }))} />
          <Select allowClear placeholder="Mọi loại đề xuất" className="w-64" value={type} onChange={setType}
            options={(Object.keys(PROPOSAL_TYPE_LABEL) as ProposalType[]).map((value) => ({ value, label: PROPOSAL_TYPE_LABEL[value] }))} />
          <Button onClick={() => void load()}>Tải lại</Button>
        </Space>
        <Table<ProposalView>
          rowKey="_id"
          loading={loading}
          dataSource={rows}
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 15, hideOnSinglePage: true, showTotal: (total) => `${total} đề xuất` }}
          locale={{ emptyText: box === 'inbox' ? 'Không có đề xuất nào đang chờ bạn duyệt' : 'Chưa có đề xuất' }}
          expandable={{
            expandedRowRender: (row) => (
              <div className="space-y-2 py-1">
                <div><strong>Lý do: </strong><span className="whitespace-pre-wrap">{row.reason}</span></div>
                {row.decidedAt && (
                  <div><strong>{row.status === 'CANCELLED' ? 'Đã rút' : `${PROPOSAL_STATUS_LABEL[row.status]} bởi ${row.deciderName ?? '—'}`}</strong> lúc {formatDateTime(row.decidedAt)}{row.decisionNote ? <> · Ghi chú: <span className="whitespace-pre-wrap">{row.decisionNote}</span></> : null}</div>
                )}
                {row.resultRef && <Typography.Text type="secondary">Mã bản ghi được áp dụng: {row.resultRef}</Typography.Text>}
              </div>
            )
          }}
          columns={[
            { title: 'Loại', render: (_: unknown, row: ProposalView) => <Tag color="purple" className="!m-0">{PROPOSAL_TYPE_LABEL[row.type]}</Tag> },
            { title: 'Nội dung đề xuất', render: (_: unknown, row: ProposalView) => <div className="max-w-xs">{row.title}</div> },
            { title: 'Người gửi', render: (_: unknown, row: ProposalView) => <div><strong>{row.proposerName}</strong><div className="text-xs text-gray-500">{row.proposerRole}</div></div> },
            ...(box === 'inbox' ? [] : [{ title: 'Gửi đến', dataIndex: 'deciderLabel' }]),
            { title: 'Trạng thái', render: (_: unknown, row: ProposalView) => <Tag color={PROPOSAL_STATUS_COLOR[row.status]} className="!m-0">{PROPOSAL_STATUS_LABEL[row.status]}</Tag> },
            { title: 'Gửi lúc', render: (_: unknown, row: ProposalView) => formatDateTime(row.createdAt) },
            {
              title: '', fixed: 'right' as const, render: (_: unknown, row: ProposalView) => (
                <Space>
                  {row.canDecide && <Button type="primary" size="small" onClick={() => { form.resetFields(); setDeciding({ row, status: 'APPROVED' }); }}>Duyệt</Button>}
                  {row.canDecide && <Button danger size="small" onClick={() => { form.resetFields(); setDeciding({ row, status: 'REJECTED' }); }}>Từ chối</Button>}
                  {row.canCancel && (
                    <Popconfirm title="Rút đề xuất này?" okText="Rút" cancelText="Không" onConfirm={async () => { try { await proposalApi.cancel(row._id); await changed(); } catch (error) { message.error(errorMessage(error)); } }}>
                      <Button size="small">Rút lại</Button>
                    </Popconfirm>
                  )}
                </Space>
              )
            }
          ]}
        />
      </Card>

      <ProposalModal open={creating} allowed={summary.canPropose} onClose={() => setCreating(false)} onDone={() => { setCreating(false); void changed(); }} />
      <Modal
        title={deciding ? `${deciding.status === 'APPROVED' ? 'Duyệt' : 'Từ chối'} đề xuất` : ''}
        open={Boolean(deciding)}
        onCancel={() => setDeciding(null)}
        onOk={() => form.submit()}
        okText={deciding?.status === 'APPROVED' ? 'Duyệt và áp dụng' : 'Từ chối'}
        okButtonProps={{ danger: deciding?.status === 'REJECTED' }}
        cancelText="Hủy"
        destroyOnHidden
      >
        {deciding && (
          <>
            <Alert className="!mb-4" type={deciding.status === 'APPROVED' ? 'warning' : 'info'} showIcon
              title={deciding.row.title}
              description={deciding.status === 'APPROVED' ? 'Duyệt thì hệ thống áp dụng ngay (đổi cặp hoặc ghi dòng điều chỉnh điểm) và ghi nhật ký.' : 'Từ chối bắt buộc có ghi chú để người gửi biết lý do.'} />
            <Typography.Paragraph><strong>{deciding.row.proposerRole} {deciding.row.proposerName}:</strong> <span className="whitespace-pre-wrap">{deciding.row.reason}</span></Typography.Paragraph>
            <Form form={form} layout="vertical" onFinish={decide}>
              <Form.Item name="note" label="Ghi chú" rules={deciding.status === 'REJECTED' ? [{ required: true, whitespace: true, message: 'Nhập lý do từ chối' }] : []}>
                <Input.TextArea rows={3} />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
}
