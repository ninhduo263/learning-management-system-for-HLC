'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, App, Button, Card, DatePicker, Empty, Form, Input, InputNumber, Modal, Segmented, Select, Space, Table, Tag, Typography } from 'antd';
import { PlusOutlined, UserAddOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import FileThumbs from '@/components/FileThumbs';
import ImageUpload, { type UploadedImage } from '@/components/ImageUpload';
import MonthPicker, { currentPeriodCode } from '@/components/MonthPicker';
import { errorMessage } from '@/lib/api';
import { formatDateTime } from '@/services/mentoringApi';
import {
  FUND_CYCLE_LABEL, FUND_STATUS_COLOR, FUND_STATUS_LABEL, GROUP_KIND_LABEL, WEEK_STATUS_COLOR, WEEK_STATUS_LABEL, formatDate, fundApi, money,
  type ContributionView, type FundCycle, type FundGroupReport as Report, type GroupKind
} from '@/services/hlcApi';
import { getCurrentTime } from '@/utils/time';

type Group = Report['groups'][number];
type Row = Group['members'][number];
const weekLabel = (week: { weekKey: string; from: string; to: string }) => `${week.weekKey.slice(-3)} (${formatDate(week.from).slice(0, 5)}–${formatDate(week.to).slice(0, 5)})`;
const payerTag = (type?: string) => type === 'EXTERNAL' ? <Tag color="gold">Thầy cô</Tag> : type === 'MENTOR' ? <Tag color="blue">MTO</Tag> : <Tag color="green">MTE</Tag>;

interface ProxyValues { payer: string; contributionDate: Dayjs; amount: number; cycleType: FundCycle; coverUntil?: Dayjs; note?: string; images: UploadedImage[] }

/** Báo cáo quỹ theo nhóm và tuần. Leader/Phó: quan sát, duyệt, nộp hộ nhóm mình; Admin HLC Fund: toàn bộ */
export default function FundGroupReport({ showKindFilter = false }: { showKindFilter?: boolean }) {
  const { message } = App.useApp();
  const [code, setCode] = useState(() => currentPeriodCode(getCurrentTime()));
  const [kind, setKind] = useState<GroupKind | 'ALL'>('ALL');
  const [groupId, setGroupId] = useState<string>('');
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState<{ title: string; ids: string[]; canReview: boolean } | null>(null);
  const [rejecting, setRejecting] = useState<string[] | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [proxyGroup, setProxyGroup] = useState<Group | null>(null);
  const [contributorGroup, setContributorGroup] = useState<Group | null>(null);
  const [proxyForm] = Form.useForm<ProxyValues>();
  const [contributorForm] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fundApi.groupReport({ period: code, kind: kind === 'ALL' ? undefined : kind }));
    } catch (error) {
      message.error(errorMessage(error, 'Không tải được báo cáo quỹ'));
    } finally {
      setLoading(false);
    }
  }, [code, kind, message]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);

  const review = async (ids: string[], status: 'DONE' | 'NOT_DONE', reviewNote?: string) => {
    setSaving(true);
    try {
      const result = await fundApi.groupReview(ids, status, reviewNote);
      message.success(`Đã cập nhật ${result.updated} minh chứng: ${status === 'DONE' ? 'Đã xong' : 'Chưa xong'}`);
      setRejecting(null);
      setNote('');
      await load();
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const submitProxy = async (values: ProxyValues) => {
    if (!proxyGroup) return;
    const payer = proxyGroup.members.find((row) => row.member._id === values.payer)?.member;
    setSaving(true);
    try {
      await fundApi.proxySubmit({
        ...(payer?.memberType === 'EXTERNAL' ? { contributorId: values.payer } : { memberId: values.payer }),
        contributionDate: values.contributionDate.format('YYYY-MM-DD'),
        amount: values.amount,
        cycleType: values.cycleType,
        coverUntil: values.coverUntil ? values.coverUntil.format('YYYY-MM-DD') : undefined,
        note: values.note,
        fileIds: values.images.map((item) => item.fileId)
      });
      message.success('Đã nộp hộ minh chứng');
      setProxyGroup(null);
      await load();
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const byId = useMemo(() => new Map((data?.contributions ?? []).map((item) => [item._id, item])), [data]);
  const groups = (data?.groups ?? []).filter((group) => !groupId || group._id === groupId);
  const locked = Boolean(data?.period.isLocked);
  const viewingRows = (viewing?.ids ?? []).map((id) => byId.get(id)).filter(Boolean) as ContributionView[];
  const proxyPayer = Form.useWatch('payer', proxyForm);
  const proxyIsExternal = proxyGroup?.members.find((row) => row.member._id === proxyPayer)?.member.memberType === 'EXTERNAL';

  const contributionTable = (rows: ContributionView[], canReview: boolean) => (
    <Table<ContributionView>
      rowKey="_id"
      size="small"
      pagination={false}
      dataSource={rows}
      scroll={{ x: 'max-content' }}
      columns={[
        { title: 'Người đóng', render: (_: unknown, row: ContributionView) => <span>{row.member?.fullName} {payerTag(row.member?.memberType)}</span> },
        { title: 'Ngày đóng', render: (_: unknown, row: ContributionView) => formatDate(row.contributionDate) },
        { title: 'Số tiền', align: 'right' as const, render: (_: unknown, row: ContributionView) => money(row.amount) },
        { title: 'Chu kỳ', render: (_: unknown, row: ContributionView) => `${FUND_CYCLE_LABEL[row.cycleType ?? 'ONCE']}${row.coverUntil ? ` · đến ${formatDate(row.coverUntil)}` : ''}` },
        { title: 'Ảnh', render: (_: unknown, row: ContributionView) => <FileThumbs files={row.files} size={48} /> },
        { title: 'Gửi', render: (_: unknown, row: ContributionView) => <div>{formatDateTime(row.submittedAt)}{row.isProxy && <div><Tag color="orange">Nộp hộ: {row.proxyByName}</Tag></div>}</div> },
        { title: 'Trạng thái', render: (_: unknown, row: ContributionView) => <div><Tag color={FUND_STATUS_COLOR[row.status]}>{FUND_STATUS_LABEL[row.status]}</Tag>{row.reviewNote && <div className="text-xs text-red-500">{row.reviewNote}</div>}</div> },
        {
          title: '', render: (_: unknown, row: ContributionView) => canReview && !locked ? (
            <Space>
              {row.status !== 'DONE' && <Button size="small" type="primary" loading={saving} onClick={() => review([row._id], 'DONE')}>Đã xong</Button>}
              {row.status !== 'NOT_DONE' && <Button size="small" danger onClick={() => setRejecting([row._id])}>Chưa xong</Button>}
            </Space>
          ) : null
        }
      ]}
    />
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <MonthPicker value={code} onChange={setCode} />
        {showKindFilter && (
          <Segmented value={kind} onChange={(value) => { setKind(value as GroupKind | 'ALL'); setGroupId(''); }} options={[{ value: 'ALL', label: 'Tất cả nhóm' }, { value: 'FUND', label: 'Nhóm MTO' }, { value: 'MENTEE', label: 'Nhóm MTE' }]} />
        )}
        {(data?.groups.length ?? 0) > 1 && (
          <Select className="min-w-56" allowClear placeholder="Tất cả nhóm" value={groupId || undefined} onChange={(value) => setGroupId(value ?? '')} options={data?.groups.map((group) => ({ value: group._id, label: `${group.name}${group.pending ? ` (${group.pending} chờ)` : ''}` }))} />
        )}
        {locked && <Tag color="purple">Kỳ đã chốt</Tag>}
      </div>
      <Typography.Text type="secondary">Mỗi tuần thành viên gửi ảnh minh chứng (hoặc khai báo đóng trước đến ngày nào). Leader nhóm duyệt Chờ → Đã xong / Chưa xong và có thể nộp hộ. Bấm ô tuần để xem ảnh.</Typography.Text>
      {!loading && !groups.length && <Empty description="Chưa có nhóm" />}
      {groups.map((group) => {
        const payerIds = new Set(group.members.map((row) => row.member._id));
        const pendingRows = (data?.contributions ?? []).filter((item) => item.status === 'PENDING' && payerIds.has(item.member?._id ?? ''));
        return (
          <Card
            key={group._id}
            size="small"
            loading={loading}
            title={<span>{group.name} <Tag color={group.groupKind === 'FUND' ? 'gold' : 'purple'}>{GROUP_KIND_LABEL[group.groupKind]}</Tag><span className="text-xs font-normal text-gray-500">Leader: {group.leader?.fullName ?? '—'} · Phó: {group.deputy?.fullName ?? '—'}</span></span>}
            extra={(
              <Space wrap>
                {group.pending ? <Tag color="gold">{group.pending} chờ duyệt</Tag> : <Tag color="green">Không còn mục chờ</Tag>}
                {group.canReview && !locked && <Button size="small" icon={<PlusOutlined />} onClick={() => { proxyForm.resetFields(); proxyForm.setFieldsValue({ contributionDate: dayjs(getCurrentTime()), cycleType: 'WEEKLY', images: [] }); setProxyGroup(group); }}>Nộp hộ</Button>}
                {group.canReview && group.groupKind === 'FUND' && <Button size="small" icon={<UserAddOutlined />} onClick={() => { contributorForm.resetFields(); setContributorGroup(group); }}>Thêm thầy cô</Button>}
              </Space>
            )}
          >
            {!group.canReview && <Alert className="mb-2" type="info" showIcon title="Bạn chỉ được xem nhóm này (Phó nhóm chưa được bật quyền duyệt)." />}
            <Table<Row>
              rowKey={(row) => row.member._id}
              size="small"
              pagination={false}
              dataSource={group.members}
              scroll={{ x: 'max-content' }}
              locale={{ emptyText: 'Nhóm chưa có thành viên đóng quỹ' }}
              columns={[
                { title: 'Người đóng', fixed: 'left' as const, render: (_: unknown, row: Row) => <div>{row.member.fullName}<div>{payerTag(row.member.memberType)}{row.member.organization && <span className="text-xs text-gray-500">{row.member.organization}</span>}</div></div> },
                ...(data?.weeks ?? []).map((week) => ({
                  title: weekLabel(week),
                  render: (_: unknown, row: Row) => {
                    const cell = row.weeks[week.weekKey];
                    return (
                      <Tag color={WEEK_STATUS_COLOR[cell.status]} className={cell.ids.length ? 'cursor-pointer' : ''} onClick={() => cell.ids.length && setViewing({ title: `${row.member.fullName} · ${weekLabel(week)}`, ids: cell.ids, canReview: group.canReview })}>
                        {WEEK_STATUS_LABEL[cell.status]}{cell.amount ? ` · ${money(cell.amount)}` : ''}
                      </Tag>
                    );
                  }
                })),
                { title: 'Đã đóng đến', render: (_: unknown, row: Row) => row.paidUntil ? formatDate(row.paidUntil) : '—' },
                { title: 'Đã duyệt (tháng)', align: 'right' as const, render: (_: unknown, row: Row) => money(row.total) }
              ]}
            />
            {pendingRows.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Typography.Text strong>Minh chứng chờ duyệt</Typography.Text>
                  {group.canReview && !locked && <Button size="small" type="primary" loading={saving} onClick={() => review(pendingRows.map((row) => row._id), 'DONE')}>Đánh dấu tất cả Đã xong</Button>}
                </div>
                {contributionTable(pendingRows, group.canReview)}
              </div>
            )}
          </Card>
        );
      })}
      <Modal title={viewing?.title} open={Boolean(viewing)} onCancel={() => setViewing(null)} footer={null} width="min(1000px, calc(100vw - 24px))">
        {viewing && contributionTable(viewingRows, viewing.canReview)}
      </Modal>
      <Modal title="Đánh dấu Chưa xong" open={Boolean(rejecting)} onCancel={() => setRejecting(null)} onOk={() => rejecting && review(rejecting, 'NOT_DONE', note)} okText="Lưu" okButtonProps={{ danger: true }} confirmLoading={saving} destroyOnHidden>
        <Input.TextArea rows={3} placeholder="Lý do (người nộp sẽ thấy để gửi lại)" value={note} onChange={(event) => setNote(event.target.value)} />
      </Modal>
      <Modal title={proxyGroup ? `Nộp hộ minh chứng · ${proxyGroup.name}` : ''} open={Boolean(proxyGroup)} onCancel={() => setProxyGroup(null)} onOk={() => proxyForm.submit()} okText="Nộp hộ" confirmLoading={saving} destroyOnHidden forceRender>
        <Form form={proxyForm} layout="vertical" onFinish={submitProxy}>
          <Typography.Paragraph type="secondary">Khoản nộp hộ được ghi rõ người nộp hộ để phân biệt với thành viên tự nộp.</Typography.Paragraph>
          <Form.Item name="payer" label="Người đóng" rules={[{ required: true, message: 'Chọn người đóng' }]}>
            <Select showSearch={{ optionFilterProp: 'label' }} options={(proxyGroup?.members ?? []).map((row) => ({ value: row.member._id, label: `${row.member.fullName}${row.member.memberType === 'EXTERNAL' ? ' (thầy cô)' : ` (${row.member.memberCode})`}` }))} />
          </Form.Item>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="contributionDate" label="Ngày đóng" rules={[{ required: true }]}><DatePicker className="w-full" format="DD/MM/YYYY" disabledDate={(value) => value.isAfter(dayjs(getCurrentTime()), 'day')} /></Form.Item>
            <Form.Item name="amount" label="Số tiền (đ)" rules={[{ required: true }]}><InputNumber<number> className="w-full" min={1000} step={10000} formatter={(value) => `${value ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} parser={(value) => Number((value ?? '').replace(/\./g, ''))} /></Form.Item>
            <Form.Item name="cycleType" label="Chu kỳ" rules={[{ required: proxyIsExternal, message: 'Thầy cô cần khai báo chu kỳ' }]}><Select options={Object.entries(FUND_CYCLE_LABEL).map(([value, label]) => ({ value, label }))} /></Form.Item>
            <Form.Item name="coverUntil" label="Đóng đến ngày" extra="VD 100.000đ/tuần đến ngày 31/12"><DatePicker className="w-full" format="DD/MM/YYYY" /></Form.Item>
          </div>
          <Form.Item name="images" label="Ảnh minh chứng" rules={[{ validator: (_, value: UploadedImage[]) => (value?.length ? Promise.resolve() : Promise.reject(new Error('Cần ít nhất 1 ảnh'))) }]}><ImageUpload max={5} /></Form.Item>
          <Form.Item name="note" label="Ghi chú"><Input /></Form.Item>
        </Form>
      </Modal>
      <Modal title={contributorGroup ? `Thêm thầy cô vào ${contributorGroup.name}` : ''} open={Boolean(contributorGroup)} onCancel={() => setContributorGroup(null)} onOk={() => contributorForm.submit()} destroyOnHidden>
        <Form form={contributorForm} layout="vertical" onFinish={async (values) => {
          if (!contributorGroup) return;
          try {
            await fundApi.saveContributor({ ...values, groupId: contributorGroup._id });
            message.success('Đã thêm thầy cô');
            setContributorGroup(null);
            await load();
          } catch (error) {
            message.error(errorMessage(error));
          }
        }}>
          <Typography.Paragraph type="secondary">Thầy cô tham gia đóng quỹ nhưng không có hồ sơ MTO. Chỉ cần họ tên; đơn vị và liên hệ không bắt buộc.</Typography.Paragraph>
          <Form.Item name="fullName" label="Họ tên" rules={[{ required: true, message: 'Nhập họ tên' }]}><Input /></Form.Item>
          <Form.Item name="organization" label="Đơn vị"><Input /></Form.Item>
          <Form.Item name="contact" label="Liên hệ (SĐT / email)"><Input /></Form.Item>
          <Form.Item name="note" label="Ghi chú"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
