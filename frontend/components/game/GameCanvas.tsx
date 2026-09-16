"use client";

import { useEffect, useRef } from "react";

export interface GardenPlot { x: number; y: number; tilled: boolean }
export type PlantStage = "seed" | "sprout" | "bud" | "bloom";
export interface GardenPlant {
  id: string;
  seedTypeId: string;
  x: number;
  y: number;
  stage: PlantStage;
  wateredAt: string | null;
}
export interface TraySeed { seedTypeId: string; name: string; quantity: number }

type Action = { type: "seed"; seedTypeId: string } | { type: "water" } | { type: "hoe" } | { type: "shovel" };

interface Props {
  gridSize?: number;
  plots: GardenPlot[];
  plants: GardenPlant[];
  seeds: TraySeed[];
  hoeUses: number;
  onPlant: (seedTypeId: string, x: number, y: number) => Promise<void>;
  onTill: (x: number, y: number) => Promise<void>;
  onWater: (plantId: string) => Promise<void>;
  onDigUp: (plantId: string) => Promise<void>;
  onMessage?: (message: string, tone?: "good" | "soft") => void;
}

const W = 760;
const H = 660;
const TILE = 132;
const GRID_X = 182;
const GRID_Y = 220;
// How far each tile is oversized/overlapped into its neighbors to hide
// the gaps between their hand-painted, irregular torn-paper edges.
const TILE_OVERLAP = 10;

export default function GameCanvas(props: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const latest = useRef(props);
  latest.current = props;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const Phaser = (await import("phaser")).default;
      if (cancelled || !containerRef.current) return;

      class GardenScene extends Phaser.Scene {
        worldLayer!: Phaser.GameObjects.Container;
        trayLayer!: Phaser.GameObjects.Container;
        tiles: any[] = [];
        selected: Action | null = null;
        busy = false;
        // The icon currently mid-drag, if any. Tracked at the scene level
        // so ANY "the drag is over" signal - not just that icon's own
        // dragend - can find it and snap it home. This is what was
        // missing before: gameout/pointerup reset the tile highlights
        // but never the icon itself, so it stayed enlarged and stranded
        // whenever a drag ended any way other than a clean drop.
        activeIcon: any = null;

        constructor() { super("GardenScene"); }

        preload() {
          for (let i = 0; i < 6; i++) this.load.image(`daisy-${i}`, `/assets-v2/daisy-${i}.png`);
          for (let i = 0; i < 4; i++) this.load.image(`soil-${i}`, `/assets-v2/soil-${i}.png`);
          this.load.spritesheet("grass", "/assets-v2/grass-sheet.png", { frameWidth: 120, frameHeight: 146 });
          this.load.image("packet", "/assets-v2/daisy-packet.png");
          this.load.image("hoe", "/assets-v2/hoe.png");
          this.load.image("water", "/assets-v2/watering-can.png");
          this.load.image("shovel", "/assets-v2/shovel.png");
          this.load.image("sprout", "/assets/sprout.png");
          this.load.image("seed", "/assets-v2/golden-seed.png");
        }

        create() {
          // A click must never count as a drag.
          this.input.dragDistanceThreshold = 10;
          console.log("[GardenScene] build: cozy-grass-instant-plant-v4");
          this.drawBackdrop();
          this.anims.create({
            key: "daisy-breeze",
            frames: Array.from({ length: 6 }, (_, i) => ({ key: `daisy-${i}` })),
            frameRate: 1.6,
            repeat: -1,
            repeatDelay: 2400,
            yoyo: true,
          });
          this.anims.create({
            key: "grass-sway",
            frames: this.anims.generateFrameNumbers("grass", { start: 0, end: 21 }),
            frameRate: 10,
            repeat: -1,
            yoyo: true,
          });
          this.worldLayer = this.add.container(0, 0);
          this.trayLayer = this.add.container(0, 0);
          sceneRef.current = this;
          this.redraw(latest.current);
          // These are only SAFETY NETS for drags that end without dragend
          // ever firing. They must never run synchronously on pointerup:
          // Phaser fires pointerup BEFORE dragend, so resetting here
          // immediately would snap the icon home and destroy the drop
          // position before dragend could read it - which silently broke
          // planting entirely. Deferred, so a real dragend wins the race.
          this.input.on("pointerup", () => this.scheduleDragSafetyCheck());
          this.input.on("gameout", () => this.scheduleDragSafetyCheck());
          // Stale-tint self-heal: if the scene thinks something is
          // selected while the pointer isn't pressed AND no drag is in
          // flight, that state is stale - clear the highlight only.
          this.input.on("pointermove", (pointer: any) => {
            if (this.selected && !pointer.isDown && !this.activeIcon) this.clearReadyState();
          });
        }

        /** Runs after the current input step, so a genuine dragend (which
         * clears activeIcon itself) has already had its chance. Only if
         * an icon is STILL mid-drag do we treat it as stranded. */
        scheduleDragSafetyCheck() {
          this.time.delayedCall(60, () => {
            if (this.activeIcon) this.resetActiveDrag();
          });
        }

        /** The one place a drag is ever "let go of" - whether by a clean
         * drop, releasing outside the canvas, or the tab losing focus.
         * Always restores the icon's own position/scale, not just the
         * tile highlights. */
        resetActiveDrag() {
          const icon = this.activeIcon;
          if (icon) {
            const home = icon.getData("home");
            icon.setData("dragging", false);
            if (home) {
              this.tweens.add({
                targets: icon,
                x: home.x,
                y: home.y,
                scaleX: home.scaleX,
                scaleY: home.scaleY,
                duration: 160,
                ease: "Back.out",
                onComplete: () => icon.setDepth(24),
              });
            }
            this.activeIcon = null;
          }
          this.clearReadyState();
        }

        drawBackdrop() {
          this.add.rectangle(W / 2, H / 2, W, H, 0xdff1d7);
          this.add.circle(660, 74, 46, 0xffe59a, 0.72);
          for (let i = 0; i < 3; i++) {
            const cloud = this.add.ellipse(100 + i * 280, 155 + (i % 2) * 22, 125, 34, 0xffffff, 0.55);
            this.tweens.add({ targets: cloud, x: cloud.x + 28, duration: 8500 + i * 1400, yoyo: true, repeat: -1, ease: "Sine.inOut" });
          }
          this.add.ellipse(W / 2, 620, 900, 250, 0x95c77c, 1);
          this.drawGrass();
          this.add.text(34, 178, "CANDY'S GARDEN", { fontFamily: "Arial", fontSize: "15px", fontStyle: "bold", color: "#43613c", letterSpacing: 2 });
        }

        /** Scattered grass tufts along the meadow. Every tuft gets its own
         * start frame, animation speed, scale and facing, so a field of
         * them never sways in creepy unison - the single cheapest trick
         * for making repeated sprites read as a living field. */
        drawGrass() {
          const spots: Array<[number, number, number]> = [
            [60, 592, 0.52], [148, 618, 0.62], [246, 600, 0.46],
            [338, 626, 0.58], [470, 622, 0.54], [566, 600, 0.48],
            [654, 620, 0.62], [726, 596, 0.5], [24, 548, 0.4],
            [400, 648, 0.44], [520, 650, 0.42], [700, 652, 0.46],
          ];
          spots.forEach(([x, y, scale], i) => {
            const tuft = this.add
              .sprite(x, y, "grass")
              .setOrigin(0.5, 1)
              .setScale(scale)
              .setDepth(1)
              .setAlpha(0.9);
            if (i % 2 === 0) tuft.setFlipX(true);
            tuft.setTint(i % 3 === 0 ? 0x86bf6b : i % 3 === 1 ? 0x9ad07d : 0x78b25f);
            tuft.play({ key: "grass-sway", startFrame: (i * 7) % 22 });
            // Per-tuft speed jitter so the loops drift apart over time
            // instead of re-syncing every cycle.
            tuft.anims.timeScale = 0.55 + ((i * 37) % 60) / 100;
          });
        }

        redraw(data: Props) {
          if (!this.worldLayer || !this.trayLayer) return;
          this.worldLayer.removeAll(true);
          this.trayLayer.removeAll(true);
          this.tiles = [];
          const tilled = new Set(data.plots.filter(p => p.tilled).map(p => `${p.x},${p.y}`));
          const plantAt = new Map(data.plants.map(p => [`${p.x},${p.y}`, p]));

          // A continuous soil bed guarantees there are no green seams between
          // the irregular hand-painted tile edges.
          const size = data.gridSize ?? 3;
          const bed = this.add.graphics();
          bed.fillStyle(0x9b653f, 1);
          bed.fillRoundedRect(
            GRID_X - TILE_OVERLAP / 2,
            GRID_Y - TILE_OVERLAP / 2,
            size * TILE + TILE_OVERLAP,
            size * TILE + TILE_OVERLAP,
            18
          );
          this.worldLayer.add(bed);

          for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
              const cx = GRID_X + x * TILE + TILE / 2;
              const cy = GRID_Y + y * TILE + TILE / 2;
              const isTilled = tilled.has(`${x},${y}`);
              const plant = plantAt.get(`${x},${y}`);
              const moisture = plant ? this.moistureLevel(plant.wateredAt) : 0;
              const tile = this.add.image(cx, cy, isTilled ? `soil-${moisture}` : "soil-0")
                .setDisplaySize(TILE + TILE_OVERLAP, TILE + TILE_OVERLAP)
                .setInteractive({ useHandCursor: true });
              if (!isTilled) tile.setTint(0x7eac69).setAlpha(0.8);
              this.worldLayer.add(tile);
              const plantSprite = plant ? this.drawPlant(plant, cx, cy) : null;
              this.tiles.push({ x, y, tile, isTilled, plant, plantSprite, plantScale: plantSprite?.scaleX ?? 1 });
            }
          }
          this.drawTray(data);
          this.refreshHighlights();
        }

        drawPlant(plant: GardenPlant, cx: number, cy: number) {
          const key = plant.stage === "seed" ? "seed" : plant.stage === "bloom" ? "daisy-0" : "sprout";
          const scale = plant.stage === "seed" ? 0.25 : plant.stage === "sprout" ? 0.28 : plant.stage === "bud" ? 0.38 : 0.44;
          const img = this.add.sprite(cx, cy + 48, key).setScale(scale).setDepth(5).setOrigin(0.5, 1);
          this.worldLayer.add(img);
          if (plant.stage === "bloom") {
            img.play({ key: "daisy-breeze", startFrame: (plant.x + plant.y) % 6, delay: (plant.x * 170 + plant.y * 110) });
          }
          if (this.moistureLevel(plant.wateredAt) > 0) {
            const drop = this.add.text(cx + 36, cy - 50, "◆", { fontSize: "14px", color: "#8bd4eb" }).setAlpha(0.85);
            this.worldLayer.add(drop);
          }
          return img;
        }

        moistureLevel(wateredAt: string | null) {
          if (!wateredAt) return 0;
          const minutes = (Date.now() - new Date(wateredAt).getTime()) / 60000;
          if (minutes < 10) return 3;
          if (minutes < 45) return 2;
          if (minutes < 180) return 1;
          return 0;
        }

        drawTray(data: Props) {
          const panel = this.add.graphics();
          panel.fillStyle(0x4f3829, 0.96); panel.fillRoundedRect(22, 20, 716, 132, 20);
          panel.lineStyle(3, 0x76533a, 1); panel.strokeRoundedRect(22, 20, 716, 132, 20);
          this.trayLayer.add(panel);
          this.trayLayer.add(this.add.text(42, 32, "DRAG AN ITEM TO THE GARDEN", { fontFamily: "Arial", fontSize: "13px", fontStyle: "bold", color: "#f8e9c8" }));

          const cards: Array<{ action: Action; label: string; count: string; texture: string; enabled: boolean }> = [];
          data.seeds.forEach(s => cards.push({ action: { type: "seed", seedTypeId: s.seedTypeId }, label: s.name, count: `×${s.quantity}`, texture: "packet", enabled: s.quantity > 0 }));
          cards.push({ action: { type: "water" }, label: "Water", count: "FREE", texture: "water", enabled: data.plants.length > 0 });
          cards.push({ action: { type: "hoe" }, label: "Hoe", count: `${data.hoeUses} uses`, texture: "hoe", enabled: data.hoeUses > 0 });
          cards.push({ action: { type: "shovel" }, label: "Move", count: "DEBUG", texture: "shovel", enabled: data.plants.length > 0 });

          cards.slice(0, 5).forEach((c, i) => this.makeCard(45 + i * 138, 55, c));
        }

        makeCard(x: number, y: number, card: { action: Action; label: string; count: string; texture: string; enabled: boolean }) {
          const base = this.add.rectangle(0, 0, 122, 78, card.enabled ? 0xfff5d8 : 0x9a8d7e).setStrokeStyle(3, 0xc99d57, 1);
          const icon = this.add.image(-31, -2, card.texture).setDisplaySize(66, 66);
          const label = this.add.text(7, -21, card.label, { fontFamily: "Arial", fontSize: "14px", fontStyle: "bold", color: "#493426" });
          const count = this.add.text(7, 5, card.count, { fontFamily: "Arial", fontSize: "12px", color: card.enabled ? "#6b5a44" : "#6b625a" });
          const c = this.add.container(x + 61, y + 39, [base, label, count]).setSize(122, 78).setDepth(20);
          this.trayLayer.add(c);
          icon.setPosition(x + 30, y + 39).setDepth(24);
          this.trayLayer.add(icon);
          if (!card.enabled) { c.setAlpha(0.55); icon.setAlpha(0.45); return; }
          icon.setInteractive({ useHandCursor: true }); this.input.setDraggable(icon);
          const home = { x: icon.x, y: icon.y, scaleX: icon.scaleX, scaleY: icon.scaleY };
          // Stored on the icon itself (not a closure variable) so the
          // scene-level resetActiveDrag() safety nets can read/clear it
          // for whichever icon is currently active, from anywhere.
          icon.setData("home", home);
          icon.setData("dragging", false);

          icon.on("dragstart", () => {
            icon.setData("dragging", false);
            icon.setDepth(100);
          });
          icon.on("drag", (_p: any, dragX: number, dragY: number) => {
            if (!icon.getData("dragging") && Math.hypot(dragX - home.x, dragY - home.y) >= 10) {
              icon.setData("dragging", true);
              this.activeIcon = icon;
              this.selected = card.action;
              this.refreshHighlights();
              this.tweens.add({ targets: icon, scaleX: home.scaleX * 1.12, scaleY: home.scaleY * 1.12, duration: 100 });
            }
            icon.x = dragX;
            icon.y = dragY;
            if (icon.getData("dragging")) this.highlightPointer(dragX, dragY);
          });
          icon.on("dragend", () => {
            const dragging = icon.getData("dragging");
            const target = this.tileFromPoint(icon.x, icon.y);
            const canUse = dragging && target && this.valid(card.action, target);
            this.activeIcon = null;
            icon.setData("dragging", false);
            this.clearReadyState();
            if (canUse) {
              // Land the action AT the tile, immediately - the icon
              // shrinks into the soil where it was dropped instead of
              // flying home first and only then showing a result. The
              // server round-trip still happens underneath, but the
              // player sees the plant take straight away.
              this.showOptimisticPlant(card.action, target);
              this.tweens.add({
                targets: icon, x: target.tile.x, y: target.tile.y,
                scaleX: home.scaleX * 0.25, scaleY: home.scaleY * 0.25, alpha: 0,
                duration: 160, ease: "Quad.in",
                onComplete: () => {
                  icon.setPosition(home.x, home.y).setScale(home.scaleX, home.scaleY).setAlpha(1).setDepth(24);
                },
              });
              this.perform(card.action, target.x, target.y);
              return;
            }
            this.tweens.add({ targets: icon, x: home.x, y: home.y, scaleX: home.scaleX, scaleY: home.scaleY, duration: 220, ease: "Back.out", onComplete: () => icon.setDepth(24) });
          });
          // Covers releasing the pointer outside THIS icon's hit area.
          // Deferred for the same reason as the scene-level handlers:
          // a real dragend must get to run first.
          icon.on("pointerupoutside", () => {
            if (icon.getData("dragging")) this.scheduleDragSafetyCheck();
          });
        }

        clearReadyState() {
          this.selected = null;
          // NOTE: never call setScale() on a tile. Tiles are sized with
          // setDisplaySize(), which works by setting an internal scale
          // factor - so setScale(1) doesn't mean "normal size", it means
          // "render at the PNG's full native size", which made every tile
          // jump larger and stay that way until the next full redraw.
          // Ready feedback is tint-only; tile geometry never changes.
          this.tiles.forEach(t => { if (t.plantSprite) t.plantSprite.setScale(t.plantScale); });
          this.refreshHighlights();
        }
        cancelSelection() {
          this.clearReadyState();
          latest.current.onMessage?.("Nothing changed. Choose another item whenever you’re ready.", "soft");
        }
        tileFromPoint(px: number, py: number) { return this.tiles.find(t => Math.abs(px - t.tile.x) < TILE / 2 && Math.abs(py - t.tile.y) < TILE / 2); }
        valid(action: Action, t: any) { return action.type === "seed" ? t.isTilled && !t.plant : action.type === "water" || action.type === "shovel" ? !!t.plant : !t.isTilled; }
        refreshHighlights() { this.tiles.forEach(t => { if (this.selected && this.valid(this.selected, t)) t.tile.setTint(0xffe49a); else if (t.isTilled) t.tile.clearTint(); else t.tile.setTint(0x7eac69); }); }
        highlightPointer(px: number, py: number) {
          const target = this.tileFromPoint(px, py);
          this.tiles.forEach(t => {
            const ready = t === target && this.selected && this.valid(this.selected, t);
            // Ready feedback is color-only - see the note in clearReadyState
            // about why tiles must never be rescaled.
            if (t.plantSprite) t.plantSprite.setScale(t.plantScale);
            if (ready) t.tile.setTint(0xffd978);
            else if (this.selected && this.valid(this.selected, t)) t.tile.setTint(0xffe49a);
            else if (t.isTilled) t.tile.clearTint();
            else t.tile.setTint(0x7eac69);
          });
        }

        /** Draws the result of an action instantly, before the server has
         * confirmed it. The next redraw() replaces this with real state;
         * if the call fails, redraw() simply won't include it. */
        showOptimisticPlant(action: Action, t: any) {
          const burst = this.add
            .particles(t.tile.x, t.tile.y, "seed", { speed: { min: 35, max: 95 }, scale: { start: 0.06, end: 0 }, lifespan: 520, quantity: 8, emitting: false })
            .setDepth(50);
          burst.explode(10);
          this.time.delayedCall(650, () => burst.destroy());

          if (action.type !== "seed" || t.plant) return;
          const ghost = this.add
            .sprite(t.tile.x, t.tile.y + 48, "seed")
            .setScale(0.05)
            .setDepth(5)
            .setOrigin(0.5, 1);
          this.worldLayer.add(ghost);
          this.tweens.add({ targets: ghost, scaleX: 0.25, scaleY: 0.25, duration: 220, ease: "Back.out" });
        }

        async perform(action: Action, x: number, y: number) {
          if (this.busy) return;
          const t = this.tiles.find(q => q.x === x && q.y === y);
          if (!t || !this.valid(action, t)) { this.cancelSelection(); return; }
          this.busy = true;
          try {
            if (action.type === "seed") await latest.current.onPlant(action.seedTypeId, x, y);
            else if (action.type === "water" && t.plant) await latest.current.onWater(t.plant.id);
            else if (action.type === "shovel" && t.plant) await latest.current.onDigUp(t.plant.id);
            else await latest.current.onTill(x, y);
            latest.current.onMessage?.(action.type === "seed" ? "Planted! Your little seed is settling in." : action.type === "water" ? "Freshly watered — watch the soil deepen." : action.type === "shovel" ? "Safely returned to your seed shelf." : "A new patch is ready.", "good");
            this.selected = null;
          } catch { this.cancelSelection(); latest.current.onMessage?.("Nothing changed. Please try again when you’re ready.", "soft"); }
          finally { this.busy = false; this.refreshHighlights(); }
        }
      }

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: W,
        height: H,
        backgroundColor: "#dff1d7",
        transparent: false,
        scene: [GardenScene],
        // capture:false stops Phaser calling preventDefault on touch, so a
        // vertical swipe that starts on the canvas still scrolls the page
        // instead of being swallowed by the game. Paired with
        // `touch-action: pan-y` on the canvas in CSS.
        input: { touch: { capture: false } },
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      });
      if (cancelled) { game.destroy(true); return; }
      gameRef.current = game;
    })();
    return () => { cancelled = true; gameRef.current?.destroy(true); gameRef.current = null; sceneRef.current = null; };
  }, []);

  useEffect(() => { sceneRef.current?.redraw(props); }, [props.gridSize, props.plots, props.plants, props.seeds, props.hoeUses]);

  // Safety net for drag-ends Phaser's own canvas listeners can miss
  // entirely: releasing over browser chrome, switching tabs, alt-tabbing.
  // Deferred (scheduleDragSafetyCheck) so it never pre-empts a real drop.
  useEffect(() => {
    const forceReset = () => sceneRef.current?.scheduleDragSafetyCheck?.();
    window.addEventListener("pointerup", forceReset);
    window.addEventListener("mouseup", forceReset);
    window.addEventListener("touchend", forceReset);
    window.addEventListener("blur", forceReset);
    document.addEventListener("visibilitychange", forceReset);
    return () => {
      window.removeEventListener("pointerup", forceReset);
      window.removeEventListener("mouseup", forceReset);
      window.removeEventListener("touchend", forceReset);
      window.removeEventListener("blur", forceReset);
      document.removeEventListener("visibilitychange", forceReset);
    };
  }, []);

  return <div className="game-shell" ref={containerRef} aria-label="Interactive garden. Drag or tap items, then choose a tile." />;
}
