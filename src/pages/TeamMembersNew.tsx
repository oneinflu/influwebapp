import { useEffect, useMemo, useState } from "react";
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

export default function TeamMembersNew() {
  const navigate = useNavigate();
  const { type, user } = useAuth();
  const ownerId = useMemo(() => (type === "user" ? user?._id ?? null : null), [type, user]);
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [roles, setRoles] = useState<{ value: string; label: string }[]>([]);
  const [roleId, setRoleId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    async function fetchRoles() {
      if (!ownerId) return;
      try {
        const { data } = await api.get<Array<{ _id: string; name: string }>>("/roles", { params: { createdBy: ownerId } });
        const opts = (Array.isArray(data) ? data : []).map((r) => ({ value: r._id, label: r.name }));
        setRoles(opts);
      } catch {
        setRoles([]);
      }
    }
    void fetchRoles();
  }, [ownerId]);

  async function handleSubmit() {
    setErrorMessage("");
    if (!ownerId) { setErrorMessage("Not authenticated."); return; }
    if (!name.trim()) { setErrorMessage("Name is required."); return; }
    if (!roleId) { setErrorMessage("Role is required."); return; }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        managed_by: ownerId,
        role: roleId,
      };
      if (email.trim()) payload.email = email.trim().toLowerCase();
      if (phone.trim()) payload.phone = phone.trim();
      const { data } = await api.post("/team-members", payload);
      if (data && data._id) navigate("/team/members");
      else navigate("/team/members");
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
        return "Failed to create team member.";
      })();
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageMeta title="Add Team Member" description="Create a new team member" />
      <PageBreadcrumb pageTitle="Add Team Member" />
      <div className="space-y-6">
        <ComponentCard title="New Team Member" desc="Fill in the required details">
          {errorMessage && (
            <Alert variant="error" title="Error" message={errorMessage} />
          )}

          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>
                  Name <span className="text-error-500">*</span>
                </Label>
                <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input placeholder="+91 9876543210" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <Label>
                  Role <span className="text-error-500">*</span>
                </Label>
                <Select
                  options={roles}
                  placeholder="Select role"
                  defaultValue={roleId}
                  onChange={(v: string) => setRoleId(v)}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" disabled={loading || !name.trim() || !roleId}>
                {loading ? "Creating..." : "Create Team Member"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate("/team/members")}>Cancel</Button>
            </div>
          </form>
        </ComponentCard>
      </div>
    </>
  );
}