import type { GuestWithRelations } from "@/types/wedding";

export type RedPacketSettings = {
  passcode: string;
};

export const defaultRedPacketSettings: RedPacketSettings = {
  passcode: "0000",
};

export function getRedPacketAmount(guest: GuestWithRelations): number | null {
  const column = guest.red_packet_amount;
  if (typeof column === "number" && Number.isFinite(column)) return column;
  const fromFields = guest.custom_fields?.red_packet_amount;
  if (typeof fromFields === "number" && Number.isFinite(fromFields)) return fromFields;
  if (typeof fromFields === "string" && fromFields.trim() !== "") {
    const parsed = Number(fromFields);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function formatMoney(amount: number) {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function isValidPasscode(value: string) {
  return /^\d{4}$/.test(value);
}
