'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, App, Button, Input, Modal, Popconfirm, Space, Table, Tag, Typography, Upload } from 'antd';
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { errorMessage } from '@/lib/api';
import { formatDateTime } from '@/services/mentoringApi';
import { historyApi, type HistoryBatch, type HistoryImportResult } from '@/services/hlcApi';

/** Nhập / xuất danh sách mentoring và recap của quý cũ (từ 2023), có xem trước và hoàn tác cả lô */
export default function HistoryImportPanel() {
  const { message } = App.useApp();
  const [quarter, setQuarter] = useState('2023Q1');
  const [batches, setBatches] = useState<HistoryBatch[]>([]);
  const [preview, setPreview] = useState<{ file: File; result: HistoryImportResult } | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const valid = /^\d{4}Q[1-4]$/.test(quarter.toUpperCase());

  const load = useCallback(async () => {
    try {
      setBatches(await historyApi.batches());
    } catch (error) {
      message.error(errorMessage(error));
    }
  }, [message]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);

  const check = async (file: File) => {
    setBusy(true);
    try {
      setReason('');
      setPreview({ file, result: await historyApi.importQuarter(quarter.toUpperCase(), file, true) });
    } catch (error) {
      message.error(errorMessage(error, 'Không đọc được file'));
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const result = await historyApi.importQuarter(quarter.toUpperCase(), preview.file, false, reason);
      if (result.applied) {
        message.success(`Đã nhập ${result.rows.length} buổi của quý ${quarter.toUpperCase()}`);
        setPreview(null);
        await load();
      } else setPreview({ file: preview.file, result });
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <Alert type="info" showIcon title="Đưa dữ liệu các quý cũ (từ 2023) vào hệ thống" description="Xuất mẫu → điền mỗi dòng 1 buổi (tháng, mã MTO, mã MTE, giờ, recap 2 bên, điểm MTE) → nhập. Hệ thống kiểm tra toàn bộ file, cho xem trước; có lỗi thì không ghi gì. Nên nhập thử một lô nhỏ trước. Dữ liệu nhập không tự tính lại điểm của tháng cũ; mỗi lô có thể hoàn tác." />
      <Space wrap>
        <Input className="!w-32" value={quarter} onChange={(event) => setQuarter(event.target.value)} placeholder="2023Q1" status={valid ? undefined : 'error'} />
        <Button icon={<DownloadOutlined />} disabled={!valid} onClick={() => historyApi.exportQuarter(quarter.toUpperCase()).catch((error) => message.error(errorMessage(error)))}>Xuất mẫu / dữ liệu quý</Button>
        <Upload accept=".xlsx" showUploadList={false} disabled={!valid || busy} beforeUpload={(file) => { void check(file); return Upload.LIST_IGNORE; }}>
          <Button type="primary" icon={<UploadOutlined />} loading={busy} disabled={!valid}>Nhập file quý cũ</Button>
        </Upload>
      </Space>
      <Table<HistoryBatch>
        rowKey="_id"
        size="small"
        dataSource={batches}
        pagination={{ pageSize: 5 }}
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: 'Chưa có lô nhập nào' }}
        columns={[
          { title: 'Thời gian', render: (_: unknown, row: HistoryBatch) => formatDateTime(row.createdAt) },
          { title: 'Quý', dataIndex: 'quarterCode' },
          { title: 'File', dataIndex: 'fileName' },
          { title: 'Số buổi', render: (_: unknown, row: HistoryBatch) => row.created?.rows ?? 0 },
          { title: 'Lý do', dataIndex: 'reason' },
          { title: 'Trạng thái', render: (_: unknown, row: HistoryBatch) => row.status === 'ACTIVE' ? <Tag color="green">Đã nhập</Tag> : <Tag>Đã hoàn tác {formatDateTime(row.revertedAt)}</Tag> },
          {
            title: '', render: (_: unknown, row: HistoryBatch) => row.status === 'ACTIVE' ? (
              <Popconfirm title="Hoàn tác cả lô?" description="Xóa các cặp, lịch và recap do lô này tạo ra." onConfirm={async () => { try { await historyApi.revert(row._id); message.success('Đã hoàn tác lô nhập'); await load(); } catch (error) { message.error(errorMessage(error)); } }}>
                <Button size="small" danger>Hoàn tác</Button>
              </Popconfirm>
            ) : null
          }
        ]}
      />
      <Modal
        title={`Xem trước: ${preview?.file.name ?? ''}`}
        open={Boolean(preview)}
        onCancel={() => setPreview(null)}
        width="min(960px, calc(100vw - 24px))"
        okText={`Nhập ${preview?.result.rows.length ?? 0} buổi`}
        okButtonProps={{ disabled: !preview?.result.valid }}
        confirmLoading={busy}
        onOk={apply}
        destroyOnHidden
      >
        {preview && (
          <div className="space-y-3">
            {preview.result.errors.length
              ? <Alert type="error" showIcon title={`${preview.result.errors.length} dòng lỗi: từ chối cả file, chưa ghi dữ liệu nào`} description={<ul className="ml-4 list-disc">{preview.result.errors.slice(0, 30).map((item) => <li key={`${item.row}-${item.message}`}>Dòng {item.row}: {item.message}</li>)}</ul>} />
              : <Alert type="success" showIcon title={`File hợp lệ: ${preview.result.rows.length} buổi sẽ được nhập vào quý ${quarter.toUpperCase()}`} />}
            <Table
              rowKey="row"
              size="small"
              pagination={{ pageSize: 10 }}
              dataSource={preview.result.rows}
              scroll={{ x: 'max-content' }}
              columns={[
                { title: 'Dòng', dataIndex: 'row' },
                { title: 'Tháng', dataIndex: 'month' },
                { title: 'MTO', render: (_: unknown, row: HistoryImportResult['rows'][number]) => `${row.mentorCode} – ${row.mentorName}` },
                { title: 'MTE', render: (_: unknown, row: HistoryImportResult['rows'][number]) => `${row.menteeCode} – ${row.menteeName}` },
                { title: 'Lịch', render: (_: unknown, row: HistoryImportResult['rows'][number]) => formatDateTime(row.startAt) },
                { title: 'Recap MTO', render: (_: unknown, row: HistoryImportResult['rows'][number]) => row.mentorRecap ? <Tag color="blue">Có</Tag> : '—' },
                { title: 'Recap MTE', render: (_: unknown, row: HistoryImportResult['rows'][number]) => row.menteeRecap ? <Tag color="green">{row.menteeRecap.score !== null ? `${row.menteeRecap.score} điểm` : 'Chưa chấm'}</Tag> : '—' }
              ]}
            />
            {preview.result.valid && (
              <div>
                <Typography.Text>Lý do / ghi chú cho lô nhập</Typography.Text>
                <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="VD: Số hóa dữ liệu mentoring năm 2023" />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
