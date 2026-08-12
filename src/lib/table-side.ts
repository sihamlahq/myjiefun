import type { ReceptionTable, TableType } from "@/types/wedding";

export type TableSide = "groom" | "bride" | null;

export const GROOM_SIDE_LABEL = "Groom side (男方)";
export const BRIDE_SIDE_LABEL = "Bride side (女方)";

export function tableSide(
  tableOrType:
    | Partial<Pick<ReceptionTable, "table_type" | "location" | "name" | "notes">>
    | TableType
    | string
    | null
    | undefined,
): TableSide {
  if (!tableOrType) return null;
  if (typeof tableOrType === "string") {
    return sideFromText(tableOrType);
  }
  return (
    sideFromText(tableOrType.table_type) ||
    sideFromText(tableOrType.location) ||
    sideFromText(tableOrType.name) ||
    sideFromText(tableOrType.notes)
  );
}

function sideFromText(value: string | null | undefined): TableSide {
  if (!value) return null;
  const text = value.trim().toLowerCase();
  if (
    text === "groom_side" ||
    text.includes("groom side") ||
    text.includes("男方") ||
    text === "groom" ||
    text.includes("male side")
  ) {
    return "groom";
  }
  if (
    text === "bride_side" ||
    text.includes("bride side") ||
    text.includes("女方") ||
    text === "bride" ||
    text.includes("female side")
  ) {
    return "bride";
  }
  return null;
}

export function tableTypeLabel(type: TableType | string): string {
  const labels: Record<string, string> = {
    normal: "Normal",
    vip: "VIP",
    family: "Family",
    bride_groom: "Bride & groom",
    groom_side: GROOM_SIDE_LABEL,
    bride_side: BRIDE_SIDE_LABEL,
    reserved: "Reserved",
    custom: "Custom",
  };
  return labels[type] ?? type;
}

export function tableSideLabel(side: TableSide): string {
  if (side === "groom") return GROOM_SIDE_LABEL;
  if (side === "bride") return BRIDE_SIDE_LABEL;
  return "Unassigned";
}

/** Soft fill + border for reception tiles and cards. */
export function tableSideCardClass(
  tableOrType:
    | Partial<Pick<ReceptionTable, "table_type" | "location" | "name" | "notes">>
    | TableType
    | string
    | null
    | undefined,
): string | null {
  const side = tableSide(tableOrType);
  if (side === "groom") {
    return "border-sky-400/70 bg-sky-100/90 text-sky-950";
  }
  if (side === "bride") {
    return "border-rose-400/70 bg-rose-100/90 text-rose-950";
  }
  return null;
}

export function tableSideMarkerClass(
  tableOrType:
    | Partial<Pick<ReceptionTable, "table_type" | "location" | "name" | "notes">>
    | TableType
    | string
    | null
    | undefined,
): string | null {
  const side = tableSide(tableOrType);
  if (side === "groom") {
    return "border-sky-500 bg-sky-200 text-sky-950";
  }
  if (side === "bride") {
    return "border-rose-500 bg-rose-200 text-rose-950";
  }
  return null;
}

export function tableSideBadgeClass(
  tableOrType:
    | Partial<Pick<ReceptionTable, "table_type" | "location" | "name" | "notes">>
    | TableType
    | string
    | null
    | undefined,
): string | null {
  const side = tableSide(tableOrType);
  if (side === "groom") return "bg-sky-100 text-sky-900";
  if (side === "bride") return "bg-rose-100 text-rose-900";
  return null;
}
