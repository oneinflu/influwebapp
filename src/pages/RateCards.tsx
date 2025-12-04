/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";
import Alert from "../components/ui/alert/Alert";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../components/ui/table";
import { Modal } from "../components/ui/modal";
import Badge from "../components/ui/badge/Badge";
import { FileIcon, ShootingStarIcon, InfoIcon, PencilIcon, TrashBinIcon } from "../icons";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router";
import Label from "../components/form/Label";
import InputField from "../components/form/input/InputField";
import Select from "../components/form/Select";
import TextArea from "../components/form/input/TextArea";
import TagInput from "../components/form/input/TagInput";
import DeleteConfirm from "../components/ui/confirm/DeleteConfirm";

type Addon = { name?: string; price?: number };

interface RateCardItem {
  _id: string;
  serviceId?: string;
  ownerType?: string;
  ownerRef?: string;
  title?: string;
  price?: number;
  currency?: string;
  deliveryDays?: number;
  revisions?: number;
  addons?: Addon[];
  visibility?: string;
  isActive?: boolean;
  meta?: { equipment?: string[] };
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function RateCards() {
  const { type, user } = useAuth();
  const ownerId = useMemo(() => (type === "user" ? user?._id ?? null : null), [type, user]);
  const [items, setItems] = useState<RateCardItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [selected, setSelected] = useState<RateCardItem | null>(null);
  const [viewOpen, setViewOpen] = useState<boolean>(false);
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<RateCardItem | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<Partial<RateCardItem>>({});
  const navigate = useNavigate();
  const [collaborators, setCollaborators] = useState<Array<{ _id: string; label: string }>>([]);

  

  const [serviceMap, setServiceMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    async function loadServices() {
      try {
        if (!ownerId) return;
        const { data } = await api.get("/services", { params: { user_id: ownerId } });
        const map: Record<string, string> = {};
        (Array.isArray(data) ? data : []).forEach((s: { _id?: string; name?: string }) => {
          if (s && s._id) map[String(s._id)] = String(s.name || s._id);
        });
        if (!cancelled) setServiceMap(map);
      } catch { void 0; }
    }
    async function loadCollaborators() {
      try {
        if (!ownerId) return;
        const { data } = await api.get(`/collaborators/user/${ownerId}`);
        const opts: Array<{ _id: string; label: string }> = [];
        (Array.isArray(data) ? data : []).forEach((c: any) => {
          const id = String(c?._id || "");
          if (!id) return;
          const label = String(
            (c?.identity?.display_name || c?.identity?.full_name || c?.type || id) ?? id
          );
          opts.push({ _id: id, label });
        });
        if (!cancelled) setCollaborators(opts);
      } catch { void 0; }
    }
    loadServices();
    loadCollaborators();
    return () => { cancelled = true; };
  }, [ownerId]);

  async function fetchRateCards() {
    setErrorMessage("");
    try {
      const { data } = await api.get(ownerId ? `/rate-cards/user/${ownerId}` : "/rate-cards");
      setItems(Array.isArray(data) ? data : []);
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
        return "Failed to load rate cards.";
      })();
      setErrorMessage(message);
    } finally {
      // no-op
    }
  }

  useEffect(() => { void fetchRateCards(); }, [ownerId]);

  function formatDate(d?: string) {
    if (!d) return "";
    try { return new Date(d).toLocaleDateString(); } catch { return String(d); }
  }

  function formatMoney(n?: number, c?: string) {
    if (typeof n !== "number") return "";
    const s = n.toLocaleString();
    return c ? `${s} ${c}` : s;
  }

  const ownerRoles: string[] = useMemo(() => {
    const reg = (user as any)?.registration;
    const roles = Array.isArray(reg?.roles) ? (reg.roles as string[]) : [];
    return roles.map((r) => String(r));
  }, [user]);
  const canAgency = ownerRoles.includes("agency") || ownerRoles.includes("business");
  const canPlatform = ownerRoles.includes("platform");
  const isOwner = !!(user as any)?.registration?.isOwner;
  const derivedOwnerRef = useMemo(() => {
    const selfId = String(user?._id || "");
    const managedBy = String((user as any)?.managed_by || "");
    return isOwner ? selfId : (managedBy || selfId);
  }, [user, isOwner]);

  useEffect(() => {
    const t = String(editForm.ownerType || "");
    if (!t) return;
    if (t === "collaborator") {
      setEditForm((f) => ({ ...f, ownerRef: String(user?._id || "") }));
    } else if (t === "agency_internal") {
      setEditForm((f) => ({ ...f, ownerRef: "" }));
    } else {
      setEditForm((f) => ({ ...f, ownerRef: derivedOwnerRef }));
    }
  }, [editForm.ownerType, derivedOwnerRef, user]);

  function addEditAddonRow() {
    setEditForm((f) => ({ ...f, addons: [ ...(Array.isArray(f.addons) ? f.addons : []), { name: "", price: 0 } ] }));
  }

  function updateEditAddon(idx: number, field: "name" | "price", value: string) {
    setEditForm((f) => ({
      ...f,
      addons: (Array.isArray(f.addons) ? f.addons : []).map((ad, i) => i === idx ? { ...ad, [field]: field === "price" ? Number(value) : value } : ad),
    }));
  }

  function removeEditAddon(idx: number) {
    setEditForm((f) => ({
      ...f,
      addons: (Array.isArray(f.addons) ? f.addons : []).filter((_, i) => i !== idx),
    }));
  }

  function handleViewRateCard(rc: RateCardItem) {
    setSelected(rc);
    setViewOpen(true);
  }

  function handleEditRateCard(rc: RateCardItem) {
    setSelected(rc);
    setEditForm({
      _id: rc._id,
      serviceId: rc.serviceId,
      ownerType: rc.ownerType,
      ownerRef: rc.ownerRef,
      title: rc.title,
      price: rc.price,
      currency: rc.currency,
      deliveryDays: rc.deliveryDays,
      revisions: rc.revisions,
      addons: Array.isArray(rc.addons) ? rc.addons : [],
      visibility: rc.visibility,
      isActive: rc.isActive,
      notes: rc.notes,
      meta: { equipment: rc.meta?.equipment || [] },
    });
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editForm || !editForm._id) return;
    setSaving(true);
    try {
      const payload = {
        serviceId: String(editForm.serviceId || ""),
        ownerType: String(editForm.ownerType || ""),
        ownerRef: String(editForm.ownerRef || ""),
        title: String(editForm.title || "").trim(),
        price: typeof editForm.price === "number" ? editForm.price : Number(editForm.price || 0),
        currency: String(editForm.currency || "").trim(),
        deliveryDays: typeof editForm.deliveryDays === "number" ? editForm.deliveryDays : Number(editForm.deliveryDays || 0),
        revisions: typeof editForm.revisions === "number" ? editForm.revisions : Number(editForm.revisions || 0),
        addons: (Array.isArray(editForm.addons) ? editForm.addons : []).filter((a) => (a?.name && String(a.name).trim().length > 0)).map((a) => ({ name: String(a.name), price: Number(a.price) })),
        visibility: String(editForm.visibility || "").trim(),
        isActive: !!editForm.isActive,
        meta: { equipment: Array.isArray(editForm.meta?.equipment) ? editForm.meta?.equipment : [] },
        notes: String(editForm.notes || ""),
      };
      const { data } = await api.put(`/rate-cards/${editForm._id}`, payload);
      setItems((prev) => prev.map((it) => (it._id === data._id ? data : it)));
      setEditOpen(false);
    } catch (e: unknown) {
      console.error(e);
      const msg = (() => {
        if (e && typeof e === "object") {
          const respMsg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
          if (typeof respMsg === "string" && respMsg.trim()) return respMsg;
          const errMsg = (e as { message?: string }).message;
          if (typeof errMsg === "string" && errMsg.trim()) return errMsg;
        }
        return "Failed to save rate card";
      })();
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/rate-cards/${deleteTarget._id}`);
      setItems((prev) => prev.filter((it) => it._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (e: unknown) {
      console.error(e);
      const msg = (() => {
        if (e && typeof e === "object") {
          const respMsg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
          if (typeof respMsg === "string" && respMsg.trim()) return respMsg;
          const errMsg = (e as { message?: string }).message;
          if (typeof errMsg === "string" && errMsg.trim()) return errMsg;
        }
        return "Failed to delete rate card";
      })();
      setErrorMessage(msg);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageMeta title="Rate Cards" description="Browse rate cards for services" />
      <PageBreadcrumb pageTitle="Rate Cards" />
      <div className="space-y-6">
        <ComponentCard title="Rate Cards" desc="List of rate cards">
          {errorMessage && (
            <Alert variant="error" title="Error" message={errorMessage} />
          )}

          <div className="flex items-center justify-end">
            <Button size="sm" variant="primary" onClick={() => navigate("/rate-cards/new")}>Add Rate Card</Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] mt-6">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Title</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Service</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Price</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Delivery</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Revisions</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Addons</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Visibility</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Active</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Created</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Updated</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">No rate cards found.</TableCell>
                      <TableCell>{""}</TableCell>
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
                    items.map((rc) => (
                      <TableRow key={rc._id}>
                        <TableCell className="px-5 py-4 sm:px-6 text-start">
                          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">{rc.title || rc._id}</span>
                          <span className="block text-theme-xs text-gray-500 dark:text-gray-400">{rc.ownerType || ""}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-700 text-start text-theme-sm dark:text-gray-300">{rc.serviceId ? (serviceMap[rc.serviceId] || rc.serviceId) : "—"}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-700 text-start text-theme-sm dark:text-gray-300">{formatMoney(rc.price, rc.currency)}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-700 text-start text-theme-sm dark:text-gray-300">{typeof rc.deliveryDays === "number" ? `${rc.deliveryDays} days` : "—"}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-700 text-start text-theme-sm dark:text-gray-300">{typeof rc.revisions === "number" ? rc.revisions : "—"}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          <div className="flex flex-wrap items-center gap-2">
                            {(Array.isArray(rc.addons) ? rc.addons : []).filter(Boolean).map((ad, i) => (
                              <Badge key={`${rc._id}-ad-${i}`} variant="light" color="primary" size="sm" startIcon={<FileIcon className="h-3 w-3" />}>{`${ad.name || "Addon"} — ${formatMoney(ad.price, rc.currency)}`}</Badge>
                            ))}
                            {(!Array.isArray(rc.addons) || (rc.addons || []).length === 0) && (
                              <span className="text-theme-sm text-gray-500 dark:text-gray-400">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{rc.visibility || "—"}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{rc.isActive ? "Yes" : "No"}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{formatDate(rc.createdAt)}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{formatDate(rc.updatedAt)}</TableCell>
                        <TableCell className="px-4 py-3 text-start">
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleViewRateCard(rc)}>
                              <InfoIcon className="h-5 w-5" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleEditRateCard(rc)}>
                              <PencilIcon className="h-5 w-5" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(rc)}>
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

          <Modal isOpen={viewOpen} onClose={() => setViewOpen(false)} className="max-w-[700px] m-4">
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-semibold">Rate card details</h3>
              {selected ? (
                <div className="space-y-3">
                  <div>
                    <Label>Title</Label>
                    <div className="text-sm text-gray-800 dark:text-gray-200">{selected.title || selected._id}</div>
                  </div>
                  <div>
                    <Label>Service</Label>
                    <div className="text-sm text-gray-800 dark:text-gray-200">{selected.serviceId ? (serviceMap[selected.serviceId] || selected.serviceId) : "-"}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-sm">Price: <span className="font-medium">{formatMoney(selected.price, selected.currency)}</span></div>
                    <div className="text-sm">Delivery: <span className="font-medium">{typeof selected.deliveryDays === "number" ? `${selected.deliveryDays} days` : "-"}</span></div>
                    <div className="text-sm">Revisions: <span className="font-medium">{typeof selected.revisions === "number" ? selected.revisions : "-"}</span></div>
                    <div className="text-sm">Visibility: <span className="font-medium">{selected.visibility || "-"}</span></div>
                    <div className="text-sm">Active: <span className="font-medium">{selected.isActive ? "Yes" : "No"}</span></div>
                  </div>
                  <div>
                    <Label>Addons</Label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {(Array.isArray(selected.addons) ? selected.addons : []).filter(Boolean).map((ad, i) => (
                        <Badge key={`sel-${i}`} variant="light" color="primary" size="sm" startIcon={<FileIcon className="h-3 w-3" />}>{`${ad.name || "Addon"} — ${formatMoney(ad.price, selected.currency)}`}</Badge>
                      ))}
                      {(!Array.isArray(selected.addons) || (selected.addons || []).length === 0) && (
                        <span className="text-theme-sm text-gray-500 dark:text-gray-400">—</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Equipment</Label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {(((selected.meta?.equipment || []) as string[]) || []).filter(Boolean).map((eq, i) => (
                        <Badge key={`eq-${i}`} variant="light" color="info" size="sm" startIcon={<ShootingStarIcon className="h-3 w-3" />}>{eq}</Badge>
                      ))}
                      {(!Array.isArray(selected.meta?.equipment) || ((selected.meta?.equipment || [])).length === 0) && (
                        <span className="text-theme-sm text-gray-500 dark:text-gray-400">—</span>
                      )}
                    </div>
                  </div>
                  {selected.notes && (
                    <div>
                      <Label>Notes</Label>
                      <div className="text-sm whitespace-pre-wrap text-gray-800 dark:text-gray-200">{selected.notes}</div>
                    </div>
                  )}
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

          {/* Edit Rate Card Modal */}
          <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} className="max-w-[700px] m-4">
            <div className="p-6 space-y-6">
              <h3 className="text-lg font-semibold">Edit rate card</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Service</Label>
                  <Select
                    key={String(editForm._id || editForm.serviceId || "service-select")}
                    options={[
                      { value: "", label: "Select service" },
                      ...Object.entries(serviceMap).map(([id, name]) => ({ value: id, label: name })),
                      ...(editForm.serviceId && !serviceMap[String(editForm.serviceId)]
                        ? [{ value: String(editForm.serviceId), label: String(editForm.serviceId) }]
                        : []),
                    ]}
                    defaultValue={String(editForm.serviceId || "")}
                    value={String(editForm.serviceId || "")}
                    onChange={(v) => setEditForm((f) => ({ ...f, serviceId: v }))}
                  />
                </div>
                <div>
                  <Label>Owner Type</Label>
                  <Select
                    key={String(editForm._id || editForm.ownerType || "owner-type-select")}
                    options={[
                      { value: "", label: "Select" },
                      { value: "collaborator", label: "Individual" },
                      ...(canAgency ? [
                        { value: "agency", label: "Business/Agency" },
                        { value: "agency_internal", label: "Internal Collaborators" },
                      ] : []),
                      ...(canPlatform ? [
                        { value: "platform", label: "Platform" },
                      ] : []),
                    ]}
                    defaultValue={String(editForm.ownerType || "")}
                    onChange={(v) => setEditForm((f) => ({ ...f, ownerType: v }))}
                  />
                </div>
              </div>
              {String(editForm.ownerType || "") === "agency_internal" ? (
                <div>
                  <Label>Owner Ref</Label>
                  <Select
                    key={String(editForm._id || editForm.ownerRef || "owner-ref-select")}
                    options={collaborators.map((c) => ({ value: c._id, label: c.label }))}
                    defaultValue={String(editForm.ownerRef || "")}
                    onChange={(v) => setEditForm((f) => ({ ...f, ownerRef: v }))}
                  />
                </div>
              ) : null}
              <div>
                <Label>Title</Label>
                <InputField
                  value={String(editForm.title || "")}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Price (paise)</Label>
                  <InputField
                    type="number"
                    value={String(editForm.price ?? 0)}
                    onChange={(e) => setEditForm((f) => ({ ...f, price: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Select
                    key={String(editForm._id || editForm.currency || "currency-select")}
                    options={[
                      { value: "INR", label: "INR" },
                      { value: "USD", label: "USD" },
                      { value: "EUR", label: "EUR" },
                      { value: "GBP", label: "GBP" },
                      { value: "AUD", label: "AUD" },
                    ]}
                    defaultValue={String(editForm.currency || "INR")}
                    onChange={(v) => setEditForm((f) => ({ ...f, currency: v }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Delivery Days</Label>
                  <InputField
                    type="number"
                    value={String(editForm.deliveryDays ?? "")}
                    onChange={(e) => setEditForm((f) => ({ ...f, deliveryDays: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>Revisions</Label>
                  <InputField
                    type="number"
                    value={String(editForm.revisions ?? "")}
                    onChange={(e) => setEditForm((f) => ({ ...f, revisions: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div>
                <Label>Addons</Label>
                <div className="space-y-2">
                  {(Array.isArray(editForm.addons) ? editForm.addons : []).map((ad, idx) => (
                    <div key={`edit-ad-${idx}`} className="grid grid-cols-1 gap-2 sm:grid-cols-6">
                      <div className="sm:col-span-4">
                        <InputField value={String(ad.name || "")} onChange={(e) => updateEditAddon(idx, "name", e.target.value)} />
                      </div>
                      <div className="sm:col-span-2 flex items-center gap-2">
                        <InputField type="number" value={String(ad.price ?? 0)} onChange={(e) => updateEditAddon(idx, "price", e.target.value)} />
                        <Button type="button" variant="outline" size="sm" onClick={() => removeEditAddon(idx)}>Remove</Button>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addEditAddonRow}>Add addon</Button>
                </div>
              </div>
              <div>
                <Label>Equipment</Label>
                <TagInput
                  values={(Array.isArray(editForm.meta?.equipment) ? editForm.meta?.equipment : []) as string[]}
                  onChange={(vals) => setEditForm((f) => ({ ...f, meta: { equipment: vals } }))}
                  placeholder="Premiere, CapCut"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Visibility</Label>
                  <Select
                    key={String(editForm._id || editForm.visibility || "visibility-select")}
                    options={[
                      { value: "public", label: "public" },
                      { value: "private", label: "private" },
                      { value: "internal", label: "internal" },
                    ]}
                    defaultValue={String(editForm.visibility || "public")}
                    onChange={(v) => setEditForm((f) => ({ ...f, visibility: v }))}
                  />
                </div>
                <div>
                  <Label>Active</Label>
                  <Select
                    key={String(editForm._id || (editForm.isActive ? "true" : "false") || "active-select")}
                    options={[
                      { value: "true", label: "Yes" },
                      { value: "false", label: "No" },
                    ]}
                    defaultValue={(editForm.isActive ? "true" : "false")}
                    onChange={(v) => setEditForm((f) => ({ ...f, isActive: v === "true" }))}
                  />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <TextArea
                  rows={4}
                  value={String(editForm.notes || "")}
                  onChange={(val) => setEditForm((f) => ({ ...f, notes: val }))}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={saveEdit} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
              </div>
            </div>
          </Modal>

          {/* Delete Confirm */}
          <DeleteConfirm
            title="Delete rate card?"
            description={deleteTarget ? `This will delete ${deleteTarget.title || deleteTarget._id}.` : ""}
            isOpen={!!deleteTarget}
            onCancel={() => setDeleteTarget(null)}
            onConfirm={confirmDelete}
            loading={deleting}
          />
        </ComponentCard>
      </div>
    </>
  );
}
