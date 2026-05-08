// Shared template data — used by the home page (gallery section) and the
// dedicated /templates browse page. Slugs MUST match backend TEMPLATES dict
// in backend/main.py.

import React from "react";

export type TemplateOption = {
  slug: string;
  name: string;
  bestFor: string;
  description: string;
  icon: (props: { className?: string }) => React.ReactNode;
};

export const TEMPLATES: TemplateOption[] = [
  {
    slug: "saas",
    name: "SaaS / Tech",
    bestFor: "Software, platforms, dev tools",
    description:
      "Hero with category line and benefit headline, dual CTAs, customer logo wall, three-pillar features, deeper feature explainer with UI mockup, social proof, pricing teaser, final CTA. Modern geometric typography, indigo or violet accent.",
    icon: ({ className = "" }) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="2" y1="20" x2="22" y2="20" />
        <line x1="8" y1="10" x2="16" y2="10" />
        <line x1="8" y1="14" x2="13" y2="14" />
      </svg>
    ),
  },
  {
    slug: "restaurant",
    name: "Restaurant / Food",
    bestFor: "Cafes, bistros, fine dining",
    description:
      "Big food photo hero, restaurant name prominent, Reserve a Table CTA. Welcome story, menu highlights, atmosphere, hours and address, reviews. Warm earth tones or upscale navy and gold. Editorial serif headlines.",
    icon: ({ className = "" }) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2" />
        <path d="M5 2v20" />
        <path d="M14 2v20" />
        <path d="M19 2c-1.5 0-3 1-3 5v3c0 2 1 3 3 3v9" />
      </svg>
    ),
  },
  {
    slug: "portfolio",
    name: "Portfolio / Freelancer",
    bestFor: "Designers, photographers, writers",
    description:
      "Name + role hero, selected work grid, services or skills, about with photo, client testimonials, contact CTA. Minimal black and white with one accent, or bold creative palette. Editorial display headlines.",
    icon: ({ className = "" }) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    slug: "ecommerce",
    name: "E-commerce / DTC",
    bestFor: "Shops, brands, products",
    description:
      "Lifestyle hero, Shop Now CTA, featured products grid with prices, brand story, customer reviews with photos, trust badges, newsletter with discount. Brand-distinctive bold palette. Punchy modern typography.",
    icon: ({ className = "" }) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    slug: "lawfirm",
    name: "Law Firm / Pro Services",
    bestFor: "Lawyers, accountants, consultants",
    description:
      "Trust-led hero, firm specialty, Schedule a Consultation CTA. Practice areas, attorneys with portraits, case results, contact with offices. Navy, burgundy, charcoal, gold. Serif headlines for editorial gravitas.",
    icon: ({ className = "" }) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 3v18" />
        <path d="M5 8h14" />
        <path d="M5 8l-3 9c0 1.5 2 2 4 2s4-.5 4-2L7 8" />
        <path d="M19 8l-3 9c0 1.5 2 2 4 2s4-.5 4-2l-3-9" />
        <path d="M9 21h6" />
      </svg>
    ),
  },
  {
    slug: "startup",
    name: "Startup / App Launch",
    bestFor: "Apps, waitlists, early-stage",
    description:
      "App mockup hero, Get Early Access CTA, waitlist count, three-pillar features with icons, how-it-works steps, founders, press mentions, email signup. Bold gradient accents. Mobile-first feel.",
    icon: ({ className = "" }) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
        <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
      </svg>
    ),
  },
];
