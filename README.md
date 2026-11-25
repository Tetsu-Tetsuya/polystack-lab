# PolyStack Lab

Aplicação demonstrativa do seminário **Tema 8 — Poliglotismo e flexibilidade tecnológica no desenvolvimento fullstack** (Maria Eduarda e Eduardo Rodrigues).

O cenário é um processamento de pedidos com precificação. Quatro stacks diferentes conversam por contratos explícitos:

```
 Navegador ─────────────────────────────────────────────────────────────
 │  Host React (3001) ──Module Federation──▶ Catálogo Vue (3002)
 │        │  evento "polystack:add-to-cart"  ◀────────┘
 │        └─▶ Prévia de preço: Rust compilado para WebAssembly
 │
 │  HTTP/JSON (/api/quote)
 ▼
 BFF Node.js (3000) ── gRPC + Protocol Buffers ──▶ Precificação Go (50051)
                       contrato: proto/pricing/v1/pricing.proto
```

| Parte | Pasta | Tecnologia | Porta |
|---|---|---|---|
| Host | `apps/host-react` | React 19 + Rsbuild + Module Federation 2.0 | 3001 |
| Catálogo (remoto) | `apps/catalog-vue` | Vue 3 + Rsbuild + Module Federation 2.0 | 3002 |
| Prévia de preço | `wasm/pricing-rs` | Rust → WebAssembly (wasm-bindgen) | — |
| BFF | `services/bff-node` | Node.js + @grpc/grpc-js | 3000 |
| Precificação | `services/pricing-go` | Go + grpc-go | 50051 |
| Contrato | `proto/pricing/v1/pricing.proto` | Protocol Buffers (proto3) | — |

## Requisitos

- **Node.js 20.19+ ou 22.12+** (recomendado: Node 22 LTS)
- **Go 1.24+**
- Internet na primeira execução (para baixar os pacotes npm e os módulos Go)

Rust e wasm-pack **não** são necessários para rodar: o módulo WebAssembly já vem compilado em `apps/host-react/src/wasm/`. Só são precisos para recompilá-lo.

## Como rodar

```bash
npm run setup   # instala os pacotes npm e baixa os módulos Go (só na primeira vez)
npm run dev     # sobe os quatro processos juntos
```

Abra **http://localhost:3001**. Os logs dos quatro processos aparecem no mesmo terminal, cada um com seu prefixo (`go`, `bff`, `catalog`, `host`).

Para parar, use Ctrl+C.

## Roteiro da demonstração (slide 15 · cerca de 3 min)

Antes de começar: abra o DevTools na aba **Network** e deixe o terminal visível ao lado.

1. **Carregar o catálogo (≈ 40 s).** Recarregue a página. Na aba Network aparecem `mf-manifest.json` e `__federation_expose_mount.js` vindos da porta **3002**: o host React baixou o catálogo Vue em tempo de execução. A etapa 01 acende.
2. **Prévia no navegador (≈ 40 s).** Adicione o *Mouse sem fio* e mude a quantidade para 10, depois adicione o *Teclado mecânico*. A prévia muda na hora e **nenhuma requisição aparece na aba Network**: é o Rust em WebAssembly calculando (R$ 1.417,05, com os dois descontos).
3. **Enviar o pedido (≈ 40 s).** Clique em *Finalizar pedido*. Na aba Network aparece `POST /api/quote` com JSON. No terminal, o BFF registra a chamada.
4. **Precificar no Go (≈ 60 s).** No terminal, o `pricing-go` registra `gRPC /pricing.v1.PricingService/Quote → OK`. O painel mostra o valor oficial, as regras aplicadas e o tempo da chamada gRPC, com a confirmação de que a prévia bate.

Extras, se sobrar tempo (slide 14 e perguntas):

- **Cliente adulterado:** marque *Simular cliente adulterado*. A prévia cai pela metade, mas ao finalizar o servidor devolve o valor oficial e a tela avisa a divergência. É o "calcular no cliente, validar no servidor".
- **Validação no servidor:** digite 150 na quantidade e finalize. O Go recusa (`InvalidArgument`) e o BFF devolve HTTP 400.
- **Isolamento de falhas:** pare só o catálogo (ou não o suba). O host mostra "Catálogo indisponível" e o resto da página continua funcionando.

**Plano B:** grave um vídeo curto da demo funcionando e deixe-o aberto em outra aba. Se a rede ou o computador da sala falharem, troque para o vídeo sem perder tempo.

## Experimentos (slide 16)

**JSON × Protocol Buffers** (tamanho e tempo de serialização, com o mesmo `.proto`):

```bash
npm run bench:serialization
```

Imprime uma tabela pronta para o slide.

**JavaScript × WebAssembly** (o mesmo cálculo de preço, com e sem a cópia dos dados para o WASM): abra a aba **Benchmark JS × WASM** no navegador e clique em *Rodar benchmark*. Para números mais estáveis, feche o DevTools durante a medição. O botão *Copiar tabela* copia o resultado.

Rode os dois na máquina da apresentação: os números variam de computador para computador.

## Testes

As regras de preço existem em dois lugares (Rust no navegador, Go no servidor) e têm os **mesmos casos de teste** nos dois lados:

```bash
npm test            # testes do Go
npm run test:rust   # testes do Rust (requer cargo)
```

## Inspecionar o serviço gRPC ao vivo (opcional)

O serviço Go registra *reflection*, então dá para chamá-lo direto com [grpcurl](https://github.com/fullstorydev/grpcurl):

```bash
grpcurl -plaintext localhost:50051 list
grpcurl -plaintext -d '{"items":[{"sku":"MOU-002","quantity":10}]}' localhost:50051 pricing.v1.PricingService/Quote
```

## Quando mudar o código

**Mudou o `.proto`?**
- O BFF lê o `.proto` em tempo de execução: basta reiniciar.
- O código Go precisa ser regenerado. Instale os geradores uma vez:
  ```bash
  go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
  go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
  ```
  Depois rode, na raiz:
  ```bash
  npx @bufbuild/buf generate   # gera services/pricing-go/gen/pricingv1
  npx @bufbuild/buf lint       # confere o contrato
  ```

**Mudou o Rust?** Instale o Rust (rustup), o alvo `wasm32-unknown-unknown` e o [wasm-pack](https://rustwasm.github.io/wasm-pack/). Depois rode:

```bash
npm run build:wasm
```

## Estrutura

```
proto/pricing/v1/pricing.proto   contrato entre BFF e Go
services/pricing-go/             serviço gRPC em Go (regras, catálogo oficial, testes)
services/bff-node/               BFF: HTTP/JSON ↔ gRPC
wasm/pricing-rs/                 prévia de preço em Rust (fonte e testes)
apps/host-react/                 host React, carrinho, prévia WASM, benchmark
apps/host-react/src/wasm/        módulo WASM já compilado + ponte JS gerada
apps/catalog-vue/                microfrontend de catálogo em Vue (remoto)
bench/                           benchmark JSON × Protobuf
```

## Problemas comuns

- **"Catálogo indisponível"**: o processo `catalog` não subiu. Veja o log com prefixo `catalog` no terminal.
- **"Serviço de precificação indisponível"**: o processo `go` não subiu. Rode `npm run setup:go` e veja o log com prefixo `go`.
- **`missing go.sum entry`**: rode `npm run setup:go` (executa `go mod tidy`).
- **Porta ocupada**: feche o outro processo que usa a porta. Você também pode mudar as portas com `BFF_PORT`, `PRICING_ADDR`, `CATALOG_URL` e `HOST_ORIGIN`, ajustando os proxies em `rsbuild.config.js`.
