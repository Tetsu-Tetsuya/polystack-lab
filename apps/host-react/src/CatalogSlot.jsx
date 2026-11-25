import { useEffect, useRef, useState } from "react";

// Região da página onde o remoto Vue é montado.
// O código do catálogo é baixado de http://localhost:3002 em tempo de execução.
export default function CatalogSlot({ onLoaded }) {
  const ref = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let unmount;
    let cancelled = false;
    import("catalog/mount")
      .then(({ mount }) => {
        if (cancelled) return;
        unmount = mount(ref.current);
        onLoaded?.();
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError(err);
      });
    return () => {
      cancelled = true;
      unmount?.();
    };
  }, [onLoaded]);

  if (error) {
    return (
      <section className="panel slot-error">
        <h2>Catálogo indisponível</h2>
        <p>
          O microfrontend Vue não respondeu. Ele está rodando em <code>http://localhost:3002</code>?
        </p>
        <p className="muted">
          Isto também mostra o isolamento de falhas: o resto da página continua funcionando.
        </p>
      </section>
    );
  }

  return <div ref={ref} className="slot" />;
}
