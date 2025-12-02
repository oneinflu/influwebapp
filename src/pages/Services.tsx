/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";
import Alert from "../components/ui/alert/Alert";

import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router";
import PermissionGate from "../components/common/PermissionGate";
import { Modal } from "../components/ui/modal";
import Label from "../components/form/Label";
import InputField from "../components/form/input/InputField";
import TextArea from "../components/form/input/TextArea";
import Select from "../components/form/Select";
import Checkbox from "../components/form/input/Checkbox";
import DeleteConfirm from "../components/ui/confirm/DeleteConfirm";
import { InfoIcon, PencilIcon, TrashBinIcon, FileIcon, ShootingStarIcon } from "../icons";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../components/ui/table";
import Badge from "../components/ui/badge/Badge";
import TagInput from "../components/form/input/TagInput";

interface ServiceItem {
  _id: string;
  name: string;
  category?: string;
  description?: string;
  unit?: string;
  defaultDeliverables?: string[];
  tags?: string[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function Services() {
  const navigate = useNavigate();
  const { type, user } = useAuth();
  const ownerId = useMemo(() => (type === "user" ? user?._id ?? null : null), [type, user]);
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [, setLoading] = useState<boolean>(false);
  const [, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ServiceItem | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ServiceItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ServiceItem>>({});
  const [expandedDeliverables, setExpandedDeliverables] = useState<Record<string, boolean>>({});
  const [expandedTags, setExpandedTags] = useState<Record<string, boolean>>({});

  function handleViewService(s: ServiceItem) {
    setSelected(s);
    setViewOpen(true);
  }

  function handleEditService(s: ServiceItem) {
    setSelected(s);
    setEditForm({
      _id: s._id,
      name: s.name,
      category: (s as any).category,
      description: s.description,
      unit: (s as any).unit,
      defaultDeliverables: (s as any).defaultDeliverables || [],
      tags: (s as any).tags || [],
      isActive: (s as any).isActive ?? true,
    });
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editForm || !editForm._id) return;
    setSaving(true);
    try {
      const payload = {
        name: String(editForm.name || "").trim(),
        category: String((editForm as any).category || "").trim(),
        description: String(editForm.description || ""),
        unit: String((editForm as any).unit || ""),
        defaultDeliverables: Array.isArray((editForm as any).defaultDeliverables) ? (editForm as any).defaultDeliverables : [],
        tags: Array.isArray((editForm as any).tags) ? (editForm as any).tags : [],
        isActive: !!(editForm as any).isActive,
      };
      const { data } = await api.put(`/services/${editForm._id}`, payload);
      setItems((prev) => prev.map((sv) => (sv._id === data._id ? data : sv)));
      setEditOpen(false);
    } catch (e: any) {
      console.error(e);
      setError(e?.response?.data?.message || e?.message || "Failed to save service");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/services/${deleteTarget._id}`);
      setItems((prev) => prev.filter((sv) => sv._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (e: any) {
      console.error(e);
      setError(e?.response?.data?.message || e?.message || "Failed to delete service");
    } finally {
      setDeleting(false);
    }
  }
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function fetchServices() {
      if (!ownerId) return;
      setLoading(true);
      setErrorMessage("");
      try {
        const { data } = await api.get(`/services/user/${ownerId}`);
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
          return "Failed to load services.";
        })();
        setErrorMessage(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchServices();
    return () => { cancelled = true; };
  }, [ownerId]);

  function formatDate(d?: string) {
    if (!d) return "";
    try { return new Date(d).toLocaleDateString(); } catch { return String(d); }
  }

  return (
    <>
      <PageMeta title="Services & Rates" description="Manage services and pricing" />
      <PageBreadcrumb pageTitle="Services & Rates" />
      <PermissionGate group="services">
      <div className="space-y-6">
        <ComponentCard title="Services">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">Services offered under your account.</p>
            <Button size="sm" onClick={() => navigate("/services/new")}>Add Service</Button>
          </div>

          {errorMessage && (
            <Alert variant="error" title="Error" message={errorMessage} />
          )}

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] mt-6">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Name</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Category</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Description</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Unit</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Deliverables</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Tags</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Active</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Created</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Updated</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">No services found.</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                    </TableRow>
                  ) : (
                    items.map((s) => (
                      <TableRow key={s._id}>
                        <TableCell className="px-5 py-4 sm:px-6 text-start">
                          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">{s.name}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-700 text-start text-theme-sm dark:text-gray-300">{(s as any).category || "—"}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{s.description || "—"}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{(s as any).unit || "—"}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          <div className="flex flex-wrap items-center gap-2">
                            {(() => {
                              const arr = (((s as any).defaultDeliverables as string[]) || []).filter(Boolean);
                              const showAll = !!expandedDeliverables[s._id];
                              const display = showAll ? arr : arr.slice(0, 3);
                              return (
                                <>
                                  {display.map((d, i) => (
                                    <Badge key={`${d}-${i}`} variant="light" color="primary" size="sm" startIcon={<FileIcon className="h-3 w-3" />}>{d}</Badge>
                                  ))}
                                  {arr.length > 3 && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="px-2 py-1 text-theme-xs"
                                      onClick={() => setExpandedDeliverables((prev) => ({ ...prev, [s._id]: !prev[s._id] }))}
                                      type="button"
                                    >
                                      {showAll ? "Show less" : `+${arr.length - 3} more`}
                                    </Button>
                                  )}
                                  {arr.length === 0 && (
                                    <span className="text-theme-sm text-gray-500 dark:text-gray-400">—</span>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          <div className="flex flex-wrap items-center gap-2">
                            {(() => {
                              const arr = (((s as any).tags as string[]) || []).filter(Boolean);
                              const showAll = !!expandedTags[s._id];
                              const display = showAll ? arr : arr.slice(0, 3);
                              return (
                                <>
                                  {display.map((t, i) => (
                                    <Badge key={`${t}-${i}`} variant="light" color="info" size="sm" startIcon={<ShootingStarIcon className="h-3 w-3" />}>{t}</Badge>
                                  ))}
                                  {arr.length > 3 && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="px-2 py-1 text-theme-xs"
                                      onClick={() => setExpandedTags((prev) => ({ ...prev, [s._id]: !prev[s._id] }))}
                                      type="button"
                                    >
                                      {showAll ? "Show less" : `+${arr.length - 3} more`}
                                    </Button>
                                  )}
                                  {arr.length === 0 && (
                                    <span className="text-theme-sm text-gray-500 dark:text-gray-400">—</span>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{(s as any).isActive ? "Yes" : "No"}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{formatDate((s as any).createdAt)}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{formatDate((s as any).updatedAt)}</TableCell>
                        <TableCell className="px-4 py-3 text-start">
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleViewService(s)}>
                              <InfoIcon className="h-5 w-5" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleEditService(s)}>
                              <PencilIcon className="h-5 w-5" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(s)}>
                              <TrashBinIcon className="h-5 w-5 text-red-600" />
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

        {/* Horizontal Cards View */}
        

        {/* View Service Modal */}
        <Modal isOpen={viewOpen} onClose={() => setViewOpen(false)} className="max-w-[700px] m-4">
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Service details</h3>
            {selected ? (
              <div className="space-y-3">
                <div>
                  <Label>Name</Label>
                  <div className="text-sm text-gray-800 dark:text-gray-200">{selected.name}</div>
                </div>
                <div>
                  <Label>Category</Label>
                  <div className="text-sm text-gray-800 dark:text-gray-200">{(selected as any).category || "-"}</div>
                </div>
                {selected.description && (
                  <div>
                    <Label>Description</Label>
                    <div className="text-sm whitespace-pre-wrap text-gray-800 dark:text-gray-200">{selected.description}</div>
                  </div>
                )}
                <div>
                  <Label>Unit</Label>
                  <div className="text-sm text-gray-800 dark:text-gray-200">{(selected as any).unit || "-"}</div>
                </div>
                <div>
                  <Label>Default Deliverables</Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {(((selected as any).defaultDeliverables as string[]) || []).filter(Boolean).map((d: string, i: number) => (
                      <Badge key={`${d}-${i}`} variant="light" color="primary" size="sm" startIcon={<FileIcon className="h-3 w-3" />}>{d}</Badge>
                    ))}
                    {(!Array.isArray((selected as any).defaultDeliverables) || ((selected as any).defaultDeliverables || []).length === 0) && (
                      <span className="text-theme-sm text-gray-500 dark:text-gray-400">—</span>
                    )}
                  </div>
                </div>
                <div>
                  <Label>Tags</Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {(((selected as any).tags as string[]) || []).filter(Boolean).map((t: string, i: number) => (
                      <Badge key={`${t}-${i}`} variant="light" color="info" size="sm" startIcon={<ShootingStarIcon className="h-3 w-3" />}>{t}</Badge>
                    ))}
                    {(!Array.isArray((selected as any).tags) || ((selected as any).tags || []).length === 0) && (
                      <span className="text-theme-sm text-gray-500 dark:text-gray-400">—</span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-sm">Active: <span className="font-medium">{(selected as any).isActive ? "Yes" : "No"}</span></div>
                  <div className="text-sm">Created: <span className="font-medium">{formatDate((selected as any).createdAt)}</span></div>
                  <div className="text-sm">Updated: <span className="font-medium">{formatDate((selected as any).updatedAt)}</span></div>
                </div>
              </div>
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="primary" onClick={() => setViewOpen(false)}>Close</Button>
            </div>
          </div>
        </Modal>

        {/* Edit Service Modal */}
        <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} className="max-w-[700px] m-4">
          <div className="p-6 space-y-6">
            <h3 className="text-lg font-semibold">Edit service</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <InputField
                  value={String(editForm.name || "")}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Category</Label>
                <InputField
                  value={String((editForm as any).category || "")}
                  onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <TextArea
                value={String(editForm.description || "")}
                onChange={(val) => setEditForm((f) => ({ ...f, description: val }))}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Unit</Label>
                <Select
                  defaultValue={String((editForm as any).unit || "per_deliverable")}
                  onChange={(val) => setEditForm((f) => ({ ...f, unit: val }))}
                  options={[
                    { label: "per_deliverable", value: "per_deliverable" },
                    { label: "per_project", value: "per_project" },
                    { label: "per_hour", value: "per_hour" },
                  ]}
                />
              </div>
              <div>
                <Label>Active</Label>
                <div className="mt-2">
                  <Checkbox
                    label="Service is active"
                    checked={!!(editForm as any).isActive}
                    onChange={(checked) => setEditForm((f) => ({ ...f, isActive: checked }))}
                  />
                </div>
              </div>
            </div>
            <div>
              <Label>Default Deliverables</Label>
              <TagInput
                values={(Array.isArray((editForm as any).defaultDeliverables) ? (editForm as any).defaultDeliverables : []) as string[]}
                onChange={(vals) => setEditForm((f) => ({ ...f, defaultDeliverables: vals }))}
                placeholder="Type and press Enter"
              />
            </div>
            <div>
              <Label>Tags</Label>
              <TagInput
                values={(Array.isArray((editForm as any).tags) ? (editForm as any).tags : []) as string[]}
                onChange={(vals) => setEditForm((f) => ({ ...f, tags: vals }))}
                placeholder="Type and press Enter"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={saveEdit} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirm */}
        <DeleteConfirm
          title="Delete service?"
          description={deleteTarget ? `This will delete ${deleteTarget.name}.` : ""}
          isOpen={!!deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
          loading={deleting}
        />
        </ComponentCard>
      </div>
      </PermissionGate>
    </>
  );
}
