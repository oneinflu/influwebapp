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
import DatePicker from "../components/form/date-picker";

type ClientOption = { _id: string; business_name?: string };
type ServiceOption = { _id: string; name?: string };
type CollaboratorOption = { _id: string; type?: string };

const STATUS = ["draft", "in_progress", "completed", "cancelled", "on_hold"];
const APPROVAL = ["awaiting_approval", "approved", "rejected"];

export default function ProjectsNew() {
  const navigate = useNavigate();
  const { type, user } = useAuth();
  const ownerId = useMemo(() => (type === "user" ? user?._id ?? null : null), [type, user]);
  const [name, setName] = useState<string>("");
  const [client, setClient] = useState<string>("");
  const [projectCategoryInput, setProjectCategoryInput] = useState<string>("");
  const [projectCategory, setProjectCategory] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [completionDate, setCompletionDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [budget, setBudget] = useState<string>("");
  const [status, setStatus] = useState<string>(STATUS[0]);
  const [approval, setApproval] = useState<string>(APPROVAL[0]);
  const [targetLocationsInput, setTargetLocationsInput] = useState<string>("");
  const [targetLocations, setTargetLocations] = useState<string[]>([]);
  const [targetPlatformsInput, setTargetPlatformsInput] = useState<string>("");
  const [targetPlatforms, setTargetPlatforms] = useState<string[]>([]);
  const [targetAgesInput, setTargetAgesInput] = useState<string>("");
  const [targetAges, setTargetAges] = useState<string[]>([]);
  const [targetLanguagesInput, setTargetLanguagesInput] = useState<string>("");
  const [targetLanguages, setTargetLanguages] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>("");
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [collabOptions, setCollabOptions] = useState<CollaboratorOption[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      if (!ownerId) return;
      try {
        const [{ data: clients }, { data: services }, { data: collabs }] = await Promise.all([
          api.get("/clients", { params: { user_id: ownerId } }),
          api.get("/services", { params: { user_id: ownerId } }),
          api.get("/collaborators", { params: { managed_by: ownerId } }),
        ]);
        if (!cancelled) {
          const clientArr: ClientOption[] = Array.isArray(clients) ? clients : [];
          setClientOptions(clientArr);
          const svcArr: ServiceOption[] = Array.isArray(services) ? services : [];
          setServiceOptions(svcArr);
          const collArr: CollaboratorOption[] = Array.isArray(collabs) ? collabs : [];
          setCollabOptions(collArr);
        }
      } catch {
        // keep usable
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, [ownerId]);

  function addCategory() {
    const val = projectCategoryInput.trim();
    if (!val) return;
    setProjectCategory((prev) => (prev.includes(val) ? prev : [...prev, val]));
    setProjectCategoryInput("");
  }

  function addTarget(setter: (next: string[]) => void, value: string, prev: string[]) {
    const v = value.trim();
    if (!v) return;
    setter(prev.includes(v) ? prev : [...prev, v]);
  }

  async function handleSubmit() {
    setErrorMessage("");
    if (!ownerId) { setErrorMessage("Not authenticated."); return; }
    if (!name.trim()) { setErrorMessage("Project name is required."); return; }
    if (!client) { setErrorMessage("Client is required."); return; }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        client,
        project_category: projectCategory,
        services: services,
        collaborators: collaborators,
        completion_date: completionDate || undefined,
        end_date: endDate || undefined,
        project_budget: budget ? Number(budget) : undefined,
        status,
        approval_status: approval,
        target: {
          location: targetLocations,
          platforms: targetPlatforms,
          age_groups: targetAges,
          languages: targetLanguages,
        },
        notes: notes.trim() || undefined,
      };
      const { data } = await api.post("/projects", payload);
      if (data && data._id) navigate("/projects");
      else navigate("/projects");
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
        <ComponentCard title="New Project" desc="Fill project details">
          {errorMessage && (
            <Alert variant="error" title="Error" message={errorMessage} />
          )}

          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>
                  Project Name <span className="text-error-500">*</span>
                </Label>
                <Input placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>
                  Client <span className="text-error-500">*</span>
                </Label>
                <Select
                  options={clientOptions.map((c) => ({ value: c._id, label: c.business_name || c._id }))}
                  defaultValue={client}
                  onChange={(v) => setClient(String(v))}
                />
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
                <Label>Approval Status</Label>
                <Select
                  options={APPROVAL.map((a) => ({ value: a, label: a.replace(/_/g, " ") }))}
                  defaultValue={approval}
                  onChange={(v) => setApproval(String(v))}
                />
              </div>
              <div>
                <Label>Completion Date</Label>
                <DatePicker
                  id="completion-date"
                  label={undefined}
                  placeholder="YYYY-MM-DD"
                  defaultDate={completionDate || undefined}
                  onChange={(_selectedDates, dateStr) => setCompletionDate(dateStr)}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <DatePicker
                  id="end-date"
                  label={undefined}
                  placeholder="YYYY-MM-DD"
                  defaultDate={endDate || undefined}
                  onChange={(_selectedDates, dateStr) => setEndDate(dateStr)}
                />
              </div>
              <div>
                <Label>Project Budget</Label>
                <Input placeholder="Amount" value={budget} onChange={(e) => setBudget(e.target.value)} />
              </div>
              <div>
                <Label>Project Categories</Label>
                <div className="flex items-center gap-2">
                  <Input placeholder="Add category" value={projectCategoryInput} onChange={(e) => setProjectCategoryInput(e.target.value)} />
                  <Button size="sm" variant="outline" onClick={addCategory}>Add</Button>
                </div>
                {projectCategory.length > 0 && (
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">Selected: {projectCategory.length}</div>
                )}
              </div>
              <div>
                <Label>Services</Label>
                <Select
                  options={serviceOptions.map((s) => ({ value: s._id, label: s.name || s._id }))}
                  defaultValue={""}
                  onChange={(v) => {
                    const val = String(v);
                    setServices((prev) => (prev.includes(val) ? prev : [...prev, val]));
                  }}
                />
                {services.length > 0 && (
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">Selected: {services.length}</div>
                )}
              </div>
              <div>
                <Label>Collaborators</Label>
                <Select
                  options={collabOptions.map((c) => ({ value: c._id, label: c.type || c._id }))}
                  defaultValue={""}
                  onChange={(v) => {
                    const val = String(v);
                    setCollaborators((prev) => (prev.includes(val) ? prev : [...prev, val]));
                  }}
                />
                {collaborators.length > 0 && (
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">Selected: {collaborators.length}</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Target Locations</Label>
                <div className="flex items-center gap-2">
                  <Input placeholder="Add location" value={targetLocationsInput} onChange={(e) => setTargetLocationsInput(e.target.value)} />
                  <Button size="sm" variant="outline" onClick={() => addTarget(setTargetLocations, targetLocationsInput, targetLocations)}>Add</Button>
                </div>
              </div>
              <div>
                <Label>Target Platforms</Label>
                <div className="flex items-center gap-2">
                  <Input placeholder="Add platform" value={targetPlatformsInput} onChange={(e) => setTargetPlatformsInput(e.target.value)} />
                  <Button size="sm" variant="outline" onClick={() => addTarget(setTargetPlatforms, targetPlatformsInput, targetPlatforms)}>Add</Button>
                </div>
              </div>
              <div>
                <Label>Target Age Groups</Label>
                <div className="flex items-center gap-2">
                  <Input placeholder="Add age group" value={targetAgesInput} onChange={(e) => setTargetAgesInput(e.target.value)} />
                  <Button size="sm" variant="outline" onClick={() => addTarget(setTargetAges, targetAgesInput, targetAges)}>Add</Button>
                </div>
              </div>
              <div>
                <Label>Target Languages</Label>
                <div className="flex items-center gap-2">
                  <Input placeholder="Add language" value={targetLanguagesInput} onChange={(e) => setTargetLanguagesInput(e.target.value)} />
                  <Button size="sm" variant="outline" onClick={() => addTarget(setTargetLanguages, targetLanguagesInput, targetLanguages)}>Add</Button>
                </div>
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Input placeholder="Project notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div className="flex items-center gap-3">
              <Button size="sm" disabled={loading || !name.trim() || !client}>
                {loading ? "Creating..." : "Create Project"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate("/projects")}>Cancel</Button>
            </div>
          </form>
        </ComponentCard>
      </div>
    </>
  );
}