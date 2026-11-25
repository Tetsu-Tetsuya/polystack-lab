package main

import pricingv1 "polystack-lab/pricing-go/gen/pricingv1"

// Catálogo oficial. Estes são os preços que valem para cobrar,
// independentemente do que o navegador calcular.
var catalog = []*pricingv1.Product{
	{Sku: "TEC-001", Name: "Teclado mecânico", PriceCents: 34_900, Category: "Periféricos"},
	{Sku: "MOU-002", Name: "Mouse sem fio", PriceCents: 12_900, Category: "Periféricos"},
	{Sku: "MON-003", Name: "Monitor 27 polegadas", PriceCents: 189_900, Category: "Monitores"},
	{Sku: "HEA-004", Name: "Headset USB", PriceCents: 24_900, Category: "Áudio"},
	{Sku: "CAB-005", Name: "Cabo USB-C 2 m", PriceCents: 4_990, Category: "Acessórios"},
	{Sku: "WEB-006", Name: "Webcam Full HD", PriceCents: 29_900, Category: "Vídeo"},
}

var catalogBySKU = func() map[string]*pricingv1.Product {
	m := make(map[string]*pricingv1.Product, len(catalog))
	for _, p := range catalog {
		m[p.Sku] = p
	}
	return m
}()
