// Benchmark JSON × Protocol Buffers (experimento do slide 16).
//
// Usa o mesmo pricing.proto do serviço Go. Para cada tamanho de pedido, mede:
//   - quantos bytes cada formato produz;
//   - quanto tempo leva para serializar e desserializar (mediana).
//
// Rodar: npm run bench:serialization

import path from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import protobuf from "protobufjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = await protobuf.load(path.resolve(here, "../proto/pricing/v1/pricing.proto"));
const QuoteRequest = root.lookupType("pricing.v1.QuoteRequest");

const SKUS = ["TEC-001", "MOU-002", "MON-003", "HEA-004", "CAB-005", "WEB-006"];
const SIZES = [10, 100, 1_000];
const SAMPLES = 31;

function makeOrder(n) {
  return { items: Array.from({ length: n }, (_, i) => ({ sku: SKUS[i % SKUS.length], quantity: 1 + (i % 10) })) };
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

/** Tempo médio por operação, em microssegundos (mediana das amostras). */
function timeIt(fn, n) {
  const reps = Math.max(10, Math.round(200_000 / n));
  for (let i = 0; i < reps; i++) fn(); // aquecimento do JIT
  const samples = [];
  for (let s = 0; s < SAMPLES; s++) {
    const t0 = performance.now();
    for (let i = 0; i < reps; i++) fn();
    samples.push(((performance.now() - t0) * 1000) / reps);
  }
  return median(samples);
}

const fmtBytes = (b) => `${b.toLocaleString("pt-BR")} B`;
const fmtUs = (us) => {
  const digits = us < 10 ? 2 : 1;
  return `${us.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })} µs`;
};
const pct = (a, b) => `${Math.round((1 - b / a) * 100)}%`;

const rows = [];
for (const n of SIZES) {
  const order = makeOrder(n);
  const message = QuoteRequest.fromObject(order);

  const jsonText = JSON.stringify(order);
  const jsonBytes = Buffer.byteLength(jsonText);
  const protoBuffer = QuoteRequest.encode(message).finish();
  const protoBytes = protoBuffer.length;

  // Sanidade: os dois caminhos levam aos mesmos dados.
  const roundTrip = QuoteRequest.toObject(QuoteRequest.decode(protoBuffer));
  if (JSON.stringify(roundTrip) !== jsonText) throw new Error("Protobuf e JSON divergiram");

  rows.push({
    n,
    jsonBytes,
    protoBytes,
    jsonEncode: timeIt(() => JSON.stringify(order), n),
    protoEncode: timeIt(() => QuoteRequest.encode(message).finish(), n),
    jsonDecode: timeIt(() => JSON.parse(jsonText), n),
    protoDecode: timeIt(() => QuoteRequest.decode(protoBuffer), n),
  });
}

console.log(`\nJSON × Protocol Buffers · Node ${process.version} · mediana de ${SAMPLES} amostras\n`);
console.log("| Itens | JSON | Protobuf | Redução | Serializar JSON | Serializar Protobuf | Desserializar JSON | Desserializar Protobuf |");
console.log("|---:|---:|---:|---:|---:|---:|---:|---:|");
for (const r of rows) {
  console.log(
    `| ${r.n.toLocaleString("pt-BR")} | ${fmtBytes(r.jsonBytes)} | ${fmtBytes(r.protoBytes)} | ${pct(r.jsonBytes, r.protoBytes)} | ` +
      `${fmtUs(r.jsonEncode)} | ${fmtUs(r.protoEncode)} | ${fmtUs(r.jsonDecode)} | ${fmtUs(r.protoDecode)} |`,
  );
}
console.log(
  "\nObservação: no Node, JSON.stringify/parse são nativos (C++) e o protobufjs roda em JavaScript;\n" +
    "o ganho principal do Protobuf aqui é no tamanho. Em Go, a serialização binária também é nativa.\n",
);
