'use client';

import { DatePicker, Form, Input, InputNumber, Select } from 'antd';
import type { FormInstance } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import ImageUpload, { type UploadedImage } from '@/components/ImageUpload';
import type { LibraryItem, ModuleField, SubmissionView } from '@/services/hlcApi';

type Values = Record<string, unknown>;

/** Giá trị ban đầu của form từ bài đã nộp */
export function submissionToForm(fields: ModuleField[], submission?: SubmissionView): Values {
  const values: Values = {};
  for (const field of fields) {
    const value = submission?.data?.[field.key];
    if (field.fieldType === 'IMAGE' || field.fieldType === 'FILE') {
      values[field.key] = (submission?.files ?? []).filter((file) => file.fieldKey === field.key).map((file) => ({ fileId: file.fileId, url: file.url, name: file.fileName }));
    } else if (field.fieldType === 'DATE') {
      values[field.key] = value ? dayjs(String(value)) : undefined;
    } else {
      values[field.key] = value;
    }
  }
  return values;
}

/** Form -> dữ liệu gửi API */
export function formToSubmission(fields: ModuleField[], values: Values) {
  const data: Values = {};
  for (const field of fields) {
    const value = values[field.key];
    if (field.fieldType === 'IMAGE' || field.fieldType === 'FILE') data[field.key] = ((value as UploadedImage[]) ?? []).map((item) => item.fileId);
    else if (field.fieldType === 'DATE') data[field.key] = value ? (value as Dayjs).format('YYYY-MM-DD') : undefined;
    else data[field.key] = value;
  }
  return data;
}

const youtubePattern = /(youtu\.be\/|youtube\.com\/(watch\?(.*&)?v=|shorts\/|embed\/|live\/))[A-Za-z0-9_-]{11}/;

/** Form nộp bài sinh từ cấu hình trường của module */
export default function SubmissionForm({ form, fields, library, onFinish }: { form: FormInstance; fields: ModuleField[]; library: LibraryItem[]; onFinish: (values: Values) => void }) {
  return (
    <Form form={form} layout="vertical" onFinish={onFinish}>
      {fields.map((field) => {
        const rules: object[] = [];
        if (field.isRequired) {
          rules.push(field.fieldType === 'IMAGE' || field.fieldType === 'FILE'
            ? { validator: (_: unknown, value: unknown[]) => (value?.length ? Promise.resolve() : Promise.reject(new Error(`Cần ${field.label.toLowerCase()}`))) }
            : { required: true, message: `Nhập ${field.label.toLowerCase()}` });
        }
        if (field.fieldType === 'URL') rules.push({ type: 'url', message: 'Link không hợp lệ' });
        if (field.fieldType === 'YOUTUBE_URL') rules.push({ pattern: youtubePattern, message: 'Cần link video YouTube' });
        if (field.validation?.maxLength) rules.push({ max: field.validation.maxLength, message: `Tối đa ${field.validation.maxLength} ký tự` });
        const options = (field.options ?? []).map((option) => ({ value: option, label: option }));
        let input: React.ReactNode;
        switch (field.fieldType) {
          case 'LONG_TEXT': input = <Input.TextArea rows={5} showCount={Boolean(field.validation?.maxLength)} maxLength={field.validation?.maxLength} />; break;
          case 'URL': case 'YOUTUBE_URL': input = <Input placeholder={field.fieldType === 'YOUTUBE_URL' ? 'https://youtu.be/...' : 'https://'} />; break;
          case 'NUMBER': input = <InputNumber className="w-full" min={field.validation?.min} max={field.validation?.max} />; break;
          case 'DATE': input = <DatePicker className="w-full" format="DD/MM/YYYY" inputReadOnly />; break;
          case 'SELECT': input = <Select options={options} />; break;
          case 'MULTI_SELECT': input = <Select mode="multiple" options={options} />; break;
          case 'LIBRARY_ITEM': input = <Select showSearch={{ optionFilterProp: 'label' }} options={library.map((item) => ({ value: item._id, label: `${item.title}${item.author ? ` – ${item.author}` : ''}` }))} placeholder="Chọn trong thư viện" />; break;
          case 'IMAGE': input = <ImageUpload max={field.validation?.maxFiles ?? 10} />; break;
          case 'FILE': input = <ImageUpload max={field.validation?.maxFiles ?? 5} imagesOnly={false} />; break;
          default: input = <Input maxLength={field.validation?.maxLength} />;
        }
        return (
          <Form.Item key={field.key} name={field.key} label={field.label} rules={rules} extra={field.isUnique ? 'Không được trùng với bài đã nộp trước đó' : undefined}>
            {input}
          </Form.Item>
        );
      })}
    </Form>
  );
}
