export const brl = (cents) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Duração em ms, no formato brasileiro (vírgula decimal). */
export const ms = (value) => {
  if (value < 1) return `${Math.round(value * 1000).toLocaleString("pt-BR")} µs`;
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: value < 10 ? 2 : 1 })} ms`;
};

/**
 * O relógio do navegador (performance.now) tem resolução limitada, então
 * uma chamada muito rápida pode medir 0. Nesse caso, dizemos "menos de 0,1 ms".
 */
export const elapsed = (value) => (value < 0.1 ? "menos de 0,1 ms" : ms(value));
