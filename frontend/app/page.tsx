import Link from "next/link";

/**
 * Main menu. Garden is intentionally NOT gated behind the 1-hour
 * achievement yet - that check belongs to the achievements system
 * (still to build). Achievements/Shop/Settings are placeholders for now.
 */
export default function Home() {
  return (
    <main className="menu">
      <h1>🌱 Grow a World</h1>
      <Link href="/focus">
        <button className="btn">Start Focus</button>
      </Link>
      <Link href="/garden">
        <button className="btn btn-secondary">Garden</button>
      </Link>
      <button className="btn btn-secondary" disabled>
        Achievements
      </button>
      <button className="btn btn-secondary" disabled>
        Shop
      </button>
      <button className="btn btn-secondary" disabled>
        Settings
      </button>
    </main>
  );
}
