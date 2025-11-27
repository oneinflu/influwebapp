import { useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import Select from "../components/form/Select";
import Checkbox from "../components/form/input/Checkbox";
import Button from "../components/ui/button/Button";
import Alert from "../components/ui/alert/Alert";
import api from "../utils/api";
import { useNavigate } from "react-router";
import TagInput from "../components/form/input/TagInput";

 

export default function ServicesNew() {
  const navigate = useNavigate();
  const [name, setName] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [unit, setUnit] = useState<string>("per_deliverable");
  const [defaultDeliverables, setDefaultDeliverables] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  

  

  async function handleSubmit() {
    setErrorMessage("");
    if (!name.trim()) { setErrorMessage("Service name is required."); return; }
    if (!category.trim()) { setErrorMessage("Category is required."); return; }
    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        category: category.trim(),
        description: description.trim(),
        unit,
        defaultDeliverables,
        tags,
        isActive,
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
        <ComponentCard title="New Service" desc="Define service information">
          {errorMessage && (
            <Alert variant="error" title="Error" message={errorMessage} />
          )}

          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>
                  Service Name <span className="text-error-500">*</span>
                </Label>
                <Input placeholder="Short Video" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>
                  Category <span className="text-error-500">*</span>
                </Label>
                <Input placeholder="Content" value={category} onChange={(e) => setCategory(e.target.value)} />
              </div>
              <div>
                <Label>Description</Label>
                <Input placeholder="Reels/TikTok" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div>
                <Label>Unit</Label>
                <Select
                  options={[
                    { value: "per_deliverable", label: "per_deliverable" },
                    { value: "per_project", label: "per_project" },
                    { value: "per_hour", label: "per_hour" },
                  ]}
                  defaultValue={unit}
                  onChange={(v) => setUnit(String(v))}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Default Deliverables</Label>
                <TagInput values={defaultDeliverables} onChange={setDefaultDeliverables} placeholder="Type and press Enter" />
              </div>
              <div className="sm:col-span-2">
                <Label>Tags</Label>
                <TagInput values={tags} onChange={setTags} placeholder="Type and press Enter" />
              </div>
              <div>
                <Checkbox label="Active" checked={isActive} onChange={setIsActive} />
              </div>
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
