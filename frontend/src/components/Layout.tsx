import { Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { AnimatedBackground } from './AnimatedBackground';
import { ToastContainer } from './ToastContainer';
import { CommandPalette } from './CommandPalette';
import { useLocation } from 'react-router-dom';

export function Layout() {
  const location = useLocation();

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <AnimatedBackground />
      <Sidebar />
      <main className="relative flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="p-6"
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
