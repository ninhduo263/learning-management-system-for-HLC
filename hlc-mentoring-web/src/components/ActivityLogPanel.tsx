'use client';

import { useCallback, useEffect, useState } from 'react';
import { App, Button, DatePicker, Input, Select, Space, Table, Tag, Typography } from 'antd';
import type { Dayjs } from 'dayjs';
import { errorMessage } from '@/lib/api';
import { formatDateTime } from '@/services/mentoringApi';
import { ACTIVITY_MODULE_LABEL, activityApi, type ActivityLogView } from '@/services/hlcApi';

/** Backend trả tối đa 1000 bản ghi mỗi lần (mặc định 300) */
const LIMIT_OPTIONS = [300, 500, 1000];

/** Nhật ký thao tác: xóa nhóm, xóa vai trò, gỡ chức vụ, xuất dữ liệu cá nhân, ủy quyền, làm thay... */
export default function ActivityLogPanel() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<ActivityLogView[]>([]);
  const [loading, setLoading] = useState(false);
  const [module, setModule] = useState<string | undefined>();
  const [action, setAction] = useState<string | undefined>();
  const [actionOptions, setActionOptions] = useState<string[]>([]);
  const [limit, setLimit] = useState(300);
  const [keyword, setKeyword] = useState('');
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await activityApi.list({
        module,
        action,
        limit,
        keyword: keyword.trim() || undefined,
        from: range?.[0]?.format('YYYY-MM-DD'),
        to: range?.[1]?.format('YYYY-MM-DD')
      });
      setRows(list);
      // Danh sách thao tác để lọc: gom từ các bản ghi đã tải (backend không có endpoint liệt kê riêng)
      setActionOptions((current) => [...new Set([...current, ...list.map((row) => row.action)])].sort());
    } catch (error) {
      message.error(errorMessage(error, 'Không tải được nhật ký'));
    } finally {
      setLoading(false);
    }
  }, [message, module, action, limit, keyword, range]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module, action, limit, range]);

  return (
    <div className="space-y-3">
      <Space wrap>
        <Select allowClear placeholder="Dịch vụ" className="min-w-44" value={module} onChange={setModule} options={Object.entries(ACTIVITY_MODULE_LABEL).map(([value, label]) => ({ value, label }))} />
        <Select allowClear showSearch placeholder="Thao tác" className="min-w-52" value={action} onChange={setAction} options={actionOptions.map((value) => ({ value, label: value }))} />
        <DatePicker.RangePicker format="DD/MM/YYYY" value={range} onChange={(value) => setRange(value as [Dayjs | null, Dayjs | null] | null)} />
        <Input.Search allowClear placeholder="Tìm theo nội dung, đối tượng, người thao tác" value={keyword} onChange={(event) => setKeyword(event.target.value)} onSearch={() => void load()} className="w-80 max-w-full" />
        <Select value={limit} onChange={setLimit} className="w-40" options={LIMIT_OPTIONS.map((value) => ({ value, label: `Tối đa ${value} dòng` }))} />
        <Button onClick={() => void load()}>Tải lại</Button>
      </Space>
      {rows.length >= limit && <Typography.Text type="warning">Đang hiển thị {limit} bản ghi mới nhất; còn bản ghi cũ hơn. Thu hẹp bộ lọc hoặc tăng số dòng tối đa để xem thêm.</Typography.Text>}
      <Table<ActivityLogView>
        rowKey="_id"
        loading={loading}
        dataSource={rows}
        pagination={{ pageSize: 20, showTotal: (total) => `${total} bản ghi` }}
        scroll={{ x: 'max-content' }}
        expandable={{
          rowExpandable: (row) => Boolean(row.detail && Object.keys(row.detail).length),
          expandedRowRender: (row) => <pre className="m-0 max-w-4xl overflow-auto rounded-lg bg-gray-50 p-3 text-xs">{JSON.stringify(row.detail, null, 2)}</pre>
        }}
        columns={[
          { title: 'Thời gian', width: 160, render: (_: unknown, row: ActivityLogView) => formatDateTime(row.createdAt) },
          { title: 'Dịch vụ', width: 140, render: (_: unknown, row: ActivityLogView) => <Tag>{ACTIVITY_MODULE_LABEL[row.module] ?? row.module}</Tag> },
          { title: 'Thao tác', width: 190, render: (_: unknown, row: ActivityLogView) => <code className="text-xs">{row.action}</code> },
          { title: 'Người thao tác', width: 180, render: (_: unknown, row: ActivityLogView) => <div>{row.actorName ?? 'Hệ thống'}{row.onBehalfOfName && <div className="text-xs text-orange-600">Làm thay cho {row.onBehalfOfName}</div>}</div> },
          { title: 'Đối tượng', width: 180, render: (_: unknown, row: ActivityLogView) => row.targetName ?? '—' },
          { title: 'Nội dung', render: (_: unknown, row: ActivityLogView) => <div className="max-w-2xl whitespace-pre-wrap">{row.summary}</div> }
        ]}
      />
    </div>
  );
}
