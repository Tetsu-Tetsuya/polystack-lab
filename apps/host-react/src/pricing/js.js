// A mesma regra do Rust e do Go, em JavaScript puro.
// Usada só no benchmark, para comparar JS × WASM com o mesmo algoritmo.
const VOLUME_MIN_QTY = 5;
const VOLUME_DISCOUNT_PCT = 5;
const ORDER_DISCOUNT_THRESHOLD_CENTS = 100_000;
const ORDER_DISCOUNT_PCT = 10;

export function totalCentsJs(pricesCents, quantities) {
  let subtotal = 0;
  for (let i = 0; i < pricesCents.length; i++) {
    const gross = pricesCents[i] * quantities[i];
    subtotal += quantities[i] >= VOLUME_MIN_QTY ? gross - Math.floor((gross * VOLUME_DISCOUNT_PCT) / 100) : gross;
  }
  return subtotal >= ORDER_DISCOUNT_THRESHOLD_CENTS
    ? subtotal - Math.floor((subtotal * ORDER_DISCOUNT_PCT) / 100)
    : subtotal;
}
