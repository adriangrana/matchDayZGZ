"use client";

import { useState } from "react";
import type { Team } from "@/src/domain/models";
import { getTeamBadgeUrl } from "@/src/services/team-branding";

export function TeamMark({
  team,
  featured = false,
  size = "normal",
}: {
  team: Team;
  featured?: boolean;
  size?: "tiny" | "small" | "normal";
}) {
  const badgeUrl = getTeamBadgeUrl(team.id);
  const [failedUrl, setFailedUrl] = useState<string>();
  const showBadge = Boolean(badgeUrl && failedUrl !== badgeUrl);
  const classes = [
    "team-mark",
    featured ? "team-mark-featured" : "",
    `team-mark-${size}`,
    showBadge ? "team-mark-loaded" : "team-mark-empty",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      aria-hidden={!showBadge}
      className={classes}
      data-team-id={team.id}
      role={showBadge ? "img" : undefined}
      aria-label={showBadge ? `Escudo de ${team.name}` : undefined}
    >
      {showBadge ? (
        // TheSportsDB devuelve arte remoto dinámico; el proveedor ya ha
        // validado HTTPS, MIME, dimensiones, equipo y tipo de recurso.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          decoding="async"
          height={featured ? 66 : size === "tiny" ? 22 : size === "small" ? 34 : 40}
          loading={featured ? "eager" : "lazy"}
          onError={() => setFailedUrl(badgeUrl)}
          referrerPolicy="no-referrer"
          src={badgeUrl}
          width={featured ? 66 : size === "tiny" ? 22 : size === "small" ? 34 : 40}
        />
      ) : null}
    </span>
  );
}
