import { defineConfig } from "@rsbuild/core";
import { pluginVue } from "@rsbuild/plugin-vue";
import { pluginModuleFederation } from "@module-federation/rsbuild-plugin";

// Remoto: expõe uma função mount(el) em vez de um componente Vue,
// para que um host em qualquer framework (aqui, React) possa montá-lo.
export default defineConfig({
  plugins: [
    pluginVue(),
    pluginModuleFederation({
      name: "catalog",
      exposes: {
        "./mount": "./src/mount.js",
      },
      shared: {
        vue: { singleton: true },
      },
    }),
  ],
  server: {
    port: 3002,
    // Só o host pode baixar os módulos deste remoto.
    cors: { origin: [process.env.HOST_ORIGIN ?? "http://localhost:3001"] },
    // Rodando sozinho, o catálogo também fala com o BFF.
    proxy: { "/api": "http://localhost:3000" },
  },
  html: {
    title: "Catálogo (Vue) · PolyStack Lab",
  },
});
