/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../components/ui/table";
import api from "../utils/api";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { Modal } from "../components/ui/modal/index";
import Label from "../components/form/Label";
import Badge from "../components/ui/badge/Badge";
import { FileIcon, ShootingStarIcon } from "../icons";
import InputField from "../components/form/input/InputField";
import TextArea from "../components/form/input/TextArea";
import Select from "../components/form/Select";
import TagInput from "../components/form/input/TagInput";

interface Project {
  _id: string;
  name: string;
  client: string;
  project_category: string[];
  services: string[];
  status: string;
  project_budget: number;
  end_date: string;
  createdAt?: string;
  updatedAt?: string;
  approval_status?: string;
  quotation_id?: string;
  final_confirmed_rate_cards?: string[];
  assigned_collaborators?: string[];
  collaborators?: string[];
  deliverables?: string[];
  target?: { location?: string[]; platforms?: string[]; age_groups?: string[]; languages?: string[] };
  notes?: string;
}

export default function Projects() {
  const navigate = useNavigate();
  const { type, user } = useAuth();
  const ownerId = useMemo(() => (type === "user" ? user?._id ?? null : null), [type, user]);
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [clientMap, setClientMap] = useState<Record<string, string>>({});
  const [serviceMap, setServiceMap] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Project | null>(null);
  const [viewOpen, setViewOpen] = useState<boolean>(false);
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<Partial<Project>>({});

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [{ data: projects }, { data: clients }, { data: services }] = await Promise.all([
          api.get("/projects"),
          ownerId ? api.get("/clients", { params: { user_id: ownerId } }) : api.get("/clients"),
          ownerId ? api.get("/services", { params: { user_id: ownerId } }) : api.get("/services"),
        ]);
        if (!cancelled) {
          setItems(Array.isArray(projects) ? projects : []);
          const cm: Record<string, string> = {};
          const sm: Record<string, string> = {};
          if (Array.isArray(clients)) clients.forEach((c: any) => { if (c && c._id) cm[c._id] = c.business_name || c._id; });
          if (Array.isArray(services)) services.forEach((s: any) => { if (s && s._id) sm[s._id] = s.name || s._id; });
          setClientMap(cm);
          setServiceMap(sm);
        }
      } catch (error) {
        console.error("Failed to fetch projects", error);
      }
      if (!cancelled) setLoading(false);
    };
    fetchData();
    return () => { cancelled = true; };
  }, [ownerId]);

  function formatDate(d?: string) {
    if (!d) return "";
    try { return new Date(d).toLocaleDateString(); } catch { return String(d); }
  }

  return (
    <>
      <PageMeta title="Projects" description="Manage projects" />
      <PageBreadcrumb pageTitle="Projects" />
      <div className="space-y-6">
        <ComponentCard title="Projects" desc="List of projects">
          <div className="flex items-center justify-end">
            <Button size="sm" variant="primary" onClick={() => navigate("/projects/new")}>Add Project</Button>
          </div>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] mt-6">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Name</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Client</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Category</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Services</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Budget</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">End Date</TableCell>
                   <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {loading ? (
                    <TableRow>
                      <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">Loading...</TableCell>
                      <TableCell>{''}</TableCell>
                      <TableCell>{''}</TableCell>
                      <TableCell>{''}</TableCell>
                      <TableCell>{''}</TableCell>
                      <TableCell>{''}</TableCell>
                      <TableCell>{''}</TableCell>
                     
                      <TableCell>{''}</TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400" >No projects found.</TableCell>
                      <TableCell>{''}</TableCell>
                      <TableCell>{''}</TableCell>
                      <TableCell>{''}</TableCell>
                      <TableCell>{''}</TableCell>
                      <TableCell>{''}</TableCell>
                      <TableCell>{''}</TableCell>
                      <TableCell>{''}</TableCell>
                      <TableCell>{''}</TableCell>
                     
                      <TableCell>{''}</TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                    <TableRow key={item._id}>
                        <TableCell className="px-5 py-4 sm:px-6 text-start">
                          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">{item.name}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-700 text-start text-theme-sm dark:text-gray-300">{clientMap[item.client] || item.client}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{item.project_category.join(", ")}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{item.services.map((id) => serviceMap[id] || id).join(", ")}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{item.status}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{item.project_budget}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{formatDate(item.end_date)}</TableCell>
                        <TableCell className="px-4 py-3 text-start">
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => { setSelected(item); setViewOpen(true); }} startIcon={<Eye className="h-4 w-4" />}>{''}</Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelected(item);
                                setEditForm({
                                  _id: item._id,
                                  name: item.name,
                                  status: item.status,
                                  approval_status: (item as any).approval_status,
                                  project_budget: item.project_budget,
                                  end_date: item.end_date,
                                  project_category: item.project_category || [],
                                  notes: (item as any).notes,
                                });
                                setEditOpen(true);
                              }}
                              startIcon={<Pencil className="h-4 w-4" />}
                            >
                              {''}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => {}} startIcon={<Trash2 className="h-4 w-4" />}>{''}</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
              </TableBody>
            </Table>
          </div>
        </div>
        <Modal isOpen={viewOpen} className="max-w-[800px] m-4" onClose={() => setViewOpen(false)} >
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Project details</h3>
            {selected ? (
              <div className="space-y-3">
                <div>
                  <Label>Name</Label>
                  <div className="text-sm text-gray-800 dark:text-gray-200">{selected.name}</div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Client</Label>
                    <div className="text-sm text-gray-800 dark:text-gray-200">{clientMap[selected.client] || selected.client}</div>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <div className="text-sm text-gray-800 dark:text-gray-200">{selected.status}</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Approval Status</Label>
                    <div className="text-sm text-gray-800 dark:text-gray-200">{(selected as any).approval_status || "-"}</div>
                  </div>
                  <div>
                    <Label>Budget</Label>
                    <div className="text-sm text-gray-800 dark:text-gray-200">{selected.project_budget ?? "-"}</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label>End Date</Label>
                    <div className="text-sm text-gray-800 dark:text-gray-200">{formatDate(selected.end_date)}</div>
                  </div>
                  <div>
                    <Label>Quotation</Label>
                    <div className="text-sm text-gray-800 dark:text-gray-200">{(selected as any).quotation_id || "-"}</div>
                  </div>
                </div>
                <div>
                  <Label>Category</Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {(selected.project_category || []).filter(Boolean).map((c, i) => (
                      <Badge key={`${c}-${i}`} variant="light" color="primary" size="sm" startIcon={<ShootingStarIcon className="h-3 w-3" />}>{c}</Badge>
                    ))}
                    {(!Array.isArray(selected.project_category) || (selected.project_category || []).length === 0) && (
                      <span className="text-theme-sm text-gray-500 dark:text-gray-400">—</span>
                    )}
                  </div>
                </div>
                <div>
                  <Label>Services</Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {(selected.services || []).filter(Boolean).map((sid, i) => (
                      <Badge key={`${sid}-${i}`} variant="light" color="info" size="sm" startIcon={<FileIcon className="h-3 w-3" />}>{serviceMap[sid] || sid}</Badge>
                    ))}
                    {(!Array.isArray(selected.services) || (selected.services || []).length === 0) && (
                      <span className="text-theme-sm text-gray-500 dark:text-gray-400">—</span>
                    )}
                  </div>
                </div>
                <div>
                  <Label>Deliverables</Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {(((selected as any).deliverables as string[]) || []).filter(Boolean).map((d, i) => (
                      <Badge key={`${d}-${i}`} variant="light" color="primary" size="sm" startIcon={<FileIcon className="h-3 w-3" />}>{d}</Badge>
                    ))}
                    {(!Array.isArray((selected as any).deliverables) || (((selected as any).deliverables || []).length === 0)) && (
                      <span className="text-theme-sm text-gray-500 dark:text-gray-400">—</span>
                    )}
                  </div>
                </div>
                <div>
                  <Label>Target</Label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <Label>Location</Label>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {(((selected.target?.location as string[]) || [])).filter(Boolean).map((t, i) => (
                          <Badge key={`${t}-${i}`} variant="light" color="primary" size="sm">{t}</Badge>
                        ))}
                        {(!Array.isArray(selected.target?.location) || ((selected.target?.location || []).length === 0)) && (
                          <span className="text-theme-sm text-gray-500 dark:text-gray-400">—</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label>Platforms</Label>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {(((selected.target?.platforms as string[]) || [])).filter(Boolean).map((t, i) => (
                          <Badge key={`${t}-${i}`} variant="light" color="info" size="sm">{t}</Badge>
                        ))}
                        {(!Array.isArray(selected.target?.platforms) || ((selected.target?.platforms || []).length === 0)) && (
                          <span className="text-theme-sm text-gray-500 dark:text-gray-400">—</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label>Age Groups</Label>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {(((selected.target?.age_groups as string[]) || [])).filter(Boolean).map((t, i) => (
                          <Badge key={`${t}-${i}`} variant="light" color="info" size="sm">{t}</Badge>
                        ))}
                        {(!Array.isArray(selected.target?.age_groups) || ((selected.target?.age_groups || []).length === 0)) && (
                          <span className="text-theme-sm text-gray-500 dark:text-gray-400">—</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label>Languages</Label>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {(((selected.target?.languages as string[]) || [])).filter(Boolean).map((t, i) => (
                          <Badge key={`${t}-${i}`} variant="light" color="info" size="sm">{t}</Badge>
                        ))}
                        {(!Array.isArray(selected.target?.languages) || ((selected.target?.languages || []).length === 0)) && (
                          <span className="text-theme-sm text-gray-500 dark:text-gray-400">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <div className="text-sm whitespace-pre-wrap text-gray-800 dark:text-gray-200">{(selected as any).notes || "-"}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-sm">Created: <span className="font-medium">{formatDate(selected.createdAt)}</span></div>
                  <div className="text-sm">Updated: <span className="font-medium">{formatDate(selected.updatedAt)}</span></div>
                </div>
              </div>
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="primary" onClick={() => setViewOpen(false)}>Close</Button>
            </div>
          </div>
        </Modal>
        <Modal isOpen={editOpen} className="max-w-[800px] m-4" onClose={() => setEditOpen(false)}>
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Edit project</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>Name</Label>
                <InputField value={String(editForm.name || "")} onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))} />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  options={[
                    { value: "in_progress", label: "In Progress" },
                    { value: "completed", label: "Completed" },
                    { value: "on_hold", label: "On Hold" },
                  ]}
                  value={String(editForm.status || "in_progress")}
                  onChange={(v) => setEditForm((prev) => ({ ...prev, status: String(v) }))}
                />
              </div>
              <div>
                <Label>Approval Status</Label>
                <Select
                  options={[
                    { value: "pending", label: "Pending" },
                    { value: "approved", label: "Approved" },
                    { value: "rejected", label: "Rejected" },
                  ]}
                  value={String((editForm as any).approval_status || "pending")}
                  onChange={(v) => setEditForm((prev) => ({ ...prev, approval_status: String(v) }))}
                />
              </div>
              <div>
                <Label>Budget</Label>
                <InputField type="number" value={String((editForm as any).project_budget ?? "")} onChange={(e) => setEditForm((prev) => ({ ...prev, project_budget: Number(e.target.value || 0) }))} />
              </div>
              <div>
                <Label>End Date</Label>
                <InputField type="date" value={String(editForm.end_date || "")} onChange={(e) => setEditForm((prev) => ({ ...prev, end_date: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <Label>Category</Label>
                <TagInput values={(editForm.project_category || []) as string[]} onChange={(vals) => setEditForm((prev) => ({ ...prev, project_category: vals }))} placeholder="Add categories" />
              </div>
              <div className="sm:col-span-2">
                <Label>Notes</Label>
                <TextArea rows={4} value={String((editForm as any).notes || "")} onChange={(v) => setEditForm((prev) => ({ ...prev, notes: v }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={async () => {
                  if (!editForm || !editForm._id) return;
                  const payload = {
                    name: String(editForm.name || "").trim(),
                    status: String(editForm.status || "in_progress"),
                    approval_status: String((editForm as any).approval_status || "pending"),
                    project_budget: typeof (editForm as any).project_budget === "number" ? (editForm as any).project_budget : Number((editForm as any).project_budget || 0),
                    end_date: String(editForm.end_date || ""),
                    project_category: Array.isArray(editForm.project_category) ? editForm.project_category : [],
                    notes: String((editForm as any).notes || ""),
                  };
                  try {
                    const { data } = await api.put(`/projects/${editForm._id}`, payload);
                    setItems((prev) => prev.map((p) => (p._id === data._id ? data : p)));
                    setEditOpen(false);
                  } catch (e) {
                    console.error("Failed to update project", e);
                  }
                }}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>
        </ComponentCard>
      </div>
    </>
  );
}
