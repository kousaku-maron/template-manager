export type CardStatus = "backlog" | "todo" | "in_progress" | "done";

export type User = {
  id: string;
  name: string;
  email: string;
};

export type Card = {
  id: string;
  title: string;
  description: string;
  status: CardStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CardPatch = Partial<Pick<Card, "title" | "description" | "status" | "sortOrder">>;

import { LazyStore } from "@tauri-apps/plugin-store";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8787").replace(/\/$/, "");

const TOKEN_KEY = "session_token";
const store = new LazyStore("auth.json");

export async function getSessionToken(): Promise<string | null> {
  return (await store.get<string>(TOKEN_KEY)) ?? null;
}

export async function setSessionToken(token: string | null): Promise<void> {
  if (token) {
    await store.set(TOKEN_KEY, token);
  } else {
    await store.delete(TOKEN_KEY);
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> || {}),
  };

  const token = await getSessionToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await (async () => {
    try {
      return await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        signal: controller.signal,
        headers,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error(`Request timeout: ${path}`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  })();

  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `Request failed: ${res.status}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json() as Promise<T>;
  }

  return (await res.text()) as T;
}

export function normalizeCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    if (a.status !== b.status) {
      const rank: Record<CardStatus, number> = { backlog: 0, todo: 1, in_progress: 2, done: 3 };
      return rank[a.status] - rank[b.status];
    }
    return a.sortOrder - b.sortOrder;
  });
}

export async function fetchMe(): Promise<User | null> {
  const result = await request<{ user: User | null }>("/api/me", { method: "GET" });
  return result.user;
}

export async function fetchCards(): Promise<Card[]> {
  const result = await request<{ cards: Card[] }>("/api/cards", { method: "GET" });
  return normalizeCards(result.cards);
}
