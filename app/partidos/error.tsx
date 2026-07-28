"use client";

export default function MatchesError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="sports-page page-container">
      <div className="sports-inline-state" role="alert">
        <span aria-hidden="true">!</span>
        <div>
          <strong>No se ha podido cargar el calendario</strong>
          <p>Los datos guardados siguen a salvo. Puedes volver a intentarlo.</p>
        </div>
        <button onClick={reset} type="button">
          Reintentar
        </button>
      </div>
    </main>
  );
}
