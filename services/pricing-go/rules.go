package main

import "fmt"

// Regras de precificação. São as mesmas do módulo Rust/WASM
// (wasm/pricing-rs/src/lib.rs): centavos inteiros e divisão inteira,
// para que a prévia do navegador e o valor oficial batam exatamente.
const (
	volumeMinQty                = 5
	volumeDiscountPct           = 5
	orderDiscountThresholdCents = 100_000 // R$ 1.000,00
	orderDiscountPct            = 10
)

// Line é uma linha do pedido já com o preço oficial.
type Line struct {
	SKU        string
	PriceCents int64
	Quantity   int64
}

// Quote é o resultado do cálculo.
type Quote struct {
	SubtotalCents int64 // soma das linhas, já com desconto por volume
	DiscountCents int64 // desconto total (volume + pedido)
	TotalCents    int64
	AppliedRules  []string
}

func lineTotal(priceCents, qty int64) (total, discount int64) {
	gross := priceCents * qty
	if qty >= volumeMinQty {
		discount = gross * volumeDiscountPct / 100
	}
	return gross - discount, discount
}

// Calculate aplica as duas regras de desconto.
func Calculate(lines []Line) Quote {
	var q Quote
	var gross int64
	for _, l := range lines {
		total, discount := lineTotal(l.PriceCents, l.Quantity)
		gross += l.PriceCents * l.Quantity
		q.SubtotalCents += total
		if discount > 0 {
			q.AppliedRules = append(q.AppliedRules,
				fmt.Sprintf("volume: -%d%% em %s (%d un.)", volumeDiscountPct, l.SKU, l.Quantity))
		}
	}
	q.TotalCents = q.SubtotalCents
	if q.SubtotalCents >= orderDiscountThresholdCents {
		q.TotalCents = q.SubtotalCents - q.SubtotalCents*orderDiscountPct/100
		q.AppliedRules = append(q.AppliedRules,
			fmt.Sprintf("pedido: -%d%% acima de %s", orderDiscountPct, FormatBRL(orderDiscountThresholdCents)))
	}
	q.DiscountCents = gross - q.TotalCents
	return q
}

// FormatBRL formata centavos como R$ 1.234,56.
func FormatBRL(cents int64) string {
	sign := ""
	if cents < 0 {
		sign, cents = "-", -cents
	}
	reais, centavos := cents/100, cents%100
	s := fmt.Sprintf("%d", reais)
	for i := len(s) - 3; i > 0; i -= 3 {
		s = s[:i] + "." + s[i:]
	}
	return fmt.Sprintf("%sR$ %s,%02d", sign, s, centavos)
}
