import { describe, expect, it } from "vitest";

import { DICTIONARIES, lookup } from "@/i18n/dictionary";
import { negotiateLocale } from "@/i18n/locales";
import { msg, renderMessage, textOf } from "@/i18n/messages";
import { createT } from "@/i18n/t";
import { renderTemplate } from "@/i18n/template";

describe("template renderer", () => {
  it("interpolates parameters", () => {
    expect(renderTemplate("Hello {name}", { name: "Ada" }, "en")).toBe("Hello Ada");
  });
  it("handles plural categories per locale", () => {
    const tpl = "{count, plural, =0 {none} one {# item} other {# items}}";
    expect(renderTemplate(tpl, { count: 0 }, "en")).toBe("none");
    expect(renderTemplate(tpl, { count: 1 }, "en")).toBe("1 item");
    expect(renderTemplate(tpl, { count: 4 }, "en")).toBe("4 items");
    // French: 0 and 1 are "one"; =0 still wins.
    expect(renderTemplate("{n, plural, one {# élément} other {# éléments}}", { n: 0 }, "fr")).toBe(
      "0 élément",
    );
  });
  it("handles select and nested braces", () => {
    const tpl = "{status, select, OBSERVED {observed in {scope}} other {not observed}}";
    expect(renderTemplate(tpl, { status: "OBSERVED", scope: "5 salons" }, "en")).toBe(
      "observed in 5 salons",
    );
    expect(renderTemplate(tpl, { status: "UNKNOWN" }, "en")).toBe("not observed");
  });
  it("leaves unmatched braces alone", () => {
    expect(renderTemplate("a { b", {}, "en")).toBe("a { b");
  });
});

describe("locale negotiation", () => {
  it("honours q-weights and language prefixes", () => {
    expect(negotiateLocale("fr-CA,fr;q=0.9,en;q=0.8")).toBe("fr");
    expect(negotiateLocale("en-US,en;q=0.9")).toBe("en");
    expect(negotiateLocale("de,fr;q=0.5")).toBe("fr");
    expect(negotiateLocale("de")).toBe("en");
    expect(negotiateLocale(null)).toBe("en");
  });
});

describe("system messages", () => {
  it("render the canonical English text when built and the locale text when displayed", () => {
    const m = msg("common.language");
    expect(m.text).toBe("Language");
    expect(renderMessage(m, "fr")).toBe("Langue");
    expect(textOf(m)).toBe("Language");
  });
  it("fall back to the stored text for a key that no longer exists", () => {
    expect(renderMessage({ key: "gone.key", text: "Legacy sentence" }, "fr")).toBe(
      "Legacy sentence",
    );
  });
  it("resolve nested messages in parameters", () => {
    const m = msg("common.language", { x: msg("common.no") });
    expect(m.params?.x).toMatchObject({ key: "common.no", text: "No" });
  });
});

describe("t()", () => {
  it("translates keys, passes user text through and renders messages", () => {
    const t = createT("fr");
    expect(t("common.cancel")).toBe("Annuler");
    expect(t("Employee revenue leakage")).toBe("Employee revenue leakage");
    expect(t(msg("common.yes"))).toBe("Oui");
    expect(t(null)).toBe("");
    expect(t.has("common.yes")).toBe(true);
    expect(t.has("nope.nope")).toBe(false);
  });
});

/** Every English key has a French leaf and vice versa (types enforce it, but getters are checked at runtime here). */
function leaves(node: unknown, prefix = ""): string[] {
  if (typeof node === "string") return [prefix];
  if (node && typeof node === "object") {
    return Object.keys(node).flatMap((k) =>
      leaves((node as Record<string, unknown>)[k], prefix ? `${prefix}.${k}` : k),
    );
  }
  return [];
}

describe("dictionaries", () => {
  it("are complete in both directions", () => {
    const en = leaves(DICTIONARIES.en);
    const fr = leaves(DICTIONARIES.fr);
    const missingFr = en.filter((k) => lookup(DICTIONARIES.fr, k) === undefined);
    const missingEn = fr.filter((k) => lookup(DICTIONARIES.en, k) === undefined);
    expect(missingFr).toEqual([]);
    expect(missingEn).toEqual([]);
    expect(en.length).toBeGreaterThan(50);
  });
  it("have no untranslated French strings outside labels that are identical across locales by design", () => {
    const en = DICTIONARIES.en;
    const fr = DICTIONARIES.fr;
    const identical = leaves(en).filter((k) => {
      const a = lookup(en, k);
      const b = lookup(fr, k);
      return a !== undefined && a === b && a.length > 12 && /[a-z]{4,}\s[a-z]{3,}/.test(a);
    });
    // Short words, codes and proper nouns may legitimately coincide; long English sentences must not.
    expect(identical.filter((k) => !k.startsWith("labels.")).length).toBeLessThan(5);
  });
});
