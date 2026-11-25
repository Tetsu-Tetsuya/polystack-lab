// Carrega o módulo Rust compilado para WebAssembly uma única vez.
// O .wasm é baixado e compilado pelo navegador; depois disso, as funções
// exportadas são chamadas como funções JavaScript comuns.
import init, { quote_preview, PriceBuffer } from "../wasm/pricing_rs.js";

export const wasmReady = init().then(() => ({ quote_preview, PriceBuffer }));
