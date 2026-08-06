export type Campaign = {
  id: string;
  name: string;
  status: string;
  goal_vector: Record<string, number>;
  asset_universe: string[];
  created_at: string;
};

export type Gate = {
  id: string;
  campaign_id: string;
  reason: string;
  payload: Record<string, unknown>;
  status: string;
  created_at: string;
  resolved_at: string | null;
};

export type GraphDTO = {
  campaign_id: string;
  theses: { id: string; title: string; status: string; created_at: string }[];
  experiments: {
    id: string;
    thesis_id: string;
    parent_experiment_id: string | null;
    title_or_hypothesis: string;
    verdict: string | null;
    next_action: string | null;
    created_at: string;
    summary_metrics: { sharpe: number | null };
  }[];
  pending_gate_experiment_ids: string[];
};

export type EngineEvent = {
  type: string;
  ts: string;
  campaign_id: string;
  payload: Record<string, unknown>;
};

function apiBase(): string {
  // Browser: same-origin Next rewrites. Server components: hit API directly.
  if (typeof window === "undefined") {
    return process.env.OPS_API_BASE || "http://127.0.0.1:8001";
  }
  return "";
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body?.error?.message || res.statusText;
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const getCampaigns = () => api<Campaign[]>("/api/v1/campaigns");
export const getCampaign = (id: string) => api<Campaign>(`/api/v1/campaigns/${id}`);
export const getGraph = (id: string) => api<GraphDTO>(`/api/v1/campaigns/${id}/graph`);
export const getGates = (status?: string) =>
  api<Gate[]>(`/api/v1/gates${status ? `?status=${status}` : ""}`);
export const getExperiment = (id: string) => api<Record<string, unknown>>(`/api/v1/experiments/${id}`);
export const getMarkdownPath = (id: string) =>
  api<{ path: string; experiment_id: string; thesis_id: string }>(
    `/api/v1/experiments/${id}/markdown-path`,
  );
export const getEvents = (campaignId: string) =>
  api<{ events: EngineEvent[] }>(`/api/v1/campaigns/${campaignId}/events`);

export async function resolveGate(id: string, status: "approved" | "rejected") {
  return api<Gate>(`/api/v1/gates/${id}/resolve`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}
