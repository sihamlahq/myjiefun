import type { DashboardStats, Guest, ReceptionTable } from "@/types/wedding";

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
  const assigned = guests.filter((g) => g.table_id).length;
  const isArrived = (status: Guest["attendance_status"]) =>
    status === "checked_in" || status === "walk_in";

  return {
    totalInvited: guests.length,
    confirmed: guests.filter((g) => g.rsvp_status === "confirmed").length,
    pendingRsvp: guests.filter((g) => g.rsvp_status === "pending").length,
    checkedIn: guests.filter((g) => isArrived(g.attendance_status)).length,
    notArrived: guests.filter((g) => g.attendance_status === "not_arrived").length,
    totalTables: activeTables.length,
    occupiedSeats: assigned,
    availableSeats: Math.max(totalCapacity - assigned, 0),
    unassignedGuests: guests.filter((g) => !g.table_id).length,
    unassignedConfirmed: guests.filter(
      (g) => g.rsvp_status === "confirmed" && !g.table_id,
    ).length,
    vipGuests: guests.filter((g) => g.is_vip).length,
  };
}
