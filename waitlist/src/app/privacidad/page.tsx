import type { Metadata } from "next";
import Link from "next/link";
import Wordmark from "@/components/Wordmark";
import { BRAND, CONTACT_EMAIL } from "@/config/site";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: `Cómo trata ${BRAND} los datos de la lista de espera.`,
  alternates: { canonical: "/privacidad" },
};

const UPDATED = "14 de octubre de 2026";

const sections: { title: string; body: React.ReactNode }[] = [
  {
    title: "Quién trata tus datos",
    body: (
      <p>
        El responsable es {BRAND} (titular: [NOMBRE Y APELLIDOS O RAZÓN SOCIAL], NIF [NIF], [DIRECCIÓN]).
        Puedes escribirnos a <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    ),
  },
  {
    title: "Qué datos guardamos",
    body: (
      <p>
        Tu email, tu ciudad, qué sabes hacer, qué buscas, el código de quien te invitó (si lo hubo), la
        fecha en que aceptaste esta política y una huella cifrada de tu IP que no permite saber cuál es.
      </p>
    ),
  },
  {
    title: "Para qué",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>Avisarte cuando la app esté disponible en tu ciudad.</li>
        <li>Saber en qué ciudades y perfiles hay más interés, para decidir por dónde empezar.</li>
        <li>Calcular tu puesto en la lista y las personas que se apuntan con tu enlace.</li>
        <li>Evitar registros automáticos y abusos.</li>
      </ul>
    ),
  },
  {
    title: "Base legal",
    body: (
      <p>
        Tu consentimiento, que das al marcar la casilla del formulario (art. 6.1.a del RGPD). Puedes
        retirarlo cuando quieras, sin que afecte a lo hecho antes.
      </p>
    ),
  },
  {
    title: "Cuánto tiempo",
    body: (
      <p>
        Hasta que la app se lance en tu ciudad y te avisemos, o hasta que nos pidas borrarlos. Si el
        proyecto no sale adelante, los borramos.
      </p>
    ),
  },
  {
    title: "Con quién se comparten",
    body: (
      <p>
        Con nadie para fines comerciales. Los guardan nuestros proveedores técnicos como encargados del
        tratamiento: Supabase (base de datos) y Vercel (alojamiento web). Pueden implicar transferencias
        fuera del Espacio Económico Europeo, amparadas por las cláusulas contractuales tipo de la
        Comisión Europea.
      </p>
    ),
  },
  {
    title: "Tus derechos",
    body: (
      <p>
        Puedes pedir acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a{" "}
        <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Si crees que no
        hemos atendido bien tu petición, puedes reclamar ante la Agencia Española de Protección de Datos
        (aepd.es).
      </p>
    ),
  },
  {
    title: "Cookies",
    body: <p>Esta web no usa cookies de seguimiento ni de publicidad.</p>,
  },
];

export default function PrivacyPage() {
  return (
    <div className="px-5 pt-6 pb-24 sm:px-10 lg:px-14 lg:pt-10">
      <header className="flex items-center justify-between">
        <Wordmark />
        <Link href="/" className="link text-step-small">
          Volver
        </Link>
      </header>

      <main className="mx-auto mt-20 max-w-[42rem] lg:mt-32">
        <h1 className="display text-step-head">Política de privacidad</h1>
        <p className="mt-4 text-step-small text-muted">Actualizada el {UPDATED}.</p>
        <p className="mt-10 text-step-lead leading-[1.4]">
          Solo pedimos lo necesario para avisarte y saber dónde abrir primero. No vendemos tus datos ni te
          mandamos publicidad.
        </p>
        <div className="mt-14 grid gap-12">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-step-lead font-semibold tracking-[-0.02em]">{s.title}</h2>
              <div className="mt-3 leading-[1.6]">{s.body}</div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
