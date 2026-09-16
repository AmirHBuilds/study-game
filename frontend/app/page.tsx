import Link from "next/link";

export default function Home() {
  return (
    <main className="simple-home">
      <div className="home-sky" aria-hidden="true">
        <span className="tiny-sun" />
        <img className="home-daisy left" src="/assets-v2/daisy-1.png" alt="" />
        <img className="home-daisy right" src="/assets-v2/daisy-4.png" alt="" />
      </div>

      <section className="simple-menu">
        <p className="kicker">GROW A WORLD</p>
        <h1>Welcome back, Candy.</h1>
        <p className="home-copy">What would feel good today?</p>

        <nav className="menu-actions" aria-label="Main menu">
          <Link href="/focus" className="menu-primary">
            <span>Focus and grow</span><b>→</b>
          </Link>
          <Link href="/garden" className="menu-secondary">
            <span>Visit your garden</span><b>→</b>
          </Link>
        </nav>

        <p className="quiet-note">No rush. Your garden will be here whenever you return.</p>
      </section>
    </main>
  );
}
