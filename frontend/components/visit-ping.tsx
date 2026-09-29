"use client";

/**
 * Tells the API that somebody opened the demo, once per browser session (ported from NEXA).
 *
 * Once per session because the point is "a person arrived", not "a page loaded":
 * clicking around, refreshing or signing in would otherwise each count again. The id
 * lives in sessionStorage, so it disappears when the tab closes and a return visit
 * tomorrow counts as a new arrival.
 *
 * It sends the page, the referrer and any ?ref= tag on the shared link (e.g.
 * ?ref=linkedin), nothing else. The server adds the browser and a rough location and
 * forgets the IP; see backend/app/services/notify.py.
 *
 * Every failure is swallowed: analytics must never be the reason a page breaks.
 */

import { useEffect } from "react";

import { API_PREFIX } from "@/lib/api";

const KEY = "wanderly.visit";

export function VisitPing() {
  useEffect(() => {
    let session: string | null = null;
    try {
      if (sessionStorage.getItem(KEY)) return; // already counted this session
      session = crypto.randomUUID();
      sessionStorage.setItem(KEY, session);
    } catch {
      return; // private mode or blocked storage: skip rather than double-count
    }

    // keepalive lets the request finish even if the visitor leaves immediately,
    // which is exactly the visitor we most want to know about.
    void fetch(`${API_PREFIX}/events/visit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        path: window.location.pathname,
        referrer: document.referrer || null,
        ref: new URLSearchParams(window.location.search).get("ref"),
        session_id: session,
      }),
    }).catch(() => {});
  }, []);

  return null;
}
