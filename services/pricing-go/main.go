// Serviço de precificação do PolyStack Lab.
//
// Fala só gRPC, na rede interna. Quem o chama é o BFF em Node.js;
// o navegador nunca fala com ele diretamente.
package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"os"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/reflection"
	"google.golang.org/grpc/status"

	pricingv1 "polystack-lab/pricing-go/gen/pricingv1"
)

const maxQuantity = 100

type pricingServer struct {
	pricingv1.UnimplementedPricingServiceServer
}

func (pricingServer) ListProducts(context.Context, *pricingv1.ListProductsRequest) (*pricingv1.ListProductsResponse, error) {
	return &pricingv1.ListProductsResponse{Products: catalog}, nil
}

func (pricingServer) Quote(_ context.Context, req *pricingv1.QuoteRequest) (*pricingv1.QuoteResponse, error) {
	if len(req.GetItems()) == 0 {
		return nil, status.Error(codes.InvalidArgument, "pedido vazio")
	}
	lines := make([]Line, 0, len(req.GetItems()))
	for _, item := range req.GetItems() {
		product, ok := catalogBySKU[item.GetSku()]
		if !ok {
			return nil, status.Errorf(codes.InvalidArgument, "SKU desconhecido: %q", item.GetSku())
		}
		if item.GetQuantity() < 1 || item.GetQuantity() > maxQuantity {
			return nil, status.Errorf(codes.InvalidArgument,
				"quantidade inválida para %s: %d (permitido de 1 a %d)", item.GetSku(), item.GetQuantity(), maxQuantity)
		}
		// O preço vem do catálogo oficial, nunca do cliente.
		lines = append(lines, Line{SKU: product.Sku, PriceCents: product.PriceCents, Quantity: int64(item.GetQuantity())})
	}

	q := Calculate(lines)
	log.Printf("Quote: %d linha(s) · subtotal %s · desconto %s · total %s",
		len(lines), FormatBRL(q.SubtotalCents), FormatBRL(q.DiscountCents), FormatBRL(q.TotalCents))

	return &pricingv1.QuoteResponse{
		SubtotalCents: q.SubtotalCents,
		DiscountCents: q.DiscountCents,
		TotalCents:    q.TotalCents,
		AppliedRules:  q.AppliedRules,
	}, nil
}

// logCalls registra cada chamada gRPC com o método, o status e a duração.
func logCalls(ctx context.Context, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (any, error) {
	start := time.Now()
	resp, err := handler(ctx, req)
	log.Printf("gRPC %s → %s em %s", info.FullMethod, status.Code(err), time.Since(start).Round(time.Microsecond))
	return resp, err
}

func main() {
	log.SetPrefix("[pricing-go] ")
	log.SetFlags(log.Ltime)

	addr := os.Getenv("PRICING_ADDR")
	if addr == "" {
		addr = "127.0.0.1:50051"
	}
	lis, err := net.Listen("tcp", addr)
	if err != nil {
		log.Fatalf("não foi possível escutar em %s: %v", addr, err)
	}

	srv := grpc.NewServer(grpc.UnaryInterceptor(logCalls))
	pricingv1.RegisterPricingServiceServer(srv, pricingServer{})
	// Reflection permite inspecionar o serviço ao vivo com grpcurl.
	reflection.Register(srv)

	fmt.Printf("[pricing-go] gRPC escutando em %s\n", addr)
	if err := srv.Serve(lis); err != nil {
		log.Fatal(err)
	}
}
