import type { AppRole } from "@/types/wedding";

const rank: Record<AppRole, number> = {
  viewer: 1,
  checkin_staff: 2,
  manager: 3,
  admin: 4,
};

export function hasMinRole(role: AppRole | null | undefined, min: AppRole) {
  if (!role) return false;
  return rank[role] >= rank[min];
}

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", minRole: "viewer" as AppRole },
  { href: "/guests", label: "Guests", minRole: "checkin_staff" as AppRole },
  { href: "/check-in", label: "Check-In", minRole: "checkin_staff" as AppRole },
  { href: "/seating", label: "Seating", minRole: "manager" as AppRole },
  { href: "/floor-plan", label: "Floor Plan", minRole: "viewer" as AppRole },
  { href: "/tables", label: "Tables", minRole: "manager" as AppRole },
  { href: "/reports", label: "Reports", minRole: "viewer" as AppRole },
  { href: "/settings", label: "Settings", minRole: "manager" as AppRole },
] as const;
