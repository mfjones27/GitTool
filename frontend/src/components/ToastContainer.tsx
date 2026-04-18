import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { cn } from '@/lib/utils';

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const COLORS = {
  success: 'border-success/40 bg-success/10',
  error: 'border-danger/40 bg-danger/10',
  info: 'border-accent/40 bg-accent/10',
};

export function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts);
  const remove = useAppStore((s) => s.removeToast);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 80, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.9 }}
              className={cn(
                'glass flex items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-xl',
                COLORS[t.type],
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{t.message}</span>
              <button onClick={() => remove(t.id)} className="text-text-muted hover:text-text">
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
