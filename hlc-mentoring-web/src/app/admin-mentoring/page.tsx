'use client';

import { useEffect, useMemo, useState } from 'react';
import { App, Button, Card, Col, Descriptions, Form, Input, Modal, Popconfirm, Row, Select, Space, Table, Tabs, Tag, Typography, Upload } from 'antd';
import { EyeOutlined, EditOutlined, PlusOutlined, CheckOutlined, InboxOutlined, LockOutlined, UnlockOutlined, DeleteOutlined, LoadingOutlined } from '@ant-design/icons';
import { apiFetch } from '@/lib/api';
import {
  getMentoringRecapProgressStatus,
  mentoringRecapProgressColor,
  mentoringRecapProgressLabel
} from '@/utils/mentoringSchedule';
import { getCurrentTime } from '@/utils/time';
import ProfileLink from '@/components/ProfileLink';

interface Cycle { code: string; name: string; }
interface UserOption { userId: string; fullName: string; mentorId?: string; isActive?: string; profileUrl?: string; preferenceRank?: number; }
interface MentorPreference { cycleId: string; menteeId: string; mentorIds: string[]; }
interface Pair {
  _id: string;
  pairCode?: string;
  monthlyCode?: string;
  monthlyId?: string;
  quarterlyId?: string;
  cycleId: string;
  mentorId: string;
  menteeId: string;
  status: string;
  recapStatus?: string;
}

function pairMonth(pair: Pair, cycleId: string) {
  const monthlyMatch = /^T(1[0-2]|[1-9])Q[1-4]\d{4}O\d{5}E\d{5}$/i.exec(pair.monthlyId || '');
  if (monthlyMatch) return Number(monthlyMatch[1]);
  const code = pair.pairCode || pair.monthlyCode || '';
  const formattedMatch = /^(\d{2})\/\d{4}-\d{5}-\d{5}$/.exec(code);
  if (formattedMatch) return Number(formattedMatch[1]);
  const numericMonth = Number(code.slice(0, 2));
  if (numericMonth >= 1 && numericMonth <= 12) return numericMonth;
  const match = new RegExp(`^${cycleId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}M([1-3])$`, 'i').exec(code);
  if (!match) return undefined;
  const quarter = Number(cycleId.slice(-1));
  return (quarter - 1) * 3 + Number(match[1]);
}

function quarterlyIdForCycle(cycleId: string) {
  const match = /^(\d{4})Q([1-4])$/i.exec(String(cycleId || '').trim());
  return match ? `Q${match[2]}${match[1]}` : '';
}

function normalizeCycleId(cycleId: string) {
  return String(cycleId || '').trim().toUpperCase().replace(/-/g, '');
}

function participantKey(userId: string) {
  const normalized = String(userId || '').trim().toUpperCase();
  const digits = normalized.replace(/\D/g, '');
  return digits.length >= 5 ? digits.slice(-5) : normalized.replace(/[^A-Z0-9]/g, '');
}

function isActiveUser(user: UserOption) {
  const normalized = String(user.isActive || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return ['yes', 'co', 'active', 'true'].includes(normalized);
}

interface Schedule {
  _id: string;
  monthlyId?: string;
  cycleId: string;
  monthCode?: string;
  startTime: string;
  endTime: string;
  confirmedAt?: string;
  createdAt?: string;
  status: string;
  meetingLink?: string;
  location?: string;
  note?: string;
}
interface Recap {
  _id: string;
  monthlyId?: string;
  scheduleId?: string;
  userId: string;
  role: string;
  status: string;
  submittedAt?: string;
  createdAt: string;
  content?: string;
  mediaUrls?: string[];
  note?: string;
}
interface PairForm { cycleId: string; month: number; mentorId: string; menteeId: string; }

const recapLabels: Record<string, string> = {
  PENDING: 'Chờ',
  SUBMITTED: 'Đã nộp',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Bị từ chối',
  'ĐÃ NỘP/ĐÃ XONG': 'Đã xong',
  'CHƯA XONG': 'Chưa xong',
  'NỘP MUỘN': 'Nộp muộn',
  MISSING: 'Chưa xong',
  CHỜ: 'Chờ'
};

function recapColor(status?: string) {
  const normalized = String(status || '').toUpperCase();
  if (['SUBMITTED', 'APPROVED', 'ĐÃ NỘP/ĐÃ XONG'].includes(normalized)) return 'green';
  if (['REJECTED', 'MISSING', 'CHƯA XONG'].includes(normalized)) return 'red';
  return 'gold';
}

function toDateTimeLocal(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  const pad = (number: number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function quarterForDate(date: Date) {
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
  return {
    year: date.getUTCFullYear(),
    quarter,
    code: `${date.getUTCFullYear()}Q${quarter}`
  };
}

function nextQuarterCode(cycleCode: string) {
  const match = /^(\d{4})Q([1-4])$/i.exec(cycleCode);
  if (!match) return '';
  const year = Number(match[1]);
  const quarter = Number(match[2]);
  return quarter === 4 ? `${year + 1}Q1` : `${year}Q${quarter + 1}`;
}

function isNextQuarterPairingOpen(date: Date) {
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
  return date.getUTCMonth() === quarter * 3 - 1 && date.getUTCDate() >= 10;
}

async function ensureCycleExists(cycleCode: string) {
  const cycleMatch = /^(\d{4})Q([1-4])$/i.exec(cycleCode);
  if (!cycleMatch) throw new Error('Mã quý không hợp lệ');

  const response = await apiFetch('/cycles');
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Không thể tải danh sách kỳ mentoring');
  }
  if (result.data.some((cycle: Cycle) => cycle.code === cycleCode)) return;

  const createResponse = await apiFetch('/cycles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `Quý ${Number(cycleMatch[2])} - ${cycleMatch[1]}`,
      year: Number(cycleMatch[1]),
      quarter: Number(cycleMatch[2])
    })
  });
  const createResult = await createResponse.json();
  if (!createResponse.ok || !createResult.success) {
    throw new Error(createResult.message || `Không thể khởi tạo kỳ ${cycleCode}`);
  }
}

export default function AdminMentoringPage() {
  const { message } = App.useApp();
  const [currentCycleCode, setCurrentCycleCode] = useState('');
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [currentCycleReady, setCurrentCycleReady] = useState(false);
  const [nextCycleVisible, setNextCycleVisible] = useState(false);
  const [openingNextCycle, setOpeningNextCycle] = useState(false);
  const currentQuarter = currentTime ? quarterForDate(currentTime) : null;
  const nextCycleCode = currentQuarter ? nextQuarterCode(currentQuarter.code) : '';
  const nextQuarterOpen = currentTime ? isNextQuarterPairingOpen(currentTime) : false;

  useEffect(() => {
    const refreshCurrentCycle = () => {
      const now = getCurrentTime();
      setCurrentTime(now);
      setCurrentCycleCode(quarterForDate(now).code);
    };
    refreshCurrentCycle();
    const timer = window.setInterval(refreshCurrentCycle, 60_000);
    window.addEventListener('hlc-mock-date-change', refreshCurrentCycle);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('hlc-mock-date-change', refreshCurrentCycle);
    };
  }, []);

  useEffect(() => {
    if (!currentCycleCode) return;
    let active = true;
    setCurrentCycleReady(false);
    void ensureCycleExists(currentCycleCode)
      .then(() => {
        if (active) setCurrentCycleReady(true);
      })
      .catch((error) => {
        if (active) message.error(error instanceof Error ? error.message : 'Không thể khởi tạo quý hiện tại');
      });
    return () => { active = false; };
  }, [currentCycleCode, message]);

  const openNextCycle = async () => {
    setOpeningNextCycle(true);
    try {
      await ensureCycleExists(nextCycleCode);
      setNextCycleVisible(true);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể mở quản lý quý kế tiếp');
    } finally {
      setOpeningNextCycle(false);
    }
  };

  if (!currentQuarter || !currentCycleCode || !currentCycleReady) {
    return (
      <Card className="flex min-h-40 items-center justify-center">
        <Typography.Text type="secondary">
          {currentCycleCode ? 'Đang chuẩn bị kỳ mentoring hiện tại…' : 'Đang xác định quý hiện tại…'}
        </Typography.Text>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <CycleManagementPanel key={currentCycleCode} cycleCode={currentCycleCode} panelKind="current" />
      {nextQuarterOpen && (
        <Card className="border-dashed">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
                    <Typography.Title level={5} className="!mb-1">
                Chuẩn bị ghép cặp Quý {nextCycleCode.slice(-1)} - {nextCycleCode.slice(0, 4)}
              </Typography.Title>
              <Typography.Text type="secondary">
                Quý kế tiếp đã mở từ ngày 10 của tháng cuối quý. Quý hiện tại vẫn được giữ bên trên.
              </Typography.Text>
            </div>
            <Button type="primary" loading={openingNextCycle} onClick={openNextCycle}>
              {nextCycleVisible ? 'Đã mở quản lý quý sau' : 'Quản lý ghép cặp quý sau'}
            </Button>
          </div>
        </Card>
      )}
      {nextCycleVisible && (
        <CycleManagementPanel key={nextCycleCode} cycleCode={nextCycleCode} panelKind="next" />
      )}
    </div>
  );
}

function CycleManagementPanel({ cycleCode, panelKind }: { cycleCode: string; panelKind: 'current' | 'next' }) {
  const { message, notification } = App.useApp();
  const [createForm] = Form.useForm<PairForm>();
  const [editForm] = Form.useForm<PairForm>();
  const [overrideForm] = Form.useForm();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [mentors, setMentors] = useState<UserOption[]>([]);
  const [mentees, setMentees] = useState<UserOption[]>([]);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [recaps, setRecaps] = useState<Recap[]>([]);
  const [mentorPreferences, setMentorPreferences] = useState<MentorPreference[]>([]);
  const ADMIN_PAIRING_CYCLE = cycleCode;
  const selectedCycle = cycleCode;
  const [selectedPair, setSelectedPair] = useState<Pair | null>(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<'create' | 'edit' | 'detail' | null>(null);
  const [overrideSchedule, setOverrideSchedule] = useState<Schedule | null>(null);
  const [reviewingRecap, setReviewingRecap] = useState<Recap | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [expandedReviewContent, setExpandedReviewContent] = useState(false);
  const [cycleLocked, setCycleLocked] = useState(false);
  const [importing, setImporting] = useState(false);
  const unlockCycle = async () => {
    if (!selectedCycle) return;
    try {
      const response = await apiFetch(`/cycles/${encodeURIComponent(selectedCycle)}/unlock`, { method: 'PATCH' });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      message.success('Đã mở khóa quý để test tạo lịch mentoring');
      await loadData(selectedCycle);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể mở khóa quý');
    }
  };

  const mentorName = (id: string) => mentors.find((item) => item.userId === id)?.fullName || id;
  const menteeName = (id: string) => mentees.find((item) => item.userId === id)?.fullName || id;
  const mentorProfile = (id: string) => mentors.find((item) => item.userId === id)?.profileUrl;
  const menteeProfile = (id: string) => mentees.find((item) => item.userId === id)?.profileUrl;

  const loadData = async (cycleId = selectedCycle) => {
    setLoading(true);
    try {
      const quarterlyId = quarterlyIdForCycle(cycleId);
      const pairQuery = quarterlyId ? `?quarterlyId=${encodeURIComponent(quarterlyId)}` : '';
      const cycleQuery = cycleId ? `?cycleId=${encodeURIComponent(cycleId)}` : '';
      const responses = await Promise.all([
        apiFetch('/cycles'),
        apiFetch('/users/mentors?includeInactive=true'),
        apiFetch('/users/mentees?includeInactive=true'),
        apiFetch(`/mentoring/pairs${pairQuery}`),
        apiFetch(`/mentoring/schedules${cycleQuery}`),
        apiFetch(`/mentoring/recaps${cycleQuery}`),
        apiFetch(`/mentoring/pairs/status${pairQuery}`),
        apiFetch(`/mentoring/preferences?cycleId=${encodeURIComponent(cycleId)}`)
      ]);
      const results = await Promise.all(responses.map((response) => response.json()));
      const [cycleResult, mentorResult, menteeResult, pairResult, scheduleResult, recapResult, statusResult, preferenceResult] = results;
      if (cycleResult.success) {
        setCycles(cycleResult.data);
        setCycleLocked(Boolean(cycleResult.data.find((cycle: Cycle & { isLocked?: boolean }) => cycle.code === cycleId)?.isLocked));
      }
      if (!mentorResult.success) throw new Error(mentorResult.message || 'Không thể tải danh sách Mentor');
      if (!menteeResult.success) throw new Error(menteeResult.message || 'Không thể tải danh sách Mentee');
      setMentors(mentorResult.data || []);
      setMentees(menteeResult.data || []);
      if (scheduleResult.success) setSchedules(scheduleResult.data);
      if (recapResult.success) setRecaps(recapResult.data);
      if (!preferenceResult.success) throw new Error(preferenceResult.message || 'Không thể tải nguyện vọng Mentor');
      setMentorPreferences(Array.isArray(preferenceResult.data) ? preferenceResult.data : []);
      if (!pairResult.success) {
        throw new Error(pairResult.message || 'Không thể tải danh sách cặp mentoring');
      }
      const basePairs: Pair[] = cycleId
        ? pairResult.data.filter((item: Pair) =>
          String(item.quarterlyId || '').toUpperCase().startsWith(quarterlyId)
        )
        : pairResult.data;
      const statusByMonthlyId = new Map<string, Partial<Pair>>(
        statusResult.success
          ? statusResult.data.map((item: Pair) => [item.monthlyId, item])
          : []
      );
      setPairs(basePairs.map((pair) => ({
        ...pair,
        ...(pair.monthlyId ? statusByMonthlyId.get(pair.monthlyId) || {} : {})
      })));
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể tải danh sách ghép cặp');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (selectedCycle) loadData(selectedCycle); }, [selectedCycle]);

  const toggleCycleLock = async () => {
    try {
      const response = await apiFetch('/mentoring/quarter-lock', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycleId: selectedCycle, isLocked: !cycleLocked })
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      setCycleLocked(!cycleLocked);
      message.success(!cycleLocked ? 'Đã khóa quý' : 'Đã mở khóa quý');
      await loadData(selectedCycle);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể đổi trạng thái khóa quý');
    }
  };

  const importPairs = async (file: File) => {
    const notificationKey = 'mentoring-pair-import';
    setImporting(true);
    notification.open({
      key: notificationKey,
      message: 'Đang import dữ liệu ghép cặp',
      description: 'Hệ thống đang đọc file và đồng bộ cặp mentoring cho cả 3 tháng. Vui lòng không đóng trang.',
      icon: <LoadingOutlined spin />,
      duration: 0
    });
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('cycleId', selectedCycle);
      const response = await apiFetch('/mentoring/import-pairs', { method: 'POST', body });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      const importData = result.data;
      const failed = Number(importData.failed || 0);
      const skipped = Number(importData.skipped || 0);
      message.success(
        `Đã import ${Number(importData.inserted || 0)} cặp mới, cập nhật ${Number(importData.updated || 0)} cặp` +
        `${skipped ? `, bỏ qua ${skipped} cặp` : ''}` +
        `${failed ? `, lỗi ${failed} dòng` : ''}`
      );
      notification.success({
        key: notificationKey,
        message: 'Import hoàn tất',
        description: `Đã xử lý ${Number(importData.pairsRead || 0)} cặp. Danh sách sẽ được tải lại.`,
        duration: 4
      });
      await loadData(selectedCycle);
    } catch (error) {
      notification.error({
        key: notificationKey,
        message: 'Import thất bại',
        description: error instanceof Error ? error.message : 'Không thể import cặp mentoring',
        duration: 6
      });
      message.error(error instanceof Error ? error.message : 'Không thể import cặp mentoring');
    } finally {
      setImporting(false);
    }
  };

  const cycleOptions = cycles
    .filter((cycle) => cycle.code === cycleCode)
    .map((cycle) => ({ value: cycle.code, label: `${cycle.code} - ${cycle.name}` }));
  const createCycleCode = Form.useWatch('cycleId', createForm) || selectedCycle;
  const createMenteeId = Form.useWatch('menteeId', createForm);
  const monthOptions = monthsForCycleOptions(createCycleCode);
  const availableMentors = useMemo(() => {
    const preference = mentorPreferences.find((item) =>
      normalizeCycleId(item.cycleId) === normalizeCycleId(createCycleCode)
      && participantKey(item.menteeId) === participantKey(createMenteeId || '')
    );
    const ranks = new Map((preference?.mentorIds || []).map((mentorId, index) => [participantKey(mentorId), index + 1]));
    return mentors
      .filter(isActiveUser)
      .map((mentor) => ({ ...mentor, preferenceRank: ranks.get(participantKey(mentor.userId)) }))
      .sort((first, second) =>
        (first.preferenceRank || Number.MAX_SAFE_INTEGER) - (second.preferenceRank || Number.MAX_SAFE_INTEGER)
      );
  }, [mentors, mentorPreferences, createCycleCode, createMenteeId]);
  const pairedMenteeIds = useMemo(
    () => new Set(pairs
      .filter((pair) =>
        normalizeCycleId(pair.cycleId) === normalizeCycleId(createCycleCode) &&
        String(pair.status || '').trim().toUpperCase() !== 'CANCELLED'
      )
      .map((pair) => participantKey(pair.menteeId))),
    [pairs, createCycleCode]
  );
  const availableMentees = mentees.filter((mentee) =>
    isActiveUser(mentee) && !pairedMenteeIds.has(participantKey(mentee.userId))
  );
  const monthlyPairs = useMemo(
    () => monthsForCycleOptions(cycleCode).map(({ value: month }) => ({
      month,
      pairs: pairs.filter((pair) => {
        if (pair.cycleId !== ADMIN_PAIRING_CYCLE) return false;
        return pairMonth(pair, ADMIN_PAIRING_CYCLE) === month;
      })
    })),
    [pairs]
  );
  const buildMonthlyCode = (values: PairForm) => {
    return String(values.month);
  };

  const cleanCycleId = (value: unknown) => {
    const match = /^(\d{4}Q[1-4])/i.exec(String(value || '').trim());
    return match ? match[1].toUpperCase() : '';
  };

  const cleanMonth = (value: unknown) => {
    const match = /(?:^|\D)(1[0-2]|[1-9])(?:\D|$)/.exec(String(value || '').trim());
    return match ? Number(match[1]) : NaN;
  };

  const cleanUserId = (value: unknown, role: 'MTO' | 'MTE') => {
    const match = new RegExp(`(HLC-${role}-\\d+)`, 'i').exec(String(value || '').trim());
    return match ? match[1].toUpperCase() : '';
  };

  function monthsForCycleOptions(cycleCode: string) {
    const match = /^(\d{4})Q([1-4])$/i.exec(String(cycleCode || '').replace('-', ''));
    const firstMonth = match ? (Number(match[2]) - 1) * 3 + 1 : 1;
    return [0, 1, 2].map((offset) => {
      const month = firstMonth + offset;
      return { value: month, label: `Tháng ${month}` };
    });
  }

  const submitCreate = async (values: PairForm) => {
    try {
      const cleanValues = {
        cycleId: cleanCycleId(values.cycleId),
        monthCode: cleanMonth(values.month),
        mentorId: cleanUserId(values.mentorId, 'MTO'),
        menteeId: cleanUserId(values.menteeId, 'MTE')
      };
      console.log('Payload chuẩn bị gửi:', cleanValues);
      if (!cleanValues.cycleId || !Number.isInteger(cleanValues.monthCode) || !cleanValues.mentorId || !cleanValues.menteeId) {
        throw new Error('Thông tin quý, tháng, mentor hoặc mentee không hợp lệ');
      }
      const response = await apiFetch('/mentoring/pairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanValues)
      });
      const result = await response.json();
      if (!result.success) {
        if (response.status === 409) {
          await loadData(cleanValues.cycleId);
        }
        const details = ['MENTEE_ALREADY_PAIRED', 'PAIRING_ID_CONFLICT'].includes(result.code)
          ? undefined
          : result.details || result.errors;
        const detailText = details
          ? `: ${Object.entries(details).map(([field, message]) => `${field}: ${message}`).join('; ')}`
          : '';
        throw new Error(`${result.message || 'Không thể thêm cặp mentoring'}${detailText}`);
      }
      const syncedMonths = Array.isArray(result.syncedMonths) ? result.syncedMonths : [cleanValues.monthCode];
      message.success(`Đã thêm tháng ${cleanValues.monthCode} và đồng bộ tháng ${syncedMonths.join(', ')}`);
      createForm.resetFields();
      setModal(null);
      await loadData(cleanValues.cycleId);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể thêm cặp mentoring');
    }
  };

  const submitEdit = async (values: PairForm) => {
    if (!selectedPair) return;
    try {
      const cleanValues = {
        mentorId: cleanUserId(values.mentorId, 'MTO'),
        menteeId: cleanUserId(values.menteeId, 'MTE'),
        monthlyCode: String(cleanMonth(values.month))
      };
      console.log('Payload sửa chuẩn bị gửi:', cleanValues);
      if (!cleanValues.mentorId || !cleanValues.menteeId || !Number.isInteger(Number(cleanValues.monthlyCode))) {
        throw new Error('Thông tin tháng, mentor hoặc mentee không hợp lệ');
      }
      const response = await apiFetch(`/mentoring/pairs/${encodeURIComponent(selectedPair.monthlyId || '')}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cleanValues, monthlyId: selectedPair.monthlyId })
      });
      const result = await response.json();
      if (!result.success) {
        const details = result.details || result.errors;
        const detailText = details
          ? `: ${Object.entries(details).map(([field, detail]) => `${field}: ${typeof detail === 'object' ? JSON.stringify(detail) : detail}`).join('; ')}`
          : '';
        throw new Error(`${result.message || 'Không thể cập nhật cặp mentoring'}${detailText}`);
      }
      message.success('Đã cập nhật cặp mentoring');
      setModal(null);
      await loadData(values.cycleId);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể cập nhật cặp mentoring');
    }
  };

  const deletePair = async (pair: Pair) => {
    try {
      const response = await apiFetch(`/mentoring/pairs/${encodeURIComponent(pair.monthlyId || '')}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      const deleted = result.data?.deleted;
      message.success(
        `Đã xóa từ tháng được chọn trở đi: ${deleted?.pairs ?? 0} cặp, ${deleted?.schedules ?? 0} lịch, ${deleted?.recaps ?? 0} recap và ${deleted?.scoreEvents ?? 0} điểm liên quan`
      );
      setSelectedPair(null);
      setModal(null);
      await loadData(selectedCycle);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể xóa cặp mentoring');
    }
  };

  const detailSchedules = useMemo(() => schedules.filter((item) =>
    item.monthlyId === selectedPair?.monthlyId
  ), [schedules, selectedPair]);
  const detailRecaps = useMemo(() => recaps.filter((item) =>
    item.monthlyId === selectedPair?.monthlyId
  ), [recaps, selectedPair]);

  const reviewRecap = async (recap: Recap, status: 'APPROVED' | 'REJECTED') => {
    try {
      const response = await apiFetch(`/mentoring/recaps/${recap._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note: reviewNote })
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      message.success(status === 'APPROVED' ? 'Đã duyệt recap' : 'Đã từ chối recap');
      setReviewingRecap(null);
      setReviewNote('');
      setExpandedReviewContent(false);
      await loadData(selectedCycle);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể cập nhật recap');
    }
  };

  const columns = [
    { title: 'Mã mentoring tháng', dataIndex: 'monthlyId' },
    { title: 'Mentee', render: (_: unknown, row: Pair) => <div><strong>{menteeName(row.menteeId)}</strong><div className="text-xs text-gray-500">{row.menteeId}</div></div> },
    { title: 'Mentor', render: (_: unknown, row: Pair) => <div><strong>{mentorName(row.mentorId)}</strong><div className="text-xs text-gray-500">{row.mentorId}</div></div> },
    { title: 'Profile Mentee', render: (_: unknown, row: Pair) => <ProfileLink url={menteeProfile(row.menteeId)} /> },
    { title: 'Profile Mentor', render: (_: unknown, row: Pair) => <ProfileLink url={mentorProfile(row.mentorId)} /> },
    { title: 'Trạng thái recap', dataIndex: 'recapStatus', render: (value: string) => <Tag color={recapColor(value)}>{recapLabels[value] || value || 'Chờ'}</Tag> },
    {
      title: 'Thao tác',
      render: (_: unknown, row: Pair) => (
        <Space>
          <Button type="text" icon={<EyeOutlined />} onClick={(event) => { event.stopPropagation(); setSelectedPair(row); setModal('detail'); }} />
          <Button
            type="link"
            icon={<EditOutlined />}
            disabled={cycleLocked}
            onClick={(event) => {
              event.stopPropagation();
              setSelectedPair(row);
              editForm.setFieldsValue({
                cycleId: row.cycleId,
                mentorId: row.mentorId,
                menteeId: row.menteeId,
                month: pairMonth(row, row.cycleId) || monthOptions[0]?.value
              });
              setModal('edit');
            }}
          >
            Chỉnh sửa
          </Button>
          <Popconfirm
            title="Xóa cặp mentoring?"
            description="Xóa cặp của tháng này và các tháng sau trong cùng quý, kèm lịch, recap và điểm mentoring liên quan. Các tháng trước được giữ nguyên. Không thể hoàn tác."
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => deletePair(row)}
            disabled={cycleLocked}
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              disabled={cycleLocked}
              onClick={(event) => event.stopPropagation()}
            >
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Typography.Title level={3} className="!mb-0 !whitespace-nowrap shrink-0">
            Quản lý Ghép cặp — Quý {cycleCode.match(/Q([1-4])/)?.[1]} / {cycleCode.slice(0, 4)}
          </Typography.Title>
          {panelKind === 'next' && <Tag color="purple">Quý kế tiếp</Tag>}
        </div>
        <Space wrap className="max-w-full justify-end">
          <Select value={cycleCode} options={cycleOptions} className="min-w-52" disabled />
          <Upload accept=".xlsx,.csv" showUploadList={false} disabled={importing || cycleLocked} beforeUpload={(file) => { void importPairs(file); return Upload.LIST_IGNORE; }}>
            <Button icon={<InboxOutlined />} disabled={importing || cycleLocked}>Import file</Button>
          </Upload>
          <Button type="primary" icon={<PlusOutlined />} disabled={cycleLocked} onClick={() => { createForm.setFieldsValue({ cycleId: selectedCycle, month: monthOptions[0]?.value }); setModal('create'); }}>Thêm mới</Button>
          <Button icon={<EditOutlined />} disabled={cycleLocked || !selectedPair} onClick={() => { if (selectedPair) { editForm.setFieldsValue({ cycleId: selectedPair.cycleId, mentorId: selectedPair.mentorId, menteeId: selectedPair.menteeId, month: pairMonth(selectedPair, selectedPair.cycleId) || monthOptions[0]?.value }); setModal('edit'); } }}>Chỉnh sửa</Button>
          <Button icon={cycleLocked ? <UnlockOutlined /> : <LockOutlined />} onClick={toggleCycleLock} disabled={!selectedCycle}>{cycleLocked ? 'Mở khóa quý' : 'Khóa quý'}</Button>
        </Space>
      </div>

      <Card styles={{ body: { padding: 0 } }}>
        <Tabs
          defaultActiveKey={String(monthsForCycleOptions(cycleCode)[0]?.value)}
          items={monthlyPairs.map(({ month, pairs: monthPairs }) => ({
            key: String(month),
            label: `Q${cycleCode.match(/Q([1-4])/)?.[1]}-T${month}`,
            children: (
              <Table
                rowKey="_id"
                loading={loading}
                columns={columns}
                dataSource={monthPairs}
                scroll={{ x: 'max-content' }}
                pagination={{ pageSize: 10 }}
                onRow={(row) => ({ onClick: () => { setSelectedPair(row); setModal('detail'); }, className: 'cursor-pointer' })}
                locale={{ emptyText: `Chưa có dữ liệu ghép cặp tháng ${month}/${cycleCode.slice(0, 4)}` }}
              />
            )
          }))}
        />
      </Card>

      <Card title="Duyệt recap mentoring" extra={<Tag>{recaps.filter((recap) => recap.status === 'SUBMITTED' || recap.status === 'LATE').length} chờ duyệt</Tag>}>
        <Table
          rowKey="_id"
          size="small"
          loading={loading}
          dataSource={recaps}
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: 'Mã cặp', dataIndex: 'monthlyId' },
            { title: 'Mentee', render: (_: unknown, recap: Recap) => {
              const pair = pairs.find((item) => item.monthlyId === recap.monthlyId);
              return pair ? <div><strong>{menteeName(pair.menteeId)}</strong><div className="text-xs text-gray-500">{pair.menteeId}</div></div> : '—';
            } },
            { title: 'Profile Mentee', render: (_: unknown, recap: Recap) => {
              const pair = pairs.find((item) => item.monthlyId === recap.monthlyId);
              return pair ? <ProfileLink url={menteeProfile(pair.menteeId)} /> : '—';
            } },
            { title: 'Mentor', render: (_: unknown, recap: Recap) => {
              const pair = pairs.find((item) => item.monthlyId === recap.monthlyId);
              return pair ? <div><strong>{mentorName(pair.mentorId)}</strong><div className="text-xs text-gray-500">{pair.mentorId}</div></div> : '—';
            } },
            { title: 'Profile Mentor', render: (_: unknown, recap: Recap) => {
              const pair = pairs.find((item) => item.monthlyId === recap.monthlyId);
              return pair ? <ProfileLink url={mentorProfile(pair.mentorId)} /> : '—';
            } },
            { title: 'Vai trò', dataIndex: 'role', render: (value: string) => <Tag color={value === 'MENTOR' ? 'blue' : 'green'}>{value}</Tag> },
            { title: 'Ngày nộp', dataIndex: 'createdAt', render: (value: string) => new Date(value).toLocaleString() },
            { title: 'Trạng thái', dataIndex: 'status', render: (value: string) => <Tag color={recapColor(value)}>{recapLabels[value] || value}</Tag> },
            { title: 'Ảnh', dataIndex: 'mediaUrls', render: (value: string[]) => value?.length ? <a href={value[0]} target="_blank" rel="noreferrer">Xem ảnh</a> : 'Thiếu ảnh' },
            { title: 'Thao tác', render: (_: unknown, recap: Recap) => <Button disabled={!['SUBMITTED', 'LATE'].includes(recap.status)} onClick={() => {
              setExpandedReviewContent(false);
              setReviewingRecap(recap);
            }}>Xem & duyệt</Button> }
          ]}
        />
      </Card>

      <Modal title="Thêm cặp mentoring" open={modal === 'create'} onCancel={() => setModal(null)} footer={null} forceRender destroyOnHidden>
        <PairForm form={createForm} cycles={cycleOptions} months={monthOptions} mentors={availableMentors} mentees={availableMentees} loading={loading} onFinish={submitCreate} />
      </Modal>
      <Modal title="Sửa cặp mentoring" open={modal === 'edit'} onCancel={() => { editForm.resetFields(); setModal(null); }} footer={null} forceRender destroyOnHidden>
        <PairForm form={editForm} cycles={cycleOptions} months={monthOptions} mentors={mentors} mentees={mentees} loading={loading} monthReadOnly onFinish={submitEdit} />
      </Modal>
      <Modal title="Chi tiết cặp mentoring" open={modal === 'detail'} onCancel={() => setModal(null)} footer={null} width={800}>
        {selectedPair && (
          <div className="space-y-5">
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Mã tháng">{selectedPair.monthlyId}</Descriptions.Item>
              <Descriptions.Item label="Mã quý">{selectedPair.quarterlyId || 'Chưa migration'}</Descriptions.Item>
              <Descriptions.Item label="Quý">{selectedPair.cycleId}</Descriptions.Item>
              <Descriptions.Item label="HLC ID Mentee">{selectedPair.menteeId}</Descriptions.Item>
              <Descriptions.Item label="Tên Mentee">{menteeName(selectedPair.menteeId)}</Descriptions.Item>
              <Descriptions.Item label="HLC ID Mentor">{selectedPair.mentorId}</Descriptions.Item>
              <Descriptions.Item label="Tên Mentor">{mentorName(selectedPair.mentorId)}</Descriptions.Item>
            </Descriptions>
            <div>
              <Typography.Title level={5}>Lịch mentoring</Typography.Title>
              <Table rowKey="_id" size="small" pagination={false} dataSource={detailSchedules} scroll={{ x: 'max-content' }} columns={[
                { title: 'Tháng', dataIndex: 'monthCode' },
                { title: 'Thời gian', render: (row: Schedule) => `${new Date(row.startTime).toLocaleString()} - ${new Date(row.endTime).toLocaleString()}` },
                { title: 'Đã chốt', render: (row: Schedule) => row.confirmedAt ? new Date(row.confirmedAt).toLocaleString() : 'Chưa chốt' },
                { title: 'Trạng thái', dataIndex: 'status' },
                { title: 'Thao tác', render: (_: unknown, row: Schedule) => <Space>
                  <Button size="small" icon={<CheckOutlined />} disabled={row.status === 'CONFIRMED' || row.status === 'COMPLETED'} onClick={async (event) => {
                    event.stopPropagation();
                    const response = await apiFetch(`/mentoring/schedules/${row._id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'CONFIRMED' }) });
                    const result = await response.json();
                    if (!result.success) { message.error(result.message); return; }
                    message.success('Đã chốt lịch mentoring');
                    await loadData(selectedCycle);
                  }}>Chốt lịch</Button>
                  <Button size="small" onClick={(event) => {
                    event.stopPropagation();
                    setOverrideSchedule(row);
                    overrideForm.setFieldsValue({ startTime: toDateTimeLocal(row.startTime), endTime: toDateTimeLocal(row.endTime), meetingLink: row.meetingLink, location: row.location, note: row.note });
                  }}>Ghi đè</Button>
                </Space> }
              ]} locale={{ emptyText: 'Chưa có lịch mentoring' }} />
            </div>
            <div>
              <Typography.Title level={5}>Trạng thái recap</Typography.Title>
              {detailSchedules.map((schedule) => {
                const scheduleRecaps = detailRecaps.filter((recap) => recap.scheduleId === schedule._id);
                const legacyRecaps = detailRecaps.filter((recap) => !recap.scheduleId);
                const relatedRecaps = scheduleRecaps.length > 0
                  ? scheduleRecaps
                  : detailSchedules.length === 1
                    ? (legacyRecaps.length > 0 ? legacyRecaps : detailRecaps)
                    : legacyRecaps;
                return <Card size="small" key={schedule._id} className="mb-2">
                  <div>{schedule.monthCode || schedule._id}</div>
                  <Space wrap className="mt-2">
                    {['MENTEE', 'MENTOR'].map((role) => {
                      const recap = relatedRecaps.find((item) => item.role === role);
                      const progressStatus = getMentoringRecapProgressStatus(schedule, recap, role as 'MENTOR' | 'MENTEE');
                      const deadlineStart = role === 'MENTEE' ? schedule.endTime : (schedule.confirmedAt || schedule.createdAt);
                      const deadline = deadlineStart
                        ? new Date(new Date(deadlineStart).getTime() + 24 * 60 * 60 * 1000)
                        : null;
                      return <Tag key={role} color={mentoringRecapProgressColor(progressStatus)}>
                        {role}: {mentoringRecapProgressLabel(progressStatus)}
                        {deadline ? ` · hạn ${deadline.toLocaleString()}` : ''}
                      </Tag>;
                    })}
                  </Space>
                </Card>;
              })}
              {!detailSchedules.length && <Typography.Text type="secondary">Chưa có lịch để theo dõi recap.</Typography.Text>}
            </div>
          </div>
        )}
      </Modal>
      <Modal title="Ghi đè lịch mentoring" open={Boolean(overrideSchedule)} onCancel={() => { overrideForm.resetFields(); setOverrideSchedule(null); }} footer={null} forceRender destroyOnHidden>
        <Form form={overrideForm} layout="vertical" onFinish={async (values) => {
          if (!overrideSchedule) return;
          const response = await apiFetch(`/mentoring/schedules/${overrideSchedule._id}/override`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...values, startTime: new Date(values.startTime).toISOString(), endTime: new Date(values.endTime).toISOString() })
          });
          const result = await response.json();
          if (!result.success) { message.error(result.message); return; }
          message.success('Đã ghi đè và chốt lịch mentoring');
          setOverrideSchedule(null);
          await loadData(selectedCycle);
        }}>
          <Form.Item name="startTime" label="Bắt đầu" rules={[{ required: true }]}><Input type="datetime-local" /></Form.Item>
          <Form.Item name="endTime" label="Kết thúc" rules={[{ required: true }]}><Input type="datetime-local" /></Form.Item>
          <Form.Item name="meetingLink" label="Link meeting"><Input /></Form.Item>
          <Form.Item name="location" label="Địa điểm"><Input /></Form.Item>
          <Form.Item name="note" label="Ghi chú"><Input /></Form.Item>
          <Button type="primary" htmlType="submit" block>Lưu và chốt lịch</Button>
        </Form>
      </Modal>
      <Modal
        title="Review recap"
        width="min(900px, calc(100vw - 24px))"
        open={Boolean(reviewingRecap)}
        onCancel={() => { setReviewingRecap(null); setReviewNote(''); setExpandedReviewContent(false); }}
        footer={null}
        destroyOnHidden
        styles={{ body: { maxHeight: 'min(72vh, 760px)', overflowY: 'auto' } }}
      >
        {reviewingRecap && (
          <div className="space-y-4">
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Cặp">{reviewingRecap.monthlyId}</Descriptions.Item>
              <Descriptions.Item label="HLC ID Mentee">{pairs.find((pair) => pair.monthlyId === reviewingRecap.monthlyId)?.menteeId || '—'}</Descriptions.Item>
              <Descriptions.Item label="Tên Mentee">{(() => {
                const pair = pairs.find((item) => item.monthlyId === reviewingRecap.monthlyId);
                return pair ? menteeName(pair.menteeId) : '—';
              })()}</Descriptions.Item>
              <Descriptions.Item label="HLC ID Mentor">{pairs.find((pair) => pair.monthlyId === reviewingRecap.monthlyId)?.mentorId || '—'}</Descriptions.Item>
              <Descriptions.Item label="Tên Mentor">{(() => {
                const pair = pairs.find((item) => item.monthlyId === reviewingRecap.monthlyId);
                return pair ? mentorName(pair.mentorId) : '—';
              })()}</Descriptions.Item>
              <Descriptions.Item label="Vai trò">{reviewingRecap.role}</Descriptions.Item>
              <Descriptions.Item label="Nội dung">
                <div style={expandedReviewContent ? { whiteSpace: 'pre-wrap' } : {
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 8,
                  overflow: 'hidden',
                  whiteSpace: 'pre-wrap'
                }}>
                  {reviewingRecap.content || 'Không có nội dung'}
                </div>
                {(reviewingRecap.content || '').length > 500 && (
                  <Button type="link" className="!px-0" onClick={() => setExpandedReviewContent((expanded) => !expanded)}>
                    {expandedReviewContent ? 'Thu gọn' : 'Hiển thị thêm'}
                  </Button>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Ảnh minh chứng">
                {reviewingRecap.mediaUrls?.[0] ? <a href={reviewingRecap.mediaUrls[0]} target="_blank" rel="noreferrer">Mở ảnh Cloudinary</a> : 'Không có'}
              </Descriptions.Item>
            </Descriptions>
            <Input.TextArea rows={3} value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="Ghi chú phản hồi (bắt buộc khi từ chối)" />
            <Space>
              <Button type="primary" onClick={() => reviewRecap(reviewingRecap, 'APPROVED')}>Duyệt recap</Button>
              <Button danger onClick={() => reviewRecap(reviewingRecap, 'REJECTED')} disabled={!reviewNote.trim()}>Từ chối</Button>
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
}

function PairForm({ form, cycles, months, mentors, mentees, loading, monthReadOnly = false, onFinish }: {
  form: ReturnType<typeof Form.useForm<PairForm>>[0];
  cycles: { value: string; label: string }[];
  months: { value: number; label: string }[];
  mentors: UserOption[];
  mentees: UserOption[];
  loading: boolean;
  monthReadOnly?: boolean;
  onFinish: (values: PairForm) => void;
}) {
  return <Form form={form} layout="vertical" onFinish={onFinish}>
    <Row gutter={[12, 0]}>
      <Col xs={24} md={12}><Form.Item name="cycleId" label="Quý" rules={[{ required: true, message: 'Chọn quý' }]}><Select options={cycles} /></Form.Item></Col>
      <Col xs={24} md={12}><Form.Item name="month" label="Tháng mentoring trong quý" rules={[{ required: true, message: 'Chọn tháng' }]}><Select disabled={monthReadOnly} options={months} /></Form.Item></Col>
      <Col xs={24} md={12}><Form.Item name="mentorId" label="Mentor" rules={[{ required: true, message: 'Chọn mentor' }]}><Select showSearch optionFilterProp="label" options={mentors.map((item) => ({ value: item.userId, label: `${item.preferenceRank ? `Ưu tiên ${item.preferenceRank} · ` : ''}${item.userId} - ${item.fullName}`, disabled: item.isActive === 'no' }))} /></Form.Item></Col>
      <Col xs={24} md={12}><Form.Item name="menteeId" label="Mentee" rules={[{ required: true, message: 'Chọn mentee' }]}><Select showSearch loading={loading} optionFilterProp="label" notFoundContent={loading ? 'Đang tải Mentee...' : 'Không có Mentee đang hoạt động, chưa ghép trong quý'} options={mentees.map((item) => ({ value: item.userId, label: `${item.userId} - ${item.fullName}`, disabled: item.isActive === 'no' }))} /></Form.Item></Col>
    </Row>
    <Typography.Text type="secondary">
      Hệ thống sẽ tự động đồng bộ từ tháng đã chọn đến tháng cuối của quý.
    </Typography.Text>
    <Button type="primary" htmlType="submit" block>Lưu</Button>
  </Form>;
}
