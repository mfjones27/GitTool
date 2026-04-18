import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Props extends HTMLMotionProps<'div'> {
  glow?: boolean;
}

export function GlassCard({ className, glow, children, ...props }: Props) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={cn(
        'rounded-2xl border border-border bg-surface/60 p-5 backdrop-blur-md',
        glow && 'glow-border',
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
