import { useEffect } from "react";
import "@/styles/romeo.css";
import RomeoNavbar from "@/components/romeo/RomeoNavbar";
import RomeoHero from "@/components/romeo/RomeoHero";
import RomeoAbout from "@/components/romeo/RomeoAbout";
import RomeoCaberu from "@/components/romeo/RomeoCaberu";
import RomeoTimeline from "@/components/romeo/RomeoTimeline";
import RomeoStack from "@/components/romeo/RomeoStack";
import RomeoContact from "@/components/romeo/RomeoContact";
import { FOOTER } from "@/components/romeo/romeo-constants";

export default function Romeo() {
  // Set page title and meta description
  useEffect(() => {
    const prev = document.title;
    document.title = "Romeo Jackson — Founder & CEO of Caberu";
    const meta = document.querySelector('meta[name="description"]');
    const prevDesc = meta?.getAttribute("content") ?? "";
    meta?.setAttribute(
      "content",
      "15-year-old founder building AI voice infrastructure for Belgian healthcare practices. CEO & Co-founder of Caberu."
    );
    return () => {
      document.title = prev;
      meta?.setAttribute("content", prevDesc);
    };
  }, []);

  return (
    <div className="romeo-site min-h-screen">
      <RomeoNavbar />
      <main>
        <RomeoHero />
        <RomeoAbout />
        <RomeoCaberu />
        <RomeoTimeline />
        <RomeoStack />
        <RomeoContact />
      </main>
      <footer className="border-t border-[#1E1E1E] py-8">
        <div className="max-w-6xl mx-auto px-6">
          <p className="r-body text-[#8A8A8A] text-xs tracking-wide text-center">{FOOTER.copyright}</p>
        </div>
      </footer>
    </div>
  );
}
