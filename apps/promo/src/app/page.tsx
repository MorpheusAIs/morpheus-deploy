'use client';

import { RiveHero } from '@/components/rive-hero';
import { HowItWorksSection } from '@/components/how-it-works-section';
import { FeaturesSection } from '@/components/features-section';
import { PricingSection } from '@/components/pricing-section';
import { CTASection } from '@/components/cta-section';
import { Footer } from '@/components/footer';

export default function PromoPage() {
  return (
    <main className="min-h-screen bg-background">
      <RiveHero />
      <HowItWorksSection />
      <FeaturesSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </main>
  );
}
