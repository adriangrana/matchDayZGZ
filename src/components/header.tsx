import { BrandLockup } from "@/src/components/brand-lockup";
import { SyncButton } from "@/src/components/sync-button";
import { ThemeSelector } from "@/src/components/theme-selector";

const links = [
  ["home", "Inicio", "/#inicio"],
  ["matches", "Partidos", "/partidos"],
  ["standings", "Clasificación", "/clasificacion"],
  ["news", "Actualidad", "/actualidad"],
] as const;

export type HeaderSection = (typeof links)[number][0];

export function Header({ active = "home" }: { active?: HeaderSection }) {
  return (
    <header className="site-header">
      <div className="page-container header-inner">
        <BrandLockup />

        <nav aria-label="Navegación principal">
          {links.map(([section, label, href]) => (
            <a
              aria-current={active === section ? "page" : undefined}
              className={active === section ? "active" : undefined}
              href={href}
              key={href}
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="header-actions">
          <SyncButton />
          <ThemeSelector />
        </div>
      </div>
    </header>
  );
}
