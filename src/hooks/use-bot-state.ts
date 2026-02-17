"use client";

import { useState, useEffect, useCallback } from "react";
import type { BotState } from "@/types";
import { API_URL, REFRESH_MS } from "@/config/constants";

export function useBotState() {
  const [state, setState] = useState<BotState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/state`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setState(data);
      setError(null);
      setLastFetch(Date.now());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Connection failed");
    }
  }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchState]);

  return { state, error, lastFetch };
}
