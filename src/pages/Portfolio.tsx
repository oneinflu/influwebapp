/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";
import Alert from "../components/ui/alert/Alert";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router";
import { Modal } from "../components/ui/modal";
import { useModal } from "../hooks/useModal";
import VideoPlayer from "../components/media/VideoPlayer";
import DeleteConfirm from "../components/ui/confirm/DeleteConfirm";
import { Dropdown } from "../components/ui/dropdown/Dropdown";
import { DropdownItem } from "../components/ui/dropdown/DropdownItem";
import { MoreDotIcon } from "../icons";

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

export default function Portfolio() {
  const navigate = useNavigate();
  const { type, user } = useAuth();
  const ownerId = useMemo(() => (type === "user" ? user?._id ?? null : null), [type, user]);
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const { isOpen, openModal, closeModal } = useModal(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [previewType, setPreviewType] = useState<"image" | "video" | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<PortfolioItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const MAX_STORAGE_BYTES = 15 * 1024 * 1024 * 1024; // 15GB
  const usedBytes = useMemo(() => {
    return items.reduce((sum, it) => sum + (it.size_bytes || 0) + (it.thumbnail_size_bytes || 0), 0);
  }, [items]);
  const usedPercent = Math.min(100, Math.round((usedBytes / MAX_STORAGE_BYTES) * 100));

  async function load() {
    if (!ownerId) return;
    setLoading(true);
    setErrorMessage("");
    try {
      const params: Record<string, string> = {};
      if (q.trim()) params.q = q.trim();
      if (filterType) params.type = filterType;
      const { data } = await api.get(`/portfolios/user/${ownerId}`, { params });
      setItems(Array.isArray(data) ? data : []);
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
        return "Failed to load portfolio.";
      })();
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId]);

  function openItem(item: PortfolioItem) {
    if (item.type === "image") {
      openPreview(item.media_url, "image");
    } else if (item.type === "video") {
      openPreview(item.media_url, "video");
    } else {
      window.open(item.media_url, "_blank", "noopener,noreferrer");
    }
  }
  function openPreview(url: string, type: "image" | "video") {
    setPreviewUrl(url);
    setPreviewType(type);
    openModal();
  }
  async function copyToClipboard(text: string) {
    try { await navigator.clipboard.writeText(text); } catch {}
  }

  function shareLinks(id: string, _mediaUrl: string) {
    const publicUrl = `${window.location.origin}/p/${id}`;
    if (navigator.share) {
      void navigator.share({ title: "Portfolio Item", url: publicUrl }).catch(() => {});
      setSuccessMessage("Share dialog opened.");
    } else {
      void copyToClipboard(publicUrl);
      setSuccessMessage("Share link copied to clipboard.");
    }
  }

  function openDelete(item: PortfolioItem) {
    setDeleteTarget(item);
    setIsDeleteOpen(true);
  }

  function toggleMenu(id: string) {
    setOpenMenuId((prev) => (prev === id ? null : id));
  }
  function closeMenu() {
    setOpenMenuId(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await api.delete(`/portfolios/${deleteTarget._id}`);
      setItems((prev) => prev.filter((it) => it._id !== deleteTarget._id));
      setIsDeleteOpen(false);
      setDeleteTarget(null);
      setSuccessMessage("Item deleted successfully.");
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
        return "Failed to delete portfolio item.";
      })();
      setErrorMessage(message);
    } finally {
      setDeleteLoading(false);
    }
  }

  function handleEdit(id: string) {
    navigate(`/portfolio/${id}/edit`);
  }

  return (
    <>
      <PageMeta title="Portfolio" description="Manage and share your media" />
      <PageBreadcrumb pageTitle="Portfolio" />

      <div className="space-y-6">
        <ComponentCard title="Your Portfolio" desc="Think of this as your file manager for media">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-2">
              <input
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]"
                placeholder="Search title or description"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <select
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
                <option value="document">Document</option>
              </select>
              <Button size="sm" variant="outline" onClick={() => void load()}>Apply</Button>
            </div>
            <Button size="sm" onClick={() => navigate("/portfolio/new")}>Add Media</Button>
          </div>

          {errorMessage && (
            <div className="mt-3"><Alert variant="error" title="Error" message={errorMessage} /></div>
          )}
          {successMessage && (
            <div className="mt-3"><Alert variant="success" title="Success" message={successMessage} /></div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {loading ? (
              <div className="col-span-full px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">Loading portfolio...</div>
            ) : items.length === 0 ? (
              <div className="col-span-full px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">No items found.</div>
            ) : (
              items.map((item) => (
                <div key={item._id} className="rounded-xl border border-gray-200 p-3 dark:border-gray-800 bg-white dark:bg-white/[0.03]">
                  <div
                    className="aspect-video mb-2 overflow-hidden rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center cursor-pointer"
                    onClick={() => {
                      if (item.type === "image") {
                        openPreview(item.media_url, "image");
                      } else if (item.type === "video") {
                        openPreview(item.media_url, "video");
                      } else {
                        window.open(item.media_url, "_blank", "noopener,noreferrer");
                      }
                  }}
                  >
                    {item.type === "image" && item.thumbnail_url && (
                    
                      <img src={item.thumbnail_url} alt={item.title || "thumbnail"} className="w-full h-full object-cover" />
                    )}
                    {item.type === "image" && !item.thumbnail_url && (
                     
                      <img src={item.media_url} alt={item.title || "media"} className="w-full h-full object-cover" />
                    )}
                    {item.type === "video" && item.thumbnail_url && (
                      <img src={item.thumbnail_url} alt={item.title || "thumbnail"} className="w-full h-full object-cover" />
                    )}
                    {item.type === "video" && !item.thumbnail_url && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">Video</span>
                    )}
                    {item.type === "audio" && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">Audio</span>
                    )}
                    {item.type === "document" && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">Document</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-start justify-between">
                      <div className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">{item.title || "Untitled"}</div>
                      <div className="relative inline-block">
                        <button className="dropdown-toggle" onClick={() => toggleMenu(item._id)} aria-label="More actions">
                          <MoreDotIcon className="size-6 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300" />
                        </button>
                        <Dropdown isOpen={openMenuId === item._id} onClose={closeMenu} className="w-40 p-2">
                          <DropdownItem
                            onClick={() => openItem(item)}
                            onItemClick={closeMenu}
                            className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
                          >
                            Open
                          </DropdownItem>
                          <DropdownItem
                            onClick={() => shareLinks(item._id, item.media_url)}
                            onItemClick={closeMenu}
                            className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
                          >
                            Share
                          </DropdownItem>
                          <DropdownItem
                            onClick={() => handleEdit(item._id)}
                            onItemClick={closeMenu}
                            className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
                          >
                            Edit
                          </DropdownItem>
                          <DropdownItem
                            onClick={() => openDelete(item)}
                            onItemClick={closeMenu}
                            className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
                          >
                            Delete
                          </DropdownItem>
                        </Dropdown>
                      </div>
                    </div>
                    {item.description && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{item.description}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ComponentCard>
      </div>

      {/* Preview Modal */}
      <Modal isOpen={isOpen} onClose={closeModal} isFullscreen={false} className="max-w-4xl w-[95%]">
        <div className="p-4">
          {previewType === "image" && (
            <div className="flex items-center justify-center">
              <img src={previewUrl} alt="Preview" className="max-h-[80vh] max-w-full object-contain" />
            </div>
          )}
          {previewType === "video" && (
            <VideoPlayer src={previewUrl} className="w-full" />
          )}
        </div>
      </Modal>

      {/* Storage Usage */}
      <div className="fixed bottom-6 right-6 pointer-events-none">
        <div className="pointer-events-auto rounded-xl border border-gray-200 bg-white p-4 shadow-theme-lg dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="text-sm font-medium text-gray-800 dark:text-white/90">Storage</div>
          <div className="mt-2 h-2 w-64 rounded bg-gray-200 dark:bg-gray-800">
            <div className="h-2 rounded bg-brand-500" style={{ width: `${usedPercent}%` }} />
          </div>
          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            {`${(usedBytes / (1024*1024*1024)).toFixed(2)} GB used of 15 GB`}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirm
        isOpen={isDeleteOpen}
        onCancel={() => { setIsDeleteOpen(false); setDeleteTarget(null); }}
        onConfirm={confirmDelete}
        loading={deleteLoading}
        title={deleteTarget?.title ? `Delete “${deleteTarget.title}”?` : "Delete Item"}
        description="This will permanently remove this item from your portfolio."
        mediaPreviewUrl={deleteTarget ? (deleteTarget.thumbnail_url || deleteTarget.media_url) : undefined}
      />
    </>
  );
}
