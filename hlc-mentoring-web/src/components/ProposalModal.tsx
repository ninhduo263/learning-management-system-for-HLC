'use client';

import { useEffect, useState } from 'react';
import { Alert, App, Form, Input, InputNumber, Modal, Select } from 'antd';
import MonthPicker, { currentPeriodCode } from '@/components/MonthPicker';
import { errorMessage } from '@/lib/api';
import { mentoringApi, type SessionView } from '@/services/mentoringApi';
import {
  PROPOSAL_DECIDER_LABEL, PROPOSAL_TYPE_LABEL, memberDirectoryApi, proposalApi,
  type DirectoryMember, type ProposalType
} from '@/services/hlcApi';
import { getCurrentTime, quarterOf } from '@/utils/time';

/** Gợi ý điền sẵn khi mở từ một màn hình có ngữ cảnh (bảng điểm, danh sách cặp...) */
export interface ProposalPreset {
  type?: ProposalType;
  memberId?: string;
  sessionId?: string;
  periodCode?: string;
  /** MENTORING_DATA: SESSION | RECAP_MENTEE | RECAP_MENTOR | MEMBER_SCORE */
  dataTarget?: string;
}

interface Values {
  type: ProposalType;
  memberId?: string;
  sessionId?: string;
  mentorCode?: string;
  periodCode?: string;
  points?: number;
  pointTypeCode?: string;
  sourceType?: string;
  dataTarget?: string;
  reason: string;
}

const POINT_TYPES = [
  { value: 'MENTORING_EARLY', label: 'Mentoring sớm' },
  { value: 'MENTORING_AWARD', label: 'Giải cặp mentoring' },
  { value: 'LEARNING', label: 'Học tập' },
  { value: 'MANUAL_BONUS', label: 'Cộng điểm thủ công' },
  { value: 'MANUAL_PENALTY', label: 'Trừ điểm thủ công' }
];
const DATA_TARGETS = [
  { value: 'SESSION', label: 'Buổi mentoring (lịch, trạng thái)' },
  { value: 'RECAP_MENTEE', label: 'Recap của MTE (điểm / nội dung)' },
  { value: 'RECAP_MENTOR', label: 'Recap của MTO' },
  { value: 'MEMBER_SCORE', label: 'Điểm của một thành viên' }
];

/**
 * Gửi đề xuất cho chức vụ nắm quyền (Trưởng ban Mentoring / Trưởng ban HLC Fund). Người gửi chỉ chọn được các loại
 * đề xuất phù hợp với chức vụ của mình (`allowed` lấy từ /proposals/summary).
 */
export default function ProposalModal({ open, allowed, preset, onClose, onDone }: {
  open: boolean;
  allowed: ProposalType[];
  preset?: ProposalPreset;
  onClose: () => void;
  onDone: () => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<Values>();
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [mentors, setMentors] = useState<DirectoryMember[]>([]);
  const [sessions, setSessions] = useState<SessionView[]>([]);
  const type = Form.useWatch('type', form) as ProposalType | undefined;
  const dataTarget = Form.useWatch('dataTarget', form) as string | undefined;
  const sessionId = Form.useWatch('sessionId', form) as string | undefined;

  useEffect(() => {
    if (!open) return;
    let active = true;
    const code = quarterOf(getCurrentTime()).code;
    Promise.all([
      memberDirectoryApi.list().catch(() => [] as DirectoryMember[]),
      mentoringApi.board(code).then((board) => board.sessions).catch(() => [] as SessionView[])
    ]).then(([all, board]) => {
      if (!active) return;
      setMembers(all);
      setMentors(all.filter((item) => item.memberType === 'MENTOR' && item.status === 'ACTIVE'));
      setSessions(board.filter((item) => item.status === 'ACTIVE'));
    });
    form.resetFields();
    form.setFieldsValue({
      type: preset?.type ?? allowed[0],
      memberId: preset?.memberId,
      sessionId: preset?.sessionId,
      dataTarget: preset?.dataTarget ?? 'SESSION',
      periodCode: preset?.periodCode ?? currentPeriodCode(getCurrentTime())
    });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const memberOptions = members.filter((item) => item.status === 'ACTIVE').map((item) => ({ value: item._id, label: `${item.memberCode} – ${item.fullName}` }));
  const sessionOptions = sessions.map((item) => ({
    value: item._id,
    label: `${item.code} · T${item.month} · ${item.mentor?.fullName ?? '—'} – ${item.mentee?.fullName ?? '—'}`
  }));
  const chosenSession = sessions.find((item) => item._id === sessionId);

  const submit = async (values: Values) => {
    setSaving(true);
    try {
      let body;
      if (values.type === 'PAIR_CHANGE') {
        const session = sessions.find((item) => item._id === values.sessionId);
        body = { type: values.type, reason: values.reason, targetId: values.sessionId!, payload: { mentorCode: values.mentorCode, menteeCode: session?.mentee?.memberCode } };
      } else if (values.type === 'MENTORING_DATA') {
        const target = values.dataTarget ?? 'SESSION';
        if (target === 'MEMBER_SCORE') body = { type: values.type, reason: values.reason, targetType: 'MEMBER_SCORE', targetId: values.memberId! };
        else if (target === 'SESSION') body = { type: values.type, reason: values.reason, targetType: 'SESSION', targetId: values.sessionId! };
        else {
          const recap = target === 'RECAP_MENTEE' ? chosenSession?.recaps.mentee : chosenSession?.recaps.mentor;
          if (!recap) throw new Error('Buổi này chưa có recap của vai trò đã chọn');
          body = { type: values.type, reason: values.reason, targetType: 'RECAP', targetId: recap._id };
        }
      } else {
        const payload: Record<string, unknown> = { periodCode: values.periodCode, points: values.points, ...(values.pointTypeCode && { pointTypeCode: values.pointTypeCode }) };
        if (values.type === 'MENTORING_POINT') Object.assign(payload, { sourceType: 'SESSION', sourceId: values.sessionId });
        body = { type: values.type, reason: values.reason, targetId: values.memberId!, payload };
      }
      await proposalApi.create(body);
      message.success(`Đã gửi đề xuất cho ${PROPOSAL_DECIDER_LABEL[values.type]}`);
      window.dispatchEvent(new Event('hlc-proposal-change'));
      onDone();
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const needsSession = type === 'PAIR_CHANGE' || type === 'MENTORING_POINT' || (type === 'MENTORING_DATA' && dataTarget !== 'MEMBER_SCORE');
  const needsMember = type === 'POINT_ADJUST' || type === 'MENTORING_POINT' || (type === 'MENTORING_DATA' && dataTarget === 'MEMBER_SCORE');

  return (
    <Modal title="Gửi đề xuất" open={open} onCancel={onClose} onOk={() => form.submit()} okText="Gửi đề xuất" cancelText="Hủy" confirmLoading={saving} width={640} destroyOnHidden>
      <Form form={form} layout="vertical" onFinish={submit} initialValues={{ dataTarget: 'SESSION' }}>
        <Form.Item name="type" label="Loại đề xuất" rules={[{ required: true }]}>
          <Select options={allowed.map((value) => ({ value, label: PROPOSAL_TYPE_LABEL[value] }))} />
        </Form.Item>
        {type && <Alert className="!mb-4" type="info" showIcon title={`Gửi đến: ${PROPOSAL_DECIDER_LABEL[type]}`} description="Người nhận duyệt hoặc từ chối. Duyệt thì hệ thống áp dụng luôn; mọi đề xuất được lưu lịch sử." />}
        {type === 'MENTORING_DATA' && (
          <Form.Item name="dataTarget" label="Dữ liệu mentoring cần điều chỉnh" rules={[{ required: true }]}><Select options={DATA_TARGETS} /></Form.Item>
        )}
        {needsSession && (
          <Form.Item name="sessionId" label={type === 'MENTORING_POINT' ? 'Buổi mentoring làm gốc của điểm' : 'Buổi mentoring'} rules={[{ required: true, message: 'Chọn buổi mentoring' }]}>
            <Select showSearch={{ optionFilterProp: 'label' }} options={sessionOptions} placeholder="Chọn buổi trong quý hiện tại" />
          </Form.Item>
        )}
        {type === 'PAIR_CHANGE' && (
          <Form.Item name="mentorCode" label="Mentor mới" rules={[{ required: true, message: 'Chọn mentor mới' }]} extra={chosenSession ? `MTE giữ nguyên: ${chosenSession.mentee?.fullName}` : undefined}>
            <Select showSearch={{ optionFilterProp: 'label' }} options={mentors.map((item) => ({ value: item.memberCode, label: `${item.memberCode} – ${item.fullName}` }))} />
          </Form.Item>
        )}
        {needsMember && (
          <Form.Item name="memberId" label="Thành viên" rules={[{ required: true, message: 'Chọn thành viên' }]}>
            <Select showSearch={{ optionFilterProp: 'label' }} options={memberOptions} />
          </Form.Item>
        )}
        {(type === 'POINT_ADJUST' || type === 'MENTORING_POINT') && (
          <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-3">
            <Form.Item name="periodCode" label="Kỳ" rules={[{ required: true }]}>
              <MonthPicker value={form.getFieldValue('periodCode')} onChange={(value) => form.setFieldValue('periodCode', value)} />
            </Form.Item>
            <Form.Item name="points" label="Số điểm (âm = trừ)" rules={[{ required: true, message: 'Nhập số điểm' }]}><InputNumber className="w-full" step={0.5} min={-100} max={100} /></Form.Item>
            <Form.Item name="pointTypeCode" label="Loại điểm"><Select allowClear options={POINT_TYPES} placeholder="Tự chọn" /></Form.Item>
          </div>
        )}
        <Form.Item name="reason" label={type === 'MENTORING_DATA' ? 'Nội dung đề xuất / bình luận' : 'Lý do đề xuất'} rules={[{ required: true, whitespace: true, message: 'Nhập lý do' }]}>
          <Input.TextArea rows={4} placeholder="Nêu rõ vì sao cần thay đổi để người duyệt có đủ căn cứ" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
