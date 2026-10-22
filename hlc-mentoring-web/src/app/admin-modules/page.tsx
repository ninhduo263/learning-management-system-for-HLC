'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, App, Button, Card, Divider, Empty, Form, Input, InputNumber, Modal, Popconfirm, Progress, Select, Space, Switch, Table, Tabs, Tag, Typography
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import RecapGradingPanel from '@/components/RecapGradingPanel';
import SubmissionData from '@/components/SubmissionData';
import { errorMessage } from '@/lib/api';
import { formatDateTime } from '@/services/mentoringApi';
import {
  CYCLE_LABEL, FIELD_TYPE_LABEL, SUBMISSION_STATUS_COLOR, SUBMISSION_STATUS_LABEL, accessApi, departmentApi, learningApi, points,
  type Department, type LearningModule, type LibraryItem, type ModuleConfigInput, type ModuleProgress, type SubmissionView
} from '@/services/hlcApi';

const TARGET_LABEL = { MENTEE: 'Mentee', MENTOR: 'Mentor', ALL: 'Tất cả' };

export default function AdminModulesPage() {
  const { message } = App.useApp();
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('review');
  const [moduleId, setModuleId] = useState<string>('');
  const [editing, setEditing] = useState<LearningModule | 'new' | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    try {
      const [list, access] = await Promise.all([learningApi.modules(), accessApi.mine()]);
      setModules(list);
      setIsSuperAdmin(access.isSuperAdmin);
      setModuleId((current) => current || list.find((item) => item.pendingReviews)?._id || list[0]?._id || '');
      if (access.isSuperAdmin) setDepartments(await departmentApi.many());
    } catch (error) {
      message.error(errorMessage(error, 'Không tải được module'));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);

  const openEditor = (module?: LearningModule) => {
    form.resetFields();
    form.setFieldsValue(module
      ? { ...module, fields: module.fields.map((field) => ({ ...field, options: field.options ?? [] })), criteria: module.criteria }
      : { cycleType: 'MONTHLY', targetMemberType: 'MENTEE', minSubmissionsPerCycle: 1, requireReview: true, enableScoring: true, maxScore: 100, isActive: true, fields: [{ key: 'content', label: 'Nội dung', fieldType: 'LONG_TEXT', isRequired: true }], criteria: [] });
    setEditing(module ?? 'new');
  };

  const saveModule = async (values: ModuleConfigInput) => {
    setSaving(true);
    try {
      const body: ModuleConfigInput = {
        ...values,
        maxSubmissionsPerCycle: values.maxSubmissionsPerCycle || undefined,
        libraryType: values.libraryType || undefined,
        departmentId: values.departmentId || undefined,
        fields: (values.fields ?? []).map((field) => ({ ...field, options: ['SELECT', 'MULTI_SELECT'].includes(String(field.fieldType)) ? field.options : undefined })),
        criteria: values.criteria ?? []
      };
      if (editing && editing !== 'new') await learningApi.updateModule(editing._id, body);
      else await learningApi.createModule(body);
      message.success('Đã lưu module');
      setEditing(null);
      await load();
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const current = modules.find((item) => item._id === moduleId);
  const moduleSelect = (
    <Select className="min-w-64" value={moduleId || undefined} onChange={setModuleId} placeholder="Chọn module"
      options={modules.map((item) => ({ value: item._id, label: `${item.name}${item.pendingReviews ? ` (${item.pendingReviews} chờ duyệt)` : ''}` }))} />
  );

  const moduleTab = (
    <div className="space-y-3">
      {isSuperAdmin && <div className="flex justify-end"><Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>Tạo module</Button></div>}
      <Table<LearningModule>
        rowKey="_id"
        size="small"
        loading={loading}
        dataSource={modules}
        scroll={{ x: 'max-content' }}
        pagination={false}
        columns={[
          { title: 'Mã', dataIndex: 'code', width: 150 },
          { title: 'Tên module', render: (_: unknown, row: LearningModule) => <div><strong>{row.name}</strong>{row.isRecapModule && <Tag color="purple" className="ml-2">Liên kết recap mentoring</Tag>}{row.description && <div className="text-xs text-gray-500 line-clamp-1">{row.description}</div>}</div> },
          { title: 'Chu kỳ', render: (_: unknown, row: LearningModule) => `${CYCLE_LABEL[row.cycleType]}${row.minSubmissionsPerCycle ? ` · tối thiểu ${row.minSubmissionsPerCycle}` : ''}${row.maxSubmissionsPerCycle ? ` · tối đa ${row.maxSubmissionsPerCycle}` : ''}` },
          { title: 'Đối tượng', render: (_: unknown, row: LearningModule) => TARGET_LABEL[row.targetMemberType] },
          { title: 'Trường', render: (_: unknown, row: LearningModule) => <div className="flex max-w-xs flex-wrap gap-1">{row.fields.map((field) => <Tag key={field._id}>{field.label}</Tag>)}</div> },
          { title: 'Chấm điểm', render: (_: unknown, row: LearningModule) => row.enableScoring ? `Thang ${row.maxScore}${row.criteria.length ? ` · ${row.criteria.length} tiêu chí` : ''}` : 'Không' },
          { title: 'Chờ duyệt', dataIndex: 'pendingReviews', render: (value: number, row: LearningModule) => value ? <Button size="small" type="link" onClick={() => { setModuleId(row._id); setTab('review'); }}>{value} bài</Button> : 0 },
          { title: 'Trạng thái', dataIndex: 'isActive', render: (value: boolean) => value ? <Tag color="green">Đang mở</Tag> : <Tag>Tạm tắt</Tag> },
          { title: '', render: (_: unknown, row: LearningModule) => <Button size="small" icon={<EditOutlined />} onClick={() => openEditor(row)}>Sửa</Button> }
        ]}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <Typography.Title level={3} className="!mb-0">Học tập</Typography.Title>
      {!loading && !modules.length && <Card><Empty description="Bạn chưa được giao module nào" /></Card>}
      {modules.length > 0 && (
        <Card>
          <Tabs activeKey={tab} onChange={setTab} items={[
            {
              key: 'review',
              label: 'Duyệt & chấm bài',
              children: current?.isRecapModule
                ? <RecapGradingPanel key={current._id} extra={moduleSelect} />
                : current ? <ReviewPanel key={current._id} module={current} moduleSelect={moduleSelect} onChanged={load} /> : null
            },
            {
              key: 'progress',
              label: 'Tiến độ',
              children: current?.isRecapModule
                ? <div className="space-y-2">{moduleSelect}<Alert type="info" showIcon title="Recap mentoring theo dõi ở trang Ghép cặp mentoring (trạng thái nộp) và Nhóm của Leader." /></div>
                : current ? <ProgressPanel key={current._id} module={current} moduleSelect={moduleSelect} /> : null
            },
            { key: 'modules', label: 'Cấu hình module', children: moduleTab },
            { key: 'library', label: 'Thư viện sách & tài liệu', children: <LibraryPanel /> }
          ]} />
        </Card>
      )}

      <Modal title={editing && editing !== 'new' ? `Sửa module ${editing.code}` : 'Tạo module mới'} open={Boolean(editing)} onCancel={() => setEditing(null)} onOk={() => form.submit()} confirmLoading={saving} width={820} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={saveModule}>
          <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
            <Form.Item name="name" label="Tên module" rules={[{ required: true, message: 'Nhập tên' }]}><Input /></Form.Item>
            <Form.Item name="departmentId" label="Ban phụ trách"><Select allowClear options={departments.map((item) => ({ value: item._id, label: item.name }))} /></Form.Item>
            <Form.Item name="cycleType" label="Chu kỳ nộp" rules={[{ required: true }]}><Select options={Object.entries(CYCLE_LABEL).map(([value, label]) => ({ value, label }))} /></Form.Item>
            <Form.Item name="targetMemberType" label="Dành cho"><Select options={Object.entries(TARGET_LABEL).map(([value, label]) => ({ value, label }))} /></Form.Item>
            <Form.Item name="minSubmissionsPerCycle" label="Số bài tối thiểu / chu kỳ"><InputNumber className="w-full" min={0} /></Form.Item>
            <Form.Item name="maxSubmissionsPerCycle" label="Số bài tối đa / chu kỳ (trống = không giới hạn)"><InputNumber className="w-full" min={1} /></Form.Item>
            <Form.Item name="libraryType" label="Thư viện dùng cho trường “Sách/tài liệu”"><Select allowClear options={[{ value: 'BOOK', label: 'Sách' }, { value: 'DOCUMENT', label: 'Tài liệu' }]} /></Form.Item>
            <Form.Item name="maxScore" label="Thang điểm"><InputNumber className="w-full" min={1} /></Form.Item>
          </div>
          <Form.Item name="description" label="Mô tả / hướng dẫn"><Input.TextArea rows={2} /></Form.Item>
          <Space wrap size="large">
            <Form.Item name="requireReview" label="Cần duyệt" valuePropName="checked"><Switch /></Form.Item>
            <Form.Item name="enableScoring" label="Chấm điểm" valuePropName="checked"><Switch /></Form.Item>
            <Form.Item name="isActive" label="Đang mở" valuePropName="checked"><Switch /></Form.Item>
          </Space>

          <Divider titlePlacement="start">Trường trong form nộp bài</Divider>
          <Form.List name="fields">
            {(items, { add, remove, move }) => (
              <div className="space-y-2">
                {items.map(({ key, name }, index) => (
                  <Card key={key} size="small" className="bg-gray-50">
                    <Form.Item name={[name, '_id']} hidden><Input /></Form.Item>
                    <div className="grid grid-cols-1 gap-x-2 sm:grid-cols-12">
                      <Form.Item className="sm:col-span-3" name={[name, 'label']} label="Nhãn" rules={[{ required: true, message: 'Nhập nhãn' }]}><Input /></Form.Item>
                      <Form.Item className="sm:col-span-3" name={[name, 'key']} label="Mã (a-z, 0-9)" rules={[{ required: true, pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/, message: 'Chữ không dấu, bắt đầu bằng chữ' }]}><Input /></Form.Item>
                      <Form.Item className="sm:col-span-3" name={[name, 'fieldType']} label="Kiểu" rules={[{ required: true }]}><Select options={Object.entries(FIELD_TYPE_LABEL).map(([value, label]) => ({ value, label }))} /></Form.Item>
                      <div className="flex items-center gap-3 sm:col-span-3">
                        <Form.Item name={[name, 'isRequired']} label="Bắt buộc" valuePropName="checked"><Switch size="small" /></Form.Item>
                        <Form.Item name={[name, 'isUnique']} label="Chặn trùng" valuePropName="checked"><Switch size="small" /></Form.Item>
                      </div>
                      <Form.Item noStyle shouldUpdate>
                        {() => ['SELECT', 'MULTI_SELECT'].includes(form.getFieldValue(['fields', name, 'fieldType']))
                          ? <Form.Item className="sm:col-span-12" name={[name, 'options']} label="Các lựa chọn (gõ rồi Enter)"><Select mode="tags" /></Form.Item>
                          : null}
                      </Form.Item>
                    </div>
                    <Space size="small">
                      <Button size="small" disabled={index === 0} onClick={() => move(index, index - 1)}>↑</Button>
                      <Button size="small" disabled={index === items.length - 1} onClick={() => move(index, index + 1)}>↓</Button>
                      <Button size="small" danger icon={<DeleteOutlined />} onClick={() => remove(name)}>Bỏ trường</Button>
                    </Space>
                  </Card>
                ))}
                <Button block icon={<PlusOutlined />} onClick={() => add({ fieldType: 'TEXT', isRequired: false })}>Thêm trường</Button>
              </div>
            )}
          </Form.List>

          <Divider titlePlacement="start">Tiêu chí chấm (tổng quy về thang điểm)</Divider>
          <Form.List name="criteria">
            {(items, { add, remove }) => (
              <div className="space-y-2">
                {items.map(({ key, name }) => (
                  <div key={key} className="flex flex-wrap items-start gap-2">
                    <Form.Item name={[name, '_id']} hidden><Input /></Form.Item>
                    <Form.Item className="!mb-0 flex-1" name={[name, 'name']} rules={[{ required: true, message: 'Tên tiêu chí' }]}><Input placeholder="Tên tiêu chí" /></Form.Item>
                    <Form.Item className="!mb-0 w-32" name={[name, 'maxScore']} rules={[{ required: true, message: 'Điểm tối đa' }]}><InputNumber className="w-full" min={0} placeholder="Tối đa" /></Form.Item>
                    <Button danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
                  </div>
                ))}
                <Button block icon={<PlusOutlined />} onClick={() => add({ maxScore: 10 })}>Thêm tiêu chí</Button>
                <Typography.Text type="secondary" className="text-xs">Không có tiêu chí: người chấm nhập thẳng điểm tổng.</Typography.Text>
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
}

function ReviewPanel({ module, moduleSelect, onChanged }: { module: LearningModule; moduleSelect: React.ReactNode; onChanged: () => void }) {
  const { message } = App.useApp();
  const [status, setStatus] = useState('PENDING');
  const [rows, setRows] = useState<SubmissionView[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewing, setReviewing] = useState<SubmissionView | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await learningApi.submissions(module._id, { status: status === 'ALL' ? undefined : status }));
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [module._id, status, message]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);

  const open = (row: SubmissionView) => {
    form.resetFields();
    form.setFieldsValue({
      feedback: row.feedback ?? '',
      totalScore: row.totalScore ?? undefined,
      scores: Object.fromEntries(module.criteria.map((criterion) => [criterion._id, row.scores.find((score) => score.criterionId === criterion._id)?.score]))
    });
    setReviewing(row);
  };

  const submit = async (approve: boolean) => {
    if (!reviewing) return;
    const values = form.getFieldsValue();
    if (!approve && !values.feedback?.trim()) {
      message.warning('Nhập nhận xét để thành viên biết lý do');
      return;
    }
    setSaving(true);
    try {
      await learningApi.review(reviewing._id, {
        status: approve ? 'APPROVED' : 'REJECTED',
        feedback: values.feedback,
        scores: module.criteria.length ? module.criteria.map((criterion) => ({ criterionId: criterion._id, score: Number(values.scores?.[criterion._id] ?? 0) })) : undefined,
        totalScore: !module.criteria.length && values.totalScore !== undefined ? Number(values.totalScore) : undefined
      });
      message.success(approve ? 'Đã duyệt bài' : 'Đã trả bài');
      setReviewing(null);
      await load();
      onChanged();
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {moduleSelect}
        <Select className="w-40" value={status} onChange={setStatus} options={[{ value: 'PENDING', label: 'Chờ duyệt' }, { value: 'APPROVED', label: 'Đã duyệt' }, { value: 'REJECTED', label: 'Đã trả' }, { value: 'ALL', label: 'Tất cả' }]} />
      </div>
      <Table<SubmissionView>
        rowKey="_id"
        size="small"
        loading={loading}
        dataSource={rows}
        scroll={{ x: 'max-content' }}
        onRow={(row) => ({ onClick: () => open(row), className: 'cursor-pointer' })}
        columns={[
          { title: 'Thành viên', render: (_: unknown, row: SubmissionView) => <div><strong>{row.member?.fullName}</strong><div className="text-xs text-gray-500">{row.member?.memberCode}</div></div> },
          { title: 'Kỳ', dataIndex: 'cycleKey' },
          { title: 'Nộp lúc', render: (_: unknown, row: SubmissionView) => formatDateTime(row.submittedAt) },
          { title: 'Tóm tắt', render: (_: unknown, row: SubmissionView) => <span className="line-clamp-1 max-w-xs">{row.libraryItem?.title ?? String(Object.values(row.data ?? {}).find((value) => typeof value === 'string') ?? '')}</span> },
          { title: 'Trạng thái', render: (_: unknown, row: SubmissionView) => <Tag color={SUBMISSION_STATUS_COLOR[row.reviewStatus]}>{SUBMISSION_STATUS_LABEL[row.reviewStatus]}</Tag> },
          { title: 'Điểm', render: (_: unknown, row: SubmissionView) => row.totalScore !== null ? `${points(row.totalScore)}/${module.maxScore}` : '—' }
        ]}
      />
      <Modal title={reviewing ? `${reviewing.member?.fullName} · ${reviewing.cycleKey}` : ''} open={Boolean(reviewing)} onCancel={() => setReviewing(null)} width={720} footer={(
        <Space>
          <Button onClick={() => setReviewing(null)}>Đóng</Button>
          <Button danger loading={saving} onClick={() => submit(false)}>Trả bài</Button>
          <Button type="primary" loading={saving} onClick={() => submit(true)}>Duyệt{module.enableScoring ? ' & chấm' : ''}</Button>
        </Space>
      )} destroyOnHidden>
        {reviewing && (
          <div className="space-y-4">
            <SubmissionData fields={module.fields} submission={reviewing} />
            <Divider className="!my-2" />
            <Form form={form} layout="vertical">
              {module.enableScoring && module.criteria.map((criterion) => (
                <Form.Item key={criterion._id} name={['scores', criterion._id]} label={`${criterion.name} (tối đa ${criterion.maxScore})`} rules={[{ type: 'number', min: 0, max: criterion.maxScore }]}>
                  <InputNumber className="w-full" min={0} max={criterion.maxScore} step={0.5} />
                </Form.Item>
              ))}
              {module.enableScoring && !module.criteria.length && (
                <Form.Item name="totalScore" label={`Điểm (0–${module.maxScore})`}><InputNumber className="w-full" min={0} max={module.maxScore} step={0.5} /></Form.Item>
              )}
              <Form.Item name="feedback" label="Nhận xét"><Input.TextArea rows={3} /></Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ProgressPanel({ module, moduleSelect }: { module: LearningModule; moduleSelect: React.ReactNode }) {
  const { message } = App.useApp();
  const [cycleKey, setCycleKey] = useState('');
  const [data, setData] = useState<ModuleProgress | null>(null);

  useEffect(() => {
    let active = true;
    learningApi.progress(module._id, cycleKey || undefined)
      .then((result) => { if (active) setData(result); })
      .catch((error) => message.error(errorMessage(error)));
    return () => { active = false; };
  }, [module._id, cycleKey, message]);

  const sorted = useMemo(() => [...(data?.members ?? [])].sort((a, b) => Number(a.reached) - Number(b.reached) || a.submitted - b.submitted), [data]);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {moduleSelect}
        <Input.Search className="max-w-56" placeholder={data?.cycleKey ?? 'Kỳ (vd 2026-W43)'} allowClear onSearch={setCycleKey} />
      </div>
      {data && <Alert type={data.totals.reached === data.totals.members ? 'success' : 'warning'} showIcon title={`Kỳ ${data.cycleKey}: ${data.totals.reached}/${data.totals.members} thành viên đạt tối thiểu ${data.min} bài`} />}
      <Table
        rowKey={(row) => row.member._id}
        size="small"
        dataSource={sorted}
        pagination={{ pageSize: 30 }}
        columns={[
          { title: 'Thành viên', render: (_: unknown, row: ModuleProgress['members'][number]) => <div>{row.member.fullName}<div className="text-xs text-gray-500">{row.member.memberCode}</div></div> },
          { title: 'Đã nộp', dataIndex: 'submitted' },
          { title: 'Đã duyệt', dataIndex: 'approved' },
          { title: 'Tiến độ', width: 220, render: (_: unknown, row: ModuleProgress['members'][number]) => <Progress size="small" percent={Math.min(100, Math.round((row.submitted / Math.max(1, data?.min || data?.max || 1)) * 100))} status={row.reached ? 'success' : 'exception'} /> }
        ]}
      />
    </div>
  );
}

function LibraryPanel() {
  const { message } = App.useApp();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [editing, setEditing] = useState<LibraryItem | 'new' | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    try {
      setItems(await learningApi.libraryAll());
    } catch (error) {
      message.error(errorMessage(error));
    }
  }, [message]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);

  const save = async (values: Partial<LibraryItem>) => {
    setSaving(true);
    try {
      await learningApi.saveLibraryItem(values, editing && editing !== 'new' ? editing._id : undefined);
      message.success('Đã lưu');
      setEditing(null);
      await load();
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); form.setFieldsValue({ libraryType: 'BOOK', isActive: true }); setEditing('new'); }}>Thêm sách / tài liệu</Button></div>
      <Table<LibraryItem>
        rowKey="_id"
        size="small"
        dataSource={items}
        scroll={{ x: 'max-content' }}
        columns={[
          { title: 'Loại', dataIndex: 'libraryType', render: (value: string) => <Tag color={value === 'BOOK' ? 'purple' : 'blue'}>{value === 'BOOK' ? 'Sách' : 'Tài liệu'}</Tag> },
          { title: 'Tên', dataIndex: 'title' },
          { title: 'Tác giả', dataIndex: 'author' },
          { title: 'Thể loại', dataIndex: 'category' },
          { title: 'Link', render: (_: unknown, row: LibraryItem) => (row.fileUrl || row.externalUrl) ? <a href={row.fileUrl || row.externalUrl || ''} target="_blank" rel="noreferrer">Mở</a> : '—' },
          { title: 'Hiển thị', dataIndex: 'isActive', render: (value: boolean) => value ? <Tag color="green">Có</Tag> : <Tag>Ẩn</Tag> },
          {
            title: '', render: (_: unknown, row: LibraryItem) => (
              <Space>
                <Button size="small" onClick={() => { form.setFieldsValue(row); setEditing(row); }}>Sửa</Button>
                <Popconfirm title="Xóa mục này? (đã có bài nộp thì chỉ ẩn)" onConfirm={async () => { try { const result = await learningApi.removeLibraryItem(row._id); message.success(result.deleted ? 'Đã xóa' : 'Đã ẩn (đã có bài nộp dùng sách này)'); await load(); } catch (error) { message.error(errorMessage(error)); } }}>
                  <Button size="small" danger>Xóa</Button>
                </Popconfirm>
              </Space>
            )
          }
        ]}
      />
      <Modal title={editing && editing !== 'new' ? 'Sửa' : 'Thêm vào thư viện'} open={Boolean(editing)} onCancel={() => setEditing(null)} onOk={() => form.submit()} confirmLoading={saving} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item name="libraryType" label="Loại" rules={[{ required: true }]}><Select options={[{ value: 'BOOK', label: 'Sách' }, { value: 'DOCUMENT', label: 'Tài liệu' }]} /></Form.Item>
          <Form.Item name="title" label="Tên" rules={[{ required: true, message: 'Nhập tên' }]}><Input /></Form.Item>
          <Form.Item name="author" label="Tác giả"><Input /></Form.Item>
          <Form.Item name="category" label="Thể loại"><Input /></Form.Item>
          <Form.Item name="externalUrl" label="Link (Drive, website...)"><Input placeholder="https://" /></Form.Item>
          <Form.Item name="description" label="Mô tả"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="isActive" label="Hiển thị cho thành viên" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
