import { useEffect, useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import Select from "../components/form/Select";
import Button from "../components/ui/button/Button";
import Alert from "../components/ui/alert/Alert";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router";

const STATUS = [
  "new_lead",
  "contacted",
  "qualified",
  "proposal_sent",
  "won",
  "lost",
  "closed",
];

export default function LeadsNew() {
  const navigate = useNavigate();
  const { type, user } = useAuth();
  const ownerId = type === "user" ? user?._id ?? null : null;
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [website, setWebsite] = useState<string>("");
  const [budget, setBudget] = useState<string>("");
  const [status, setStatus] = useState<string>(STATUS[0]);
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [services, setServices] = useState<{ _id: string; name: string }[]>([]);
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [team, setTeam] = useState<{ _id: string; name: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Load owner's services and team for scoping and selects
  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      if (!ownerId) return;
      try {
        const [{ data: svc }, { data: tm }] = await Promise.all([
          api.get("/services", { params: { user_id: ownerId } }),
          api.get("/team-members", { params: { managed_by: ownerId } }),
        ]);
        if (!cancelled) {
          const svcArr: Array<{ _id: string; name?: string }> = Array.isArray(svc) ? (svc as Array<{ _id: string; name?: string }>) : [];
          setServices(svcArr.map((s) => ({ _id: s._id, name: s.name || s._id })));
          const tmArr: Array<{ _id: string; name?: string }> = Array.isArray(tm) ? (tm as Array<{ _id: string; name?: string }>) : [];
          setTeam(tmArr.map((t) => ({ _id: t._id, name: t.name || t._id })));
        }
      } catch {
        // Keep form usable even if lists fail
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, [ownerId]);

  async function handleSubmit() {
    setErrorMessage("");
    if (!ownerId) { setErrorMessage("Not authenticated."); return; }
    if (!name.trim()) { setErrorMessage("Name is required."); return; }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        status,
      };
      if (email.trim()) payload.email = email.trim().toLowerCase();
      if (phone.trim()) payload.phone = phone.trim();
      if (website.trim()) payload.website = website.trim();
      if (budget.trim()) payload.budget = Number(budget);
      if (assignedTo) payload.assigned_to = assignedTo;
      if (lookingFor.length > 0) payload.looking_for = lookingFor;
      const { data } = await api.post("/leads", payload);
      if (data && data._id) navigate("/leads");
      else navigate("/leads");
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
        return "Failed to create lead.";
      })();
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageMeta title="Add Lead" description="Create a new lead" />
      <PageBreadcrumb pageTitle="Add Lead" />
      <div className="space-y-6">
        <ComponentCard title="New Lead" desc="Fill in the lead information">
          {errorMessage && (
            <Alert variant="error" title="Error" message={errorMessage} />
          )}

          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>
                  Name <span className="text-error-500">*</span>
                </Label>
                <Input placeholder="Lead name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input placeholder="lead@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input placeholder="+91 9876543210" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <Label>Website</Label>
                <Input placeholder="https://example.com" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </div>
              <div>
                <Label>Budget</Label>
                <Input placeholder="Amount" value={budget} onChange={(e) => setBudget(e.target.value)} />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  options={STATUS.map((s) => ({ value: s, label: s.replace(/_/g, " ") }))}
                  defaultValue={status}
                  onChange={(v) => setStatus(String(v))}
                />
              </div>
              <div>
                <Label>Assigned To</Label>
                <Select
                  options={[{ value: "", label: "None" }, ...team.map((t) => ({ value: t._id, label: t.name }))]}
                  defaultValue={assignedTo}
                  onChange={(v) => setAssignedTo(String(v))}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Looking For Services</Label>
                <Select
                  options={services.map((s) => ({ value: s._id, label: s.name }))}
                  defaultValue={""}
                  onChange={(v) => {
                    const val = String(v);
                    setLookingFor((prev) => (prev.includes(val) ? prev : [...prev, val]));
                  }}
                />
                {lookingFor.length > 0 && (
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">Selected: {lookingFor.length}</div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" disabled={loading || !name.trim()}>
                {loading ? "Creating..." : "Create Lead"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate("/leads")}>Cancel</Button>
            </div>
          </form>
        </ComponentCard>
      </div>
    </>
  );
}