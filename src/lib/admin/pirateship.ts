// Pirate Ship round trip: export packed boxes for its spreadsheet batch import, then import
// its shipment-history CSV to record what each label actually cost (and its tracking).
// Pirate Ship lets you map columns on import and its export headers vary, so matching here
// is by header pattern rather than exact names.

/** RFC-4180-ish CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  row.push(field);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

export type LabelRow = {
  ref: string | null;
  tracking: string | null;
  costCents: number | null;
  carrier: string | null;
  service: string | null;
  zone: number | null;
  date: string | null;
};

const find = (headers: string[], ...patterns: RegExp[]) => {
  for (const p of patterns) {
    const i = headers.findIndex((h) => p.test(h));
    if (i >= 0) return i;
  }
  return -1;
};

const money = (v: string | undefined) => {
  if (!v) return null;
  const x = Number(v.replace(/[$,\s]/g, ""));
  return Number.isFinite(x) ? Math.round(x * 100) : null;
};

export function readLabelCsv(text: string): { rows: LabelRow[]; missing: string[] } {
  const [head, ...body] = parseCsv(text);
  if (!head) return { rows: [], missing: ["header row"] };
  const h = head.map((x) => x.trim().toLowerCase());
  const col = {
    ref: find(h, /order\s*(id|number|#)/, /reference/, /^order$/, /memo|note/),
    tracking: find(h, /tracking/),
    cost: find(h, /^(total\s*)?cost/, /label\s*(cost|price)/, /postage/, /^total/, /amount|price/),
    carrier: find(h, /carrier/),
    service: find(h, /service|mail\s*class/),
    zone: find(h, /zone/),
    date: find(h, /ship\s*date|created|date/),
  };
  const missing = [col.tracking < 0 && col.ref < 0 ? "tracking or order reference" : null, col.cost < 0 ? "cost" : null].filter(Boolean) as string[];
  const get = (r: string[], i: number) => (i >= 0 ? r[i]?.trim() || null : null);
  return {
    missing,
    rows: body.map((r) => ({
      ref: get(r, col.ref),
      tracking: get(r, col.tracking),
      costCents: money(get(r, col.cost) ?? undefined),
      carrier: get(r, col.carrier),
      service: get(r, col.service),
      zone: (() => {
        const z = Number.parseInt(get(r, col.zone) ?? "", 10);
        return z >= 1 && z <= 9 ? z : null;
      })(),
      date: get(r, col.date),
    })),
  };
}

/** Find which shipment a label belongs to: our KEN-###### code in the reference, else tracking. */
export function matchLabel(
  row: LabelRow,
  shipments: { id: string; code: string; tracking: string | null }[],
): string | null {
  const code = `${row.ref ?? ""}`.toUpperCase().match(/KEN-\d{6}/)?.[0];
  if (code) return shipments.find((s) => s.code === code)?.id ?? null;
  if (row.tracking) return shipments.find((s) => s.tracking && s.tracking.replace(/\s/g, "") === row.tracking!.replace(/\s/g, ""))?.id ?? null;
  return null;
}

export type ExportShipment = {
  code: string;
  name: string | null;
  email: string | null;
  address: { line1?: string | null; line2?: string | null; city?: string | null; state?: string | null; postal_code?: string | null; country?: string | null } | null;
  weightOz: number | null;
  dims: { l: number; w: number; h: number } | null;
  box: string;
};

export function exportRows(list: ExportShipment[]) {
  return list.map((s) => {
    const oz = Math.ceil(s.weightOz ?? 0);
    return {
      "Order ID": s.code,
      Name: s.name ?? "",
      Email: s.email ?? "",
      Address: s.address?.line1 ?? "",
      "Address 2": s.address?.line2 ?? "",
      City: s.address?.city ?? "",
      State: s.address?.state ?? "",
      Zipcode: s.address?.postal_code ?? "",
      Country: s.address?.country ?? "US",
      Pounds: Math.floor(oz / 16),
      Ounces: oz % 16,
      Length: s.dims?.l ?? "",
      Width: s.dims?.w ?? "",
      Height: s.dims?.h ?? "",
      Description: `Keniya ${s.box} box (snacks)`,
    };
  });
}
