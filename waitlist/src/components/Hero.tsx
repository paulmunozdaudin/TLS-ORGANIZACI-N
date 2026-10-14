import { hero } from "@/content/landing";
import PhoneMatch from "./PhoneMatch";
import WaitlistForm from "./WaitlistForm";
import Wordmark from "./Wordmark";

export default function Hero() {
  return (
    <section id="lista" aria-labelledby="hero-title" className="grid lg:grid-cols-[1.15fr_1fr]">
      <div className="flex flex-col px-5 pt-6 pb-16 sm:px-10 lg:min-h-svh lg:px-14 lg:pt-10 lg:pb-14">
        <header className="flex items-center justify-between">
          <Wordmark />
          <a href={hero.topLink.href} className="link text-step-small lg:hidden">
            {hero.topLink.label}
          </a>
        </header>

        <div className="mt-[8svh] lg:mt-[clamp(2.5rem,9svh,6rem)]">
          <h1 id="hero-title" className="lines display text-[clamp(2.6rem,0.6rem+4.6vw,5.25rem)] max-sm:text-[10.6vw]">
            {hero.title.map((line, i) => (
              <span key={line} className="line">
                <span data-line style={{ "--i": i } as React.CSSProperties}>
                  {line}
                </span>
              </span>
            ))}
          </h1>
          <p data-rise style={{ "--i": 0 } as React.CSSProperties} className="mt-6 max-w-[36ch] text-balance text-step-lead leading-[1.35] text-ink">
            {hero.lead}
          </p>
        </div>

        <div data-rise style={{ "--i": 1 } as React.CSSProperties} className="mt-10 max-w-[42rem]">
          <WaitlistForm drivesPreview note={hero.formNote} />
        </div>
      </div>

      <div className="relative bg-surface lg:sticky lg:top-0 lg:h-svh lg:self-start">
        <a href={hero.topLink.href} className="link absolute top-10 right-14 hidden text-step-small lg:block">
          {hero.topLink.label}
        </a>
        <div className="flex h-full flex-col items-center justify-center gap-6 px-5 py-16 lg:py-10">
          <div className="drift">
            <PhoneMatch />
          </div>
          <p className="max-w-[30ch] text-center text-step-small text-muted">{hero.phoneCaption}</p>
        </div>
      </div>
    </section>
  );
}
