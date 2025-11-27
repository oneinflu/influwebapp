import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
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

export default function TeamMembersEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { type, user } = useAuth();
  const ownerId = useMemo(() => (type === "user" ? user?._id ?? null : null), [type, user]);

  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [password, setPassword] = useState<string>("123456");
  const [roles, setRoles] = useState<{ value: string; label: string }[]>([]);
  const [roleId, setRoleId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

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

  useEffect(() => {
    let cancelled = false;
    async function loadMember() {
      if (!id) return;
      setLoading(true);
      setErrorMessage("");
      try {
        const { data } = await api.get(`/team-members/${id}`);
        if (cancelled) return;
        const tm = (data ?? {}) as { name?: string; email?: string; phone?: string; role?: string };
        setName(tm.name || "");
        setEmail(tm.email || "");
        setPhone(tm.phone || "");
        setRoleId(tm.role || "");
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
          return "Failed to load team member.";
        })();
        setErrorMessage(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadMember();
    return () => { cancelled = true; };
  }, [id]);

  async function handleSubmit() {
    if (!id) return;
    setSaving(true);
    setErrorMessage("");
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        role: roleId || undefined,
        password: password.trim(),
      };
      await api.put(`/team-members/${id}`, payload);
      navigate("/team/members");
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
        return "Failed to update team member.";
      })();
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageMeta title="Edit Team Member" description="Update team member details" />
      <PageBreadcrumb pageTitle="Edit Team Member" />
      <div className="space-y-6">
        <ComponentCard title="Edit Team Member" desc="Modify the fields and save changes">
          {errorMessage && (
            <Alert variant="error" title="Error" message={errorMessage} />
          )}

          {loading ? (
            <p className="px-2 text-sm text-gray-500 dark:text-gray-400">Loading member...</p>
          ) : (
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
                  Password <span className="text-gray-500 text-xs">(default 123456)</span>
                </Label>
                <Input type="password" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} />
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
                <Button size="sm" disabled={loading || saving || !name.trim() || !roleId}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button size="sm" variant="outline" type="button" onClick={() => navigate("/team/members")}>Cancel</Button>
              </div>
            </form>
          )}
        </ComponentCard>
      </div>
    </>
  );
}
