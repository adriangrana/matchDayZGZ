export default function NewsLoading() {
  return (
    <main className="news-page page-container" aria-busy="true">
      <div className="news-page-header">
        <span className="loading-line loading-line-small" />
        <span className="loading-line loading-line-title" />
        <span className="loading-line" />
      </div>
      <div className="news-loading-grid" aria-label="Cargando noticias">
        {Array.from({ length: 6 }, (_, index) => (
          <div className="news-loading-card" key={index}>
            <span />
            <div>
              <i />
              <i />
              <i />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

