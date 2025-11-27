import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import Button from "../components/ui/button/Button";
import Alert from "../components/ui/alert/Alert";
import PermissionGate from "../components/common/PermissionGate";

type StatType = 'clients' | 'team_members' | 'projects' | 'years_in_business' | 'avg_rating';
type StatsItem = { type: StatType; value: number };
type SocialHandle = { platform?: string; url?: string };

// Minimal shapes for typed API responses
interface UserResponse {
  _id?: string;
  profile?: {
    slug?: string;
    shortBio?: string;
    socialHandles?: SocialHandle[];
  };
  registration?: {
    avatar?: string;
  };
}

interface PublicProfileDoc {
  _id?: string;
  user_id?: string;
  cover_photo?: string;
  bio?: string;
  stats?: unknown[];
  published_services?: string[];
  published_projects?: string[];
}

function getUserSlug(u: unknown): string {
  if (!u || typeof u !== "object") return "";
  const profile = (u as Record<string, unknown>).profile as unknown;
  if (!profile || typeof profile !== "object") return "";
  const slug = (profile as Record<string, unknown>).slug as unknown;
  return typeof slug === "string" ? slug : "";
}

export default function PublicProfileEdit() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [slug, setSlug] = useState<string>("");
  const [slugStatus, setSlugStatus] = useState<"idle"|"checking"|"available"|"taken"|"error">("idle");
  const [slugValid, setSlugValid] = useState<boolean>(true);
  const [slugReason, setSlugReason] = useState<string>("");
  const slugTimer = useRef<number | null>(null);

  const [shortBio, setShortBio] = useState<string>("");
  const [coverPhoto, setCoverPhoto] = useState<string>("");
  const [avatar, setAvatar] = useState<string>("");
  const [stats, setStats] = useState<StatsItem[]>([]);
  const [socialHandles, setSocialHandles] = useState<SocialHandle[]>([]);
  const [services, setServices] = useState<Array<{ _id: string; name?: string }>>([]);
  const [projects, setProjects] = useState<Array<{ _id: string; name?: string }>>([]);
  const [publishedServices, setPublishedServices] = useState<string[]>([]);
  const [publishedProjects, setPublishedProjects] = useState<string[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const userId = useMemo(() => user?._id ? String(user._id) : "", [user]);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      if (!userId) return;
      setLoading(true);
      setApiError("");
      setSuccess("");
      try {
        const u = await api.get<UserResponse>(`/users/${userId}`).then(r => r.data);
        const initialSlug = u?.profile?.slug || "";
        setSlug(initialSlug);
        setShortBio(u?.profile?.shortBio || "");
        setAvatar(u?.registration?.avatar || "");
        const handles = Array.isArray(u?.profile?.socialHandles) ? (u.profile?.socialHandles as SocialHandle[]) : [];
        setSocialHandles(handles);

        const p = await api
          .get<PublicProfileDoc[]>("/public-profiles", { params: { user_id: userId } })
          .then(r => r.data);
        const current = Array.isArray(p) && p.length > 0 ? p[0] : null;
        setCoverPhoto(current?.cover_photo || "");
        // Normalize server stats (object with known fields) into typed items for UI
        const serverStatsArr = Array.isArray(current?.stats) ? (current!.stats as unknown[]) : [];
        const s = (serverStatsArr && serverStatsArr.length > 0 ? serverStatsArr[0] as { clients?: number; team_members?: number; projects?: number; years_in_business?: string; avg_rating?: number } : null);
        const normalized: StatsItem[] = [];
        if (s) {
          if (typeof s.clients === 'number' && s.clients > 0) normalized.push({ type: 'clients', value: s.clients });
          if (typeof s.team_members === 'number' && s.team_members > 0) normalized.push({ type: 'team_members', value: s.team_members });
          if (typeof s.projects === 'number' && s.projects > 0) normalized.push({ type: 'projects', value: s.projects });
          if (typeof s.avg_rating === 'number' && s.avg_rating > 0) normalized.push({ type: 'avg_rating', value: s.avg_rating });
          if (typeof s.years_in_business === 'string' && s.years_in_business.trim()) {
            const yrs = parseInt(s.years_in_business.trim(), 10);
            if (!Number.isNaN(yrs) && yrs > 0) normalized.push({ type: 'years_in_business', value: yrs });
          }
        }
        setStats(normalized);
        setPublishedServices(Array.isArray(current?.published_services) ? current!.published_services! : []);
        setPublishedProjects(Array.isArray(current?.published_projects) ? current!.published_projects! : []);

        // Fetch active services and projects for selection
        const [svcList, projList] = await Promise.all([
          api.get<Array<{ _id: string; name?: string }>>('/services', { params: { user_id: userId, status: 'active' } }).then(r => r.data),
          api.get<Array<{ _id: string; name?: string }>>('/projects', { params: { user_id: userId, status: 'completed' } }).then(r => r.data),
        ]);
        setServices(Array.isArray(svcList) ? svcList : []);
        setProjects(Array.isArray(projList) ? projList : []);
      } catch (err) {
        const msg = ((): string => {
          if (err && typeof err === 'object') {
            const anyErr = err as { response?: { data?: unknown } };
            const respData = anyErr.response?.data;
            if (respData && typeof respData === 'object' && 'error' in respData) {
              const emsg = (respData as { error?: unknown }).error;
              if (typeof emsg === 'string' && emsg.trim()) return emsg;
            }
          }
          return 'Failed to load profile data.';
        })();
        if (!cancelled) setApiError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void hydrate();
    return () => { cancelled = true; };
  }, [userId]);

  // Real-time slug availability check
  useEffect(() => {
    if (slugTimer.current) window.clearTimeout(slugTimer.current);
    const value = slug.trim().toLowerCase();
    if (!value) { setSlugStatus("idle"); setSlugValid(false); setSlugReason("Slug is required"); return; }
    setSlugStatus("checking");
    slugTimer.current = window.setTimeout(async () => {
      try {
        const { data } = await api.get('/users/slug-available', { params: { slug: value } });
        const available = !!data?.available;
        const valid = data?.valid !== false;
        setSlugValid(valid);
        setSlugReason(valid ? "" : (data?.reason || "Invalid slug"));
        // If the slug matches the current user's slug, treat as available
        const current = getUserSlug(user);
        const isSame = current ? current.toLowerCase() === value : false;
        setSlugStatus(valid ? ((available || isSame) ? "available" : "taken") : "error");
      } catch {
        setSlugStatus("error");
        setSlugValid(false);
        setSlugReason("Unable to check availability");
      }
    }, 400);
  }, [slug, user]);

  function updateStat(index: number, next: Partial<StatsItem>) {
    setStats((prev) => {
      const arr = [...prev];
      arr[index] = { ...arr[index], ...next } as StatsItem;
      return arr;
    });
  }
  const STAT_OPTIONS: { type: StatType; label: string }[] = [
    { type: 'clients', label: 'Clients' },
    { type: 'team_members', label: 'Team Members' },
    { type: 'projects', label: 'Projects' },
    { type: 'years_in_business', label: 'Years in Business' },
    { type: 'avg_rating', label: 'Avg. Rating' },
  ];
  function addStat() {
    setStats((prev) => {
      const used = new Set(prev.map(p => p.type));
      const nextType = STAT_OPTIONS.find(o => !used.has(o.type))?.type || 'clients';
      return [...prev, { type: nextType, value: 0 }];
    });
  }
  function removeStat(index: number) {
    setStats((prev) => prev.filter((_, i) => i !== index));
  }
  function updateHandle(index: number, next: Partial<SocialHandle>) {
    setSocialHandles((prev) => {
      const arr = [...prev];
      arr[index] = { ...arr[index], ...next } as SocialHandle;
      return arr;
    });
  }
  function addHandle() {
    setSocialHandles((prev) => [...prev, { platform: "", url: "" }]);
  }
  function removeHandle(index: number) {
    setSocialHandles((prev) => prev.filter((_, i) => i !== index));
  }

  // Upload avatar helper
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  async function requestAvatarUpload() {
    avatarInputRef.current?.click();
  }
  async function handleAvatarSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const form = new FormData();
      form.append('avatar', file);
      const { data } = await api.put<{ avatar?: string }>(`/users/me/avatar`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (data?.avatar) setAvatar(data.avatar);
    } catch (err) {
      const msg = ((): string => {
        if (err && typeof err === 'object') {
          const anyErr = err as { response?: { data?: unknown }, message?: string };
          const respData = anyErr.response?.data;
          if (respData && typeof respData === 'object' && 'error' in respData) {
            const emsg = (respData as { error?: unknown }).error;
            if (typeof emsg === 'string' && emsg.trim()) return emsg;
          }
          if (typeof anyErr.message === 'string') return anyErr.message;
        }
        return 'Failed to upload avatar.';
      })();
      setApiError(msg);
    } finally {
      // reset input value to allow re-selecting same file
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  }

  // Upload cover helper
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  async function requestCoverUpload() {
    coverInputRef.current?.click();
  }
  async function handleCoverSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const form = new FormData();
      form.append('cover', file);
      const { data } = await api.put<{ cover_photo?: string }>(`/public-profiles/me/cover`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (data?.cover_photo) setCoverPhoto(data.cover_photo);
    } catch (err) {
      const msg = ((): string => {
        if (err && typeof err === 'object') {
          const anyErr = err as { response?: { data?: unknown }, message?: string };
          const respData = anyErr.response?.data;
          if (respData && typeof respData === 'object' && 'error' in respData) {
            const emsg = (respData as { error?: unknown }).error;
            if (typeof emsg === 'string' && emsg.trim()) return emsg;
          }
          if (typeof anyErr.message === 'string') return anyErr.message;
        }
        return 'Failed to upload cover photo.';
      })();
      setApiError(msg);
    } finally {
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setApiError("");
    setSuccess("");
    try {
      if (!userId) throw new Error("Missing user id");
      if (!slugValid || slugStatus !== 'available') {
        throw new Error('Please choose an available slug');
      }
      // Update user profile
      await api.put(`/users/${userId}`, {
        profile: {
          slug: slug.trim().toLowerCase(),
          shortBio: shortBio.trim(),
          socialHandles: socialHandles.filter(h => (h.platform || h.url)).map(h => ({
            platform: (h.platform || '').trim(),
            url: (h.url || '').trim()
          })),
        }
      });

      // Fetch existing public profile for this user
      const list = await api
        .get<PublicProfileDoc[]>("/public-profiles", { params: { user_id: userId } })
        .then(r => r.data);
      const existing = Array.isArray(list) && list.length > 0 ? list[0] : null;

      // Convert typed stats back to server schema
      const statsObj: { clients: number; team_members: number; projects: number; years_in_business: string; avg_rating: number } = {
        clients: 0,
        team_members: 0,
        projects: 0,
        years_in_business: '',
        avg_rating: 0,
      };
      stats.forEach((it) => {
        const val = Number(it.value) || 0;
        switch (it.type) {
          case 'clients': statsObj.clients = val; break;
          case 'team_members': statsObj.team_members = val; break;
          case 'projects': statsObj.projects = val; break;
          case 'years_in_business': statsObj.years_in_business = String(val); break;
          case 'avg_rating': statsObj.avg_rating = val; break;
          default: break;
        }
      });
      const serverStatsPayload = (statsObj.clients || statsObj.team_members || statsObj.projects || statsObj.avg_rating || statsObj.years_in_business)
        ? [statsObj]
        : [];

      if (existing && existing._id) {
        await api.put(`/public-profiles/${existing._id}`, {
          cover_photo: coverPhoto.trim(),
          bio: shortBio.trim(),
          stats: serverStatsPayload,
          published_services: publishedServices,
          published_projects: publishedProjects,
        });
      } else {
        await api.post('/public-profiles', {
          user_id: userId,
          cover_photo: coverPhoto.trim(),
          bio: shortBio.trim(),
          stats: serverStatsPayload,
          featured_clients: [],
          showcase_media: [],
          published_services: publishedServices,
          published_projects: publishedProjects,
        });
      }

      setSuccess("Profile updated successfully");
    } catch (err) {
      const msg = ((): string => {
        if (err && typeof err === 'object') {
          const anyErr = err as { response?: { data?: unknown }, message?: string };
          const respData = anyErr.response?.data;
          if (respData && typeof respData === 'object' && 'error' in respData) {
            const emsg = (respData as { error?: unknown }).error;
            if (typeof emsg === 'string' && emsg.trim()) return emsg;
          }
          if (typeof anyErr.message === 'string') return anyErr.message;
        }
        return 'Failed to save changes.';
      })();
      setApiError(msg);
    } finally {
      setSaving(false);
    }
  }

  const publicLink = useMemo(() => {
    const origin = window.location.origin; // keep dynamic port/domain
    const s = slug.trim().toLowerCase();
    return s ? `${origin}/${s}` : origin;
  }, [slug]);

  return (
    <PermissionGate group="public_profile">
    <div className="p-6">
      <div className="mb-5 sm:mb-8">
        <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
          Edit Public Profile
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage your public page details: slug, cover, bio, stats and social links.
        </p>
      </div>

      {loading && <div className="text-gray-600 dark:text-gray-400">Loading...</div>}
      {apiError && (
        <div className="max-w-xl"><Alert variant="error" title="Error" message={apiError} /></div>
      )}
      {success && (
        <div className="max-w-xl mb-3"><Alert variant="success" title="Saved" message={success} /></div>
      )}

      <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
        {/* Slug */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">Public URL</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Choose an available slug for your public link.</p>
          <Label>Slug</Label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="your-name" />
          <div className="mt-2 text-xs">
            {slugStatus === 'checking' && <span className="text-gray-500 dark:text-gray-400">Checking availability…</span>}
            {slugStatus === 'available' && <span className="text-emerald-600">Available</span>}
            {slugStatus === 'taken' && <span className="text-red-600">Taken</span>}
            {slugStatus === 'error' && <span className="text-red-600">{slugReason || 'Invalid slug'}</span>}
          </div>
          <div className="mt-3">
            <div className="rounded-lg bg-gray-50 dark:bg-white/[0.03] p-3 text-sm text-gray-700 dark:text-gray-300 flex items-center justify-between">
              <code className="break-all">{publicLink}</code>
              <Button type="button" size="sm" onClick={() => {
                navigator.clipboard.writeText(publicLink).catch(() => {/* no-op */});
              }}>Copy</Button>
            </div>
          </div>
        </div>

        {/* Cover and Bio */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">Cover & Bio</h2>
          <div className="mt-3 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-white/[0.06] border border-gray-200 dark:border-gray-800">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">No avatar</div>
              )}
            </div>
            <Button type="button" size="sm" onClick={requestAvatarUpload}>{avatar ? 'Replace Avatar' : 'Upload Avatar'}</Button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelected} />
          </div>
          <div className="mt-3">
            <div className="w-full h-32 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-white/[0.06]">
              {coverPhoto ? (
                <img src={coverPhoto} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-brand-500/20 to-fuchsia-500/20" />
              )}
            </div>
          </div>
          <div className="mt-3">
            <Button type="button" size="sm" variant="outline" onClick={requestCoverUpload}>{coverPhoto ? 'Replace Cover Photo' : 'Upload Cover Photo'}</Button>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverSelected} />
          </div>
          <Label className="mt-3">Short Bio</Label>
          <Input value={shortBio} onChange={(e) => setShortBio(e.target.value)} placeholder="Tell visitors who you are" />
        </div>

        {/* Stats */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">Stats</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Numbers that represent your practice</p>
            </div>
            <Button type="button" size="sm" onClick={addStat}>Add</Button>
          </div>
          <div className="mt-3 space-y-3">
            {stats.length === 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-400">No stats yet.</div>
            )}
            {stats.map((s, i) => (
              <div key={i} className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Type</Label>
                  <select
                    value={s.type}
                    onChange={(e) => updateStat(i, { type: e.target.value as StatType })}
                    className="w-full rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.06] px-3 py-2 text-sm text-gray-800 dark:text-white/90"
                  >
                    {STAT_OPTIONS.map((opt) => (
                      <option key={opt.type} value={opt.type}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Value</Label>
                  <Input type="number" value={String(s.value)} onChange={(e) => updateStat(i, { value: Number(e.target.value) })} placeholder="10" />
                </div>
                <div className="col-span-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => removeStat(i)}>Remove</Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Social Links */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">Social Links</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Link your profiles so visitors can follow you</p>
            </div>
            <Button type="button" size="sm" onClick={addHandle}>Add</Button>
          </div>
          <div className="mt-3 space-y-3">
            {socialHandles.length === 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-400">No social links yet.</div>
            )}
            {socialHandles.map((h, i) => (
              <div key={i} className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Platform</Label>
                  <Input value={h.platform || ''} onChange={(e) => updateHandle(i, { platform: e.target.value })} placeholder="Instagram" />
                </div>
                <div>
                  <Label>URL</Label>
                  <Input value={h.url || ''} onChange={(e) => updateHandle(i, { url: e.target.value })} placeholder="https://instagram.com/you" />
                </div>
                <div className="col-span-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => removeHandle(i)}>Remove</Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Publish selections */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">Publish</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Choose which services and projects appear on your public page.</p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-800 dark:text-white/90 mb-2">Services</h3>
              <div className="space-y-2">
                {services.length === 0 && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">No active services.</div>
                )}
                {services.map((svc) => (
                  <label key={svc._id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={publishedServices.includes(svc._id)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setPublishedServices((prev) => {
                          const set = new Set(prev);
                          if (checked) set.add(svc._id); else set.delete(svc._id);
                          return Array.from(set);
                        });
                      }}
                    />
                    <span>{svc.name || svc._id}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-medium text-gray-800 dark:text-white/90 mb-2">Projects</h3>
              <div className="space-y-2">
                {projects.length === 0 && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">No completed projects.</div>
                )}
                {projects.map((p) => (
                  <label key={p._id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={publishedProjects.includes(p._id)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setPublishedProjects((prev) => {
                          const set = new Set(prev);
                          if (checked) set.add(p._id); else set.delete(p._id);
                          return Array.from(set);
                        });
                      }}
                    />
                    <span>{p.name || p._id}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
          <Link to={`/${slug}`} className="ml-auto text-brand-600 underline">View public page</Link>
        </div>
      </form>
    </div>
    </PermissionGate>
  );
}
