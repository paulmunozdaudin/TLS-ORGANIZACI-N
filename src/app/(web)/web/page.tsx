import { ArrowRight, Flame, Hammer, QrCode, Recycle, Users } from "lucide-react";
import TreeRings from "@/components/web/TreeRings";
import WaitlistForm from "@/components/web/WaitlistForm";
import { BRAND } from "@/lib/web/brand";

const NAV = [
  { href: "#origen", label: "Origen" },
  { href: "#piezas", label: "Piezas" },
  { href: "#talleres", label: "Talleres" },
  { href: "#coleccion", label: "Colección" },
  { href: "#taller", label: "Quiénes somos" },
];

const PROCESS = [
  {
    icon: Flame,
    title: "Recuperamos",
    text: "Restos de poda y limpieza forestal que alimentarían un incendio, madera de derribo controlado y bambú de cultivo certificado.",
  },
  {
    icon: Recycle,
    title: "Seleccionamos",
    text: "Secamos y clasificamos cada lote. Lo que no llega a pieza se convierte en piezas menores, en material de taller o en compost.",
  },
  {
    icon: Hammer,
    title: "Transformamos",
    text: "Mujeres artesanas formadas en nuestro taller diseñan, tornean, lijan y acaban cada pieza a mano.",
  },
  {
    icon: QrCode,
    title: "Documentamos",
    text: "Cada pieza lleva su pasaporte: de dónde vino la madera, quién la trabajó y cuándo. Su historia viaja con ella.",
  },
];

const LINES = [
  {
    id: "piezas",
    label: "Accesorios",
    title: "Joyería de madera recuperada",
    text: "Collares, pulseras y pendientes ligeros, de líneas limpias. Cada veta es distinta, así que cada pieza también.",
    meta: "Desde 25 €",
    tone: "bg-papel",
  },
  {
    id: "talleres",
    label: "Experiencias",
    title: "Talleres para crear tu pieza",
    text: "Sesiones en grupo reducido para hacer tu propia joya o pequeño objeto: aprendes oficio, te llevas algo tuyo y conoces el taller.",
    meta: "Grupos de 6–8 personas",
    tone: "bg-salvia/25",
  },
  {
    id: "coleccion",
    label: "Colección Origen",
    title: "Piezas de autor, numeradas",
    text: "Objetos de diseño contemporáneo en series cortas: iluminación, objetos de escritorio y accesorios tecnológicos, con certificado de origen digital.",
    meta: "Series de 30 unidades",
    tone: "bg-miel/30",
  },
];

export default function WebHome() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-tinta/10 bg-crema/85 backdrop-blur">
        <div className="web-container flex h-16 items-center justify-between">
          <a href="#" className="font-display text-2xl tracking-tight">
            {BRAND.name}
          </a>
          <nav className="hidden gap-7 text-sm text-tinta/70 md:flex">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="transition hover:text-tinta">
                {item.label}
              </a>
            ))}
          </nav>
          <a href="#lista" className="web-btn-dark px-4 py-2">
            Únete
          </a>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="overflow-hidden">
          <div className="web-container grid items-center gap-12 py-16 md:grid-cols-[1.1fr_1fr] md:py-24">
            <div>
              <p className="eyebrow">{BRAND.tagline}</p>
              <h1 className="mt-5 font-display text-5xl leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
                Madera que iba a arder.
                <br />
                <span className="italic text-corteza">Piezas que van a durar.</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-tinta/70">
                Rescatamos restos de poda, madera de derribo y bambú sostenible y los
                convertimos en joyería y objetos de diseño, hechos a mano por mujeres
                artesanas.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <a href="#piezas" className="web-btn-dark">
                  Ver las piezas <ArrowRight className="h-4 w-4" />
                </a>
                <a href="#talleres" className="web-btn-light">
                  Reservar un taller
                </a>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-md">
              <TreeRings className="w-full text-madera" rings={18} />
              <div className="absolute bottom-6 left-0 rounded-2xl bg-papel/95 px-5 py-4 shadow-lg shadow-corteza/10 sm:-left-6">
                <p className="text-xs uppercase tracking-[0.18em] text-tinta/50">Pieza nº 07/30</p>
                <p className="mt-1 font-display text-lg">Encina · Sierra de Gredos</p>
              </div>
            </div>
          </div>
        </section>

        {/* Origen */}
        <section id="origen" className="scroll-mt-16 border-y border-tinta/10 bg-papel py-20">
          <div className="web-container">
            <div className="max-w-2xl">
              <p className="eyebrow">Economía circular</p>
              <h2 className="mt-4 font-display text-4xl tracking-tight sm:text-5xl">
                Del monte al taller, sin desperdiciar nada.
              </h2>
            </div>
            <ol className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-tinta/10 bg-tinta/10 sm:grid-cols-2 lg:grid-cols-4">
              {PROCESS.map((step, i) => (
                <li key={step.title} className="flex flex-col gap-4 bg-papel p-7">
                  <div className="flex items-center justify-between">
                    <step.icon className="h-6 w-6 text-madera" strokeWidth={1.5} />
                    <span className="font-display text-sm text-tinta/40">0{i + 1}</span>
                  </div>
                  <h3 className="font-display text-2xl">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-tinta/70">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Líneas */}
        <section className="py-20">
          <div className="web-container">
            <p className="eyebrow">Lo que hacemos</p>
            <h2 className="mt-4 max-w-2xl font-display text-4xl tracking-tight sm:text-5xl">
              Tres formas de llevarte un trozo de bosque.
            </h2>
            <div className="mt-14 grid gap-5 lg:grid-cols-3">
              {LINES.map((line) => (
                <article
                  key={line.id}
                  id={line.id}
                  className={`flex scroll-mt-20 flex-col rounded-3xl p-8 ${line.tone}`}
                >
                  <TreeRings className="mb-8 h-28 w-28 text-corteza/70" rings={9} />
                  <p className="eyebrow">{line.label}</p>
                  <h3 className="mt-3 font-display text-2xl leading-tight">{line.title}</h3>
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-tinta/70">{line.text}</p>
                  <p className="mt-8 border-t border-tinta/10 pt-4 text-sm font-medium">
                    {line.meta}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Pasaporte de pieza */}
        <section className="bg-tinta py-20 text-crema">
          <div className="web-container grid items-center gap-12 md:grid-cols-2">
            <div>
              <p className="eyebrow text-miel">Trazabilidad</p>
              <h2 className="mt-4 font-display text-4xl tracking-tight sm:text-5xl">
                Cada pieza tiene pasaporte.
              </h2>
              <p className="mt-6 max-w-md leading-relaxed text-crema/70">
                Escanea el código grabado en la pieza y descubre el árbol del que salió,
                el motivo de su retirada, la artesana que la hizo y las horas de trabajo
                que lleva dentro. En la Colección Origen, ese registro es además un
                certificado digital verificable e intransferible.
              </p>
            </div>
            <div className="mx-auto w-full max-w-sm rounded-3xl bg-papel p-7 text-tinta shadow-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-tinta/50">
                    Pasaporte de pieza
                  </p>
                  <p className="mt-1 font-display text-2xl">Lámpara Brasa</p>
                </div>
                <QrCode className="h-10 w-10 text-tinta/80" strokeWidth={1.25} />
              </div>
              <dl className="mt-6 divide-y divide-tinta/10 text-sm">
                {[
                  ["Madera", "Encina (Quercus ilex)"],
                  ["Origen", "Poda preventiva · Ávila"],
                  ["Recuperada", "Marzo 2026"],
                  ["Artesana", "Lucía M."],
                  ["Horas de taller", "14 h"],
                  ["Serie", "07 de 30"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-2.5">
                    <dt className="text-tinta/50">{k}</dt>
                    <dd className="text-right font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-5 text-xs text-tinta/40">Ejemplo ilustrativo</p>
            </div>
          </div>
        </section>

        {/* El taller */}
        <section id="taller" className="scroll-mt-16 py-20">
          <div className="web-container grid gap-12 md:grid-cols-[1fr_1.2fr]">
            <div>
              <p className="eyebrow">El taller</p>
              <h2 className="mt-4 font-display text-4xl tracking-tight sm:text-5xl">
                Un oficio, un sueldo, una comunidad.
              </h2>
            </div>
            <div className="space-y-6 text-lg leading-relaxed text-tinta/75">
              <p>
                Nuestro taller está pensado para mujeres: formamos en carpintería fina y
                joyería en madera, y quienes completan la formación pueden incorporarse al
                equipo de producción con un empleo digno.
              </p>
              <p>
                No hacemos artesanía rústica. Trabajamos diseño contemporáneo con
                materiales naturales, con acabados cuidados y piezas pensadas para durar
                décadas.
              </p>
              <div className="grid gap-4 pt-4 sm:grid-cols-3">
                {[
                  { icon: Users, label: "Formación y empleo para mujeres" },
                  { icon: Recycle, label: "Material 100 % recuperado o certificado" },
                  { icon: QrCode, label: "Origen documentado pieza a pieza" },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-tinta/10 p-5">
                    <item.icon className="h-5 w-5 text-madera" strokeWidth={1.5} />
                    <p className="mt-3 text-sm leading-snug">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Lista de espera */}
        <section id="lista" className="scroll-mt-16 bg-musgo py-20 text-crema">
          <div className="web-container grid items-center gap-10 md:grid-cols-2">
            <div>
              <h2 className="font-display text-4xl tracking-tight sm:text-5xl">
                Estamos abriendo el taller.
              </h2>
              <p className="mt-5 max-w-md leading-relaxed text-crema/70">
                Apúntate y te avisamos de la primera colección, las fechas de los talleres
                y las plazas de formación.
              </p>
            </div>
            <WaitlistForm />
          </div>
        </section>
      </main>

      <footer className="border-t border-tinta/10 py-10">
        <div className="web-container flex flex-col justify-between gap-4 text-sm text-tinta/60 sm:flex-row">
          <p>
            <span className="font-display text-base text-tinta">{BRAND.name}</span> ·{" "}
            {BRAND.tagline}
          </p>
          <div className="flex gap-6">
            <a href={`mailto:${BRAND.email}`} className="hover:text-tinta">
              {BRAND.email}
            </a>
            <a href={BRAND.instagram} className="hover:text-tinta">
              Instagram
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
