"use client";

import { useState } from "react";
import type { NewsCategory } from "@/src/domain/models";

export function NewsImage({
  imageUrl,
  title,
  category,
  priority = false,
}: {
  imageUrl?: string;
  title: string;
  category: NewsCategory;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (!imageUrl || failed) {
    return (
      <div className="news-placeholder" aria-hidden="true">
        <span>MZ</span>
        <small>{category}</small>
      </div>
    );
  }

  return (
    <div className="news-image">
      {/* Remote editorial hosts are dynamic; server validation and this fallback
          protect the card without coupling the app to a fixed image allowlist. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        referrerPolicy="no-referrer"
        src={imageUrl}
        title={title}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
