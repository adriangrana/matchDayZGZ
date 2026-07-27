import Link from "next/link";
import { DemoBadge } from "@/src/components/demo-badge";

const links = [
  ["Inicio", "/#inicio"],
  ["Partidos", "/#partidos"],
  ["Clasificación", "/#clasificacion"],
  ["Actualidad", "/actualidad"],
] as const;

export function Header() {
  return (
    <header className="site-header">
      <div className="page-container header-inner">
        <Link className="brand" href="/#inicio" aria-label="MatchDay ZGZ, inicio">
          <span className="brand-mark">MZ</span>
          <span className="brand-copy">
            <strong>MatchDay</strong>
            <small>ZGZ</small>
          </span>
        </Link>

        <nav aria-label="Navegación principal">
          {links.map(([label, href]) => (
            <Link href={href} key={href}>
              {label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          <DemoBadge />
          <a
            className="profile-button"
            href="#demo-area-personal"
            aria-label="Área personal, disponible en una fase posterior"
            title="Área personal · Próximamente"
          >
            <span aria-hidden="true">●</span>
          </a>
        </div>
      </div>
    </header>
  );
}
