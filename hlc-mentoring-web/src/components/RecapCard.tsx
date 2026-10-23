'use client';

import { useState } from 'react';
import { Alert, Button, Card, Image, Space, Tag, Typography } from 'antd';
import { REVIEW_STATUS_LABEL, formatDateTime, type RecapView } from '@/services/mentoringApi';

export default function RecapCard({ recap }: { recap: RecapView }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card size="small" className="mt-3" title={`Recap của ${recap.role === 'MENTOR' ? 'MTO' : 'MTE'} (${recap.memberCode})`} extra={<Tag color={recap.reviewStatus === 'APPROVED' ? 'green' : recap.reviewStatus === 'REJECTED' ? 'red' : 'gold'}>{REVIEW_STATUS_LABEL[recap.reviewStatus]}</Tag>}>
      <Typography.Paragraph type="secondary" className="!mb-2 text-xs">
        Nộp lần đầu {formatDateTime(recap.firstSubmittedAt)}{recap.isLate ? ' (muộn)' : ''} · sửa gần nhất {formatDateTime(recap.lastSubmittedAt)}
      </Typography.Paragraph>
      {recap.proxy && (
        <Alert
          className="!mb-2"
          type="warning"
          showIcon
          title={recap.proxy.importBatchId ? 'Nhập từ dữ liệu quý cũ' : 'Admin nhập hộ'}
          description={`${recap.proxy.reason ?? ''}${recap.proxy.at ? ` · lúc ${formatDateTime(recap.proxy.at)}` : ''}`}
        />
      )}
      {recap.role === 'MENTEE' && recap.score !== null && recap.score !== undefined && <Tag color="geekblue" className="!mb-2">Điểm recap {recap.score}/100</Tag>}
      <div style={expanded ? { whiteSpace: 'pre-wrap' } : { display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 6, overflow: 'hidden', whiteSpace: 'pre-wrap' }}>{recap.content}</div>
      {recap.content.length > 400 && <Button type="link" className="!px-0" onClick={() => setExpanded(!expanded)}>{expanded ? 'Thu gọn' : 'Hiển thị thêm'}</Button>}
      {recap.reviewNote && (
        <Alert
          className="mt-2"
          type={recap.reviewStatus === 'REJECTED' ? 'error' : recap.reviewStatus === 'PENDING' ? 'warning' : 'info'}
          showIcon
          title={recap.reviewStatus === 'PENDING' ? `Lý do bị từ chối lần trước: ${recap.reviewNote}` : `Phản hồi của admin: ${recap.reviewNote}`}
        />
      )}
      <Image.PreviewGroup>
        <Space wrap className="mt-2">
          {recap.media.map((item) => item.mimeType?.startsWith('image/')
            ? <Image key={item.url} src={item.url} alt={item.fileName ?? 'Ảnh recap'} width={140} height={100} className="rounded object-cover" />
            : <a key={item.url} href={item.url} target="_blank" rel="noreferrer">{item.fileName || 'File đính kèm'}</a>)}
        </Space>
      </Image.PreviewGroup>
    </Card>
  );
}
