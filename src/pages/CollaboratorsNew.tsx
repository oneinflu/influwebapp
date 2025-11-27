import { useMemo, useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import SearchSelect from "../components/form/SearchSelect";
import SearchMultiSelect from "../components/form/SearchMultiSelect";
import TagInput from "../components/form/input/TagInput";
import DatePicker from "../components/form/date-picker";
import FileInput from "../components/form/input/FileInput";
import Checkbox from "../components/form/input/Checkbox";
import Button from "../components/ui/button/Button";
import Alert from "../components/ui/alert/Alert";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router";

const TYPES = [
  "UGC creator",
  "Voice-over artist",
  "Model",
  "Actor",
  "Designer",
  "Photographer",
  "Videographer",
  "Influencer",
];

type Status = "active" | "inactive" | "banned";

interface Identity {
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
}
interface Contact {
  phone?: string;
  email?: string;
  whatsapp?: string;
}
interface Category {
  role?: string;
  skills?: string[];
  tools?: string[];
}
interface Socials {
  instagram?: string;
  youtube?: string;
  behance?: string;
  portfolio?: string;
}
interface Preferences {
  work_mode?: string;
  preferred_types?: string[];
  industries?: string[];
}
interface Experience {
  level?: string;
  years?: number;
  previous_brand_work?: string[];
}
interface Samples {
  videos?: string[];
  photos?: string[];
  voice_samples?: string[];
}
interface CollaboratorCreatePayload {
  type: string;
  managed_by: string;
  user_email: string;
  user_name?: string;
  status?: Status;
  notes?: string;
  identity?: Identity;
  contact?: Contact;
  category?: Category;
  socials?: Socials;
  preferences?: Preferences;
  experience?: Experience;
  samples?: Samples;
}

export default function CollaboratorsNew() {
  const navigate = useNavigate();
  const { type, user } = useAuth();
  const ownerId = useMemo(() => (type === "user" ? user?._id ?? null : null), [type, user]);

  // Basic
  const [collabType, setCollabType] = useState<string>(TYPES[0]);

  // Identity
  const [fullName, setFullName] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [dob, setDob] = useState<string>("");
  const [age, setAge] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [stateName, setStateName] = useState<string>("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [bio, setBio] = useState<string>("");
  const [profileIconFile, setProfileIconFile] = useState<File | null>(null);
  const [profileIconPreview, setProfileIconPreview] = useState<string>("");

  // Contact
  const [phone, setPhone] = useState<string>("");
  const [contactEmail, setContactEmail] = useState<string>("");
  const [whatsapp, setWhatsapp] = useState<string>("");
  const [isWhatsappSame, setIsWhatsappSame] = useState<boolean>(false);

  // Category
  const [skills, setSkills] = useState<string[]>([]);
  const [tools, setTools] = useState<string[]>([]);

  // Socials
  const [instagram, setInstagram] = useState<string>("");
  const [youtube, setYoutube] = useState<string>("");
  const [behance, setBehance] = useState<string>("");
  const [portfolio, setPortfolio] = useState<string>("");

  // Preferences
  const [workMode, setWorkMode] = useState<string>("");
  const [preferredTypes, setPreferredTypes] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);

  // Experience
  const [level, setLevel] = useState<string>("");
  const [years, setYears] = useState<string>("");
  const [previousBrands, setPreviousBrands] = useState<string[]>([]);

  // Samples
  const [sampleVideos, setSampleVideos] = useState<string>("");
  const [samplePhotos, setSamplePhotos] = useState<string>("");
  const [voiceSamples, setVoiceSamples] = useState<string>("");

  // Controls
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Helpers
  function splitToArray(input: string): string[] {
    return input
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  function cleanUrl(input: string): string {
    const s = String(input ?? "").trim();
    return s.replace(/^`+|`+$/g, "").replace(/^"+|"+$/g, "").replace(/^'+|'+$/g, "").trim();
  }
  function cleanArray(arr: unknown[]): string[] {
    const out: string[] = [];
    for (const v of Array.isArray(arr) ? arr : []) {
      if (typeof v === "string") {
        const u = cleanUrl(v);
        if (u) out.push(u);
      }
    }
    return out;
  }

  const INDUSTRY_OPTIONS: Array<{ value: string; label: string }> = [
    { value: "Advertising & Marketing", label: "Advertising & Marketing" },
    { value: "Agriculture", label: "Agriculture" },
    { value: "Automotive", label: "Automotive" },
    { value: "Banking & Finance", label: "Banking & Finance" },
    { value: "Consumer Goods", label: "Consumer Goods" },
    { value: "Education", label: "Education" },
    { value: "Electronics", label: "Electronics" },
    { value: "Energy & Utilities", label: "Energy & Utilities" },
    { value: "Entertainment & Media", label: "Entertainment & Media" },
    { value: "Food & Beverage", label: "Food & Beverage" },
    { value: "Healthcare", label: "Healthcare" },
    { value: "Hospitality & Travel", label: "Hospitality & Travel" },
    { value: "Insurance", label: "Insurance" },
    { value: "IT & Software", label: "IT & Software" },
    { value: "Retail & E-commerce", label: "Retail & E-commerce" },
    { value: "Sports & Recreation", label: "Sports & Recreation" },
    { value: "Telecommunications", label: "Telecommunications" },
    { value: "Textiles & Apparel", label: "Textiles & Apparel" },
    { value: "Beauty & Personal Care", label: "Beauty & Personal Care" },
    { value: "Other", label: "Other" },
  ];
  function pruneObject(obj: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined || v === null) continue;
      if (typeof v === "string" && v.trim() === "") continue;
      if (Array.isArray(v) && v.length === 0) continue;
      out[k] = v;
    }
    return out;
  }
  async function handleVideoFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      setErrorMessage("");
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      if (!ownerId) { setErrorMessage("Not authenticated."); return; }
      for (const file of files) {
        const url = await uploadAvatarToBunny(String(ownerId), file);
        if (url) {
          setSampleVideos((prev) => (prev ? `${prev}, ${url}` : url));
        }
      }
    } catch (err) {
      console.error("Video upload failed:", err);
      setErrorMessage("Could not upload video files.");
    }
  }

  async function handlePhotoFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      setErrorMessage("");
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      if (!ownerId) { setErrorMessage("Not authenticated."); return; }
      for (const file of files) {
        const url = await uploadAvatarToBunny(String(ownerId), file);
        if (url) {
          setSamplePhotos((prev) => (prev ? `${prev}, ${url}` : url));
        }
      }
    } catch (err) {
      console.error("Photo upload failed:", err);
      setErrorMessage("Could not upload photo files.");
    }
  }

  async function handleVoiceFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      setErrorMessage("");
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      if (!ownerId) { setErrorMessage("Not authenticated."); return; }
      for (const file of files) {
        const url = await uploadAvatarToBunny(String(ownerId), file);
        if (url) {
          setVoiceSamples((prev) => (prev ? `${prev}, ${url}` : url));
        }
      }
    } catch (err) {
      console.error("Voice sample upload failed:", err);
      setErrorMessage("Could not upload voice sample files.");
    }
  }

  

  async function uploadAvatarToBunny(userId: string, file: File): Promise<string> {
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
    if (!collabType) { setErrorMessage("Type is required."); return; }
    if (!contactEmail.trim()) { setErrorMessage("Contact email is required."); return; }
    setLoading(true);
    try {
      const payload: CollaboratorCreatePayload = {
        type: collabType,
        managed_by: ownerId!,
        user_email: contactEmail.trim().toLowerCase(),
        status: "active",
      };
      if (fullName.trim()) payload.user_name = fullName.trim();

      let profileIconFinalUrl: string | undefined = undefined;
      if (profileIconFile && ownerId) {
        try {
          const url = await uploadAvatarToBunny(String(ownerId), profileIconFile);
          if (url) profileIconFinalUrl = url;
        } catch (err) {
          console.error("Avatar upload failed:", err);
        }
      } else if (profileIconPreview) {
        profileIconFinalUrl = cleanUrl(profileIconPreview);
      }

      const identityRaw: Identity = {
        full_name: fullName,
        display_name: fullName,
        gender,
        dob,
        age: age ? Number(age) : undefined,
        city,
        state: stateName,
        languages,
        bio,
        profile_icon_url: profileIconFinalUrl,
      };
      const identity = pruneObject(identityRaw as Record<string, unknown>);
      if (Object.keys(identity).length) payload.identity = identity as Identity;

      const contactRaw: Contact = {
        phone,
        email: contactEmail.trim().toLowerCase(),
        whatsapp,
      };
      const contact = pruneObject(contactRaw as Record<string, unknown>);
      if (Object.keys(contact).length) payload.contact = contact as Contact;

      const categoryRaw: Category = {
        role: collabType,
        skills,
        tools,
      };
      const category = pruneObject(categoryRaw as Record<string, unknown>);
      if (Object.keys(category).length) payload.category = category as Category;

      const socialsRaw: Socials = {
        instagram: cleanUrl(instagram),
        youtube: cleanUrl(youtube),
        behance: cleanUrl(behance),
        portfolio: cleanUrl(portfolio),
      };
      const socials = pruneObject(socialsRaw as Record<string, unknown>);
      if (Object.keys(socials).length) payload.socials = socials as Socials;

      const preferencesRaw: Preferences = {
        work_mode: workMode || undefined,
        preferred_types: preferredTypes,
        industries,
      };
      const preferences = pruneObject(preferencesRaw as Record<string, unknown>);
      if (Object.keys(preferences).length) payload.preferences = preferences as Preferences;

      const experienceRaw: Experience = {
        level: level || undefined,
        years: years ? Number(years) : undefined,
        previous_brand_work: previousBrands,
      };
      const experience = pruneObject(experienceRaw as Record<string, unknown>);
      if (Object.keys(experience).length) payload.experience = experience as Experience;

      const samplesRaw: Samples = {
        videos: cleanArray(splitToArray(sampleVideos)),
        photos: cleanArray(splitToArray(samplePhotos)),
        voice_samples: cleanArray(splitToArray(voiceSamples)),
      };
      const samples = pruneObject(samplesRaw as Record<string, unknown>);
      if (Object.keys(samples).length) payload.samples = samples as Samples;

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
            {/* Basic */}
            <div className="space-y-3">
              <div className="text-sm font-semibold text-gray-800 dark:text-white/90">Basic</div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>
                  Type <span className="text-error-500">*</span>
                </Label>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { value: "UGC creator", icon: "🎬" },
                    { value: "Voice-over artist", icon: "🎙️" },
                    { value: "Model", icon: "🧑‍🎤" },
                    { value: "Actor", icon: "🎭" },
                    { value: "Designer", icon: "✏️" },
                    { value: "Photographer", icon: "📷" },
                    { value: "Videographer", icon: "🎥" },
                    { value: "Influencer", icon: "⭐" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setCollabType(opt.value)}
                      className={`${
                        collabType === opt.value
                          ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-900/20"
                          : "border-gray-300 bg-transparent text-gray-800 dark:border-gray-700 dark:text-white/90"
                      } flex items-center gap-3 rounded-lg border px-4 py-3 shadow-theme-xs transition-colors hover:border-brand-300`}
                    >
                      <span className="text-xl" aria-hidden>{opt.icon}</span>
                      <span className="text-sm font-medium">{opt.value}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Optional Details fields (no special card) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Identity */}
                    <div className="sm:col-span-2">
                      <div className="text-sm font-semibold text-gray-800 dark:text-white/90">Identity</div>
                    </div>
                    <div>
                      <Label>Full Name</Label>
                      <Input placeholder="Jane Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                    </div>
                    <div>
                      <Label>Gender</Label>
                      <SearchSelect
                        options={[
                          { value: "male", label: "Male" },
                          { value: "female", label: "Female" },
                          { value: "non-binary", label: "Non-binary" },
                          { value: "prefer_not_to_say", label: "Prefer not to say" },
                          { value: "other", label: "Other" },
                        ]}
                        onChange={(v) => setGender(String(v))}
                        placeholder="Select gender"
                      />
                    </div>
                    <div>
                      <DatePicker
                        id="dob"
                        label="Date of Birth"
                        defaultDate={dob || undefined}
                        placeholder="YYYY-MM-DD"
                        onChange={(_, currentStr) => {
                          const val = typeof currentStr === "string" ? currentStr : "";
                          setDob(val);
                        }}
                      />
                    </div>
                    <div>
                      <Label>Age</Label>
                      <Input placeholder="27" value={age} onChange={(e) => setAge(e.target.value)} />
                    </div>
                    <div>
                      <Label>City</Label>
                      <Input placeholder="Bengaluru" value={city} onChange={(e) => setCity(e.target.value)} />
                    </div>
                    <div>
                      <Label>State</Label>
                      <Input placeholder="Karnataka" value={stateName} onChange={(e) => setStateName(e.target.value)} />
                    </div>
                    <div>
                      <Label>Languages</Label>
                      <TagInput
                        values={languages}
                        onChange={setLanguages}
                        placeholder="Type a language, press Enter or ,"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Bio</Label>
                      <Input placeholder="UGC creator focusing on lifestyle & beauty" value={bio} onChange={(e) => setBio(e.target.value)} />
                    </div>
                    <div>
                      <Label>Profile Icon</Label>
                      <FileInput onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        setProfileIconFile(f);
                        if (f) setProfileIconPreview(URL.createObjectURL(f));
                      }} />
                      {profileIconPreview && (
                        <img src={profileIconPreview} alt="Profile preview" className="mt-2 h-16 w-16 rounded-full object-cover" />
                      )}
                    </div>

                    {/* Divider */}
                    <div className="sm:col-span-2">
                      <div className="my-4 h-px w-full bg-gray-200 dark:bg-gray-800" />
                    </div>
                    {/* Contact */}
                    <div className="sm:col-span-2 mt-2">
                      <div className="text-sm font-semibold text-gray-800 dark:text-white/90">Contact</div>
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        placeholder="+91-9876543210"
                        value={phone}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPhone(val);
                          if (isWhatsappSame) setWhatsapp(val);
                        }}
                      />
                    </div>
                    <div>
                      <Label>Contact Email</Label>
                      <Input type="email" placeholder="creator@example.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                    </div>
                    <div className="sm:col-span-2">
                      <Checkbox
                        label="WhatsApp same as phone"
                        checked={isWhatsappSame}
                        onChange={(checked) => {
                          setIsWhatsappSame(checked);
                          if (checked) setWhatsapp(phone);
                        }}
                      />
                    </div>
                    <div>
                      <Label>WhatsApp</Label>
                      <Input
                        placeholder="+91-9876543210"
                        value={whatsapp}
                        disabled={isWhatsappSame}
                        onChange={(e) => setWhatsapp(e.target.value)}
                      />
                    </div>

                    {/* Category */}
                    <div className="sm:col-span-2 mt-2">
                      <div className="text-sm font-semibold text-gray-800 dark:text-white/90">Category</div>
                    </div>
                    <div>
                      <Label>Skills</Label>
                      <TagInput
                        values={skills}
                        onChange={setSkills}
                        placeholder="Add a skill and press Enter"
                      />
                    </div>
                    <div>
                      <Label>Tools</Label>
                      <TagInput
                        values={tools}
                        onChange={setTools}
                        placeholder="Add a tool and press Enter"
                      />
                    </div>

                    {/* Divider */}
                    <div className="sm:col-span-2">
                      <div className="my-6 h-px w-full bg-gray-200 dark:bg-gray-800" />
                    </div>
                    {/* Socials */}
                    <div className="sm:col-span-2 mt-2">
                      <div className="text-sm font-semibold text-gray-800 dark:text-white/90">Socials</div>
                    </div>
                    <div>
                      <Label>Instagram</Label>
                      <Input placeholder="https://instagram.com/..." value={instagram} onChange={(e) => setInstagram(e.target.value)} />
                    </div>
                    <div>
                      <Label>YouTube</Label>
                      <Input placeholder="https://youtube.com/@..." value={youtube} onChange={(e) => setYoutube(e.target.value)} />
                    </div>
                    <div>
                      <Label>Behance</Label>
                      <Input placeholder="https://behance.net/..." value={behance} onChange={(e) => setBehance(e.target.value)} />
                    </div>
                    <div>
                      <Label>Portfolio</Label>
                      <Input placeholder="https://drive.google.com/..." value={portfolio} onChange={(e) => setPortfolio(e.target.value)} />
                    </div>

                    {/* Divider */}
                    <div className="sm:col-span-2">
                      <div className="my-6 h-px w-full bg-gray-200 dark:bg-gray-800" />
                    </div>
                    {/* Preferences */}
                    <div className="sm:col-span-2 mt-2">
                      <div className="text-sm font-semibold text-gray-800 dark:text-white/90">Preferences</div>
                    </div>
                    <div>
                      <Label>Work Mode</Label>
                      <SearchSelect
                        options={[{ value: "remote", label: "Remote" }, { value: "onsite", label: "Onsite" }, { value: "hybrid", label: "Hybrid" }]}
                        onChange={(v) => setWorkMode(String(v))}
                        placeholder="Select work mode"
                      />
                    </div>
                    <div>
                      <Label>Preferred Types</Label>
                      <TagInput
                        values={preferredTypes}
                        onChange={setPreferredTypes}
                        placeholder="Add a type and press Enter"
                      />
                    </div>
                    <div>
                      <Label>Industries</Label>
                      <SearchMultiSelect
                        values={industries}
                        onChange={setIndustries}
                        options={INDUSTRY_OPTIONS}
                        placeholder="Search or add industries"
                      />
                    </div>

                    {/* Divider */}
                    <div className="sm:col-span-2">
                      <div className="my-6 h-px w-full bg-gray-200 dark:bg-gray-800" />
                    </div>
                    {/* Experience */}
                    <div className="sm:col-span-2 mt-2">
                      <div className="text-sm font-semibold text-gray-800 dark:text-white/90">Experience</div>
                    </div>
                    <div>
                      <Label>Level</Label>
                      <SearchSelect
                        options={[{ value: "beginner", label: "Beginner" }, { value: "intermediate", label: "Intermediate" }, { value: "expert", label: "Expert" }]}
                        onChange={(v) => setLevel(String(v))}
                        placeholder="Select level"
                      />
                    </div>
                    <div>
                      <Label>Years</Label>
                      <Input placeholder="2" value={years} onChange={(e) => setYears(e.target.value)} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Previous Brand Work</Label>
                      <TagInput
                        values={previousBrands}
                        onChange={setPreviousBrands}
                        placeholder="Add brands and press Enter"
                      />
                    </div>

                    {/* Divider */}
                    <div className="sm:col-span-2">
                      <div className="my-6 h-px w-full bg-gray-200 dark:bg-gray-800" />
                    </div>
                    {/* Samples */}
                    <div className="sm:col-span-2 mt-2">
                      <div className="text-sm font-semibold text-gray-800 dark:text-white/90">Samples</div>
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Upload Videos</Label>
                      <FileInput multiple accept="video/*" onChange={handleVideoFilesChange} />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Uploaded video URLs are added automatically.</p>
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Upload Photos</Label>
                      <FileInput multiple accept="image/*" onChange={handlePhotoFilesChange} />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Uploaded photo URLs are added automatically.</p>
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Upload Voice Samples</Label>
                      <FileInput multiple accept="audio/*" onChange={handleVoiceFilesChange} />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Uploaded audio URLs are added automatically.</p>
                    </div>
            </div>

            <div className="flex items-center gap-3">
              <Button size="sm" disabled={loading || !collabType || !contactEmail.trim()}>
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
