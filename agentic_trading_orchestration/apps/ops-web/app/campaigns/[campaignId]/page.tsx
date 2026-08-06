"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Campaign,
  EngineEvent,
  getCampaign,
  getEvents,
  getGraph,
  GraphDTO,
} from "@/lib/api";

export default function CampaignWorkspacePage() {
  const params = useParams<{ campaignId: string }>();
  const campaignId = params.campaignId;
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [graph, setGraph] = useState<GraphDTO | null>(null);
  const [events, setEvents] = useState<EngineEvent[]>([]);
  const [mode, setMode] = useState<"graph" | "list">("graph");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getCampaign(campaignId), getGraph(campaignId), getEvents(campaignId)])
      .then(([c, g, ev]) => {
        setCampaign(c);
        setGraph(g);
        setEvents([...ev.events].reverse());
      })
      .catch((e) => setError(e.message));

    // poll events as mock stream fallback
    const t = setInterval(() => {
      getEvents(campaignId)
        .then((ev) => setEvents([...ev.events].reverse()))
        .catch(() => undefined);
    }, 3000);
    return () => clearInterval(t);
  }, [campaignId]);

  const pendingSet = useMemo(
    () => new Set(graph?.pending_gate_experiment_ids || []),
    [graph],
  );

  if (error) return <div className="card">Error: {error}</div>;
  if (!campaign || !graph) return <div className="muted">Loading…</div>;

  return (
    <div>
      <div className="muted">
        <Link href="/">Campaigns</Link> / {campaign.name}
      </div>
      <div className="row" style={{ marginTop: "0.5rem" }}>
        <h1 style={{ margin: 0 }}>{campaign.name}</h1>
        <span className="status">{campaign.status}</span>
        {graph.pending_gate_experiment_ids.length > 0 ? (
          <Link href="/gates" className="status" style={{ background: "#4c1d95" }}>
            {graph.pending_gate_experiment_ids.length} gate(s) need review
          </Link>
        ) : null}
      </div>
      <p className="muted">
        goals {JSON.stringify(campaign.goal_vector)} · experiments{" "}
        {graph.experiments.length}
      </p>

      <div className="row" style={{ marginBottom: "0.75rem" }}>
        <button onClick={() => setMode("graph")} disabled={mode === "graph"}>
          Graph
        </button>
        <button onClick={() => setMode("list")} disabled={mode === "list"}>
          List
        </button>
      </div>

      <div className="workspace">
        <div className="card">
          {mode === "list" ? (
            <table>
              <thead>
                <tr>
                  <th>Hypothesis</th>
                  <th>Verdict</th>
                  <th>Sharpe</th>
                </tr>
              </thead>
              <tbody>
                {graph.experiments.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <Link href={`/campaigns/${campaignId}/experiments/${e.id}`}>
                        {e.title_or_hypothesis}
                      </Link>
                      {pendingSet.has(e.id) ? " 👤" : ""}
                    </td>
                    <td>{e.verdict || "—"}</td>
                    <td>{e.summary_metrics.sharpe ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="graph">
              {graph.theses.map((t) => {
                const exps = graph.experiments.filter((e) => e.thesis_id === t.id);
                return (
                  <div className="thesis-col" key={t.id}>
                    <strong>{t.title}</strong>
                    <div className="muted">{t.status}</div>
                    {exps.map((e) => (
                      <Link
                        key={e.id}
                        href={`/campaigns/${campaignId}/experiments/${e.id}`}
                        className={`node ${e.verdict || ""} ${pendingSet.has(e.id) ? "needs-human" : ""}`}
                        style={{ display: "block" }}
                      >
                        <div>{e.title_or_hypothesis}</div>
                        <div className="muted">
                          {e.verdict || "pending"} · sharpe {e.summary_metrics.sharpe ?? "—"}
                          {pendingSet.has(e.id) ? " · needs human" : ""}
                        </div>
                      </Link>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <strong>Engine event stream</strong>
          <div className="stream">
            {events.length === 0 ? (
              <div className="muted">No events yet</div>
            ) : (
              events.map((ev, i) => (
                <div className={`ev ${ev.type}`} key={`${ev.ts}-${i}`}>
                  <div>
                    <strong>{ev.type}</strong>{" "}
                    <span className="muted">{new Date(ev.ts).toLocaleTimeString()}</span>
                  </div>
                  <div className="muted">{JSON.stringify(ev.payload)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
