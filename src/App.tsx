import { useEffect, useState } from "react";
import { BareModel } from "./components/BareModel";
import { RecordedExamples } from "./components/RecordedExamples";
import { UnderTheHood } from "./components/UnderTheHood";
import { LivePanel } from "./components/LivePanel";
import { layers } from "./content/layers";
import { liveAvailable, useLive } from "./lib/live";

type Route = { page: "home" } | { page: "layer"; n: number } | { page: "hood" };

function routeFromHash(): Route {
  if (location.hash === "#/under-the-hood") return { page: "hood" };
  const n = Number(location.hash.match(/^#\/layer\/(\d+)$/)?.[1]);
  return layers.some((l) => l.n === n && l.available) ? { page: "layer", n } : { page: "home" };
}

export function App() {
  const [route, setRoute] = useState(routeFromHash);
  useEffect(() => {
    const onHash = () => {
      setRoute(routeFromHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const live = useLive();
  const current = route.page === "layer" ? route.n : 0;
  const info = layers.find((l) => l.n === current);
  const next = layers.find((l) => l.n === current + 1 && l.available);

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="site">
        <div className="site-top">
          <a href="#/" className="brand">Turing Test Kitchen</a>
          {liveAvailable && (
            <button
              className="live-toggle"
              aria-expanded={live.panelOpen}
              onClick={() => live.setPanelOpen(!live.panelOpen)}
            >
              <span className={`dot ${live.chatReady ? "dot-on" : ""}`} aria-hidden="true" />
              Live model{live.chatReady ? "" : ": off"}
            </button>
          )}
        </div>
        <nav aria-label="Layers">
          <ol className="layer-nav">
            {layers.map((l) => (
              <li key={l.n}>
                {l.available ? (
                  <a href={`#/layer/${l.n}`} aria-current={l.n === current ? "page" : undefined}>
                    <span className="num">{l.n}</span> {l.title}
                  </a>
                ) : (
                  <span className="soon" title="Coming later">
                    <span className="num">{l.n}</span> {l.title}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </header>
      {liveAvailable && live.panelOpen && <LivePanel />}

      <main id="main">
        {route.page === "hood" ? (
          <>
            <p className="eyebrow">Aside</p>
            <h1>Under the hood</h1>
            <p className="aha">There's always a step between your message and the model that you don't see.</p>
            <UnderTheHood />
            <footer className="pager">
              <a href="#/layer/1">← Back to layer 1</a>
            </footer>
          </>
        ) : !info ? (
          <Home />
        ) : (
          <>
            <p className="eyebrow">Layer {info.n} of {layers.length}</p>
            <h1>{info.title}</h1>
            <p className="aha">{info.aha}</p>
            {info.intro.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {info.n === 1 && (
              <>
                <BareModel />
                <RecordedExamples section="bare" />
                <p className="aside-link">
                  What happens between your message and the model? <a href="#/under-the-hood">Under the hood →</a>
                </p>
              </>
            )}
            {info.n === 2 && <RecordedExamples section="memory" />}
            <footer className="pager">
              {next ? <a href={`#/layer/${next.n}`}>Next: {next.title} →</a> : <p className="muted">More layers are on the way.</p>}
            </footer>
          </>
        )}
      </main>
    </>
  );
}

function Home() {
  return (
    <>
      <h1>See how a chatbot is put together, one layer at a time.</h1>
      <p>
        A chatbot can feel like someone. This site starts with a powerful model given a single message and nothing
        else, then adds, one at a time, the pieces a chat app wraps around it, until the result reads like a person.
      </p>
      <p>
        At every step, the <strong>inspector</strong> shows exactly what text goes into the model and what comes
        out. Nothing is hidden.
      </p>
      <p className="note">
        Watching these steps shows that human-like text doesn't need an inner life behind it. It doesn't settle
        whether AI systems could ever matter morally. That is still an open question.
      </p>
      <a className="cta" href="#/layer/1">Start with layer 1 →</a>
    </>
  );
}
