"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Gate, getGates, resolveGate } from "@/lib/api";

export default function GatesPage() {
  const [gates, setGates] = useState<Gate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    getGates("pending")
      .then(setGates)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onResolve(id: string, status: "approved" | "rejected") {
    setBusy(id);
    try {
      await resolveGate(id, status);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "resolve failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <h1>Gates inbox</h1>
      <p className="muted">Approve / Reject only — orchestrator resumes from store status.</p>
      {error ? <div className="card">Error: {error}</div> : null}
      {gates.length === 0 && !error ? (
        <div className="empty">You&apos;re clear — no pending gates</div>
      ) : null}
      {gates.map((g) => {
        const expId = (g.payload?.experiment_id as string) || null;
        return (
          <div className="card" key={g.id}>
            <div className="row">
              <strong>{g.reason}</strong>
              <span className="status">{g.status}</span>
            </div>
            <div className="muted">
              campaign{" "}
              <Link href={`/campaigns/${g.campaign_id}`}>{g.campaign_id.slice(0, 8)}…</Link>
              {expId ? (
                <>
                  {" "}
                  · experiment{" "}
                  <Link href={`/campaigns/${g.campaign_id}/experiments/${expId}`}>
                    {expId.slice(0, 8)}…
                  </Link>
                </>
              ) : null}
            </div>
            <pre className="muted" style={{ whiteSpace: "pre-wrap" }}>
              {JSON.stringify(g.payload, null, 2)}
            </pre>
            <div className="row">
              <button
                className="primary"
                disabled={busy === g.id}
                onClick={() => onResolve(g.id, "approved")}
              >
                Approve
              </button>
              <button
                className="danger"
                disabled={busy === g.id}
                onClick={() => onResolve(g.id, "rejected")}
              >
                Reject
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
