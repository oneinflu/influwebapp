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
import Label from "../components/form/Label";
import InputField from "../components/form/input/InputField";
import Select from "../components/form/Select";
import DeleteConfirm from "../components/ui/confirm/DeleteConfirm";
import { InfoIcon, PencilIcon, TrashBinIcon } from "../icons";

interface LeadItem {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  budget?: number;
  status?: string;
}

// Typed error-to-message helper to avoid explicit `any`
const getErrorMessage = (err: unknown): string => {
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const anyErr = err as { message?: unknown; response?: { data?: { error?: unknown } } };
    const respErr = anyErr.response?.data?.error;
    if (typeof respErr === "string" && respErr.trim().length > 0) return respErr;
    if (typeof anyErr.message === "string" && anyErr.message.trim().length > 0) return anyErr.message;
  }
  return "Something went wrong";
};

export default function Leads() {
  const navigate = useNavigate();
  const { type, user } = useAuth();
  const ownerId = useMemo(() => (type === "user" ? user?._id ?? null : null), [type, user]);
  const [items, setItems] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<LeadItem | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LeadItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [editForm, setEditForm] = useState<Partial<LeadItem>>({});

  useEffect(() => {
    let cancelled = false;
    async function fetchLeads() {
      if (!ownerId) return;
      setLoading(true);
      setErrorMessage("");
      try {
        const { data } = await api.get("/leads", { params: { q: q.trim() || undefined } });
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
          return "Failed to load leads.";
        })();
        setErrorMessage(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchLeads();
    return () => { cancelled = true; };
  }, [ownerId, q]);

  const STATUS = [
    "all",
    "new_lead",
    "contacted",
    "qualified",
    "proposal_sent",
    "won",
    "lost",
    "closed",
  ];

  const filtered = useMemo(() => {
    const base = Array.isArray(items) ? items : [];
    if (!statusFilter || statusFilter === "all") return base;
    return base.filter((l) => (l.status || "new_lead") === statusFilter);
  }, [items, statusFilter]);

  function openView(l: LeadItem) {
    setSelected(l);
    setViewOpen(true);
  }

  function openEdit(l: LeadItem) {
    setSelected(l);
    setEditForm({
      _id: l._id,
      name: l.name,
      email: l.email,
      phone: l.phone,
      budget: l.budget,
      status: l.status || "new_lead",
    });
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editForm || !editForm._id) return;
    setSaving(true);
    try {
      const { data } = await api.put(`/leads/${editForm._id}`, { ...editForm });
      setItems((prev) => prev.map((sv) => (sv._id === data._id ? data : sv)));
      setEditOpen(false);
    } catch (err: unknown) {
      const message = getErrorMessage(err) || "Failed to save lead";
      setErrorMessage(String(message));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/leads/${deleteTarget._id}`);
      setItems((prev) => prev.filter((sv) => sv._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (err: unknown) {
      const message = getErrorMessage(err) || "Failed to delete lead";
      setErrorMessage(String(message));
    }
  }

  async function convertToClient(l: LeadItem) {
    setConverting(true);
    try {
      // Create client using lead details
      const payload = {
        business_name: l.name,
        point_of_contact: {
          name: l.name,
          email: (l.email || "").toLowerCase(),
          phone: l.phone || "",
        },
        added_by: ownerId || undefined,
      } as Record<string, unknown>;
      const created = await api.post("/clients", payload);
      if (created?.data?._id) {
        // Mark lead as won
        await api.put(`/leads/${l._id}`, { status: "won" });
        setItems((prev) => prev.map((sv) => (sv._id === l._id ? { ...sv, status: "won" } : sv)));
      }
    } catch (err: unknown) {
      const message = getErrorMessage(err) || "Failed to convert lead";
      setErrorMessage(String(message));
    } finally {
      setConverting(false);
    }
  }

  return (
    <>
      <PageMeta title="Leads" description="Manage inbound leads" />
      <PageBreadcrumb pageTitle="Leads" />
      <div className="space-y-6">
        <ComponentCard title="Leads">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">Inbound leads in your scope.</p>
            <Button size="sm" onClick={() => navigate("/leads/new")}>Add Lead</Button>
          </div>

          {errorMessage && (
            <Alert variant="error" title="Error" message={errorMessage} />
          )}

          {/* Filters */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {STATUS.map((s) => (
                <button
                  key={s}
                  className={`inline-flex items-center rounded-full px-3 py-1 text-theme-xs border ${
                    statusFilter === s
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-gray-100 text-gray-700 border-gray-200 dark:bg-white/[0.06] dark:text-gray-300 dark:border-white/[0.08]"
                  }`}
                  onClick={() => setStatusFilter(s)}
                >
                  {s.replace(/_/g, " ")}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <InputField placeholder="Search name, email, phone" value={q} onChange={(e) => setQ(e.target.value)} />
              <Button variant="outline" size="sm" onClick={() => setQ("")}>Clear</Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Name</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Email</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Phone</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Budget</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {loading ? (
                    <TableRow>
                      <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">Loading leads...</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">No leads found.</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((l) => (
                      <TableRow key={l._id}>
                        <TableCell className="px-5 py-4 sm:px-6 text-start">
                          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">{l.name}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{l.email || "—"}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{l.phone || "—"}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{typeof l.budget === 'number' ? l.budget : "—"}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{(l.status || "new_lead").replace(/_/g, " ")}</TableCell>
                        <TableCell className="px-4 py-3 text-start">
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => openView(l)}>
                              <InfoIcon className="h-5 w-5" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => openEdit(l)}>
                              <PencilIcon className="h-5 w-5" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(l)}>
                              <TrashBinIcon className="h-5 w-5 text-red-600" />
                            </Button>
                            <Button variant="primary" size="sm" disabled={converting || !l.email} onClick={() => convertToClient(l)}>
                              {converting ? "Converting..." : "Convert"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* View Lead Modal */}
          <Modal isOpen={viewOpen} onClose={() => setViewOpen(false)} className="max-w-[700px] m-4">
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-semibold">Lead details</h3>
              {selected ? (
                <div className="space-y-3">
                  <div>
                    <Label>Name</Label>
                    <div className="text-sm text-gray-800 dark:text-gray-200">{selected.name}</div>
                  </div>
                  {selected.email && (
                    <div>
                      <Label>Email</Label>
                      <div className="text-sm text-gray-800 dark:text-gray-200">{selected.email}</div>
                    </div>
                  )}
                  {selected.phone && (
                    <div>
                      <Label>Phone</Label>
                      <div className="text-sm text-gray-800 dark:text-gray-200">{selected.phone}</div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm">Status: <span className="font-medium">{(selected.status || "new_lead").replace(/_/g, " ")}</span></div>
                    <div className="text-sm">Budget: <span className="font-medium">{typeof selected.budget === 'number' ? selected.budget : "—"}</span></div>
                  </div>
                </div>
              ) : null}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="primary" onClick={() => setViewOpen(false)}>Close</Button>
              </div>
            </div>
          </Modal>

          {/* Edit Lead Modal */}
          <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} className="max-w-[720px] m-4">
            <div className="p-6 space-y-5">
              <h3 className="text-lg font-semibold">Edit lead</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <InputField value={editForm.name || ""} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <Label>Email</Label>
                  <InputField value={editForm.email || ""} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <InputField value={editForm.phone || ""} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <Label>Budget</Label>
                  <InputField type="number" value={typeof editForm.budget === 'number' ? String(editForm.budget) : ""} onChange={(e) => setEditForm((f) => ({ ...f, budget: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    defaultValue={String(editForm.status || "new_lead")}
                    options={["new_lead","contacted","qualified","proposal_sent","won","lost","closed"].map((s) => ({ label: s.replace(/_/g, " "), value: s }))}
                    onChange={(val) => setEditForm((f) => ({ ...f, status: String(val) }))}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={saveEdit} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
              </div>
            </div>
          </Modal>

          {/* Delete Confirm */}
          <DeleteConfirm
            title="Delete lead?"
            description={deleteTarget ? `This will delete ${deleteTarget.name}.` : ""}
            isOpen={!!deleteTarget}
            onCancel={() => setDeleteTarget(null)}
            onConfirm={confirmDelete}
            loading={false}
          />
        </ComponentCard>
      </div>
    </>
  );
}