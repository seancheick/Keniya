import { describe, expect, it } from "vitest";
import { exportRows, matchLabel, parseCsv, readLabelCsv } from "./pirateship";

describe("CSV", () => {
  it("handles quotes, commas, CRLF and BOM", () => {
    expect(parseCsv('﻿a,b\r\n"x, y","say ""hi"""\r\n\r\n')).toEqual([["a", "b"], ["x, y", 'say "hi"']]);
  });
});

describe("Pirate Ship import", () => {
  const csv = [
    "Created Date,Recipient,Order ID,Tracking Number,Carrier,Service,Zone,Cost",
    '10/04/2026,Ana,KEN-000143,9400111899223344556677,USPS,Ground Advantage,4,"$8.14"',
    "10/04/2026,Bo,,9400111899220000000001,USPS,Ground Advantage Cubic,6,7.02",
  ].join("\n");

  it("reads cost, tracking, zone by header pattern", () => {
    const { rows, missing } = readLabelCsv(csv);
    expect(missing).toEqual([]);
    expect(rows[0]).toMatchObject({ ref: "KEN-000143", costCents: 814, zone: 4, service: "Ground Advantage" });
    expect(rows[1]).toMatchObject({ ref: null, costCents: 702, zone: 6 });
  });

  it("matches by our code first, then by tracking", () => {
    const ships = [
      { id: "a", code: "KEN-000143", tracking: null },
      { id: "b", code: "KEN-000144", tracking: "9400 1118 9922 0000 0000 01" },
    ];
    const { rows } = readLabelCsv(csv);
    expect(matchLabel(rows[0], ships)).toBe("a");
    expect(matchLabel(rows[1], ships)).toBe("b");
  });

  it("export splits weight into lb + oz", () => {
    const [r] = exportRows([{ code: "KEN-000001", name: "A", email: null, address: { line1: "1 Main", city: "X", state: "CA", postal_code: "90001" }, weightOz: 29.4, dims: { l: 12, w: 9, h: 4 }, box: "Heart" }]);
    expect(r).toMatchObject({ Pounds: 1, Ounces: 14, Length: 12, "Order ID": "KEN-000001" });
  });
});
