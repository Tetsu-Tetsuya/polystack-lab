//! Prévia de preço do PolyStack Lab, compilada para WebAssembly.
//!
//! As regras são as mesmas do serviço Go (`services/pricing-go/rules.go`).
//! Os dois lados usam centavos inteiros e divisão inteira, então os
//! totais batem exatamente; os casos de teste abaixo são os mesmos do Go.

use wasm_bindgen::prelude::*;

/// Quantidade mínima de um item para ganhar desconto por volume.
pub const VOLUME_MIN_QTY: u32 = 5;
/// Desconto por volume, em %, aplicado só à linha do item.
pub const VOLUME_DISCOUNT_PCT: u64 = 5;
/// Subtotal a partir do qual o pedido ganha desconto (R$ 1.000,00).
pub const ORDER_DISCOUNT_THRESHOLD_CENTS: u64 = 100_000;
/// Desconto no pedido, em %.
pub const ORDER_DISCOUNT_PCT: u64 = 10;

/// Total de uma linha (preço × quantidade), com desconto por volume.
fn line_total(price_cents: u32, qty: u32) -> u64 {
    let gross = price_cents as u64 * qty as u64;
    if qty >= VOLUME_MIN_QTY {
        gross - gross * VOLUME_DISCOUNT_PCT / 100
    } else {
        gross
    }
}

/// Total do pedido em centavos, com as duas regras de desconto.
pub fn total_cents(prices_cents: &[u32], quantities: &[u32]) -> u64 {
    let subtotal: u64 = prices_cents
        .iter()
        .zip(quantities)
        .map(|(&price, &qty)| line_total(price, qty))
        .sum();
    if subtotal >= ORDER_DISCOUNT_THRESHOLD_CENTS {
        subtotal - subtotal * ORDER_DISCOUNT_PCT / 100
    } else {
        subtotal
    }
}

/// Prévia de preço exportada para o JavaScript.
///
/// Os dois arrays são copiados do heap do JS para a memória linear do
/// WASM a cada chamada; o resultado (centavos) volta como um número.
#[wasm_bindgen]
pub fn quote_preview(prices_cents: &[u32], quantities: &[u32]) -> f64 {
    total_cents(prices_cents, quantities) as f64
}

/// Dados que ficam dentro da memória do WASM.
///
/// Usado no benchmark para medir o cálculo sem o custo da cópia:
/// os arrays são copiados uma vez, no construtor, e `total()` não copia nada.
#[wasm_bindgen]
pub struct PriceBuffer {
    prices_cents: Vec<u32>,
    quantities: Vec<u32>,
}

#[wasm_bindgen]
impl PriceBuffer {
    #[wasm_bindgen(constructor)]
    pub fn new(prices_cents: &[u32], quantities: &[u32]) -> PriceBuffer {
        PriceBuffer {
            prices_cents: prices_cents.to_vec(),
            quantities: quantities.to_vec(),
        }
    }

    /// Total em centavos, calculado sobre os dados já guardados no WASM.
    pub fn total(&self) -> f64 {
        total_cents(&self.prices_cents, &self.quantities) as f64
    }

    /// Quantidade de linhas guardadas.
    pub fn len(&self) -> usize {
        self.prices_cents.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Mesmos casos de `services/pricing-go/rules_test.go`.

    #[test]
    fn pedido_vazio() {
        assert_eq!(total_cents(&[], &[]), 0);
    }

    #[test]
    fn sem_desconto() {
        // 2 × 4.990 + 1 × 12.900 = 22.880
        assert_eq!(total_cents(&[4_990, 12_900], &[2, 1]), 22_880);
    }

    #[test]
    fn desconto_por_volume() {
        // 5 × 4.990 = 24.950; −5% (1.247) = 23.703
        assert_eq!(total_cents(&[4_990], &[5]), 23_703);
    }

    #[test]
    fn desconto_no_pedido() {
        // 1 × 189.900 = 189.900; −10% (18.990) = 170.910
        assert_eq!(total_cents(&[189_900], &[1]), 170_910);
    }

    #[test]
    fn os_dois_descontos() {
        // linha 1: 10 × 12.900 = 129.000; −5% (6.450) = 122.550
        // linha 2: 1 × 34.900 = 34.900
        // subtotal 157.450; −10% (15.745) = 141.705
        assert_eq!(total_cents(&[12_900, 34_900], &[10, 1]), 141_705);
    }

    #[test]
    fn buffer_igual_a_previa() {
        let prices = [4_990, 12_900, 34_900];
        let qty = [3, 6, 1];
        let buffer = PriceBuffer::new(&prices, &qty);
        assert_eq!(buffer.total(), quote_preview(&prices, &qty));
    }
}
