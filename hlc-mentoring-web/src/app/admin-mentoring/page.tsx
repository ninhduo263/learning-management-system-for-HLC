'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, App, Button, Card, Col, Descriptions, Form, Input, Modal, Popconfirm, Row, Select, Space, Table, Tabs, Tag, Typography, Upload } from 'antd';
import { CheckOutlined, DeleteOutlined, EditOutlined, EyeOutlined, InboxOutlined, LoadingOutlined, LockOutlined, PlusOutlined, UnlockOutlined } from '@ant-design/icons';
import ProfileLink from '@/components/ProfileLink';
import RecapCard from '@/components/RecapCard';
import { errorMessage } from '@/lib/api';
import {
  PAIR_STATUS_COLOR,
  PAIR_STATUS_LABEL,
  REVIEW_STATUS_LABEL,
  ROLE_STATUS_COLOR,
  ROLE_STATUS_LABEL,
  formatDateTime,
  fromDateTimeLocal,
  mentoringApi,
  toDateTimeLocal,
  type MemberView,
  type QuarterBoard,
  type RecapView,
  type SessionView
} from '@/services/mentoringApi';
import { getCurrentTime, isNextQuarterPairingOpen, nextQuarterCode, quarterOf } from '@/utils/time';

interface PairFormValues { month: number; mentorCode: string; menteeCode: string; }

export default function AdminMentoringPage() {
  const { message } = App.useApp();
  const [currentCode, setCurrentCode] = useState('');
  const [nextOpen, setNextOpen] = useState(false);
  const [readyCode, setReadyCode] = useState('');
  const [nextVisible, setNextVisible] = useState(false);
  const [openingNext, setOpeningNext] = useState(false);
  const nextCode = currentCode ? nextQuarterCode(currentCode) : '';

  useEffect(() => {
    const refresh = () => {
      setCurrentCode(quarterOf(getCurrentTime()).code);
      setNextOpen(isNextQuarterPairingOpen(getCurrentTime()));
    };
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener('hlc-mock-date-change', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('hlc-mock-date-change', refresh);
    };
  }, []);

  useEffect(() => {
    if (!currentCode) return;
    let active = true;
    mentoringApi.ensureQuarter(currentCode)
      .then(() => { if (active) setReadyCode(currentCode); })
      .catch((error) => { if (active) message.error(errorMessage(error, 'Không thể khởi tạo quý hiện tại')); });
    return () => { active = false; };
  }, [currentCode, message]);

  const openNext = async () => {
    setOpeningNext(true);
    try {
      await mentoringApi.ensureQuarter(nextCode);
      setNextVisible(true);
    } catch (error) {
      message.error(errorMessage(error, 'Không thể mở quản lý quý kế tiếp'));
    } finally {
      setOpeningNext(false);
    }
  };

  if (!currentCode || readyCode !== currentCode) {
    return (
      <Card className="flex min-h-40 items-center justify-center">
        <Typography.Text type="secondary">{currentCode ? 'Đang chuẩn bị kỳ mentoring hiện tại…' : 'Đang xác định quý hiện tại…'}</Typography.Text>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <QuarterPanel key={currentCode} quarterCode={currentCode} kind="current" />
      {nextOpen && !nextVisible && (
        <Card className="overflow-hidden !border-violet-200 bg-gradient-to-r from-violet-50 via-white to-indigo-50 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Typography.Title level={5} className="!mb-0">Chuẩn bị ghép cặp Quý {nextCode.slice(-1)} / {nextCode.slice(0, 4)}</Typography.Title>
                <Tag color="purple">Sắp tới</Tag>
              </div>
              <Typography.Text type="secondary">Quý hiện tại vẫn ở phía trên; các cặp quý kế tiếp được quản lý riêng bên dưới.</Typography.Text>
            </div>
            <Button type="primary" className="!shrink-0" loading={openingNext} onClick={openNext}>Mở quản lý quý kế tiếp</Button>
          </div>
        </Card>
      )}
      {nextVisible && <QuarterPanel key={nextCode} quarterCode={nextCode} kind="next" />}
    </div>
  );
}

function memberLabel(member?: MemberView | null) {
  return member ? <div><strong>{member.fullName}</strong><div className="text-xs text-gray-500">{member.memberCode}</div></div> : '—';
}

function QuarterPanel({ quarterCode, kind }: { quarterCode: string; kind: 'current' | 'next' }) {
  const { message, notification } = App.useApp();
  const [createForm] = Form.useForm<PairFormValues>();
  const [editForm] = Form.useForm<PairFormValues>();
  const [overrideForm] = Form.useForm();
  const [board, setBoard] = useState<QuarterBoard | null>(null);
  const [mentors, setMentors] = useState<MemberView[]>([]);
  const [mentees, setMentees] = useState<MemberView[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | 'detail' | null>(null);
  const [selected, setSelected] = useState<SessionView | null>(null);
  const [overriding, setOverriding] = useState<SessionView | null>(null);
  const [reviewing, setReviewing] = useState<{ session: SessionView; recap: RecapView } | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<{ row: number; message: string }[]>([]);
  const quarter = board?.quarter;
  const locked = Boolean(quarter?.isLocked);
  const canPair = Boolean(quarter?.canPair);

  const fetchAll = () => Promise.all([
    mentoringApi.board(quarterCode),
    mentoringApi.members('MENTOR'),
    mentoringApi.members('MENTEE')
  ]);
  const applyData = ([boardData, mentorList, menteeList]: Awaited<ReturnType<typeof fetchAll>>) => {
    setBoard(boardData);
    setMentors(mentorList);
    setMentees(menteeList);
    setSelected((current) => current && boardData.sessions.find((item) => item._id === current._id) || null);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      applyData(await fetchAll());
    } catch (error) {
      message.error(errorMessage(error, 'Không thể tải danh sách ghép cặp'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll()
      .then(applyData)
      .catch((error) => message.error(errorMessage(error, 'Không thể tải danh sách ghép cặp')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quarterCode]);

  const months = quarter?.months ?? [];
  const sessions = useMemo(() => board?.sessions ?? [], [board]);
  const createMenteeCode = Form.useWatch('menteeCode', createForm);
  const pairedMenteeCodes = useMemo(
    () => new Set(sessions.filter((item) => item.pair?.status === 'ACTIVE').map((item) => item.mentee?.memberCode)),
    [sessions]
  );
  const mentorOptions = useMemo(() => {
    const preference = board?.preferences.find((item) => item.menteeCode === createMenteeCode);
    const rank = new Map((preference?.mentorCodes ?? []).map((code, index) => [code, index + 1]));
    return mentors
      .filter((mentor) => mentor.status === 'ACTIVE')
      .map((mentor) => ({ mentor, rank: rank.get(mentor.memberCode) }))
      .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99) || a.mentor.memberCode.localeCompare(b.mentor.memberCode))
      .map(({ mentor, rank: preferenceRank }) => ({
        value: mentor.memberCode,
        label: `${preferenceRank ? `Ưu tiên ${preferenceRank} · ` : ''}${mentor.memberCode} - ${mentor.fullName}`
      }));
  }, [mentors, board, createMenteeCode]);
  const menteeOptions = (excludePaired: boolean) => mentees
    .filter((mentee) => mentee.status === 'ACTIVE' && (!excludePaired || !pairedMenteeCodes.has(mentee.memberCode)))
    .map((mentee) => ({ value: mentee.memberCode, label: `${mentee.memberCode} - ${mentee.fullName}` }));
  const recapsToReview = sessions.flatMap((session) =>
    (['mentee', 'mentor'] as const)
      .map((role) => session.recaps[role])
      .filter((recap): recap is RecapView => Boolean(recap))
      .map((recap) => ({ session, recap }))
  );

  const run = async (action: () => Promise<unknown>, success: string, fallback: string) => {
    try {
      await action();
      message.success(success);
      await loadData();
      return true;
    } catch (error) {
      message.error(errorMessage(error, fallback));
      return false;
    }
  };

  const submitCreate = async (values: PairFormValues) => {
    try {
      const result = await mentoringApi.createPair(quarterCode, values);
      message.success(result.syncedMonths.length
        ? `Đã ghép cặp và tạo buổi mentoring tháng ${result.syncedMonths.join(', ')}`
        : 'Cặp đã có đủ các tháng, không cần tạo thêm');
      createForm.resetFields();
      setModal(null);
      await loadData();
    } catch (error) {
      message.error(errorMessage(error, 'Không thể thêm cặp mentoring'));
    }
  };

  const submitEdit = async (values: PairFormValues) => {
    if (!selected) return;
    const ok = await run(
      () => mentoringApi.updatePair(selected._id, { mentorCode: values.mentorCode, menteeCode: values.menteeCode }),
      `Đã cập nhật cặp từ tháng ${selected.month} trở đi`,
      'Không thể cập nhật cặp mentoring'
    );
    if (ok) setModal(null);
  };

  const deleteFrom = async (session: SessionView) => {
    try {
      const result = await mentoringApi.deleteFrom(session._id);
      message.success(`Đã xóa tháng ${result.deletedMonths.join(', ')}: ${result.deleted.sessions} buổi, ${result.deleted.recaps} recap${result.voidedPointEntries ? `, hủy ${result.voidedPointEntries} dòng điểm` : ''}`);
      setModal(null);
      await loadData();
    } catch (error) {
      message.error(errorMessage(error, 'Không thể xóa cặp mentoring'));
    }
  };

  const importPairs = async (file: File) => {
    const key = `mentoring-import-${quarterCode}`;
    setImporting(true);
    setImportErrors([]);
    notification.open({ key, title: 'Đang import dữ liệu ghép cặp', description: 'Hệ thống đang đọc file và tạo các buổi mentoring. Vui lòng không đóng trang.', icon: <LoadingOutlined spin />, duration: 0 });
    try {
      const result = await mentoringApi.importPairs(quarterCode, file);
      setImportErrors(result.errors);
      notification.success({
        key,
        title: 'Import hoàn tất',
        description: `Đọc ${result.pairsRead} cặp: tạo mới ${result.createdPairs}, cập nhật ${result.updatedPairs}${result.failed ? `, lỗi ${result.failed} dòng (xem bên dưới)` : ''}.`,
        duration: 6
      });
      await loadData();
    } catch (error) {
      notification.error({ key, title: 'Import thất bại', description: errorMessage(error), duration: 6 });
    } finally {
      setImporting(false);
    }
  };

  const openEdit = (session: SessionView) => {
    setSelected(session);
    setTimeout(() => editForm.setFieldsValue({ month: session.month, mentorCode: session.mentor?.memberCode, menteeCode: session.mentee?.memberCode }), 0);
    setModal('edit');
  };

  const openOverride = (session: SessionView) => {
    setOverriding(session);
    setTimeout(() => overrideForm.setFieldsValue({
      startAt: toDateTimeLocal(session.schedule?.startAt),
      endAt: toDateTimeLocal(session.schedule?.endAt),
      meetingLink: session.schedule?.meetingLink,
      location: session.schedule?.location,
      note: session.schedule?.note
    }), 0);
  };

  const columns = [
    { title: 'Mã mentoring tháng', dataIndex: 'code' },
    { title: 'Mentee', render: (_: unknown, row: SessionView) => memberLabel(row.mentee) },
    { title: 'Mentor', render: (_: unknown, row: SessionView) => memberLabel(row.mentor) },
    { title: 'Profile Mentee', render: (_: unknown, row: SessionView) => <ProfileLink url={row.mentee?.profileUrl ?? undefined} /> },
    { title: 'Profile Mentor', render: (_: unknown, row: SessionView) => <ProfileLink url={row.mentor?.profileUrl ?? undefined} /> },
    { title: 'Lịch mentoring', render: (_: unknown, row: SessionView) => row.schedule ? formatDateTime(row.schedule.startAt) : <Typography.Text type="secondary">Chưa có lịch</Typography.Text> },
    {
      title: 'Trạng thái recap',
      render: (_: unknown, row: SessionView) => (
        <Space orientation="vertical" size={2}>
          <Tag color={PAIR_STATUS_COLOR[row.recapStatus.pair]}>{PAIR_STATUS_LABEL[row.recapStatus.pair]}</Tag>
          {row.recapStatus.pair !== 'NO_SCHEDULE' && (
            <Typography.Text type="secondary" className="text-xs">
              Mentee: {ROLE_STATUS_LABEL[row.recapStatus.mentee]} · Mentor: {ROLE_STATUS_LABEL[row.recapStatus.mentor]}
              {row.recapStatus.source === 'IMPORTED' ? ' · (dữ liệu import)' : ''}
            </Typography.Text>
          )}
        </Space>
      )
    },
    {
      title: 'Thao tác',
      render: (_: unknown, row: SessionView) => (
        <Space>
          <Button type="text" icon={<EyeOutlined />} onClick={(event) => { event.stopPropagation(); setSelected(row); setModal('detail'); }} />
          <Button type="link" icon={<EditOutlined />} disabled={!canPair} onClick={(event) => { event.stopPropagation(); openEdit(row); }}>Chỉnh sửa</Button>
          <Popconfirm
            title="Xóa cặp mentoring?"
            description="Xóa buổi của tháng này và các tháng sau trong cùng quý, kèm lịch, recap và điểm mentoring liên quan. Các tháng trước được giữ nguyên. Không thể hoàn tác."
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => deleteFrom(row)}
            disabled={!canPair}
          >
            <Button type="link" danger icon={<DeleteOutlined />} disabled={!canPair} onClick={(event) => event.stopPropagation()}>Xóa</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <section className={['space-y-4 rounded-2xl border p-3 shadow-sm sm:space-y-5 sm:p-5', kind === 'current' ? 'border-indigo-200 bg-gradient-to-b from-indigo-50/70 to-white' : 'border-violet-200 bg-gradient-to-b from-violet-50/70 to-white'].join(' ')}>
      <header className="space-y-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Tag color={kind === 'current' ? 'geekblue' : 'purple'}>{kind === 'current' ? 'QUÝ HIỆN TẠI' : 'QUÝ KẾ TIẾP'}</Tag>
          {locked && <Tag color="red">Đã khóa</Tag>}
          {quarter && !locked && !quarter.canPair && <Tag color="orange">Chưa mở ghép cặp</Tag>}
        </div>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <Typography.Title level={3} className="!mb-0 !text-xl sm:!text-2xl">Quản lý ghép cặp</Typography.Title>
            <Typography.Text type="secondary">
              Quý {quarterCode.slice(-1)} / {quarterCode.slice(0, 4)}
              {quarter ? ` · Công bố cho thành viên: ${formatDateTime(quarter.visibleAt)}` : ''}
            </Typography.Text>
          </div>
          <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-white/80 bg-white/80 p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex flex-wrap gap-2">
              <Upload accept=".xlsx,.xls,.csv" showUploadList={false} disabled={importing || locked} beforeUpload={(file) => { void importPairs(file); return Upload.LIST_IGNORE; }}>
                <Button icon={<InboxOutlined />} disabled={importing || locked}>Import file</Button>
              </Upload>
              <Button type="primary" icon={<PlusOutlined />} disabled={!canPair} onClick={() => { setTimeout(() => createForm.setFieldsValue({ month: months[0] }), 0); setModal('create'); }}>Thêm mới</Button>
              <Button icon={locked ? <UnlockOutlined /> : <LockOutlined />} onClick={() => run(() => mentoringApi.setLock(quarterCode, !locked), locked ? 'Đã mở khóa quý' : 'Đã khóa quý', 'Không thể đổi trạng thái khóa quý')}>
                {locked ? 'Mở khóa quý' : 'Khóa quý'}
              </Button>
            </div>
          </div>
        </div>
        {importErrors.length > 0 && (
          <Alert
            type="warning"
            showIcon
            closable={{ onClose: () => setImportErrors([]) }}
            title={`${importErrors.length} dòng không import được`}
            description={<ul className="ml-4 list-disc">{importErrors.slice(0, 20).map((item) => <li key={`${item.row}-${item.message}`}>Dòng {item.row}: {item.message}</li>)}</ul>}
          />
        )}
      </header>

      <Card className="overflow-hidden !rounded-xl !border-slate-200" styles={{ body: { padding: 0 } }}>
        <Tabs
          defaultActiveKey={String(months[0] ?? '')}
          tabBarStyle={{ paddingInline: 20, marginBottom: 0 }}
          items={months.map((month) => ({
            key: String(month),
            label: `Q${quarterCode.slice(-1)}-T${month} (${sessions.filter((item) => item.month === month).length})`,
            children: (
              <Table
                rowKey="_id"
                loading={loading}
                columns={columns}
                dataSource={sessions.filter((item) => item.month === month)}
                scroll={{ x: 'max-content' }}
                pagination={{ pageSize: 10 }}
                onRow={(row) => ({ onClick: () => { setSelected(row); setModal('detail'); }, className: 'cursor-pointer' })}
                locale={{ emptyText: `Chưa có dữ liệu ghép cặp tháng ${month}/${quarterCode.slice(0, 4)}` }}
              />
            )
          }))}
        />
      </Card>

      <Card
        className="overflow-hidden !rounded-xl !border-slate-200"
        title={<span className="font-semibold">Duyệt recap mentoring</span>}
        extra={<Tag color="gold">{recapsToReview.filter((item) => item.recap.reviewStatus === 'PENDING').length} chờ duyệt</Tag>}
      >
        <Table
          rowKey={(item) => item.recap._id}
          size="small"
          loading={loading}
          dataSource={recapsToReview}
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: 'Mã cặp', render: (_: unknown, item: { session: SessionView }) => item.session.code },
            { title: 'Mentee', render: (_: unknown, item: { session: SessionView }) => memberLabel(item.session.mentee) },
            { title: 'Mentor', render: (_: unknown, item: { session: SessionView }) => memberLabel(item.session.mentor) },
            { title: 'Người viết', render: (_: unknown, item: { recap: RecapView }) => <Tag color={item.recap.role === 'MENTOR' ? 'blue' : 'green'}>{item.recap.role}</Tag> },
            { title: 'Nộp lúc', render: (_: unknown, item: { recap: RecapView }) => <>{formatDateTime(item.recap.firstSubmittedAt)}{item.recap.isLate && <Tag color="orange" className="ml-2">Muộn</Tag>}</> },
            { title: 'Duyệt', render: (_: unknown, item: { recap: RecapView }) => <Tag color={item.recap.reviewStatus === 'APPROVED' ? 'green' : item.recap.reviewStatus === 'REJECTED' ? 'red' : 'gold'}>{REVIEW_STATUS_LABEL[item.recap.reviewStatus]}</Tag> },
            { title: 'Ảnh', render: (_: unknown, item: { recap: RecapView }) => item.recap.media.length ? <a href={item.recap.media[0].url} target="_blank" rel="noreferrer">Xem ảnh ({item.recap.media.length})</a> : 'Thiếu ảnh' },
            { title: 'Thao tác', render: (_: unknown, item: { session: SessionView; recap: RecapView }) => <Button disabled={locked || item.recap.reviewStatus !== 'PENDING'} onClick={() => { setReviewNote(''); setReviewing(item); }}>Xem & duyệt</Button> }
          ]}
        />
      </Card>

      <Modal title="Thêm cặp mentoring" open={modal === 'create'} onCancel={() => setModal(null)} footer={null} forceRender destroyOnHidden>
        <PairForm form={createForm} months={months} mentorOptions={mentorOptions} menteeOptions={menteeOptions(true)} onFinish={submitCreate} hint="Hệ thống tạo buổi mentoring từ tháng đã chọn đến tháng cuối của quý. Mentor có nguyện vọng của mentee được xếp lên đầu." />
      </Modal>
      <Modal title="Sửa cặp mentoring" open={modal === 'edit'} onCancel={() => { editForm.resetFields(); setModal(null); }} footer={null} forceRender destroyOnHidden>
        <PairForm form={editForm} months={months} monthReadOnly mentorOptions={mentorOptions} menteeOptions={menteeOptions(false)} onFinish={submitEdit} hint="Áp dụng cho tháng này và các tháng sau. Lịch của các tháng này sẽ bị gỡ; không đổi được tháng đã có recap." />
      </Modal>
      <Modal title="Chi tiết cặp mentoring" open={modal === 'detail' && Boolean(selected)} onCancel={() => setModal(null)} footer={null} width={820}>
        {selected && (
          <div className="space-y-5">
            <Descriptions bordered column={{ xs: 1, md: 2 }} size="small">
              <Descriptions.Item label="Mã tháng">{selected.code}</Descriptions.Item>
              <Descriptions.Item label="Mã quý">{selected.pair?.code}</Descriptions.Item>
              <Descriptions.Item label="Mentee">{selected.mentee?.fullName} ({selected.mentee?.memberCode})</Descriptions.Item>
              <Descriptions.Item label="Mentor">{selected.mentor?.fullName} ({selected.mentor?.memberCode})</Descriptions.Item>
              <Descriptions.Item label="SĐT Mentee">{selected.mentee?.phone || '—'}</Descriptions.Item>
              <Descriptions.Item label="SĐT Mentor">{selected.mentor?.phone || '—'}</Descriptions.Item>
            </Descriptions>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Typography.Title level={5} className="!mb-0">Lịch mentoring</Typography.Title>
                <Button size="small" icon={<CheckOutlined />} disabled={locked} onClick={() => openOverride(selected)}>Ghi đè lịch</Button>
              </div>
              {selected.schedule ? (
                <Descriptions bordered column={1} size="small">
                  <Descriptions.Item label="Thời gian">{formatDateTime(selected.schedule.startAt)} – {formatDateTime(selected.schedule.endAt)}</Descriptions.Item>
                  <Descriptions.Item label="Mốc chốt lần đầu">{formatDateTime(selected.schedule.firstStartAt)} (sau mốc này thành viên không sửa được lịch)</Descriptions.Item>
                  <Descriptions.Item label="Địa điểm / link">{[selected.schedule.location, selected.schedule.meetingLink].filter(Boolean).join(' · ') || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Gửi bởi">{selected.schedule.submittedBy || 'Admin'} lúc {formatDateTime(selected.schedule.submittedAt)}</Descriptions.Item>
                </Descriptions>
              ) : <Typography.Text type="secondary">Chưa có lịch mentoring.</Typography.Text>}
            </div>
            <div>
              <Typography.Title level={5}>Trạng thái recap</Typography.Title>
              <Space wrap>
                <Tag color={PAIR_STATUS_COLOR[selected.recapStatus.pair]}>Cặp: {PAIR_STATUS_LABEL[selected.recapStatus.pair]}</Tag>
                {(['mentee', 'mentor'] as const).map((role) => (
                  <Tag key={role} color={ROLE_STATUS_COLOR[selected.recapStatus[role]]}>{role === 'mentee' ? 'Mentee' : 'Mentor'}: {ROLE_STATUS_LABEL[selected.recapStatus[role]]}</Tag>
                ))}
                {selected.recapDeadlineAt && <Typography.Text type="secondary">Hạn recap (giờ mentoring + 24h): {formatDateTime(selected.recapDeadlineAt)}</Typography.Text>}
              </Space>
              {(['mentee', 'mentor'] as const).map((role) => selected.recaps[role] && (
                <RecapCard key={role} recap={selected.recaps[role]!} />
              ))}
            </div>
          </div>
        )}
      </Modal>
      <Modal title="Ghi đè lịch mentoring" open={Boolean(overriding)} onCancel={() => { overrideForm.resetFields(); setOverriding(null); }} footer={null} forceRender destroyOnHidden>
        <Form form={overrideForm} layout="vertical" onFinish={async (values) => {
          if (!overriding) return;
          const ok = await run(
            () => mentoringApi.overrideSchedule(overriding._id, { ...values, startAt: fromDateTimeLocal(values.startAt), endAt: fromDateTimeLocal(values.endAt) }),
            'Đã ghi đè lịch mentoring',
            'Không thể ghi đè lịch'
          );
          if (ok) setOverriding(null);
        }}>
          <Typography.Paragraph type="secondary">Admin được đặt lịch cả ở quá khứ (ví dụ cập nhật buổi đã diễn ra). Lịch phải nằm trong tháng {overriding?.month}/{overriding?.year}.</Typography.Paragraph>
          <Form.Item name="startAt" label="Bắt đầu" rules={[{ required: true }]}><Input type="datetime-local" /></Form.Item>
          <Form.Item name="endAt" label="Kết thúc" rules={[{ required: true }]}><Input type="datetime-local" /></Form.Item>
          <Form.Item name="meetingLink" label="Link meeting"><Input /></Form.Item>
          <Form.Item name="location" label="Địa điểm"><Input /></Form.Item>
          <Form.Item name="note" label="Ghi chú"><Input /></Form.Item>
          <Button type="primary" htmlType="submit" block>Lưu lịch</Button>
        </Form>
      </Modal>
      <Modal title="Duyệt recap" width="min(900px, calc(100vw - 24px))" open={Boolean(reviewing)} onCancel={() => setReviewing(null)} footer={null} destroyOnHidden styles={{ body: { maxHeight: 'min(72vh, 760px)', overflowY: 'auto' } }}>
        {reviewing && (
          <div className="space-y-4">
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Cặp">{reviewing.session.code}</Descriptions.Item>
              <Descriptions.Item label="Mentee">{reviewing.session.mentee?.fullName} ({reviewing.session.mentee?.memberCode})</Descriptions.Item>
              <Descriptions.Item label="Mentor">{reviewing.session.mentor?.fullName} ({reviewing.session.mentor?.memberCode})</Descriptions.Item>
            </Descriptions>
            <RecapCard recap={reviewing.recap} />
            <Input.TextArea rows={3} value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="Ghi chú phản hồi (bắt buộc khi từ chối)" />
            <Space>
              <Button type="primary" onClick={async () => { if (await run(() => mentoringApi.reviewRecap(reviewing.recap._id, 'APPROVED', reviewNote), 'Đã duyệt recap', 'Không thể duyệt recap')) setReviewing(null); }}>Duyệt recap</Button>
              <Button danger disabled={!reviewNote.trim()} onClick={async () => { if (await run(() => mentoringApi.reviewRecap(reviewing.recap._id, 'REJECTED', reviewNote), 'Đã từ chối recap', 'Không thể từ chối recap')) setReviewing(null); }}>Từ chối</Button>
            </Space>
          </div>
        )}
      </Modal>
    </section>
  );
}

function PairForm({ form, months, mentorOptions, menteeOptions, monthReadOnly = false, onFinish, hint }: {
  form: ReturnType<typeof Form.useForm<PairFormValues>>[0];
  months: number[];
  mentorOptions: { value: string; label: string }[];
  menteeOptions: { value: string; label: string }[];
  monthReadOnly?: boolean;
  onFinish: (values: PairFormValues) => void;
  hint: string;
}) {
  return (
    <Form form={form} layout="vertical" onFinish={onFinish}>
      <Row gutter={[12, 0]}>
        <Col xs={24} md={8}><Form.Item name="month" label="Từ tháng" rules={[{ required: true, message: 'Chọn tháng' }]}><Select disabled={monthReadOnly} options={months.map((month) => ({ value: month, label: `Tháng ${month}` }))} /></Form.Item></Col>
        <Col xs={24} md={16}><Form.Item name="menteeCode" label="Mentee" rules={[{ required: true, message: 'Chọn mentee' }]}><Select showSearch optionFilterProp="label" options={menteeOptions} notFoundContent="Không có mentee đang hoạt động chưa được ghép" /></Form.Item></Col>
        <Col xs={24}><Form.Item name="mentorCode" label="Mentor" rules={[{ required: true, message: 'Chọn mentor' }]}><Select showSearch optionFilterProp="label" options={mentorOptions} /></Form.Item></Col>
      </Row>
      <Typography.Paragraph type="secondary">{hint}</Typography.Paragraph>
      <Button type="primary" htmlType="submit" block>Lưu</Button>
    </Form>
  );
}
