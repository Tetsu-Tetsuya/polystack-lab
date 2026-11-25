// Contrato do microfrontend com o host:
//   mount(el) → monta o catálogo no elemento e devolve uma função de desmontagem.
// Eventos emitidos (contrato de eventos, sem estado global compartilhado):
//   "polystack:add-to-cart"  detail: { sku, name, priceCents }
import { createApp } from "vue";
import App from "./App.vue";

export function mount(el) {
  const app = createApp(App);
  app.mount(el);
  return () => app.unmount();
}
