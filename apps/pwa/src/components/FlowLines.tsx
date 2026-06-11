/**
 * Soft "running" gradient lines that drift behind the app — the signature
 * sport-app ambience. Pure CSS animation, GPU-friendly, pauses under
 * prefers-reduced-motion (handled in styles.css).
 */
export function FlowLines() {
  return (
    <div className="flow-lines" aria-hidden="true">
      <div className="flow-glow" />
      <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="flowGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--flow-a)" />
            <stop offset="0.5" stopColor="var(--flow-b)" />
            <stop offset="1" stopColor="var(--flow-c)" />
          </linearGradient>
        </defs>
        <g stroke="url(#flowGrad)" fill="none">
          <path className="flow-line f1" d="M-120 210 C 200 120, 420 300, 660 210 S 1060 120, 1340 220" />
          <path className="flow-line f2" d="M-120 360 C 250 300, 430 470, 690 380 S 1080 300, 1340 380" />
          <path className="flow-line f3" d="M-120 520 C 210 470, 470 610, 710 520 S 1080 450, 1340 540" />
          <path className="flow-line f4" d="M-120 670 C 260 620, 450 760, 720 660 S 1100 600, 1340 690" />
        </g>
      </svg>
    </div>
  );
}
