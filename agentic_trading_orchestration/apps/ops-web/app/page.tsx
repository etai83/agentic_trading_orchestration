"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Campaign, getCampaigns } from "@/lib/api";

export default function HomePage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCampaigns()
      .then(setCampaigns)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load campaigns"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1>Campaigns</h1>
      <p className="muted">
        Operator home — Phase 1 thin-slice ops dashboard (mock/live via API).
      </p>
      {loading ? <div className="muted">Loading…</div> : null}
      {error ? (
        <div className="card">
          Error: {error}
          <p className="muted" style={{ marginBottom: 0 }}>
            Is ops-api running on 127.0.0.1:8000? From repo root:{" "}
            <code>make ops-api-dev</code>
          </p>
        </div>
      ) : null}
      {!loading && !error && campaigns.length === 0 ? (
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
