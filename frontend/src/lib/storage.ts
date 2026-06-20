const storageKey = "thai-carbon-market:onchain-map";

export type OnChainProjectMap = Record<string, number>;

export function loadProjectMap(): OnChainProjectMap {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as OnChainProjectMap;
  } catch {
    return {};
  }
}

export function saveProjectMap(map: OnChainProjectMap) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(map));
}
