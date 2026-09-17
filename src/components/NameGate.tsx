"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

export default function NameGate({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [name, setName] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border border-white/60 bg-white p-8 shadow-2xl shadow-indigo-950/10 animate-in fade-in zoom-in-95">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
          <Sparkles className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-center text-xl font-semibold tracking-tight text-slate-900">
          Bienvenido a TLS Organización
        </h1>
        <p className="mt-1.5 text-center text-sm text-slate-500">
          ¿Cómo te llamas? Usaremos tu nombre para identificar lo que añades o
          modificas.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            maxLength={40}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Entrar al espacio TLS
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-400">
          Solo se guarda en este navegador. No es necesario registrarse.
        </p>
      </div>
    </div>
  );
}
