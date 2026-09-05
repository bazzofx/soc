// Review workflow state (status + notes per scenario) persisted to IndexedDB.
import { create } from "zustand";
import { get, set } from "idb-keyval";
import type { ReviewState, ReviewStatus } from "../types";

const DB_KEY = "soc-review-state-v1";
export const EMPTY_REVIEW: ReviewState = { version: 1, status: {}, notes: {} };

interface ReviewStore extends ReviewState {
  ready: boolean;
  setStatus: (code: string, status: ReviewStatus) => void;
  setNote: (code: string, note: string) => void;
  importState: (state: ReviewState) => void;
  resetAll: () => void;
}

function persist(s: ReviewState) {
  void set(DB_KEY, s);
}

async function loadInitial(): Promise<ReviewState> {
  try {
    const saved = await get<ReviewState>(DB_KEY);
    if (saved && typeof saved === "object" && saved.status && saved.notes) {
      return saved;
    }
  } catch {
    /* ignore storage errors */
  }
  return EMPTY_REVIEW;
}

export const useReview = create<ReviewStore>((setState, getState) => ({
  ...EMPTY_REVIEW,
  ready: false,
  setStatus: (code, status) => {
    const next = {
      ...getState(),
      status: { ...getState().status, [code]: status },
    };
    setState(next);
    persist(next);
  },
  setNote: (code, note) => {
    const next = {
      ...getState(),
      notes: { ...getState().notes, [code]: note },
    };
    setState(next);
    persist(next);
  },
  importState: (state) => {
    const merged: ReviewState = {
      ...EMPTY_REVIEW,
      ...state,
      exportedAt: new Date().toISOString(),
    };
    setState({ ...merged, ready: true });
    persist(merged);
  },
  resetAll: () => {
    setState({ ...EMPTY_REVIEW, ready: true });
    persist(EMPTY_REVIEW);
  },
}));

export async function initReviewStore() {
  const initial = await loadInitial();
  useReview.setState({ ...initial, ready: true });
}

export function exportReviewBlob(state: ReviewState): Blob {
  const payload: ReviewState = { ...state, exportedAt: new Date().toISOString() };
  return new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
}

export function downloadReview(state: ReviewState) {
  const blob = exportReviewBlob(state);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "soc-review-state.json";
  a.click();
  URL.revokeObjectURL(url);
}

export async function parseReviewFile(file: File): Promise<ReviewState> {
  const text = await file.text();
  const data = JSON.parse(text) as ReviewState;
  if (!data || typeof data.status !== "object" || typeof data.notes !== "object") {
    throw new Error("Not a valid SOC review export");
  }
  return { ...EMPTY_REVIEW, ...data };
}
