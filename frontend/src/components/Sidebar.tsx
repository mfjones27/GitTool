import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, FolderGit2, GitBranch, Settings, PanelLeftClose, PanelLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/app-store';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/repo-setup', label: 'Repo Setup', icon: FolderGit2 },
  { to: '/branches', label: 'Branches', icon: GitBranch },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggle = useAppStore((s) => s.toggleSidebar);

  return (
    <motion.aside
      className="relative flex h-full flex-col border-r border-border bg-surface/80 backdrop-blur-lg"
      animate={{ width: collapsed ? 64 : 220 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
    >
      {/* brand */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <img src="/icon.png" alt="GitTool" className="h-8 w-8 shrink-0 rounded-lg" />
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden whitespace-nowrap font-semibold text-text"
            >
              GitTool
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* nav links */}
      <nav className="flex-1 space-y-1 p-2">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-accent/15 text-accent glow-border'
                  : 'text-text-muted hover:bg-surface-2 hover:text-text',
              )
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  {label}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        ))}
      </nav>

      {/* collapse toggle */}
      <button
        onClick={toggle}
        className="m-2 flex items-center justify-center rounded-xl p-2.5 text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
      >
        {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
      </button>
    </motion.aside>
  );
}
