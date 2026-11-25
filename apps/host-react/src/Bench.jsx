import { useState } from "react";
import { wasmReady } from "./pricing/wasm.js";
import { totalCentsJs } from "./pricing/js.js";
import { ms } from "./format.js";

const SIZES = [1_000, 100_000, 1_000_000];
const SAMPLES = 21;
const WARMUP = 5;

/** Dados determinísticos: a mesma semente gera os mesmos pedidos em toda rodada. */
function makeData(n) {
  let seed = 42;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const prices = new Uint32Array(n);
  const quantities = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    prices[i] = 990 + Math.floor(rnd() * 50_000);
    quantities[i] = 1 + Math.floor(rnd() * 10);
  }
  return { prices, quantities };
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/**
 * Mede o tempo por chamada. Em entradas pequenas, cada amostra repete a
 * chamada várias vezes, porque o relógio do navegador tem resolução limitada.
 */
function measure(fn, n) {
  const reps = Math.max(1, Math.round(2_000_000 / n));
  for (let i = 0; i < WARMUP; i++) fn();
  const samples = [];
  let result;
  for (let s = 0; s < SAMPLES; s++) {
    const t0 = performance.now();
    for (let r = 0; r < reps; r++) result = fn();
    samples.push((performance.now() - t0) / reps);
  }
  return { time: median(samples), result };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

export default function Bench() {
  const [rows, setRows] = useState([]);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  async function run() {
    setRunning(true);
    setRows([]);
    setCopied(false);
    const { quote_preview, PriceBuffer } = await wasmReady;
    const out = [];
    for (const n of SIZES) {
      await tick();
      const { prices, quantities } = makeData(n);
      const js = measure(() => totalCentsJs(prices, quantities), n);
      await tick();
      const withCopy = measure(() => quote_preview(prices, quantities), n);
      await tick();
      const buffer = new PriceBuffer(prices, quantities); // cópia feita uma vez, fora da medição
      const noCopy = measure(() => buffer.total(), n);
      buffer.free();
      out.push({
        n,
        js: js.time,
        withCopy: withCopy.time,
        noCopy: noCopy.time,
        same: js.result === withCopy.result && js.result === noCopy.result,
      });
      setRows([...out]);
    }
    setRunning(false);
  }

  const markdown = [
    "| Itens | JavaScript | WASM com cópia | WASM sem cópia |",
    "|---:|---:|---:|---:|",
    ...rows.map((r) => `| ${r.n.toLocaleString("pt-BR")} | ${ms(r.js)} | ${ms(r.withCopy)} | ${ms(r.noCopy)} |`),
  ].join("\n");

  async function copy() {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
  }

  return (
    <main className="bench">
      <section className="panel">
        <div className="panel-head">
          <h2>Benchmark: o mesmo cálculo de preço em JavaScript e em WebAssembly</h2>
        </div>
        <p className="muted">
          Mesma regra, mesmos dados (semente fixa), {WARMUP} execuções de aquecimento e mediana de {SAMPLES} amostras.
          “Com cópia” inclui copiar os arrays do JS para a memória do WASM a cada chamada; “sem cópia” usa dados que já
          estão dentro do WASM. Para números mais estáveis, feche o DevTools e não mexa na página durante a medição.
        </p>
        <button className="checkout" onClick={run} disabled={running}>
          {running ? "Medindo…" : "Rodar benchmark"}
        </button>

        {rows.length > 0 && (
          <table className="bench-table">
            <thead>
              <tr>
                <th>Itens</th>
                <th>JavaScript</th>
                <th>WASM com cópia</th>
                <th>WASM sem cópia</th>
                <th>Totais conferem</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.n}>
                  <td>{r.n.toLocaleString("pt-BR")}</td>
                  <td>{ms(r.js)}</td>
                  <td>{ms(r.withCopy)}</td>
                  <td>{ms(r.noCopy)}</td>
                  <td>{r.same ? "sim" : "NÃO"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {rows.length === SIZES.length && (
          <div className="copy-box">
            <p className="muted">Tabela pronta para o slide 16:</p>
            <pre>{markdown}</pre>
            <button onClick={copy}>{copied ? "Copiado" : "Copiar tabela"}</button>
          </div>
        )}
      </section>
    </main>
  );
}
