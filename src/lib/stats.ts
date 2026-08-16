import type { DashboardStats, Guest, ReceptionTable } from "@/types/wedding";

/** Headcount for one guest record (party size). */
export function partyOf(guest: { expected_count?: number | null }) {
  const count = Number(guest.expected_count);
  return Number.isFinite(count) && count >= 0 ? count : 1;
}

/** Sum party sizes, optionally filtered. */
export function sumParty<T extends { expected_count?: number | null }>(
  guests: T[],
  predicate?: (guest: T) => boolean,
) {
  return guests.reduce((sum, guest) => {
    if (predicate && !predicate(guest)) return sum;
    return sum + partyOf(guest);
  }, 0);
}

export function computeStats(
  guests: Pick<
    Guest,
    | "rsvp_status"
    | "attendance_status"
    | "table_id"
    | "is_vip"
    | "expected_count"
  >[],
  tables: Pick<ReceptionTable, "id" | "capacity" | "status">[],
): DashboardStats {
  const activeTables = tables.filter((t) => t.status === "active");
  const totalCapacity = activeTables.reduce((sum, t) => sum + t.capacity, 0);
  const isArrived = (status: Guest["attendance_status"]) =>
    status === "checked_in" || status === "walk_in";
  const occupiedSeats = sumParty(guests, (g) => Boolean(g.table_id));

  return {
    totalInvited: sumParty(guests),
    confirmed: sumParty(guests, (g) => g.rsvp_status === "confirmed"),
    pendingRsvp: sumParty(guests, (g) => g.rsvp_status === "pending"),
    checkedIn: sumParty(guests, (g) => isArrived(g.attendance_status)),
    notArrived: sumParty(guests, (g) => g.attendance_status === "not_arrived"),
    totalTables: activeTables.length,
    occupiedSeats,
    availableSeats: Math.max(totalCapacity - occupiedSeats, 0),
    unassignedGuests: sumParty(guests, (g) => !g.table_id),
    unassignedConfirmed: sumParty(
      guests,
      (g) => g.rsvp_status === "confirmed" && !g.table_id,
    ),
    vipGuests: sumParty(guests, (g) => g.is_vip),
  };
}
