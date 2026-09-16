"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import GameCanvas, { GardenPlant, GardenPlot, TraySeed } from "@/components/game/GameCanvas";
import { digUpPlant, getMe, listInventory, listPlantedItems, listPlots, listSeedTypes, plantItem, useHoe, waterPlant } from "@/lib/api";

const GRID_SIZE = 3;
interface SeedType { id: string; key: string; display_name: string; category: string }
interface InventoryItem { id: string; seed_type_id: string | null; quantity: number; durability_remaining: number | null }
interface PlantedItem { id: string; seed_type_id: string; plot_x: number; plot_y: number; stage: "seed" | "sprout" | "bud" | "bloom"; watered_at: string | null }
interface Plot { plot_x: number; plot_y: number; tilled: boolean }

export default function GardenPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [seedTypes, setSeedTypes] = useState<SeedType[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [planted, setPlanted] = useState<PlantedItem[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [message, setMessage] = useState("Drag a seed packet onto an open patch — or tap it, then tap the soil.");
  const [tone, setTone] = useState<"good" | "soft">("soft");

  async function refresh(uid: string) {
    const [inv, plants, gardenPlots] = await Promise.all([listInventory(uid), listPlantedItems(uid), listPlots(uid)]);
    setInventory(inv); setPlanted(plants); setPlots(gardenPlots);
  }
  useEffect(() => {
    getMe().then(u => { setUserId(u.id); refresh(u.id); });
    listSeedTypes().then(setSeedTypes);
  }, []);

  // Moisture changes visually over real time, even without another action.
  useEffect(() => {
    if (!userId) return;
    const timer = window.setInterval(() => refresh(userId), 60_000);
    return () => window.clearInterval(timer);
  }, [userId]);

  const nameOf = (id: string | null) => seedTypes.find(s => s.id === id)?.display_name ?? "Seed";
  const typeOf = (id: string | null) => seedTypes.find(s => s.id === id);
  const hoeType = seedTypes.find(s => s.key === "hoe");
  const hoeItem = inventory.find(i => i.seed_type_id === hoeType?.id);
  const canvasPlots: GardenPlot[] = useMemo(() => plots.map(p => ({ x: p.plot_x, y: p.plot_y, tilled: p.tilled })), [plots]);
  const canvasPlants: GardenPlant[] = useMemo(() => planted.map(p => ({ id: p.id, seedTypeId: p.seed_type_id, x: p.plot_x, y: p.plot_y, stage: p.stage, wateredAt: p.watered_at })), [planted]);
  const traySeeds: TraySeed[] = useMemo(() => inventory.filter(i => i.seed_type_id && i.durability_remaining == null && typeOf(i.seed_type_id)?.category === "seed").map(i => ({ seedTypeId: i.seed_type_id as string, name: nameOf(i.seed_type_id), quantity: i.quantity })), [inventory, seedTypes]);

  async function act(action: () => Promise<unknown>) { await action(); if (userId) await refresh(userId); }
  const notify = (text: string, nextTone: "good" | "soft" = "soft") => { setMessage(text); setTone(nextTone); };

  return (
    <main className="garden-page">
      <header className="garden-header">
        <div>
          <Link href="/" className="back-link">← Home meadow</Link>
          <h1>Candy’s Garden</h1>
          <p>Choose a little corner and make it yours.</p>
        </div>
        <Link href="/focus" className="focus-link">Grow something new <span>→</span></Link>
      </header>

      <section className="garden-stage">
        <GameCanvas
          gridSize={GRID_SIZE}
          plots={canvasPlots}
          plants={canvasPlants}
          seeds={traySeeds}
          hoeUses={hoeItem?.durability_remaining ?? 0}
          onPlant={(seedTypeId, x, y) => act(() => plantItem({ user_id: userId as string, seed_type_id: seedTypeId, plot_x: x, plot_y: y }))}
          onTill={(x, y) => act(() => useHoe({ user_id: userId as string, plot_x: x, plot_y: y }))}
          onWater={id => act(() => waterPlant(id))}
          onDigUp={id => act(() => digUpPlant(id))}
          onMessage={notify}
        />
      </section>

      <section className={`garden-message ${tone}`} aria-live="polite">
        <span className="message-spark">✦</span><span>{message}</span>
      </section>

      <section className="garden-summary">
        <div><strong>{planted.length}</strong><span>growing friends</span></div>
        <div><strong>{traySeeds.reduce((n, s) => n + s.quantity, 0)}</strong><span>seeds waiting</span></div>
        <div><strong>{planted.filter(p => p.stage === "bloom").length}</strong><span>in bloom</span></div>
      </section>

      {traySeeds.length === 0 && (
        <section className="empty-nursery">
          <img src="/assets/golden-seed.png" alt="A glowing seed" />
          <div><h2>Your seed shelf is empty</h2><p>Choose something lovely to grow during your next Focus.</p></div>
          <Link href="/focus">Visit the nursery</Link>
        </section>
      )}
    </main>
  );
}
