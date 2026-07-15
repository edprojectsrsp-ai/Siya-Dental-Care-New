import { getToothAnatomy } from "./ToothAnatomy";
import { teethForRegion, type ChartRegion } from "@/components/ToothWidget";

function sorted(teeth: number[]) {
  return [...teeth].sort((a, b) => a - b);
}

function sameSet(a: number[], b: number[]) {
  const sa = sorted(a);
  const sb = sorted(b);
  return sa.length === sb.length && sa.every((v, i) => v === sb[i]);
}

const REGION_LABELS: [ChartRegion, string][] = [
  ["full", "Full Mouth"],
  ["upper", "Upper Arch"],
  ["lower", "Lower Arch"],
  ["ur", "Upper Right Quadrant"],
  ["ul", "Upper Left Quadrant"],
  ["lr", "Lower Right Quadrant"],
  ["ll", "Lower Left Quadrant"],
];

const PRESETS: [number[], string][] = [
  [[11, 12, 21, 22, 31, 32, 41, 42], "All Incisors"],
  [[13, 23, 33, 43], "All Canines"],
  [[14, 15, 24, 25, 34, 35, 44, 45], "All Premolars"],
  [[16, 17, 18, 26, 27, 28, 36, 37, 38, 46, 47, 48], "All Molars"],
];

export type ToothSelectionKind = "single" | "arch" | "multi";

export function describeToothSelection(teeth: number[], child = false): {
  kind: ToothSelectionKind;
  label: string;
  subtitle: string;
  primaryTooth?: number;
  icon: string;
} {
  if (teeth.length === 0) {
    return { kind: "multi", label: "No teeth selected", subtitle: "Tap teeth on the chart", icon: "🦷" };
  }
  if (teeth.length === 1) {
    const info = getToothAnatomy(teeth[0]);
    return {
      kind: "single",
      label: `Tooth ${teeth[0]}`,
      subtitle: info.fullName,
      primaryTooth: teeth[0],
      icon: "🦷",
    };
  }

  for (const [region, label] of REGION_LABELS) {
    const regionTeeth = teethForRegion(region, child);
    if (sameSet(teeth, regionTeeth)) {
      return {
        kind: "arch",
        label,
        subtitle: `${teeth.length} teeth · FDI ${sorted(teeth)[0]}–${sorted(teeth)[sorted(teeth).length - 1]}`,
        icon: region === "upper" || region === "ur" || region === "ul" ? "⬆️" : region === "lower" || region === "lr" || region === "ll" ? "⬇️" : "🌐",
      };
    }
  }

  for (const [preset, label] of PRESETS) {
    if (sameSet(teeth, preset)) {
      return {
        kind: "arch",
        label,
        subtitle: `${teeth.length} teeth · ${sorted(teeth).join(", ")}`,
        icon: "🦷",
      };
    }
  }

  const s = sorted(teeth);
  const subtitle = s.length <= 6
    ? s.join(", ")
    : `${s.slice(0, 5).join(", ")}… +${s.length - 5} more`;

  return {
    kind: "multi",
    label: `${teeth.length} teeth grouped`,
    subtitle,
    icon: "🦷",
  };
}

/** Plan-item teeth / area → display group */
export function describePlanItemTeeth(item: { teeth?: number[]; area_label?: string | null }, child = false) {
  const teeth = item.teeth || [];
  if (item.area_label === "Full Mouth" || (teeth.length === 0 && item.area_label)) {
    return {
      label: item.area_label || "General",
      subtitle: "Not linked to individual teeth",
      kind: "arch" as const,
      teeth: [] as number[],
    };
  }
  if (teeth.length === 0) {
    return { label: "General treatment", subtitle: "Clinic-wide / non tooth-based", kind: "arch" as const, teeth: [] };
  }
  const d = describeToothSelection(teeth, child);
  return { label: d.label, subtitle: d.subtitle, kind: d.kind, teeth };
}