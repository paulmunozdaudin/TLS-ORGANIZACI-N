import ClosingCta from "@/components/ClosingCta";
import Communities from "@/components/Communities";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import IdeasTabs from "@/components/IdeasTabs";
import PeopleBoard from "@/components/PeopleBoard";
import Statement from "@/components/Statement";
import { WaitlistProvider } from "@/components/WaitlistProvider";

/**
 * Orden de secciones de la landing. Para quitar, mover o añadir una sección,
 * cambia esta lista; los textos viven en src/content/landing.ts.
 */
export default function Home() {
  return (
    <WaitlistProvider>
      <main>
        <Hero />
        <Statement />
        <PeopleBoard />
        <IdeasTabs />
        <Communities />
        <ClosingCta />
      </main>
      <Footer />
    </WaitlistProvider>
  );
}
