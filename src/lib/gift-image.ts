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
    ? { src: LIFESTYLE, alt: "A pregnant woman smiling as she opens her Keniya snack box", width: 1600, height: 1200 }
    : { src: "/images/box-pregnancy.jpg", alt: "Keniya Pregnancy Comfort Box with Packed for You guide", width: 1600, height: 1200 };
}
