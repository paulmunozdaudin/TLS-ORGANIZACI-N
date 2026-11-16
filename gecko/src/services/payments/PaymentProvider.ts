/**
 * Contrato del proveedor de pagos.
 *
 * Hoy solo existe `SimulatedPaymentProvider` (saldo ficticio, sin dinero real).
 * Cuando el modelo esté validado legalmente, se añadirá una implementación real
 * (p. ej. autorización + captura con un PSP) SIN tocar la app: las pantallas y el
 * store solo conocen esta interfaz.
 *
 * Importante para la versión real: `release` y `forfeit` no se invocarán desde el
 * cliente, sino desde el backend tras verificar el compromiso en servidor.
 */
export interface PaymentProvider {
  readonly mode: 'simulation' | 'live';
  /** Retiene el importe comprometido. Lanza si no hay fondos. Devuelve la referencia de la retención. */
  hold(amountCents: number, commitmentId: string): Promise<string>;
  /** Compromiso cumplido: devuelve el importe retenido. */
  release(amountCents: number, commitmentId: string): Promise<void>;
  /** Compromiso incumplido: aplica la penalización sobre el importe retenido. */
  forfeit(amountCents: number, commitmentId: string): Promise<void>;
}
