/* eslint-disable react-hooks/exhaustive-deps */
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
import { Modal } from "../components/ui/modal";
import DeleteConfirm from "../components/ui/confirm/DeleteConfirm";
import Label from "../components/form/Label";
import Select from "../components/form/Select";
import Input from "../components/form/input/InputField";
import { InfoIcon, PencilIcon, TrashBinIcon } from "../icons";

interface CollaboratorItem {
  _id: string;
  type: string;
  users: string; // user id
  status?: string;
  notes?: string;
}

export default function Collaborators() {
  const navigate = useNavigate();
  const { type, user } = useAuth();
  const ownerId = useMemo(() => (type === "user" ? user?._id ?? null : null), [type, user]);
  const [items, setItems] = useState<CollaboratorItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Map of userId -> display label (name or email)
  const [userMap, setUserMap] = useState<Record<string, string>>({});

  // View modal state
  const [viewOpen, setViewOpen] = useState<boolean>(false);
  const [viewItem, setViewItem] = useState<CollaboratorItem | null>(null);

  // Edit modal state
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [editLoading, setEditLoading] = useState<boolean>(false);
  const [editError, setEditError] = useState<string>("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editType, setEditType] = useState<string>("");
  const [editStatus, setEditStatus] = useState<"active" | "inactive" | "">("");
  const [editNotes, setEditNotes] = useState<string>("");

  // Delete modal state
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const TYPES = [
    "UGC creator",
    "Editor",
    "Scriptwriter",
    "Voice-over artist",
    "Model",
    "Actor",
    "Designer",
    "Photographer",
    "Videographer",
    "Influencer",
  ];

  useEffect(() => {
    let cancelled = false;
    async function fetchCollaborators() {
      if (!ownerId) return;
      setLoading(true);
      setErrorMessage("");
      try {
        const { data } = await api.get("/collaborators", { params: { managed_by: ownerId } });
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
          return "Failed to load collaborators.";
        })();
        setErrorMessage(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchCollaborators();
    return () => { cancelled = true; };
  }, [ownerId]);

  // When items update, fetch user display info for missing IDs
  useEffect(() => {
    const ids = Array.from(new Set(items.map((i) => i.users).filter(Boolean)));
    const missing = ids.filter((id) => !userMap[id]);
    if (missing.length === 0) return;
    let cancelled = false;
    async function fetchUsers() {
      try {
        const results = await Promise.all(
          missing.map(async (id) => {
            try {
              const { data } = await api.get(`/users/${id}`);
              const name = data?.registration?.name as string | undefined;
              const email = data?.registration?.email as string | undefined;
              const label = (name && name.trim()) || (email && email.trim()) || id;
              return { id, label };
            } catch {
              return { id, label: id };
            }
          })
        );
        if (!cancelled) {
          setUserMap((prev) => {
            const next = { ...prev };
            results.forEach((r) => { next[r.id] = r.label; });
            return next;
          });
        }
      } catch {
        // ignore batch errors
      }
    }
    fetchUsers();
    return () => { cancelled = true; };
  }, [items]);

  function openView(item: CollaboratorItem) {
    setViewItem(item);
    setViewOpen(true);
  }

  function openEdit(item: CollaboratorItem) {
    setEditId(item._id);
    setEditType(item.type || "");
    setEditStatus((item.status as "active" | "inactive" | undefined) || "");
    setEditNotes(item.notes || "");
    setEditError("");
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editId) return;
    setEditLoading(true);
    setEditError("");
    try {
      const payload: Partial<CollaboratorItem> = {
        type: editType || undefined,
        status: editStatus || undefined,
        notes: editNotes.trim() || undefined,
      };
      const { data } = await api.put(`/collaborators/${editId}`, payload);
      setItems((prev) => prev.map((it) => (it._id === editId ? { ...it, ...data } : it)));
      setEditOpen(false);
    } catch (err) {
      const message = ((): string => {
        if (err && typeof err === "object") {
          const anyErr = err as { response?: { data?: unknown } };
          const respData = anyErr.response?.data;
          if (respData && typeof respData === "object" && "error" in respData) {
            const msg = (respData as { error?: unknown }).error;
            if (typeof msg === "string" && msg.trim().length > 0) return msg;
          }
        }
        return "Failed to update collaborator.";
      })();
      setEditError(message);
    } finally {
      setEditLoading(false);
    }
  }

  function openDelete(id: string) {
    setDeleteId(id);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/collaborators/${deleteId}`);
      setItems((prev) => prev.filter((it) => it._id !== deleteId));
      setDeleteOpen(false);
    } catch (err) {
      // surface error in alert area
      const message = ((): string => {
        if (err && typeof err === "object") {
          const anyErr = err as { response?: { data?: unknown } };
          const respData = anyErr.response?.data;
          if (respData && typeof respData === "object" && "error" in respData) {
            const msg = (respData as { error?: unknown }).error;
            if (typeof msg === "string" && msg.trim().length > 0) return msg;
          }
        }
        return "Failed to delete collaborator.";
      })();
      setErrorMessage(message);
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <>
      <PageMeta title="Collaborators" description="Manage collaborators linked to your account" />
      <PageBreadcrumb pageTitle="Collaborators" />
      <div className="space-y-6">
        <ComponentCard title="Collaborators">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">Collaborators managed by your account.</p>
            <Button size="sm" onClick={() => navigate("/collaborators/new")}>Add Collaborator</Button>
          </div>

          {errorMessage && (
            <Alert variant="error" title="Error" message={errorMessage} />
          )}

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Type</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">User</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Notes</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {loading ? (
                    <TableRow>
                      <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">Loading collaborators...</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">No collaborators found.</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                    </TableRow>
                  ) : (
                    items.map((c) => (
                      <TableRow key={c._id}>
                        <TableCell className="px-5 py-4 sm:px-6 text-start">
                          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">{c.type}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{userMap[c.users] || "—"}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{(c.status || "active").replace("_", " ")}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{c.notes || "—"}</TableCell>
                        <TableCell className="px-4 py-3 text-start">
                          <div className="flex items-center gap-2">
                            <button
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
                              title="View"
                              onClick={() => openView(c)}
                            >
                              <InfoIcon className="h-4 w-4" />
                            </button>
                            <button
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
                              title="Edit"
                              onClick={() => openEdit(c)}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-error-600 hover:bg-error-50 dark:border-white/10 dark:text-error-400/80 dark:hover:bg-error-500/10"
                              title="Delete"
                              onClick={() => openDelete(c._id)}
                            >
                              <TrashBinIcon className="h-4 w-4" />
                            </button>
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

      {/* View Modal */}
      <Modal isOpen={viewOpen} onClose={() => setViewOpen(false)} className="max-w-[600px] m-4">
        {viewItem && (
          <div className="no-scrollbar relative w-full max-w-[600px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-10">
            <div className="px-2 pr-10">
              <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">Collaborator Details</h4>
              <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">Overview of the collaborator.</p>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Type</Label>
                <p className="text-theme-sm text-gray-800 dark:text-white/90">{viewItem.type}</p>
              </div>
              <div>
                <Label>User</Label>
                <p className="text-theme-sm text-gray-800 dark:text-white/90">{userMap[viewItem.users] || viewItem.users}</p>
              </div>
              <div>
                <Label>Status</Label>
                <p className="text-theme-sm text-gray-800 dark:text-white/90">{(viewItem.status || "active").replace("_", " ")}</p>
              </div>
              <div>
                <Label>Notes</Label>
                <p className="text-theme-sm text-gray-800 dark:text-white/90">{viewItem.notes || "—"}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} className="max-w-[600px] m-4">
        <div className="no-scrollbar relative w-full max-w-[600px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-10">
          <div className="px-2 pr-10">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">Edit Collaborator</h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">Update collaborator details.</p>
          </div>
          {editError && <Alert variant="error" title="Error" message={editError} />}
          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); void saveEdit(); }}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Type</Label>
                <Select
                  options={TYPES.map((t) => ({ value: t, label: t }))}
                  defaultValue={editType}
                  onChange={(v) => setEditType(String(v))}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  options={[{ value: "active", label: "active" }, { value: "inactive", label: "inactive" }]}
                  defaultValue={editStatus || "active"}
                  onChange={(v) => setEditStatus(v === "active" || v === "inactive" ? v : "")}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Notes</Label>
                <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Notes" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" disabled={editLoading || !editId || !editType}>{editLoading ? "Saving..." : "Save Changes"}</Button>
              <Button size="sm" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <DeleteConfirm
        isOpen={deleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => { void confirmDelete(); }}
        loading={deleteLoading}
        title="Delete Collaborator"
        description="Are you sure you want to delete this collaborator? This action cannot be undone."
      />
    </>
  );
}