import { useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import Select from "../components/form/Select";
import MultiSelect from "../components/form/MultiSelect";
import Checkbox from "../components/form/input/Checkbox";
import Button from "../components/ui/button/Button";
import Alert from "../components/ui/alert/Alert";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router";

type PricingPlan = {
  currency: "INR" | "USD" | "EUR" | "GBP";
  is_price_range: boolean;
  amount?: number;
  percentage?: number;
  range?: { min?: number; max?: number };
  pre_discounted_rate?: number;
  plan_type: "per_project" | "per_post" | "per_month" | "retainer" | "hourly";
  notes?: string;
};

export default function ServicesNew() {
  const navigate = useNavigate();
  const { type, user } = useAuth();
  const ownerId = useMemo(() => (type === "user" ? user?._id ?? null : null), [type, user]);
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [deliverableInput, setDeliverableInput] = useState<string>("");
  const [deliverables, setDeliverables] = useState<string[]>([]);
  const [contentTypeOptions, setContentTypeOptions] = useState<{ value: string; text: string }[]>([]);
  const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>([]);
  const [isContactForPricing, setIsContactForPricing] = useState<boolean>(false);
  const [isBarter, setIsBarter] = useState<boolean>(false);
  const [isNegotiable, setIsNegotiable] = useState<boolean>(false);
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([{
    currency: "INR",
    is_price_range: false,
    amount: 0,
    percentage: 0,
    plan_type: "per_project",
    notes: "",
  }]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    async function fetchContentTypes() {
      try {
        const { data } = await api.get<Array<{ _id: string; name: string }>>("/content-types", { params: { status: "active" } });
        const opts = (Array.isArray(data) ? data : []).map((ct) => ({ value: ct._id, text: ct.name }));
        setContentTypeOptions(opts);
      } catch {
        setContentTypeOptions([]);
      }
    }
    void fetchContentTypes();
  }, []);

  function addDeliverable() {
    const d = deliverableInput.trim();
    if (!d) return;
    setDeliverables((prev) => (prev.includes(d) ? prev : [...prev, d]));
    setDeliverableInput("");
  }
  function removeDeliverable(idx: number) {
    setDeliverables((prev) => prev.filter((_, i) => i !== idx));
  }

  function updatePlan(index: number, next: Partial<PricingPlan>) {
    setPricingPlans((prev) => {
      const arr = [...prev];
      arr[index] = { ...arr[index], ...next } as PricingPlan;
      return arr;
    });
  }
  function addPlan() {
    setPricingPlans((prev) => ([...prev, {
      currency: "INR",
      is_price_range: false,
      amount: 0,
      percentage: 0,
      plan_type: "per_project",
      notes: "",
    }]));
  }
  function removePlan(index: number) {
    setPricingPlans((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    setErrorMessage("");
    if (!ownerId) { setErrorMessage("Not authenticated."); return; }
    if (!name.trim()) { setErrorMessage("Service name is required."); return; }
    if (selectedContentTypes.length === 0) { setErrorMessage("At least one content type is required."); return; }
    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        deliverables,
        is_contact_for_pricing: isContactForPricing,
        is_barter: isBarter,
        is_negotiable: isNegotiable,
        user_id: ownerId,
        content_types: selectedContentTypes,
        pricing_plans: pricingPlans.map((p) => ({
          currency: p.currency,
          is_price_range: p.is_price_range,
          amount: p.is_price_range ? undefined : (typeof p.amount === 'number' ? p.amount : undefined),
          percentage: typeof p.percentage === 'number' ? p.percentage : undefined,
          range: p.is_price_range ? { min: p.range?.min, max: p.range?.max } : undefined,
          pre_discounted_rate: typeof p.pre_discounted_rate === 'number' ? p.pre_discounted_rate : undefined,
          plan_type: p.plan_type,
          notes: p.notes?.trim() || undefined,
        })),
      };
      const { data } = await api.post("/services", payload);
      if (data && data._id) navigate("/services");
      else navigate("/services");
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
        return "Failed to create service.";
          })();
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageMeta title="Add Service" description="Create a new service and rates" />
      <PageBreadcrumb pageTitle="Add Service" />
      <div className="space-y-6">
        <ComponentCard title="New Service" desc="Define deliverables and pricing plans">
          {errorMessage && (
            <Alert variant="error" title="Error" message={errorMessage} />
          )}

          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>
                  Service Name <span className="text-error-500">*</span>
                </Label>
                <Input placeholder="e.g., Instagram Reel" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>Description</Label>
                <Input placeholder="Short description" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <MultiSelect
                  label="Content Types"
                  options={contentTypeOptions}
                  value={selectedContentTypes}
                  onChange={setSelectedContentTypes}
                  placeholder="Select content types (required)"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Deliverables</Label>
                <div className="flex items-center gap-2">
                  <Input placeholder="Add deliverable" value={deliverableInput} onChange={(e) => setDeliverableInput(e.target.value)} />
                  <Button size="sm" variant="outline" onClick={addDeliverable}>Add</Button>
                </div>
                {deliverables.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {deliverables.map((d, idx) => (
                      <span key={`${d}-${idx}`} className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-300">
                        {d}
                        <button type="button" className="ml-2 text-gray-500 hover:text-gray-700" onClick={() => removeDeliverable(idx)}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Checkbox label="Contact for Pricing" checked={isContactForPricing} onChange={setIsContactForPricing} />
              </div>
              <div>
                <Checkbox label="Barter" checked={isBarter} onChange={setIsBarter} />
              </div>
              <div>
                <Checkbox label="Negotiable" checked={isNegotiable} onChange={setIsNegotiable} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">Pricing Plans</h4>
                <Button size="sm" variant="outline" onClick={addPlan}>Add Plan</Button>
              </div>
              {pricingPlans.map((p, idx) => (
                <div key={idx} className="grid grid-cols-1 gap-3 p-4 border rounded-xl dark:border-gray-800 sm:grid-cols-3">
                  <div>
                    <Label>Currency</Label>
                    <Select
                      options={["INR","USD","EUR","GBP"].map((c) => ({ value: c, label: c }))}
                      defaultValue={p.currency}
                      onChange={(v) => updatePlan(idx, { currency: v as PricingPlan["currency"] })}
                    />
                  </div>
                  <div>
                    <Label>Plan Type</Label>
                    <Select
                      options={["per_project","per_post","per_month","retainer","hourly"].map((pt) => ({ value: pt, label: pt.replace(/_/g, " ") }))}
                      defaultValue={p.plan_type}
                      onChange={(v) => updatePlan(idx, { plan_type: v as PricingPlan["plan_type"] })}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox label="Price Range" checked={p.is_price_range} onChange={(val) => updatePlan(idx, { is_price_range: val })} />
                    <Button size="sm" variant="outline" onClick={() => removePlan(idx)}>Remove</Button>
                  </div>
                  {p.is_price_range ? (
                    <>
                      <div>
                        <Label>Min</Label>
                        <Input placeholder="0" value={String(p.range?.min ?? '')} onChange={(e) => updatePlan(idx, { range: { min: Number(e.target.value || 0), max: p.range?.max } })} />
                      </div>
                      <div>
                        <Label>Max</Label>
                        <Input placeholder="0" value={String(p.range?.max ?? '')} onChange={(e) => updatePlan(idx, { range: { min: p.range?.min, max: Number(e.target.value || 0) } })} />
                      </div>
                      <div>
                        <Label>Notes</Label>
                        <Input placeholder="Optional notes" value={p.notes ?? ''} onChange={(e) => updatePlan(idx, { notes: e.target.value })} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <Label>Amount</Label>
                        <Input placeholder="0" value={String(p.amount ?? '')} onChange={(e) => updatePlan(idx, { amount: Number(e.target.value || 0) })} />
                      </div>
                      <div>
                        <Label>Pre-discounted Rate</Label>
                        <Input placeholder="0" value={String(p.pre_discounted_rate ?? '')} onChange={(e) => updatePlan(idx, { pre_discounted_rate: Number(e.target.value || 0) })} />
                      </div>
                      <div>
                        <Label>Percentage</Label>
                        <Input placeholder="0" value={String(p.percentage ?? '')} onChange={(e) => updatePlan(idx, { percentage: Number(e.target.value || 0) })} />
                      </div>
                      <div className="sm:col-span-3">
                        <Label>Notes</Label>
                        <Input placeholder="Optional notes" value={p.notes ?? ''} onChange={(e) => updatePlan(idx, { notes: e.target.value })} />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Button size="sm" disabled={loading || !name.trim()}>
                {loading ? "Creating..." : "Create Service"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate("/services")}>Cancel</Button>
            </div>
          </form>
        </ComponentCard>
      </div>
    </>
  );
}