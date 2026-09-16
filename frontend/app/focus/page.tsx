"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  completeSession,
  getMe,
  listSeedTypes,
  markAway,
  markBack,
  startSession,
} from "@/lib/api";

interface SeedType {
  id: string;
  display_name: string;
  category: string;
  earn_cost_minutes: number;
  unlock_cost_minutes: number;
}

interface SessionInfo {
  id: string;
  started_at: string;
  away_accumulated_seconds: number;
}

type Stage = "select" | "confirm" | "active" | "result";

export default function FocusPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [seedTypes, setSeedTypes] = useState<SeedType[]>([]);
  const [stage, setStage] = useState<Stage>("select");
  const [chosen, setChosen] = useState<SeedType | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [away, setAway] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const finishingRef = useRef(false);

  useEffect(() => {
    getMe().then((u) => setUserId(u.id));
    listSeedTypes().then((types: SeedType[]) =>
      setSeedTypes(types.filter((t) => t.category === "seed" && t.unlock_cost_minutes === 0))
    );
  }, []);

  useEffect(() => {
    if (stage !== "active" || away || !session) return;

    const tick = () => {
      const startedAtMs = new Date(session.started_at).getTime();
      const plannedMs = (chosen?.earn_cost_minutes ?? 0) * 60 * 1000;
      const awayMs = session.away_accumulated_seconds * 1000;

      // Same formula the backend uses: real elapsed time minus whatever
      // was spent marked "away", so pausing never eats into the countdown.
      const effectiveElapsedMs = Date.now() - startedAtMs - awayMs;
      const remaining = Math.max(0, plannedMs - effectiveElapsedMs);
      setRemainingSeconds(Math.ceil(remaining / 1000));

      if (remaining <= 0 && !finishingRef.current) {
        finishingRef.current = true;
        finish();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, away, session]);

  async function begin() {
    if (!userId || !chosen) return;
    const created = await startSession({
      user_id: userId,
      goal_type: "earn",
      goal_seed_type_id: chosen.id,
      planned_duration_minutes: chosen.earn_cost_minutes,
    });
    setSession(created);
    setStage("active");
  }

  async function toggleAway() {
    if (!session) return;
    if (away) {
      const updated = await markBack(session.id);
      setSession(updated); // picks up the fresh away_accumulated_seconds
      setAway(false);
    } else {
      const updated = await markAway(session.id);
      setSession(updated);
      setAway(true);
    }
  }

  async function finish() {
    if (!session) return;
    const res = await completeSession(session.id);
    setResult({
      success: res.success,
      message: res.success
        ? `${chosen?.display_name} added to your inventory.`
        : "That one didn't quite grow this time — no worries, try again anytime.",
    });
    setStage("result");
  }

  function reset() {
    setStage("select");
    setChosen(null);
    setSession(null);
    setResult(null);
    setAway(false);
    finishingRef.current = false;
  }

  return (
    <main className="page">
      <Link href="/" className="back-link">
        ← Back to menu
      </Link>

      {stage === "select" && (
        <section className="focus-panel">
          <p className="kicker">THE NURSERY</p>
          <h1>What would feel lovely to grow?</h1>
          <p className="focus-intro">Choose one small intention. There is no perfect session—only time you set aside for yourself.</p>
          {seedTypes.length === 0 && <p className="muted">Loading...</p>}
          <div className="reward-grid">
          {seedTypes.map((seed) => (
            <button
              key={seed.id}
              className="reward-card"
              onClick={() => {
                setChosen(seed);
                setStage("confirm");
              }}
            >
              <img src={seed.display_name === "Daisy" ? "/assets-v2/daisy-packet.png" : "/assets-v2/hoe.png"} alt="" />
              <span><strong>{seed.display_name}</strong><small>{seed.earn_cost_minutes} min gentle focus</small></span>
              <b>Choose</b>
            </button>
          ))}
          </div>
          <p className="reassurance"><span>♡</span> Tired today? It’s okay to visit your garden without starting a session.</p>
        </section>
      )}

      {stage === "confirm" && chosen && (
        <div className="card focus-confirm">
          <img className="confirm-art" src={chosen.display_name === "Daisy" ? "/assets-v2/daisy-packet.png" : "/assets-v2/hoe.png"} alt="" />
          <h1>{chosen.display_name} selected</h1>
          <p className="muted">
            {chosen.earn_cost_minutes} minute{chosen.earn_cost_minutes === 1 ? "" : "s"} of
            focus, and it&apos;s yours.
          </p>
          <button className="btn" onClick={begin}>
            Begin
          </button>{" "}
          <button className="btn btn-secondary" onClick={reset}>
            Choose something else
          </button>
        </div>
      )}

      {stage === "active" && chosen && (
        <div className="card active-focus" style={{ textAlign: "center" }}>
          <div className="nursery-orb"><img src={chosen.display_name === "Daisy" ? "/assets-v2/daisy-packet.png" : "/assets-v2/hoe.png"} alt="Your chosen reward waiting in the nursery" /></div>
          <h1>Focusing on {chosen.display_name}</h1>
          <p className="timer">
            {Math.floor(remainingSeconds / 60)}:
            {String(remainingSeconds % 60).padStart(2, "0")}
          </p>
          {away && (
            <p className="muted">Studying elsewhere — your sprout is waiting, unanimated.</p>
          )}
          <button className="btn btn-secondary" onClick={toggleAway}>
            {away ? "I'm back" : "I'm studying in another app"}
          </button>
        </div>
      )}

      {stage === "result" && result && (
        <div className="card focus-result" style={{ textAlign: "center" }}>
          <h1>{result.success ? "✨ Earned!" : "Not this time"}</h1>
          <p className="muted">{result.message}</p>
          <button className="btn" onClick={reset}>
            Grow something else
          </button>{" "}
          {result.success && <Link href="/garden">Go to garden →</Link>}
        </div>
      )}
    </main>
  );
}
