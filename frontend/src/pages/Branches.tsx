import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, Plus, ArrowRightLeft, Pencil, Trash2 } from 'lucide-react';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/Button';
import { useAppStore } from '@/stores/app-store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function Branches() {
  const { branches, repoPath, fetchBranches, addToast } = useAppStore();
  const [selected, setSelected] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    if (repoPath) fetchBranches();
  }, [repoPath, fetchBranches]);

  if (!repoPath) {
    return (
      <div className="flex h-[70vh] items-center justify-center text-text-muted">
        Open a repository first.
      </div>
    );
  }

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await api.createBranch(newName.trim());
      addToast(`Created '${newName.trim()}'`, 'success');
      setNewName('');
      fetchBranches();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  const handleSwitch = async (name: string) => {
    try {
      await api.switchBranch(name);
      addToast(`Switched to '${name}'`, 'success');
      fetchBranches();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  const handleRename = async (old: string) => {
    if (!renameValue.trim() || renameValue === old) { setRenaming(null); return; }
    try {
      await api.renameBranch(old, renameValue.trim());
      addToast(`Renamed '${old}' → '${renameValue.trim()}'`, 'success');
      setRenaming(null);
      fetchBranches();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  const handleDelete = async (name: string) => {
    try {
      await api.deleteBranch(name);
      addToast(`Deleted '${name}'`, 'success');
      setSelected(null);
      fetchBranches();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold glow-text">Branches</h1>

      {/* create */}
      <GlassCard className="flex items-center gap-3">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="New branch name…"
          className="flex-1 rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-accent"
        />
        <Button onClick={handleCreate}><Plus className="h-4 w-4" /> Create</Button>
      </GlassCard>

      {/* list */}
      <GlassCard className="space-y-1 p-3">
        <AnimatePresence>
          {branches.map((b) => (
            <motion.div
              key={b.name}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              onClick={() => setSelected(b.name === selected ? null : b.name)}
              className={cn(
                'flex cursor-pointer items-center justify-between rounded-xl px-4 py-3 text-sm transition-all',
                b.is_current ? 'bg-accent/10 border border-accent/20' : 'hover:bg-surface-2',
                b.name === selected && 'ring-1 ring-accent/30',
              )}
            >
              <div className="flex items-center gap-3">
                <GitBranch className={cn('h-4 w-4', b.is_current ? 'text-accent' : 'text-text-muted')} />
                {renaming === b.name ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRename(b.name); if (e.key === 'Escape') setRenaming(null); }}
                    onBlur={() => handleRename(b.name)}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded bg-surface-2 px-2 py-0.5 text-sm outline-none"
                  />
                ) : (
                  <span className={cn(b.is_current && 'font-semibold text-accent')}>{b.name}</span>
                )}
                {b.is_current && <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-medium text-accent">current</span>}
              </div>

              {b.name === selected && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-1">
                  {!b.is_current && (
                    <Button variant="ghost" className="h-8 px-2" onClick={(e) => { e.stopPropagation(); handleSwitch(b.name); }}>
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" className="h-8 px-2" onClick={(e) => { e.stopPropagation(); setRenaming(b.name); setRenameValue(b.name); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {!b.is_current && (
                    <Button variant="danger" className="h-8 px-2" onClick={(e) => { e.stopPropagation(); handleDelete(b.name); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {!branches.length && (
          <p className="py-8 text-center text-sm text-text-muted italic">No branches found</p>
        )}
      </GlassCard>
    </div>
  );
}
