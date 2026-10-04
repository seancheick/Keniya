import { existsSync } from "node:fs";
import path from "node:path";

/**
 * The lifestyle photo (pregnant woman opening her box) lands at this path when Sean sends
 * it. Checked at build time, so the gift sections switch over on the next deploy with no
 * code change, and never render a broken image before then.
 */
const LIFESTYLE = "/images/lifestyle-gift.jpg";

export function giftImage() {
  return existsSync(path.join(process.cwd(), "public", LIFESTYLE))
    ? { src: LIFESTYLE, alt: "A smiling pregnant woman receiving a Keniya Pregnancy Comfort Box at her door", width: 1370, height: 1148 }
    : {
        src: "/images/hero-box.jpg",
        alt: "An open Keniya box of 14 snacks with its Packed for You card",
        width: 1600,
        height: 1200,
      };
}
