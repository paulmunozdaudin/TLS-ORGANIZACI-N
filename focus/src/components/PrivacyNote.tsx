import { ShieldIcon } from './Icons';

export function PrivacyNote({ children }: { children?: React.ReactNode }) {
  return (
    <p className="privacy">
      <ShieldIcon />
      <span>{children ?? 'Todo ocurre en tu dispositivo. No se graba, guarda ni envía ninguna imagen.'}</span>
    </p>
  );
}
