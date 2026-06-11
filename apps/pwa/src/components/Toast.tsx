import { useStore } from '../lib/store';

export function Toast() {
  const { toast } = useStore();
  return (
    <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">
      <span>{toast}</span>
    </div>
  );
}
