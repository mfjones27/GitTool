const BASE = 'http://127.0.0.1:9876';

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

function get<T>(path: string) {
  return request<T>(path);
}

function post<T>(path: string, body?: unknown) {
  return request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
}

function put<T>(path: string, body?: unknown) {
  return request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });
}

// ── typed API ──────────────────────────────────────────────────────

export interface RepoStatus {
  branch: string;
  modified: string[];
  staged: string[];
  untracked: string[];
  last_commit: string;
  ahead: number;
  behind: number;
}

export interface BranchInfo {
  name: string;
  is_current: boolean;
}

export interface Settings {
  openai_api_key: string;
  openai_api_key_set: boolean;
  ai_enabled: boolean;
  default_branch: string;
  recent_repos: string[];
}

export interface IgnorePlan {
  patterns: string[];
  languages: string[];
  gitignore_updated: boolean;
  tracked_matches: string[];
  untracked: string[];
}

export const api = {
  health: () => get<{ status: string; git_installed: boolean }>('/health'),

  openRepo: (path: string, init_if_needed = false) =>
    post<{ path: string }>('/repo/open', { path, init_if_needed }),

  status: () => get<RepoStatus>('/repo/status'),

  setRemote: (url: string) => post('/repo/remote', { url }),
  getRemote: () => get<{ url: string | null }>('/repo/remote'),

  branches: () => get<BranchInfo[]>('/branches'),
  createBranch: (name: string) => post('/branches/create', { name }),
  switchBranch: (name: string) => post('/branches/switch', { name }),
  renameBranch: (old_name: string, new_name: string) => post('/branches/rename', { old_name, new_name }),
  deleteBranch: (name: string) => post('/branches/delete', { name }),
  ensureBranch: (name: string) => post('/branches/ensure', { name }),

  stageFiles: (files: string[]) => post('/repo/stage', { files }),
  stageAll: () => post('/repo/stage-all'),
  unstageFiles: (files: string[]) => post('/repo/unstage', { files }),

  commit: (message: string) => post<{ sha: string }>('/repo/commit', { message }),
  push: (set_upstream = false) => post('/repo/push', { set_upstream }),
  pushEverything: () =>
    post<{ sha: string; message: string; ignore: IgnorePlan }>('/repo/push-everything'),

  ignorePreview: () => get<IgnorePlan>('/repo/ignore/preview'),
  ignoreApply: () => post<IgnorePlan>('/repo/ignore/apply'),

  diff: (staged = false) => get<{ diff: string }>(`/repo/diff?staged=${staged}`),
  aiCommitMessage: () => post<{ message: string }>('/ai/commit-message'),

  getSettings: () => get<Settings>('/settings'),
  updateSettings: (data: Partial<{ openai_api_key: string; ai_enabled: boolean; default_branch: string }>) =>
    put('/settings', data),
};
