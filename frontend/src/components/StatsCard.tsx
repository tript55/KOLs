import type { ReactNode } from 'react';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  color?: string;
}

export default function StatsCard({ label, value, icon, color = 'text-accent bg-accent-subtle' }: StatsCardProps) {
  return (
    <div className="bg-paper-2 rounded-[1.5rem] border border-border p-5 flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow">
      <div className={`shrink-0 p-4 rounded-[1.25rem] ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold font-body text-ink-2 truncate uppercase tracking-wider">{label}</p>
        <p className="text-3xl font-extrabold font-display text-ink-1 mt-1">{value}</p>
      </div>
    </div>
  );
}
