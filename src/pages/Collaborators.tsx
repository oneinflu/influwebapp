/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-empty */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";
import Alert from "../components/ui/alert/Alert";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../components/ui/table";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router";
import PermissionGate from "../components/common/PermissionGate";
import { Modal } from "../components/ui/modal";
import DeleteConfirm from "../components/ui/confirm/DeleteConfirm";
import Label from "../components/form/Label";
import Select from "../components/form/Select";
import Input from "../components/form/input/InputField";
import { InfoIcon, PencilIcon, TrashBinIcon } from "../icons";
import VideoPlayer from "../components/media/VideoPlayer";
import SearchSelect from "../components/form/SearchSelect";
import TagInput from "../components/form/input/TagInput";
import DatePicker from "../components/form/date-picker";
import FileInput from "../components/form/input/FileInput";

interface CollaboratorItem {
  _id: string;
  type: string;
  users: string; // user id
  status?: string;
  notes?: string;
}

type Identity = {
  full_name?: string;
  display_name?: string;
  gender?: string;
  dob?: string;
  age?: number;
  city?: string;
  state?: string;
  languages?: string[];
  bio?: string;
  profile_icon_url?: string;
};
type Contact = {
  phone?: string;
  email?: string;
  whatsapp?: string;
};
type Category = {
  role?: string;
  skills?: string[];
  tools?: string[];
};
type Socials = {
  instagram?: string;
  youtube?: string;
  behance?: string;
  portfolio?: string;
};
type Preferences = {
  work_mode?: string;
  preferred_types?: string[];
  industries?: string[];
};
type Experience = {
  level?: string;
  years?: number;
  previous_brand_work?: string[];
};
type Samples = {
  videos?: string[];
  photos?: string[];
  voice_samples?: string[];
};
interface CollaboratorDoc extends CollaboratorItem {
  managed_by?: string;
  identity?: Identity;
  contact?: Contact;
  category?: Category;
  socials?: Socials;
  preferences?: Preferences;
  experience?: Experience;
  samples?: Samples;
  created_at?: string;
  updated_at?: string;
}

export default function Collaborators() {
  const navigate = useNavigate();
  const { type, user } = useAuth();
  const ownerId = useMemo(() => (type === "user" ? user?._id ?? null : null), [type, user]);
  const [items, setItems] = useState<CollaboratorItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Map of userId -> display label (name or email)
  const [userMap, setUserMap] = useState<Record<string, string>>({});

  // View modal state
  const [viewOpen, setViewOpen] = useState<boolean>(false);
  const [viewItem, setViewItem] = useState<CollaboratorItem | null>(null);
  const [viewDoc, setViewDoc] = useState<CollaboratorDoc | null>(null);
  const [viewLoading, setViewLoading] = useState<boolean>(false);
  const [sampleOpen, setSampleOpen] = useState<boolean>(false);
  const [sampleType, setSampleType] = useState<"video" | "photo" | "audio" | null>(null);
  const [sampleUrl, setSampleUrl] = useState<string>("");

  // Edit modal state
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [editLoading, setEditLoading] = useState<boolean>(false);
  const [editError, setEditError] = useState<string>("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editType, setEditType] = useState<string>("");
  const [editStatus, setEditStatus] = useState<"active" | "inactive" | "">("");
  const [editNotes, setEditNotes] = useState<string>("");
  const [editFullName, setEditFullName] = useState<string>("");
  const [editGender, setEditGender] = useState<string>("");
  const [editDob, setEditDob] = useState<string>("");
  const [editAge, setEditAge] = useState<string>("");
  const [editCity, setEditCity] = useState<string>("");
  const [editStateName, setEditStateName] = useState<string>("");
  const [editLanguages, setEditLanguages] = useState<string[]>([]);
  const [editBio, setEditBio] = useState<string>("");
  const [editProfileIconFile, setEditProfileIconFile] = useState<File | null>(null);
  const [editProfileIconPreview, setEditProfileIconPreview] = useState<string>("");

  const [editPhone, setEditPhone] = useState<string>("");
  const [editEmail, setEditEmail] = useState<string>("");
  const [editWhatsapp, setEditWhatsapp] = useState<string>("");

  const [editSkills, setEditSkills] = useState<string[]>([]);
  const [editTools, setEditTools] = useState<string[]>([]);

  const [editInstagram, setEditInstagram] = useState<string>("");
  const [editYoutube, setEditYoutube] = useState<string>("");
  const [editBehance, setEditBehance] = useState<string>("");
  const [editPortfolio, setEditPortfolio] = useState<string>("");

  const [editWorkMode, setEditWorkMode] = useState<string>("");
  const [editPreferredTypes, setEditPreferredTypes] = useState<string[]>([]);
  const [editIndustries, setEditIndustries] = useState<string[]>([]);

  const [editLevel, setEditLevel] = useState<string>("");
  const [editYears, setEditYears] = useState<string>("");
  const [editPreviousBrands, setEditPreviousBrands] = useState<string[]>([]);

  const [editSampleVideos, setEditSampleVideos] = useState<string[]>([]);
  const [editSamplePhotos, setEditSamplePhotos] = useState<string[]>([]);
  const [editVoiceSamples, setEditVoiceSamples] = useState<string[]>([]);

  // Delete modal state
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    async function fetchCollaborators() {
      if (!ownerId) return;
      setLoading(true);
      setErrorMessage("");
      try {
        const { data } = await api.get("/collaborators", { params: { managed_by: ownerId } });
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
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
          return "Failed to load collaborators.";
        })();
        setErrorMessage(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchCollaborators();
    return () => { cancelled = true; };
  }, [ownerId]);

  // When items update, fetch user display info for missing IDs
  useEffect(() => {
    const ids = Array.from(new Set(items.map((i) => i.users).filter(Boolean)));
    const missing = ids.filter((id) => !userMap[id]);
    if (missing.length === 0) return;
    let cancelled = false;
    async function fetchUsers() {
      try {
        const results = await Promise.all(
          missing.map(async (id) => {
            try {
              const { data } = await api.get(`/users/${id}`);
              const name = data?.registration?.name as string | undefined;
              const email = data?.registration?.email as string | undefined;
              const label = (name && name.trim()) || (email && email.trim()) || id;
              return { id, label };
            } catch {
              return { id, label: id };
            }
          })
        );
        if (!cancelled) {
          setUserMap((prev) => {
            const next = { ...prev };
            results.forEach((r) => { next[r.id] = r.label; });
            return next;
          });
        }
      } catch {
        // ignore batch errors
      }
    }
    fetchUsers();
    return () => { cancelled = true; };
  }, [items]);

  useEffect(() => {
    const id = viewDoc?.managed_by;
    if (!id || userMap[id]) return;
    let cancelled = false;
    async function fetchManager() {
      try {
        const { data } = await api.get(`/users/${id}`);
        const name = data?.registration?.name as string | undefined;
        const email = data?.registration?.email as string | undefined;
        const label = (name && name.trim()) || (email && email.trim()) || String(id);
        if (!cancelled) setUserMap((prev) => ({ ...prev, [String(id)]: label }));
      } catch {
        if (!cancelled) setUserMap((prev) => ({ ...prev, [String(id)]: String(id) }));
      }
    }
    fetchManager();
    return () => { cancelled = true; };
  }, [viewDoc?.managed_by]);

  function openView(item: CollaboratorItem) {
    setViewItem(item);
    setViewOpen(true);
    setViewDoc(null);
    setViewLoading(true);
    void (async () => {
      try {
        const { data } = await api.get(`/collaborators/${item._id}`);
        const doc: CollaboratorDoc = Array.isArray(data) ? (data[0] as CollaboratorDoc) : (data as CollaboratorDoc);
        setViewDoc(doc);
      } catch {
        setViewDoc({ ...item } as CollaboratorDoc);
      } finally {
        setViewLoading(false);
      }
    })();
  }

  function openSample(kind: "video" | "photo" | "audio", url: string) {
    setSampleType(kind);
    setSampleUrl(cleanUrl(url));
    setSampleOpen(true);
  }

  function openEdit(item: CollaboratorItem) {
    setEditId(item._id);
    setEditType(item.type || "");
    setEditStatus((item.status as "active" | "inactive" | undefined) || "");
    setEditNotes(item.notes || "");
    setEditError("");
    setEditOpen(true);
    void (async () => {
      try {
        const { data } = await api.get(`/collaborators/${item._id}`);
        const doc: CollaboratorDoc = Array.isArray(data) ? (data[0] as CollaboratorDoc) : (data as CollaboratorDoc);
        setEditFullName(String(doc.identity?.full_name || doc.identity?.display_name || ""));
        setEditGender(String(doc.identity?.gender || ""));
        setEditDob(String(doc.identity?.dob || ""));
        setEditAge(doc.identity?.age != null ? String(doc.identity?.age) : "");
        setEditCity(String(doc.identity?.city || ""));
        setEditStateName(String(doc.identity?.state || ""));
        setEditLanguages(Array.isArray(doc.identity?.languages) ? doc.identity!.languages! : []);
        setEditBio(String(doc.identity?.bio || ""));
        setEditProfileIconFile(null);
        setEditProfileIconPreview(String(doc.identity?.profile_icon_url || ""));

        setEditPhone(String(doc.contact?.phone || ""));
        setEditEmail(String(doc.contact?.email || ""));
        setEditWhatsapp(String(doc.contact?.whatsapp || ""));

        setEditSkills(Array.isArray(doc.category?.skills) ? doc.category!.skills! : []);
        setEditTools(Array.isArray(doc.category?.tools) ? doc.category!.tools! : []);

        setEditInstagram(String(doc.socials?.instagram || ""));
        setEditYoutube(String(doc.socials?.youtube || ""));
        setEditBehance(String(doc.socials?.behance || ""));
        setEditPortfolio(String(doc.socials?.portfolio || ""));

        setEditWorkMode(String(doc.preferences?.work_mode || ""));
        setEditPreferredTypes(Array.isArray(doc.preferences?.preferred_types) ? doc.preferences!.preferred_types! : []);
        setEditIndustries(Array.isArray(doc.preferences?.industries) ? doc.preferences!.industries! : []);

        setEditLevel(String(doc.experience?.level || ""));
        setEditYears(doc.experience?.years != null ? String(doc.experience?.years) : "");
        setEditPreviousBrands(Array.isArray(doc.experience?.previous_brand_work) ? doc.experience!.previous_brand_work! : []);

        setEditSampleVideos(Array.isArray(doc.samples?.videos) ? doc.samples!.videos! : []);
        setEditSamplePhotos(Array.isArray(doc.samples?.photos) ? doc.samples!.photos! : []);
        setEditVoiceSamples(Array.isArray(doc.samples?.voice_samples) ? doc.samples!.voice_samples! : []);
      } catch {}
    })();
  }

  async function uploadPortfolioFile(userId: string, file: File): Promise<string> {
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

  async function handleEditVideoFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      setEditError("");
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      if (!ownerId) { setEditError("Not authenticated."); return; }
      const urls: string[] = [];
      for (const file of files) {
        const url = await uploadPortfolioFile(String(ownerId), file);
        if (url) urls.push(url);
      }
      if (urls.length) setEditSampleVideos((prev) => [...prev, ...urls]);
    } catch {
      setEditError("Could not upload video files.");
    }
  }

  async function handleEditPhotoFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      setEditError("");
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      if (!ownerId) { setEditError("Not authenticated."); return; }
      const urls: string[] = [];
      for (const file of files) {
        const url = await uploadPortfolioFile(String(ownerId), file);
        if (url) urls.push(url);
      }
      if (urls.length) setEditSamplePhotos((prev) => [...prev, ...urls]);
    } catch {
      setEditError("Could not upload photo files.");
    }
  }

  async function handleEditVoiceFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      setEditError("");
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      if (!ownerId) { setEditError("Not authenticated."); return; }
      const urls: string[] = [];
      for (const file of files) {
        const url = await uploadPortfolioFile(String(ownerId), file);
        if (url) urls.push(url);
      }
      if (urls.length) setEditVoiceSamples((prev) => [...prev, ...urls]);
    } catch {
      setEditError("Could not upload audio files.");
    }
  }
  async function saveEdit() {
    if (!editId) return;
    setEditLoading(true);
    setEditError("");
    try {
      let profileIconFinalUrl: string | undefined = undefined;
      if (editProfileIconFile && ownerId) {
        try {
          profileIconFinalUrl = await uploadPortfolioFile(String(ownerId), editProfileIconFile);
        } catch {}
      } else if (editProfileIconPreview) {
        profileIconFinalUrl = cleanUrl(editProfileIconPreview);
      }

      const identityRaw: Identity = {
        full_name: editFullName || undefined,
        display_name: editFullName || undefined,
        gender: editGender || undefined,
        dob: editDob || undefined,
        age: editAge ? Number(editAge) : undefined,
        city: editCity || undefined,
        state: editStateName || undefined,
        languages: editLanguages,
        bio: editBio || undefined,
        profile_icon_url: profileIconFinalUrl,
      };
      const contactRaw: Contact = {
        phone: editPhone || undefined,
        email: editEmail ? editEmail.toLowerCase() : undefined,
        whatsapp: editWhatsapp || undefined,
      };
      const categoryRaw: Category = {
        role: editType || undefined,
        skills: editSkills,
        tools: editTools,
      };
      const socialsRaw: Socials = {
        instagram: cleanUrl(editInstagram || ""),
        youtube: cleanUrl(editYoutube || ""),
        behance: cleanUrl(editBehance || ""),
        portfolio: cleanUrl(editPortfolio || ""),
      };
      const preferencesRaw: Preferences = {
        work_mode: editWorkMode || undefined,
        preferred_types: editPreferredTypes,
        industries: editIndustries,
      };
      const experienceRaw: Experience = {
        level: editLevel || undefined,
        years: editYears ? Number(editYears) : undefined,
        previous_brand_work: editPreviousBrands,
      };
      const samplesRaw: Samples = {
        videos: editSampleVideos.map((u) => cleanUrl(u)).filter((u) => u),
        photos: editSamplePhotos.map((u) => cleanUrl(u)).filter((u) => u),
        voice_samples: editVoiceSamples.map((u) => cleanUrl(u)).filter((u) => u),
      };

      const pruneObject = (obj: Record<string, unknown>): Record<string, unknown> => {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(obj)) {
          if (v === undefined || v === null) continue;
          if (typeof v === "string" && v.trim() === "") continue;
          if (Array.isArray(v) && v.length === 0) continue;
          out[k] = v;
        }
        return out;
      };

      const payload: Partial<CollaboratorDoc> = {
        type: editType || undefined,
        status: editStatus || undefined,
        notes: editNotes.trim() || undefined,
        identity: pruneObject(identityRaw as Record<string, unknown>) as Identity,
        contact: pruneObject(contactRaw as Record<string, unknown>) as Contact,
        category: pruneObject(categoryRaw as Record<string, unknown>) as Category,
        socials: pruneObject(socialsRaw as Record<string, unknown>) as Socials,
        preferences: pruneObject(preferencesRaw as Record<string, unknown>) as Preferences,
        experience: pruneObject(experienceRaw as Record<string, unknown>) as Experience,
        samples: pruneObject(samplesRaw as Record<string, unknown>) as Samples,
      };
      const { data } = await api.put(`/collaborators/${editId}`, payload);
      const updated: CollaboratorDoc = Array.isArray(data) ? (data[0] as CollaboratorDoc) : (data as CollaboratorDoc);
      setItems((prev) => prev.map((it) => (it._id === editId ? { ...it, ...updated } : it)));
      if (viewOpen && viewItem?._id === editId) {
        setViewDoc(updated);
        setViewItem((prev) => (prev ? {
          ...prev,
          type: updated.type ?? prev.type,
          status: (updated.status as string | undefined) ?? prev.status,
          notes: updated.notes ?? prev.notes,
        } : prev));
      }
      setEditOpen(false);
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
        return "Failed to update collaborator.";
      })();
      setEditError(message);
    } finally {
      setEditLoading(false);
    }
  }

  function openDelete(id: string) {
    setDeleteId(id);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/collaborators/${deleteId}`);
      setItems((prev) => prev.filter((it) => it._id !== deleteId));
      setDeleteOpen(false);
    } catch (err) {
      // surface error in alert area
      const message = ((): string => {
        if (err && typeof err === "object") {
          const anyErr = err as { response?: { data?: unknown } };
          const respData = anyErr.response?.data;
          if (respData && typeof respData === "object" && "error" in respData) {
            const msg = (respData as { error?: unknown }).error;
            if (typeof msg === "string" && msg.trim().length > 0) return msg;
          }
        }
        return "Failed to delete collaborator.";
      })();
      setErrorMessage(message);
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <>
      <PageMeta title="Collaborators" description="Manage collaborators linked to your account" />
      <PageBreadcrumb pageTitle="Collaborators" />
      <PermissionGate group="collaborators">
      <div className="space-y-6">
        <ComponentCard title="Collaborators">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">Collaborators managed by your account.</p>
            <Button size="sm" onClick={() => navigate("/collaborators/new")}>Add Collaborator</Button>
          </div>

          {errorMessage && (
            <Alert variant="error" title="Error" message={errorMessage} />
          )}

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Name</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Type</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">City</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Phone</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Email</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Instagram</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {loading ? (
                    <TableRow>
                      <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">Loading collaborators...</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">No collaborators found.</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                    </TableRow>
                  ) : (
                    items.map((c) => (
                      <TableRow key={c._id}>
                        <TableCell className="px-5 py-4 sm:px-6 text-start">
                          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">{(c as any)?.identity?.display_name || (c as any)?.identity?.full_name || userMap[c.users] || "—"}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-700 text-start text-theme-sm dark:text-gray-300">{c.type}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{(c.status || "active").replace(/_/g, " ")}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{(c as any)?.identity?.city || "—"}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{(c as any)?.contact?.phone || "—"}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{(c as any)?.contact?.email || "—"}</TableCell>
                        <TableCell className="px-4 py-3 text-start text-theme-sm">
                          {cleanUrl((c as any)?.socials?.instagram || "") ? (
                            <a href={cleanUrl((c as any)?.socials?.instagram || "")} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">Instagram</a>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-start">
                          <div className="flex items-center gap-2">
                            <button
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
                              title="View"
                              onClick={() => openView(c)}
                            >
                              <InfoIcon className="h-4 w-4" />
                            </button>
                            <button
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
                              title="Edit"
                              onClick={() => openEdit(c)}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-error-600 hover:bg-error-50 dark:border-white/10 dark:text-error-400/80 dark:hover:bg-error-500/10"
                              title="Delete"
                              onClick={() => openDelete(c._id)}
                            >
                              <TrashBinIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </ComponentCard>
      </div>
      </PermissionGate>

      {/* View Modal */}
      <Modal isOpen={viewOpen} onClose={() => setViewOpen(false)} className="max-w-[900px] my-8 mx-4">
        {viewItem && (
          <div className="relative w-full max-w-[900px] max-h-[80vh] overflow-y-auto custom-scrollbar rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-10">
            <div className="flex items-start justify-between">
              <div className="px-2 pr-10">
                <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">Collaborator</h4>
                <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">Profile overview and samples</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5" title="Edit" onClick={() => viewDoc ? openEdit(viewDoc) : openEdit(viewItem)}>
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 text-error-600 hover:bg-error-50 dark:border-white/10 dark:text-error-400/80 dark:hover:bg-error-500/10" title="Delete" onClick={() => openDelete(viewItem._id)}>
                  <TrashBinIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {viewLoading ? (
              <p className="px-2 text-theme-sm text-gray-600 dark:text-gray-300">Loading...</p>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="md:col-span-1 space-y-4">
                  <div className="rounded-xl border border-gray-200 p-4 dark:border-white/[0.06]">
                    <div className="flex items-start gap-4">
                      <div className="h-16 w-16 rounded-full overflow-hidden bg-gray-100 dark:bg-white/[0.06]">
                        {cleanUrl(viewDoc?.identity?.profile_icon_url || "") ? (
                          <img src={cleanUrl(viewDoc?.identity?.profile_icon_url || "")} alt="Avatar" className="h-16 w-16 object-cover" />
                        ) : (
                          <div className="h-full w-full" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white/90">{viewDoc?.identity?.display_name || viewDoc?.identity?.full_name || userMap[viewItem.users] || viewItem.users}</div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-theme-xs text-gray-600 dark:bg-white/[0.06] dark:text-gray-300">{(viewDoc?.type || viewItem.type || "").toString()}</span>
                          <span className="inline-flex items-center rounded-md bg-brand-50 px-2 py-0.5 text-theme-xs text-brand-700 dark:bg-brand-900/20 dark:text-brand-200">{(viewDoc?.status || viewItem.status || "active").replace(/_/g, " ")}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-theme-xs text-gray-500 dark:text-gray-400">User</span>
                        <span className="text-theme-sm text-gray-800 dark:text-white/90">{userMap[viewItem.users] || viewItem.users}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-theme-xs text-gray-500 dark:text-gray-400">Managed by</span>
                        <span className="text-theme-sm text-gray-800 dark:text-white/90">{(viewDoc?.managed_by && userMap[String(viewDoc.managed_by)]) || "—"}</span>
                      </div>
                      {cleanUrl(viewDoc?.socials?.instagram || "") && (
                        <a href={cleanUrl(viewDoc?.socials?.instagram || "")} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-theme-xs text-gray-700 hover:bg-gray-200 dark:bg-white/[0.06] dark:text-gray-300">Instagram</a>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 p-4 dark:border-white/[0.06]">
                    <h5 className="mb-2 text-theme-sm font-semibold text-gray-700 dark:text-white/80">Contact</h5>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-theme-xs text-gray-500 dark:text-gray-400">Phone</span>
                        <span className="text-theme-sm text-gray-800 dark:text-white/90">{viewDoc?.contact?.phone || ""}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-theme-xs text-gray-500 dark:text-gray-400">Email</span>
                        <span className="text-theme-sm text-gray-800 dark:text-white/90">{viewDoc?.contact?.email || ""}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-theme-xs text-gray-500 dark:text-gray-400">WhatsApp</span>
                        <span className="text-theme-sm text-gray-800 dark:text-white/90">{viewDoc?.contact?.whatsapp || ""}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-6">
                  <div className="rounded-xl border border-gray-200 p-4 dark:border-white/[0.06]">
                    <h5 className="mb-3 text-theme-sm font-semibold text-gray-700 dark:text-white/80">Identity</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <Label>Gender</Label>
                        <p className="text-theme-sm text-gray-800 dark:text-white/90">{viewDoc?.identity?.gender || "—"}</p>
                      </div>
                      <div>
                        <Label>Date of Birth</Label>
                        <p className="text-theme-sm text-gray-800 dark:text-white/90">{formatDate(viewDoc?.identity?.dob)}</p>
                      </div>
                      <div>
                        <Label>Age</Label>
                        <p className="text-theme-sm text-gray-800 dark:text-white/90">{typeof viewDoc?.identity?.age === "number" ? String(viewDoc?.identity?.age) : "—"}</p>
                      </div>
                      <div>
                        <Label>City</Label>
                        <p className="text-theme-sm text-gray-800 dark:text-white/90">{viewDoc?.identity?.city || "—"}</p>
                      </div>
                      <div>
                        <Label>State</Label>
                        <p className="text-theme-sm text-gray-800 dark:text-white/90">{viewDoc?.identity?.state || "—"}</p>
                      </div>
                      <div>
                        <Label>Languages</Label>
                        <div className="flex flex-wrap gap-2">
                          {(Array.isArray(viewDoc?.identity?.languages) ? viewDoc?.identity?.languages : [])?.map((l, i) => (
                            <span key={`${l}-${i}`} className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-theme-xs text-gray-700 dark:bg-white/[0.06] dark:text-gray-300">{l}</span>
                          ))}
                          {!Array.isArray(viewDoc?.identity?.languages) || (viewDoc?.identity?.languages || []).length === 0 ? (
                            <span className="text-theme-sm text-gray-800 dark:text-white/90">—</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="sm:col-span-3">
                        <Label>Bio</Label>
                        <p className="text-theme-sm text-gray-800 dark:text-white/90">{viewDoc?.identity?.bio || "—"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 p-4 dark:border-white/[0.06]">
                    <h5 className="mb-3 text-theme-sm font-semibold text-gray-700 dark:text-white/80">Category</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <Label>Role</Label>
                        <p className="text-theme-sm text-gray-800 dark:text-white/90">{viewDoc?.category?.role || viewDoc?.type || "—"}</p>
                      </div>
                      <div>
                        <Label>Skills</Label>
                        <div className="flex flex-wrap gap-2">
                          {(Array.isArray(viewDoc?.category?.skills) ? viewDoc?.category?.skills : [])?.map((l, i) => (
                            <span key={`${l}-${i}`} className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-theme-xs text-gray-700 dark:bg-white/[0.06] dark:text-gray-300">{l}</span>
                          ))}
                          {!Array.isArray(viewDoc?.category?.skills) || (viewDoc?.category?.skills || []).length === 0 ? (
                            <span className="text-theme-sm text-gray-800 dark:text-white/90">—</span>
                          ) : null}
                        </div>
                      </div>
                      <div>
                        <Label>Tools</Label>
                        <div className="flex flex-wrap gap-2">
                          {(Array.isArray(viewDoc?.category?.tools) ? viewDoc?.category?.tools : [])?.map((l, i) => (
                            <span key={`${l}-${i}`} className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-theme-xs text-gray-700 dark:bg-white/[0.06] dark:text-gray-300">{l}</span>
                          ))}
                          {!Array.isArray(viewDoc?.category?.tools) || (viewDoc?.category?.tools || []).length === 0 ? (
                            <span className="text-theme-sm text-gray-800 dark:text-white/90">—</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 p-4 dark:border-white/[0.06]">
                    <h5 className="mb-3 text-theme-sm font-semibold text-gray-700 dark:text-white/80">Preferences</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <Label>Work Mode</Label>
                        <p className="text-theme-sm text-gray-800 dark:text-white/90">{viewDoc?.preferences?.work_mode || "—"}</p>
                      </div>
                      <div>
                        <Label>Preferred Types</Label>
                        <div className="flex flex-wrap gap-2">
                          {(Array.isArray(viewDoc?.preferences?.preferred_types) ? viewDoc?.preferences?.preferred_types : [])?.map((l, i) => (
                            <span key={`${l}-${i}`} className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-theme-xs text-gray-700 dark:bg-white/[0.06] dark:text-gray-300">{l}</span>
                          ))}
                          {!Array.isArray(viewDoc?.preferences?.preferred_types) || (viewDoc?.preferences?.preferred_types || []).length === 0 ? (
                            <span className="text-theme-sm text-gray-800 dark:text-white/90">—</span>
                          ) : null}
                        </div>
                      </div>
                      <div>
                        <Label>Industries</Label>
                        <div className="flex flex-wrap gap-2">
                          {(Array.isArray(viewDoc?.preferences?.industries) ? viewDoc?.preferences?.industries : [])?.map((l, i) => (
                            <span key={`${l}-${i}`} className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-theme-xs text-gray-700 dark:bg-white/[0.06] dark:text-gray-300">{l}</span>
                          ))}
                          {!Array.isArray(viewDoc?.preferences?.industries) || (viewDoc?.preferences?.industries || []).length === 0 ? (
                            <span className="text-theme-sm text-gray-800 dark:text-white/90">—</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 p-4 dark:border-white/[0.06]">
                    <h5 className="mb-3 text-theme-sm font-semibold text-gray-700 dark:text-white/80">Experience</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <Label>Level</Label>
                        <p className="text-theme-sm text-gray-800 dark:text-white/90">{viewDoc?.experience?.level || "—"}</p>
                      </div>
                      <div>
                        <Label>Years</Label>
                        <p className="text-theme-sm text-gray-800 dark:text-white/90">{typeof viewDoc?.experience?.years === "number" ? String(viewDoc?.experience?.years) : "—"}</p>
                      </div>
                      <div>
                        <Label>Previous Brands</Label>
                        <div className="flex flex-wrap gap-2">
                          {(Array.isArray(viewDoc?.experience?.previous_brand_work) ? viewDoc?.experience?.previous_brand_work : [])?.map((l, i) => (
                            <span key={`${l}-${i}`} className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-theme-xs text-gray-700 dark:bg-white/[0.06] dark:text-gray-300">{l}</span>
                          ))}
                          {!Array.isArray(viewDoc?.experience?.previous_brand_work) || (viewDoc?.experience?.previous_brand_work || []).length === 0 ? (
                            <span className="text-theme-sm text-gray-800 dark:text-white/90">—</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 p-4 dark:border-white/[0.06]">
                    <h5 className="mb-3 text-theme-sm font-semibold text-gray-700 dark:text-white/80">Samples</h5>
                    <div className="space-y-3">
                      {Array.isArray(viewDoc?.samples?.videos) && viewDoc?.samples?.videos?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {viewDoc?.samples?.videos?.map((v, idx) => (
                            <button key={`${v}-${idx}`} type="button" onClick={() => openSample("video", v)} className="inline-flex items-center rounded-md border border-gray-200 px-3 py-1.5 text-theme-xs text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5">
                              Video {idx + 1}
                            </button>
                          ))}
                        </div>
                      ) : null}
                      {Array.isArray(viewDoc?.samples?.photos) && viewDoc?.samples?.photos?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {viewDoc?.samples?.photos?.map((p, idx) => (
                            <button key={`${p}-${idx}`} type="button" onClick={() => openSample("photo", p)} className="inline-flex items-center rounded-md border border-gray-200 px-3 py-1.5 text-theme-xs text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5">
                              Photo {idx + 1}
                            </button>
                          ))}
                        </div>
                      ) : null}
                      {Array.isArray(viewDoc?.samples?.voice_samples) && viewDoc?.samples?.voice_samples?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {viewDoc?.samples?.voice_samples?.map((a, idx) => (
                            <button key={`${a}-${idx}`} type="button" onClick={() => openSample("audio", a)} className="inline-flex items-center rounded-md border border-gray-200 px-3 py-1.5 text-theme-xs text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5">
                              Audio {idx + 1}
                            </button>
                          ))}
                        </div>
                      ) : null}
                      {!Array.isArray(viewDoc?.samples?.videos) && !Array.isArray(viewDoc?.samples?.photos) && !Array.isArray(viewDoc?.samples?.voice_samples) ? (
                        <p className="text-theme-sm text-gray-800 dark:text-white/90">No samples</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-gray-200 p-4 dark:border-white/[0.06]">
                      <Label>Created</Label>
                      <p className="text-theme-sm text-gray-800 dark:text-white/90">{formatDate(viewDoc?.created_at)}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-4 dark:border-white/[0.06]">
                      <Label>Updated</Label>
                      <p className="text-theme-sm text-gray-800 dark:text-white/90">{formatDate(viewDoc?.updated_at)}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 p-4 dark:border-white/[0.06]">
                    <Label>Notes</Label>
                    <p className="text-theme-sm text-gray-800 dark:text-white/90">{viewDoc?.notes || viewItem.notes || "—"}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={sampleOpen} onClose={() => setSampleOpen(false)} className="max-w-[800px] my-8 mx-4">
        <div className="relative w-full max-w-[800px] max-h-[80vh] overflow-y-auto custom-scrollbar rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-10">
          <div className="px-2 pr-10">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">Sample</h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">{sampleType === "video" ? "Video" : sampleType === "photo" ? "Photo" : sampleType === "audio" ? "Audio" : ""}</p>
          </div>
          {sampleType === "video" && sampleUrl ? (
            <VideoPlayer src={sampleUrl} className="rounded-lg overflow-hidden" />
          ) : sampleType === "photo" && sampleUrl ? (
            <img src={sampleUrl} alt="Sample" className="w-full rounded-lg object-contain" />
          ) : sampleType === "audio" && sampleUrl ? (
            <audio src={sampleUrl} controls controlsList="nodownload noplaybackrate" className="w-full" />
          ) : null}
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} className="max-w-[900px] my-8 mx-4">
        <div className="relative w-full max-w-[900px] max-h-[80vh] overflow-y-auto custom-scrollbar rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-10">
          <div className="px-2 pr-10">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">Edit Collaborator</h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">Update collaborator details</p>
          </div>
          {editError && <Alert variant="error" title="Error" message={editError} />}
          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); void saveEdit(); }}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Type</Label>
                <Select options={TYPES.map((t) => ({ value: t, label: t }))} defaultValue={editType} onChange={(v) => setEditType(String(v))} />
              </div>
              <div>
                <Label>Status</Label>
                <Select options={[{ value: "active", label: "active" }, { value: "inactive", label: "inactive" }]} defaultValue={editStatus || "active"} onChange={(v) => setEditStatus(v === "active" || v === "inactive" ? v : "")} />
              </div>
              <div className="sm:col-span-2">
                <Label>Notes</Label>
                <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Notes" />
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4 dark:border-white/[0.06]">
              <h5 className="mb-2 text-theme-sm font-semibold text-gray-700 dark:text-white/80">Identity</h5>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label>Full Name</Label>
                  <Input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} placeholder="Full Name" />
                </div>
                <div>
                  <Label>Gender</Label>
                  <SearchSelect options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "non-binary", label: "Non-binary" }, { value: "prefer_not_to_say", label: "Prefer not to say" }, { value: "other", label: "Other" }]} defaultValue={editGender} onChange={(v) => setEditGender(String(v))} />
                </div>
                <div>
                  <DatePicker id="edit-dob" label="Date of Birth" defaultDate={editDob || undefined} placeholder="YYYY-MM-DD" onChange={(_, s) => setEditDob(typeof s === "string" ? s : "")} />
                </div>
                <div>
                  <Label>Age</Label>
                  <Input value={editAge} onChange={(e) => setEditAge(e.target.value)} placeholder="Age" />
                </div>
                <div>
                  <Label>City</Label>
                  <Input value={editCity} onChange={(e) => setEditCity(e.target.value)} placeholder="City" />
                </div>
                <div>
                  <Label>State</Label>
                  <Input value={editStateName} onChange={(e) => setEditStateName(e.target.value)} placeholder="State" />
                </div>
                <div className="sm:col-span-2">
                  <Label>Languages</Label>
                  <TagInput values={editLanguages} onChange={setEditLanguages} placeholder="Type a language, press Enter or ," />
                </div>
                <div className="sm:col-span-2">
                  <Label>Bio</Label>
                  <Input value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="Bio" />
                </div>
                <div>
                  <Label>Profile Icon</Label>
                  <FileInput onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setEditProfileIconFile(f);
                    if (f) setEditProfileIconPreview(URL.createObjectURL(f));
                  }} />
                  {editProfileIconPreview && (
                    <img src={editProfileIconPreview} alt="Profile preview" className="mt-2 h-16 w-16 rounded-full object-cover" />
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4 dark:border-white/[0.06]">
              <h5 className="mb-2 text-theme-sm font-semibold text-gray-700 dark:text-white/80">Contact</h5>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <Label>Phone</Label>
                  <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Phone" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email" />
                </div>
                <div>
                  <Label>WhatsApp</Label>
                  <Input value={editWhatsapp} onChange={(e) => setEditWhatsapp(e.target.value)} placeholder="WhatsApp" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4 dark:border-white/[0.06]">
              <h5 className="mb-2 text-theme-sm font-semibold text-gray-700 dark:text-white/80">Category</h5>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label>Skills</Label>
                  <TagInput values={editSkills} onChange={setEditSkills} placeholder="Type a skill, press Enter or ," />
                </div>
                <div>
                  <Label>Tools</Label>
                  <TagInput values={editTools} onChange={setEditTools} placeholder="Type a tool, press Enter or ," />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4 dark:border-white/[0.06]">
              <h5 className="mb-2 text-theme-sm font-semibold text-gray-700 dark:text-white/80">Socials</h5>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label>Instagram</Label>
                  <Input value={editInstagram} onChange={(e) => setEditInstagram(e.target.value)} placeholder="https://instagram.com/..." />
                </div>
                <div>
                  <Label>Youtube</Label>
                  <Input value={editYoutube} onChange={(e) => setEditYoutube(e.target.value)} placeholder="https://youtube.com/..." />
                </div>
                <div>
                  <Label>Behance</Label>
                  <Input value={editBehance} onChange={(e) => setEditBehance(e.target.value)} placeholder="https://behance.net/..." />
                </div>
                <div>
                  <Label>Portfolio</Label>
                  <Input value={editPortfolio} onChange={(e) => setEditPortfolio(e.target.value)} placeholder="https://..." />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4 dark:border-white/[0.06]">
              <h5 className="mb-2 text-theme-sm font-semibold text-gray-700 dark:text-white/80">Preferences</h5>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <Label>Work Mode</Label>
                  <Input value={editWorkMode} onChange={(e) => setEditWorkMode(e.target.value)} placeholder="remote / onsite / hybrid" />
                </div>
                <div>
                  <Label>Preferred Types</Label>
                  <TagInput values={editPreferredTypes} onChange={setEditPreferredTypes} placeholder="Type a preference, press Enter or ," />
                </div>
                <div>
                  <Label>Industries</Label>
                  <TagInput values={editIndustries} onChange={setEditIndustries} placeholder="Type an industry, press Enter or ," />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4 dark:border-white/[0.06]">
              <h5 className="mb-2 text-theme-sm font-semibold text-gray-700 dark:text-white/80">Experience</h5>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <Label>Level</Label>
                  <Input value={editLevel} onChange={(e) => setEditLevel(e.target.value)} placeholder="beginner / intermediate / expert" />
                </div>
                <div>
                  <Label>Years</Label>
                  <Input value={editYears} onChange={(e) => setEditYears(e.target.value)} placeholder="Years" />
                </div>
                <div>
                  <Label>Previous Brands</Label>
                  <TagInput values={editPreviousBrands} onChange={setEditPreviousBrands} placeholder="Type a brand, press Enter or ," />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4 dark:border-white/[0.06]">
              <h5 className="mb-2 text-theme-sm font-semibold text-gray-700 dark:text-white/80">Samples</h5>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Upload Videos</Label>
                  <FileInput multiple accept="video/*" onChange={handleEditVideoFilesChange} />
                  <TagInput values={editSampleVideos} onChange={setEditSampleVideos} placeholder="Paste URLs, press Enter or ," />
                </div>
                <div className="space-y-2">
                  <Label>Upload Photos</Label>
                  <FileInput multiple accept="image/*" onChange={handleEditPhotoFilesChange} />
                  <TagInput values={editSamplePhotos} onChange={setEditSamplePhotos} placeholder="Paste URLs, press Enter or ," />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label>Upload Voice Samples</Label>
                  <FileInput multiple accept="audio/*" onChange={handleEditVoiceFilesChange} />
                  <TagInput values={editVoiceSamples} onChange={setEditVoiceSamples} placeholder="Paste URLs, press Enter or ," />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button size="sm" disabled={editLoading || !editId || !editType}>{editLoading ? "Saving..." : "Save Changes"}</Button>
              <Button size="sm" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <DeleteConfirm
        isOpen={deleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => { void confirmDelete(); }}
        loading={deleteLoading}
        title="Delete Collaborator"
        description="Are you sure you want to delete this collaborator? This action cannot be undone."
      />
    </>
  );
}

function cleanUrl(input: string): string {
  const s = String(input || "").trim();
  return s.replace(/^`+|`+$/g, "").replace(/^"+|"+$/g, "").replace(/^'+|'+$/g, "").trim();
}
function formatDate(input?: string): string {
  const s = String(input || "").trim();
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}
