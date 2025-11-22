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
import DatePicker from "../components/form/date-picker";

interface ProjectItem {
  _id: string;
  name: string;
  client: string;
  status?: string;
  approval_status?: string;
  services?: string[];
  collaborators?: string[];
  completion_date?: string;
  end_date?: string;
  project_budget?: number;
  project_category?: string[];
  target?: {
    location?: string[];
    platforms?: string[];
    age_groups?: string[];
    languages?: string[];
  };
  notes?: string;
}

type ClientOption = { _id: string; business_name?: string };
type ServiceOption = { _id: string; name?: string };
type CollaboratorOption = { _id: string; type?: string; name?: string };

const STATUS = ["draft", "in_progress", "completed", "cancelled", "on_hold"] as const;
const APPROVAL = ["awaiting_approval", "approved", "rejected"] as const;

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

export default function Projects() {
  const navigate = useNavigate();
  const { type, user } = useAuth();
  const ownerId = useMemo(() => (type === "user" ? user?._id ?? null : null), [type, user]);
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [selected, setSelected] = useState<ProjectItem | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProjectItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [collabOptions, setCollabOptions] = useState<CollaboratorOption[]>([]);
  const clientName = (id?: string) => (clientOptions.find((c) => String(c._id) === String(id))?.business_name || "—");
  const serviceName = (id?: string) => (serviceOptions.find((s) => String(s._id) === String(id))?.name || "");
  const collabName = (id?: string) => (collabOptions.find((c) => String(c._id) === String(id))?.name || collabOptions.find((c) => String(c._id) === String(id))?.type || "");
  const [editForm, setEditForm] = useState<Partial<ProjectItem>>({});
  const [editCategoryInput, setEditCategoryInput] = useState("");
  const [editTargetLocationInput, setEditTargetLocationInput] = useState("");
  const [editTargetPlatformInput, setEditTargetPlatformInput] = useState("");
  const [editTargetAgeInput, setEditTargetAgeInput] = useState("");
  const [editTargetLanguageInput, setEditTargetLanguageInput] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function fetchProjects() {
      if (!ownerId) return;
      setLoading(true);
      setErrorMessage("");
      try {
        const { data } = await api.get("/projects");
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        if (cancelled) return;
        const message = getErrorMessage(err) || "Failed to load projects.";
        setErrorMessage(String(message));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchProjects();
    async function loadOptions() {
      try {
        const [{ data: clients }, { data: services }, { data: collabs }] = await Promise.all([
          api.get("/clients", { params: { user_id: ownerId } }),
          api.get("/services", { params: { user_id: ownerId } }),
          api.get("/collaborators", { params: { managed_by: ownerId } }),
        ]);
        if (!cancelled) {
          setClientOptions(Array.isArray(clients) ? clients : []);
          setServiceOptions(Array.isArray(services) ? services : []);
          setCollabOptions(Array.isArray(collabs) ? collabs : []);
        }
      } catch {
        // keep usable
      }
    }
    loadOptions();
    return () => { cancelled = true; };
  }, [ownerId]);

  function openView(p: ProjectItem) {
    setSelected(p);
    setViewOpen(true);
  }

  function openEdit(p: ProjectItem) {
    setSelected(p);
    setEditForm({
      _id: p._id,
      name: p.name,
      client: p.client,
      status: p.status || "draft",
      approval_status: p.approval_status || "awaiting_approval",
      completion_date: p.completion_date,
      end_date: p.end_date,
      project_budget: p.project_budget,
      project_category: Array.isArray(p.project_category) ? p.project_category : [],
      services: Array.isArray(p.services) ? p.services : [],
      collaborators: Array.isArray(p.collaborators) ? p.collaborators : [],
      target: {
        location: p.target?.location || [],
        platforms: p.target?.platforms || [],
        age_groups: p.target?.age_groups || [],
        languages: p.target?.languages || [],
      },
      notes: p.notes || "",
    });
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editForm || !editForm._id) return;
    setSaving(true);
    setErrorMessage("");
    try {
      const payload = {
        name: editForm.name?.trim(),
        client: editForm.client,
        status: editForm.status,
        approval_status: editForm.approval_status,
        completion_date: editForm.completion_date || undefined,
        end_date: editForm.end_date || undefined,
        project_budget: typeof editForm.project_budget === "number" ? editForm.project_budget : (editForm.project_budget ? Number(editForm.project_budget) : undefined),
        project_category: Array.isArray(editForm.project_category) ? editForm.project_category : [],
        services: Array.isArray(editForm.services) ? editForm.services : [],
        collaborators: Array.isArray(editForm.collaborators) ? editForm.collaborators : [],
        target: {
          location: editForm.target?.location || [],
          platforms: editForm.target?.platforms || [],
          age_groups: editForm.target?.age_groups || [],
          languages: editForm.target?.languages || [],
        },
        notes: editForm.notes?.trim() || undefined,
      };
      const { data } = await api.put(`/projects/${editForm._id}`, payload);
      setItems((prev) => prev.map((sv) => (sv._id === data._id ? data : sv)));
      setEditOpen(false);
    } catch (err: unknown) {
      const message = getErrorMessage(err) || "Failed to save project";
      setErrorMessage(String(message));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setErrorMessage("");
    try {
      await api.delete(`/projects/${deleteTarget._id}`);
      setItems((prev) => prev.filter((sv) => sv._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (err: unknown) {
      const message = getErrorMessage(err) || "Failed to delete project";
      setErrorMessage(String(message));
    }
  }

  return (
    <>
      <PageMeta title="Projects" description="Manage projects" />
      <PageBreadcrumb pageTitle="Projects" />
      <div className="space-y-6">
        <ComponentCard title="Projects">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">Projects in your scope.</p>
            <Button size="sm" onClick={() => navigate("/projects/new")}>Add Project</Button>
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
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Client</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Approval</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Services</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Collaborators</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {loading ? (
                    <TableRow>
                      <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">Loading projects...</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">No projects found.</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                    </TableRow>
                  ) : (
                    items.map((p) => (
                      <TableRow key={p._id}>
                        <TableCell className="px-5 py-4 sm:px-6 text-start">
                          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">{p.name}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{clientName(p.client)}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{(p.status || "draft").replace(/_/g, " ")}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{(p.approval_status || "awaiting_approval").replace(/_/g, " ")}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{Array.isArray(p.services) ? p.services.map(serviceName).filter(Boolean).join(", ") || p.services.length : 0}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{Array.isArray(p.collaborators) ? p.collaborators.map(collabName).filter(Boolean).join(", ") || p.collaborators.length : 0}</TableCell>
                        <TableCell className="px-4 py-3 text-start">
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => openView(p)}>
                              <InfoIcon className="h-5 w-5" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                              <PencilIcon className="h-5 w-5" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(p)}>
                              <TrashBinIcon className="h-5 w-5 text-red-600" />
                            </Button>
                            <Button size="sm" variant="primary" onClick={() => navigate(`/projects/${p._id}`)}>Open</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          {/* View Project Modal */}
          <Modal isOpen={viewOpen} onClose={() => setViewOpen(false)} className="max-w-[750px] m-4">
            <div className="p-6 space-y-5">
              <h3 className="text-lg font-semibold">Project details</h3>
              {selected ? (
                <div className="space-y-6">
                  {/* Basic */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Name</Label>
                      <div className="text-sm text-gray-800 dark:text-gray-200">{selected.name}</div>
                    </div>
                    <div>
                      <Label>Client</Label>
                      <div className="text-sm text-gray-800 dark:text-gray-200">{clientName(selected.client)}</div>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <div className="text-sm font-medium">{(selected.status || "draft").replace(/_/g, " ")}</div>
                    </div>
                    <div>
                      <Label>Approval</Label>
                      <div className="text-sm font-medium">{(selected.approval_status || "awaiting_approval").replace(/_/g, " ")}</div>
                    </div>
                  </div>

                  {/* Dates & Budget */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Completion Date</Label>
                      <div className="text-sm">{selected.completion_date || "—"}</div>
                    </div>
                    <div>
                      <Label>End Date</Label>
                      <div className="text-sm">{selected.end_date || "—"}</div>
                    </div>
                    <div>
                      <Label>Project Budget</Label>
                      <div className="text-sm">{typeof selected.project_budget === "number" ? `$${selected.project_budget.toLocaleString()}` : "—"}</div>
                    </div>
                  </div>

                  {/* Services */}
                  <div>
                    <Label>Services</Label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {Array.isArray(selected.services) && selected.services.length > 0 ? (
                        selected.services.map(serviceName).filter(Boolean).map((name, idx) => (
                          <span key={`svc-${idx}`} className="inline-flex items-center px-2 py-1 rounded-full border border-gray-300 text-xs text-gray-700 dark:text-gray-200 dark:border-gray-600">
                            {name}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">None</span>
                      )}
                    </div>
                  </div>

                  {/* Collaborators */}
                  <div>
                    <Label>Collaborators</Label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {Array.isArray(selected.collaborators) && selected.collaborators.length > 0 ? (
                        selected.collaborators.map(collabName).filter(Boolean).map((name, idx) => (
                          <span key={`col-${idx}`} className="inline-flex items-center px-2 py-1 rounded-full border border-gray-300 text-xs text-gray-700 dark:text-gray-200 dark:border-gray-600">
                            {name}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">None</span>
                      )}
                    </div>
                  </div>

                  {/* Categories */}
                  <div>
                    <Label>Categories</Label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {Array.isArray(selected.project_category) && selected.project_category.length > 0 ? (
                        selected.project_category.map((cat, idx) => (
                          <span key={`cat-${idx}`} className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-xs text-gray-700 dark:bg-white/10 dark:text-gray-200">
                            {cat}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">None</span>
                      )}
                    </div>
                  </div>

                  {/* Target Audience */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Target Locations</Label>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {Array.isArray(selected.target?.location) && (selected.target?.location?.length || 0) > 0 ? (
                          (selected.target?.location || []).map((loc, idx) => (
                            <span key={`loc-${idx}`} className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-xs text-gray-700 dark:bg-white/10 dark:text-gray-200">
                              {loc}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">None</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label>Target Platforms</Label>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {Array.isArray(selected.target?.platforms) && (selected.target?.platforms?.length || 0) > 0 ? (
                          (selected.target?.platforms || []).map((plat, idx) => (
                            <span key={`plat-${idx}`} className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-xs text-gray-700 dark:bg-white/10 dark:text-gray-200">
                              {plat}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">None</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label>Target Ages</Label>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {Array.isArray(selected.target?.age_groups) && (selected.target?.age_groups?.length || 0) > 0 ? (
                          (selected.target?.age_groups || []).map((age, idx) => (
                            <span key={`age-${idx}`} className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-xs text-gray-700 dark:bg-white/10 dark:text-gray-200">
                              {age}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">None</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label>Target Languages</Label>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {Array.isArray(selected.target?.languages) && (selected.target?.languages?.length || 0) > 0 ? (
                          (selected.target?.languages || []).map((lang, idx) => (
                            <span key={`lang-${idx}`} className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-xs text-gray-700 dark:bg-white/10 dark:text-gray-200">
                              {lang}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">None</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <Label>Notes</Label>
                    <div className="text-sm whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200">
                      {selected.notes && selected.notes.trim().length > 0 ? selected.notes : "—"}
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="primary" onClick={() => setViewOpen(false)}>Close</Button>
              </div>
            </div>
          </Modal>

          {/* Edit Project Modal */}
          <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} className="max-w-[780px] m-4">
            <div className="p-6 space-y-5">
              <h3 className="text-lg font-semibold">Edit project</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <InputField value={editForm.name || ""} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <Label>Client</Label>
                  <Select
                    defaultValue={String(editForm.client || "")}
                    options={clientOptions.map((c) => ({ label: c.business_name || c._id, value: c._id }))}
                    onChange={(val) => setEditForm((f) => ({ ...f, client: String(val) }))}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    defaultValue={String(editForm.status || "draft")}
                    options={Array.from(STATUS).map((s) => ({ label: s.replace(/_/g, " "), value: s }))}
                    onChange={(val) => setEditForm((f) => ({ ...f, status: String(val) }))}
                  />
                </div>
                <div>
                  <Label>Approval</Label>
                  <Select
                    defaultValue={String(editForm.approval_status || "awaiting_approval")}
                    options={Array.from(APPROVAL).map((a) => ({ label: a.replace(/_/g, " "), value: a }))}
                    onChange={(val) => setEditForm((f) => ({ ...f, approval_status: String(val) }))}
                  />
                </div>
                <div>
                  <Label>Completion Date</Label>
                  <DatePicker
                    id="edit-completion-date"
                    label={undefined}
                    placeholder="YYYY-MM-DD"
                    defaultDate={editForm.completion_date || undefined}
                    onChange={(_selectedDates, dateStr) => setEditForm((f) => ({ ...f, completion_date: dateStr }))}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <DatePicker
                    id="edit-end-date"
                    label={undefined}
                    placeholder="YYYY-MM-DD"
                    defaultDate={editForm.end_date || undefined}
                    onChange={(_selectedDates, dateStr) => setEditForm((f) => ({ ...f, end_date: dateStr }))}
                  />
                </div>
                <div>
                  <Label>Project Budget</Label>
                  <InputField placeholder="Amount" value={String(editForm.project_budget ?? "")} onChange={(e) => setEditForm((f) => ({ ...f, project_budget: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label>Project Categories</Label>
                  <div className="flex items-center gap-2">
                    <InputField placeholder="Add category" value={editCategoryInput} onChange={(e) => setEditCategoryInput(e.target.value)} />
                    <Button size="sm" variant="outline" onClick={() => {
                      const v = editCategoryInput.trim();
                      if (!v) return;
                      setEditForm((f) => ({ ...f, project_category: Array.from(new Set([...(f.project_category || []), v])) }));
                      setEditCategoryInput("");
                    }}>Add</Button>
                  </div>
                </div>
                <div>
                  <Label>Services</Label>
                  <Select
                    options={serviceOptions.map((s) => ({ value: s._id, label: s.name || s._id }))}
                    defaultValue={""}
                    onChange={(v) => {
                      const val = String(v);
                      setEditForm((f) => ({ ...f, services: Array.from(new Set([...(f.services || []), val])) }));
                    }}
                  />
                </div>
                <div>
                  <Label>Collaborators</Label>
                  <Select
                    options={collabOptions.map((c) => ({ value: c._id, label: c.name || c.type || c._id }))}
                    defaultValue={""}
                    onChange={(v) => {
                      const val = String(v);
                      setEditForm((f) => ({ ...f, collaborators: Array.from(new Set([...(f.collaborators || []), val])) }));
                    }}
                  />
                </div>
                <div>
                  <Label>Target Locations</Label>
                  <div className="flex items-center gap-2">
                    <InputField placeholder="Add location" value={editTargetLocationInput} onChange={(e) => setEditTargetLocationInput(e.target.value)} />
                    <Button size="sm" variant="outline" onClick={() => {
                      const v = editTargetLocationInput.trim();
                      if (!v) return;
                      setEditForm((f) => ({ ...f, target: { ...(f.target || {}), location: Array.from(new Set([...(f.target?.location || []), v])) } }));
                      setEditTargetLocationInput("");
                    }}>Add</Button>
                  </div>
                </div>
                <div>
                  <Label>Target Platforms</Label>
                  <div className="flex items-center gap-2">
                    <InputField placeholder="Add platform" value={editTargetPlatformInput} onChange={(e) => setEditTargetPlatformInput(e.target.value)} />
                    <Button size="sm" variant="outline" onClick={() => {
                      const v = editTargetPlatformInput.trim();
                      if (!v) return;
                      setEditForm((f) => ({ ...f, target: { ...(f.target || {}), platforms: Array.from(new Set([...(f.target?.platforms || []), v])) } }));
                      setEditTargetPlatformInput("");
                    }}>Add</Button>
                  </div>
                </div>
                <div>
                  <Label>Target Age Groups</Label>
                  <div className="flex items-center gap-2">
                    <InputField placeholder="Add age group" value={editTargetAgeInput} onChange={(e) => setEditTargetAgeInput(e.target.value)} />
                    <Button size="sm" variant="outline" onClick={() => {
                      const v = editTargetAgeInput.trim();
                      if (!v) return;
                      setEditForm((f) => ({ ...f, target: { ...(f.target || {}), age_groups: Array.from(new Set([...(f.target?.age_groups || []), v])) } }));
                      setEditTargetAgeInput("");
                    }}>Add</Button>
                  </div>
                </div>
                <div>
                  <Label>Target Languages</Label>
                  <div className="flex items-center gap-2">
                    <InputField placeholder="Add language" value={editTargetLanguageInput} onChange={(e) => setEditTargetLanguageInput(e.target.value)} />
                    <Button size="sm" variant="outline" onClick={() => {
                      const v = editTargetLanguageInput.trim();
                      if (!v) return;
                      setEditForm((f) => ({ ...f, target: { ...(f.target || {}), languages: Array.from(new Set([...(f.target?.languages || []), v])) } }));
                      setEditTargetLanguageInput("");
                    }}>Add</Button>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <Label>Notes</Label>
                  <InputField placeholder="Project notes" value={editForm.notes || ""} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} />
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
            title="Delete project?"
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