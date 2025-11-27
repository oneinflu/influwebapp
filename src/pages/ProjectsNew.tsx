/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-empty */

import  { useEffect, useMemo, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import Select from "../components/form/Select";
import SearchSelect from "../components/form/SearchSelect";
import TagInput from "../components/form/input/TagInput";
import TextArea from "../components/form/input/TextArea";
import DatePicker from "../components/form/date-picker";
import Button from "../components/ui/button/Button";
import Alert from "../components/ui/alert/Alert";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router";
import { ClientItem } from "./Clients";

const ProjectsNew = () => {
  const navigate = useNavigate();
  const { type, user } = useAuth();
  const ownerId = useMemo(() => (type === "user" ? user?._id ?? null : null), [type, user]);

  const [name, setName] = useState<string>("");
  const [clientId, setClientId] = useState<string>("");
  const [projectCategories, setProjectCategories] = useState<string[]>([]);
  const [status, setStatus] = useState<string>("in_progress");
  const [approvalStatus, setApprovalStatus] = useState<string>("pending");
  const [projectBudget, setProjectBudget] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [clients, setClients] = useState<ClientItem[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [serviceIdInput, setServiceIdInput] = useState<string>("");
  const [servicesList, setServicesList] = useState<Array<{ _id: string; name?: string }>>([]);
  const [rateCards, setRateCards] = useState<Array<{ _id: string; title?: string }>>([]);
  const [rateCardIdInput, setRateCardIdInput] = useState<string>("");
  const [finalRateCards, setFinalRateCards] = useState<string[]>([]);
  const [quotationId, setQuotationId] = useState<string>("");
  type QuotationOption = {
    _id: string;
    clientId?: string;
    serviceId?: string;
    rateCardId?: string;
    deliverables?: string[];
    quantity?: number;
    totalCost?: number;
    taxes?: { gstPercent?: number };
    validity?: number;
    paymentTerms?: string[];
    addOns?: Array<{ name?: string; price?: number }>;
  };
  const [quotationsList, setQuotationsList] = useState<QuotationOption[]>([]);
  const [assignedCollaborators, setAssignedCollaborators] = useState<string[]>([]);
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [collaboratorsList, setCollaboratorsList] = useState<Array<{ _id: string; users?: string }>>([]);
  const [deliverables, setDeliverables] = useState<string[]>([]);
  const [targetLocations, setTargetLocations] = useState<string[]>([]);
  const [targetPlatforms, setTargetPlatforms] = useState<string[]>([]);
  const [targetAgeGroups, setTargetAgeGroups] = useState<string[]>([]);
  const [targetLanguages, setTargetLanguages] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>("");
  const [deliveryMethod, setDeliveryMethod] = useState<string>("drive");
  const [deliveryUrl, setDeliveryUrl] = useState<string>("");

  type CostForm = { name: string; amount: string; incurred_on: string };
  const [internalCosts, setInternalCosts] = useState<CostForm[]>([]);

  const [errorMessage, setErrorMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchLists() {
      if (!ownerId) return;
      try {
        const [{ data: clientsResp }, { data: servicesResp }, { data: rateResp }, { data: collabResp }, { data: quotationsResp }] = await Promise.all([
          api.get("/clients", { params: { user_id: ownerId } }),
          api.get("/services", { params: { user_id: ownerId } }),
          api.get("/rate-cards"),
          api.get("/collaborators", { params: { managed_by: ownerId } }),
          api.get("/quotations", { params: { user_id: ownerId } }),
        ]);
        if (!cancelled) {
          setClients(Array.isArray(clientsResp) ? clientsResp : []);
          setServicesList(Array.isArray(servicesResp) ? servicesResp : []);
          setRateCards(Array.isArray(rateResp) ? rateResp : []);
          setCollaboratorsList(Array.isArray(collabResp) ? collabResp : []);
          setQuotationsList(Array.isArray(quotationsResp) ? quotationsResp : []);
        }
      } catch {
        // keep form usable even if lists fail
      }
    }
    fetchLists();
    return () => { cancelled = true; };
  }, [ownerId]);

  const [userMap, setUserMap] = useState<Record<string, string>>({});
  useEffect(() => {
    const ids = Array.from(new Set((collaboratorsList.map((c) => c.users).filter(Boolean) as string[])));
    const missing = ids.filter((id) => !userMap[id]);
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const results = await Promise.all(
          missing.map(async (id) => {
            try {
              const { data } = await api.get(`/users/${id}`);
              const name = (data?.registration?.name as string | undefined) || "";
              const email = (data?.registration?.email as string | undefined) || "";
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
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [collaboratorsList]);

  function applyQuotationData(id: string) {
    const q = quotationsList.find((qq) => qq._id === id);
    if (!q) return;
    if (q.clientId) setClientId(q.clientId);
    if (q.serviceId) setServices((prev) => (prev.includes(q.serviceId!) ? prev : [...prev, q.serviceId!]));
    if (q.rateCardId) setFinalRateCards((prev) => (prev.includes(q.rateCardId!) ? prev : [...prev, q.rateCardId!]));
    if (Array.isArray(q.deliverables)) setDeliverables(q.deliverables);
    if (typeof q.totalCost === "number") setProjectBudget(String(q.totalCost));
    if (typeof q.validity === "number" && q.validity > 0) {
      const d = new Date();
      d.setDate(d.getDate() + q.validity);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      setEndDate(`${yyyy}-${mm}-${dd}`);
    }
  }

  function addServiceSelection() {
    const id = String(serviceIdInput || "").trim();
    if (!id) return;
    setServices((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setServiceIdInput("");
  }
  function removeService(idx: number) {
    setServices((prev) => prev.filter((_, i) => i !== idx));
  }
  function addRateCardSelection() {
    const id = String(rateCardIdInput || "").trim();
    if (!id) return;
    setFinalRateCards((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setRateCardIdInput("");
  }
  function removeRateCard(idx: number) {
    setFinalRateCards((prev) => prev.filter((_, i) => i !== idx));
  }
  function addAssignedCollaborator(id: string) {
    const v = String(id || "").trim();
    if (!v) return;
    setAssignedCollaborators((prev) => (prev.includes(v) ? prev : [...prev, v]));
  }
  function removeAssignedCollaborator(idx: number) {
    setAssignedCollaborators((prev) => prev.filter((_, i) => i !== idx));
  }
  function addCollaborator(id: string) {
    const v = String(id || "").trim();
    if (!v) return;
    setCollaborators((prev) => (prev.includes(v) ? prev : [...prev, v]));
  }
  function removeCollaborator(idx: number) {
    setCollaborators((prev) => prev.filter((_, i) => i !== idx));
  }
  function addCostRow() {
    setInternalCosts((prev) => [...prev, { name: "", amount: "", incurred_on: "" }]);
  }
  function updateCost(idx: number, field: keyof CostForm, value: string) {
    setInternalCosts((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  }
  function removeCost(idx: number) {
    setInternalCosts((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    setErrorMessage("");
    if (!name.trim()) { setErrorMessage("Project name is required."); return; }
    if (!clientId) { setErrorMessage("Client is required."); return; }
    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        client: clientId,
        project_category: projectCategories,
        services,
        status,
        approval_status: approvalStatus,
        project_budget: projectBudget ? Number(projectBudget) : undefined,
        end_date: endDate || undefined,
        quotation_id: quotationId || undefined,
        final_confirmed_rate_cards: finalRateCards,
        assigned_collaborators: assignedCollaborators,
        internal_costs: internalCosts
          .filter((c) => c.name.trim())
          .map((c) => ({ name: c.name.trim(), amount: Number(c.amount || 0), incurred_on: c.incurred_on || undefined })),
        delivery_system: deliveryUrl ? { method: deliveryMethod, url: deliveryUrl, meta: {} } : undefined,
        collaborators,
        deliverables,
        target: {
          location: targetLocations,
          platforms: targetPlatforms,
          age_groups: targetAgeGroups,
          languages: targetLanguages,
        },
        notes: notes.trim() || undefined,
      };
      const { data } = await api.post("/projects", payload);
      if (data && data._id) navigate("/projects"); else navigate("/projects");
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
        return "Failed to create project.";
      })();
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageMeta title="Add Project" description="Create a new project" />
      <PageBreadcrumb pageTitle="Add Project" />
      <div className="space-y-6">
        <ComponentCard title="New Project" desc="Fill in the project details">
          {errorMessage && (
            <Alert variant="error" title="Error" message={errorMessage} />
          )}

          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>
                  Project Name <span className="text-error-500">*</span>
                </Label>
                <Input placeholder="Acme Reel Launch" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>
                  Client <span className="text-error-500">*</span>
                </Label>
                <Select
                  options={clients.map((c) => ({ value: c._id, label: c.business_name || c._id }))}
                  value={clientId}
                  onChange={(v) => setClientId(String(v))}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Quotation</Label>
                <Select
                  options={quotationsList.map((q) => {
                    const clientLabel = clients.find((c) => c._id === (q.clientId || ""))?.business_name || q.clientId || "";
                    const serviceLabel = servicesList.find((s) => s._id === (q.serviceId || ""))?.name || q.serviceId || "";
                    const rateLabel = rateCards.find((r) => r._id === (q.rateCardId || ""))?.title || q.rateCardId || "";
                    const label = [clientLabel, serviceLabel, rateLabel].filter(Boolean).join(" · ");
                    return { value: q._id, label: label || q._id };
                  })}
                  value={quotationId}
                  onChange={(v) => { const id = String(v); setQuotationId(id); applyQuotationData(id); }}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Project Categories</Label>
                <TagInput values={projectCategories} onChange={setProjectCategories} placeholder="Type and press Enter" />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  options={[
                    { value: "in_progress", label: "In Progress" },
                    { value: "completed", label: "Completed" },
                    { value: "on_hold", label: "On Hold" },
                  ]}
                  value={status}
                  onChange={(v) => setStatus(String(v))}
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
                  value={approvalStatus}
                  onChange={(v) => setApprovalStatus(String(v))}
                />
              </div>
              <div>
                <Label>Project Budget</Label>
                <Input type="number" placeholder="60000" value={projectBudget} onChange={(e) => setProjectBudget(e.target.value)} />
              </div>
              <div>
                <DatePicker id="project_end_date" label="End Date" defaultDate={endDate || undefined} onChange={(_, dateStr) => setEndDate(String(dateStr))} />
              </div>
            </div>

            <div>
              <Label>Services</Label>
              <div className="space-y-2">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <SearchSelect
                    options={servicesList.map((s) => ({ value: s._id, label: s.name || s._id }))}
                    defaultValue={serviceIdInput}
                    onChange={(v) => setServiceIdInput(String(v))}
                  />
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={addServiceSelection}>Add Service</Button>
                  </div>
                </div>
                {services.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {services.map((sv, idx) => (
                      <div key={`${sv}-${idx}`} className="flex items-center justify-between rounded-lg border border-gray-200 p-2 dark:border-white/10">
                        <span className="text-theme-sm text-gray-800 dark:text-white/90">
                          {servicesList.find((s) => s._id === sv)?.name || sv}
                        </span>
                        <Button type="button" variant="outline" size="sm" onClick={() => removeService(idx)}>Remove</Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            

            <div>
              <Label>Final Confirmed Rate Cards</Label>
              <div className="space-y-2">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <SearchSelect
                    options={rateCards.map((r) => ({ value: r._id, label: r.title || r._id }))}
                    defaultValue={rateCardIdInput}
                    onChange={(v) => setRateCardIdInput(String(v))}
                  />
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={addRateCardSelection}>Add Rate Card</Button>
                  </div>
                </div>
                {finalRateCards.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {finalRateCards.map((rc, idx) => (
                      <div key={`${rc}-${idx}`} className="flex items-center justify-between rounded-lg border border-gray-200 p-2 dark:border-white/10">
                        <span className="text-theme-sm text-gray-800 dark:text-white/90">
                          {rateCards.find((r) => r._id === rc)?.title || rc}
                        </span>
                        <Button type="button" variant="outline" size="sm" onClick={() => removeRateCard(idx)}>Remove</Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label>Assigned Collaborators</Label>
              <div className="space-y-2">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <SearchSelect
                    options={collaboratorsList.map((c) => ({ value: c._id, label: (c.users && userMap[c.users]) || c._id }))}
                    defaultValue=""
                    onChange={(v) => addAssignedCollaborator(String(v))}
                  />
                </div>
                {assignedCollaborators.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {assignedCollaborators.map((id, idx) => (
                      <div key={`${id}-${idx}`} className="flex items-center justify-between rounded-lg border border-gray-200 p-2 dark:border-white/10">
                        <span className="text-theme-sm text-gray-800 dark:text-white/90">{(() => { const col = collaboratorsList.find((c) => c._id === id); const uid = col?.users; return (uid && userMap[uid]) || id; })()}</span>
                        <Button type="button" variant="outline" size="sm" onClick={() => removeAssignedCollaborator(idx)}>Remove</Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>


            <div>
              <Label>Internal Costs</Label>
              <div className="space-y-3">
                {internalCosts.map((c, idx) => (
                  <div key={`cost-${idx}`} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div>
                      <Label>Name</Label>
                      <Input value={c.name} onChange={(e) => updateCost(idx, "name", e.target.value)} />
                    </div>
                    <div>
                      <Label>Amount</Label>
                      <Input type="number" value={c.amount} onChange={(e) => updateCost(idx, "amount", e.target.value)} />
                    </div>
                    <div>
                      <Label>Incurred On</Label>
                      <Input type="date" value={c.incurred_on} onChange={(e) => updateCost(idx, "incurred_on", e.target.value)} />
                    </div>
                    <div>
                      <Button type="button" variant="outline" size="sm" onClick={() => removeCost(idx)}>Remove</Button>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addCostRow}>Add Cost</Button>
              </div>
            </div>


            <div>
              <Label>Delivery System</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Select
                  options={[{ value: "drive", label: "Drive" }, { value: "link", label: "Link" }, { value: "other", label: "Other" }]}
                  value={deliveryMethod}
                  onChange={(v) => setDeliveryMethod(String(v))}
                />
                <Input placeholder="https://..." value={deliveryUrl} onChange={(e) => setDeliveryUrl(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Collaborators</Label>
              <div className="space-y-2">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <SearchSelect
                    options={collaboratorsList.map((c) => ({ value: c._id, label: (c.users && userMap[c.users]) || c._id }))}
                    defaultValue=""
                    onChange={(v) => addCollaborator(String(v))}
                  />
                </div>
                {collaborators.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {collaborators.map((id, idx) => (
                      <div key={`${id}-${idx}`} className="flex items-center justify-between rounded-lg border border-gray-200 p-2 dark:border-white/10">
                        <span className="text-theme-sm text-gray-800 dark:text-white/90">{(() => { const col = collaboratorsList.find((c) => c._id === id); const uid = col?.users; return (uid && userMap[uid]) || id; })()}</span>
                        <Button type="button" variant="outline" size="sm" onClick={() => removeCollaborator(idx)}>Remove</Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label>Deliverables</Label>
              <TagInput values={deliverables} onChange={setDeliverables} placeholder="Deliverable IDs" />
            </div>

            <div>
              <Label>Target</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <Label>Location</Label>
                  <TagInput values={targetLocations} onChange={setTargetLocations} placeholder="Countries/Regions" />
                </div>
                <div>
                  <Label>Platforms</Label>
                  <TagInput values={targetPlatforms} onChange={setTargetPlatforms} placeholder="Instagram, YouTube" />
                </div>
                <div>
                  <Label>Age Groups</Label>
                  <TagInput values={targetAgeGroups} onChange={setTargetAgeGroups} placeholder="18-24, 25-34" />
                </div>
                <div>
                  <Label>Languages</Label>
                  <TagInput values={targetLanguages} onChange={setTargetLanguages} placeholder="English, Hindi" />
                </div>
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <TextArea rows={4} value={notes} onChange={(v) => setNotes(v)} />
            </div>

            <div className="flex items-center gap-3">
              <Button size="sm" disabled={loading || !name.trim() || !clientId}>
                {loading ? "Creating..." : "Create Project"}
              </Button>
              <Button size="sm" variant="outline" type="button" onClick={() => navigate("/projects")}>Cancel</Button>
            </div>
          </form>
        </ComponentCard>
      </div>
    </>
  );
};

export default ProjectsNew;
