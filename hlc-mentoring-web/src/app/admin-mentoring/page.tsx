'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, App, Button, Card, Col, Descriptions, Form, Input, Modal, Row, Select, Space, Table, Tabs, Tag, Typography, Upload } from 'antd';
import { AuditOutlined, BulbOutlined, CheckOutlined, DeleteOutlined, DownloadOutlined, EditOutlined, EyeOutlined, HistoryOutlined, InboxOutlined, LoadingOutlined, LockOutlined, PlusOutlined, UnlockOutlined, UploadOutlined } from '@ant-design/icons';
import ProfileLink from '@/components/ProfileLink';
import RecapCard from '@/components/RecapCard';
import PairSuggestModal from '@/components/PairSuggestModal';
import { useAccess } from '@/lib/useAccess';
import RecapGradingPanel from '@/components/RecapGradingPanel';
import RecapDelegationPanel from '@/components/RecapDelegationPanel';
import ProposalModal, { type ProposalPreset } from '@/components/ProposalModal';
import HistoryImportPanel from '@/components/HistoryImportPanel';
import ProxyRecapModal from '@/components/ProxyRecapModal';
import { errorMessage } from '@/lib/api';
import { proposalApi, type ProposalType } from '@/services/hlcApi';
import {
  PAIR_STATUS_COLOR,
  PAIR_STATUS_LABEL,
  ROLE_STATUS_COLOR,
  ROLE_STATUS_LABEL,
  formatDateTime,
  fromDateTimeLocal,
  mentoringApi,
  toDateTimeLocal,
  type MemberView,
  type QuarterBoard,
  type ScheduleImportResult,
  type PairLogView,
  type ScheduleLogView,
  type SessionView
} from '@/services/mentoringApi';
import { getCurrentTime, isNextQuarterPairingOpen, nextQuarterCode, quarterOf } from '@/utils/time';
import PhoneLink from '@/components/PhoneLink';

interface PairFormValues { month: number; mentorCode: string; menteeCode: string; }

export default function AdminMentoringPage() {
  const { message } = App.useApp();
  const access = useAccess();
  const [currentCode, setCurrentCode] = useState('');
  const [nextOpen, setNextOpen] = useState(false);
  const [readyCode, setReadyCode] = useState('');
  const [nextVisible, setNextVisible] = useState(false);
  const [openingNext, setOpeningNext] = useState(false);
  const nextCode = currentCode ? nextQuarterCode(currentCode) : '';
  // Chỉ xem (Trưởng ban Học tập, Trưởng ban MTE): không tạo quý, không sửa gì; muốn điều chỉnh thì gửi đề xuất
  const canManage = Boolean(access?.isSuperAdmin || access?.scopes.includes('MENTORING'));

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
    if (!currentCode || !access) return;
    let active = true;
    if (!canManage) {
      Promise.resolve().then(() => { if (active) setReadyCode(currentCode); });
      return () => { active = false; };
    }
    mentoringApi.ensureQuarter(currentCode)
      .then(() => { if (active) setReadyCode(currentCode); })
      .catch((error) => { if (active) message.error(errorMessage(error, 'Không thể khởi tạo quý hiện tại')); });
    return () => { active = false; };
  }, [currentCode, message, access, canManage]);

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
      <QuarterPanel key={currentCode} quarterCode={currentCode} kind="current" canManage={canManage} />
      {canManage && nextOpen && !nextVisible && (
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
      {nextVisible && <QuarterPanel key={nextCode} quarterCode={nextCode} kind="next" canManage={canManage} />}
      {canManage && (
        <Card className="overflow-hidden !rounded-xl !border-slate-200" title={<span className="font-semibold">Dữ liệu mentoring quý cũ (Admin toàn cục, Trưởng ban Mentoring)</span>}>
          <HistoryImportPanel />
        </Card>
      )}
    </div>
  );
}

function memberLabel(member?: MemberView | null) {
  return member ? <div><strong>{member.fullName}</strong><div className="text-xs text-gray-500">{member.memberCode}</div><div className="text-sm"><PhoneLink phone={member.phone} hidden={member.phoneHidden} empty="" /></div></div> : '—';
}

function QuarterPanel({ quarterCode, kind, canManage }: { quarterCode: string; kind: 'current' | 'next'; canManage: boolean }) {
  const { message, notification, modal: dialog } = App.useApp();
  const [createForm] = Form.useForm<PairFormValues>();
  const [editForm] = Form.useForm<PairFormValues>();
  const [overrideForm] = Form.useForm();
  const [board, setBoard] = useState<QuarterBoard | null>(null);
  const [mentors, setMentors] = useState<MemberView[]>([]);
  const [mentees, setMentees] = useState<MemberView[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | 'detail' | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [selected, setSelected] = useState<SessionView | null>(null);
  const [overriding, setOverriding] = useState<SessionView | null>(null);
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<{ row: number; message: string }[]>([]);
  const [scheduleImport, setScheduleImport] = useState<{ file: File; result: ScheduleImportResult } | null>(null);
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [pairLogs, setPairLogs] = useState<PairLogView[] | null>(null);
  const [proxyTarget, setProxyTarget] = useState<{ sessionId: string; code: string; role: 'MENTOR' | 'MENTEE' } | null>(null);
  const [logs, setLogs] = useState<{ title: string; rows: ScheduleLogView[] } | null>(null);
  const [canPropose, setCanPropose] = useState<ProposalType[]>([]);
  const [proposal, setProposal] = useState<ProposalPreset | null>(null);
  const readOnly = !canManage;
  const quarter = board?.quarter;
  const locked = Boolean(quarter?.isLocked);
  const canPair = Boolean(quarter?.canPair);

  useEffect(() => {
    if (!readOnly) return;
    proposalApi.summary().then((summary) => setCanPropose(summary.canPropose.filter((item) => item === 'PAIR_CHANGE' || item === 'MENTORING_DATA'))).catch(() => undefined);
  }, [readOnly]);

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

  const checkScheduleFile = async (file: File) => {
    setScheduleBusy(true);
    try {
      setScheduleImport({ file, result: await mentoringApi.importSchedules(quarterCode, file, true) });
    } catch (error) {
      message.error(errorMessage(error, 'Không đọc được file lịch'));
    } finally {
      setScheduleBusy(false);
    }
  };

  const applyScheduleFile = async () => {
    if (!scheduleImport) return;
    setScheduleBusy(true);
    try {
      const result = await mentoringApi.importSchedules(quarterCode, scheduleImport.file, false);
      if (result.applied) {
        message.success(`Đã cập nhật ${result.changes.length} lịch mentoring từ file`);
        setScheduleImport(null);
        await loadData();
      } else {
        setScheduleImport({ file: scheduleImport.file, result });
      }
    } catch (error) {
      message.error(errorMessage(error, 'Không nhập được file lịch'));
    } finally {
      setScheduleBusy(false);
    }
  };

  const openLogs = async (title: string, sessionId?: string) => {
    try {
      setLogs({ title, rows: await mentoringApi.scheduleLogs(sessionId ? { sessionId } : { quarter: quarterCode }) });
    } catch (error) {
      message.error(errorMessage(error, 'Không tải được nhật ký'));
    }
  };

  const submitCreate = async (values: PairFormValues) => {
    try {
      const result = await mentoringApi.createPair(quarterCode, values);
      const notes = [
        result.syncedMonths.length ? `tạo buổi tháng ${result.syncedMonths.join(', ')}` : '',
        result.existingMonths?.length ? `tháng ${result.existingMonths.join(', ')} đã có cặp này, không tạo trùng` : '',
        result.lockedMonths?.length ? `tháng ${result.lockedMonths.join(', ')} đã chốt phụ cấp nên không tự thêm` : ''
      ].filter(Boolean);
      (result.existingMonths?.length || result.lockedMonths?.length ? message.warning : message.success)(`Đã ghép cặp: ${notes.join('; ') || 'không có tháng mới'}`, 6);
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

  /** Xem trước số dữ liệu sẽ bị xóa rồi mới xác nhận (không thể hoàn tác) */
  const confirmDelete = async (session: SessionView) => {
    try {
      const preview = await mentoringApi.deletePreview(session._id);
      dialog.confirm({
        title: `Xóa cặp ${preview.pairCode} từ tháng ${preview.fromMonth}?`,
        width: 560,
        okText: 'Xóa vĩnh viễn',
        okButtonProps: { danger: true },
        cancelText: 'Hủy',
        content: (
          <div className="space-y-2">
            <p>Sẽ xóa sạch dữ liệu của cặp ở <b>tháng {preview.deleteMonths.join(', ') || '(không có)'}</b>. Các tháng trước được giữ nguyên. <b>Không thể hoàn tác.</b></p>
            <ul className="ml-4 list-disc">
              <li>{preview.counts.sessions} buổi mentoring, {preview.counts.schedules} lịch</li>
              <li>{preview.counts.recaps} recap ({preview.counts.scoredRecaps} đã chấm điểm), {preview.counts.attachments} ảnh minh chứng</li>
              <li>{preview.counts.awards} giải tháng, {preview.counts.pointEntries} dòng điểm phụ cấp phát sinh từ cặp</li>
            </ul>
            {preview.keptLockedMonths.length > 0 && <Alert type="warning" showIcon title={`Tháng ${preview.keptLockedMonths.join(', ')} đã chốt / đã chi phụ cấp nên được giữ nguyên. Nếu cần điều chỉnh tiền, dùng “Bù chênh lệch” ở trang Điểm phụ cấp.`} />}
            {preview.willDeletePair && <p>Cặp không còn tháng nào nên sẽ bị xóa khỏi quý.</p>}
          </div>
        ),
        onOk: () => deleteFrom(session)
      });
    } catch (error) {
      message.error(errorMessage(error, 'Không xem trước được dữ liệu sẽ xóa'));
    }
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
      fixed: 'right' as const,
      render: (_: unknown, row: SessionView) => (
        <Space>
          <Button type="text" icon={<EyeOutlined />} onClick={(event) => { event.stopPropagation(); setSelected(row); setModal('detail'); }} />
          {!readOnly && <Button type="link" icon={<EditOutlined />} disabled={!canPair} onClick={(event) => { event.stopPropagation(); openEdit(row); }}>Chỉnh sửa</Button>}
          {!readOnly && <Button type="link" danger icon={<DeleteOutlined />} disabled={!canPair} onClick={(event) => { event.stopPropagation(); void confirmDelete(row); }}>Xóa</Button>}
          {readOnly && canPropose.length > 0 && (
            <Button type="link" icon={<AuditOutlined />} onClick={(event) => { event.stopPropagation(); setProposal({ type: canPropose.includes('PAIR_CHANGE') ? 'PAIR_CHANGE' : 'MENTORING_DATA', sessionId: row._id }); }}>Đề xuất</Button>
          )}
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
              {!readOnly && <Upload accept=".xlsx,.xls,.csv" showUploadList={false} disabled={importing || locked} beforeUpload={(file) => { void importPairs(file); return Upload.LIST_IGNORE; }}>
                <Button icon={<InboxOutlined />} disabled={importing || locked}>Import file</Button>
              </Upload>}
              {!readOnly && <Button type="primary" icon={<PlusOutlined />} disabled={!canPair} onClick={() => { setTimeout(() => createForm.setFieldsValue({ month: months[0] }), 0); setModal('create'); }}>Thêm mới</Button>}
              {!readOnly && <Button icon={<BulbOutlined />} disabled={!canPair} onClick={() => setSuggestOpen(true)}>Gợi ý ghép cặp</Button>}
              {!readOnly && <Button icon={<DownloadOutlined />} onClick={() => mentoringApi.exportSchedules(quarterCode).catch((error) => message.error(errorMessage(error)))}>Xuất lịch .xlsx</Button>}
              {!readOnly && <Upload accept=".xlsx" showUploadList={false} disabled={scheduleBusy || locked} beforeUpload={(file) => { void checkScheduleFile(file); return Upload.LIST_IGNORE; }}>
                <Button icon={<UploadOutlined />} loading={scheduleBusy} disabled={locked}>Nhập lịch .xlsx</Button>
              </Upload>}
              <Button icon={<HistoryOutlined />} onClick={() => void openLogs(`Nhật ký thay đổi lịch quý ${quarterCode}`)}>Nhật ký lịch</Button>
              <Button icon={<HistoryOutlined />} onClick={async () => { try { setPairLogs(await mentoringApi.pairLogs(quarterCode)); } catch (error) { message.error(errorMessage(error)); } }}>Nhật ký ghép / xóa cặp</Button>
              {!readOnly && <Button icon={locked ? <UnlockOutlined /> : <LockOutlined />} onClick={() => run(() => mentoringApi.setLock(quarterCode, !locked), locked ? 'Đã mở khóa quý' : 'Đã khóa quý', 'Không thể đổi trạng thái khóa quý')}>
                {locked ? 'Mở khóa quý' : 'Khóa quý'}
              </Button>}
            </div>
          </div>
        </div>
        {readOnly && (
          <Alert
            type="info"
            showIcon
            title="Chế độ chỉ xem"
            description={`Bạn xem được dữ liệu mentoring nhưng không duyệt, không sửa, không nộp hộ.${canPropose.length ? ' Cần điều chỉnh thì bấm “Đề xuất” trên từng buổi để gửi Trưởng ban Mentoring.' : ''}`}
          />
        )}
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

      {kind === 'current' && !readOnly && (
        <Card
          className="overflow-hidden !rounded-xl !border-slate-200"
          title={<span className="font-semibold">Duyệt & chấm recap (barem chung với màn hình Leader nhóm)</span>}
        >
          <RecapGradingPanel />
        </Card>
      )}
      {kind === 'current' && !readOnly && (
        <Card
          className="overflow-hidden !rounded-xl !border-slate-200"
          title={<span className="font-semibold">Ủy quyền duyệt hộ / nộp hộ recap MTO</span>}
        >
          <RecapDelegationPanel sessions={sessions} />
        </Card>
      )}
      <ProposalModal open={Boolean(proposal)} allowed={canPropose} preset={proposal ?? undefined} onClose={() => setProposal(null)} onDone={() => setProposal(null)} />

      <PairSuggestModal
        quarterCode={quarterCode}
        open={suggestOpen}
        onClose={() => setSuggestOpen(false)}
        onPick={(mentorCode, menteeCode) => {
          setSuggestOpen(false);
          setTimeout(() => createForm.setFieldsValue({ month: months[0], mentorCode, menteeCode }), 0);
          setModal('create');
        }}
      />
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
              <Descriptions.Item label="SĐT / Zalo Mentee"><PhoneLink phone={selected.mentee?.phone} hidden={selected.mentee?.phoneHidden} /></Descriptions.Item>
              <Descriptions.Item label="SĐT / Zalo Mentor"><PhoneLink phone={selected.mentor?.phone} hidden={selected.mentor?.phoneHidden} /></Descriptions.Item>
            </Descriptions>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Typography.Title level={5} className="!mb-0">Lịch mentoring</Typography.Title>
                <Space size="small">
                  <Button size="small" icon={<HistoryOutlined />} onClick={() => void openLogs(`Nhật ký lịch ${selected.code}`, selected._id)}>Nhật ký</Button>
                  {!readOnly && <Button size="small" icon={<CheckOutlined />} disabled={locked} onClick={() => openOverride(selected)}>Ghi đè lịch</Button>}
                </Space>
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
                {selected.recapDeadlineAt && <Typography.Text type="secondary">Hạn recap (giờ kết thúc + 24 giờ): {formatDateTime(selected.recapDeadlineAt)}</Typography.Text>}
              </Space>
              {(['mentee', 'mentor'] as const).map((role) => selected.recaps[role] && (
                <RecapCard key={role} recap={selected.recaps[role]!} />
              ))}
              {readOnly && canPropose.length > 0 && (
                <Space className="mt-3" wrap>
                  <Button size="small" icon={<AuditOutlined />} onClick={() => setProposal({ type: canPropose.includes('PAIR_CHANGE') ? 'PAIR_CHANGE' : 'MENTORING_DATA', sessionId: selected._id })}>Gửi đề xuất về buổi này</Button>
                </Space>
              )}
              {!readOnly && selected.schedule && !locked && (
                <Space className="mt-3" wrap>
                  {(['mentee', 'mentor'] as const).filter((role) => !selected.recaps[role]).map((role) => (
                    <Button key={role} size="small" onClick={() => setProxyTarget({ sessionId: selected._id, code: selected.code, role: role === 'mentee' ? 'MENTEE' : 'MENTOR' })}>
                      Nhập recap hộ {role === 'mentee' ? 'MTE' : 'MTO'}
                    </Button>
                  ))}
                </Space>
              )}
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
          <Typography.Paragraph type="secondary">
            Admin được đặt lịch cả ở quá khứ (ví dụ cập nhật buổi đã diễn ra). Lịch phải nằm trong tháng {overriding?.month}/{overriding?.year}.
            Hạn recap, trạng thái đúng hạn/trễ và điểm thưởng của tháng sẽ tự tính lại theo lịch mới. Mỗi lần ghi đè được lưu vào nhật ký (không sửa/xóa được).
          </Typography.Paragraph>
          <Form.Item name="startAt" label="Bắt đầu" rules={[{ required: true }]}><Input type="datetime-local" /></Form.Item>
          <Form.Item name="endAt" label="Kết thúc" rules={[{ required: true }]}><Input type="datetime-local" /></Form.Item>
          <Form.Item name="meetingLink" label="Link meeting"><Input /></Form.Item>
          <Form.Item name="location" label="Địa điểm"><Input /></Form.Item>
          <Form.Item name="note" label="Ghi chú"><Input /></Form.Item>
          <Form.Item name="reason" label="Lý do ghi đè (bắt buộc)" rules={[{ required: true, whitespace: true, message: 'Nhập lý do ghi đè lịch' }]}>
            <Input.TextArea rows={2} placeholder="VD: Cặp báo đổi lịch qua Zalo, có ảnh xác nhận" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>Lưu lịch</Button>
        </Form>
      </Modal>
      <Modal
        title={`Nhập lịch mentoring từ file: ${scheduleImport?.file.name ?? ''}`}
        open={Boolean(scheduleImport)}
        onCancel={() => setScheduleImport(null)}
        width="min(900px, calc(100vw - 24px))"
        okText={`Áp dụng ${scheduleImport?.result.changes.length ?? 0} thay đổi`}
        okButtonProps={{ disabled: !scheduleImport?.result.valid || !scheduleImport.result.changes.length }}
        confirmLoading={scheduleBusy}
        onOk={applyScheduleFile}
        destroyOnHidden
      >
        {scheduleImport && (
          <div className="space-y-3">
            {scheduleImport.result.errors.length > 0 ? (
              <Alert type="error" showIcon title={`File có ${scheduleImport.result.errors.length} dòng lỗi: hệ thống từ chối toàn bộ file, chưa thay đổi dữ liệu nào`} description={<ul className="ml-4 list-disc">{scheduleImport.result.errors.slice(0, 30).map((item) => <li key={`${item.row}-${item.message}`}>Dòng {item.row}: {item.message}</li>)}</ul>} />
            ) : scheduleImport.result.changes.length ? (
              <Alert type="success" showIcon title={`File hợp lệ, có ${scheduleImport.result.changes.length} lịch thay đổi. Kiểm tra rồi bấm Áp dụng.`} />
            ) : <Alert type="info" showIcon title="File hợp lệ nhưng không có lịch nào thay đổi." />}
            {scheduleImport.result.changes.length > 0 && (
              <Table
                rowKey="sessionCode"
                size="small"
                pagination={false}
                dataSource={scheduleImport.result.changes}
                scroll={{ x: 'max-content' }}
                columns={[
                  { title: 'Dòng', dataIndex: 'row' },
                  { title: 'Buổi', dataIndex: 'sessionCode', render: (value: string) => <code className="text-xs">{value}</code> },
                  { title: 'Cặp', render: (_: unknown, row: ScheduleImportResult['changes'][number]) => `${row.mentor} – ${row.mentee}` },
                  { title: 'Lịch cũ', render: (_: unknown, row: ScheduleImportResult['changes'][number]) => formatDateTime(row.oldStartAt) },
                  { title: 'Lịch mới', render: (_: unknown, row: ScheduleImportResult['changes'][number]) => `${formatDateTime(row.startAt)} – ${formatDateTime(row.endAt).slice(-5)}` },
                  { title: 'Lý do', dataIndex: 'reason' }
                ]}
              />
            )}
          </div>
        )}
      </Modal>
      <Modal title={`Nhật ký ghép / xóa cặp quý ${quarterCode}`} open={Boolean(pairLogs)} onCancel={() => setPairLogs(null)} footer={null} width="min(1000px, calc(100vw - 24px))">
        <Table<PairLogView> rowKey="_id" size="small" dataSource={pairLogs ?? []} pagination={{ pageSize: 15 }} scroll={{ x: 'max-content' }} columns={[
          { title: 'Thời điểm', render: (_: unknown, row: PairLogView) => formatDateTime(row.createdAt) },
          { title: 'Thao tác', dataIndex: 'action', render: (value: string) => <Tag color={value === 'DELETE' ? 'red' : 'green'}>{value === 'DELETE' ? 'Xóa cặp' : 'Ghép cặp'}</Tag> },
          { title: 'Cặp', render: (_: unknown, row: PairLogView) => <span><code className="text-xs">{row.pairCode}</code><div className="text-xs text-gray-500">{row.mentorCode} – {row.menteeCode}</div></span> },
          { title: 'Từ tháng', dataIndex: 'fromMonth' },
          { title: 'Tháng bị tác động', render: (_: unknown, row: PairLogView) => (
            <div className="text-xs">
              {row.detail.affectedMonths?.length ? `${row.action === 'DELETE' ? 'Xóa' : 'Tạo'}: ${row.detail.affectedMonths.join(', ')}` : '—'}
              {row.detail.existingMonths?.length ? <div>Đã có (không tạo trùng): {row.detail.existingMonths.join(', ')}</div> : null}
              {row.detail.lockedMonths?.length || row.detail.keptLockedMonths?.length ? <div>Đã chốt (giữ nguyên): {(row.detail.lockedMonths ?? row.detail.keptLockedMonths ?? []).join(', ')}</div> : null}
            </div>
          ) },
          { title: 'Số bản ghi', render: (_: unknown, row: PairLogView) => row.detail.counts ? `${row.detail.counts.sessions} buổi, ${row.detail.counts.recaps} recap, ${row.detail.counts.pointEntries} dòng điểm` : '—' },
          { title: 'Người thực hiện', dataIndex: 'actor' }
        ]} />
      </Modal>
      <ProxyRecapModal target={proxyTarget} onClose={() => setProxyTarget(null)} onSaved={() => void loadData()} />
      <Modal title={logs?.title} open={Boolean(logs)} onCancel={() => setLogs(null)} footer={null} width="min(1000px, calc(100vw - 24px))">
        <Typography.Paragraph type="secondary">Nhật ký chỉ đọc: không ai sửa hoặc xóa được, dùng để đối soát điểm thưởng.</Typography.Paragraph>
        <Table<ScheduleLogView>
          rowKey="_id"
          size="small"
          dataSource={logs?.rows ?? []}
          pagination={{ pageSize: 15 }}
          scroll={{ x: 'max-content' }}
          columns={[
            { title: 'Thời điểm', render: (_: unknown, row: ScheduleLogView) => formatDateTime(row.createdAt) },
            { title: 'Buổi', render: (_: unknown, row: ScheduleLogView) => <code className="text-xs">{row.sessionCode}</code> },
            { title: 'Thao tác', dataIndex: 'action', render: (value: string) => <Tag color={value === 'ADMIN_OVERRIDE' ? 'red' : value === 'CREATE' ? 'green' : 'blue'}>{({ CREATE: 'Gửi lịch', UPDATE: 'Sửa lịch', ADMIN_OVERRIDE: 'Admin ghi đè', CANCEL: 'Hủy' } as Record<string, string>)[value] ?? value}</Tag> },
            { title: 'Người sửa', render: (_: unknown, row: ScheduleLogView) => row.actor ? (row.actor.fullname || row.actor.username) : '—' },
            { title: 'Lịch cũ', render: (_: unknown, row: ScheduleLogView) => formatDateTime(row.oldStartAt) },
            { title: 'Lịch mới', render: (_: unknown, row: ScheduleLogView) => formatDateTime(row.newStartAt) },
            { title: 'Lý do', dataIndex: 'reason', render: (value: string | null) => value || '—' }
          ]}
        />
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
