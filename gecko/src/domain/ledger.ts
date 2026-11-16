import type { LedgerEntry, LedgerEntryKind, Wallet } from './types';

/**
 * Libro mayor del monedero. Reductores puros: mismo contrato que tendrá la tabla
 * `ledger_entries` en PostgreSQL (asientos inmutables, importes en céntimos).
 */

export class InsufficientFundsError extends Error {
  constructor() {
    super('Saldo insuficiente');
  }
}

function entry(kind: LedgerEntryKind, amountCents: number, commitmentId: string | null, at: number): LedgerEntry {
  return { id: `le_${at.toString(36)}_${Math.random().toString(36).slice(2, 8)}`, kind, amountCents, commitmentId, at };
}

export function deposit(w: Wallet, amountCents: number, at: number): Wallet {
  return {
    ...w,
    availableCents: w.availableCents + amountCents,
    ledger: [entry('deposit', amountCents, null, at), ...w.ledger],
  };
}

/** Retiene el dinero comprometido al crear un reto. */
export function hold(w: Wallet, amountCents: number, commitmentId: string, at: number): Wallet {
  if (amountCents > w.availableCents) throw new InsufficientFundsError();
  return {
    availableCents: w.availableCents - amountCents,
    heldCents: w.heldCents + amountCents,
    ledger: [entry('hold', amountCents, commitmentId, at), ...w.ledger],
  };
}

/** Reto cumplido: el dinero retenido vuelve al saldo disponible. */
export function release(w: Wallet, amountCents: number, commitmentId: string, at: number): Wallet {
  return {
    availableCents: w.availableCents + amountCents,
    heldCents: w.heldCents - amountCents,
    ledger: [entry('release', amountCents, commitmentId, at), ...w.ledger],
  };
}

/** Reto fallido: se aplica la penalización y el dinero retenido se pierde. */
export function forfeit(w: Wallet, amountCents: number, commitmentId: string, at: number): Wallet {
  return {
    ...w,
    heldCents: w.heldCents - amountCents,
    ledger: [entry('forfeit', amountCents, commitmentId, at), ...w.ledger],
  };
}
