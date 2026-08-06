"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getGates } from "@/lib/api";

export function Nav() {
  const [pending, setPending] = useState(0);

  useEffect(() => {
    getGates("pending")
      .then((g) => setPending(g.length))
      .catch(() => setPending(0));
    const t = setInterval(() => {
      getGates("pending")
        .then((g) => setPending(g.length))
        .catch(() => undefined);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <nav className="top">
      <Link href="/" className="brand">
        ATO Ops
      </Link>
      <Link href="/">Campaigns</Link>
      <Link href="/gates">
        Gates
        {pending > 0 ? <span className="badge">{pending}</span> : null}
      </Link>
    </nav>
  );
}
