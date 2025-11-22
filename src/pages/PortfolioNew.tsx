import { useMemo, useState } from "react";
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

export default function PortfolioNew() {
  const navigate = useNavigate();
  const { type, user } = useAuth();
  const ownerId = useMemo(() => (type === "user" ? user?._id ?? null : null), [type, user]);
  const [itemType, setItemType] = useState<string>("image");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [tagInput, setTagInput] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (!t) return;
    setTags((prev) => (prev.includes(t) ? prev : [...prev, t]));
    setTagInput("");
  }
  function removeTag(idx: number) {
    setTags((prev) => prev.filter((_, i) => i !== idx));
  }

  async function uploadToBunny(userId: string, file: File): Promise<string> {
    const { data } = await api.put(
      "/uploads/portfolio",
      file,
      {
        headers: { "Content-Type": file.type || "application/octet-stream" },
        params: { user_id: userId, filename: file.name },
      }
    );
    return String(data?.url || "");
  }

  async function handleSubmit() {
    setErrorMessage("");
    if (!ownerId) { setErrorMessage("Not authenticated."); return; }
    if (!itemType) { setErrorMessage("Type is required."); return; }
    if (!mediaFile) { setErrorMessage("Media file is required."); return; }
    setLoading(true);
    try {
      // Upload files to Bunny via server
      const mediaUrl = await uploadToBunny(String(ownerId), mediaFile);
      const thumbUrl = thumbFile ? await uploadToBunny(String(ownerId), thumbFile) : "";

      const payload = {
        type: itemType,
        belongs_to: ownerId,
        media_url: mediaUrl,
        thumbnail_url: thumbUrl || undefined,
        size_bytes: mediaFile.size || 0,
        thumbnail_size_bytes: thumbFile ? thumbFile.size || 0 : 0,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        tags,
        status: "active",
      };
      const { data } = await api.post("/portfolios", payload);
      if (data && data._id) navigate("/portfolio");
      else navigate("/portfolio");
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
        return "Failed to create portfolio item.";
      })();
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageMeta title="Add Media" description="Add a portfolio item" />
      <PageBreadcrumb pageTitle="Add Media" />
      <div className="space-y-6">
        <ComponentCard title="New Portfolio Item" desc="Provide URLs and metadata">
          {errorMessage && (
            <Alert variant="error" title="Error" message={errorMessage} />
          )}

          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Type</Label>
                <Select
                  options={[
                    { value: "image", label: "Image" },
                    { value: "video", label: "Video" },
                    { value: "audio", label: "Audio" },
                    { value: "document", label: "Document" },
                  ]}
                  defaultValue={itemType}
                  onChange={(v) => setItemType(String(v))}
                />
              </div>
              <div>
                <Label>Media File</Label>
                <input
                  type="file"
                  className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm"
                  onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                  accept={itemType === "image" ? "image/*" : itemType === "video" ? "video/*" : undefined}
                />
              </div>
              <div>
                <Label>Thumbnail File (optional)</Label>
                <input
                  type="file"
                  className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm"
                  onChange={(e) => setThumbFile(e.target.files?.[0] || null)}
                  accept="image/*"
                />
              </div>
              <div>
                <Label>Title</Label>
                <Input placeholder="Human-friendly title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <Label>Description</Label>
                <Input placeholder="Short description" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Tags</Label>
                <div className="flex items-center gap-2">
                  <Input placeholder="Add tag" value={tagInput} onChange={(e) => setTagInput(e.target.value)} />
                  <Button size="sm" variant="outline" onClick={addTag}>Add</Button>
                </div>
                {tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tags.map((t, idx) => (
                      <span key={`${t}-${idx}`} className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-300">
                        {t}
                        <button type="button" className="ml-2 text-gray-500 hover:text-gray-700" onClick={() => removeTag(idx)}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" disabled={loading || !itemType || !mediaFile}>
                {loading ? "Creating..." : "Create Item"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate("/portfolio")}>Cancel</Button>
            </div>
          </form>
        </ComponentCard>
      </div>
    </>
  );
}