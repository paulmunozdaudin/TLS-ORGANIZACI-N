"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, TrendingDown, TrendingUp, Trash2, Wallet } from "lucide-react";
import { listFinanceEntries, deleteFinanceEntry, clearStoredPin } from "@/lib/finance";
import FinanceEntryModal from "./FinanceEntryModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Avatar from "@/components/ui/Avatar";
import { parseDateOnly } from "@/lib/date";
import type { FinanceEntry } from "@/lib/types";

const CATEGORY_COLORS = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#008300",
  "#4a3aa7",
  "#e34948",
];
const OTHER_COLOR = "#9c9b95";

const currency = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

const monthFormatter = new Intl.DateTimeFormat("es-ES", { month: "short" });

export default function FinanceDashboard({
  workspaceId,
  pin,
  onInvalidPin,
}: {
  workspaceId: string;
  pin: string;
  onInvalidPin: () => void;
}) {
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<FinanceEntry | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const reload = () => setReloadToken((t) => t + 1);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data, error: err } = await listFinanceEntries(workspaceId, pin);
      if (cancelled) return;
      if (err) {
        if (err.toLowerCase().includes("pin")) {
          clearStoredPin();
          onInvalidPin();
          return;
        }
        setError(err);
      } else {
        setEntries(data || []);
        setError(null);
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, pin, reloadToken, onInvalidPin]);

  async function handleDelete(entry: FinanceEntry) {
    await deleteFinanceEntry(workspaceId, pin, entry.id);
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
  }

  const totalIngresos = useMemo(
    () => entries.filter((e) => e.type === "ingreso").reduce((sum, e) => sum + e.amount, 0),
    [entries]
  );
  const totalGastos = useMemo(
    () => entries.filter((e) => e.type === "gasto").reduce((sum, e) => sum + e.amount, 0),
    [entries]
  );
  const balance = totalIngresos - totalGastos;

  const monthly = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; net: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: monthFormatter.format(d),
        net: 0,
      });
    }
    const byKey = new Map(months.map((m) => [m.key, m]));
    for (const e of entries) {
      const d = parseDateOnly(e.entry_date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const month = byKey.get(key);
      if (!month) continue;
      month.net += e.type === "ingreso" ? e.amount : -e.amount;
    }
    return months;
  }, [entries]);

  const maxAbsNet = Math.max(1, ...monthly.map((m) => Math.abs(m.net)));

  const categoryBreakdown = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of entries) {
      if (e.type !== "gasto") continue;
      const cat = e.category?.trim() || "Sin categoría";
      totals.set(cat, (totals.get(cat) || 0) + e.amount);
    }
    const sorted = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 8).map(([label, value], i) => ({
      label,
      value,
      color: CATEGORY_COLORS[i],
    }));
    const restTotal = sorted.slice(8).reduce((sum, [, v]) => sum + v, 0);
    if (restTotal > 0) top.push({ label: "Otros", value: restTotal, color: OTHER_COLOR });
    return top;
  }, [entries]);
  const maxCategoryValue = Math.max(1, ...categoryBreakdown.map((c) => c.value));

  const sortedEntries = useMemo(
    () =>
      [...entries].sort(
        (a, b) =>
          new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime() ||
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [entries]
  );

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-10">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-100">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
          <Wallet className="h-5 w-5 text-slate-700" />
          Finanzas
        </h1>
        <p className="text-sm text-slate-500">Balance total de la company y movimientos.</p>
      </div>

      {/* Hero + stat tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card col-span-1 flex flex-col justify-center gap-1 p-6 sm:col-span-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Balance total
          </span>
          <span
            className={`text-5xl font-semibold ${balance >= 0 ? "text-[#006300]" : "text-rose-600"}`}
          >
            {currency.format(balance)}
          </span>
        </div>

        <div className="card flex items-center gap-3 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Ingresos totales</p>
            <p className="text-lg font-semibold text-slate-900">{currency.format(totalIngresos)}</p>
          </div>
        </div>

        <div className="card flex items-center gap-3 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <TrendingDown className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Gastos totales</p>
            <p className="text-lg font-semibold text-slate-900">{currency.format(totalGastos)}</p>
          </div>
        </div>

        <div className="card flex items-center gap-3 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Movimientos</p>
            <p className="text-lg font-semibold text-slate-900">{entries.length}</p>
          </div>
        </div>
      </div>

      {/* Monthly net chart */}
      <div className="card p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Balance mensual (últimos 6 meses)</h2>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#0ca30c]" /> Superávit
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" /> Déficit
            </span>
          </div>
        </div>

        <div className="mt-6 flex items-stretch justify-center gap-4 sm:gap-8">
          {monthly.map((m) => (
            <div key={m.key} className="flex flex-col items-center gap-1">
              <div className="flex h-16 w-6 flex-col items-center justify-end">
                {m.net > 0 && (
                  <div
                    title={currency.format(m.net)}
                    className="w-full rounded-t-[4px] bg-[#0ca30c]"
                    style={{ height: `${(m.net / maxAbsNet) * 64}px` }}
                  />
                )}
              </div>
              <div className="h-px w-8 bg-slate-300" />
              <div className="flex h-16 w-6 flex-col items-center justify-start">
                {m.net < 0 && (
                  <div
                    title={currency.format(m.net)}
                    className="w-full rounded-b-[4px] bg-rose-500"
                    style={{ height: `${(Math.abs(m.net) / maxAbsNet) * 64}px` }}
                  />
                )}
              </div>
              <span className="mt-1 text-xs capitalize text-slate-500">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Category breakdown */}
      {categoryBreakdown.length > 0 && (
        <div className="card p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-slate-800">Gastos por categoría</h2>
          <div className="mt-4 flex flex-col gap-2.5">
            {categoryBreakdown.map((c) => (
              <div key={c.label} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-xs text-slate-600">{c.label}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(c.value / maxCategoryValue) * 100}%`,
                      backgroundColor: c.color,
                    }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right text-xs font-medium text-slate-700">
                  {currency.format(c.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Movements list */}
      <div className="card p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Movimientos</h2>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" /> Añadir movimiento
          </button>
        </div>

        {sortedEntries.length === 0 ? (
          <p className="mt-6 text-center text-sm text-slate-400">
            Todavía no hay movimientos registrados.
          </p>
        ) : (
          <div className="mt-4 flex flex-col divide-y divide-slate-100">
            {sortedEntries.map((entry) => (
              <div key={entry.id} className="group flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{entry.concept}</p>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Avatar name={entry.added_by} size={16} />
                    {entry.added_by} · {entry.entry_date}
                    {entry.category && <> · {entry.category}</>}
                  </div>
                </div>
                <span
                  className={`shrink-0 text-sm font-semibold ${
                    entry.type === "ingreso" ? "text-[#006300]" : "text-rose-600"
                  }`}
                >
                  {entry.type === "ingreso" ? "+" : "−"}
                  {currency.format(entry.amount)}
                </span>
                <button
                  onClick={() => setDeleting(entry)}
                  className="shrink-0 rounded-lg p-1.5 text-slate-300 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {creating && (
        <FinanceEntryModal
          workspaceId={workspaceId}
          pin={pin}
          onClose={() => setCreating(false)}
          onAdded={reload}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Eliminar movimiento"
          message={`¿Seguro que quieres eliminar "${deleting.concept}"?`}
          onConfirm={() => handleDelete(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
