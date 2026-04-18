import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, Link2, FileEdit, Upload, ChevronRight, ChevronLeft, Zap, CheckCircle2 } from 'lucide-react';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/Button';
import { useAppStore } from '@/stores/app-store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const STEPS = [
  { label: 'Select Folder', icon: Folder },
  { label: 'Connect Repo', icon: Link2 },
  { label: 'Commit', icon: FileEdit },
  { label: 'Push', icon: Upload },
];

export default function RepoSetup() {
  const { addToast, setRepoPath, fetchStatus } = useAppStore();
  const [step, setStep] = useState(0);
  const [folderPath, setFolderPath] = useState('');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [branchName, setBranchName] = useState('main');
  const [commitMsg, setCommitMsg] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushDone, setPushDone] = useState(false);

  const next = () => setStep((s) => Math.min(s + 1, 3));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const handleOpenFolder = async () => {
    if (!folderPath.trim()) return addToast('Enter a folder path', 'error');
    try {
      await api.openRepo(folderPath.trim(), true);
      setRepoPath(folderPath.trim());
      addToast('Repository opened', 'success');
      const remote = await api.getRemote().catch(() => ({ url: null }));
      if (remote.url) setRemoteUrl(remote.url);
      next();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Failed to open repo', 'error');
    }
  };

  const handleConnect = async () => {
    try {
      if (remoteUrl.trim()) await api.setRemote(remoteUrl.trim());
      await api.stageAll();
      await api.ensureBranch(branchName || 'main');
      addToast('Remote configured', 'success');
      next();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Failed to connect', 'error');
    }
  };

  const handleAi = async () => {
    setAiLoading(true);
    try {
      const { message } = await api.aiCommitMessage();
      setCommitMsg(message);
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'AI error', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!commitMsg.trim()) return addToast('Enter a commit message', 'error');
    try {
      await api.stageAll();
      const { sha } = await api.commit(commitMsg.trim());
      addToast(`Committed ${sha.slice(0, 8)}`, 'success');
      next();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Commit failed', 'error');
    }
  };

  const handlePush = async () => {
    setPushLoading(true);
    try {
      await api.push(true);
      addToast('Pushed successfully!', 'success');
      setPushDone(true);
      fetchStatus();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Push failed', 'error');
    } finally {
      setPushLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold glow-text">Repository Setup</h1>

      {/* step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={cn(
              'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
              i === step ? 'bg-accent/20 text-accent border border-accent/30' :
              i < step ? 'bg-success/20 text-success border border-success/30' :
              'bg-surface-2 text-text-muted border border-border',
            )}>
              {i < step ? <CheckCircle2 className="h-3.5 w-3.5" /> : <s.icon className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < 3 && <ChevronRight className="h-4 w-4 text-border" />}
          </div>
        ))}
      </div>

      {/* step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {step === 0 && (
            <GlassCard className="space-y-4">
              <h2 className="text-lg font-semibold">Select your project folder</h2>
              <input
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="C:\path\to\project"
                className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none focus:border-accent"
              />
              <p className="text-xs text-text-muted">If the folder isn't a Git repo, one will be initialized automatically.</p>
            </GlassCard>
          )}

          {step === 1 && (
            <GlassCard className="space-y-4">
              <h2 className="text-lg font-semibold">Connect to GitHub</h2>
              <div>
                <label className="mb-1 block text-xs text-text-muted">Repository URL</label>
                <input
                  value={remoteUrl}
                  onChange={(e) => setRemoteUrl(e.target.value)}
                  placeholder="https://github.com/user/repo.git"
                  className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-text-muted">Branch name</label>
                <input
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none focus:border-accent"
                />
              </div>
            </GlassCard>
          )}

          {step === 2 && (
            <GlassCard className="space-y-4">
              <h2 className="text-lg font-semibold">Commit your changes</h2>
              <div className="flex gap-2">
                <input
                  value={commitMsg}
                  onChange={(e) => setCommitMsg(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCommit()}
                  placeholder="Commit message…"
                  className="flex-1 rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none focus:border-accent"
                />
                <Button variant="secondary" onClick={handleAi} loading={aiLoading}>
                  <Zap className="h-4 w-4" /> Fast Commit
                </Button>
              </div>
            </GlassCard>
          )}

          {step === 3 && (
            <GlassCard className="flex flex-col items-center gap-4 py-10">
              {pushDone ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
                  <CheckCircle2 className="mx-auto h-16 w-16 text-success" />
                  <h2 className="mt-4 text-xl font-bold">Pushed successfully!</h2>
                  <p className="mt-1 text-sm text-text-muted">Your code is live on GitHub.</p>
                </motion.div>
              ) : (
                <>
                  <Upload className="h-12 w-12 text-accent" />
                  <h2 className="text-lg font-semibold">Ready to push</h2>
                  <Button onClick={handlePush} loading={pushLoading}>
                    <Rocket className="h-4 w-4" /> Push to GitHub
                  </Button>
                </>
              )}
            </GlassCard>
          )}
        </motion.div>
      </AnimatePresence>

      {/* nav */}
      <div className="flex justify-between">
        <Button variant="ghost" onClick={back} disabled={step === 0}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        {step === 0 && <Button onClick={handleOpenFolder}>Next <ChevronRight className="h-4 w-4" /></Button>}
        {step === 1 && <Button onClick={handleConnect}>Next <ChevronRight className="h-4 w-4" /></Button>}
        {step === 2 && <Button onClick={handleCommit}>Commit & Next <ChevronRight className="h-4 w-4" /></Button>}
      </div>
    </div>
  );
}

function Rocket(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}
