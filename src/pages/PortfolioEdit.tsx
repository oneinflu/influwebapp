import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import Select from "../components/form/Select";
import Button from "../components/ui/button/Button";
import Alert from "../components/ui/alert/Alert";
import api from "../utils/api";

type PortfolioItem = {
  _id: string;
  type: "image" | "video" | "audio" | "document";
  media_url: string;
  thumbnail_url?: string;
  size_bytes?: number;
  thumbnail_size_bytes?: number;
  title?: string;
  description?: string;
  tags?: string[];
  status?: string;
};

export default function PortfolioEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { type, user } = useAuth();
  const ownerId = useMemo(() => (type === "user" ? user?._id ?? null : null), [type, user]);
  const [item, setItem] = useState<PortfolioItem | null>(null);
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [tagsInput, setTagsInput] = useState<string>("");
  const [status, setStatus] = useState<string>("active");
  const [thumbUrl, setThumbUrl] = useState<string>("");
  const [newMediaFile, setNewMediaFile] = useState<File | null>(null);
  const [newThumbFile, setNewThumbFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) return;
      setErrorMessage("");
      try {
        const { data } = await api.get(`/portfolios/${id}`);
        if (!cancelled) {
          setItem(data);
          setTitle(data?.title || "");
          setDescription(data?.description || "");
          setStatus(data?.status || "active");
          setThumbUrl(data?.thumbnail_url || "");
          setTagsInput(Array.isArray(data?.tags) ? data.tags.join(", ") : "");
        }
      } catch (err) {
        if (!cancelled) {
          const message = ((): string => {
            if (err && typeof err === "object") {
              const anyErr = err as { response?: { data?: unknown } };
              const respData = anyErr.response?.data;
              if (respData && typeof respData === "object" && "error" in respData) {
                const msg = (respData as { error?: unknown }).error;
                if (typeof msg === "string" && msg.trim().length > 0) return msg;
              }
            }
            return "Failed to load portfolio item.";
          })();
          setErrorMessage(message);
        }
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [id]);

  async function uploadToBunny(userId: string, filename: string, file: File): Promise<string> {
    const { data } = await api.put(
      "/uploads/portfolio",
      file,
      {
        headers: { "Content-Type": file.type || "application/octet-stream" },
        params: { user_id: userId, filename },
      }
    );
    return String(data?.url || "");
  }

  function parseUserAndFilename(url: string): { userId?: string; filename?: string } {
    try {
      const u = new URL(url);
      const parts = (u.pathname || "").split("/").filter(Boolean);
      if (parts.length >= 2) {
        return { userId: parts[0], filename: parts.slice(1).join("/") };
      }
      return {};
    } catch {
      const parts = (url.startsWith("/") ? url : `/${url}`).split("/").filter(Boolean);
      if (parts.length >= 2) {
        return { userId: parts[0], filename: parts.slice(1).join("/") };
      }
      return {};
    }
  }

  async function handleSubmit() {
    if (!id) return;
    setLoading(true);
    setErrorMessage("");
    try {
      // If replacing media, upload to Bunny with the new filename and update URL
      let mediaUrlToSave: string | undefined;
      if (newMediaFile && item?.media_url) {
        const { userId: pathUser } = parseUserAndFilename(item.media_url);
        const targetUser = pathUser || (ownerId ? String(ownerId) : undefined);
        const targetFile = newMediaFile.name; // always use new filename to ensure new URL
        if (!targetUser || !targetFile) throw new Error("Unable to determine Bunny upload path for media replacement");
        mediaUrlToSave = await uploadToBunny(targetUser, targetFile, newMediaFile);
      }

      // If replacing thumbnail, upload and set thumbUrl accordingly
      let thumbUrlToSave: string | undefined = thumbUrl || undefined;
      if (newThumbFile) {
        const baseForThumb = item?.thumbnail_url || item?.media_url || "";
        const { userId: pathUser } = parseUserAndFilename(baseForThumb);
        const targetUser = pathUser || (ownerId ? String(ownerId) : undefined);
        const targetFile = newThumbFile.name;
        if (!targetUser || !targetFile) throw new Error("Unable to determine Bunny upload path for thumbnail replacement");
        thumbUrlToSave = await uploadToBunny(targetUser, targetFile, newThumbFile);
      }

      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      const payload: Partial<PortfolioItem> = {
        title: title || undefined,
        description: description || undefined,
        tags,
        status,
        thumbnail_url: thumbUrlToSave,
        media_url: mediaUrlToSave,
        size_bytes: newMediaFile ? newMediaFile.size || 0 : undefined,
        thumbnail_size_bytes: newThumbFile ? newThumbFile.size || 0 : undefined,
      };
      const { data } = await api.put(`/portfolios/${id}`, payload);
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
        return "Failed to update portfolio item.";
      })();
          setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageMeta title="Edit Media" description="Update portfolio item details" />
      <PageBreadcrumb pageTitle="Edit Portfolio Item" />
      <div className="space-y-6">
        <ComponentCard title="Edit Portfolio Item" desc="Change metadata and status">
          {errorMessage && (
            <Alert variant="error" title="Error" message={errorMessage} />
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Type</Label>
                <Input value={item?.type || ""} disabled />
              </div>
              <div>
                <Label>Media URL</Label>
                <Input value={item?.media_url || ""} disabled />
              </div>
              <div>
                <Label>Thumbnail URL</Label>
                <Input placeholder="https://..." value={thumbUrl} onChange={(e) => setThumbUrl(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Replace Media File</Label>
                <input
                  type="file"
                  className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm"
                  onChange={(e) => setNewMediaFile(e.target.files?.[0] || null)}
                  accept={item?.type === "image" ? "image/*" : item?.type === "video" ? "video/*" : undefined}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">If provided, the existing file on Bunny will be overwritten.</p>
              </div>
              <div className="sm:col-span-2">
                <Label>Replace Thumbnail File</Label>
                <input
                  type="file"
                  className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm"
                  onChange={(e) => setNewThumbFile(e.target.files?.[0] || null)}
                  accept="image/*"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">If provided, uploads a new thumbnail to Bunny and updates the URL.</p>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  key={status || "active"}
                  options={[
                    { value: "active", label: "Active" },
                    { value: "archived", label: "Archived" },
                  ]}
                  defaultValue={status}
                  onChange={(v: string) => setStatus(v)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Title</Label>
                <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Tags (comma separated)</Label>
                <Input placeholder="tag1, tag2" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button size="sm" disabled={loading || !id}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate("/portfolio")}>Cancel</Button>
            </div>
          </form>
        </ComponentCard>
      </div>
    </>
  );
}