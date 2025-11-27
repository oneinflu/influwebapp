import { useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import Select from "../components/form/Select";
import TagInput from "../components/form/input/TagInput";
import Checkbox from "../components/form/input/Checkbox";
import Button from "../components/ui/button/Button";
import Alert from "../components/ui/alert/Alert";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router";

type ClientOption = { _id: string; business_name?: string };
type ServiceOption = { _id: string; name?: string; defaultDeliverables?: string[] };
type RateCardOption = { _id: string; title?: string; serviceId?: string; price?: number; currency?: string; deliverables?: string[] };

export default function QuotationsNew() {
  const navigate = useNavigate();
  const { type, user } = useAuth();
  const ownerId = useMemo(() => (type === "user" ? user?._id ?? null : null), [type, user]);

  const [clientId, setClientId] = useState<string>("");
  const [serviceId, setServiceId] = useState<string>("");
  const [rateCardId, setRateCardId] = useState<string>("");
  const [deliverables, setDeliverables] = useState<string[]>([]);
  const [quantity, setQuantity] = useState<string>("1");
  const [totalCost, setTotalCost] = useState<string>("");
  const [gstPercent, setGstPercent] = useState<string>("18");
  const [paymentTerms, setPaymentTerms] = useState<string[]>([]);
  const [validity, setValidity] = useState<string>("14");
  const [addOns, setAddOns] = useState<Array<{ name: string; price: number }>>([]);
  const [isActive, setIsActive] = useState<boolean>(true);

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [rateCards, setRateCards] = useState<RateCardOption[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      if (!ownerId) return;
      try {
        const [{ data: clientsResp }, { data: servicesResp }, { data: rateResp }] = await Promise.all([
          api.get("/clients", { params: { user_id: ownerId } }),
          api.get("/services", { params: { user_id: ownerId } }),
          api.get("/rate-cards"),
        ]);
        if (!cancelled) {
          setClients(Array.isArray(clientsResp) ? clientsResp : []);
          setServices(Array.isArray(servicesResp) ? servicesResp : []);
          const rcArr: RateCardOption[] = Array.isArray(rateResp) ? rateResp : [];
          setRateCards(rcArr);
        }
      } catch {
        // keep form usable even if lists fail
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, [ownerId]);

  const filteredRateCards = rateCards.filter((rc) => !serviceId || rc.serviceId === serviceId);

  function addAddonRow() {
    setAddOns((prev) => [...prev, { name: "", price: 0 }]);
  }
  function updateAddon(idx: number, field: "name" | "price", value: string) {
    setAddOns((prev) => prev.map((ad, i) => i === idx ? { ...ad, [field]: field === "price" ? Number(value) : value } : ad));
  }
  function removeAddon(idx: number) {
    setAddOns((prev) => prev.filter((_, i) => i !== idx));
  }

  function addPaymentTermRow() {
    setPaymentTerms((prev) => [...prev, ""]);
  }
  function updatePaymentTerm(idx: number, value: string) {
    setPaymentTerms((prev) => prev.map((pt, i) => i === idx ? value : pt));
  }
  function removePaymentTerm(idx: number) {
    setPaymentTerms((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    setErrorMessage("");
    if (!clientId) { setErrorMessage("Client is required."); return; }
    if (!serviceId) { setErrorMessage("Service is required."); return; }
    if (!rateCardId) { setErrorMessage("Rate card is required."); return; }
    if (!quantity || Number.isNaN(Number(quantity)) || Number(quantity) <= 0) { setErrorMessage("Valid quantity is required."); return; }
    if (!totalCost || Number.isNaN(Number(totalCost))) { setErrorMessage("Valid total cost is required."); return; }
    setLoading(true);
    try {
      const payload = {
        clientId,
        serviceId,
        rateCardId,
        deliverables,
        quantity: Number(quantity),
        totalCost: Number(totalCost),
        taxes: { gstPercent: gstPercent ? Number(gstPercent) : undefined },
        paymentTerms: paymentTerms.map(pt => pt.trim()).filter(pt => pt.length > 0),
        validity: validity ? Number(validity) : undefined,
        addOns: addOns.filter((a) => a.name && String(a.name).trim().length > 0).map((a) => ({ name: String(a.name), price: Number(a.price) })),
        isActive,
      };
      const { data } = await api.post("/quotations", payload);
      if (data && data._id) navigate("/quotations"); else navigate("/quotations");
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
        return "Failed to create quotation.";
      })();
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageMeta title="Add Quotation" description="Create a new quotation" />
      <PageBreadcrumb pageTitle="Add Quotation" />
      <div className="space-y-6">
        <ComponentCard title="New Quotation" desc="Fill in the quotation details">
          {errorMessage && (
            <Alert variant="error" title="Error" message={errorMessage} />
          )}

          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Client</Label>
                <Select
                  options={clients.map((c) => ({ value: c._id, label: c.business_name || c._id }))}
                  defaultValue={clientId}
                  onChange={(v) => setClientId(String(v))}
                />
              </div>
              <div>
                <Label>Service</Label>
                <Select
                  options={services.map((s) => ({ value: s._id, label: s.name || s._id }))}
                  defaultValue={serviceId}
                  onChange={(v) => {
                    const id = String(v);
                    setServiceId(id);
                    setRateCardId("");
                    const service = services.find((s) => s._id === id);
                    if (service && Array.isArray(service.defaultDeliverables)) {
                      setDeliverables(service.defaultDeliverables);
                    } else {
                      setDeliverables([]);
                    }
                  }}
                />
              </div>
              <div>
                <Label>Rate Card</Label>
                <Select
                  options={filteredRateCards.map((r) => ({ value: r._id, label: r.title || r._id }))}
                  defaultValue={rateCardId}
                  onChange={(v) => {
                    const id = String(v);
                    setRateCardId(id);
                    const rc = rateCards.find((r) => r._id === id);
                    if (rc) {
                      if (typeof rc.price === 'number') setTotalCost(String(rc.price));
                    }
                  }}
                />
              </div>
              <div>
                <Label>Quantity</Label>
                <Input type="number" placeholder="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
              <div>
                <Label>Total Cost</Label>
                <Input type="number" placeholder="Amount" value={totalCost} onChange={(e) => setTotalCost(e.target.value)} />
              </div>
              <div>
                <Label>GST %</Label>
                <Select
                  options={[
                    { value: "0", label: "No GST / 0%" },
                    { value: "5", label: "5%" },
                    { value: "18", label: "18%" },
                    { value: "40", label: "40%" },
                  ]}
                  defaultValue={gstPercent}
                  onChange={(v) => setGstPercent(String(v))}
                />
              </div>
              <div>
                <Label>Validity (days)</Label>
                <Input type="number" placeholder="14" value={validity} onChange={(e) => setValidity(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Deliverables</Label>
                <TagInput values={deliverables} onChange={setDeliverables} placeholder="Add deliverables" />
              </div>
              <div className="sm:col-span-2">
                <Label>Payment Terms</Label>
                <div className="space-y-2">
                  {paymentTerms.map((pt, idx) => (
                    <div key={`pt-${idx}`} className="flex items-center gap-2">
                      <Input placeholder="e.g., 50% advance" value={pt} onChange={(e) => updatePaymentTerm(idx, e.target.value)} />
                      <Button type="button" variant="outline" size="sm" onClick={() => removePaymentTerm(idx)}>Remove</Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addPaymentTermRow}>Add payment term</Button>
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label>Add-ons</Label>
                <div className="space-y-2">
                  {addOns.map((ad, idx) => (
                    <div key={`ad-${idx}`} className="grid grid-cols-1 gap-2 sm:grid-cols-6">
                      <div className="sm:col-span-4">
                        <Input placeholder="Name" value={ad.name} onChange={(e) => updateAddon(idx, "name", e.target.value)} />
                      </div>
                      <div className="sm:col-span-2 flex items-center gap-2">
                        <Input type="number" placeholder="Price" value={String(ad.price)} onChange={(e) => updateAddon(idx, "price", e.target.value)} />
                        <Button type="button" variant="outline" size="sm" onClick={() => removeAddon(idx)}>Remove</Button>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addAddonRow}>Add add-on</Button>
                </div>
              </div>
              <div>
                <Checkbox label="Active" checked={isActive} onChange={setIsActive} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" disabled={loading || !clientId || !serviceId || !rateCardId || !totalCost}>
                {loading ? "Creating..." : "Create Quotation"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate("/quotations")}>Cancel</Button>
            </div>
          </form>
        </ComponentCard>
      </div>
    </>
  );
}
