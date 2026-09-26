"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { addFinanceEntry } from "@/lib/finance";
import { useUser } from "@/components/providers/UserProvider";
import type { FinanceType } from "@/lib/types";

export default function FinanceEntryModal({
  workspaceId,
  pin,
  onClose,
  onAdded,
}: {
  workspaceId: string;
  pin: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { userName } = useUser();
  const [type, setType] = useState<FinanceType>("gasto");
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userName || !concept.trim()) return;
    const numericAmount = Number(amount.replace(",", "."));
    if (!numericAmount || numericAmount <= 0) {
      setError("Introduce un importe válido, mayor que 0.");
      return;
    }
    setSaving(true);
    setError(null);
    const { error: rpcError } = await addFinanceEntry(workspaceId, pin, {
      type,
      concept: concept.trim(),
      amount: numericAmount,
      category: category.trim() || null,
      entryDate,
      addedBy: userName,
    });
    setSaving(false);
    if (rpcError) {
      setError(rpcError);
      return;
    }
    onAdded();
    onClose();
  }

  return (
    <Modal title="Añadir movimiento" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setType("ingreso")}
            className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
              type === "ingreso"
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            + Ingreso
          </button>
          <button
            type="button"
            onClick={() => setType("gasto")}
            className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
              type === "gasto"
                ? "border-rose-300 bg-rose-50 text-rose-700"
                : "border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            − Gasto
          </button>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500">Concepto</span>
          <input
            autoFocus
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder="Ej. Venta cliente X, alquiler sala…"
            className="input"
            maxLength={120}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-500">Importe (€)</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              inputMode="decimal"
              className="input"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-500">Fecha</span>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="input"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500">Categoría (opcional)</span>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Ej. Material, eventos, software…"
            className="input"
          />
        </label>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={saving || !concept.trim()} className="btn-primary">
            {saving ? "Guardando…" : "Añadir"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
