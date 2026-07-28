import { BrandLockup } from "@/src/components/brand-lockup";

const footerLinks = [
  ["Inicio", "/#inicio"],
  ["Partidos", "/partidos"],
  ["Clasificación", "/clasificacion"],
  ["Actualidad", "/actualidad"],
] as const;

function formattedSync(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  })
    .format(new Date(value))
    .replace(".", "");
}

export function SiteFooter({
  generatedAt,
  sourceLabel,
}: {
  generatedAt: string;
  sourceLabel: string;
}) {
  return (
    <footer className="site-footer">
      <div className="page-container footer-inner">
        <div className="footer-primary">
          <BrandLockup compact />
          <nav aria-label="Navegación secundaria">
            {footerLinks.map(([label, href]) => (
              <a href={href} key={href}>
                {label}
              </a>
            ))}
          </nav>
        </div>
        <div className="footer-meta">
          <span>Actualizado {formattedSync(generatedAt)}</span>
          <span>Fuente: {sourceLabel}</span>
          <span>Uso personal · Datos sujetos a confirmación oficial</span>
        </div>
      </div>
    </footer>
  );
}
