import { useCallback, useState } from "react";
import CatalogSlot from "./CatalogSlot.jsx";
import Cart from "./Cart.jsx";
import Bench from "./Bench.jsx";
import FlowSteps from "./FlowSteps.jsx";

const INITIAL_STEPS = { catalog: false, preview: false, http: false, grpc: false };

export default function App() {
  const [tab, setTab] = useState("loja");
  const [steps, setSteps] = useState(INITIAL_STEPS);
  const mark = useCallback((key) => setSteps((s) => (s[key] ? s : { ...s, [key]: true })), []);
  const onCatalogLoaded = useCallback(() => mark("catalog"), [mark]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden="true">◆</span>
          <div>
            <h1>PolyStack Lab</h1>
            <p>Pedidos e precificação · Tema 8</p>
          </div>
        </div>
        <span className="badge react">Host · React 19 · porta 3001</span>
        <nav className="tabs" aria-label="Seções">
          <button className={tab === "loja" ? "active" : ""} onClick={() => setTab("loja")}>
            Loja
          </button>
          <button className={tab === "bench" ? "active" : ""} onClick={() => setTab("bench")}>
            Benchmark JS × WASM
          </button>
        </nav>
      </header>

      {tab === "loja" ? (
        <>
          <FlowSteps steps={steps} onReset={() => setSteps(INITIAL_STEPS)} />
          <main className="shop">
            <CatalogSlot onLoaded={onCatalogLoaded} />
            <Cart mark={mark} />
          </main>
        </>
      ) : (
        <Bench />
      )}
    </div>
  );
}
