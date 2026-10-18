import { describe, expect, it } from "vitest";
import { allergenConflict, parseAvoid, productAllergens } from "./allergens";

const POCKY = { allergens: "Contains: wheat, milk, soy.", ingredients: "wheat flour, sugar, whole milk powder, cocoa powder, soy lecithin, salt" };
const BAR = { allergens: "Contains almonds. Made in a facility that also processes peanuts, sesame and milk.", ingredients: "almonds, dates, sea salt" };

describe("product allergens (FDA 9)", () => {
  it("splits Contains from cross-contact", () => {
    expect(productAllergens(POCKY)).toMatchObject({ contains: ["milk", "wheat", "soy"], mayContain: [], verifiable: true });
    expect(productAllergens(BAR)).toMatchObject({ contains: ["tree_nuts"], mayContain: ["milk", "peanuts", "sesame"], verifiable: true });
  });
  it("plant milks and nut butters aren't dairy", () => {
    expect(productAllergens({ allergens: "Contains: almonds, peanuts.", ingredients: "oat milk, peanut butter, almond butter, cocoa butter" }).issues).toEqual([]);
  });
  it("an ingredient missing from the Contains statement is inconsistent", () => {
    const r = productAllergens({ allergens: "Contains: almonds.", ingredients: "almonds, whey protein, honey" });
    expect(r.verifiable).toBe(false);
    expect(r.issues[0]).toMatch(/milk/);
    expect(productAllergens({ allergens: "Contains: none.", ingredients: "oats, sesame seeds" }).issues[0]).toMatch(/says none/);
  });
  it("one-line statements split Contains from 'may contain' mid-sentence", () => {
    expect(productAllergens({ allergens: "almonds, peanuts, soy, may contain sesame/other tree nuts", ingredients: "almonds, peanuts, honey, soy lecithin" }))
      .toMatchObject({ contains: ["tree_nuts", "peanuts", "soy"], mayContain: ["sesame"], verifiable: true });
  });
  it("refined soybean oil isn't a soy ingredient; soy lecithin is", () => {
    expect(productAllergens({ allergens: "Contains wheat.", ingredients: "wheat flour, soybean oil, salt" }).issues).toEqual([]);
    expect(productAllergens({ allergens: "Contains wheat.", ingredients: "wheat flour, soy lecithin" }).issues[0]).toMatch(/soy/);
  });
  it("no statement can't be verified", () => {
    expect(productAllergens({ allergens: null, ingredients: "oats" }).verifiable).toBe(false);
  });
});

describe("customer exclusions are hard constraints", () => {
  it("parses free text into structured allergens", () => {
    expect(parseAvoid("Tree nuts, Dairy, sesame please")).toEqual(["milk", "tree_nuts", "sesame"]);
    expect(parseAvoid("gluten; shellfish; eggs")).toEqual(["egg", "shellfish", "wheat"]);
    expect(parseAvoid("no cilantro")).toEqual([]);
  });
  it("contains or cross-contact conflicts; unverifiable blocks; clean passes", () => {
    expect(allergenConflict(BAR, ["sesame"])).toMatch(/cross-contact.*sesame/);
    expect(allergenConflict(POCKY, ["milk"])).toMatch(/contains milk/);
    expect(allergenConflict({ allergens: null, ingredients: "oats" }, ["sesame"])).toMatch(/can't be verified/);
    expect(allergenConflict(BAR, ["egg", "fish"])).toBeNull();
    expect(allergenConflict({ allergens: null, ingredients: "oats" }, [])).toBeNull();
  });
});
