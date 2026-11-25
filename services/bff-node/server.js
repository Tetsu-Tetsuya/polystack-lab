// BFF (backend for frontend) do PolyStack Lab.
//
// Fala HTTP/JSON com o navegador e gRPC com o serviço Go. O navegador não
// consegue falar gRPC nativo: a API fetch não expõe os trailers do HTTP/2,
// onde o gRPC envia o status final da chamada.

import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";

const here = path.dirname(fileURLToPath(import.meta.url));
const PROTO_PATH = path.resolve(here, "../../proto/pricing/v1/pricing.proto");
const PORT = Number(process.env.BFF_PORT ?? 3000);
const PRICING_ADDR = process.env.PRICING_ADDR ?? "127.0.0.1:50051";

// O mesmo .proto do serviço Go, carregado em tempo de execução.
const definition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: false, // price_cents → priceCents
  longs: Number, // int64 → number (seguro até 2^53 centavos)
  defaults: true,
});
const { pricing } = grpc.loadPackageDefinition(definition);
const pricingClient = new pricing.v1.PricingService(PRICING_ADDR, grpc.credentials.createInsecure());

const log = (...args) => console.log("[bff-node]", ...args);

/** Chama um método gRPC e mede quanto tempo levou. */
function callGrpc(method, request) {
  const start = performance.now();
  return new Promise((resolve, reject) => {
    pricingClient[method](request, { deadline: Date.now() + 3000 }, (err, response) => {
      const ms = performance.now() - start;
      const code = err ? grpc.status[err.code] : "OK";
      log(`→ gRPC PricingService/${method[0].toUpperCase()}${method.slice(1)} ${code} em ${ms.toFixed(1)} ms`);
      if (err) reject(err);
      else resolve({ response, ms });
    });
  });
}

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 100_000) reject(new Error("corpo grande demais"));
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("JSON inválido"));
      }
    });
    req.on("error", reject);
  });
}

/** Traduz erros gRPC em status HTTP para o navegador. */
function grpcErrorToHttp(err) {
  switch (err.code) {
    case grpc.status.INVALID_ARGUMENT:
      return [400, err.details];
    case grpc.status.UNAVAILABLE:
    case grpc.status.DEADLINE_EXCEEDED:
      return [503, "Serviço de precificação indisponível. O pricing-go está rodando?"];
    default:
      return [502, err.details || "Erro no serviço de precificação"];
  }
}

async function handle(req, res) {
  const url = new URL(req.url, "http://localhost");
  log(`${req.method} ${url.pathname}`);

  if (req.method === "GET" && url.pathname === "/api/health") {
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "GET" && url.pathname === "/api/catalog") {
    const { response } = await callGrpc("listProducts", {});
    return sendJson(res, 200, { products: response.products });
  }

  if (req.method === "POST" && url.pathname === "/api/quote") {
    let body;
    try {
      body = await readJson(req);
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
    const items = Array.isArray(body.items) ? body.items : [];
    // Só SKU e quantidade seguem para o Go: o preço enviado pelo cliente é ignorado.
    const request = { items: items.map((i) => ({ sku: String(i.sku ?? ""), quantity: Number(i.quantity) | 0 })) };
    const { response, ms } = await callGrpc("quote", request);

    const previewCents = Number.isFinite(body.previewCents) ? body.previewCents : null;
    const matchesPreview = previewCents === null ? null : previewCents === response.totalCents;
    if (matchesPreview === false) {
      log(`! prévia do cliente (${previewCents}) diverge do valor oficial (${response.totalCents}); vale o do servidor`);
    }
    return sendJson(res, 200, { ...response, previewCents, matchesPreview, grpcMs: Number(ms.toFixed(2)) });
  }

  sendJson(res, 404, { error: "rota não encontrada" });
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((err) => {
    if (typeof err.code === "number") {
      const [statusCode, message] = grpcErrorToHttp(err);
      return sendJson(res, statusCode, { error: message });
    }
    console.error(err);
    sendJson(res, 500, { error: "erro interno" });
  });
});

server.listen(PORT, () => {
  log(`HTTP/JSON em http://localhost:${PORT} · gRPC → ${PRICING_ADDR}`);
});
