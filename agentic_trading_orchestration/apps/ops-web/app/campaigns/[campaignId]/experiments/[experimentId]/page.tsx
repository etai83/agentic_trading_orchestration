"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getExperiment, getMarkdownPath } from "@/lib/api";

export default function ExperimentDetailPage() {
  const params = useParams<{ campaignId: string; experimentId: string }>();
  const [exp, setExp] = useState<Record<string, unknown> | null>(null);
  const [mdPath, setMdPath] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getExperiment(params.experimentId),
      getMarkdownPath(params.experimentId),
    ])
      .then(([e, m]) => {
        setExp(e);
        setMdPath(m.path);
      })
      .catch((e) => setError(e.message));
  }, [params.experimentId]);

  if (error) return <div className="card">Error: {error}</div>;
  if (!exp) return <div className="muted">Loading…</div>;

  const results = (exp.results || {}) as Record<
    string,
    Record<string, Record<string, unknown>>
  >;

  return (
    <div>
      <div className="muted">
        <Link href="/">Campaigns</Link> /{" "}
        <Link href={`/campaigns/${params.campaignId}`}>{params.campaignId.slice(0, 8)}…</Link>{" "}
        / experiment
      </div>
      <h1>Experiment</h1>
      <div className="card">
        <div>
          <strong>Hypothesis</strong>
          <p>{String(exp.hypothesis)}</p>
        </div>
        <div className="muted">why: {String(exp.why_generated)}</div>
        <div className="muted">mutation: {String(exp.mutation_delta || "root")}</div>
        <div className="row" style={{ marginTop: "0.5rem" }}>
          <span className="status">verdict: {String(exp.verdict)}</span>
          <span className="status">next: {String(exp.next_action)}</span>
        </div>
        <p>{String(exp.next_reasoning || "")}</p>
      </div>

      <div className="card">
        <strong>Results</strong>
        <table>
          <thead>
            <tr>
              <th>Asset</th>
              <th>Tier</th>
              <th>Sharpe</th>
              <th>WR</th>
              <th>DD</th>
              <th>Trades</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(results).flatMap(([asset, tiers]) =>
              Object.entries(tiers).map(([tier, bt]) => (
                <tr key={`${asset}-${tier}`}>
                  <td>{asset}</td>
                  <td>{tier}</td>
                  <td>{String(bt.sharpe ?? "—")}</td>
                  <td>{String(bt.win_rate ?? "—")}</td>
                  <td>{String(bt.max_drawdown ?? "—")}</td>
                  <td>{String(bt.n_trades ?? "—")}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <strong>Strategy config</strong>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.85rem" }}>
          {JSON.stringify(exp.strategy_config, null, 2)}
        </pre>
      </div>

      <div className="card">
        <strong>Markdown path</strong>
        <p className="muted">{mdPath || "—"}</p>
      </div>
    </div>
  );
}
