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
import DeleteConfirm from "../components/ui/confirm/DeleteConfirm";

interface TeamMemberItem {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  status?: "active" | "inactive" | "banned";
  role?: string;
}

export default function TeamMembers() {
  const navigate = useNavigate();
  const { type, user } = useAuth();
  const ownerId = useMemo(() => (type === "user" ? user?._id ?? null : null), [type, user]);
  const [items, setItems] = useState<TeamMemberItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [roleMap, setRoleMap] = useState<Record<string, string>>({});

  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<TeamMemberItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchTeamMembers() {
      if (!ownerId) return;
      setLoading(true);
      setErrorMessage("");
      try {
        const { data } = await api.get("/team-members", { params: { managed_by: ownerId } });
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
          return "Failed to load team members.";
        })();
        setErrorMessage(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchTeamMembers();
    return () => { cancelled = true; };
  }, [ownerId]);

  useEffect(() => {
    let cancelled = false;
    async function fetchRoles() {
      if (!ownerId) return;
      try {
        const { data } = await api.get<Array<{ _id: string; name: string }>>("/roles", { params: { createdBy: ownerId } });
        if (cancelled) return;
        const map: Record<string, string> = {};
        (Array.isArray(data) ? data : []).forEach((r) => {
          map[r._id] = r.name;
        });
        setRoleMap(map);
      } catch {
        if (!cancelled) setRoleMap({});
      }
    }
    void fetchRoles();
    return () => { cancelled = true; };
  }, [ownerId]);

  function handleDeleteClick(tm: TeamMemberItem) {
    setDeleteTarget(tm);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/team-members/${deleteTarget._id}`);
      setItems((prev) => prev.filter((i) => i._id !== deleteTarget._id));
      setDeleteOpen(false);
      setDeleteTarget(null);
    } catch (err) {
      // Log error to avoid unused variable warning and aid debugging
      console.error(err);
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <>
      <PageMeta title="Team Members" description="Manage your team" />
      <PageBreadcrumb pageTitle="Team Members" />
      <div className="space-y-6">
        <ComponentCard title="Team Members">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">Team members under your account.</p>
            <Button size="sm" onClick={() => navigate("/team/members/new")}>Add Team Member</Button>
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
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Email</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Role</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Phone</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {loading ? (
                    <TableRow>
                      <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">Loading team members...</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">No team members found.</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                    </TableRow>
                  ) : (
                    items.map((tm) => (
                      <TableRow key={tm._id}>
                        <TableCell className="px-5 py-4 sm:px-6 text-start">
                          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">{tm.name}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{tm.email || "—"}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{tm.role ? (roleMap[tm.role] || "—") : "—"}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{tm.phone || "—"}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" type="button" onClick={() => navigate(`/team/members/${tm._id}/edit`)}>Edit</Button>
                            <Button size="sm" variant="outline" type="button" onClick={() => handleDeleteClick(tm)}>Delete</Button>
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

      {/* Delete Confirm Modal */}
      <DeleteConfirm
        isOpen={deleteOpen}
        onCancel={() => { setDeleteOpen(false); setDeleteTarget(null); }}
        onConfirm={confirmDelete}
        title="Delete Team Member"
        description="Are you sure you want to delete this team member? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={deleteLoading}
      />
    </>
  );
}