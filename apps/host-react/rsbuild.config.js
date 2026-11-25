import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginModuleFederation } from "@module-federation/rsbuild-plugin";

const CATALOG_URL = process.env.CATALOG_URL ?? "http://localhost:3002";

// Host: carrega o remoto "catalog" em tempo de execução, pelo manifesto.
export default defineConfig({
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: "host",
      remotes: {
        catalog: `catalog@${CATALOG_URL}/mf-manifest.json`,
      },
      shared: {
        react: { singleton: true },
        "react-dom": { singleton: true },
      },
      // Só baixa o remoto quando ele é usado. Assim, se o catálogo cair,
      // o host continua de pé e mostra um aviso (isolamento de falhas).
      shareStrategy: "loaded-first",
    }),
  ],
  server: {
    port: 3001,
    // O navegador fala HTTP/JSON com o BFF; nunca com o serviço Go.
    proxy: { "/api": "http://localhost:3000" },
  },
  html: {
    title: "PolyStack Lab",
  },
});
