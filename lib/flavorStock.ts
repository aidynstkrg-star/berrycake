// Shared by the baker (production) and cashier screens so both see the same
// remaining stock of baked semi-finished goods (п/ф) per flavor.

export type ProductionRow = { flavor: string | null; quantity: number | null; defects?: number | null };
export type OrderRow = { cake_flavor: string | null; quantity: number | null; status?: string | null };

export function calcFlavorBalance(production: ProductionRow[], orders: OrderRow[]): Record<string, number> {
  const balance: Record<string, number> = {};

  production.forEach((p) => {
    if (!p.flavor) return;
    const good = (p.quantity || 0) - (p.defects || 0);
    balance[p.flavor] = (balance[p.flavor] || 0) + good;
  });

  orders.forEach((o) => {
    if (o.status === "cancelled") return;
    const rawParts = (o.cake_flavor || "").split(" + ").map((f) => f.trim()).filter(Boolean);
    if (!rawParts.length) return;
    const totalQty = o.quantity || 1;

    rawParts.forEach((part) => {
      const m = part.match(/^(.*?)\s*×\s*(\d+)$/);
      const name = m ? m[1].trim() : part;
      const partQty = m ? parseInt(m[2], 10) : totalQty / rawParts.length;
      balance[name] = (balance[name] || 0) - partQty;
    });
  });

  return balance;
}
