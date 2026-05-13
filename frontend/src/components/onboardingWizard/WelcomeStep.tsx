import type { StepProps } from './types';

export function WelcomeStep({ onAdvance }: StepProps) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: 72 }}>🦉</div>
      <h1 style={{ marginTop: 16 }}>Ciao! Sono il tuo coach.</h1>
      <p style={{ color: '#666' }}>Imparare una lingua, 5 minuti al giorno.</p>
      <button
        type="button"
        onClick={() => onAdvance({})}
        style={{ marginTop: 32, padding: '14px 32px', fontSize: 16, borderRadius: 999 }}
      >
        Inizia
      </button>
      <p style={{ marginTop: 12, fontSize: 12, color: '#999' }}>Nessun account richiesto</p>
    </div>
  );
}
