// As quatro etapas da demonstração (slide 15), acendendo conforme acontecem.
const STEPS = [
  { key: "catalog", label: "Catálogo Vue carregado", tech: "Module Federation" },
  { key: "preview", label: "Prévia calculada no navegador", tech: "Rust · WASM" },
  { key: "http", label: "Pedido enviado ao BFF", tech: "HTTP/JSON" },
  { key: "grpc", label: "Valor oficial do Go", tech: "gRPC · .proto" },
];

export default function FlowSteps({ steps, onReset }) {
  return (
    <ol className="flow" aria-label="Etapas da demonstração">
      {STEPS.map((s, i) => (
        <li key={s.key} className={steps[s.key] ? "done" : ""}>
          <span className="num">{String(i + 1).padStart(2, "0")}</span>
          <span className="text">
            <strong>{s.label}</strong>
            <small>{s.tech}</small>
          </span>
          <span className="state">{steps[s.key] ? "feito" : "aguardando"}</span>
        </li>
      ))}
      <li className="reset">
        <button onClick={onReset} title="Zerar o indicador de etapas">
          Zerar
        </button>
      </li>
    </ol>
  );
}
