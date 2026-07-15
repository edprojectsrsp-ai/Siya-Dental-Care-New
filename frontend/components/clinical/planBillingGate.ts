export type PlanBillingBlocker = {
  id: string;
  treatment_name: string;
  reason: "unconfirmed" | "zero_rate";
  final_amount: number;
};

export function getPlanBillingBlockers(items: any[]): PlanBillingBlocker[] {
  const active = (items || []).filter((i: any) => i.status !== "cancelled");
  const blockers: PlanBillingBlocker[] = [];
  for (const item of active) {
    const pays = item.final_amount ?? Math.max(0, (item.doctor_rate ?? 0) - (item.discount ?? 0));
    if (pays <= 0) {
      blockers.push({ id: item.id, treatment_name: item.treatment_name, reason: "zero_rate", final_amount: pays });
    } else if (!item.price_confirmed) {
      blockers.push({ id: item.id, treatment_name: item.treatment_name, reason: "unconfirmed", final_amount: pays });
    }
  }
  return blockers;
}

export function isPlanBillingReady(items: any[]): boolean {
  return getPlanBillingBlockers(items).length === 0;
}

export function planBillingGateMessage(blockers: PlanBillingBlocker[]): string {
  if (!blockers.length) return "";
  const names = blockers.slice(0, 4).map(b =>
    b.reason === "zero_rate" ? `${b.treatment_name} (set rate)` : `${b.treatment_name} (tap Confirm)`
  );
  const more = blockers.length > 4 ? ` +${blockers.length - 4} more` : "";
  return `Confirm all treatments with non-zero rates on Treatment Plan first: ${names.join(", ")}${more}`;
}