import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Key, Bot, GitBranch, FolderOpen, Save } from 'lucide-react';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/Button';
import { useAppStore } from '@/stores/app-store';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const { settings, fetchSettings, addToast, setRepoPath } = useAppStore();
  const [apiKey, setApiKey] = useState('');
  const [aiEnabled, setAiEnabled] = useState(true);
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings) {
      setAiEnabled(settings.ai_enabled);
      setDefaultBranch(settings.default_branch);
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: Record<string, unknown> = { ai_enabled: aiEnabled, default_branch: defaultBranch };
      if (apiKey.trim()) data.openai_api_key = apiKey.trim();
      await api.updateSettings(data as Parameters<typeof api.updateSettings>[0]);
      addToast('Settings saved', 'success');
      setApiKey('');
      fetchSettings();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openRecent = async (path: string) => {
    try {
      await api.openRepo(path);
      setRepoPath(path);
      addToast(`Opened ${path}`, 'success');
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Failed to open', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold glow-text">Settings</h1>

      <GlassCard className="space-y-5">
        {/* API Key */}
        <div>
          <label className="mb-1.5 flex items-center gap-2 text-sm font-medium">
            <Key className="h-4 w-4 text-accent" /> OpenAI API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={settings?.openai_api_key_set ? '••••••••' : 'sk-...'}
            className="w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-accent"
          />
          {settings?.openai_api_key_set && (
            <p className="mt-1 text-xs text-success">Key is set ({settings.openai_api_key})</p>
          )}
        </div>

        {/* AI toggle */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Bot className="h-4 w-4 text-cyan" /> Enable AI commit messages
          </label>
          <button
            onClick={() => setAiEnabled(!aiEnabled)}
            className={`relative h-6 w-11 rounded-full transition-colors ${aiEnabled ? 'bg-accent' : 'bg-border'}`}
          >
            <motion.div
              className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
              animate={{ left: aiEnabled ? 22 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>

        {/* Default branch */}
        <div>
          <label className="mb-1.5 flex items-center gap-2 text-sm font-medium">
            <GitBranch className="h-4 w-4 text-warning" /> Default branch name
          </label>
          <input
            value={defaultBranch}
            onChange={(e) => setDefaultBranch(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-accent"
          />
        </div>

        <Button onClick={handleSave} loading={saving} className="w-full">
          <Save className="h-4 w-4" /> Save Settings
        </Button>
      </GlassCard>

      {/* Recent repos */}
      {settings?.recent_repos?.length ? (
        <GlassCard>
          <h3 className="mb-3 text-sm font-semibold text-text-muted">Recent Repositories</h3>
          <div className="space-y-1">
            {settings.recent_repos.map((path) => (
              <button
                key={path}
                onClick={() => openRecent(path)}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
              >
                <FolderOpen className="h-4 w-4 shrink-0 text-accent" />
                <span className="truncate">{path}</span>
              </button>
            ))}
          </div>
        </GlassCard>
      ) : null}
    </div>
  );
}
