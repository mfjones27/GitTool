import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { AnimatedBackground } from './AnimatedBackground';
import { ToastContainer } from './ToastContainer';
import { CommandPalette } from './CommandPalette';

export function Layout() {
  const location = useLocation();

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <AnimatedBackground />
      <Sidebar />
      <main className="relative flex-1 overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute inset-0 overflow-y-auto p-6"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <ToastContainer />
      <CommandPalette />
    </div>
  );
}
