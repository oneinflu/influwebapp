import { useEffect, useMemo, useState } from "react";
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
import { useNavigate } from "react-router";
import PermissionGate from "../components/common/PermissionGate";

interface PermissionItem { key: string; label: string; description?: string; default?: boolean }
interface PermissionGroup { _id: string; group: string; name: string; description?: string; permissions: PermissionItem[] }

type PermissionsMatrix = Record<string, Record<string, boolean>>;

export default function RolesNew() {
  const navigate = useNavigate();
  const { type, user } = useAuth();
  const ownerId = useMemo(() => (type === "user" ? user?._id ?? null : null), [type, user]);
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [perms, setPerms] = useState<PermissionsMatrix>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function fetchPermissionGroups() {
      setErrorMessage("");
      try {
        const { data } = await api.get("/permission-groups");
        if (!cancelled) setGroups(Array.isArray(data) ? data : []);
        // Initialize permissions matrix from defaults
        const init: PermissionsMatrix = {};
        for (const g of (Array.isArray(data) ? data : [])) {
          init[g.group] = {};
          for (const p of g.permissions || []) {
            init[g.group][p.key] = !!p.default;
          }
        }
        if (!cancelled) setPerms(init);
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
          return "Failed to load permissions.";
        })();
        setErrorMessage(message);
      }
    }
    fetchPermissionGroups();
    return () => { cancelled = true; };
  }, []);

  function setPermission(group: string, key: string, val: boolean) {
    setPerms((prev) => ({
      ...prev,
      [group]: { ...(prev[group] || {}), [key]: val },
    }));
  }

  function setGroupPermissions(group: string, val: boolean) {
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
    if (!name.trim()) {
      setErrorMessage("Role name is required.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        createdBy: ownerId,
        permissions: perms,
      };
      const { data } = await api.post("/roles", payload);
      if (data && data._id) {
        navigate("/roles");
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
        return "Failed to create role.";
      })();
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PermissionGate group="roles">
      <PageMeta title="Create Role" description="Create a role with permissions" />
      <PageBreadcrumb pageTitle="Create Role" />
      <div className="space-y-6">
        <ComponentCard title="New Role" desc="Select public permissions to include in this role">
          {errorMessage && (
            <Alert variant="error" title="Error" message={errorMessage} />
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
                <Input placeholder="e.g., Sales Manager" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>Description</Label>
                <TextArea rows={3} placeholder="Short description" value={description} onChange={(v) => setDescription(v)} />
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
                        />
                      </div>
                    ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <Button size="sm" disabled={loading || !name.trim()}>
                {loading ? "Creating..." : "Create Role"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate("/roles")}>Cancel</Button>
            </div>
          </form>
        </ComponentCard>
      </div>
    </PermissionGate>
  );
}
