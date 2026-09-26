"use client";

import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { verifyFinancePin, setStoredPin } from "@/lib/finance";

export default function PinGate({
  workspaceId,
  onUnlock,
}: {
  workspaceId: string;
  onUnlock: (pin: string) => void;
}) {
  const [pin, setPin] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pin.trim()) return;
    setChecking(true);
    setError(null);
    const ok = await verifyFinancePin(workspaceId, pin.trim());
    setChecking(false);
    if (!ok) {
      setError("PIN incorrecto. Inténtalo de nuevo.");
      return;
    }
    setStoredPin(pin.trim());
    onUnlock(pin.trim());
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 text-white shadow-lg shadow-slate-900/20">
          <Lock className="h-5 w-5" />
        </div>
        <h1 className="mt-5 text-center text-lg font-semibold text-slate-900">
          Finanzas de TLS
        </h1>
        <p className="mt-1.5 text-center text-sm text-slate-500">
          Esta sección está protegida. Introduce el PIN del equipo.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
          <input
            autoFocus
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN"
            className="input text-center text-lg tracking-[0.3em]"
          />
          {error && <p className="text-center text-sm text-rose-600">{error}</p>}
          <button
            type="submit"
            disabled={!pin.trim() || checking}
            className="btn-primary flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {checking && <Loader2 className="h-4 w-4 animate-spin" />}
            {checking ? "Comprobando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
