import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GitBranch, ArrowUpCircle, ArrowDownCircle, Clock, FileCode2, Zap, Rocket, RefreshCw, Activity, ShieldCheck } from 'lucide-react';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/StatusBadge';
import { Skeleton } from '@/components/Skeleton';
import { Modal } from '@/components/Modal';
import { useAppStore } from '@/stores/app-store';
import { api, type IgnorePlan } from '@/lib/api';

export default function Dashboard() {
  const { repoStatus, repoPath, fetchStatus, addToast, loading } = useAppStore();
  const [pushing, setPushing] = useState(false);
  const [commitMsg, setCommitMsg] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [ignorePlan, setIgnorePlan] = useState<IgnorePlan | null>(null);
  const [ignoreLoading, setIgnoreLoading] = useState(false);
  const [commitModalOpen, setCommitModalOpen] = useState(false);

  const refreshIgnore = useCallback(async () => {
    try {
      const plan = await api.ignorePreview();
      setIgnorePlan(plan);
    } catch {
      /* no-op */
    }
  }, []);

  useEffect(() => {
    if (repoPath) {
      fetchStatus();
      refreshIgnore();
    }
  }, [repoPath, fetchStatus, refreshIgnore]);

  const handleApplyIgnore = async () => {
    setIgnoreLoading(true);
    try {
      const plan = await api.ignoreApply();
      setIgnorePlan(plan);
      if (plan.untracked.length) {
        addToast(`Untracked ${plan.untracked.length} file(s) from index`, 'success');
      } else {
        addToast('Already clean — nothing to untrack', 'info');
      }
      fetchStatus();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Smart Ignore failed', 'error');
    } finally {
      setIgnoreLoading(false);
    }
  };

  const handleAiMessage = async () => {
    setAiLoading(true);
    try {
      const { message } = await api.aiCommitMessage();
      setCommitMsg(message);
      addToast('AI message generated', 'success');
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'AI failed', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!commitMsg.trim()) return addToast('Enter a commit message', 'error');
    try {
      const { sha } = await api.commit(commitMsg);
      addToast(`Committed ${sha.slice(0, 8)}`, 'success');
      setCommitMsg('');
      fetchStatus();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Commit failed', 'error');
    }
  };

  const handlePushEverything = async () => {
    setPushing(true);
    try {
      const res = await api.pushEverything();
      setIgnorePlan(res.ignore);
      const untracked = res.ignore?.untracked.length ?? 0;
      const suffix = untracked ? ` (excluded ${untracked} file${untracked === 1 ? '' : 's'})` : '';
      addToast(`Pushed ${res.sha.slice(0, 8)} — ${res.message}${suffix}`, 'success');
      fetchStatus();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Push failed', 'error');
    } finally {
      setPushing(false);
    }
  };

  if (!repoPath) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-4">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Activity className="h-16 w-16 text-accent/40" />
        </motion.div>
        <h2 className="text-xl font-semibold text-text-muted">No repository open</h2>
        <p className="text-sm text-text-muted">Head to <span className="text-accent">Repo Setup</span> to get started.</p>
      </div>
    );
  }

  const s = repoStatus;
  const totalChanged = (s?.modified.length ?? 0) + (s?.untracked.length ?? 0);

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold glow-text">Dashboard</h1>
          <p className="mt-1 text-sm text-text-muted truncate max-w-lg">{repoPath}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={s ? 'live' : 'idle'} label={s ? 'Connected' : 'Idle'} pulse={!!s} />
          <Button variant="secondary" onClick={() => fetchStatus()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button onClick={handlePushEverything} loading={pushing}>
            <Rocket className="h-4 w-4" /> Push Everything
          </Button>
        </div>
      </div>

      {/* stat cards */}
      {loading && !s ? (
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          <GlassCard glow>
            <div className="flex items-center gap-3 text-accent">
              <GitBranch className="h-5 w-5" />
              <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Branch</span>
            </div>
            <p className="mt-3 text-xl font-bold">{s?.branch ?? '—'}</p>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-3 text-cyan">
              <div className="flex gap-1">
                <ArrowUpCircle className="h-4 w-4" />
                <ArrowDownCircle className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Sync</span>
            </div>
            <p className="mt-3 text-xl font-bold">
              {s ? `↑${s.ahead}  ↓${s.behind}` : '—'}
            </p>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-3 text-warning">
              <FileCode2 className="h-5 w-5" />
              <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Changed</span>
            </div>
            <p className="mt-3 text-xl font-bold">{totalChanged} files</p>
          </GlassCard>

          <GlassCard
            onClick={() => s?.last_commit && setCommitModalOpen(true)}
            className={s?.last_commit ? 'cursor-pointer' : ''}
            title={s?.last_commit ? 'Click to view full message' : undefined}
          >
            <div className="flex items-center gap-3 text-success">
              <Clock className="h-5 w-5" />
              <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Last Commit</span>
            </div>
            <p className="mt-3 truncate text-sm font-medium">{s?.last_commit ?? '—'}</p>
          </GlassCard>
        </div>
      )}

      {/* file panels + commit */}
      <div className="grid grid-cols-2 gap-4">
        <GlassCard className="max-h-64 overflow-y-auto">
          <h3 className="mb-3 text-sm font-semibold text-accent">Staged ({s?.staged.length ?? 0})</h3>
          {s?.staged.length ? (
            <ul className="space-y-1 text-sm">
              {s.staged.map((f) => <li key={f} className="truncate text-text-muted">{f}</li>)}
            </ul>
          ) : (
            <p className="text-sm text-text-muted italic">Nothing staged</p>
          )}
        </GlassCard>

        <GlassCard className="max-h-64 overflow-y-auto">
          <h3 className="mb-3 text-sm font-semibold text-warning">Modified / Untracked ({totalChanged})</h3>
          {totalChanged ? (
            <ul className="space-y-1 text-sm">
              {[...(s?.modified ?? []), ...(s?.untracked ?? [])].map((f) => (
                <li key={f} className="truncate text-text-muted">{f}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-muted italic">Working tree clean</p>
          )}
        </GlassCard>
      </div>

      {/* commit bar */}
      <GlassCard className="flex items-center gap-3">
        <input
          value={commitMsg}
          onChange={(e) => setCommitMsg(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCommit()}
          placeholder="Commit message…"
          className="flex-1 rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
        />
        <Button variant="secondary" onClick={handleAiMessage} loading={aiLoading}>
          <Zap className="h-4 w-4" /> AI Message
        </Button>
        <Button onClick={handleCommit}>Commit</Button>
      </GlassCard>

      {/* Smart Ignore panel */}
      <GlassCard className="border-accent/20">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-accent">Smart Ignore</h3>
            {ignorePlan?.languages.length ? (
              <StatusBadge status="ready" label={ignorePlan.languages.join(' + ')} />
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={refreshIgnore}>
              <RefreshCw className="h-4 w-4" /> Scan
            </Button>
            <Button onClick={handleApplyIgnore} loading={ignoreLoading}>
              Apply
            </Button>
          </div>
        </div>
        <p className="mb-3 text-xs text-text-muted">
          Auto-manages <span className="text-accent">.gitignore</span> and untracks files that shouldn't be pushed
          (builds, <code>dist/</code>, <code>node_modules/</code>, <code>.venv/</code>, secrets, binaries). Runs
          automatically on <span className="text-accent">Push Everything</span>.
        </p>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="text-text-muted">Managed patterns</p>
            <p className="mt-1 text-lg font-bold text-accent">{ignorePlan?.patterns.length ?? 0}</p>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="text-text-muted">Should be excluded</p>
            <p className="mt-1 text-lg font-bold text-warning">{ignorePlan?.tracked_matches.length ?? 0}</p>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="text-text-muted">.gitignore</p>
            <p className="mt-1 text-lg font-bold text-success">
              {ignorePlan?.gitignore_updated ? 'Updated' : 'In sync'}
            </p>
          </div>
        </div>
        {ignorePlan?.tracked_matches.length ? (
          <div className="mt-3 max-h-40 overflow-y-auto rounded-xl bg-surface-2 p-3">
            <p className="mb-1 text-xs text-text-muted">Will be untracked on Apply:</p>
            <ul className="space-y-0.5 text-xs font-mono">
              {ignorePlan.tracked_matches.slice(0, 50).map((f) => (
                <li key={f} className="truncate text-warning">{f}</li>
              ))}
              {ignorePlan.tracked_matches.length > 50 ? (
                <li className="text-text-muted">…and {ignorePlan.tracked_matches.length - 50} more</li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </GlassCard>

      {/* AI insights panel */}
      <GlassCard glow className="border-accent/20">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-accent">AI Insights</h3>
          <StatusBadge status="ready" label="Ready" />
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="text-text-muted">Staged files</p>
            <p className="mt-1 text-lg font-bold text-accent">{s?.staged.length ?? 0}</p>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="text-text-muted">Pending changes</p>
            <p className="mt-1 text-lg font-bold text-warning">{totalChanged}</p>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="text-text-muted">Sync status</p>
            <p className="mt-1 text-lg font-bold text-cyan">
              {s && (s.ahead === 0 && s.behind === 0) ? 'Up to date' : `${s?.ahead ?? 0} ahead`}
            </p>
          </div>
        </div>
      </GlassCard>

      <Modal
        open={commitModalOpen}
        onClose={() => setCommitModalOpen(false)}
        title="Last Commit Message"
      >
        <pre className="whitespace-pre-wrap break-words font-mono text-sm text-text">
          {s?.last_commit}
        </pre>
      </Modal>
    </div>
  );
}
