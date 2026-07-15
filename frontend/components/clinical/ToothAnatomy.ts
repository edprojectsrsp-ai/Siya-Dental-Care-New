export type ToothShape = "incisor" | "canine" | "premolar" | "molar";

export function toothShape(n: number): ToothShape {
  const pos = n % 10;
  if (pos <= 2) return "incisor";
  if (pos === 3) return "canine";
  if (pos <= 5) return "premolar";
  return "molar";
}

const POS_NAMES: Record<number, string> = {
  1: "Central Incisor",
  2: "Lateral Incisor",
  3: "Canine",
  4: "First Premolar",
  5: "Second Premolar",
  6: "First Molar",
  7: "Second Molar",
  8: "Third Molar",
};

const QUAD_ADULT: Record<number, string> = {
  1: "Upper Right",
  2: "Upper Left",
  3: "Lower Left",
  4: "Lower Right",
};

const QUAD_CHILD: Record<number, string> = {
  5: "Upper Right",
  6: "Upper Left",
  7: "Lower Left",
  8: "Lower Right",
};

export function getToothAnatomy(n: number) {
  const quad = Math.floor(n / 10);
  const pos = n % 10;
  const isChild = n >= 51;
  const position = (isChild ? QUAD_CHILD : QUAD_ADULT)[quad] || "Unknown";
  const anatomical = POS_NAMES[pos] || "Tooth";
  const shape = toothShape(n);
  const typeLabel = shape === "incisor" ? "Incisor" : shape === "canine" ? "Canine" : shape === "premolar" ? "Premolar" : "Molar";
  return {
    fdi: n,
    position,
    anatomical,
    fullName: `${position} ${anatomical}`,
    type: typeLabel,
    arch: quad <= 2 || quad === 5 || quad === 6 ? "Upper" : "Lower",
  };
}