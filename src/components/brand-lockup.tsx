/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element */

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <a
      className={compact ? "brand brand-compact" : "brand"}
      href="/#inicio"
      aria-label="MatchDay ZGZ, inicio"
    >
      <span className="brand-symbol" aria-hidden="true">
        <img
          alt=""
          className="brand-symbol-image brand-symbol-dark"
          height="256"
          src="/brand/zg-mark-dark.png"
          width="256"
        />
        <img
          alt=""
          className="brand-symbol-image brand-symbol-light"
          height="256"
          src="/brand/zg-mark-light.png"
          width="256"
        />
      </span>
      <span className="brand-name" aria-hidden="true">
        <strong>MatchDay</strong>
        <span>ZGZ</span>
      </span>
    </a>
  );
}
