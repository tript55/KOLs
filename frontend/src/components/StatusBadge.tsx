import type { PostStatus } from '../types';

const statusStyles: Record<PostStatus, string> = {
  draft: 'bg-paper-1 text-ink-2 border-border',
  scheduled: 'bg-brand-warning-subtle text-brand-warning border-brand-warning/30',
  generating: 'bg-brand-info-subtle text-brand-info border-brand-info/30',
  posted: 'bg-brand-success-subtle text-brand-success border-brand-success/30',
  failed: 'bg-accent-subtle text-accent border-accent/30',
};

interface StatusBadgeProps {
  status: PostStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold capitalize border ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}
