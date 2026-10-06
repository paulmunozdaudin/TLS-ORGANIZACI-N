"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { BRAND } from "@/lib/web/brand";

const INTERESTS = ["Piezas", "Talleres", "Colección Origen", "Formación para artesanas"];

// Mientras no haya backend para la lista de espera, el formulario abre el
// correo del visitante con el mensaje ya redactado.
export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [interest, setInterest] = useState(INTERESTS[0]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(`Lista de espera — ${interest}`);
    const body = encodeURIComponent(
      `Hola, quiero enterarme de las novedades de ${BRAND.name}.\n\nMe interesa: ${interest}\nMi correo: ${email}`,
    );
    window.location.href = `mailto:${BRAND.email}?subject=${subject}&body=${body}`;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {INTERESTS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setInterest(option)}
            aria-pressed={interest === option}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              interest === option
                ? "border-crema bg-crema text-musgo"
                : "border-crema/30 text-crema/80 hover:border-crema/70"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="waitlist-email" className="sr-only">
          Tu correo
        </label>
        <input
          id="waitlist-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.com"
          className="min-w-0 flex-1 rounded-full border border-crema/30 bg-transparent px-5 py-3 text-crema outline-none placeholder:text-crema/50 focus:border-crema"
        />
        <button type="submit" className="web-btn bg-miel text-tinta hover:bg-crema">
          Avisadme <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
