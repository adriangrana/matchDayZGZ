"use client";

export default function NewsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="news-state page-container">
      <span className="news-state-mark" aria-hidden="true">!</span>
      <p className="eyebrow">Actualidad</p>
      <h1>No hemos podido cargar las noticias</h1>
      <p>
        Puedes intentarlo de nuevo. MatchDay ZGZ conservará el último contenido
        válido cuando esté disponible.
      </p>
      <button onClick={reset}>Reintentar</button>
    </main>
  );
}

