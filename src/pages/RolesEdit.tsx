import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import PermissionGate from "../components/common/PermissionGate";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import TextArea from "../components/form/input/TextArea";
import Checkbox from "../components/form/input/Checkbox";
import Button from "../components/ui/button/Button";
import Alert from "../components/ui/alert/Alert";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

interface PermissionItem { key: string; label: string; description?: string; default?: boolean }
interface PermissionGroup { _id: string; group: string; name: string; description?: string; permissions: PermissionItem[] }
type PermissionsMatrix = Record<string, Record<string, boolean>>;

interface RoleDoc {
  _id: string;
  name: string;
  description?: string;
  createdBy: string;
  permissions?: PermissionsMatrix;
  is_system_role?: boolean;
  locked?: boolean;
}

export default function RolesEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { type, user } = useAuth();
  const ownerId = useMemo(() => (type === "user" ? user?._id ?? null : null), [type, user]);
  const [role, setRole] = useState<RoleDoc | null>(null);
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [perms, setPerms] = useState<PermissionsMatrix>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Fetch role and permission groups
  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      if (!id) return;
      setErrorMessage("");
      try {
        const [roleResp, groupsResp] = await Promise.all([
          api.get(`/roles/${id}`),
          api.get("/permission-groups"),
        ]);
        const r = roleResp.data as RoleDoc;
        const g = Array.isArray(groupsResp.data) ? (groupsResp.data as PermissionGroup[]) : [];
        if (!cancelled) {
          setRole(r);
          setName(r?.name || "");
          setDescription(r?.description || "");
          setGroups(g);
          // Initialize permissions from groups defaults, then overlay role permissions
          const init: PermissionsMatrix = {};
          for (const group of g) {
            init[group.group] = {};
            for (const p of group.permissions || []) {
              init[group.group][p.key] = !!p.default;
            }
          }
          const rp = r?.permissions || {};
          for (const grp of Object.keys(rp)) {
            init[grp] = init[grp] || {};
            for (const key of Object.keys(rp[grp] || {})) {
              init[grp][key] = !!rp[grp][key];
            }
          }
          setPerms(init);
        }
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
          return "Failed to load role or permissions.";
        })();
        setErrorMessage(message);
      }
    }
    fetchAll();
    return () => { cancelled = true; };
  }, [id]);

  function setPermission(group: string, key: string, val: boolean) {
    setPerms((prev) => ({
      ...prev,
      [group]: { ...(prev[group] || {}), [key]: val },
    }));
  }

  function setGroupPermissions(group: string, val: boolean) {
    if (disabled) return;
    setPerms((prev) => {
      const current = prev[group] || {};
      const targetGroup = groups.find((g) => g.group === group);
      const nextGroup: Record<string, boolean> = { ...current };
      for (const p of targetGroup?.permissions || []) {
        nextGroup[p.key] = val;
      }
      return { ...prev, [group]: nextGroup };
    });
  }

  async function handleSubmit() {
    setErrorMessage("");
    if (!ownerId) {
      setErrorMessage("Not authenticated.");
      return;
    }
    if (!id) {
      setErrorMessage("Missing role id.");
      return;
    }
    if (!name.trim()) {
      setErrorMessage("Role name is required.");
      return;
    }
    if (role?.locked) {
      setErrorMessage("Locked roles cannot be edited.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        permissions: perms,
      };
      const { data } = await api.put(`/roles/${id}`, payload);
      if (data && data._id) {
        navigate(`/roles/${id}`);
      } else {
        navigate("/roles");
      }
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
        return "Failed to update role.";
      })();
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  const disabled = role?.locked === true;

  return (
    <PermissionGate group="roles">
      <PageMeta title="Edit Role" description="Update role permissions" />
      <PageBreadcrumb pageTitle="Edit Role" />
      <div className="space-y-6">
        <ComponentCard title={role ? `Edit: ${role.name}` : "Edit Role"} desc="Select public permissions to include in this role">
          {errorMessage && (
            <Alert variant="error" title="Error" message={errorMessage} />
          )}
          {disabled && (
            <Alert variant="warning" title="Locked Role" message="This role is locked and cannot be edited." />
          )}

          <form
            className="space-y-6"
            onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>
                  Role name <span className="text-error-500">*</span>
                </Label>
                <Input placeholder="Role name" value={name} onChange={(e) => setName(e.target.value)} disabled={disabled} />
              </div>
              <div>
                <Label>Description</Label>
                <TextArea rows={3} placeholder="Short description" value={description} onChange={(v) => setDescription(v)} disabled={disabled} />
              </div>
            </div>

            <div className="space-y-6">
              {groups.map((g) => {
                const allSelected = (g.permissions || []).every(
                  (p) => !!(perms[g.group] && perms[g.group][p.key])
                );
                return (
                  <div key={g._id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">{g.name}</h4>
                        {g.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{g.description}</p>
                        )}
                      </div>
                      <Checkbox
                        label="Select all"
                        checked={allSelected}
                        onChange={(val) => setGroupPermissions(g.group, val)}
                        disabled={disabled}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {(g.permissions || []).map((p) => (
                      <div key={p.key} className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-white/90">{p.label}</p>
                          {p.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{p.description}</p>
                          )}
                        </div>
                        <Checkbox
                          checked={!!(perms[g.group] && perms[g.group][p.key])}
                          onChange={(val) => setPermission(g.group, p.key, val)}
                          disabled={disabled}
                        />
                      </div>
                    ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <Button size="sm" disabled={disabled || loading || !name.trim()}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate(role ? `/roles/${role._id}` : "/roles")}>Cancel</Button>
            </div>
          </form>
        </ComponentCard>
      </div>
    </PermissionGate>
  );
}
