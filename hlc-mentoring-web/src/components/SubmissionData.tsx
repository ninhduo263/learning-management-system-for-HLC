'use client';

import FileThumbs from '@/components/FileThumbs';
import { formatDate, type ModuleField, type SubmissionView } from '@/services/hlcApi';

/** Hiển thị nội dung bài nộp theo cấu hình trường của module */
export default function SubmissionData({ fields, submission }: { fields: ModuleField[]; submission: SubmissionView }) {
  const keys = new Set(fields.map((field) => field.key));
  // Trường đã bị bỏ khỏi module nhưng bài cũ vẫn có dữ liệu
  const extra = Object.keys(submission.data ?? {}).filter((key) => !keys.has(key));
  const render = (field: Pick<ModuleField, 'key' | 'label' | 'fieldType'>) => {
    const value = submission.data?.[field.key];
    if (field.fieldType === 'IMAGE' || field.fieldType === 'FILE') {
      return <FileThumbs files={submission.files.filter((file) => file.fieldKey === field.key)} />;
    }
    if (value === undefined || value === null || value === '') return <span className="text-gray-400">—</span>;
    if (field.fieldType === 'LIBRARY_ITEM') return submission.libraryItem ? <span>{submission.libraryItem.title}{submission.libraryItem.author ? ` – ${submission.libraryItem.author}` : ''}</span> : String(value);
    if (field.fieldType === 'URL' || field.fieldType === 'YOUTUBE_URL') return <a href={String(value)} target="_blank" rel="noreferrer" className="break-all">{String(value)}</a>;
    if (field.fieldType === 'DATE') return formatDate(String(value));
    if (Array.isArray(value)) return value.join(', ');
    return <span className="whitespace-pre-wrap">{String(value)}</span>;
  };
  return (
    <dl className="space-y-2">
      {[...fields, ...extra.map((key) => ({ key, label: key, fieldType: 'TEXT' as const }))].map((field) => (
        <div key={field.key}>
          <dt className="text-xs font-semibold text-gray-500">{field.label}</dt>
          <dd className="m-0">{render(field)}</dd>
        </div>
      ))}
    </dl>
  );
}
