package main

import "testing"

// Mesmos casos de wasm/pricing-rs/src/lib.rs: se um lado mudar a regra,
// os testes dos dois lados acusam a divergência.
func TestCalculate(t *testing.T) {
	cases := []struct {
		name  string
		lines []Line
		total int64
	}{
		{"pedido vazio", nil, 0},
		{"sem desconto", []Line{{"CAB-005", 4_990, 2}, {"MOU-002", 12_900, 1}}, 22_880},
		{"desconto por volume", []Line{{"CAB-005", 4_990, 5}}, 23_703},
		{"desconto no pedido", []Line{{"MON-003", 189_900, 1}}, 170_910},
		{"os dois descontos", []Line{{"MOU-002", 12_900, 10}, {"TEC-001", 34_900, 1}}, 141_705},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := Calculate(c.lines).TotalCents; got != c.total {
				t.Fatalf("total = %d, esperado %d", got, c.total)
			}
		})
	}
}

func TestDiscountIsGrossMinusTotal(t *testing.T) {
	q := Calculate([]Line{{"MOU-002", 12_900, 10}, {"TEC-001", 34_900, 1}})
	if q.DiscountCents != 129_000+34_900-141_705 {
		t.Fatalf("desconto = %d", q.DiscountCents)
	}
	if len(q.AppliedRules) != 2 {
		t.Fatalf("regras aplicadas = %v", q.AppliedRules)
	}
}

func TestFormatBRL(t *testing.T) {
	for cents, want := range map[int64]string{
		0:         "R$ 0,00",
		4_990:     "R$ 49,90",
		100_000:   "R$ 1.000,00",
		1_234_567: "R$ 12.345,67",
	} {
		if got := FormatBRL(cents); got != want {
			t.Errorf("FormatBRL(%d) = %q, esperado %q", cents, got, want)
		}
	}
}
