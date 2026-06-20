import { buildPulse, type PulseInput } from '../lib/pulse';

export function DayPulse(props: PulseInput) {
  const { greet, lead, hint } = buildPulse(props);
  return (
    <div className="day-pulse">
      <p className="pulse-greet">{greet}</p>
      <strong className="pulse-lead">{lead}</strong>
      <p className="pulse-hint">{hint}</p>
    </div>
  );
}
