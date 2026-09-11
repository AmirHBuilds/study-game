"use client";

import { useEffect, useRef } from "react";

/**
 * Mounts a Phaser game instance inside a React-owned container.
 * React never re-renders into this canvas - communication with
 * the rest of the app happens over an event bus (see lib/gameEvents.ts,
 * to be added), never through React state/props changes.
 */
export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let game: import("phaser").Game | undefined;

    (async () => {
      const Phaser = (await import("phaser")).default;

      class GardenScene extends Phaser.Scene {
        constructor() {
          super("GardenScene");
        }

        create() {
          // Placeholder 9x9 soil grid, drawn as plain rectangles until
          // real tile art exists. Swap for a tilemap/sprite atlas later -
          // nothing else in the scene needs to change to do that.
          const tileSize = 48;
          const gridSize = 9;
          const offsetX = 40;
          const offsetY = 40;

          for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
              this.add
                .rectangle(
                  offsetX + x * tileSize,
                  offsetY + y * tileSize,
                  tileSize - 3,
                  tileSize - 3,
                  0xc9a678
                )
                .setOrigin(0, 0)
                .setStrokeStyle(1, 0xa9865e, 0.4);
            }
          }
        }
      }

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current ?? undefined,
        width: 9 * 48 + 80,
        height: 9 * 48 + 80,
        backgroundColor: "#eef7ec",
        scene: [GardenScene],
      });
    })();

    return () => {
      game?.destroy(true);
    };
  }, []);

  return <div ref={containerRef} />;
}
