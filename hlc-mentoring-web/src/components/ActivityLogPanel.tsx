'use client';

import { useCallback, useEffect, useState } from 'react';
import { App, Button, DatePicker, Input, Select, Space, Table, Tag } from 'antd';
import type { Dayjs } from 'dayjs';
import { errorMessage } from '@/lib/api';
import { formatDateTime } from '@/services/mentoringApi';
import { ACTIVITY_MODULE_LABEL, activityApi, type ActivityLogView } from '@/services/hlcApi';

/** Nhật ký thao tác: xóa nhóm, xóa vai trò, gỡ chức vụ, xuất dữ liệu cá nhân, ủy quyền, làm thay... */
export default function ActivityLogPanel() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<ActivityLogView[]>([]);
  const [loading, setLoading] = useState(false);
  const [module, setModule] = useState<string | undefined>();
  const [keyword, setKeyword] = useState('');
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await activityApi.list({
        module,
        keyword: keyword.trim() || undefined,
        from: range?.[0]?.format('YYYY-MM-DD'),
        to: range?.[1]?.format('YYYY-MM-DD')
      }));
    } catch (error) {
      message.error(errorMessage(error, 'Không tải được nhật ký'));
    } finally {
      setLoading(false);
    }
  }, [message, module, keyword, range]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module, range]);

  return (
    <div className="space-y-3">
      <Space wrap>
        <Select allowClear placeholder="Dịch vụ" className="min-w-44" value={module} onChange={setModule} options={Object.entries(ACTIVITY_MODULE_LABEL).map(([value, label]) => ({ value, label }))} />
        <DatePicker.RangePicker format="DD/MM/YYYY" value={range} onChange={(value) => setRange(value as [Dayjs | null, Dayjs | null] | null)} />
        <Input.Search allowClear placeholder="Tìm theo nội dung, người thao tác" value={keyword} onChange={(event) => setKeyword(event.target.value)} onSearch={() => void load()} className="max-w-xs" />
        <Button onClick={() => void load()}>Tải lại</Button>
      </Space>
      <Table<ActivityLogView>
        rowKey="_id"
        size="small"
        loading={loading}
        dataSource={rows}
        pagination={{ pageSize: 20 }}
        scroll={{ x: 'max-content' }}
        columns={[
          { title: 'Thời gian', width: 150, render: (_: unknown, row: ActivityLogView) => formatDateTime(row.createdAt) },
          { title: 'Dịch vụ', width: 130, render: (_: unknown, row: ActivityLogView) => <Tag>{ACTIVITY_MODULE_LABEL[row.module] ?? row.module}</Tag> },
          { title: 'Người thao tác', width: 160, render: (_: unknown, row: ActivityLogView) => <div>{row.actorName ?? 'Hệ thống'}{row.onBehalfOfName && <div className="text-xs text-orange-600">Làm thay cho {row.onBehalfOfName}</div>}</div> },
          { title: 'Nội dung', render: (_: unknown, row: ActivityLogView) => <div className="max-w-2xl whitespace-pre-wrap">{row.summary}</div> }
        ]}
      />
    </div>
  );
}
