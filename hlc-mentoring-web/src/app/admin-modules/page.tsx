'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, App, Button, Card, Divider, Empty, Form, Input, InputNumber, Modal, Popconfirm, Progress, Radio, Select, Space, Switch, Table, Tabs, Tag, Typography, Upload
} from 'antd';
import { DeleteOutlined, DownloadOutlined, EditOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import ModuleAudienceModal from '@/components/ModuleAudienceModal';
import ModuleAdminsModal from '@/components/ModuleAdminsModal';
import RecapGradingPanel from '@/components/RecapGradingPanel';
import SubmissionData from '@/components/SubmissionData';
import { errorMessage } from '@/lib/api';
import { formatDateTime } from '@/services/mentoringApi';
import {
  CYCLE_LABEL, FIELD_TYPE_LABEL, GROUP_KIND_LABEL, SUBMISSION_STATUS_COLOR, SUBMISSION_STATUS_LABEL, accessApi, departmentApi, learningApi, memberDirectoryApi, points,
  type Department, type DirectoryMember, type GroupKind, type LearningModule, type LibraryImportResult, type LibraryItem, type ModuleConfigInput, type ModuleProgress, type SubmissionView
} from '@/services/hlcApi';

const TARGET_LABEL = { MENTEE: 'Mentee', MENTOR: 'Mentor', ALL: 'Tất cả' };

export default function AdminModulesPage() {
  const { message } = App.useApp();
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [canCreate, setCanCreate] = useState(false);
  // Module được cấu hình (sửa, gán đối tượng): Trưởng ban Học tập / Admin: tất cả; Admin module nhỏ: module của mình; Trưởng ban MTE: không
  const [configurableIds, setConfigurableIds] = useState<string[]>([]);
  const [audienceOf, setAudienceOf] = useState<LearningModule | null>(null);
  const [adminsOf, setAdminsOf] = useState<LearningModule | null>(null);
  const [directory, setDirectory] = useState<DirectoryMember[]>([]);
  const [directoryGroups, setDirectoryGroups] = useState<{ _id: string; name: string; groupKind: GroupKind }[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('review');
  const [moduleId, setModuleId] = useState<string>('');
  const [editing, setEditing] = useState<LearningModule | 'new' | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const audienceMode = Form.useWatch('audienceMode', form) as 'ALL' | 'SELECTED' | undefined;
  const targetType = Form.useWatch('targetMemberType', form) as string | undefined;

  const load = useCallback(async () => {
    try {
      const [list, access] = await Promise.all([learningApi.modules(), accessApi.mine()]);
      setModules(list);
      const configureAll = access.isSuperAdmin || access.writeScopes.includes('LEARNING');
      setCanCreate(configureAll);
      setConfigurableIds(configureAll ? list.map((item) => item._id) : Array.isArray(access.moduleIds) ? access.moduleIds : []);
      setModuleId((current) => current || list.find((item) => item.pendingReviews)?._id || list[0]?._id || '');
      if (access.isSuperAdmin) setDepartments(await departmentApi.many());
      if (access.isSuperAdmin || access.scopes.includes('LEARNING')) {
        const [people, groups] = await Promise.all([memberDirectoryApi.list(), memberDirectoryApi.groups()]);
        setDirectory(people.filter((item) => item.status === 'ACTIVE'));
        setDirectoryGroups(groups);
      }
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
      : { audienceMode: 'ALL', cycleType: 'MONTHLY', targetMemberType: 'MENTEE', minSubmissionsPerCycle: 1, requireReview: true, enableScoring: true, maxScore: 100, isActive: true, fields: [{ key: 'content', label: 'Nội dung', fieldType: 'LONG_TEXT', isRequired: true }], criteria: [] });
    setEditing(module ?? 'new');
  };

  const saveModule = async (values: ModuleConfigInput) => {
    setSaving(true);
    try {
      const { audienceMode, audienceGroupIds, audienceMemberIds, adminMemberIds, ...config } = values as ModuleConfigInput & {
        audienceMode?: 'ALL' | 'SELECTED'; audienceGroupIds?: string[]; audienceMemberIds?: string[];
      };
      const creating = !editing || editing === 'new';
      if (creating && audienceMode === 'SELECTED' && !audienceGroupIds?.length && !audienceMemberIds?.length) {
        message.error('Chọn ít nhất một người hoặc một nhóm được gán, hoặc chuyển sang "Mọi thành viên đúng đối tượng"');
        setSaving(false);
        return;
      }
      const body: ModuleConfigInput = {
        ...config,
        ...(creating && {
          audience: { mode: audienceMode ?? 'ALL', memberIds: audienceMemberIds ?? [], groupIds: audienceGroupIds ?? [] },
          adminMemberIds: adminMemberIds ?? []
        }),
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
      {canCreate && <div className="flex justify-end"><Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>Tạo module</Button></div>}
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
          {
            title: 'Đối tượng', render: (_: unknown, row: LearningModule) => (
              <div>
                {TARGET_LABEL[row.targetMemberType]}
                {!row.isRecapModule && (
                  <div>
                    <Button size="small" type="link" className="!px-0" disabled={!configurableIds.includes(row._id)} onClick={() => setAudienceOf(row)}>
                      {row.audienceMode === 'SELECTED' ? <Tag color="orange">Chỉ người được gán</Tag> : 'Gán cho người cụ thể'}
                    </Button>
                  </div>
                )}
              </div>
            )
          },
          { title: 'Trường', render: (_: unknown, row: LearningModule) => <div className="flex max-w-xs flex-wrap gap-1">{row.fields.map((field) => <Tag key={field._id}>{field.label}</Tag>)}</div> },
          { title: 'Chấm điểm', render: (_: unknown, row: LearningModule) => row.enableScoring ? `Thang ${row.maxScore}${row.criteria.length ? ` · ${row.criteria.length} tiêu chí` : ''}` : 'Không' },
          {
            title: 'Admin module', render: (_: unknown, row: LearningModule) => row.isRecapModule ? '—' : (
              <div>
                {(row.adminMembers ?? []).length
                  ? <div className="flex max-w-56 flex-wrap gap-1">{(row.adminMembers ?? []).map((item) => <Tag key={item._id} color="blue" className="!m-0">{item.fullName}</Tag>)}</div>
                  : <span className="text-gray-500">Chưa có</span>}
                {canCreate && <Button size="small" type="link" className="!px-0" onClick={() => setAdminsOf(row)}>Chỉ định</Button>}
              </div>
            )
          },
          { title: 'Chờ duyệt', dataIndex: 'pendingReviews', render: (value: number, row: LearningModule) => value ? <Button size="small" type="link" onClick={() => { setModuleId(row._id); setTab('review'); }}>{value} bài</Button> : 0 },
          { title: 'Trạng thái', dataIndex: 'isActive', render: (value: boolean) => value ? <Tag color="green">Đang mở</Tag> : <Tag>Tạm tắt</Tag> },
          { title: '', render: (_: unknown, row: LearningModule) => configurableIds.includes(row._id) ? <Button size="small" icon={<EditOutlined />} onClick={() => openEditor(row)}>Sửa</Button> : <Tag>Chỉ xem và duyệt bài</Tag> }
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

      <ModuleAudienceModal module={audienceOf} onClose={() => setAudienceOf(null)} onSaved={() => void load()} />
      <ModuleAdminsModal module={adminsOf} onClose={() => setAdminsOf(null)} onSaved={() => void load()} />
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

          {editing === 'new' && (
            <>
              <Divider titlePlacement="start">Đối tượng áp dụng</Divider>
              <Form.Item name="audienceMode" label="Ai thấy và nộp module này">
                <Radio.Group>
                  <Radio value="ALL">Mọi thành viên đúng đối tượng</Radio>
                  <Radio value="SELECTED">Chỉ MTE / MTO được chọn (riêng lẻ hoặc theo nhóm)</Radio>
                </Radio.Group>
              </Form.Item>
              {audienceMode === 'SELECTED' && (
                <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
                  <Form.Item name="audienceGroupIds" label="Theo nhóm (mọi thành viên hiện tại)">
                    <Select mode="multiple" optionFilterProp="label" options={directoryGroups.map((item) => ({ value: item._id, label: `${item.name} (${GROUP_KIND_LABEL[item.groupKind]})` }))} />
                  </Form.Item>
                  <Form.Item name="audienceMemberIds" label="Từng người" extra={targetType === 'ALL' ? 'Chọn được cả MTE và MTO trong cùng một module' : undefined}>
                    <Select mode="multiple" optionFilterProp="label" options={directory.filter((item) => targetType === 'ALL' || item.memberType === targetType).map((item) => ({ value: item._id, label: `${item.memberCode} – ${item.fullName}` }))} />
                  </Form.Item>
                </div>
              )}
              <Typography.Text type="secondary" className="text-xs">Người không được gán hoàn toàn không thấy module và không bị tính thiếu bài. Thêm / bớt người sau khi module đã mở được; bài đã nộp giữ nguyên.</Typography.Text>
              <Divider titlePlacement="start">Admin module (chức vụ riêng của module)</Divider>
              <Form.Item name="adminMemberIds" label="Người giữ chức vụ Admin module" extra="Chỉ quản lý đúng module này, không thấy module khác. Chức vụ đặt tên theo module, ví dụ “Admin module Đọc sách”.">
                <Select mode="multiple" optionFilterProp="label" options={directory.map((item) => ({ value: item._id, label: `${item.memberCode} – ${item.fullName}` }))} />
              </Form.Item>
            </>
          )}

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
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ file: File; result: LibraryImportResult } | null>(null);
  const checkImport = async (file: File) => {
    setImporting(true);
    try {
      setImportResult({ file, result: await learningApi.importLibrary(file, true) });
    } catch (error) {
      message.error(errorMessage(error, 'Không đọc được file'));
    } finally {
      setImporting(false);
    }
  };
  const applyImport = async () => {
    if (!importResult) return;
    setImporting(true);
    try {
      const result = await learningApi.importLibrary(importResult.file, false);
      message.success(`Đã thêm ${result.added.length} mục vào thư viện`);
      setImportResult(null);
      await load();
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setImporting(false);
    }
  };
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
      <div className="flex flex-wrap justify-end gap-2">
        <Button icon={<DownloadOutlined />} onClick={() => learningApi.exportLibrary().catch((error) => message.error(errorMessage(error)))}>Xuất .xlsx</Button>
        <Upload accept=".xlsx" showUploadList={false} beforeUpload={(file) => { void checkImport(file); return Upload.LIST_IGNORE; }}>
          <Button icon={<UploadOutlined />} loading={importing}>Nhập .xlsx</Button>
        </Upload>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); form.setFieldsValue({ libraryType: 'BOOK', isActive: true }); setEditing('new'); }}>Thêm sách / tài liệu</Button>
      </div>
      <Typography.Text type="secondary" className="text-xs">File nhập: xuất file mẫu rồi điền; cột “Link Google Drive (PDF)” cần dạng https://drive.google.com/file/d/… Sách trùng tên + tác giả (không phân biệt dấu) hoặc trùng link sẽ được cảnh báo và bỏ qua.</Typography.Text>
      <Modal
        title={`Nhập thư viện: ${importResult?.file.name ?? ''}`}
        open={Boolean(importResult)}
        onCancel={() => setImportResult(null)}
        okText={`Thêm ${importResult?.result.added.length ?? 0} mục`}
        okButtonProps={{ disabled: !importResult?.result.added.length }}
        confirmLoading={importing}
        onOk={applyImport}
        width="min(860px, calc(100vw - 24px))"
        destroyOnHidden
      >
        {importResult && (
          <div className="space-y-3">
            <Alert type={importResult.result.errors.length ? 'warning' : 'success'} showIcon title={`${importResult.result.added.length} mục hợp lệ sẽ được thêm · ${importResult.result.duplicates.length} trùng (bỏ qua) · ${importResult.result.errors.length} dòng lỗi`} />
            {importResult.result.errors.length > 0 && <Alert type="error" showIcon title="Dòng lỗi (không thêm)" description={<ul className="ml-4 list-disc">{importResult.result.errors.map((item) => <li key={`${item.row}-${item.message}`}>Dòng {item.row}: {item.message}</li>)}</ul>} />}
            {importResult.result.duplicates.length > 0 && <Alert type="warning" showIcon title="Sách trùng" description={<ul className="ml-4 list-disc">{importResult.result.duplicates.map((item) => <li key={item.row}>Dòng {item.row}: {item.title}: {item.message}</li>)}</ul>} />}
            <Table rowKey="row" size="small" pagination={false} dataSource={importResult.result.added} columns={[
              { title: 'Dòng', dataIndex: 'row' },
              { title: 'Loại', dataIndex: 'libraryType', render: (value: string) => value === 'BOOK' ? 'Sách' : 'Tài liệu' },
              { title: 'Tên', dataIndex: 'title' },
              { title: 'Tác giả', dataIndex: 'author' },
              { title: 'Drive', dataIndex: 'fileUrl', render: (value: string | null) => value ? <a href={value} target="_blank" rel="noreferrer">Mở</a> : '—' }
            ]} />
          </div>
        )}
      </Modal>
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
