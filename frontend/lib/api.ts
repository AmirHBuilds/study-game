const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type GoalType = "earn" | "unlock" | "bank";

export interface StartSessionPayload {
  user_id: string;
  goal_type: GoalType;
  goal_seed_type_id?: string;
  planned_duration_minutes: number;
}

export interface PlantItemPayload {
  user_id: string;
  seed_type_id: string;
  plot_x: number;
  plot_y: number;
}

export interface UseHoePayload {
  user_id: string;
  plot_x: number;
  plot_y: number;
}

async function request(path: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`Request to ${path} failed: ${res.status}`);
  }
  return res.json();
}

export const getMe = () => request("/users/me");

export const listSeedTypes = () => request("/seed-types");

export const listInventory = (userId: string) =>
  request(`/inventory?user_id=${userId}`);

export const listPlantedItems = (userId: string) =>
  request(`/planted-items?user_id=${userId}`);

export const listPlots = (userId: string) => request(`/plots?user_id=${userId}`);

export const plantItem = (payload: PlantItemPayload) =>
  request("/planted-items", { method: "POST", body: JSON.stringify(payload) });

export const waterPlant = (plantedItemId: string) =>
  request(`/planted-items/${plantedItemId}/water`, { method: "POST" });

export const digUpPlant = (plantedItemId: string) =>
  request(`/planted-items/${plantedItemId}/dig-up`, { method: "POST" });

export const useHoe = (payload: UseHoePayload) =>
  request("/tools/hoe/use", { method: "POST", body: JSON.stringify(payload) });

export const startSession = (payload: StartSessionPayload) =>
  request("/sessions/start", { method: "POST", body: JSON.stringify(payload) });

export const markAway = (sessionId: string) =>
  request(`/sessions/${sessionId}/away`, { method: "POST" });

export const markBack = (sessionId: string) =>
  request(`/sessions/${sessionId}/back`, { method: "POST" });

export const completeSession = (sessionId: string) =>
  request(`/sessions/${sessionId}/complete`, { method: "POST" });
