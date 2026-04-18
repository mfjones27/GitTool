import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, LayoutDashboard, FolderGit2, GitBranch, Settings } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';

const COMMANDS = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Repo Setup', path: '/repo-setup', icon: FolderGit2 },
  { label: 'Branches', path: '/branches', icon: GitBranch },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export function CommandPalette() {
  const open = useAppStore((s) => s.commandPaletteOpen);
  const toggle = useAppStore((s) => s.toggleCommandPalette);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const filtered = COMMANDS.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase()),
  );

  const go = useCallback(
    (path: string) => {
      navigate(path);
      toggle();
      setQuery('');
    },
    [navigate, toggle],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
      if (e.key === 'Escape' && open) toggle();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, toggle]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
          onClick={toggle}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Search className="h-4 w-4 text-text-muted" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-text-muted"
              />
              <kbd className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-text-muted">ESC</kbd>
            </div>
            <div className="max-h-60 overflow-y-auto p-2">
              {filtered.map((cmd) => (
                <button
                  key={cmd.path}
                  onClick={() => go(cmd.path)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
                >
                  <cmd.icon className="h-4 w-4" />
                  {cmd.label}
                </button>
              ))}
              {!filtered.length && (
                <p className="px-3 py-4 text-center text-sm text-text-muted">No results</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
