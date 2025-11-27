/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import Select from "../components/form/Select";
import Button from "../components/ui/button/Button";
import Alert from "../components/ui/alert/Alert";
import TextArea from "../components/form/input/TextArea";
import TagInput from "../components/form/input/TagInput";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router";

type Addon = { name?: string; price?: number };

export default function RateCardsNew() {
  const { type, user } = useAuth();
  const ownerId = useMemo(() => (type === "user" ? user?._id ?? "" : ""), [type, user]);
  const navigate = useNavigate();

  const [errorMessage, setErrorMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const [serviceMap, setServiceMap] = useState<Record<string, string>>({});
  const [collaborators, setCollaborators] = useState<Array<{ _id: string; label: string }>>([]);

  const [serviceId, setServiceId] = useState<string>("");
  const [ownerType, setOwnerType] = useState<string>("");
  const [ownerRef, setOwnerRef] = useState<string>(ownerId || "");
  const [title, setTitle] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [currency, setCurrency] = useState<string>("INR");
  const [deliveryDays, setDeliveryDays] = useState<string>("");
  const [revisions, setRevisions] = useState<string>("");
  const [addons, setAddons] = useState<Addon[]>([]);
  const [visibility, setVisibility] = useState<string>("public");
  const [isActive, setIsActive] = useState<boolean>(true);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>("");

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
    if (!ownerType) return;
    if (ownerType === "collaborator") {
      setOwnerRef(String(user?._id || ""));
    } else if (ownerType === "agency_internal") {
      setOwnerRef("");
    } else {
      setOwnerRef(derivedOwnerRef);
    }
  }, [ownerType, derivedOwnerRef, user]);

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
      } catch { /* noop */ }
    }
    async function loadCollaborators() {
      try {
        if (!ownerId) return;
        const { data } = await api.get("/collaborators", { params: { managed_by: ownerId } });
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
      } catch { /* noop */ }
    }
    loadServices();
    loadCollaborators();
    return () => { cancelled = true; };
  }, [ownerId]);

  function addAddonRow() {
    setAddons((prev) => [...prev, { name: "", price: 0 }]);
  }

  function updateAddon(idx: number, field: "name" | "price", value: string) {
    setAddons((prev) => prev.map((ad, i) => i === idx ? { ...ad, [field]: field === "price" ? Number(value) : value } : ad));
  }

  function removeAddon(idx: number) {
    setAddons((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    setErrorMessage("");
    if (!serviceId) { setErrorMessage("Service is required."); return; }
    if (!ownerType) { setErrorMessage("Owner type is required."); return; }
    if (!ownerRef) { setErrorMessage("Owner ref is required."); return; }
    if (!title.trim()) { setErrorMessage("Title is required."); return; }
    if (!price || Number.isNaN(Number(price))) { setErrorMessage("Valid price (paise) is required."); return; }
    setLoading(true);
    try {
      const payload = {
        serviceId,
        ownerType,
        ownerRef,
        title: title.trim(),
        price: Number(price),
        currency: currency.trim(),
        deliveryDays: deliveryDays ? Number(deliveryDays) : undefined,
        revisions: revisions ? Number(revisions) : undefined,
        addons: addons.filter((a) => (a.name && String(a.name).trim().length > 0)).map((a) => ({ name: String(a.name), price: Number(a.price) })),
        visibility,
        isActive,
        meta: { equipment },
        notes: notes.trim(),
      };
      const { data } = await api.post("/rate-cards", payload);
      if (data && data._id) navigate("/rate-cards"); else navigate("/rate-cards");
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
        return "Failed to create rate card.";
      })();
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageMeta title="Add Rate Card" description="Create a new rate card" />
      <PageBreadcrumb pageTitle="Add Rate Card" />
      <div className="space-y-6">
        <ComponentCard title="New Rate Card" desc="Define rate card information">
          {errorMessage && (
            <Alert variant="error" title="Error" message={errorMessage} />
          )}
          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Service *</Label>
                <Select
                  options={[{ value: "", label: "Select service" }, ...Object.entries(serviceMap).map(([id, name]) => ({ value: id, label: name }))]}
                  defaultValue={serviceId}
                  onChange={(v) => setServiceId(String(v))}
                />
              </div>
              <div>
                <Label>Owner Type *</Label>
                <Select
                  options={[
                    { value: "", label: "Select" },
                    
                    ...(canAgency ? [
                      { value: "agency", label: "Business/Agency" },
                      { value: "agency_internal", label: "Internal Collaborators" },
                    ] : [{ value: "collaborator", label: "Individual" },]),
                    ...(canPlatform ? [
                      { value: "platform", label: "Platform" },
                    ] : []),
                  ]}
                  defaultValue={ownerType}
                  onChange={(v) => setOwnerType(String(v))}
                />
              </div>
              {ownerType === "agency_internal" ? (
                <div>
                  <Label>Owner Ref *</Label>
                  <Select
                    options={collaborators.map((c) => ({ value: c._id, label: c.label }))}
                    defaultValue={ownerRef}
                    onChange={(v) => setOwnerRef(String(v))}
                  />
                </div>
              ) : null}
              <div>
                <Label>Title *</Label>
                <Input placeholder="Reel edit (basic)" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <Label>Price *</Label>
                <Input type="number" placeholder="25000" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div>
                <Label>Currency</Label>
                <Select
                  options={[
                    { value: "INR", label: "INR" },
                    { value: "USD", label: "USD" },
                    { value: "EUR", label: "EUR" },
                    { value: "GBP", label: "GBP" },
                    { value: "AUD", label: "AUD" },
                  ]}
                  defaultValue={currency}
                  onChange={(v) => setCurrency(String(v))}
                />
              </div>
              <div>
                <Label>Delivery Days</Label>
                <Input type="number" placeholder="3" value={deliveryDays} onChange={(e) => setDeliveryDays(e.target.value)} />
              </div>
              <div>
                <Label>Revisions</Label>
                <Input type="number" placeholder="1" value={revisions} onChange={(e) => setRevisions(e.target.value)} />
              </div>
              <div>
                <Label>Visibility</Label>
                <Select
                  options={[
                    { value: "public", label: "public" },
                    { value: "private", label: "private" },
                    { value: "internal", label: "internal" },
                  ]}
                  defaultValue={visibility}
                  onChange={(v) => setVisibility(String(v))}
                />
              </div>
              <div>
                <Label>Active</Label>
                <Select
                  options={[
                    { value: "true", label: "Yes" },
                    { value: "false", label: "No" },
                  ]}
                  defaultValue={isActive ? "true" : "false"}
                  onChange={(v) => setIsActive(String(v) === "true")}
                />
              </div>
            </div>

            <div>
              <Label>Addons</Label>
              <div className="space-y-2">
                {addons.map((ad, idx) => (
                  <div key={`ad-${idx}`} className="grid grid-cols-1 gap-2 sm:grid-cols-6">
                    <div className="sm:col-span-4">
                      <Input placeholder="Addon name" value={String(ad.name || "")} onChange={(e) => updateAddon(idx, "name", e.target.value)} />
                    </div>
                    <div className="sm:col-span-2 flex items-center gap-2">
                      <Input type="number" placeholder="0" value={String(ad.price ?? 0)} onChange={(e) => updateAddon(idx, "price", e.target.value)} />
                      <Button type="button" variant="outline" size="sm" onClick={() => removeAddon(idx)}>Remove</Button>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addAddonRow}>Add addon</Button>
              </div>
            </div>

            <div>
              <Label>Equipment</Label>
              <TagInput values={equipment} onChange={setEquipment} placeholder="Premiere, CapCut" />
            </div>

            <div>
              <Label>Notes</Label>
              <TextArea rows={4} value={notes} onChange={(v) => setNotes(v)} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate("/rate-cards")}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={loading}>{loading ? "Saving..." : "Create"}</Button>
            </div>
          </form>
        </ComponentCard>
      </div>
    </>
  );
}
