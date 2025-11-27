import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";
import Alert from "../components/ui/alert/Alert";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../components/ui/table";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import PermissionGate from "../components/common/PermissionGate";

interface RoleDoc {
  _id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  createdBy: string;
  is_system_role?: boolean;
  locked?: boolean;
  assigned_users?: string[];
  assigned_count?: number;
}

interface TeamMemberItem {
  _id: string;
  name?: string;
  email?: string;
  status?: string;
}

export default function RoleView() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { type, user } = useAuth();
  const ownerId = useMemo(() => (type === "user" ? user?._id ?? null : null), [type, user]);
  const [role, setRole] = useState<RoleDoc | null>(null);
  const [members, setMembers] = useState<TeamMemberItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      if (!id) return;
      setErrorMessage("");
      try {
        const roleResp = await api.get(`/roles/${id}`);
        if (!cancelled) setRole(roleResp.data as RoleDoc);
        // Optionally fetch assigned team members
        if (ownerId) {
          const { data } = await api.get("/team-members", { params: { managed_by: ownerId, role: id } });
          if (!cancelled) setMembers(Array.isArray(data) ? data : []);
        }
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
          return "Failed to load role.";
        })();
        setErrorMessage(message);
      } finally {
        // no-op
      }
    }
    fetchAll();
    return () => { cancelled = true; };
  }, [id, ownerId]);

  return (
    <PermissionGate group="roles">
      <PageMeta title="Role Details" description="View role details" />
      <PageBreadcrumb pageTitle="Role Details" />
      <div className="space-y-6">
        <ComponentCard title={role ? role.name : "Role"} desc={role?.description || ""}>
          {errorMessage && (
            <Alert variant="error" title="Error" message={errorMessage} />
          )}

          {role && (
            <div className="mb-4 flex items-center gap-3">
              <Button size="sm" variant="outline" onClick={() => navigate("/roles")}>Back</Button>
              <Button size="sm" onClick={() => navigate(`/roles/${role._id}/edit`)} disabled={role.locked === true}>Edit Role</Button>
            </div>
          )}

          {role && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200 p-4 dark:border-white/[0.05]">
                <p className="text-sm text-gray-500 dark:text-gray-400">Flags</p>
                <p className="text-sm text-gray-800 dark:text-white/90">
                  {(role.locked ? "Locked" : "") + (role.is_system_role ? (role.locked ? ", System" : "System") : "") || "—"}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 p-4 dark:border-white/[0.05]">
                <p className="text-sm text-gray-500 dark:text-gray-400">Assigned Users</p>
                <p className="text-sm text-gray-800 dark:text-white/90">
                  {typeof role.assigned_count === 'number' ? role.assigned_count : Array.isArray(role.assigned_users) ? role.assigned_users.length : 0}
                </p>
              </div>
            </div>
          )}

          {members.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/90">Assigned Team Members</h3>
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                <div className="max-w-full overflow-x-auto">
                  <Table>
                    <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                      <TableRow>
                        <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Name</TableCell>
                        <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Email</TableCell>
                        <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                      {members.map((m) => (
                        <TableRow key={m._id}>
                          <TableCell className="px-5 py-4 sm:px-6 text-start">
                            <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">{m.name || "—"}</span>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{m.email || "—"}</TableCell>
                          <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{m.status || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </ComponentCard>
      </div>
    </PermissionGate>
  );
}
