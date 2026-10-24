import type { ReactNode } from 'react';
import { ArrowDownOutlined, ArrowUpOutlined, MinusOutlined } from '@ant-design/icons';
import { PAIR_STATUS_LABEL, type PairRecapStatus } from '@/services/mentoringApi';

export type Tone = 'purple' | 'blue' | 'green' | 'orange' | 'teal' | 'rose';

/** So sánh với kỳ trước: phần trăm thay đổi, hoặc chênh lệch tuyệt đối khi `absolute`. */
export function deltaOf(current: number, previous: number | undefined, absolute = false) {
  if (previous === undefined) return null;
  const diff = current - previous;
  if (absolute) return { diff, text: `${Math.abs(Math.round(diff))}%` };
  if (previous === 0) return diff === 0 ? { diff, text: '0%' } : null;
  return { diff, text: `${Math.abs(Math.round((diff / previous) * 100))}%` };
}

export function DeltaBadge({ delta }: { delta: ReturnType<typeof deltaOf> }) {
  if (!delta) return null;
  const kind = delta.diff > 0 ? 'up' : delta.diff < 0 ? 'down' : 'flat';
  const icon = kind === 'up' ? <ArrowUpOutlined /> : kind === 'down' ? <ArrowDownOutlined /> : <MinusOutlined />;
  return <span className={`kpi-delta ${kind}`}>{icon}{delta.text}</span>;
}

export function KpiCard({ icon, tone, label, value, unit, hint, delta }: {
  icon: ReactNode;
  tone: Tone;
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  delta?: ReturnType<typeof deltaOf>;
}) {
  return (
    <div className={`kpi-card tone-${tone}`}>
      <div className="kpi-top">
        <span className="kpi-icon">{icon}</span>
        <span className="kpi-label">{label}</span>
      </div>
      <div className="kpi-value">{value}{unit && <small>{unit}</small>}</div>
      <div className="kpi-foot">
        {delta && <><DeltaBadge delta={delta} /><span>so với tháng trước</span></>}
        {!delta && hint}
      </div>
    </div>
  );
}

/** Màu thật cho từng trạng thái cặp (Tag của antd dùng tên màu, thanh trạng thái cần mã màu). */
const STATUS_HEX: Record<PairRecapStatus, string> = {
  DONE: '#22a06b',
  PENDING: '#f5a524',
  LATE: '#f08a24',
  MISSING: '#e5484d',
  NO_SCHEDULE: '#b8c0d0',
  CANCELLED: '#d5d9e4'
};

export function StatusBar({ counts }: { counts: Partial<Record<PairRecapStatus, number>> }) {
  const entries = (Object.keys(PAIR_STATUS_LABEL) as PairRecapStatus[])
    .map((key) => ({ key, count: counts[key] ?? 0 }))
    .filter((item) => item.count > 0);
  const total = entries.reduce((sum, item) => sum + item.count, 0);
  if (!total) return null;
  return (
    <>
      <div className="status-bar" role="img" aria-label="Phân bố trạng thái cặp">
        {entries.map((item) => <span key={item.key} style={{ width: `${(item.count / total) * 100}%`, background: STATUS_HEX[item.key] }} />)}
      </div>
      <ul className="status-legend">
        {entries.map((item) => (
          <li key={item.key}><span className="status-dot" style={{ background: STATUS_HEX[item.key] }} />{PAIR_STATUS_LABEL[item.key]}: <b>{item.count}</b></li>
        ))}
      </ul>
    </>
  );
}

export function Avatar({ name }: { name?: string | null }) {
  const text = (name ?? '').trim();
  const words = text.split(/\s+/).filter(Boolean);
  const initials = words.length ? (words.length > 1 ? words[0][0] + words[words.length - 1][0] : words[0][0]).toUpperCase() : '?';
  const tone = [...text].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 6;
  return <span className={`avatar av-${tone}`} aria-hidden="true">{initials}</span>;
}

export function DashHeader({ title, subtitle, children }: { title: ReactNode; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <div className="dash-head">
      <div>
        <h1 className="dash-title">{title}</h1>
        {subtitle && <p className="dash-sub">{subtitle}</p>}
      </div>
      <div className="dash-tools">{children}</div>
    </div>
  );
}
