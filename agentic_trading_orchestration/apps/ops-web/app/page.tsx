import Link from "next/link";
import { getCampaigns } from "@/lib/api";

export default async function HomePage() {
  let campaigns: Awaited<ReturnType<typeof getCampaigns>> = [];
  let error: string | null = null;
  try {
    campaigns = await getCampaigns();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load campaigns";
  }

  return (
    <div>
      <h1>Campaigns</h1>
      <p className="muted">Operator home — Phase 1 thin-slice ops dashboard (mock/live via API).</p>
      {error ? <div className="card">Error: {error}</div> : null}
      {!error && campaigns.length === 0 ? (
        <div className="empty">No campaigns yet</div>
      ) : null}
      {campaigns.map((c) => (
        <div className="card" key={c.id}>
          <div className="row">
            <Link href={`/campaigns/${c.id}`}>
              <strong>{c.name}</strong>
            </Link>
            <span className="status">{c.status}</span>
          </div>
          <div className="muted">
            universe: {c.asset_universe.join(", ")} · goals sharpe≥
            {c.goal_vector.min_sharpe}
          </div>
        </div>
      ))}
    </div>
  );
}
