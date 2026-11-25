import { useEffect, useState } from "react";
import { wasmReady } from "./pricing/wasm.js";
import { brl, elapsed, ms } from "./format.js";

export default function Cart({ mark }) {
  const [lines, setLines] = useState([]);
  const [tampered, setTampered] = useState(false);
  const [preview, setPreview] = useState(null);
  const [official, setOfficial] = useState(null);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  // Contrato de eventos com o catálogo Vue.
  useEffect(() => {
    const onAdd = (e) => {
      const { sku, name, priceCents } = e.detail;
      setLines((ls) => {
        const found = ls.find((l) => l.sku === sku);
        if (found) return ls.map((l) => (l.sku === sku ? { ...l, quantity: l.quantity + 1 } : l));
        return [...ls, { sku, name, priceCents, quantity: 1 }];
      });
    };
    window.addEventListener("polystack:add-to-cart", onAdd);
    return () => window.removeEventListener("polystack:add-to-cart", onAdd);
  }, []);

  // Prévia instantânea em Rust/WASM: nenhuma requisição de rede.
  useEffect(() => {
    setOfficial(null);
    setError(null);
    let cancelled = false;
    wasmReady.then(({ quote_preview }) => {
      if (cancelled) return;
      const prices = Uint32Array.from(lines, (l) => (tampered ? Math.round(l.priceCents / 2) : l.priceCents));
      const quantities = Uint32Array.from(lines, (l) => l.quantity);
      const t0 = performance.now();
      const totalCents = quote_preview(prices, quantities);
      const elapsed = performance.now() - t0;
      setPreview({ totalCents, elapsed });
      if (lines.length > 0) mark("preview");
    });
    return () => {
      cancelled = true;
    };
  }, [lines, tampered, mark]);

  const setQuantity = (sku, quantity) =>
    setLines((ls) => ls.map((l) => (l.sku === sku ? { ...l, quantity: Math.max(1, Math.min(999, quantity || 1)) } : l)));
  const remove = (sku) => setLines((ls) => ls.filter((l) => l.sku !== sku));

  async function checkout() {
    setSending(true);
    setError(null);
    setOfficial(null);
    mark("http");
    const t0 = performance.now();
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Só SKU e quantidade importam para o servidor; a prévia vai junto para comparação.
        body: JSON.stringify({
          items: lines.map(({ sku, quantity }) => ({ sku, quantity })),
          previewCents: preview?.totalCents,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? res.statusText);
      setOfficial({ ...body, httpMs: performance.now() - t0 });
      mark("grpc");
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <aside className="panel cart">
      <div className="panel-head">
        <h2>Carrinho</h2>
        <span className="muted">{lines.length} item(ns)</span>
      </div>

      {lines.length === 0 ? (
        <p className="muted empty">Adicione produtos do catálogo ao lado.</p>
      ) : (
        <ul className="lines">
          {lines.map((l) => (
            <li key={l.sku}>
              <span className="line-name">
                {l.name}
                <small>{brl(l.priceCents)} cada</small>
              </span>
              <span className="qty">
                <button aria-label={`Diminuir ${l.name}`} onClick={() => setQuantity(l.sku, l.quantity - 1)}>
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={l.quantity}
                  aria-label={`Quantidade de ${l.name}`}
                  onChange={(e) => setQuantity(l.sku, Number(e.target.value))}
                />
                <button aria-label={`Aumentar ${l.name}`} onClick={() => setQuantity(l.sku, l.quantity + 1)}>
                  +
                </button>
              </span>
              <button className="remove" aria-label={`Remover ${l.name}`} onClick={() => remove(l.sku)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="rules muted">Regras: −5% no item com 5 ou mais unidades; −10% no pedido acima de R$ 1.000,00.</p>

      <div className="result preview-box">
        <span className="result-label">Prévia no navegador · Rust → WASM</span>
        <strong className="result-value">{preview ? brl(preview.totalCents) : "—"}</strong>
        <span className="muted">
          {preview && lines.length > 0
            ? `calculada em ${elapsed(preview.elapsed)}, sem requisição de rede${tampered ? " · preços adulterados" : ""}`
            : "aguardando itens"}
        </span>
      </div>

      <label className="tamper">
        <input type="checkbox" checked={tampered} onChange={(e) => setTampered(e.target.checked)} />
        Simular cliente adulterado (preços pela metade na prévia)
      </label>

      <button className="checkout" disabled={lines.length === 0 || sending} onClick={checkout}>
        {sending ? "Enviando…" : "Finalizar pedido"}
      </button>

      {error && <p className="error">Servidor recusou: {error}</p>}

      {official && (
        <div className={`result official ${official.matchesPreview === false ? "diverged" : ""}`}>
          <span className="result-label">Valor oficial · Go via gRPC</span>
          <strong className="result-value">{brl(official.totalCents)}</strong>
          <dl>
            <dt>Subtotal</dt>
            <dd>{brl(official.subtotalCents)}</dd>
            <dt>Descontos</dt>
            <dd>−{brl(official.discountCents)}</dd>
            <dt>Ida e volta HTTP</dt>
            <dd>{ms(official.httpMs)}</dd>
            <dt>Chamada gRPC (BFF → Go)</dt>
            <dd>{ms(official.grpcMs)}</dd>
          </dl>
          {official.appliedRules.length > 0 && (
            <ul className="applied">
              {official.appliedRules.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
          <p className={official.matchesPreview ? "ok" : "warn"}>
            {official.matchesPreview
              ? "A prévia do navegador bate com o valor oficial."
              : "A prévia divergiu do servidor. Vale o valor oficial."}
          </p>
        </div>
      )}
    </aside>
  );
}
