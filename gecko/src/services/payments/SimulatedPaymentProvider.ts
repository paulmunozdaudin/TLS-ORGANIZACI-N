import * as ledger from '@/domain/ledger';
import type { Wallet } from '@/domain/types';
import type { PaymentProvider } from './PaymentProvider';

interface WalletAccess {
  read: () => Wallet;
  write: (w: Wallet) => void;
}

/** Proveedor de simulación: opera sobre un monedero local con saldo ficticio. No mueve dinero real. */
export function createSimulatedPaymentProvider(wallet: WalletAccess): PaymentProvider {
  return {
    mode: 'simulation',
    async hold(amountCents, commitmentId) {
      const next = ledger.hold(wallet.read(), amountCents, commitmentId, Date.now());
      wallet.write(next);
      return next.ledger[0].id;
    },
    async release(amountCents, commitmentId) {
      wallet.write(ledger.release(wallet.read(), amountCents, commitmentId, Date.now()));
    },
    async forfeit(amountCents, commitmentId) {
      wallet.write(ledger.forfeit(wallet.read(), amountCents, commitmentId, Date.now()));
    },
  };
}
