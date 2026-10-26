'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, App, Button, Card, Descriptions, Form, Input, Modal, Select, Space, Steps, Table, Tag, Tooltip, Typography } from 'antd';
import ImageUpload, { type UploadedImage } from '@/components/ImageUpload';
import RecapCard from '@/components/RecapCard';
import ProfileLink from '@/components/ProfileLink';
import ProxyRecapModal from '@/components/ProxyRecapModal';
import { errorMessage } from '@/lib/api';
import {
  PAIR_STATUS_COLOR,
  PAIR_STATUS_LABEL,
  ROLE_STATUS_COLOR,
  ROLE_STATUS_LABEL,
  formatDateTime,
  fromDateTimeLocal,
  mentoringApi,
  recapDelegationApi,
  toDateTimeLocal,
  type MemberView,
  type RecapDelegationAction,
  type RecapDelegationView,
  type MyMentoring,
  type MySessionView
} from '@/services/mentoringApi';
import { getCurrentTime, quarterOf } from '@/utils/time';
import PhoneLink from '@/components/PhoneLink';

const pad = (value: number) => String(value).padStart(2, '0');

/** Giới hạn ô chọn giờ trong đúng tháng của buổi */
function monthBounds(session: MySessionView) {
  const lastDay = new Date(session.year, session.month, 0).getDate();
  return {
    min: `${session.year}-${pad(session.month)}-01T00:00`,
    max: `${session.year}-${pad(session.month)}-${pad(lastDay)}T23:59`
  };
}

export default function MemberMentoringView({ role }: { role: 'MENTOR' | 'MENTEE' }) {
  const { message } = App.useApp();
  const [data, setData] = useState<MyMentoring | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [mentors, setMentors] = useState<MemberView[]>([]);
  const [scheduleSession, setScheduleSession] = useState<MySessionView | null>(null);
  const [recapSession, setRecapSession] = useState<MySessionView | null>(null);
  const [preferenceOpen, setPreferenceOpen] = useState(false);
  const [delegations, setDelegations] = useState<RecapDelegationView[]>([]);
  const [reviewing, setReviewing] = useState<{ session: MySessionView; status: 'APPROVED' | 'REJECTED' } | null>(null);
  const [proxyTarget, setProxyTarget] = useState<{ sessionId: string; code: string; role: 'MENTOR' | 'MENTEE' } | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [scheduleForm] = Form.useForm();
  const [recapForm] = Form.useForm<{ content: string; images: UploadedImage[] }>();
  const [preferenceForm] = Form.useForm<{ mentorCodes: string[]; message?: string }>();

  const loadData = async () => {
    setLoading(true);
    try {
      setData(await mentoringApi.mine());
      setLoadError('');
    } catch (error) {
      setLoadError(errorMessage(error, 'Không tải được dữ liệu mentoring'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    mentoringApi.mine()
      .then((result) => { if (active) setData(result); })
      .catch((error) => { if (active) setLoadError(errorMessage(error, 'Không tải được dữ liệu mentoring')); })
      .finally(() => { if (active) setLoading(false); });
    if (role === 'MENTEE') mentoringApi.mentors().then((list) => { if (active) setMentors(list); }).catch(() => undefined);
    // Ủy quyền duyệt hộ / nộp hộ recap MTO mà Trưởng ban Mentoring giao cho tôi (theo cặp)
    recapDelegationApi.mine().then((list) => { if (active) setDelegations(list); }).catch(() => undefined);
    return () => { active = false; };
  }, [role]);

  const currentCode = quarterOf(getCurrentTime()).code;
  /**
   * Lịch sắp tới: chỉ các buổi từ hiện tại trở đi (chưa kết thúc, hoặc chưa có lịch ở tháng hiện tại trở đi).
   * Danh sách ghép cặp theo quý: mọi buổi còn lại (đã diễn ra, cần viết recap, kết quả duyệt / điểm).
   */
  const { upcoming, pastSessions, quarterCodes } = useMemo(() => {
    const now = getCurrentTime();
    const vn = new Date(now.getTime() + 7 * 3600_000);
    const monthIndex = vn.getUTCFullYear() * 12 + vn.getUTCMonth() + 1;
    const all = (data?.sessions ?? []).filter((item) => item.status !== 'CANCELLED');
    const isUpcoming = (item: MySessionView) => item.quarterCode >= currentCode && (item.schedule
      ? new Date(item.schedule.endAt) >= now
      : item.year * 12 + item.month >= monthIndex);
    const next = all
      .filter(isUpcoming)
      .sort((a, b) => (a.schedule ? new Date(a.schedule.startAt).getTime() : (a.year * 12 + a.month) * 1e12) - (b.schedule ? new Date(b.schedule.startAt).getTime() : (b.year * 12 + b.month) * 1e12));
    const past = all.filter((item) => !next.includes(item)).sort((a, b) => b.year * 12 + b.month - (a.year * 12 + a.month) || a.code.localeCompare(b.code));
    const codes = [...new Set([...(data?.quarters ?? []).map((item) => item.code), ...all.map((item) => item.quarterCode)])].sort().reverse();
    return { upcoming: next, pastSessions: past, quarterCodes: codes };
  }, [data, currentCode]);
  const [quarterFilter, setQuarterFilter] = useState<string | undefined>();
  const [monthFilter, setMonthFilter] = useState<number | undefined>();
  const [detail, setDetail] = useState<MySessionView | null>(null);
  const selectedQuarter = quarterFilter ?? (quarterCodes.includes(currentCode) ? currentCode : quarterCodes[0]);
  const quarterMonths = selectedQuarter ? [1, 2, 3].map((offset) => (Number(selectedQuarter.slice(-1)) - 1) * 3 + offset) : [];
  const quarterRows = pastSessions.filter((item) => item.quarterCode === selectedQuarter && (!monthFilter || item.month === monthFilter));
  const needRecap = (item: MySessionView) => item.canWriteRecap && !(item.myRole === 'MENTEE' ? item.recaps.mentee : item.recaps.mentor);
  const pendingCount = pastSessions.filter(needRecap).length;

  /** Ủy quyền đang hiệu lực theo CẶP cho hành động này (ủy quyền theo nhóm dùng ở màn hình Leader) */
  const delegated = (session: MySessionView, action: RecapDelegationAction) => delegations.find((item) =>
    item.status === 'ACTIVE' && item.scopeType === 'PAIR' && item.scopeId === session.pair._id && item.actions.includes(action));

  const reviewMentorRecap = async () => {
    if (!reviewing) return;
    const recap = reviewing.session.recaps.mentor;
    if (!recap) return;
    setSaving(true);
    try {
      await recapDelegationApi.review(recap._id, { status: reviewing.status, note: reviewNote.trim() || undefined });
      message.success(reviewing.status === 'APPROVED' ? 'Đã duyệt recap MTO (làm thay theo ủy quyền)' : 'Đã không duyệt recap MTO');
      setReviewing(null);
      setDetail(null);
      setReviewNote('');
      await loadData();
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const counterpart = (session: MySessionView) => (session.myRole === 'MENTEE' ? session.mentor : session.mentee);
  const myStatus = (session: MySessionView) => (session.myRole === 'MENTEE' ? session.recapStatus.mentee : session.recapStatus.mentor);
  const myRecap = (session: MySessionView) => (session.myRole === 'MENTEE' ? session.recaps.mentee : session.recaps.mentor);

  const openSchedule = (session: MySessionView) => {
    setScheduleSession(session);
    setTimeout(() => scheduleForm.setFieldsValue({
      startAt: toDateTimeLocal(session.schedule?.startAt),
      endAt: toDateTimeLocal(session.schedule?.endAt),
      location: session.schedule?.location,
      meetingLink: session.schedule?.meetingLink,
      note: session.schedule?.note
    }), 0);
  };

  const openRecap = (session: MySessionView) => {
    const recap = myRecap(session);
    setRecapSession(session);
    setTimeout(() => recapForm.setFieldsValue({
      content: recap?.content ?? '',
      images: (recap?.media ?? []).filter((item) => item.fileId).map((item) => ({ fileId: item.fileId!, url: item.url, name: item.fileName ?? 'ảnh' }))
    }), 0);
  };

  const submitSchedule = async (values: { startAt: string; endAt: string; location?: string; meetingLink?: string; note?: string }) => {
    if (!scheduleSession) return;
    setSaving(true);
    try {
      await mentoringApi.submitSchedule(scheduleSession._id, { ...values, startAt: fromDateTimeLocal(values.startAt), endAt: fromDateTimeLocal(values.endAt) });
      message.success(scheduleSession.schedule ? 'Đã cập nhật lịch mentoring' : 'Đã gửi lịch mentoring đã chốt');
      setScheduleSession(null);
      await loadData();
    } catch (error) {
      message.error(errorMessage(error, 'Không thể gửi lịch mentoring'));
    } finally {
      setSaving(false);
    }
  };

  const submitRecap = async (values: { content: string; images: UploadedImage[] }) => {
    if (!recapSession) return;
    setSaving(true);
    try {
      await mentoringApi.submitRecap(recapSession._id, { content: values.content, fileIds: (values.images ?? []).map((item) => item.fileId) });
      message.success(myRecap(recapSession) ? 'Đã cập nhật recap' : 'Đã gửi recap');
      setRecapSession(null);
      await loadData();
    } catch (error) {
      message.error(errorMessage(error, 'Không thể lưu recap'));
    } finally {
      setSaving(false);
    }
  };

  const submitPreference = async (values: { mentorCodes: string[]; message?: string }) => {
    if (!data?.preference) return;
    setSaving(true);
    try {
      await mentoringApi.savePreference({ quarterCode: data.preference.quarterCode, ...values });
      message.success(`Đã lưu nguyện vọng mentor cho quý ${data.preference.quarterCode}`);
      setPreferenceOpen(false);
      await loadData();
    } catch (error) {
      message.error(errorMessage(error, 'Không thể lưu nguyện vọng'));
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: 'Tháng', render: (_: unknown, row: MySessionView) => `${pad(row.month)}/${row.year}` },
    { title: 'Mã mentoring', dataIndex: 'code' },
    {
      title: role === 'MENTEE' ? 'Mentor' : 'Mentee',
      render: (_: unknown, row: MySessionView) => {
        const other = counterpart(row);
        return other ? (
          <div>
            <strong>{other.fullName}</strong>
            <div className="text-sm text-gray-500">{other.memberCode}</div>
            <div className="text-sm"><PhoneLink phone={other.phone} hidden={other.phoneHidden} empty="Chưa có SĐT" /></div>
            <ProfileLink url={other.profileUrl ?? undefined} />
          </div>
        ) : '—';
      }
    },
    {
      title: 'Lịch đã chốt',
      render: (_: unknown, row: MySessionView) => row.schedule ? (
        <div>
          <div>{formatDateTime(row.schedule.startAt)}</div>
          <div className="text-xs text-gray-500">{[row.schedule.location, row.schedule.meetingLink].filter(Boolean).join(' · ')}</div>
        </div>
      ) : <Typography.Text type="secondary">Chưa có lịch</Typography.Text>
    },
    {
      title: 'Recap của tôi',
      render: (_: unknown, row: MySessionView) => (
        <Space orientation="vertical" size={2}>
          <Tag color={ROLE_STATUS_COLOR[myStatus(row)]}>{ROLE_STATUS_LABEL[myStatus(row)]}</Tag>
          {myRecap(row)?.reviewStatus === 'REJECTED' && <Tag color="red">Bị từ chối</Tag>}
          {myRecap(row)?.reviewStatus === 'APPROVED' && <Tag color="green">Đã duyệt</Tag>}
          {row.recapDeadlineAt && <Typography.Text type="secondary" className="text-xs">Hạn: {formatDateTime(row.recapDeadlineAt)}</Typography.Text>}
        </Space>
      )
    },
    { title: 'Trạng thái cặp', render: (_: unknown, row: MySessionView) => <Tag color={PAIR_STATUS_COLOR[row.recapStatus.pair]}>{PAIR_STATUS_LABEL[row.recapStatus.pair]}</Tag> },
    {
      title: 'Thao tác',
      render: (_: unknown, row: MySessionView) => {
        const recap = myRecap(row);
        const scheduleHint = row.schedule
          ? `Chỉ sửa được trước ${formatDateTime(row.schedule.firstStartAt)} (thời điểm đã chốt lần đầu)`
          : 'Gửi thời gian hai bên đã thống nhất';
        const recapHint = !row.schedule
          ? 'Cần có lịch trước khi viết recap'
          : recap?.reviewStatus === 'APPROVED'
            ? 'Recap đã được duyệt'
            : `Viết được sau khi buổi kết thúc (${formatDateTime(row.schedule.endAt)})`;
        return (
          <Space wrap>
            <Tooltip title={scheduleHint}>
              <Button disabled={!row.canEditSchedule} onClick={() => openSchedule(row)}>{row.schedule ? 'Sửa lịch' : 'Gửi lịch đã chốt'}</Button>
            </Tooltip>
            <Tooltip title={recapHint}>
              <Button type="primary" disabled={!row.canWriteRecap} onClick={() => openRecap(row)}>{recap ? 'Sửa recap' : 'Viết recap'}</Button>
            </Tooltip>
          </Space>
        );
      }
    }
  ];

  const preference = data?.preference;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Lịch mentoring & recap</h1>
      {loadError && <Alert type="error" showIcon title="Không tải được dữ liệu mentoring" description={loadError} />}
      {delegations.map((item) => (
        <Alert key={item._id} type="warning" showIcon
          title={`Trưởng ban Mentoring ${item.grantedByName} đã ủy quyền cho bạn: ${item.actions.map((action) => (action === 'REVIEW' ? 'duyệt / không duyệt' : 'nộp hộ')).join(', ')} recap MTO (${item.scope.label}), đến hết ${item.endDate.split('-').reverse().join('/')}`}
          description={`Lý do: ${item.reason}. Thao tác làm thay được ghi nhật ký. Vào Xem chi tiết của buổi để thực hiện.`} />
      ))}

      {role === 'MENTEE' && preference && (
        <Card title={`Nguyện vọng mentor cho quý ${preference.quarterCode}`}>
          <Typography.Paragraph type="secondary">
            Chọn từ 3 đến 10 mentor theo thứ tự ưu tiên, từ {formatDateTime(preference.opensAt)} đến trước {formatDateTime(preference.closesAt)}. Sau đó admin bắt đầu ghép cặp.
          </Typography.Paragraph>
          <Steps
            size="small"
            className="!mb-4"
            current={preference.mine ? 1 : 0}
            items={[
              { title: 'Gửi nguyện vọng', content: preference.mine ? `Đã gửi lúc ${formatDateTime(preference.mine.submittedAt)}` : 'Từ ngày 5 tháng cuối quý' },
              { title: 'Admin ghép cặp', content: 'Từ ngày 10 tháng cuối quý' },
              { title: 'Công bố cặp', content: 'Từ ngày 25 tháng cuối quý' }
            ]}
          />
          {preference.mine && (
            <Typography.Paragraph>
              Nguyện vọng của bạn: {preference.mine.mentorCodes.map((code, index) => `${index + 1}. ${mentors.find((mentor) => mentor.memberCode === code)?.fullName ?? code}`).join(' · ')}
            </Typography.Paragraph>
          )}
          <Button
            type="primary"
            disabled={!preference.canChoose}
            onClick={() => {
              setPreferenceOpen(true);
              setTimeout(() => preferenceForm.setFieldsValue({ mentorCodes: preference.mine?.mentorCodes ?? [], message: preference.mine?.message ?? undefined }), 0);
            }}
          >
            {!preference.canChoose ? 'Ngoài thời gian chọn nguyện vọng' : preference.mine ? 'Sửa nguyện vọng' : 'Tạo nguyện vọng'}
          </Button>
        </Card>
      )}

      <Card title="Lịch sắp tới" loading={loading && !data}>
        {data && upcoming.length === 0 && pastSessions.length === 0 ? (
          <Alert type="info" showIcon title="Chưa có dữ liệu mentoring" description="Admin chưa ghép cặp, hoặc cặp của quý tới chưa được công bố (ngày 25 tháng cuối quý)." />
        ) : (
          <>
            <Typography.Paragraph type="secondary">
              Hai bên tự hẹn lịch qua điện thoại/tin nhắn rồi một người gửi lịch đã chốt lên đây. Lịch chỉ sửa được trước thời điểm đã chốt lần đầu.
              Recap viết sau khi buổi kết thúc, cần ít nhất 1 ảnh; hạn nộp là 24 giờ sau khi buổi kết thúc (ví dụ kết thúc 20:00 ngày 10 thì hạn 20:00 ngày 11). Nộp muộn chỉ hiện trạng thái “Nộp muộn”, không trừ điểm. Thưởng mentoring sớm tính theo lần nộp đầu tiên: trước 23:59 ngày 7 được +2 điểm, trước 23:59 ngày 14 được +1 điểm (sau khi recap được duyệt).
            </Typography.Paragraph>
            <Table rowKey="_id" loading={loading} dataSource={upcoming} columns={columns} pagination={false} scroll={{ x: 'max-content' }} locale={{ emptyText: 'Không có buổi mentoring sắp tới' }} />
          </>
        )}
      </Card>

      <Card
        title="Danh sách ghép cặp theo quý"
        extra={(
          <Space wrap>
            <Select className="min-w-36" value={selectedQuarter} onChange={(value) => { setQuarterFilter(value); setMonthFilter(undefined); }}
              options={quarterCodes.map((code) => ({ value: code, label: `Quý ${code.slice(-1)}/${code.slice(0, 4)}${code === currentCode ? ' (hiện tại)' : ''}` }))} />
            <Select className="min-w-32" allowClear placeholder="Cả quý" value={monthFilter} onChange={setMonthFilter}
              options={quarterMonths.map((month) => ({ value: month, label: `Tháng ${month}` }))} />
          </Space>
        )}
      >
        {pendingCount > 0 && <Alert className="!mb-3" type="warning" showIcon title={`Bạn còn ${pendingCount} buổi đã diễn ra cần viết recap (đánh dấu “Cần viết recap” trong danh sách).`} />}
        <Table
          rowKey="_id"
          loading={loading}
          dataSource={quarterRows}
          pagination={false}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: selectedQuarter ? `Chưa có buổi mentoring đã diễn ra trong ${monthFilter ? `tháng ${monthFilter}` : `quý ${selectedQuarter.slice(-1)}/${selectedQuarter.slice(0, 4)}`}` : 'Chưa có dữ liệu' }}
          columns={[
            ...columns.slice(0, -1),
            {
              title: 'Kết quả',
              render: (_: unknown, row: MySessionView) => {
                const recap = myRecap(row);
                return (
                  <Space orientation="vertical" size={2}>
                    {needRecap(row) && <Tag color="orange">Cần viết recap</Tag>}
                    {recap?.reviewStatus === 'APPROVED' && <Tag color="green">Đã duyệt{recap.score !== null && recap.score !== undefined ? ` · ${recap.score}/100 điểm` : ''}</Tag>}
                    {recap?.reviewStatus === 'REJECTED' && <Tag color="red">Không duyệt</Tag>}
                    {recap?.reviewStatus === 'PENDING' && <Tag color="gold">Chờ duyệt</Tag>}
                    {!recap && !needRecap(row) && <Typography.Text type="secondary">—</Typography.Text>}
                  </Space>
                );
              }
            },
            {
              ...columns[columns.length - 1],
              render: (value: unknown, row: MySessionView, index: number) => (
                <Space wrap>
                  {(columns[columns.length - 1].render as (v: unknown, r: MySessionView, i: number) => React.ReactNode)(value, row, index)}
                  <Button onClick={() => setDetail(row)}>Xem chi tiết</Button>
                </Space>
              )
            }
          ]}
        />
      </Card>

      <Modal
        title={reviewing ? `${reviewing.status === 'APPROVED' ? 'Duyệt' : 'Không duyệt'} recap MTO · ${reviewing.session.code}` : ''}
        open={Boolean(reviewing)}
        onCancel={() => setReviewing(null)}
        onOk={reviewMentorRecap}
        okText={reviewing?.status === 'APPROVED' ? 'Duyệt' : 'Không duyệt'}
        okButtonProps={{ danger: reviewing?.status === 'REJECTED', disabled: reviewing?.status === 'REJECTED' && !reviewNote.trim() }}
        confirmLoading={saving}
        destroyOnHidden
      >
        <Alert className="!mb-3" type="info" showIcon title="Bạn thao tác theo ủy quyền của Trưởng ban Mentoring; hành động được ghi nhật ký là “làm thay cho”." />
        <Input.TextArea rows={3} value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder={reviewing?.status === 'REJECTED' ? 'Lý do không duyệt (bắt buộc)' : 'Ghi chú (không bắt buộc)'} />
      </Modal>
      <ProxyRecapModal target={proxyTarget} onClose={() => setProxyTarget(null)} onSaved={() => { setDetail(null); void loadData(); }} />

      <Modal title={detail ? `Chi tiết ${detail.code} · tháng ${pad(detail.month)}/${detail.year}` : ''} open={Boolean(detail)} onCancel={() => setDetail(null)} footer={null} width={860} destroyOnHidden>
        {detail && (
          <>
            <Descriptions bordered size="small" column={1} className="mb-3">
              <Descriptions.Item label="Mentor">{detail.mentor?.fullName} ({detail.mentor?.memberCode})</Descriptions.Item>
              <Descriptions.Item label="Mentee">{detail.mentee?.fullName} ({detail.mentee?.memberCode})</Descriptions.Item>
              <Descriptions.Item label="Vai trò của bạn">{detail.myRole === 'MENTOR' ? 'Mentor' : 'Mentee'}</Descriptions.Item>
              <Descriptions.Item label="Thời gian mentoring">{detail.schedule ? `${formatDateTime(detail.schedule.startAt)} – ${formatDateTime(detail.schedule.endAt)}` : 'Chưa có lịch mentoring'}</Descriptions.Item>
              {detail.schedule?.meetingLink && <Descriptions.Item label="Link meeting"><a href={detail.schedule.meetingLink} target="_blank" rel="noreferrer">Tham gia meeting</a></Descriptions.Item>}
              <Descriptions.Item label="Recap của tôi"><Tag color={ROLE_STATUS_COLOR[myStatus(detail)]}>{ROLE_STATUS_LABEL[myStatus(detail)]}</Tag></Descriptions.Item>
              <Descriptions.Item label="Trạng thái cặp"><Tag color={PAIR_STATUS_COLOR[detail.recapStatus.pair]}>{PAIR_STATUS_LABEL[detail.recapStatus.pair]}</Tag></Descriptions.Item>
            </Descriptions>
            {myRecap(detail) ? <RecapCard recap={myRecap(detail)!} /> : <Typography.Text type="secondary">Bạn chưa nộp recap cho buổi này.</Typography.Text>}
            {detail.myRole === 'MENTEE' && (
              <div className="mt-4">
                <Typography.Title level={5}>Recap của mentor (chỉ xem)</Typography.Title>
                {detail.recaps.mentor ? <RecapCard recap={detail.recaps.mentor} /> : <Typography.Text type="secondary">Mentor chưa nộp recap cho buổi này.</Typography.Text>}
                {detail.recaps.mentor && delegated(detail, 'REVIEW') && detail.recaps.mentor.reviewStatus === 'PENDING' && (
                  <Space className="mt-3">
                    <Button type="primary" onClick={() => { setReviewNote(''); setReviewing({ session: detail, status: 'APPROVED' }); }}>Duyệt hộ (theo ủy quyền)</Button>
                    <Button danger onClick={() => { setReviewNote(''); setReviewing({ session: detail, status: 'REJECTED' }); }}>Không duyệt</Button>
                  </Space>
                )}
                {!detail.recaps.mentor && detail.schedule && delegated(detail, 'PROXY') && (
                  <Button className="mt-3" onClick={() => setProxyTarget({ sessionId: detail._id, code: detail.code, role: 'MENTOR' })}>Nộp recap hộ mentor (theo ủy quyền)</Button>
                )}
              </div>
            )}
          </>
        )}
      </Modal>

      <Modal title={`${scheduleSession?.schedule ? 'Sửa lịch' : 'Gửi lịch đã chốt'} - ${scheduleSession?.code ?? ''}`} open={Boolean(scheduleSession)} onCancel={() => setScheduleSession(null)} footer={null} forceRender destroyOnHidden>
        {scheduleSession && (
          <Form form={scheduleForm} layout="vertical" onFinish={submitSchedule}>
            <Typography.Paragraph type="secondary">
              Lịch phải nằm trong tháng {pad(scheduleSession.month)}/{scheduleSession.year} và ở tương lai.
              {scheduleSession.schedule ? ` Bạn có thể sửa đến trước ${formatDateTime(scheduleSession.schedule.firstStartAt)}.` : ' Sau khi gửi, lịch chỉ sửa được trước thời điểm này.'}
            </Typography.Paragraph>
            <Form.Item
              name="startAt"
              label="Bắt đầu"
              rules={[
                { required: true, message: 'Chọn thời điểm bắt đầu' },
                { validator: (_, value) => !value || new Date(value) > getCurrentTime() ? Promise.resolve() : Promise.reject(new Error('Thời điểm phải ở tương lai')) }
              ]}
            >
              <Input
                type="datetime-local"
                {...monthBounds(scheduleSession)}
                onChange={(event) => {
                  if (!event.target.value) return;
                  const end = new Date(event.target.value);
                  end.setHours(end.getHours() + 1);
                  scheduleForm.setFieldValue('endAt', toDateTimeLocal(end));
                }}
              />
            </Form.Item>
            <Form.Item
              name="endAt"
              label="Kết thúc"
              extra="Mặc định 1 giờ sau giờ bắt đầu"
              dependencies={['startAt']}
              rules={[
                { required: true, message: 'Chọn thời điểm kết thúc' },
                ({ getFieldValue }) => ({ validator: (_, value) => !value || new Date(value) > new Date(getFieldValue('startAt')) ? Promise.resolve() : Promise.reject(new Error('Kết thúc phải sau bắt đầu')) })
              ]}
            >
              <Input type="datetime-local" {...monthBounds(scheduleSession)} />
            </Form.Item>
            <Form.Item name="meetingLink" label="Link meeting"><Input placeholder="https://meet.google.com/..." /></Form.Item>
            <Form.Item name="location" label="Địa điểm"><Input placeholder="Online hoặc địa điểm offline" /></Form.Item>
            <Form.Item name="note" label="Ghi chú"><Input placeholder="Nội dung cần trao đổi" /></Form.Item>
            <Button type="primary" htmlType="submit" block loading={saving}>{scheduleSession.schedule ? 'Lưu thay đổi' : 'Gửi lịch'}</Button>
          </Form>
        )}
      </Modal>

      <Modal title={`${recapSession && myRecap(recapSession) ? 'Sửa recap' : 'Viết recap'} - ${recapSession?.code ?? ''}`} open={Boolean(recapSession)} onCancel={() => setRecapSession(null)} footer={null} forceRender destroyOnHidden width={720}>
        {recapSession && (
          <>
            <Descriptions bordered size="small" column={1} className="mb-4">
              <Descriptions.Item label="Mentee">{recapSession.mentee?.fullName} ({recapSession.mentee?.memberCode})</Descriptions.Item>
              <Descriptions.Item label="Mentor">{recapSession.mentor?.fullName} ({recapSession.mentor?.memberCode})</Descriptions.Item>
              <Descriptions.Item label="Buổi mentoring">{formatDateTime(recapSession.schedule?.startAt)}</Descriptions.Item>
              <Descriptions.Item label="Hạn nộp">{formatDateTime(recapSession.recapDeadlineAt)}</Descriptions.Item>
            </Descriptions>
            {myRecap(recapSession)?.reviewStatus === 'REJECTED' && (
              <Alert className="mb-4" type="error" showIcon title="Recap bị từ chối" description={myRecap(recapSession)?.reviewNote || 'Vui lòng chỉnh sửa và nộp lại.'} />
            )}
            <Form form={recapForm} layout="vertical" onFinish={submitRecap}>
              <Form.Item name="content" label="Nội dung recap" rules={[{ required: true, whitespace: true, message: 'Nhập nội dung recap' }]}>
                <Input.TextArea rows={6} placeholder="Tóm tắt buổi mentoring, điều học được, kế hoạch tiếp theo" />
              </Form.Item>
              <Form.Item name="images" label="Ảnh minh chứng (ít nhất 1 ảnh)" rules={[{ validator: (_, value) => value?.length ? Promise.resolve() : Promise.reject(new Error('Tải lên ít nhất 1 ảnh minh chứng')) }]}>
                <ImageUpload />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={saving}>{myRecap(recapSession) ? 'Cập nhật recap' : 'Gửi recap'}</Button>
            </Form>
          </>
        )}
      </Modal>

      <Modal title={`Nguyện vọng mentor quý ${preference?.quarterCode ?? ''}`} open={preferenceOpen} onCancel={() => setPreferenceOpen(false)} footer={null} forceRender destroyOnHidden>
        <Form form={preferenceForm} layout="vertical" onFinish={submitPreference}>
          <Form.Item
            name="mentorCodes"
            label="Mentor theo thứ tự ưu tiên (chọn lần lượt)"
            rules={[{ validator: (_, value) => value?.length >= 3 && value.length <= 10 ? Promise.resolve() : Promise.reject(new Error('Chọn từ 3 đến 10 mentor')) }]}
          >
            <Select mode="multiple" showSearch optionFilterProp="label" placeholder="Chọn 3–10 mentor" options={mentors.map((mentor) => ({ value: mentor.memberCode, label: `${mentor.fullName} (${mentor.memberCode})` }))} />
          </Form.Item>
          <Form.Item name="message" label="Lời nhắn cho admin (không bắt buộc)">
            <Input.TextArea rows={3} maxLength={500} showCount placeholder="Mục tiêu, chủ đề hoặc thời gian phù hợp..." />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={saving}>Lưu nguyện vọng</Button>
        </Form>
      </Modal>

    </div>
  );
}
