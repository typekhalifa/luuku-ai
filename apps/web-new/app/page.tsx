import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Navigation } from "@/components/layout/Navigation";

import { Hero } from "@/sections/Hero";
import { SocialProof } from "@/sections/SocialProof";
import { Capabilities } from "@/sections/Capabilities";
import { BuiltInProduction } from "@/sections/BuiltInProduction";
import { CaseStudies } from "@/sections/CaseStudies";
import { FinalStatement } from "@/sections/FinalStatement";

import { Footer } from "@/components/layout/Footer";

export default function Home() {
  return (
    <main className="overflow-x-hidden bg-luuku-950">
      <AnnouncementBar />
      <Navigation />

      <Hero />
      <SocialProof />
      <Capabilities />
      <BuiltInProduction />
      <CaseStudies />
      <FinalStatement />

      <Footer />
    </main>
  );
}