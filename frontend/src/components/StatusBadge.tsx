import { cn } from '@/lib/utils';

const VARIANTS = {
  live: 'bg-success/20 text-success border-success/30',
  analyzing: 'bg-warning/20 text-warning border-warning/30',
  ready: 'bg-accent/20 text-accent border-accent/30',
  error: 'bg-danger/20 text-danger border-danger/30',
  idle: 'bg-surface-2 text-text-muted border-border',
};

interface Props {
  status: keyof typeof VARIANTS;
  label?: string;
  pulse?: boolean;
}

export function StatusBadge({ status, label, pulse }: Props) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', VARIANTS[status])}>
      <span className={cn('h-1.5 w-1.5 rounded-full', pulse && 'animate-pulse', {
        'bg-success': status === 'live',
        'bg-warning': status === 'analyzing',
        'bg-accent': status === 'ready',
        'bg-danger': status === 'error',
        'bg-text-muted': status === 'idle',
      })} />
      {label ?? status}
    </span>
  );
}
