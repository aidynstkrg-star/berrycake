// Shared by the baker (production) and cashier screens so both see the same
// remaining stock of baked semi-finished goods (п/ф) per flavor + size.

export type ProductionRow = { flavor: string | null; quantity: number | null; defects?: number | null; size?: string | null };
export type OrderRow = { cake_flavor: string | null; quantity: number | null; status?: string | null };

export const SIZES = ["S", "M", "L"] as const;

export function flavorSizeKey(flavor: string, size: string): string {
  return `${flavor}|${size}`;
}

export function calcFlavorBalance(production: ProductionRow[], orders: OrderRow[]): Record<string, number> {
  const balance: Record<string, number> = {};

  production.forEach((p) => {
    if (!p.flavor || !p.size) return;
    const good = (p.quantity || 0) - (p.defects || 0);
    const k = flavorSizeKey(p.flavor, p.size);
    balance[k] = (balance[k] || 0) + good;
  });

  orders.forEach((o) => {
    if (o.status === "cancelled") return;
    const rawParts = (o.cake_flavor || "").split(" + ").map((f) => f.trim()).filter(Boolean);
    if (!rawParts.length) return;
    const totalQty = o.quantity || 1;

    rawParts.forEach((part) => {
      // "ВУПИ S ×3" or "ВУПИ S" (single-flavor order, size but no explicit qty)
      const m = part.match(/^(.+?)\s+(S|M|L)(?:\s*×\s*(\d+))?$/);
      if (!m) return; // legacy orders saved before sizes were tracked — can't attribute
      const name = m[1].trim();
      const size = m[2];
      const partQty = m[3] ? parseInt(m[3], 10) : totalQty / rawParts.length;
      const k = flavorSizeKey(name, size);
      balance[k] = (balance[k] || 0) - partQty;
    });
  });

  return balance;
}

export function flavorTotalBalance(balance: Record<string, number>, flavor: string): number {
  return SIZES.reduce((sum, sz) => sum + (balance[flavorSizeKey(flavor, sz)] || 0), 0);
}
