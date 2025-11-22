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
import { Modal } from "../components/ui/modal";
import Label from "../components/form/Label";
import InputField from "../components/form/input/InputField";
import TextArea from "../components/form/input/TextArea";
import Select from "../components/form/Select";
import Checkbox from "../components/form/input/Checkbox";
import DeleteConfirm from "../components/ui/confirm/DeleteConfirm";
import { InfoIcon, PencilIcon, TrashBinIcon } from "../icons";

type PricingPlan = {
  currency?: "INR" | "USD" | "EUR" | "GBP" | string;
  is_price_range?: boolean;
  amount?: number;
  percentage?: number;
  range?: { min?: number; max?: number };
  pre_discounted_rate?: number;
  plan_type?: "per_project" | "per_post" | "per_month" | "retainer" | "hourly" | string;
  notes?: string;
};

interface ServiceItem {
  _id: string;
  name: string;
  description?: string;
  deliverables?: string[];
  is_contact_for_pricing?: boolean;
  is_barter?: boolean;
  is_negotiable?: boolean;
  status?: string;
  pricing_plans?: PricingPlan[];
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

  function handleViewService(s: ServiceItem) {
    setSelected(s);
    setViewOpen(true);
  }

  function handleEditService(s: ServiceItem) {
    setSelected(s);
    setEditForm({
      _id: s._id,
      name: s.name,
      description: s.description,
      status: s.status,
      deliverables: s.deliverables,
      is_contact_for_pricing: s.is_contact_for_pricing,
      is_barter: s.is_barter,
      is_negotiable: s.is_negotiable,
      pricing_plans: s.pricing_plans ?? [],
    });
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editForm || !editForm._id) return;
    setSaving(true);
    try {
      const { data } = await api.put(`/services/${editForm._id}`, { ...editForm });
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
        const { data } = await api.get("/services", { params: { user_id: ownerId } });
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

  return (
    <>
      <PageMeta title="Services & Rates" description="Manage services and pricing" />
      <PageBreadcrumb pageTitle="Services & Rates" />
      <div className="space-y-6">
        <ComponentCard title="Services">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">Services offered under your account.</p>
            <Button size="sm" onClick={() => navigate("/services/new")}>Add Service</Button>
          </div>

          {errorMessage && (
            <Alert variant="error" title="Error" message={errorMessage} />
          )}


        {/* Horizontal Cards View */}
        <div className="mt-6 space-y-4">
          {items.map((s) => (
            <div key={s._id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-theme-sm font-semibold text-gray-900 dark:text-white/90">{s.name}</span>
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-theme-xs text-gray-600 dark:bg-white/[0.06] dark:text-gray-300">
                      {(s.status || "active").replace(/_/g, " ")}
                    </span>
                  </div>
                  {s.description && (
                    <p className="text-theme-sm text-gray-600 dark:text-gray-300">{s.description}</p>
                  )}
                  {Array.isArray(s.deliverables) && s.deliverables.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {s.deliverables.map((d, i) => (
                        <span key={i} className="rounded-full bg-gray-100 px-2 py-0.5 text-theme-xs text-gray-700 dark:bg-white/[0.06] dark:text-gray-300">
                          {d}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-2">
                    <div className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">Pricing Plans</div>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {(s.pricing_plans || []).map((p, idx) => (
                        <div key={idx} className="rounded border border-gray-200 p-3 text-theme-sm dark:border-white/[0.08]">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{p.plan_type || "Plan"}</span>
                            <span className="text-theme-xs text-gray-500">{p.currency || ""}</span>
                          </div>
                          <div className="mt-1 text-gray-700 dark:text-gray-300">
                            {p.is_price_range ? (
                              <span>
                                Range: {p.range?.min ?? "-"} - {p.range?.max ?? "-"}
                              </span>
                            ) : p.amount != null ? (
                              <span>Amount: {p.amount}</span>
                            ) : (
                              <span className="text-gray-500">No amount</span>
                            )}
                          </div>
                          {p.percentage != null && (
                            <div className="text-gray-700 dark:text-gray-300">Percentage: {p.percentage}%</div>
                          )}
                          {p.pre_discounted_rate != null && (
                            <div className="text-gray-700 dark:text-gray-300">Pre-discount: {p.pre_discounted_rate}</div>
                          )}
                          {p.notes && (
                            <div className="mt-1 text-gray-600 dark:text-gray-300">{p.notes}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewService(s)}
                  >
                    <InfoIcon className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditService(s)}
                  >
                    <PencilIcon className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteTarget(s)}
                  >
                    <TrashBinIcon className="h-5 w-5 text-red-600" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

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
                {selected.description && (
                  <div>
                    <Label>Description</Label>
                    <div className="text-sm whitespace-pre-wrap text-gray-800 dark:text-gray-200">{selected.description}</div>
                  </div>
                )}
                {Array.isArray(selected.deliverables) && selected.deliverables.length > 0 && (
                  <div>
                    <Label>Deliverables</Label>
                    <ul className="list-disc pl-5 text-sm text-gray-800 dark:text-gray-200">
                      {selected.deliverables.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-sm">Status: <span className="font-medium">{selected.status || "-"}</span></div>
                  <div className="text-sm">Negotiable: <span className="font-medium">{selected.is_negotiable ? "Yes" : "No"}</span></div>
                  <div className="text-sm">Barter: <span className="font-medium">{selected.is_barter ? "Yes" : "No"}</span></div>
                  <div className="text-sm">Contact for pricing: <span className="font-medium">{selected.is_contact_for_pricing ? "Yes" : "No"}</span></div>
                </div>
                <div>
                  <Label>Pricing Plans</Label>
                  <div className="space-y-3">
                    {(selected.pricing_plans || []).map((p, idx) => (
                      <div key={idx} className="rounded border border-gray-200 dark:border-white/[0.08] p-4">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">{p.plan_type || "Plan"}</div>
                          <div className="text-xs text-gray-500">{p.currency || ""}</div>
                        </div>
                        <div className="mt-2 text-sm">
                          {p.is_price_range ? (
                            <span>
                              Range: {p.range?.min ?? "-"} - {p.range?.max ?? "-"}
                            </span>
                          ) : p.amount != null ? (
                            <span>Amount: {p.amount}</span>
                          ) : null}
                        </div>
                        {p.percentage != null && (
                          <div className="text-sm">Percentage: {p.percentage}%</div>
                        )}
                        {p.pre_discounted_rate != null && (
                          <div className="text-sm">Pre-discount rate: {p.pre_discounted_rate}</div>
                        )}
                        {p.notes && (
                          <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{p.notes}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="primary" onClick={() => setViewOpen(false)}>Close</Button>
            </div>
          </div>
        </Modal>

        {/* Edit Service Modal */}
        <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} isFullscreen>
          <div className="p-6 space-y-5">
            <h3 className="text-lg font-semibold">Edit service</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <InputField
                  value={editForm.name || ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  defaultValue={editForm.status || ""}
                  onChange={(val) => setEditForm((f) => ({ ...f, status: val }))}
                  options={[
                    { label: "draft", value: "draft" },
                    { label: "active", value: "active" },
                    { label: "archived", value: "archived" },
                  ]}
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <TextArea
                value={editForm.description || ""}
                onChange={(val) => setEditForm((f) => ({ ...f, description: val }))}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Checkbox
                label="Negotiable"
                checked={!!editForm.is_negotiable}
                onChange={(checked) => setEditForm((f) => ({ ...f, is_negotiable: checked }))}
              />
              <Checkbox
                label="Barter"
                checked={!!editForm.is_barter}
                onChange={(checked) => setEditForm((f) => ({ ...f, is_barter: checked }))}
              />
              <Checkbox
                label="Contact for pricing"
                checked={!!editForm.is_contact_for_pricing}
                onChange={(checked) => setEditForm((f) => ({ ...f, is_contact_for_pricing: checked }))}
              />
            </div>

            <div className="space-y-4">
              <Label>Pricing Plans</Label>
              {(editForm.pricing_plans || []).map((p: PricingPlan, idx: number) => (
                <div key={idx} className="rounded border border-gray-200 dark:border-white/[0.08] p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <Label>Plan Type</Label>
                      <Select
                        defaultValue={p.plan_type || ""}
                        onChange={(val) => {
                          setEditForm((f) => {
                            const next = { ...(f || {}) };
                            const arr = [...(next.pricing_plans || [])];
                            arr[idx] = { ...(arr[idx] || {}), plan_type: val };
                            next.pricing_plans = arr;
                            return next;
                          });
                        }}
                        options={[
                          { label: "per_project", value: "per_project" },
                          { label: "per_post", value: "per_post" },
                          { label: "per_month", value: "per_month" },
                          { label: "retainer", value: "retainer" },
                          { label: "hourly", value: "hourly" },
                        ]}
                      />
                    </div>
                    <div>
                      <Label>Currency</Label>
                      <Select
                        defaultValue={p.currency || ""}
                        onChange={(val) => {
                          setEditForm((f) => {
                            const next = { ...(f || {}) };
                            const arr = [...(next.pricing_plans || [])];
                            arr[idx] = { ...(arr[idx] || {}), currency: val };
                            next.pricing_plans = arr;
                            return next;
                          });
                        }}
                        options={["INR", "USD", "EUR", "GBP"].map((c) => ({ label: c, value: c }))}
                      />
                    </div>
                    <Checkbox
                      label="Price is a range"
                      checked={!!p.is_price_range}
                      onChange={(checked) => {
                        setEditForm((f) => {
                          const next = { ...(f || {}) };
                          const arr = [...(next.pricing_plans || [])];
                          arr[idx] = { ...(arr[idx] || {}), is_price_range: checked };
                          next.pricing_plans = arr;
                          return next;
                        });
                      }}
                    />
                  </div>

                  {p.is_price_range ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Min</Label>
                        <InputField
                          type="number"
                          value={p.range?.min ?? ""}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setEditForm((f) => {
                              const next = { ...(f || {}) };
                              const arr = [...(next.pricing_plans || [])];
                              const range = { ...(arr[idx]?.range || {}) };
                              range.min = isNaN(val) ? undefined : val;
                              arr[idx] = { ...(arr[idx] || {}), range };
                              next.pricing_plans = arr;
                              return next;
                            });
                          }}
                        />
                      </div>
                      <div>
                        <Label>Max</Label>
                        <InputField
                          type="number"
                          value={p.range?.max ?? ""}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setEditForm((f) => {
                              const next = { ...(f || {}) };
                              const arr = [...(next.pricing_plans || [])];
                              const range = { ...(arr[idx]?.range || {}) };
                              range.max = isNaN(val) ? undefined : val;
                              arr[idx] = { ...(arr[idx] || {}), range };
                              next.pricing_plans = arr;
                              return next;
                            });
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Label>Amount</Label>
                      <InputField
                        type="number"
                        value={p.amount ?? ""}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEditForm((f) => {
                            const next = { ...(f || {}) };
                            const arr = [...(next.pricing_plans || [])];
                            arr[idx] = { ...(arr[idx] || {}), amount: isNaN(val) ? undefined : val };
                            next.pricing_plans = arr;
                            return next;
                          });
                        }}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label>Percentage</Label>
                      <InputField
                        type="number"
                        value={p.percentage ?? ""}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEditForm((f) => {
                            const next = { ...(f || {}) };
                            const arr = [...(next.pricing_plans || [])];
                            arr[idx] = { ...(arr[idx] || {}), percentage: isNaN(val) ? undefined : val };
                            next.pricing_plans = arr;
                            return next;
                          });
                        }}
                      />
                    </div>
                    <div>
                      <Label>Pre-discount rate</Label>
                      <InputField
                        type="number"
                        value={p.pre_discounted_rate ?? ""}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEditForm((f) => {
                            const next = { ...(f || {}) };
                            const arr = [...(next.pricing_plans || [])];
                            arr[idx] = { ...(arr[idx] || {}), pre_discounted_rate: isNaN(val) ? undefined : val };
                            next.pricing_plans = arr;
                            return next;
                          });
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Notes</Label>
                    <TextArea
                      value={p.notes || ""}
                      onChange={(val) => {
                        setEditForm((f) => {
                          const next = { ...(f || {}) };
                          const arr = [...(next.pricing_plans || [])];
                          arr[idx] = { ...(arr[idx] || {}), notes: val };
                          next.pricing_plans = arr;
                          return next;
                        });
                      }}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditForm((f) => {
                          const next = { ...(f || {}) };
                          const arr = [...(next.pricing_plans || [])];
                          arr.splice(idx, 1);
                          next.pricing_plans = arr;
                          return next;
                        });
                      }}
                    >
                      Remove plan
                    </Button>
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                onClick={() =>
                  setEditForm((f) => ({
                    ...(f || {}),
                    pricing_plans: [...(f?.pricing_plans || []), {} as PricingPlan],
                  }))
                }
              >
                Add plan
              </Button>
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
    </>
  );
}