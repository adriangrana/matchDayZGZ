"use client";

import { useEffect, useMemo, useState } from "react";

function getRemaining(targetDate: string) {
  const distance = Math.max(0, new Date(targetDate).getTime() - Date.now());
  const totalHours = Math.floor(distance / 3_600_000);

  return {
    days: Math.floor(totalHours / 24),
    hours: totalHours % 24,
    minutes: Math.floor((distance % 3_600_000) / 60_000),
    seconds: Math.floor((distance % 60_000) / 1_000),
  };
}

export function Countdown({ targetDate }: { targetDate: string }) {
  const initial = useMemo(() => getRemaining(targetDate), [targetDate]);
  const [remaining, setRemaining] = useState(initial);

  useEffect(() => {
    const timer = window.setInterval(
      () => setRemaining(getRemaining(targetDate)),
      1_000,
    );
    return () => window.clearInterval(timer);
  }, [targetDate]);

  const units = [
    ["DÍAS", remaining.days],
    ["HORAS", remaining.hours],
    ["MIN", remaining.minutes],
    ["SEG", remaining.seconds],
  ] as const;

  return (
    <div className="countdown" aria-label="Cuenta atrás para el partido">
      <span className="countdown-label">Faltan</span>
      <div className="countdown-units" aria-live="off">
        {units.map(([label, value]) => (
          <span className="countdown-unit" key={label}>
            <strong>{String(value).padStart(2, "0")}</strong>
            <small>{label}</small>
          </span>
        ))}
      </div>
    </div>
  );
}

