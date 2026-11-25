# PolyStack Lab

Aplicação demonstrativa do seminário **Tema 8 — Poliglotismo e flexibilidade tecnológica no desenvolvimento fullstack** (Maria Eduarda e Eduardo Rodrigues · SENAI CIMATEC · Desenvolvimento Full Stack).

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

---

## O que é instalado automaticamente e o que não é

O `git clone` e o `git pull` **só baixam os arquivos do projeto**. Eles não instalam nenhum programa.

| O quê | Como chega ao seu computador |
|---|---|
| Git, Node.js e Go | **Você instala, uma vez por computador** (seção 1) |
| Bibliotecas JavaScript (React, Vue, Rsbuild, gRPC para Node…) | Automático, pelo `npm run setup` |
| Módulos Go (grpc-go, protobuf) | Automático, pelo `npm run setup` |
| Módulo WebAssembly (Rust já compilado) | Já vem no repositório, em `apps/host-react/src/wasm/` |
| Código Go gerado do `.proto` | Já vem no repositório, em `services/pricing-go/gen/` |
| Rust, wasm-pack e buf | **Não são necessários** para rodar; só para recompilar (seção 6) |

---

## 1. Instale as ferramentas (uma vez por computador)

Você precisa de três programas:

| Programa | Versão mínima | Para que serve |
|---|---|---|
| **Git** | qualquer recente | baixar o repositório |
| **Node.js** | 20.19 (recomendado: 22 LTS) | host, catálogo, BFF e scripts |
| **Go** | 1.24 | serviço de precificação |

### Windows (PowerShell)

```powershell
winget install Git.Git
winget install OpenJS.NodeJS.LTS
winget install GoLang.Go
```

Sem o `winget`, baixe os instaladores em [git-scm.com](https://git-scm.com/download/win), [nodejs.org](https://nodejs.org) (versão LTS) e [go.dev/dl](https://go.dev/dl).

> **Importante:** depois de instalar, **feche e abra o terminal de novo** (se usa o terminal do VS Code, feche o VS Code inteiro). Só assim o terminal enxerga os comandos novos. Se ainda assim `go` ou `node` não forem reconhecidos, reinicie o computador.

### macOS (Homebrew)

```bash
brew install git node@22 go
```

### Linux (Ubuntu/Debian)

```bash
sudo apt update && sudo apt install -y git
# Node.js 22 (o do apt costuma ser antigo demais):
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
# Go: baixe o .tar.gz em https://go.dev/dl e siga as instruções de instalação da página
```

### Confira as versões

```bash
git --version
node -v      # precisa ser v20.19 ou mais recente (v22.x recomendado)
npm -v
go version   # precisa ser go1.24 ou mais recente
```

---

## 2. Baixe o projeto

```bash
git clone https://github.com/Tetsu-Tetsuya/polystack-lab.git
cd polystack-lab
```

---

## 3. Prepare o projeto (na primeira vez e depois de cada `git pull` com mudanças de dependências)

```bash
npm run setup
```

Esse comando faz duas coisas (precisa de internet):

1. `npm install` — baixa todas as bibliotecas JavaScript dos quatro pacotes (host, catálogo, BFF e benchmark) para `node_modules/`;
2. `go mod tidy` — baixa os módulos Go do serviço de precificação.

Pode levar de 1 a 3 minutos na primeira vez.

---

## 4. Rode

```bash
npm run dev
```

Os quatro processos sobem no mesmo terminal, cada um com seu prefixo colorido:

| Prefixo | O que é | Sinal de que subiu |
|---|---|---|
| `go` | serviço de precificação (gRPC) | `gRPC escutando em 127.0.0.1:50051` |
| `bff` | BFF Node.js | `HTTP/JSON em http://localhost:3000` |
| `catalog` | microfrontend Vue | `Local: http://localhost:3002/` |
| `host` | host React | `Local: http://localhost:3001/` |

Abra **http://localhost:3001**. Para parar tudo: **Ctrl+C**.

> Na primeira vez, o Go compila antes de subir e pode demorar um pouco mais. Se o catálogo mostrar "Serviço de precificação indisponível", espere aparecer a linha `gRPC escutando` e clique em *Tentar de novo*.

### Teste rápido

Adicione o *Mouse sem fio*, mude a quantidade para 10, adicione o *Teclado mecânico* e clique em *Finalizar pedido*. A prévia e o valor oficial devem mostrar **R$ 1.417,05** e as quatro etapas no topo devem acender.

---

## 5. Depois de um `git pull`

```bash
git pull
npm run setup   # só é necessário se package.json, package-lock.json ou go.mod mudaram; rodar sempre não faz mal
npm run dev
```

---

## Roteiro da demonstração (slide 15 · cerca de 3 min)

Antes de começar: abra o DevTools na aba **Network** e deixe o terminal visível ao lado.

1. **Carregar o catálogo (≈ 40 s).** Recarregue a página. Na aba Network aparecem `mf-manifest.json` e `catalog.js` vindos da porta **3002**: o host React baixou o catálogo Vue em tempo de execução. A etapa 01 acende.
2. **Prévia no navegador (≈ 40 s).** Adicione o *Mouse sem fio*, mude a quantidade para 10 e adicione o *Teclado mecânico*. A prévia muda na hora e **nenhuma requisição aparece na aba Network**: é o Rust em WebAssembly calculando.
3. **Enviar o pedido (≈ 40 s).** Clique em *Finalizar pedido*. Na aba Network aparece `POST /api/quote` com JSON.
4. **Precificar no Go (≈ 60 s).** No terminal, o `pricing-go` registra `gRPC /pricing.v1.PricingService/Quote → OK`. O painel mostra o valor oficial, as regras aplicadas e o tempo da chamada gRPC.

Extras, se sobrar tempo:

- **Cliente adulterado:** marque *Simular cliente adulterado*. A prévia cai pela metade, mas o servidor devolve o valor oficial e a tela avisa a divergência.
- **Validação no servidor:** digite 150 na quantidade e finalize. O Go recusa e o BFF devolve HTTP 400.
- **Isolamento de falhas:** sem o catálogo no ar, o host mostra "Catálogo indisponível" e o resto da página continua funcionando.

**Plano B:** grave um vídeo curto da demo e deixe-o aberto em outra aba.

---

## Experimentos (slide 16)

**JSON × Protocol Buffers** (tamanho e tempo de serialização, com o mesmo `.proto`; não precisa do `npm run dev`):

```bash
npm run bench:serialization
```

Os tamanhos são sempre os mesmos em qualquer máquina (dados fixos); os tempos variam.

**JavaScript × WebAssembly:** com o `npm run dev` rodando, abra a aba **Benchmark JS × WASM** e clique em *Rodar benchmark*. Feche o DevTools durante a medição, rode três vezes e use o valor do meio. Confira se a coluna *Totais conferem* mostra "sim". O botão *Copiar tabela* copia o resultado.

---

## Testes

As regras de preço existem em dois lugares (Rust no navegador, Go no servidor) e têm os **mesmos casos de teste** nos dois lados:

```bash
npm test            # testes do Go
npm run test:rust   # testes do Rust (requer Rust instalado)
```

---

## 6. Opcional: ferramentas para modificar o projeto

Nada disto é necessário para rodar a demo.

| Para… | Instale | Depois rode |
|---|---|---|
| Recompilar o WebAssembly após mudar `wasm/pricing-rs` | Rust ([rustup.rs](https://rustup.rs)), depois `rustup target add wasm32-unknown-unknown` e `cargo install wasm-pack` | `npm run build:wasm` |
| Regenerar o código Go após mudar o `.proto` | `go install google.golang.org/protobuf/cmd/protoc-gen-go@latest` e `go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest` | `npx @bufbuild/buf generate` e `npx @bufbuild/buf lint` |
| Chamar o serviço gRPC direto pelo terminal | [grpcurl](https://github.com/fullstorydev/grpcurl) | `grpcurl -plaintext localhost:50051 list` |

O BFF lê o `.proto` em tempo de execução: depois de mudar o contrato, basta reiniciá-lo.

Exemplo com grpcurl (o serviço Go registra *reflection*):

```bash
grpcurl -plaintext -d '{"items":[{"sku":"MOU-002","quantity":10}]}' localhost:50051 pricing.v1.PricingService/Quote
```

---

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

---

## Problemas comuns

| Sintoma | Causa | Solução |
|---|---|---|
| `'go' não é reconhecido como um comando` | Go não instalado, ou terminal aberto antes da instalação | Instale o Go (seção 1) e **abra um terminal novo** |
| `'node'` ou `'npm'` não é reconhecido | Node.js não instalado, ou terminal antigo | Instale o Node.js e abra um terminal novo |
| `npm` reclama de versão do Node (`engine`) | Node.js antigo | Instale o Node 22 LTS |
| `missing go.sum entry` | Módulos Go não baixados | `npm run setup:go` |
| "Serviço de precificação indisponível" | O processo `go` não subiu ou ainda está compilando | Veja as linhas `[go]` no terminal; espere `gRPC escutando` |
| "Catálogo indisponível" | O processo `catalog` não subiu | Veja as linhas `[catalog]` no terminal |
| `EADDRINUSE` / `address already in use` | Porta 3000, 3001, 3002 ou 50051 ocupada | Feche o outro programa (ou um `npm run dev` antigo ainda aberto) |
| `go mod tidy` falha com erro de rede | Rede bloqueando o proxy de módulos Go | Tente outra rede (por exemplo, o roteador do celular) |
