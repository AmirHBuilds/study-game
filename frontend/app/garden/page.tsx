"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import GameCanvas from "@/components/game/GameCanvas";
import {
  getMe,
  listInventory,
  listPlantedItems,
  listPlots,
  listSeedTypes,
  plantItem,
  useHoe,
  waterPlant,
} from "@/lib/api";

interface SeedType {
  id: string;
  key: string;
  display_name: string;
  category: string;
}

interface InventoryItem {
  id: string;
  seed_type_id: string | null;
  quantity: number;
  durability_remaining: number | null;
}

interface PlantedItem {
  id: string;
  seed_type_id: string;
  plot_x: number;
  plot_y: number;
  stage: string;
  watered_at: string | null;
}

interface Plot {
  plot_x: number;
  plot_y: number;
  tilled: boolean;
}

export default function GardenPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [seedTypes, setSeedTypes] = useState<SeedType[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [planted, setPlanted] = useState<PlantedItem[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);

  async function refresh(uid: string) {
    const [inv, plantedItems, tilledPlots] = await Promise.all([
      listInventory(uid),
      listPlantedItems(uid),
      listPlots(uid),
    ]);
    setInventory(inv);
    setPlanted(plantedItems);
    setPlots(tilledPlots);
  }

  useEffect(() => {
    getMe().then((u) => {
      setUserId(u.id);
      refresh(u.id);
    });
    listSeedTypes().then(setSeedTypes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function seedTypeName(id: string | null) {
    return seedTypes.find((s) => s.id === id)?.display_name ?? "Item";
  }

  const hoeType = seedTypes.find((s) => s.key === "hoe");
  const hoeItem = inventory.find((i) => i.seed_type_id === hoeType?.id);
  const tilledSet = new Set(plots.map((p) => `${p.plot_x},${p.plot_y}`));
  const occupiedSet = new Set(planted.map((p) => `${p.plot_x},${p.plot_y}`));

  function findNextOpenTilledPlot(): [number, number] | null {
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        const key = `${x},${y}`;
        if (tilledSet.has(key) && !occupiedSet.has(key)) return [x, y];
      }
    }
    return null;
  }

  function findNextUntilledPlot(): [number, number] | null {
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        if (!tilledSet.has(`${x},${y}`)) return [x, y];
      }
    }
    return null;
  }

  async function handlePlant(seedTypeId: string) {
    if (!userId) return;
    const spot = findNextOpenTilledPlot();
    if (!spot) {
      alert("No open, tilled plot available — till more soil with the hoe first.");
      return;
    }
    const [x, y] = spot;
    await plantItem({ user_id: userId, seed_type_id: seedTypeId, plot_x: x, plot_y: y });
    refresh(userId);
  }

  async function handleTill() {
    if (!userId) return;
    const spot = findNextUntilledPlot();
    if (!spot) {
      alert("The whole garden is already tilled!");
      return;
    }
    const [x, y] = spot;
    await useHoe({ user_id: userId, plot_x: x, plot_y: y });
    refresh(userId);
  }

  async function handleWater(itemId: string) {
    await waterPlant(itemId);
    if (userId) refresh(userId);
  }

  const seedInventory = inventory.filter((i) => i.seed_type_id && i.durability_remaining == null);

  return (
    <main className="page" style={{ maxWidth: 640 }}>
      <Link href="/" className="back-link">
        ← Back to menu
      </Link>
      <h1>Your Garden</h1>

      <div className="card">
        <GameCanvas />
      </div>

      <h2>Tools</h2>
      <div className="card row">
        <span className="muted">
          Hoe:{" "}
          {hoeItem
            ? `${hoeItem.durability_remaining} uses left`
            : "none yet — focus to earn one"}
        </span>
        <button
          className="btn btn-secondary"
          onClick={handleTill}
          disabled={!hoeItem || (hoeItem.durability_remaining ?? 0) <= 0}
        >
          Till next untilled plot
        </button>
      </div>

      <h2>Inventory</h2>
      {seedInventory.length === 0 && <p className="muted">Nothing yet — focus for something first.</p>}
      {seedInventory.map((item) => (
        <div key={item.id} className="card row">
          <span>
            {seedTypeName(item.seed_type_id)} × {item.quantity}
          </span>
          <button className="btn btn-secondary" onClick={() => handlePlant(item.seed_type_id as string)}>
            Plant in next open plot
          </button>
        </div>
      ))}

      <h2>Planted</h2>
      {planted.length === 0 && <p className="muted">Nothing planted yet.</p>}
      {planted.map((p) => (
        <div key={p.id} className="card row">
          <span>
            {seedTypeName(p.seed_type_id)} at ({p.plot_x}, {p.plot_y}) — {p.stage} —{" "}
            {p.watered_at ? "watered" : "not watered yet"}
          </span>
          <button className="btn btn-secondary" onClick={() => handleWater(p.id)}>
            Water
          </button>
        </div>
      ))}
    </main>
  );
}
