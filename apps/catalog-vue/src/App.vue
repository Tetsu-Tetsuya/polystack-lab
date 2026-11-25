<script setup>
import { onMounted, ref } from "vue";

const products = ref([]);
const status = ref("carregando");
const lastAdded = ref("");

const brl = (cents) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function load() {
  status.value = "carregando";
  try {
    // Mesma origem do host: o dev server encaminha /api para o BFF.
    const res = await fetch("/api/catalog");
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? res.statusText);
    products.value = body.products;
    status.value = "pronto";
  } catch (err) {
    status.value = `erro: ${err.message}`;
  }
}

function add(product) {
  // Contrato de eventos com o host: o catálogo não conhece o carrinho.
  window.dispatchEvent(
    new CustomEvent("polystack:add-to-cart", {
      detail: { sku: product.sku, name: product.name, priceCents: product.priceCents },
    }),
  );
  lastAdded.value = product.sku;
  setTimeout(() => {
    if (lastAdded.value === product.sku) lastAdded.value = "";
  }, 600);
}

onMounted(load);
</script>

<template>
  <section class="catalog">
    <header class="catalog-head">
      <div>
        <p class="eyebrow">Microfrontend remoto</p>
        <h2>Catálogo</h2>
      </div>
      <span class="badge">Vue 3 · Module Federation · porta 3002</span>
    </header>

    <p v-if="status === 'carregando'" class="hint">Carregando catálogo do BFF…</p>
    <p v-else-if="status.startsWith('erro')" class="error">
      Não foi possível carregar o catálogo ({{ status.slice(6) }}).
      <button class="link" @click="load">Tentar de novo</button>
    </p>

    <ul v-else class="grid">
      <li v-for="p in products" :key="p.sku" class="product" :class="{ flash: lastAdded === p.sku }">
        <span class="category">{{ p.category }}</span>
        <strong class="name">{{ p.name }}</strong>
        <span class="sku">{{ p.sku }}</span>
        <span class="price">{{ brl(p.priceCents) }}</span>
        <button class="add" @click="add(p)">Adicionar</button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.catalog {
  border: 3px dashed #e8833a;
  border-radius: 14px;
  padding: 20px;
  background: #fffdf9;
  font-family: Inter, system-ui, sans-serif;
  color: #13202e;
}
.catalog-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}
.eyebrow {
  margin: 0;
  font: 600 12px/1.4 ui-monospace, "JetBrains Mono", monospace;
  color: #a44e12;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
h2 {
  margin: 2px 0 0;
  font-size: 22px;
}
.badge {
  font: 600 12px/1 ui-monospace, monospace;
  background: #42b883;
  color: #0b2a1d;
  padding: 6px 10px;
  border-radius: 999px;
  white-space: nowrap;
}
.grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 12px;
}
.product {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px;
  border-radius: 10px;
  background: #f5f3ee;
  border: 1px solid #e3ddd1;
  transition: box-shadow 0.2s, transform 0.2s;
}
.product.flash {
  box-shadow: 0 0 0 3px #e8833a;
  transform: translateY(-2px);
}
.category {
  font: 600 11px/1.2 ui-monospace, monospace;
  color: #4a5563;
  text-transform: uppercase;
}
.name {
  font-size: 15px;
}
.sku {
  font: 12px ui-monospace, monospace;
  color: #6b7280;
}
.price {
  font-size: 18px;
  font-weight: 700;
  margin-top: 4px;
}
.add {
  margin-top: 8px;
  padding: 8px 10px;
  border: 0;
  border-radius: 8px;
  background: #13202e;
  color: #f5f3ee;
  font-weight: 600;
  cursor: pointer;
}
.add:hover {
  background: #1f5f99;
}
.hint {
  color: #4a5563;
}
.error {
  color: #a3261b;
}
.link {
  background: none;
  border: 0;
  color: #1f5f99;
  text-decoration: underline;
  cursor: pointer;
}
</style>
