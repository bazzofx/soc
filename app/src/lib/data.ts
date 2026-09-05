// Typed access to the static JSON bundles under public/data.
import { useEffect, useState } from "react";
import type {
  Category,
  Meta,
  References,
  Scenario,
  TechniqueAgg,
} from "../types";

function cache<T>(name: string): () => Promise<T> {
  let promise: Promise<T> | null = null;
  return () => {
    if (!promise) {
      promise = fetch(`data/${name}.json`).then((r) => {
        if (!r.ok) throw new Error(`data/${name}.json -> HTTP ${r.status}`);
        return r.json() as Promise<T>;
      });
    }
    return promise;
  };
}

export const getMeta = cache<Meta>("meta");
export const getCategories = cache<{ categories: Category[] }>("categories");
export const getScenarios = cache<{ scenarios: Scenario[] }>("scenarios");
export const getTechniques = cache<{ techniques: TechniqueAgg[] }>("techniques");
export const getReferences = cache<References>("references");

/** Minimal async hook that reloads when the loader identity changes. */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<{ data?: T; error?: Error }>({});
  useEffect(() => {
    let alive = true;
    loader()
      .then((data) => alive && setState({ data }))
      .catch((error: Error) => alive && setState({ error }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

export function useScenarios() {
  return useAsync(getScenarios);
}
export function useCategories() {
  return useAsync(getCategories);
}
export function useTechniques() {
  return useAsync(getTechniques);
}
export function useReferences() {
  return useAsync(getReferences);
}
export function useMeta() {
  return useAsync(getMeta);
}
