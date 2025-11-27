/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

type PermissionsMatrix = Record<string, Record<string, boolean>>;

interface RoleResponse {
  _id?: string;
  name?: string;
  permissions?: PermissionsMatrix;
}

export function usePermissions() {
  const { type, user, admin } = useAuth();
  const isOwner = useMemo(() => Boolean((user as any)?.registration?.isOwner), [user]);
  const roleId = useMemo(() => {
    // Prefer user role if logged in as user
    if (type === "user") {
      const r = (user as any)?.role;
      return typeof r === "string" ? r : (typeof r === "object" ? (r?._id as string | undefined) : undefined);
    }
    // Fallback: admin role
    if (type === "admin") {
      const r = (admin as any)?.role;
      return typeof r === "string" ? r : (typeof r === "object" ? (r?._id as string | undefined) : undefined);
    }
    return undefined;
  }, [type, user, admin]);

  const [matrix, setMatrix] = useState<PermissionsMatrix | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchRole() {
      // Owners bypass explicit permission checks
      if (isOwner) { setMatrix(null); return; }
      if (!roleId) { setMatrix(null); return; }
      setLoading(true);
      try {
        const { data } = await api.get<RoleResponse>(`/roles/${roleId}`);
        if (!cancelled) setMatrix(data?.permissions || {});
      } catch {
        if (!cancelled) setMatrix(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void fetchRole();
    return () => { cancelled = true; };
  }, [roleId, isOwner]);

  // Debug: log resolved permissions for current user/admin
  useEffect(() => {
    try {
      console.group("Permissions");
      if (isOwner) {
        console.info("Owner detected: full access to all permissions.");
        console.groupEnd();
        return;
      }
      if (!matrix) {
        console.info("No role permissions loaded (no role or fetch failed).");
        console.groupEnd();
        return;
      }
      const entries = Object.entries(matrix).map(([group, perms]) => {
        const enabled = Object.entries(perms)
          .filter(([, val]) => Boolean(val))
          .map(([key]) => key);
        return { group, enabled };
      });
      for (const e of entries) {
        console.log(`${e.group}: ${e.enabled.length > 0 ? e.enabled.join(", ") : "none"}`);
      }
      console.groupEnd();
    } catch {
      // ignore console errors
    }
  }, [matrix, isOwner]);

  function has(group: string, key?: string): boolean {
    // Owner: allow
    if (isOwner) return true;
    const g = matrix?.[group] || {};
    if (!key) {
      // Allow if any permission in the group is true
      return Object.values(g).some(Boolean);
    }
    return Boolean(g[key]);
  }

  function hasAny(group: string, keys: string[]): boolean {
    if (isOwner) return true;
    if (!Array.isArray(keys) || keys.length === 0) return has(group);
    const g = matrix?.[group] || {};
    return keys.some((k) => Boolean(g[k]));
  }

  return { loading, matrix, isOwner, has, hasAny } as const;
}
