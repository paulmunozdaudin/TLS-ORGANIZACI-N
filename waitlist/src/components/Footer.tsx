import { CONTACT_EMAIL } from "@/config/site";
import { footer } from "@/content/landing";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="grid gap-2 px-5 pt-[20svh] pb-6 text-step-small sm:px-10 lg:grid-cols-[1fr_auto_1fr] lg:items-baseline lg:gap-6 lg:px-14 lg:pt-[30svh] lg:pb-8">
      <p className="text-muted">{footer.tagline}</p>
      <nav aria-label="Pie de página" className="flex flex-wrap gap-x-6 gap-y-1">
        {footer.links.map((l) => (
          <a key={l.href} href={l.href} className="link text-ink">
            {l.label}
          </a>
        ))}
        <a href={`mailto:${CONTACT_EMAIL}`} className="link text-ink">
          Contacto
        </a>
      </nav>
      <p className="text-muted lg:text-right">© {year}</p>
    </footer>
  );
}
