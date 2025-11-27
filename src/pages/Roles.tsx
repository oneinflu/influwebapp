import { useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";
import Alert from "../components/ui/alert/Alert";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../components/ui/table";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router";
import PermissionGate from "../components/common/PermissionGate";

interface RoleItem {
  _id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  createdBy: string;
  is_system_role?: boolean;
  locked?: boolean;
  assigned_users?: string[];
  // Computed on server: number of TeamMembers assigned to this role
  assigned_count?: number;
}

export default function Roles() {
  const navigate = useNavigate();
  const { type, user } = useAuth();
  const ownerId = useMemo(() => (type === "user" ? user?._id ?? null : null), [type, user]);
  const [items, setItems] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function fetchRoles() {
      if (!ownerId) return;
      setLoading(true);
      setErrorMessage("");
      try {
        const { data } = await api.get("/roles", { params: { createdBy: ownerId } });
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        if (cancelled) return;
        const message = ((): string => {
          if (err && typeof err === "object") {
            const anyErr = err as { response?: { data?: unknown } };
            const respData = anyErr.response?.data;
            if (respData && typeof respData === "object" && "error" in respData) {
              const msg = (respData as { error?: unknown }).error;
              if (typeof msg === "string" && msg.trim().length > 0) return msg;
            }
          }
          return "Failed to load roles.";
        })();
        setErrorMessage(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchRoles();
    return () => {
      cancelled = true;
    };
  }, [ownerId]);

  return (
    <>
      <PageMeta title="Roles" description="Manage roles and permissions" />
      <PageBreadcrumb pageTitle="Roles" />
      <PermissionGate group="roles">
      <div className="space-y-6">
        <ComponentCard title="Roles">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">Roles created under your account.</p>
            <Button size="sm" onClick={() => navigate("/roles/new")}>Create Role</Button>
          </div>

          {errorMessage && (
            <Alert variant="error" title="Error" message={errorMessage} />
          )}

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Name</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Description</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Assigned Users</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Flags</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {loading ? (
                    <TableRow>
                      <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">Loading roles...</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">No roles found.</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                    </TableRow>
                  ) : (
                    items.map((r) => (
                      <TableRow key={r._id}>
                        <TableCell className="px-5 py-4 sm:px-6 text-start">
                          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">{r.name}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          {r.description || "—"}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          {typeof r.assigned_count === 'number'
                            ? r.assigned_count
                            : Array.isArray(r.assigned_users) ? r.assigned_users.length : 0}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          {(r.locked ? "Locked" : "") + (r.is_system_role ? (r.locked ? ", System" : "System") : "") || "—"}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-start">
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => navigate(`/roles/${r._id}`)} type="button">View</Button>
                            <Button size="sm" variant="outline" onClick={() => navigate(`/roles/${r._id}/edit`)} disabled={r.locked === true} type="button">Edit</Button>
                            <Button size="sm" variant="outline" onClick={() => handleDelete(r)} disabled={r.locked === true} type="button">Delete</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </ComponentCard>
      </div>
      </PermissionGate>
    </>
  );
}

// Inline deletion handler (simple confirm)
async function handleDelete(role: RoleItem) {
  const confirmed = window.confirm(`Delete role "${role.name}"? This cannot be undone.`);
  if (!confirmed) return;
  try {
    await api.delete(`/roles/${role._id}`);
    // Reload page data by triggering navigation or soft refresh
    // Prefer soft refresh: fetch roles again by reloading location
    // In this component structure, simplest is to force a reload
    window.location.reload();
  } catch (err) {
    const anyErr = err as { response?: { data?: unknown } };
    const msg = (anyErr.response?.data && typeof anyErr.response.data === 'object' && (anyErr.response.data as { error?: string }).error) || 'Failed to delete role.';
    alert(msg);
  }
}
