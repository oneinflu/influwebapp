import { useState } from "react";
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

const TYPES = [
  "UGC creator",
  "Editor",
  "Scriptwriter",
  "Voice-over artist",
  "Model",
  "Actor",
  "Designer",
  "Photographer",
  "Videographer",
  "Influencer",
];

export default function CollaboratorsNew() {
  const navigate = useNavigate();
  const { type, user } = useAuth();
  const ownerId = type === "user" ? user?._id ?? null : null;
  const [collabType, setCollabType] = useState<string>(TYPES[0]);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  async function handleSubmit() {
    setErrorMessage("");
    if (!ownerId) { setErrorMessage("Not authenticated."); return; }
    if (!collabType) { setErrorMessage("Type is required."); return; }
    if (!userEmail.trim()) { setErrorMessage("User email is required."); return; }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        type: collabType,
        managed_by: ownerId,
        user_email: userEmail.trim().toLowerCase(),
      };
      if (userName.trim()) payload.user_name = userName.trim();
      if (notes.trim()) payload.notes = notes.trim();
      const { data } = await api.post("/collaborators", payload);
      if (data && data._id) navigate("/collaborators");
      else navigate("/collaborators");
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
        return "Failed to create collaborator.";
      })();
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageMeta title="Add Collaborator" description="Create a new collaborator" />
      <PageBreadcrumb pageTitle="Add Collaborator" />
      <div className="space-y-6">
        <ComponentCard title="New Collaborator" desc="Fill in the required details">
          {errorMessage && (
            <Alert variant="error" title="Error" message={errorMessage} />
          )}

          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>
                  Type <span className="text-error-500">*</span>
                </Label>
                <Select
                  options={TYPES.map((t) => ({ value: t, label: t }))}
                  defaultValue={collabType}
                  onChange={(v) => setCollabType(String(v))}
                />
              </div>
              <div>
                <Label>
                  User Email <span className="text-error-500">*</span>
                </Label>
                <Input placeholder="user@example.com" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} />
              </div>
              <div>
                <Label>User Name (optional)</Label>
                <Input placeholder="Full name" value={userName} onChange={(e) => setUserName(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Notes</Label>
                <Input placeholder="Notes for this collaboration" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" disabled={loading || !collabType || !userEmail.trim()}>
                {loading ? "Creating..." : "Create Collaborator"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate("/collaborators")}>Cancel</Button>
            </div>
          </form>
        </ComponentCard>
      </div>
    </>
  );
}