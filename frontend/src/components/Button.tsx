import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const variants = {
  primary: 'bg-accent hover:bg-accent-hover text-white shadow-lg shadow-accent/20',
  secondary: 'bg-surface-2 hover:bg-border text-text border border-border',
  danger: 'bg-danger/15 hover:bg-danger/25 text-danger border border-danger/30',
  ghost: 'hover:bg-surface-2 text-text-muted hover:text-text',
};

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'> {
  variant?: keyof typeof variants;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = 'primary', loading, disabled, children, ...props }, ref) => (
    <motion.button
      ref={ref}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-40',
        variants[variant],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </motion.button>
  ),
);
Button.displayName = 'Button';
