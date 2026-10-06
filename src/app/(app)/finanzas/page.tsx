"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { getStoredPin } from "@/lib/finance";
import PinGate from "@/components/finance/PinGate";
import FinanceDashboard from "@/components/finance/FinanceDashboard";

export default function FinanzasPage() {
  const { workspace, loading, error } = useWorkspace();
  const [pin, setPin] = useState<string | null>(() => getStoredPin());

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" /> Volver a TLS Organización
          </Link>
        </div>
      </header>

      {loading && (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      )}

      {!loading && (error || !workspace) && (
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-100">
            {error || "No se pudo cargar el workspace."}
          </p>
        </div>
      )}

      {!loading && workspace && (
        <>
          {pin ? (
            <FinanceDashboard
              workspaceId={workspace.id}
              pin={pin}
              onInvalidPin={() => setPin(null)}
            />
          ) : (
            <PinGate workspaceId={workspace.id} onUnlock={setPin} />
          )}
        </>
      )}
    </div>
  );
}
