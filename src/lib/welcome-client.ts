"use client";

import { useMemo, useSyncExternalStore } from "react";

/**
 * The claimed first-box offer lives in this browser only (localStorage), so the buy panel can
 * apply it at checkout. It holds the visitor's own email and the public code, nothing secret;
 * the server re-checks eligibility at checkout. Storage can be blocked, so every access is guarded.
 */
const KEY = "keniya.welcome";
const CHANGED = "keniya:welcome-changed";
export const OPEN_WELCOME = "keniya:welcome-open";

export type WelcomeState =
  | { status: "claimed"; email: string; code: string; priceCents: number }
  | { status: "dismissed"; until: number }
  | { status: "ineligible" };

// Fallback when storage is blocked, so a claim still works for this page view.
let memory: string | null = null;

function snapshot(): string | null {
  try {
    return window.localStorage.getItem(KEY) ?? memory;
  } catch {
    return memory;
  }
}

function parse(raw: string | null): WelcomeState | null {
  try {
    return raw ? (JSON.parse(raw) as WelcomeState) : null;
  } catch {
    return null;
  }
}

export const readWelcome = (): WelcomeState | null => parse(snapshot());

export function writeWelcome(state: WelcomeState | null) {
  memory = state ? JSON.stringify(state) : null;
  try {
    if (memory) window.localStorage.setItem(KEY, memory);
    else window.localStorage.removeItem(KEY);
  } catch {
    // Private mode or blocked storage: `memory` carries it for this page view.
  }
  window.dispatchEvent(new Event(CHANGED));
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => e.key === KEY && onChange();
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** The current claim, kept in sync across components and tabs (null while server rendering). */
export function useWelcome(): WelcomeState | null {
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  return useMemo(() => parse(raw), [raw]);
}

export const openWelcome = () => window.dispatchEvent(new Event(OPEN_WELCOME));
