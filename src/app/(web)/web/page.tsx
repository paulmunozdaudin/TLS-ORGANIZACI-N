import { ArrowDown, ArrowRight, QrCode } from "lucide-react";
import TreeRings from "@/components/web/TreeRings";
import WaitlistForm from "@/components/web/WaitlistForm";
import Reveal from "@/components/web/Reveal";
import TiltCard from "@/components/web/TiltCard";
import RingScroll from "@/components/web/RingScroll";
import SpeciesExplorer from "@/components/web/SpeciesExplorer";
import { BRAND } from "@/lib/web/brand";
import { woodUrl } from "@/lib/web/wood";

const NAV = [
  { href: "#materia", label: "Materia" },
  { href: "#lineas", label: "Colecciones" },
  { href: "#pasaporte", label: "Pasaporte" },
  { href: "#taller", label: "El taller" },
];

const MARQUEE = [
  "Madera recuperada",
  "Hecho a mano",
  "Pieza única",
  "Tali",
  "Bambú",
  "Mukulungu",
  "Taller de mujeres",
  "Origen documentado",
];

const LINES = [
  {
    n: "I",
    wood: "bambu",
    light: false,
    label: "Accesorios",
    title: "Joyería de madera",
    text: "Collares, pulseras y pendientes ligeros, de líneas limpias. Cada veta es distinta, así que cada pieza también.",
    meta: "Desde 25 €",
  },
  {
    n: "II",
    wood: "tali",
    light: false,
    label: "Experiencias",
    title: "Talleres de creación",
    text: "Sesiones en grupo reducido para crear tu propia pieza: aprendes oficio, te llevas algo tuyo y conoces el taller por dentro.",
    meta: "Grupos de 6–8 personas",
  },
  {
    n: "III",
    wood: "mukulungu",
    light: true,
    label: "Colección Origen",
    title: "Piezas de autor",
    text: "Iluminación, objetos de escritorio y accesorios tecnológicos en series cortas y numeradas, con certificado de origen digital.",
    meta: "Series de 30 unidades",
  },
];

const PASSPORT = [
  ["Madera", "Mukulungu"],
  ["Vida anterior", "Tarima de muelle"],
  ["Recuperada", "Marzo 2026"],
  ["Artesana", "Lucía M."],
  ["Horas de taller", "14 h"],
  ["Serie", "07 / 30"],
];

export default function WebHome() {
  const dark = woodUrl("mukulungu");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="fixed inset-x-0 top-0 z-40 text-crema mix-blend-difference">
        <div className="web-container flex h-20 items-center justify-between">
          <a href="#" className="font-display text-2xl tracking-tight">
            {BRAND.name}
          </a>
          <nav className="hidden gap-9 text-sm md:flex">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="opacity-70 transition hover:opacity-100">
                {item.label}
              </a>
            ))}
          </nav>
          <a href="#lista" className="rounded-full border border-crema/60 px-5 py-2 text-sm transition hover:bg-crema hover:text-tinta">
            Únete
          </a>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero sobre mukulungu en penumbra */}
        <section className="relative isolate flex min-h-[100svh] items-center overflow-hidden bg-tinta text-crema">
          <div className="absolute inset-0 -z-10 bg-cover opacity-60" style={{ backgroundImage: dark }} />
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_70%_50%,transparent_0%,rgb(20_14_10/0.7)_55%,rgb(12_9_7/0.95)_100%)]" />

          <div className="web-container grid items-center gap-10 pb-16 pt-28 md:grid-cols-[1.15fr_1fr]">
            <div>
              <p className="eyebrow text-miel">{BRAND.tagline}</p>
              <h1 className="mt-6 font-display text-[clamp(3rem,8vw,7rem)] leading-[0.95] tracking-tight">
                Madera que ya
                <br />
                tuvo{" "}
                <span className="wood-text italic" style={{ backgroundImage: woodUrl("tali") }}>
                  una vida.
                </span>
              </h1>
              <p className="mt-8 max-w-md text-lg leading-relaxed text-crema/70">
                Recuperamos tali, mukulungu y bambú y los convertimos en joyería y objetos de
                diseño, hechos a mano por mujeres artesanas. Piezas para la siguiente vida.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <a href="#lineas" className="web-btn bg-crema text-tinta hover:bg-miel">
                  Descubrir las piezas <ArrowRight className="h-4 w-4" />
                </a>
                <a href="#taller" className="web-btn border border-crema/30 text-crema hover:border-crema">
                  Conocer el taller
                </a>
              </div>
            </div>

            <div className="relative mx-auto w-[min(80vw,32rem)]">
              <div className="ember absolute inset-[30%] rounded-full" />
              <TreeRings draw rings={22} className="spin-slow relative w-full text-miel/80" />
            </div>
          </div>

          <a
            href="#materia"
            aria-label="Seguir bajando"
            className="absolute bottom-8 left-1/2 -translate-x-1/2 text-crema/50 transition hover:text-crema"
          >
            <ArrowDown className="h-5 w-5 animate-bounce" />
          </a>
        </section>

        {/* Cinta de chapa de bambú grabada */}
        <div className="relative overflow-hidden border-y border-black/20 py-5" style={{ backgroundImage: woodUrl("bambu") }}>
          <div className="oil-sheen absolute inset-0" />
          <div className="marquee flex w-max gap-12 whitespace-nowrap">
            {[...MARQUEE, ...MARQUEE].map((word, i) => (
              <span key={i} className="engraved font-display text-2xl italic sm:text-3xl">
                {word} <span className="ml-12 not-italic">✦</span>
              </span>
            ))}
          </div>
        </div>

        {/* Manifiesto */}
        <section className="py-28 sm:py-36">
          <div className="web-container">
            <Reveal>
              <p className="eyebrow">Manifiesto</p>
              <p className="mt-8 max-w-5xl font-display text-[clamp(2rem,4.5vw,3.75rem)] leading-[1.12] tracking-tight">
                Hay maderas que tardaron{" "}
                <span className="wood-text italic" style={{ backgroundImage: woodUrl("tali") }}>
                  un siglo
                </span>{" "}
                en crecer y acaban en un contenedor. Nosotras las rescatamos, las escuchamos y
                les damos una forma que{" "}
                <span className="wood-text italic" style={{ backgroundImage: woodUrl("mukulungu") }}>
                  dure otro siglo más.
                </span>
              </p>
            </Reveal>
          </div>
        </section>

        <RingScroll />

        {/* Materia */}
        <section id="materia" className="scroll-mt-20 py-28">
          <div className="web-container">
            <Reveal className="mb-14 max-w-2xl">
              <p className="eyebrow">Materia</p>
              <h2 className="mt-4 font-display text-4xl tracking-tight sm:text-6xl">
                Tres maderas. Ninguna igual.
              </h2>
            </Reveal>
            <Reveal>
              <SpeciesExplorer />
            </Reveal>
          </div>
        </section>

        {/* Colecciones */}
        <section id="lineas" className="scroll-mt-20 bg-papel py-28">
          <div className="web-container">
            <Reveal className="max-w-2xl">
              <p className="eyebrow">Colecciones</p>
              <h2 className="mt-4 font-display text-4xl tracking-tight sm:text-6xl">
                Tres formas de llevarte un trozo de historia.
              </h2>
            </Reveal>
            <div className="mt-16 grid gap-6 lg:grid-cols-3">
              {LINES.map((line, i) => (
                <Reveal key={line.n} delay={i * 120}>
                  <TiltCard className="overflow-hidden rounded-[1.75rem] bg-crema shadow-xl shadow-corteza/10">
                    <div
                      className="relative flex aspect-[4/3] items-end justify-between bg-cover p-7"
                      style={{ backgroundImage: woodUrl(line.wood) }}
                    >
                      <div className="oil-sheen absolute inset-0" />
                      <span className={`engraved relative font-display text-7xl ${line.light ? "engraved-light" : ""}`}>
                        {line.n}
                      </span>
                      <span className={`engraved relative text-xs uppercase tracking-[0.2em] ${line.light ? "engraved-light" : ""}`}>
                        {line.label}
                      </span>
                    </div>
                    <div className="p-7">
                      <h3 className="font-display text-3xl">{line.title}</h3>
                      <p className="mt-4 text-sm leading-relaxed text-tinta/70">{line.text}</p>
                      <p className="mt-8 flex items-center justify-between border-t border-tinta/10 pt-4 text-sm font-medium">
                        {line.meta}
                        <ArrowRight className="h-4 w-4 text-madera" />
                      </p>
                    </div>
                  </TiltCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Pasaporte grabado en chapa de bambú */}
        <section id="pasaporte" className="relative isolate scroll-mt-20 overflow-hidden bg-tinta py-28 text-crema">
          <div className="absolute inset-0 -z-10 bg-cover opacity-25" style={{ backgroundImage: dark }} />
          <div className="web-container grid items-center gap-16 md:grid-cols-2">
            <Reveal>
              <p className="eyebrow text-miel">Trazabilidad</p>
              <h2 className="mt-4 font-display text-4xl tracking-tight sm:text-6xl">
                Cada pieza tiene pasaporte.
              </h2>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-crema/70">
                Grabamos a láser un código en cada pieza. Al escanearlo descubres qué madera
                es, qué vida tuvo antes, quién la trabajó y cuántas horas lleva dentro. En la
                Colección Origen es además un certificado digital verificable e intransferible.
              </p>
            </Reveal>
            <Reveal delay={150}>
              <TiltCard
                className="mx-auto w-full max-w-sm overflow-hidden rounded-[1.5rem] bg-cover p-8 shadow-2xl shadow-black/60"
                style={{ backgroundImage: woodUrl("bambu") }}
              >
                <div className="oil-sheen absolute inset-0 rounded-[1.5rem]" />
                <div className="relative">
                  <div className="flex items-start justify-between">
                    <div className="engraved">
                      <p className="text-[0.65rem] uppercase tracking-[0.25em]">Pasaporte de pieza</p>
                      <p className="mt-1 font-display text-3xl">Lámpara Brasa</p>
                    </div>
                    <QrCode className="engraved h-12 w-12" strokeWidth={1.25} />
                  </div>
                  <dl className="engraved mt-8 text-sm">
                    {PASSPORT.map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 border-b border-[rgb(60_35_15/0.25)] py-2.5">
                        <dt className="opacity-70">{k}</dt>
                        <dd className="text-right font-semibold">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="engraved mt-6 text-[0.65rem] uppercase tracking-[0.25em] opacity-70">
                    Ejemplo ilustrativo
                  </p>
                </div>
              </TiltCard>
            </Reveal>
          </div>
        </section>

        {/* El taller */}
        <section id="taller" className="scroll-mt-20 py-28">
          <div className="web-container">
            <Reveal className="grid gap-12 md:grid-cols-[1fr_1.2fr]">
              <div>
                <p className="eyebrow">El taller</p>
                <h2 className="mt-4 font-display text-4xl tracking-tight sm:text-6xl">
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
                  materiales nobles, con acabados cuidados y piezas pensadas para durar
                  décadas.
                </p>
              </div>
            </Reveal>
            <div className="mt-16 grid gap-px overflow-hidden rounded-[1.75rem] bg-tinta/10 sm:grid-cols-3">
              {[
                ["Mujeres", "formadas y contratadas en el taller"],
                ["100 %", "madera recuperada o de cultivo certificado"],
                ["1 a 1", "cada pieza con su origen documentado"],
              ].map(([big, small], i) => (
                <Reveal key={big} delay={i * 120} className="bg-crema p-8">
                  <p className="font-display text-5xl tracking-tight">{big}</p>
                  <p className="mt-3 text-sm text-tinta/60">{small}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Lista de espera */}
        <section id="lista" className="relative isolate scroll-mt-20 overflow-hidden bg-tinta py-28 text-crema">
          <div className="absolute inset-0 -z-10 bg-cover opacity-50" style={{ backgroundImage: dark }} />
          <div className="ember absolute -right-32 top-1/2 -z-10 h-96 w-96 -translate-y-1/2 rounded-full" />
          <div className="web-container grid items-center gap-12 md:grid-cols-2">
            <Reveal>
              <h2 className="font-display text-4xl tracking-tight sm:text-6xl">
                Estamos abriendo el taller.
              </h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-crema/70">
                Apúntate y te avisamos de la primera colección, las fechas de los talleres y
                las plazas de formación.
              </p>
            </Reveal>
            <Reveal delay={150}>
              <WaitlistForm />
            </Reveal>
          </div>
        </section>
      </main>

      {/* Pie: el nombre grabado en una tabla de tali */}
      <footer className="relative overflow-hidden bg-cover" style={{ backgroundImage: woodUrl("tali") }}>
        <div className="oil-sheen absolute inset-0" />
        <div className="web-container relative py-14">
          <p className="engraved font-display text-[clamp(4rem,16vw,13rem)] leading-none tracking-tight">
            {BRAND.name}
          </p>
          <div className="engraved mt-8 flex flex-col justify-between gap-4 text-sm sm:flex-row">
            <p>{BRAND.tagline}</p>
            <div className="flex gap-6">
              <a href={`mailto:${BRAND.email}`} className="hover:underline">
                {BRAND.email}
              </a>
              <a href={BRAND.instagram} className="hover:underline">
                Instagram
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
