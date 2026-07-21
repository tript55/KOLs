import { Tag } from 'antd';
import type { PostStatus } from '../types';

const statusColors: Record<PostStatus, string> = {
  draft: '#FFF7EB',
  scheduled: '#FEFCBF',
  generating: '#BEE3F8',
  posted: '#C6F6D5',
  failed: '#FFE6E7',
};

const statusTextColors: Record<PostStatus, string> = {
  draft: '#4A5568',
  scheduled: '#ECC94B',
  generating: '#4299E1',
  posted: '#48BB78',
  failed: '#FF5A5F',
};

const statusBorderColors: Record<PostStatus, string> = {
  draft: '#FFEDD5',
  scheduled: 'rgba(236, 201, 75, 0.3)',
  generating: 'rgba(66, 153, 225, 0.3)',
  posted: 'rgba(72, 187, 120, 0.3)',
  failed: 'rgba(255, 90, 95, 0.3)',
};

interface StatusBadgeProps {
  status: PostStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Tag
      style={{
        borderRadius: 100,
        padding: '4px 12px',
        fontSize: 12,
        fontWeight: 700,
        textTransform: 'capitalize',
        background: statusColors[status],
        color: statusTextColors[status],
        border: `1px solid ${statusBorderColors[status]}`,
        lineHeight: '1.5',
      }}
    >
      {status}
    </Tag>
  );
}
