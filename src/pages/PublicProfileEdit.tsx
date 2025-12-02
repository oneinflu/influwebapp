import { useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import TextArea from "../components/form/input/TextArea";
import Button from "../components/ui/button/Button";
import Alert from "../components/ui/alert/Alert";
import PermissionGate from "../components/common/PermissionGate";
import Select from "../components/form/Select";
import Checkbox from "../components/form/input/Checkbox";
import Modal from "../components/ui/modal";
import VideoPlayer from "../components/media/VideoPlayer";
import { PencilIcon } from "../icons";

type StatType = 'clients' | 'team_members' | 'projects' | 'years_in_business' | 'avg_rating';
type StatsItem = { type: StatType; value: number };
type SocialHandle = { platform?: string; url?: string };

interface ServiceItem {
  _id: string;
  name: string;
  description?: string;
}

type DisplayService = {
  serviceId: string;
  description: string;
  startingPrice: string;
  showPrice: boolean;
};

interface DisplayServiceServerItem {
  service_id?: string;
  serviceId?: string;
  description?: string;
  starting_price?: string | number;
  startingPrice?: string | number;
  show_price?: boolean;
  showPrice?: boolean;
}

interface PublicProfileExtras {
  services_section_enabled?: boolean;
  services_section_title?: string;
  services_section_subtitle?: string;
  display_services?: DisplayServiceServerItem[];
  portfolio_section_enabled?: boolean;
  portfolio_section_title?: string;
  portfolio_section_subtitle?: string;
  showcase_media?: string[];
}

// Minimal shapes for typed API responses
interface UserResponse {
  _id?: string;
  profile?: {
    slug?: string;
    shortBio?: string;
    socialHandles?: SocialHandle[];
    title?: string;
    subtitle?: string;
    role?: string;
    locationAddress?: string;
    websiteUrl?: string;
    ctaPhoneEnabled?: boolean;
    ctaPhoneLabel?: string;
    ctaPhoneNumber?: string;
    ctaEmailEnabled?: boolean;
    ctaEmailLabel?: string;
    ctaEmailAddress?: string;
  };
  registration?: {
    avatar?: string;
    phone?: string;
    email?: string;
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
  
  const [publishedServices, setPublishedServices] = useState<string[]>([]);
  const [publishedProjects, setPublishedProjects] = useState<string[]>([]);

  const [title, setTitle] = useState<string>("");
  const [subtitle, setSubtitle] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [locationAddress, setLocationAddress] = useState<string>("");
  const [websiteUrl, setWebsiteUrl] = useState<string>("");
  const [ctaPhoneEnabled, setCtaPhoneEnabled] = useState<boolean>(false);
  const [ctaPhoneLabel, setCtaPhoneLabel] = useState<string>("");
  const [ctaPhoneNumber, setCtaPhoneNumber] = useState<string>("");
  const [ctaEmailEnabled, setCtaEmailEnabled] = useState<boolean>(false);
  const [ctaEmailLabel, setCtaEmailLabel] = useState<string>("");
  const [ctaEmailAddress, setCtaEmailAddress] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [, setSaving] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [savingSlug, setSavingSlug] = useState<boolean>(false);
  const [savingBasic, setSavingBasic] = useState<boolean>(false);

  const [publicProfileId, setPublicProfileId] = useState<string | null>(null);
  const [servicesList, setServicesList] = useState<ServiceItem[]>([]);
  const [servicesSectionEnabled, setServicesSectionEnabled] = useState<boolean>(true);
  const [servicesSectionTitle, setServicesSectionTitle] = useState<string>("Our Services");
  const [servicesSectionSubtitle, setServicesSectionSubtitle] = useState<string>("Explore service cards with starting prices and quick actions.");
  const [displayServices, setDisplayServices] = useState<DisplayService[]>([]);
  const [savingServices, setSavingServices] = useState<boolean>(false);

  interface PortfolioItem {
    _id: string;
    type: "image" | "video" | "audio" | "document";
    media_url: string;
    thumbnail_url?: string;
    title?: string;
    description?: string;
  }
  type DisplayPortfolio = { itemId: string; display: boolean };
  const [portfolioList, setPortfolioList] = useState<PortfolioItem[]>([]);
  const [displayPortfolio, setDisplayPortfolio] = useState<DisplayPortfolio[]>([]);
  const [portfolioSectionEnabled, setPortfolioSectionEnabled] = useState<boolean>(true);
  const [portfolioSectionTitle, setPortfolioSectionTitle] = useState<string>("Our Portfolio Works");
  const [portfolioSectionSubtitle, setPortfolioSectionSubtitle] = useState<string>("Selected media from recent work");
  const [savingPortfolio, setSavingPortfolio] = useState<boolean>(false);
  const portfolioUploadRef = useRef<HTMLInputElement | null>(null);
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [previewTarget, setPreviewTarget] = useState<PortfolioItem | null>(null);

  interface CollaboratorItem {
    _id: string;
    type: string;
    users: string;
    status?: string;
    identity?: { full_name?: string; display_name?: string; profile_icon_url?: string };
    category?: { role?: string };
  }
  type DisplayCollaborator = { itemId: string; display: boolean };
  const [collaboratorList, setCollaboratorList] = useState<CollaboratorItem[]>([]);
  const [displayCollaborators, setDisplayCollaborators] = useState<DisplayCollaborator[]>([]);
  const [collaboratorsSectionEnabled, setCollaboratorsSectionEnabled] = useState<boolean>(true);
  const [collaboratorsSectionTitle, setCollaboratorsSectionTitle] = useState<string>("Our Team & Collaborators");
  const [collaboratorsSectionSubtitle, setCollaboratorsSectionSubtitle] = useState<string>("Explore team cards with starting prices and quick actions.");
  const [savingCollaborators, setSavingCollaborators] = useState<boolean>(false);
  const [userMap, setUserMap] = useState<Record<string, string>>({});

  const [brandsSectionEnabled, setBrandsSectionEnabled] = useState<boolean>(true);
  const [brandsSectionTitle, setBrandsSectionTitle] = useState<string>("Our Brands");
  const [brandsSectionSubtitle, setBrandsSectionSubtitle] = useState<string>("Brands we’ve worked with");
  const [brandImages, setBrandImages] = useState<string[]>([]);
  const [savingBrands, setSavingBrands] = useState<boolean>(false);
  const brandUploadRef = useRef<HTMLInputElement | null>(null);

  const [ctaSectionEnabled, setCtaSectionEnabled] = useState<boolean>(true);
  const [ctaTitle, setCtaTitle] = useState<string>("Get in touch");
  const [ctaSubText, setCtaSubText] = useState<string>("Let’s talk about your project and how we can help.");
  const [ctaButtonLabel, setCtaButtonLabel] = useState<string>("Contact Us");
  const [savingCTA, setSavingCTA] = useState<boolean>(false);

  const defaultTerms = "By accessing or using this site, you agree to these Terms and Conditions. Services are provided as-is; pricing and availability may change without notice. You are responsible for the content you submit. We reserve the right to modify or discontinue features at any time. Limitation of liability applies to the fullest extent permitted by law.";
  const defaultPrivacy = "We collect only the information necessary to provide our services. We do not sell your data. See our full policy for details on cookies, analytics, and third-party services. You may request access, correction, or deletion of your data by contacting us.";
  const [termsEnabled, setTermsEnabled] = useState<boolean>(true);
  const [privacyEnabled, setPrivacyEnabled] = useState<boolean>(true);
  const [termsText, setTermsText] = useState<string>(defaultTerms);
  const [privacyText, setPrivacyText] = useState<string>(defaultPrivacy);
  const [savingLinks, setSavingLinks] = useState<boolean>(false);

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

        setTitle(u?.profile?.title || "");
        setSubtitle(u?.profile?.subtitle || "");
        setRole(u?.profile?.role || "");
        setLocationAddress(u?.profile?.locationAddress || "");
        setWebsiteUrl(u?.profile?.websiteUrl || "");
        setCtaPhoneEnabled(!!u?.profile?.ctaPhoneEnabled);
        setCtaPhoneLabel(u?.profile?.ctaPhoneLabel || "");
        setCtaPhoneNumber(u?.profile?.ctaPhoneNumber || "");
        setCtaEmailEnabled(!!u?.profile?.ctaEmailEnabled);
        setCtaEmailLabel(u?.profile?.ctaEmailLabel || "");
        setCtaEmailAddress(u?.profile?.ctaEmailAddress || "");

        let p = await api
          .get<PublicProfileDoc[]>("/public-profiles", { params: { owner_ref: userId } })
          .then(r => r.data);
        if (!Array.isArray(p) || p.length === 0) {
          p = await api
            .get<PublicProfileDoc[]>("/public-profiles", { params: { user_id: userId } })
            .then(r => r.data);
        }
        const current = Array.isArray(p) && p.length > 0 ? p[0] : null;
        setPublicProfileId(current?._id ? String(current._id) : null);
        const curObj0 = (current ?? {}) as Record<string, unknown>;
        const curSlug = typeof curObj0.slug === 'string' ? (curObj0.slug as string) : undefined;
        if (curSlug && curSlug.trim()) setSlug(curSlug.trim());
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
        const curObj = (current ?? {}) as Record<string, unknown>;
        const servicesSectionRaw = (curObj.servicesSection && typeof curObj.servicesSection === 'object') ? (curObj.servicesSection as Record<string, unknown>) : {};
        const portfolioSectionRaw = (curObj.portfolioSection && typeof curObj.portfolioSection === 'object') ? (curObj.portfolioSection as Record<string, unknown>) : {};
        const collaboratorsSectionRaw = (curObj.collaboratorsSection && typeof curObj.collaboratorsSection === 'object') ? (curObj.collaboratorsSection as Record<string, unknown>) : {};
        const brandsSectionRaw = (curObj.brandsSection && typeof curObj.brandsSection === 'object') ? (curObj.brandsSection as Record<string, unknown>) : {};
        const ctaSectionRaw = (curObj.ctaSection && typeof curObj.ctaSection === 'object') ? (curObj.ctaSection as Record<string, unknown>) : {};
        const linksSectionRaw = (curObj.linksSection && typeof curObj.linksSection === 'object') ? (curObj.linksSection as Record<string, unknown>) : {};

        const topPublishedServices = Array.isArray(curObj.published_services) ? (curObj.published_services as unknown[]) : [];
        const nestedPublishedServices = Array.isArray((servicesSectionRaw as Record<string, unknown>).published_services) ? ((servicesSectionRaw as Record<string, unknown>).published_services as unknown[]) : [];
        setPublishedServices((nestedPublishedServices.length > 0 ? nestedPublishedServices : topPublishedServices).map((x) => String(x)));
        const topPublishedProjects = Array.isArray(curObj.published_projects) ? (curObj.published_projects as unknown[]) : [];
        setPublishedProjects(topPublishedProjects.map((x) => String(x)));

        // Fetch active services and projects for selection
        let list: ServiceItem[] = [];
        try {
          const { data } = await api.get<ServiceItem[]>("/services", { params: { user_id: userId } });
          list = Array.isArray(data) ? data : [];
          setServicesList(list);
        } catch {
          setServicesList([]);
        }

        const extras = (current as unknown as PublicProfileExtras) || {};
        const enabled = servicesSectionRaw?.services_section_enabled ?? extras?.services_section_enabled;
        setServicesSectionEnabled(enabled === undefined ? true : !!enabled);
        const title = String((servicesSectionRaw?.services_section_title ?? extras?.services_section_title) || "");
        setServicesSectionTitle(title.trim() ? title : "Our Services");
        const subtitle = String((servicesSectionRaw?.services_section_subtitle ?? extras?.services_section_subtitle) || "");
        setServicesSectionSubtitle(subtitle.trim() ? subtitle : "Explore service cards with starting prices and quick actions.");
        const serverDisplay = (servicesSectionRaw as Record<string, unknown>)?.display_services ?? extras?.display_services;
        if (Array.isArray(serverDisplay) && serverDisplay.length > 0) {
          const normalized: DisplayService[] = serverDisplay.map((ds: DisplayServiceServerItem) => {
            const sid = String(ds?.service_id || ds?.serviceId || "");
            const svc = list.find((s: ServiceItem) => s._id === sid);
            const desc = String(ds?.description || "");
            return {
              serviceId: sid,
              description: desc.trim() ? desc : (svc?.description || ""),
              startingPrice: String(ds?.starting_price ?? ds?.startingPrice ?? ""),
              showPrice: !!(ds?.show_price ?? ds?.showPrice ?? true),
            };
          });
          setDisplayServices(normalized);
        } else {
          const pub = Array.isArray((servicesSectionRaw as Record<string, unknown>)?.published_services)
            ? (((servicesSectionRaw as Record<string, unknown>).published_services as unknown[]) ?? [])
            : (Array.isArray(curObj.published_services) ? (curObj.published_services as unknown[]) : []);
          const normalized: DisplayService[] = pub
            .map((sid) => {
              const svc = list.find((s: ServiceItem) => s._id === sid);
              return {
                serviceId: String(sid),
                description: svc?.description || "",
                startingPrice: "",
                showPrice: true,
              };
            });
          setDisplayServices(normalized);
        }

        let pfList: PortfolioItem[] = [];
        try {
          const { data } = await api.get<PortfolioItem[]>("/portfolios", { params: { belongs_to: userId } });
          pfList = Array.isArray(data) ? data : [];
          setPortfolioList(pfList);
        } catch {
          setPortfolioList([]);
        }

        const showcase = Array.isArray((portfolioSectionRaw as Record<string, unknown>)?.showcase_media)
          ? (((portfolioSectionRaw as Record<string, unknown>).showcase_media as unknown[]) ?? [])
          : (Array.isArray(extras?.showcase_media) ? extras!.showcase_media! : []);
        setDisplayPortfolio(showcase.map((id) => ({ itemId: String(id), display: true })));
        const ptEnabled = portfolioSectionRaw?.portfolio_section_enabled ?? extras?.portfolio_section_enabled;
        setPortfolioSectionEnabled(ptEnabled === undefined ? true : !!ptEnabled);
        const ptTitle = String((portfolioSectionRaw?.portfolio_section_title ?? extras?.portfolio_section_title) || "");
        setPortfolioSectionTitle(ptTitle.trim() ? ptTitle : "Our Portfolio Works");
        const ptSubtitle = String((portfolioSectionRaw?.portfolio_section_subtitle ?? extras?.portfolio_section_subtitle) || "");
        setPortfolioSectionSubtitle(ptSubtitle.trim() ? ptSubtitle : "Selected media from recent work");

        let cbList: CollaboratorItem[] = [];
        try {
          const { data } = await api.get<CollaboratorItem[]>("/collaborators", { params: { managed_by: userId } });
          cbList = Array.isArray(data) ? data : [];
          setCollaboratorList(cbList);
        } catch {
          setCollaboratorList([]);
        }
        const cEnabled = (collaboratorsSectionRaw?.collaborators_section_enabled ?? (extras as unknown as { collaborators_section_enabled?: boolean })?.collaborators_section_enabled);
        setCollaboratorsSectionEnabled(cEnabled === undefined ? true : !!cEnabled);
        const cTitle = String((collaboratorsSectionRaw?.collaborators_section_title ?? (extras as unknown as { collaborators_section_title?: string })?.collaborators_section_title) || "");
        setCollaboratorsSectionTitle(cTitle.trim() ? cTitle : "Our Team & Collaborators");
        const cSubtitle = String((collaboratorsSectionRaw?.collaborators_section_subtitle ?? (extras as unknown as { collaborators_section_subtitle?: string })?.collaborators_section_subtitle) || "");
        setCollaboratorsSectionSubtitle(cSubtitle.trim() ? cSubtitle : "Explore team cards with starting prices and quick actions.");
        const publishedCollabs = ((collaboratorsSectionRaw as Record<string, unknown>)?.published_collaborators ?? (extras as unknown as { published_collaborators?: string[] })?.published_collaborators);
        const collabIds = Array.isArray(publishedCollabs) ? publishedCollabs : [];
        setDisplayCollaborators(collabIds.map((id) => ({ itemId: String(id), display: true })));

        const bEnabled = (brandsSectionRaw?.brands_section_enabled ?? (extras as unknown as { brands_section_enabled?: boolean })?.brands_section_enabled);
        setBrandsSectionEnabled(bEnabled === undefined ? true : !!bEnabled);
        const bTitle = String((brandsSectionRaw?.brands_section_title ?? (extras as unknown as { brands_section_title?: string })?.brands_section_title) || "");
        setBrandsSectionTitle(bTitle.trim() ? bTitle : "Our Brands");
        const bSubtitle = String((brandsSectionRaw?.brands_section_subtitle ?? (extras as unknown as { brands_section_subtitle?: string })?.brands_section_subtitle) || "");
        setBrandsSectionSubtitle(bSubtitle.trim() ? bSubtitle : "Brands we’ve worked with");
        const bImages = ((brandsSectionRaw as Record<string, unknown>)?.brand_images ?? (extras as unknown as { brand_images?: string[] })?.brand_images);
        setBrandImages(Array.isArray(bImages) ? bImages.map((u) => String(u).replace(/`/g,'').trim()).filter((u) => u) : []);

        const ctaEnabled = (ctaSectionRaw?.cta_section_enabled ?? (extras as unknown as { cta_section_enabled?: boolean })?.cta_section_enabled);
        setCtaSectionEnabled(ctaEnabled === undefined ? true : !!ctaEnabled);
        const ctaT = String((ctaSectionRaw?.cta_section_title ?? (extras as unknown as { cta_section_title?: string })?.cta_section_title) || "");
        setCtaTitle(ctaT.trim() ? ctaT : "Get in touch");
        const ctaS = String((ctaSectionRaw?.cta_section_subtext ?? (extras as unknown as { cta_section_subtext?: string })?.cta_section_subtext) || "");
        setCtaSubText(ctaS.trim() ? ctaS : "Let’s talk about your project and how we can help.");
        const ctaBL = String((ctaSectionRaw?.cta_button_label ?? (extras as unknown as { cta_button_label?: string })?.cta_button_label) || "");
        setCtaButtonLabel(ctaBL.trim() ? ctaBL : "Contact Us");

        const tEnabled = (linksSectionRaw?.terms_enabled ?? (extras as unknown as { terms_enabled?: boolean })?.terms_enabled);
        setTermsEnabled(tEnabled === undefined ? true : !!tEnabled);
        const pEnabled = (linksSectionRaw?.privacy_enabled ?? (extras as unknown as { privacy_enabled?: boolean })?.privacy_enabled);
        setPrivacyEnabled(pEnabled === undefined ? true : !!pEnabled);
        const tText = String((linksSectionRaw?.terms_text ?? (extras as unknown as { terms_text?: string })?.terms_text) || "");
        setTermsText(tText.trim() ? tText : defaultTerms);
        const pText = String((linksSectionRaw?.privacy_text ?? (extras as unknown as { privacy_text?: string })?.privacy_text) || "");
        setPrivacyText(pText.trim() ? pText : defaultPrivacy);

        // Prefer public profile basic data if present
        const pprofRaw = curObj.profile;
        const pprof = (pprofRaw && typeof pprofRaw === 'object') ? (pprofRaw as Record<string, unknown>) : {};
        if (pprof && Object.keys(pprof).length > 0) {
          setShortBio(String((pprof.shortBio as string) || ""));
          setTitle(String((pprof.title as string) || ""));
          setSubtitle(String((pprof.subtitle as string) || ""));
          setRole(String((pprof.role as string) || ""));
          setLocationAddress(String((pprof.locationAddress as string) || ""));
          setWebsiteUrl(String((pprof.websiteUrl as string) || ""));
          const handles2 = Array.isArray(pprof.socialHandles) ? (pprof.socialHandles as SocialHandle[]) : [];
          setSocialHandles(handles2);
          setCtaPhoneEnabled(!!(pprof.ctaPhoneEnabled as boolean));
          setCtaPhoneLabel(String((pprof.ctaPhoneLabel as string) || ""));
          setCtaPhoneNumber(String((pprof.ctaPhoneNumber as string) || ""));
          setCtaEmailEnabled(!!(pprof.ctaEmailEnabled as boolean));
          setCtaEmailLabel(String((pprof.ctaEmailLabel as string) || ""));
          setCtaEmailAddress(String((pprof.ctaEmailAddress as string) || ""));
        }

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

  useEffect(() => {
    const ids = Array.from(new Set(collaboratorList.map((i) => i.users).filter(Boolean)));
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
        void 0;
      }
    }
    void fetchUsers();
    return () => { cancelled = true; };
  }, [collaboratorList, userMap]);

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
 
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setApiError("");
    setSuccess("");
    try {
      if (!userId) throw new Error("Missing user id");
      const id = await ensurePublicProfile();
      console.log("PublicProfile id", id);

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

      await api.put(`/public-profiles/${id}`, {
        cover_photo: coverPhoto.trim(),
        bio: shortBio.trim(),
        stats: serverStatsPayload,
        published_services: publishedServices,
        published_projects: publishedProjects,
      });

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
    const s = slug.trim().toLowerCase();
    return s ? `https://oneinflu.com/profile/${s}` : `https://oneinflu.com/profile`;
  }, [slug]);

  async function ensurePublicProfile(): Promise<string> {
    if (!userId) throw new Error("Missing user id");
    if (publicProfileId && publicProfileId.trim()) return publicProfileId;
    let list = await api.get<PublicProfileDoc[]>("/public-profiles", { params: { owner_ref: userId } }).then(r => r.data).catch(() => []);
    if (!Array.isArray(list) || list.length === 0) {
      list = await api.get<PublicProfileDoc[]>("/public-profiles", { params: { user_id: userId } }).then(r => r.data).catch(() => []);
    }
    const existing = Array.isArray(list) && list.length > 0 ? list[0] : null;
    if (existing && existing._id) {
      const id = String(existing._id);
      setPublicProfileId(id);
      return id;
    }
    const createPayload: Record<string, unknown> = {
      ownerRef: userId,
      slug: slug.trim().toLowerCase(),
    };
    const created: unknown = await api.post("/public-profiles", createPayload).then(r => r.data).catch(() => null);
    let newId = "";
    if (created && typeof created === 'object') {
      const obj = created as Record<string, unknown>;
      const idA = obj && obj._id;
      const idB = obj && obj.id;
      if (typeof idA === 'string' && idA.trim()) newId = idA.trim();
      else if (typeof idB === 'string' && idB.trim()) newId = (idB as string).trim();
    }
    if (newId) {
      setPublicProfileId(newId);
      return newId;
    }
    let list2 = await api.get<PublicProfileDoc[]>("/public-profiles", { params: { owner_ref: userId } }).then(r => r.data).catch(() => []);
    if (!Array.isArray(list2) || list2.length === 0) {
      list2 = await api.get<PublicProfileDoc[]>("/public-profiles", { params: { user_id: userId } }).then(r => r.data).catch(() => []);
    }
    const existing2 = Array.isArray(list2) && list2.length > 0 ? list2[0] : null;
    if (existing2 && existing2._id) {
      const id = String(existing2._id);
      setPublicProfileId(id);
      return id;
    }
    throw new Error("Unable to create public profile");
  }

  async function handleSaveSlug() {
    try {
      if (!userId) throw new Error("Missing user id");
      if (!slugValid || slugStatus !== 'available') throw new Error('Please choose an available slug');
      setSavingSlug(true);
      setApiError("");
      setSuccess("");
      const id = await ensurePublicProfile();
      console.log("PublicProfile id", id);
      await api.put(`/public-profiles/${id}`, { slug: slug.trim().toLowerCase() });
      setSuccess("Public URL saved");
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
        return 'Failed to save URL.';
      })();
      setApiError(msg);
    } finally {
      setSavingSlug(false);
    }
  }

  async function handleSaveBasic() {
    try {
      if (!userId) throw new Error("Missing user id");
      setSavingBasic(true);
      setApiError("");
      setSuccess("");
      const payload = {
        profile: {
          shortBio: shortBio.trim(),
          title: title.trim(),
          subtitle: subtitle.trim(),
          role: role || undefined,
          locationAddress: locationAddress.trim() || undefined,
          websiteUrl: websiteUrl.trim() || undefined,
          socialHandles: socialHandles.filter(h => (h.platform || h.url)).map(h => ({
            platform: (h.platform || '').trim(),
            url: (h.url || '').trim()
          })),
          ctaPhoneEnabled: ctaPhoneEnabled,
          ctaPhoneLabel: ctaPhoneLabel.trim() || undefined,
          ctaPhoneNumber: ctaPhoneNumber.trim() || undefined,
          ctaEmailEnabled: ctaEmailEnabled,
          ctaEmailLabel: ctaEmailLabel.trim() || undefined,
          ctaEmailAddress: ctaEmailAddress.trim() || undefined,
        }
      };
      console.log("Basic Data payload", payload);
      const id = await ensurePublicProfile();
      console.log("PublicProfile id", id);
      await api.put(`/public-profiles/${id}`, payload);
      setSuccess("Basic data saved");
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
      setSavingBasic(false);
    }
  }

  function addDisplayedService() {
    setDisplayServices((prev) => {
      const defaultId = servicesList[0]?._id || "";
      const defaultDesc = servicesList[0]?.description || "";
      return [...prev, { serviceId: defaultId, description: defaultDesc, startingPrice: "", showPrice: true }];
    });
  }
  function updateDisplayedService(index: number, next: Partial<DisplayService>) {
    setDisplayServices((prev) => {
      const arr = [...prev];
      const merged = { ...arr[index], ...next } as DisplayService;
      if (next.serviceId) {
        const svc = servicesList.find((s) => s._id === next.serviceId);
        if (svc && !next.description) merged.description = svc.description || "";
      }
      arr[index] = merged;
      return arr;
    });
  }
  function removeDisplayedService(index: number) {
    setDisplayServices((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSaveServicesSection() {
    try {
      if (!userId) throw new Error("Missing user id");
      setSavingServices(true);
      setApiError("");
      setSuccess("");
      const payload = {
        servicesSection: {
          services_section_enabled: servicesSectionEnabled,
          services_section_title: servicesSectionTitle.trim(),
          services_section_subtitle: servicesSectionSubtitle.trim(),
          display_services: displayServices.map((d) => ({
            service_id: d.serviceId,
            description: String(d.description || ""),
            starting_price: String(d.startingPrice || ""),
            show_price: !!d.showPrice,
          })),
          published_services: displayServices.map((d) => d.serviceId).filter(Boolean),
        }
      };
      console.log("Services payload", payload);
      const id = await ensurePublicProfile();
      console.log("PublicProfile id", id);
      await api.put(`/public-profiles/${id}`, payload);
      setPublishedServices(payload.servicesSection.published_services);
      setSuccess("Services section saved");
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
        return 'Failed to save services section.';
      })();
      setApiError(msg);
    } finally {
      setSavingServices(false);
    }
  }

  function addDisplayedPortfolio() {
    setDisplayPortfolio((prev) => {
      const first = portfolioList[0]?._id || "";
      return [...prev, { itemId: first, display: true }];
    });
  }
  function updateDisplayedPortfolio(index: number, next: Partial<DisplayPortfolio>) {
    setDisplayPortfolio((prev) => {
      const arr = [...prev];
      arr[index] = { ...arr[index], ...next } as DisplayPortfolio;
      return arr;
    });
  }
  function removeDisplayedPortfolio(index: number) {
    setDisplayPortfolio((prev) => prev.filter((_, i) => i !== index));
  }
  function requestPortfolioUpload() {
    portfolioUploadRef.current?.click();
  }
  async function handlePortfolioSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!userId) return;
    try {
      const mime = String(file.type || "");
      let itemType: "image" | "video" | "audio" | "document" = "document";
      if (mime.startsWith("image/")) itemType = "image";
      else if (mime.startsWith("video/")) itemType = "video";
      else if (mime.startsWith("audio/")) itemType = "audio";
      const { data: upload } = await api.put<{ url?: string }>("/uploads/portfolio", file, { headers: { "Content-Type": mime || "application/octet-stream" }, params: { user_id: userId, filename: file.name } });
      const mediaUrl = String(upload?.url || "");
      const payload = {
        type: itemType,
        belongs_to: userId,
        media_url: mediaUrl,
        title: file.name,
        size_bytes: file.size || 0,
        status: "active",
      };
      const { data: created } = await api.post<PortfolioItem>("/portfolios", payload);
      const item = created as PortfolioItem;
      setPortfolioList((prev) => [{ _id: item._id, type: item.type, media_url: item.media_url, thumbnail_url: item.thumbnail_url, title: item.title, description: item.description }, ...prev]);
      setDisplayPortfolio((prev) => [...prev, { itemId: String(item._id), display: true }]);
      setSuccess("Media uploaded");
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
        return 'Failed to upload media.';
      })();
      setApiError(msg);
    } finally {
      if (portfolioUploadRef.current) portfolioUploadRef.current.value = '';
    }
  }
  async function handleSavePortfolioSection() {
    try {
      if (!userId) throw new Error("Missing user id");
      setSavingPortfolio(true);
      setApiError("");
      setSuccess("");
      const selectedIds = displayPortfolio.filter((d) => d.display && d.itemId).map((d) => d.itemId);
      const payload = {
        portfolioSection: {
          portfolio_section_enabled: portfolioSectionEnabled,
          portfolio_section_title: portfolioSectionTitle.trim(),
          portfolio_section_subtitle: portfolioSectionSubtitle.trim(),
          showcase_media: selectedIds,
        }
      };
      console.log("Portfolio payload", payload);
      const id = await ensurePublicProfile();
      console.log("PublicProfile id", id);
      await api.put(`/public-profiles/${id}`, payload);
      setSuccess("Portfolio section saved");
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
        return 'Failed to save portfolio section.';
      })();
      setApiError(msg);
    } finally {
      setSavingPortfolio(false);
    }
  }

  async function handleSaveCTASection() {
    try {
      if (!userId) throw new Error("Missing user id");
      setSavingCTA(true);
      setApiError("");
      setSuccess("");
      const payload = {
        ctaSection: {
          cta_section_enabled: ctaSectionEnabled,
          cta_section_title: ctaTitle.trim(),
          cta_section_subtext: ctaSubText.trim(),
          cta_button_label: ctaButtonLabel.trim(),
        }
      };
      console.log("Call To Action payload", payload);
      const id = await ensurePublicProfile();
      console.log("PublicProfile id", id);
      await api.put(`/public-profiles/${id}`, payload);
      setSuccess("CTA section saved");
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
        return 'Failed to save CTA section.';
      })();
      setApiError(msg);
    } finally {
      setSavingCTA(false);
    }
  }

  async function handleSaveLinksSection() {
    try {
      if (!userId) throw new Error("Missing user id");
      setSavingLinks(true);
      setApiError("");
      setSuccess("");
      const payload = {
        linksSection: {
          terms_enabled: termsEnabled,
          privacy_enabled: privacyEnabled,
          terms_text: termsText.trim(),
          privacy_text: privacyText.trim(),
        }
      };
      console.log("Important Links payload", payload);
      const id = await ensurePublicProfile();
      console.log("PublicProfile id", id);
      await api.put(`/public-profiles/${id}`, payload);
      setSuccess("Important links saved");
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
        return 'Failed to save important links.';
      })();
      setApiError(msg);
    } finally {
      setSavingLinks(false);
    }
  }

  function requestBrandUpload() {
    brandUploadRef.current?.click();
  }
  async function handleBrandSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (!userId) return;
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const mime = String(file.type || "");
        if (!mime.startsWith("image/")) continue;
        const { data: upload } = await api.put<{ url?: string }>("/uploads/portfolio", file, { headers: { "Content-Type": mime || "application/octet-stream" }, params: { user_id: userId, filename: file.name } });
        const url = String(upload?.url || "");
        if (url) uploaded.push(url);
      }
      if (uploaded.length > 0) setBrandImages((prev) => [...prev, ...uploaded]);
      setSuccess("Brand images uploaded");
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
        return 'Failed to upload brand images.';
      })();
      setApiError(msg);
    } finally {
      if (brandUploadRef.current) brandUploadRef.current.value = '';
    }
  }
  function removeBrandImage(index: number) {
    setBrandImages((prev) => prev.filter((_, i) => i !== index));
  }
  async function handleSaveBrandsSection() {
    try {
      if (!userId) throw new Error("Missing user id");
      setSavingBrands(true);
      setApiError("");
      setSuccess("");
      const payload = {
        brandsSection: {
          brands_section_enabled: brandsSectionEnabled,
          brands_section_title: brandsSectionTitle.trim(),
          brands_section_subtitle: brandsSectionSubtitle.trim(),
          brand_images: brandImages,
        }
      };
      console.log("Brands payload", payload);
      const id = await ensurePublicProfile();
      console.log("PublicProfile id", id);
      await api.put(`/public-profiles/${id}`, payload);
      setSuccess("Brands section saved");
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
        return 'Failed to save brands section.';
      })();
      setApiError(msg);
    } finally {
      setSavingBrands(false);
    }
  }

  function addDisplayedCollaborator() {
    setDisplayCollaborators((prev) => {
      const first = collaboratorList[0]?._id || "";
      return [...prev, { itemId: first, display: true }];
    });
  }
  function updateDisplayedCollaborator(index: number, next: Partial<DisplayCollaborator>) {
    setDisplayCollaborators((prev) => {
      const arr = [...prev];
      arr[index] = { ...arr[index], ...next } as DisplayCollaborator;
      return arr;
    });
  }
  function removeDisplayedCollaborator(index: number) {
    setDisplayCollaborators((prev) => prev.filter((_, i) => i !== index));
  }
  async function handleCollaboratorImageSelected(e: React.ChangeEvent<HTMLInputElement>, collaboratorId: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!userId) return;
    try {
      const mime = String(file.type || "");
      const { data: upload } = await api.put<{ url?: string }>("/uploads/portfolio", file, { headers: { "Content-Type": mime || "application/octet-stream" }, params: { user_id: userId, filename: file.name } });
      const url = String(upload?.url || "");
      await api.put(`/collaborators/${collaboratorId}`, { identity: { profile_icon_url: url } });
      setCollaboratorList((prev) => prev.map((c) => (c._id === collaboratorId ? { ...c, identity: { ...(c.identity || {}), profile_icon_url: url } } : c)));
      setSuccess("Image uploaded");
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
        return 'Failed to upload image.';
      })();
      setApiError(msg);
    } finally {
      e.currentTarget.value = '';
    }
  }
  async function handleSaveCollaboratorsSection() {
    try {
      if (!userId) throw new Error("Missing user id");
      setSavingCollaborators(true);
      setApiError("");
      setSuccess("");
      const selectedIds = displayCollaborators.filter((d) => d.display && d.itemId).map((d) => d.itemId);
      const payload = {
        collaboratorsSection: {
          collaborators_section_enabled: collaboratorsSectionEnabled,
          collaborators_section_title: collaboratorsSectionTitle.trim(),
          collaborators_section_subtitle: collaboratorsSectionSubtitle.trim(),
          published_collaborators: selectedIds,
        }
      };
      console.log("Collaborators payload", payload);
      const id = await ensurePublicProfile();
      console.log("PublicProfile id", id);
      await api.put(`/public-profiles/${id}`, payload);
      setSuccess("Collaborators section saved");
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
        return 'Failed to save collaborators section.';
      })();
      setApiError(msg);
    } finally {
      setSavingCollaborators(false);
    }
  }

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

      <form onSubmit={handleSave} className="space-y-6 max-w">
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
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" onClick={() => {
                  navigator.clipboard.writeText(publicLink).catch(() => {});
                }}>Copy</Button>
                <Button type="button" size="sm" onClick={handleSaveSlug} disabled={savingSlug || !slugValid || slugStatus !== 'available'}>
                  {savingSlug ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Basic Data */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">Basic Data</h2>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <div className="flex flex-col items-center gap-3">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 dark:bg-white/[0.06] border border-gray-200 dark:border-gray-800">
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">No avatar</div>
                )}
              </div>
              <Button type="button" size="sm" onClick={requestAvatarUpload}>{avatar ? 'Replace Avatar' : 'Upload Avatar'}</Button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelected} />
            </div>
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter title" />
              <Label className="mt-3">Subtitle</Label>
              <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Enter subtitle" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>What describes you best</Label>
              <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Best UGC Creator Agency" />
            </div>
            <div>
              <Label>Location Address</Label>
              <Input value={locationAddress} onChange={(e) => setLocationAddress(e.target.value)} placeholder="City, State, Country" />
            </div>
            <div>
              <Label>Website</Label>
              <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://example.com" />
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-medium text-gray-900 dark:text-white/90">Social Media Links</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Add your social profiles</p>
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
                    <Select
                      options={[
                        { value: 'Instagram', label: 'Instagram' },
                        { value: 'Facebook', label: 'Facebook' },
                        { value: 'LinkedIn', label: 'LinkedIn' },
                        { value: 'YouTube', label: 'YouTube' },
                        { value: 'Twitter', label: 'Twitter' },
                        { value: 'Behance', label: 'Behance' },
                        { value: 'Portfolio', label: 'Portfolio' },
                        { value: 'Other', label: 'Other' },
                      ]}
                      placeholder="Select platform"
                      value={h.platform || ''}
                      onChange={(v: string) => updateHandle(i, { platform: v })}
                    />
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

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Checkbox label="Show Call Button" checked={ctaPhoneEnabled} onChange={setCtaPhoneEnabled} />
              {ctaPhoneEnabled && (
                <>
                  <Label>Button Label</Label>
                  <Input value={ctaPhoneLabel} onChange={(e) => setCtaPhoneLabel(e.target.value)} placeholder="Call Us" />
                  <Label className="mt-2">Phone Number</Label>
                  <Input value={ctaPhoneNumber} onChange={(e) => setCtaPhoneNumber(e.target.value)} placeholder="+91 9876543210" />
                </>
              )}
            </div>
            <div className="space-y-2">
              <Checkbox label="Show Email Button" checked={ctaEmailEnabled} onChange={setCtaEmailEnabled} />
              {ctaEmailEnabled && (
                <>
                  <Label>Button Label</Label>
                  <Input value={ctaEmailLabel} onChange={(e) => setCtaEmailLabel(e.target.value)} placeholder="Email Us" />
                  <Label className="mt-2">Email Address</Label>
                  <Input type="email" value={ctaEmailAddress} onChange={(e) => setCtaEmailAddress(e.target.value)} placeholder="name@company.com" />
                </>
              )}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end">
            <Button type="button" size="sm" onClick={handleSaveBasic} disabled={savingBasic}>
              {savingBasic ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Services */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">Services</h2>
            <Checkbox label="Visible" checked={servicesSectionEnabled} onChange={setServicesSectionEnabled} />
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Section Title</Label>
              <Input value={servicesSectionTitle} onChange={(e) => setServicesSectionTitle(e.target.value)} placeholder="Our Services" />
            </div>
            <div>
              <Label>Subtitle</Label>
              <Input value={servicesSectionSubtitle} onChange={(e) => setServicesSectionSubtitle(e.target.value)} placeholder="Explore service cards with starting prices and quick actions." />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-medium text-gray-900 dark:text-white/90">Displayed Services</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Add services to show on your public page</p>
              </div>
              <Button type="button" size="sm" onClick={addDisplayedService} disabled={servicesList.length === 0}>Add Service</Button>
            </div>
            <div className="mt-3 space-y-4">
              {displayServices.length === 0 && (
                <div className="text-sm text-gray-600 dark:text-gray-400">No services selected.</div>
              )}
              {displayServices.map((d, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-start">
                  <div>
                    <Label>Service</Label>
                    <Select
                      options={servicesList.map((s) => ({ value: s._id, label: s.name }))}
                      value={d.serviceId}
                      onChange={(v: string) => updateDisplayedService(i, { serviceId: v })}
                      placeholder="Select service"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input value={d.description} onChange={(e) => updateDisplayedService(i, { description: e.target.value })} placeholder="Description" />
                  </div>
                  <div>
                    <Label>Starting Price</Label>
                    <Input value={d.startingPrice} onChange={(e) => updateDisplayedService(i, { startingPrice: e.target.value })} placeholder="e.g., $100" />
                  </div>
                  <div className="flex flex-col">
                    <Label>Show Price</Label>
                    <div className="mt-2 flex items-center justify-between">
                      <Checkbox label="Display price" checked={d.showPrice} onChange={(val) => updateDisplayedService(i, { showPrice: val })} />
                      <Button type="button" size="sm" variant="outline" onClick={() => removeDisplayedService(i)}>Remove</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end">
            <Button type="button" size="sm" onClick={handleSaveServicesSection} disabled={savingServices}>
              {savingServices ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Portfolio */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">Portfolio</h2>
            <Checkbox label="Visible" checked={portfolioSectionEnabled} onChange={setPortfolioSectionEnabled} />
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Section Title</Label>
              <Input value={portfolioSectionTitle} onChange={(e) => setPortfolioSectionTitle(e.target.value)} placeholder="Our Portfolio Works" />
            </div>
            <div>
              <Label>Subtitle</Label>
              <Input value={portfolioSectionSubtitle} onChange={(e) => setPortfolioSectionSubtitle(e.target.value)} placeholder="Selected media from recent work" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-medium text-gray-900 dark:text-white/90">Displayed Portfolio</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pick from uploaded media or upload new</p>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" onClick={addDisplayedPortfolio} disabled={portfolioList.length === 0}>Add Item</Button>
                <Button type="button" size="sm" variant="outline" onClick={requestPortfolioUpload}>Upload Media</Button>
                <input ref={portfolioUploadRef} type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={handlePortfolioSelected} />
              </div>
            </div>
            <div className="mt-3 space-y-4">
              {displayPortfolio.length === 0 && (
                <div className="text-sm text-gray-600 dark:text-gray-400">No portfolio items selected.</div>
              )}
              {displayPortfolio.map((d, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-start">
                  <div className="md:col-span-2">
                    <Label>Portfolio Item</Label>
                    <Select
                      options={portfolioList.map((p) => ({ value: p._id, label: p.title || p._id }))}
                      value={d.itemId}
                      onChange={(v: string) => updateDisplayedPortfolio(i, { itemId: v })}
                      placeholder="Select item"
                    />
                  </div>
                  <div className="flex flex-col">
                    <Label>Display</Label>
                    <div className="mt-2 flex items-center gap-2">
                      <Checkbox label="Show on profile" checked={d.display} onChange={(val) => updateDisplayedPortfolio(i, { display: val })} />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const item = portfolioList.find((p) => p._id === d.itemId) || null;
                          setPreviewTarget(item);
                          setPreviewOpen(!!item);
                        }}
                      >
                        Preview
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-end justify-end">
                    <Button type="button" size="sm" variant="outline" onClick={() => removeDisplayedPortfolio(i)}>Remove</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end">
            <Button type="button" size="sm" onClick={handleSavePortfolioSection} disabled={savingPortfolio}>
              {savingPortfolio ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Collaborators */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">Collaborators</h2>
            <Checkbox label="Visible" checked={collaboratorsSectionEnabled} onChange={setCollaboratorsSectionEnabled} />
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Section Title</Label>
              <Input value={collaboratorsSectionTitle} onChange={(e) => setCollaboratorsSectionTitle(e.target.value)} placeholder="Our Team & Collaborators" />
            </div>
            <div>
              <Label>Subtitle</Label>
              <Input value={collaboratorsSectionSubtitle} onChange={(e) => setCollaboratorsSectionSubtitle(e.target.value)} placeholder="Explore team cards with starting prices and quick actions." />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-medium text-gray-900 dark:text-white/90">Displayed Collaborators</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Add collaborators to show on your public page</p>
              </div>
              <Button type="button" size="sm" onClick={addDisplayedCollaborator} disabled={collaboratorList.length === 0}>Add Collaborator</Button>
            </div>
            <div className="mt-3 space-y-4">
              {displayCollaborators.length === 0 && (
                <div className="text-sm text-gray-600 dark:text-gray-400">No collaborators selected.</div>
              )}
              {displayCollaborators.map((d, i) => {
                const selected = collaboratorList.find((c) => c._id === d.itemId) || null;
                const nameLabel = selected?.identity?.display_name || selected?.identity?.full_name || (selected ? userMap[selected.users] : '') || (selected?._id || '');
                const roleLabel = selected?.category?.role || selected?.type || '';
                const img = selected?.identity?.profile_icon_url || '';
                return (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-start">
                    <div>
                      <Label>Collaborator</Label>
                      <Select
                        options={collaboratorList.map((c) => ({ value: c._id, label: (c.identity?.display_name || c.identity?.full_name || userMap[c.users] || c._id) }))}
                        value={d.itemId}
                        onChange={(v: string) => updateDisplayedCollaborator(i, { itemId: v })}
                        placeholder="Select collaborator"
                      />
                    </div>
                    <div>
                      <Label>Role</Label>
                      <Input value={roleLabel} onChange={() => {}} disabled />
                    </div>
                    <div>
                      <Label>Image</Label>
                      {img ? (
                        <div className="mt-2 inline-flex relative group">
                          <img src={img} alt={nameLabel || 'avatar'} className="w-12 h-12 rounded-lg object-cover bg-gray-100 dark:bg-white/[0.06]" />
                          <button
                            type="button"
                            title="Edit"
                            onClick={() => { const el = document.getElementById(`collab-upload-${i}`) as HTMLInputElement | null; el?.click(); }}
                            className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/20 opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
                          >
                            <PencilIcon className="h-4 w-4 text-white" />
                          </button>
                        </div>
                      ) : (
                        <div className="mt-2 flex items-center gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => { const el = document.getElementById(`collab-upload-${i}`) as HTMLInputElement | null; el?.click(); }}>Upload Image</Button>
                        </div>
                      )}
                      <input id={`collab-upload-${i}`} type="file" accept="image/*" className="hidden" onChange={(e) => handleCollaboratorImageSelected(e, d.itemId)} />
                    </div>
                    <div className="flex flex-col">
                      <Label>Display</Label>
                      <div className="mt-2 flex items-center justify-between">
                        <Checkbox label="Show on page" checked={d.display} onChange={(val) => updateDisplayedCollaborator(i, { display: val })} />
                        <Button type="button" size="sm" variant="outline" onClick={() => removeDisplayedCollaborator(i)}>Remove</Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end">
            <Button type="button" size="sm" onClick={handleSaveCollaboratorsSection} disabled={savingCollaborators}>
              {savingCollaborators ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Brands */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">Brands</h2>
            <Checkbox label="Visible" checked={brandsSectionEnabled} onChange={setBrandsSectionEnabled} />
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Section Title</Label>
              <Input value={brandsSectionTitle} onChange={(e) => setBrandsSectionTitle(e.target.value)} placeholder="Our Brands" />
            </div>
            <div>
              <Label>Subtitle</Label>
              <Input value={brandsSectionSubtitle} onChange={(e) => setBrandsSectionSubtitle(e.target.value)} placeholder="Brands we’ve worked with" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-medium text-gray-900 dark:text-white/90">Brand Images</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Upload square brand logos. They will display in a grid.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" variant="outline" onClick={requestBrandUpload}>Upload Images</Button>
                <input ref={brandUploadRef} type="file" accept="image/*" multiple className="hidden" onChange={handleBrandSelected} />
              </div>
            </div>
            <div className="mt-3">
              {brandImages.length === 0 ? (
                <div className="text-sm text-gray-600 dark:text-gray-400">No brand images yet.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                  {brandImages.map((url, i) => (
                    <div key={`${url}-${i}`} className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/5">
                      <img src={url} alt="brand" className="w-full h-full object-cover" />
                      <button type="button" title="Remove" onClick={() => removeBrandImage(i)} className="absolute top-1 right-1 inline-flex items-center justify-center rounded-md bg-black/40 px-1.5 py-1 text-[11px] text-white">Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end">
            <Button type="button" size="sm" onClick={handleSaveBrandsSection} disabled={savingBrands}>
              {savingBrands ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Call To Action */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">Call To Action</h2>
            <Checkbox label="Visible" checked={ctaSectionEnabled} onChange={setCtaSectionEnabled} />
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Title</Label>
              <Input value={ctaTitle} onChange={(e) => setCtaTitle(e.target.value)} placeholder="Get in touch" />
            </div>
            <div>
              <Label>Sub text</Label>
              <Input value={ctaSubText} onChange={(e) => setCtaSubText(e.target.value)} placeholder="A short supporting line" />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>CTA Button Label</Label>
              <Input value={ctaButtonLabel} onChange={(e) => setCtaButtonLabel(e.target.value)} placeholder="Contact Us" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end">
            <Button type="button" size="sm" onClick={handleSaveCTASection} disabled={savingCTA}>
              {savingCTA ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Important Links & Data */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">Important Links & Data</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Add Terms & Conditions and Privacy Policy content</p>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between">
                <Label>Terms & Conditions</Label>
                <Checkbox label="Visible" checked={termsEnabled} onChange={setTermsEnabled} />
              </div>
              <div className="mt-2">
                <TextArea rows={8} value={termsText} onChange={setTermsText} placeholder="Paste your Terms & Conditions" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label>Privacy Policy</Label>
                <Checkbox label="Visible" checked={privacyEnabled} onChange={setPrivacyEnabled} />
              </div>
              <div className="mt-2">
                <TextArea rows={8} value={privacyText} onChange={setPrivacyText} placeholder="Paste your Privacy Policy" />
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end">
            <Button type="button" size="sm" onClick={handleSaveLinksSection} disabled={savingLinks}>
              {savingLinks ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Cover and Bio */}
        

       
       
      </form>
      <Modal isOpen={previewOpen} onClose={() => setPreviewOpen(false)} className="max-w-4xl m-4">
        <div className="p-4 space-y-4">
          {previewTarget?.type === "video" && (
            <VideoPlayer src={previewTarget.media_url} poster={previewTarget.thumbnail_url} className="rounded-lg" />
          )}
          {previewTarget?.type === "image" && (
            <div className="flex items-center justify-center">
              <img src={previewTarget.thumbnail_url || previewTarget.media_url} alt={previewTarget.title || "Preview"} className="max-h-[80vh] max-w-full object-contain rounded-lg" />
            </div>
          )}
          {previewTarget && previewTarget.type !== "video" && previewTarget.type !== "image" && (
            <div className="text-sm text-gray-700 dark:text-gray-300">{previewTarget.title || previewTarget.type}</div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="primary" onClick={() => setPreviewOpen(false)}>Close</Button>
          </div>
        </div>
      </Modal>
    </div>
    </PermissionGate>
  );
}
