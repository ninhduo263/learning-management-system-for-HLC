'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, App, Button, Card, DatePicker, Empty, Form, Input, InputNumber, Modal, Segmented, Select, Space, Table, Tag, Typography } from 'antd';
import { CheckOutlined, HeartFilled, PlusOutlined, UserAddOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import ImageUpload, { type UploadedImage } from '@/components/ImageUpload';
import PhoneLink, { zaloNumber } from '@/components/PhoneLink';
import MonthPicker, { currentPeriodCode } from '@/components/MonthPicker';
import { EvidenceButton, FundStatusTag, periodOf, weekLabel } from '@/components/fund/FundStatus';
import { errorMessage } from '@/lib/api';
import { formatDateTime } from '@/services/mentoringApi';
import {
  FUND_CYCLE_LABEL, GROUP_KIND_LABEL, formatDate, fundApi, money, periodLabel,
  type ContributionView, type FundCycle, type FundGroupReport as Report, type GroupKind
} from '@/services/hlcApi';
import { getCurrentTime } from '@/utils/time';

type Group = Report['groups'][number];
type Row = Group['members'][number];
/** Bộ lọc trạng thái. NONE ("Chưa có ghi nhận") chỉ có ở chế độ xem quản trị để biết ai cần được nhắc nhẹ */
type StatusFilter = 'ALL' | 'DONE' | 'PENDING' | 'NONE';
/** Số điện thoại bấm mở Zalo. Số thầy cô chỉ Trưởng ban HLC Fund, Admin toàn cục và trưởng nhóm xem được */
const payerPhone = (payer?: { phone?: string | null; phoneHidden?: boolean; memberType?: string } | null) => (
  <PhoneLink phone={payer?.phone} hidden={payer?.phoneHidden} empty="" hiddenTitle={payer?.memberType === 'EXTERNAL' ? 'Số của thầy cô chỉ Trưởng ban HLC Fund, Admin toàn cục và trưởng nhóm xem được' : undefined} />
);
const payerTag = (type?: string) => type === 'EXTERNAL' ? <Tag color="gold">Thầy cô</Tag> : type === 'MENTOR' ? <Tag color="blue">MTO</Tag> : <Tag color="green">MTE</Tag>;
/** Một dòng bảng dễ đọc: một khoản đóng góp, hoặc người chưa có khoản nào trong kỳ (ô để trống) */
type EasyRow = { key: string; payer: Row['member']; item: ContributionView | null };

interface ProxyValues { payer: string; contributionDate: Dayjs; amount: number; cycleType: FundCycle; coverUntil?: Dayjs; note?: string; images: UploadedImage[] }

/**
 * Báo cáo quỹ theo nhóm. Leader/Phó: quan sát, xác nhận, nộp hộ nhóm mình; Admin HLC Fund: toàn bộ.
 * Nhóm HLC Fund của MTO và thầy cô (người dùng lớn tuổi): bảng ít cột, chữ lớn, nút có chữ, xem ảnh cỡ lớn.
 * Nhóm MTE: lưới theo tuần. Khoản tình nguyện nên chỉ có "Đã ghi nhận" / "Đang chờ xác nhận"; chưa có thì để trống.
 */
export default function FundGroupReport({ showKindFilter = false, fixedKind }: { showKindFilter?: boolean; fixedKind?: GroupKind }) {
  const { message } = App.useApp();
  const [code, setCode] = useState(() => currentPeriodCode(getCurrentTime()));
  const [kind, setKind] = useState<GroupKind | 'ALL'>(fixedKind ?? 'ALL');
  const [groupId, setGroupId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
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
      message.success(status === 'DONE' ? `Đã ghi nhận ${result.updated} khoản đóng góp vào sổ quỹ` : `Đã chuyển ${result.updated} khoản về "Chưa ghi nhận" để người nộp bổ sung`);
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
      message.success('Đã nộp minh chứng hộ, đang chờ xác nhận');
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
  const isAdmin = Boolean(data?.isAdmin);
  const weeks = data?.weeks ?? [];
  const viewingRows = (viewing?.ids ?? []).map((id) => byId.get(id)).filter(Boolean) as ContributionView[];
  const proxyPayer = Form.useWatch('payer', proxyForm);
  const proxyIsExternal = proxyGroup?.members.find((row) => row.member._id === proxyPayer)?.member.memberType === 'EXTERNAL';
  const payerOf = (item: ContributionView) => item.member?._id ?? item.contributorId ?? item.memberId;
  /** Có khoản Đã ghi nhận / Đang chờ trong kỳ (khoản "Chưa ghi nhận" coi như chưa có) */
  const hasStatus = (row: Row, status: 'DONE' | 'PENDING') => Object.values(row.weeks).some((cell) => cell.status === status);
  const matches = (row: Row) => statusFilter === 'ALL'
    || (statusFilter === 'NONE' ? !hasStatus(row, 'DONE') && !hasStatus(row, 'PENDING') : hasStatus(row, statusFilter));
  const statusOptions = [
    { value: 'ALL', label: 'Tất cả' },
    { value: 'DONE', label: 'Đã ghi nhận' },
    { value: 'PENDING', label: 'Đang chờ xác nhận' },
    ...(isAdmin ? [{ value: 'NONE', label: 'Chưa có ghi nhận' }] : [])
  ];

  const reviewButtons = (item: ContributionView, canReview: boolean, size: 'middle' | 'large' = 'middle') => canReview && !locked && item.status !== 'DONE' ? (
    <div className="flex flex-wrap gap-2">
      <Button size={size} type="primary" icon={<CheckOutlined />} loading={saving} onClick={() => review([item._id], 'DONE')}>Ghi nhận</Button>
      {item.status === 'PENDING' && <Button size={size} onClick={() => setRejecting([item._id])}>Chưa ghi nhận</Button>}
    </div>
  ) : null;

  /** Trạng thái kèm nút đổi trạng thái ngay bên dưới (ít cột, mắt không phải dò sang cột khác) */
  const statusCell = (item: ContributionView | null, canReview = false) => item ? (
    <div className="space-y-2">
      <div><FundStatusTag status={item.status} detail large /></div>
      {item.status === 'DONE' && <div className="fund-thanks"><HeartFilled aria-hidden />Cảm ơn khoản đóng góp</div>}
      {item.status === 'NOT_DONE' && item.reviewNote && <div className="fund-sub">Cần bổ sung: {item.reviewNote}</div>}
      {reviewButtons(item, canReview, 'large')}
    </div>
  ) : <FundStatusTag status="NONE" />;

  /** Bảng dễ đọc cho nhóm HLC Fund của MTO và thầy cô: tên, kỳ, số tiền, trạng thái, ảnh minh chứng */
  const easyTable = (group: Group) => {
    const payerIds = new Set(group.members.map((row) => row.member._id));
    const own = (data?.contributions ?? []).filter((item) => payerIds.has(payerOf(item) ?? ''));
    const rows: EasyRow[] = group.members.filter(matches).flatMap((row): EasyRow[] => {
      const items = own.filter((item) => payerOf(item) === row.member._id && (statusFilter === 'ALL' || statusFilter === 'NONE' || item.status === statusFilter));
      return statusFilter === 'NONE' || !items.length ? [{ key: row.member._id, payer: row.member, item: null }] : items.map((item) => ({ key: item._id, payer: row.member, item }));
    });
    const recorded = group.members.reduce((total, row) => total + row.total, 0);
    const name = (row: EasyRow) => (
      <div>
        <div className="fund-name">{row.payer.fullName}</div>
        <div className="mt-1 flex flex-wrap items-center gap-1">{payerTag(row.payer.memberType)}{row.payer.organization && <span className="fund-sub">{row.payer.organization}</span>}</div>
        <div className="mt-1">{payerPhone(row.payer)}</div>
        {row.item?.isProxy && <div className="fund-sub mt-1">Nộp hộ: {row.item.proxyByName}</div>}
      </div>
    );
    const periodCell = (row: EasyRow) => row.item ? <div><div>{periodOf(row.item, weeks)}</div><div className="fund-sub">{FUND_CYCLE_LABEL[row.item.cycleType ?? 'ONCE']}</div></div> : <span className="fund-sub">{data ? periodLabel(data.period.code) : ''}</span>;
    return (
      <div className="space-y-3">
        <Table<EasyRow>
          className="fund-easy-table has-cards"
          rowKey="key"
          pagination={false}
          dataSource={rows}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: statusFilter === 'ALL' ? 'Nhóm chưa có người đóng góp' : 'Không có khoản nào ở trạng thái này' }}
          columns={[
            { title: 'Người đóng góp', render: (_: unknown, row: EasyRow) => name(row) },
            { title: 'Kỳ', width: 190, render: (_: unknown, row: EasyRow) => periodCell(row) },
            { title: 'Số tiền', align: 'right' as const, render: (_: unknown, row: EasyRow) => row.item ? <span className="fund-amount">{money(row.item.amount)}</span> : <FundStatusTag status="NONE" /> },
            { title: 'Trạng thái', width: 300, render: (_: unknown, row: EasyRow) => statusCell(row.item, group.canReview) },
            { title: 'Ảnh minh chứng', render: (_: unknown, row: EasyRow) => row.item ? <EvidenceButton files={row.item.files} size="large" /> : <FundStatusTag status="NONE" /> }
          ]}
        />
        <div className="fund-cards">
          {!rows.length && <Empty description="Không có khoản nào ở trạng thái này" />}
          {rows.map((row) => (
            <div key={row.key} className="fund-card">
              <div className="fund-card-top">{name(row)}{statusCell(row.item)}</div>
              <div className="fund-sub mt-2">Kỳ: {row.item ? periodOf(row.item, weeks) : data ? periodLabel(data.period.code) : ''}</div>
              {row.item && <div className="fund-amount">{money(row.item.amount)}</div>}
              {row.item && <div className="fund-card-actions"><EvidenceButton files={row.item.files} size="large" />{reviewButtons(row.item, group.canReview, 'large')}</div>}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 text-base">
          <span className="fund-sub">Tổng đã ghi nhận của nhóm trong {data ? periodLabel(data.period.code).toLowerCase() : 'kỳ'}:</span>
          <strong className="text-lg">{money(recorded)}</strong>
        </div>
      </div>
    );
  };

  const contributionTable = (rows: ContributionView[], canReview: boolean) => (
    <Table<ContributionView>
      className="fund-easy-table"
      rowKey="_id"
      pagination={false}
      dataSource={rows}
      scroll={{ x: 'max-content' }}
      columns={[
        { title: 'Người đóng góp', render: (_: unknown, row: ContributionView) => <div><div className="fund-name">{row.member?.fullName}</div><div className="mt-1">{payerTag(row.member?.memberType)}{row.isProxy && <span className="fund-sub">Nộp hộ: {row.proxyByName}</span>}</div><div className="mt-1">{payerPhone(row.member)}</div></div> },
        { title: 'Kỳ', render: (_: unknown, row: ContributionView) => <div><div>{periodOf(row, weeks)}</div><div className="fund-sub">{FUND_CYCLE_LABEL[row.cycleType ?? 'ONCE']} · gửi {formatDateTime(row.submittedAt)}</div></div> },
        { title: 'Số tiền', align: 'right' as const, render: (_: unknown, row: ContributionView) => <span className="fund-amount">{money(row.amount)}</span> },
        { title: 'Trạng thái', render: (_: unknown, row: ContributionView) => statusCell(row, canReview) },
        { title: 'Ảnh minh chứng', render: (_: unknown, row: ContributionView) => <EvidenceButton files={row.files} /> }
      ]}
    />
  );

  return (
    <div className="space-y-4">
      <div className="fund-filter">
        <MonthPicker value={code} onChange={setCode} />
        {showKindFilter && (
          <Segmented value={kind} onChange={(value) => { setKind(value as GroupKind | 'ALL'); setGroupId(''); }} options={[{ value: 'ALL', label: 'Tất cả nhóm' }, { value: 'FUND', label: 'Nhóm MTO & thầy cô' }, { value: 'MENTEE', label: 'Nhóm MTE' }]} />
        )}
        <Segmented value={statusFilter} onChange={(value) => setStatusFilter(value as StatusFilter)} options={statusOptions} />
        {(data?.groups.length ?? 0) > 1 && (
          <Select className="min-w-56" size="large" allowClear placeholder="Tất cả nhóm" value={groupId || undefined} onChange={(value) => setGroupId(value ?? '')} options={data?.groups.map((group) => ({ value: group._id, label: `${group.name}${group.pending ? ` (${group.pending} đang chờ)` : ''}` }))} />
        )}
        {locked && <Tag color="purple">Kỳ đã chốt</Tag>}
      </div>
      <Typography.Paragraph className="!mb-0 text-base" type="secondary">
        Mỗi khoản đóng góp tình nguyện kèm ảnh minh chứng. Leader nhóm xem ảnh rồi bấm <b>Ghi nhận</b> để ghi vào sổ quỹ; có thể nộp hộ cho thành viên và thầy cô.
      </Typography.Paragraph>
      {!loading && !groups.length && <Empty description="Chưa có nhóm" />}
      {groups.map((group) => {
        const payerIds = new Set(group.members.map((row) => row.member._id));
        const pendingRows = (data?.contributions ?? []).filter((item) => item.status === 'PENDING' && payerIds.has(payerOf(item) ?? ''));
        const isFund = group.groupKind === 'FUND';
        return (
          <Card
            key={group._id}
            loading={loading}
            title={<span className="flex flex-wrap items-center gap-2">{group.name} <Tag color={isFund ? 'gold' : 'purple'}>{GROUP_KIND_LABEL[group.groupKind]}</Tag><span className="text-sm font-normal text-gray-500">Leader: {group.leader?.fullName ?? '—'} · Phó: {group.deputy?.fullName ?? '—'}</span></span>}
            extra={(
              <Space wrap>
                {group.pending > 0 && <FundStatusTag status="PENDING" />}
                {group.pending > 0 && <span className="font-bold">{group.pending} khoản</span>}
                {(group.canProxy ?? group.canReview) && !locked && <Button size="large" icon={<PlusOutlined />} onClick={() => { proxyForm.resetFields(); proxyForm.setFieldsValue({ contributionDate: dayjs(getCurrentTime()), cycleType: 'WEEKLY', images: [] }); setProxyGroup(group); }}>Nộp minh chứng hộ</Button>}
                {(group.canProxy || group.canReview) && isFund && <Button size="large" icon={<UserAddOutlined />} onClick={() => { contributorForm.resetFields(); setContributorGroup(group); }}>Thêm thầy cô</Button>}
              </Space>
            )}
          >
            {!group.canReview && <Alert className="mb-3" type="info" showIcon title="Vai trò của bạn trong nhóm này chỉ được xem (chưa có quyền xác nhận khoản đóng góp)." />}
            {isFund ? easyTable(group) : (
              <>
                <Table<Row>
                  rowKey={(row) => row.member._id}
                  pagination={false}
                  dataSource={group.members.filter(matches)}
                  scroll={{ x: 'max-content' }}
                  locale={{ emptyText: statusFilter === 'ALL' ? 'Nhóm chưa có thành viên đóng quỹ' : 'Không có thành viên ở trạng thái này' }}
                  columns={[
                    { title: 'Người đóng góp', fixed: 'left' as const, render: (_: unknown, row: Row) => <div><strong>{row.member.fullName}</strong><div>{payerTag(row.member.memberType)}{row.member.organization && <span className="text-xs text-gray-500">{row.member.organization}</span>}</div><div className="text-sm">{payerPhone(row.member)}</div></div> },
                    ...weeks.map((week) => ({
                      title: weekLabel(week),
                      render: (_: unknown, row: Row) => {
                        const cell = row.weeks[week.weekKey];
                        const shown = cell.status === 'DONE' || cell.status === 'PENDING';
                        return (
                          <button type="button" className={`border-0 bg-transparent p-0 text-left ${cell.ids.length ? 'cursor-pointer' : 'cursor-default'}`} disabled={!cell.ids.length} onClick={() => setViewing({ title: `${row.member.fullName} · ${weekLabel(week)}`, ids: cell.ids, canReview: group.canReview })}>
                            <FundStatusTag status={cell.status} />
                            {shown && cell.amount > 0 && <div className="mt-1 text-sm font-bold">{money(cell.amount)}</div>}
                          </button>
                        );
                      }
                    })),
                    { title: 'Đã đóng đến', render: (_: unknown, row: Row) => row.paidUntil ? formatDate(row.paidUntil) : '—' },
                    { title: 'Đã ghi nhận (tháng)', align: 'right' as const, render: (_: unknown, row: Row) => <strong>{row.total ? money(row.total) : '—'}</strong> }
                  ]}
                />
                {pendingRows.length > 0 && (statusFilter === 'ALL' || statusFilter === 'PENDING') && (
                  <div className="mt-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Typography.Text strong className="text-base">Khoản đang chờ xác nhận</Typography.Text>
                      {group.canReview && !locked && <Button type="primary" icon={<CheckOutlined />} loading={saving} onClick={() => review(pendingRows.map((row) => row._id), 'DONE')}>Ghi nhận tất cả {pendingRows.length} khoản</Button>}
                    </div>
                    {contributionTable(pendingRows, group.canReview)}
                  </div>
                )}
              </>
            )}
            {isFund && group.canReview && !locked && pendingRows.length > 1 && (
              <div className="mt-3 flex justify-end">
                <Button size="large" type="primary" icon={<CheckOutlined />} loading={saving} onClick={() => review(pendingRows.map((row) => row._id), 'DONE')}>Ghi nhận tất cả {pendingRows.length} khoản đang chờ</Button>
              </div>
            )}
          </Card>
        );
      })}
      <Modal title={viewing?.title} open={Boolean(viewing)} onCancel={() => setViewing(null)} footer={null} width="min(1100px, calc(100vw - 24px))">
        {viewing && contributionTable(viewingRows, viewing.canReview)}
      </Modal>
      <Modal title="Chưa ghi nhận khoản này" open={Boolean(rejecting)} onCancel={() => setRejecting(null)} onOk={() => rejecting && review(rejecting, 'NOT_DONE', note)} okText="Lưu" cancelText="Hủy" confirmLoading={saving} destroyOnHidden>
        <Typography.Paragraph type="secondary">Dùng khi ảnh minh chứng chưa khớp (sai số tiền, ảnh mờ...). Người nộp sẽ thấy lời nhắn để bổ sung.</Typography.Paragraph>
        <Input.TextArea rows={3} placeholder="Lời nhắn cho người nộp (ví dụ: ảnh chưa rõ số tiền, nhờ gửi lại giúp)" value={note} onChange={(event) => setNote(event.target.value)} />
      </Modal>
      <Modal title={proxyGroup ? `Nộp minh chứng hộ · ${proxyGroup.name}` : ''} open={Boolean(proxyGroup)} onCancel={() => setProxyGroup(null)} onOk={() => proxyForm.submit()} okText="Nộp minh chứng" cancelText="Hủy" confirmLoading={saving} destroyOnHidden forceRender>
        <Form form={proxyForm} layout="vertical" onFinish={submitProxy}>
          <Typography.Paragraph type="secondary">Khoản nộp hộ được ghi rõ người nộp hộ để phân biệt với thành viên tự nộp.</Typography.Paragraph>
          <Form.Item name="payer" label="Người đóng góp" rules={[{ required: true, message: 'Chọn người đóng góp' }]}>
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
          <Typography.Paragraph type="secondary">Thầy cô tham gia đóng quỹ nhưng không có hồ sơ MTO. Cần họ tên và số điện thoại có đăng ký Zalo (bấm số trong bảng sẽ mở Zalo); đơn vị không bắt buộc.</Typography.Paragraph>
          <Form.Item name="fullName" label="Họ tên" rules={[{ required: true, message: 'Nhập họ tên' }]}><Input /></Form.Item>
          <Form.Item
            name="phone"
            label="Số điện thoại có đăng ký Zalo"
            extra="Ví dụ 0912 345 678. Chỉ Trưởng ban HLC Fund, Admin toàn cục và trưởng nhóm xem được số này."
            rules={[{ required: true, message: 'Nhập số điện thoại có đăng ký Zalo' }, { validator: (_, value?: string) => (!value || zaloNumber(value) ? Promise.resolve() : Promise.reject(new Error('Số điện thoại chưa hợp lệ (cần ít nhất 9 chữ số)'))) }]}
          >
            <Input inputMode="tel" autoComplete="tel" placeholder="Số điện thoại có đăng ký Zalo" />
          </Form.Item>
          <Form.Item name="organization" label="Đơn vị"><Input /></Form.Item>
          <Form.Item name="contact" label="Liên hệ khác (email...)"><Input /></Form.Item>
          <Form.Item name="note" label="Ghi chú"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
