import type { Metadata } from "next";
import { site } from "@/lib/site";

export const socialCards = {
  default: { headline: "Snack boxes with a why.", subtitle: "A little care. A lot to unwrap.", photo: "hero-box.jpg", color: "#ffe38a" },
  pregnancy_comfort: { headline: "Pregnancy Comfort Box", subtitle: "A little care for the journey ahead.", photo: "box-pregnancy.jpg", color: "#c5b3ee" },
  blood_sugar: { headline: "Blood Sugar Box", subtitle: "Thoughtful picks. Plenty to unwrap.", photo: "box-blood-sugar.jpg", color: "#a9d4f5" },
  heart: { headline: "Heart Wellness Box", subtitle: "A little care, packed for you.", photo: "box-heart.jpg", color: "#ff796c" },
  gestational_diabetes: { headline: "Gestational Diabetes Box", subtitle: "Thoughtfully chosen for this chapter.", photo: "box-gestational-diabetes.jpg", color: "#b7e5cc" },
  glp1: { headline: "GLP-1 Companion Box", subtitle: "A thoughtful companion to your day.", photo: "box-glp1.jpg", color: "#ffe38a" },
  postpartum: { headline: "Postpartum & Nursing Box", subtitle: "For feeds, naps and long nights.", photo: "box-postpartum.jpg", color: "#f7b8cc" },
  gifts: { headline: "Send a little care.", subtitle: "Thoughtful snack gifts, packed for them.", photo: "lifestyle-gift.jpg", color: "#f7b8cc" },
  corporate: { headline: "Good gifts. Great people.", subtitle: "Thoughtful snack boxes for your team.", photo: "hero-box.jpg", color: "#a9d4f5" },
  about: { headline: "Care in every detail.", subtitle: "Meet Keniya. Snack boxes with a why.", photo: "hero-box.jpg", color: "#b7e5cc" },
} as const;

export type SocialCard = keyof typeof socialCards;

export function socialImage(card: SocialCard = "default") {
  return {
    url: `/og/${card}`,
    width: 1200,
    height: 630,
    alt: `Keniya. ${socialCards[card].headline} ${socialCards[card].subtitle}`,
  };
}

/** Metadata merges shallowly: supply both networks when overriding page copy. */
export function socialMetadata(title: string, description: string, path: string, card: SocialCard = "default"): Metadata {
  return {
    openGraph: { type: "website", locale: "en_US", siteName: site.name, url: path, title, description, images: [socialImage(card)] },
    twitter: { card: "summary_large_image", title, description, images: [socialImage(card)] },
  };
}
