import { useEffect, useState } from 'react';

export function StatRing({
  value,
  max,
  display,
  label
}: {
  value: number;
  max: number;
  display: string;
  label: string;
}) {
  const radius = 30;
  const circ = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const target = circ * (1 - pct);

  const [ready, setReady] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="stat-ring">
      <svg viewBox="0 0 72 72">
        <circle className="ring-track" cx="36" cy="36" r={radius} />
        <circle
          className="ring-value"
          cx="36"
          cy="36"
          r={radius}
          style={{ strokeDasharray: circ, strokeDashoffset: ready ? target : circ }}
        />
      </svg>
      <div className="stat-ring-center">
        <strong>{display}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
