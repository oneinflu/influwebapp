/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { CheckCircleIcon, CloseLineIcon } from "../../icons";
import Select from "../form/Select";
import DatePicker from "../form/date-picker";

export default function ProfileSetupForm() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [slug, setSlug] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<string>("");
  const [slugStatus, setSlugStatus] = useState<"idle"|"checking"|"available"|"taken"|"error">("idle");
  const slugTimer = useRef<number | null>(null);
  const [slugEdited, setSlugEdited] = useState<boolean>(false);
  const [slugValid, setSlugValid] = useState<boolean>(true);
  const [slugReason, setSlugReason] = useState<string>("");

 

  function suggestSlugFromName(str: string) {
    return String(str)
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9._]/g, "")
      .replace(/\.{2,}/g, ".")
      .replace(/^\.+|\.+$/g, "");
  }
  function normalizeSlugInput(str: string) {
    return String(str)
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9._]/g, "")
      .replace(/\.{2,}/g, ".")
      .replace(/^\.+|\.+$/g, "");
  }

  useEffect(() => {
    // Suggest slug from registration.name or email on first load
    if (!slugEdited && !slug) {
      const source = (user as any)?.registration?.name || (user as any)?.registration?.email || "";
      if (source) setSlug(suggestSlugFromName(source));
    }
  }, [user, slugEdited, slug]);

  // Display name removed; no uniqueness checks

  // Real-time check for slug uniqueness
  useEffect(() => {
    if (slugTimer.current) window.clearTimeout(slugTimer.current);
    const value = slug.trim().toLowerCase();
    if (!value) { setSlugStatus("idle"); return; }
    setSlugStatus("checking");
    slugTimer.current = window.setTimeout(async () => {
      try {
        const { data } = await api.get('/users/slug-available', { params: { slug: value } });
        const available = !!data?.available;
        const valid = data?.valid !== false;
        setSlugValid(valid);
        setSlugReason(valid ? "" : (data?.reason || "Invalid slug"));
        setSlugStatus(valid ? (available ? "available" : "taken") : "error");
      } catch {
        setSlugStatus("error");
        setSlugValid(false);
        setSlugReason("Unable to check availability");
      }
    }, 400);
  }, [slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Update via direct API to keep context lean
    try {
      if (!user?._id) throw new Error("Missing user id");
      if (!slugValid || slugStatus !== 'available') {
        throw new Error('Please choose an available slug');
      }
      await api.put(`/users/${user._id}`, {
        profile: {
          slug: slug.trim().toLowerCase(),
          dateOfBirth: dob,
          gender: gender || undefined,
        },
      });
      navigate("/");
    } catch (err) {
      console.error(err);
      // Ideally show toast
    }
  }

  return (
    <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2 no-scrollbar">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Complete Your Profile
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Choose your username (slug) and date of birth.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-5">
              {/* Display Name removed */}
              <div>
                <div className="flex items-center justify-between">
                  <Label>
                    Username<span className="text-error-500">*</span>
                  </Label>
                  {slugStatus === 'available' && (
                    <span className="inline-flex items-center text-success-500 text-xs">
                      <CheckCircleIcon className="size-4 fill-success-500" />
                      <span className="ml-1">Available</span>
                    </span>
                  )}
                  {slugStatus === 'taken' && (
                    <span className="inline-flex items-center text-error-500 text-xs">
                      <CloseLineIcon className="size-4 fill-error-500" />
                      <span className="ml-1">Already taken</span>
                    </span>
                  )}
                </div>
                <Input
                  type="text"
                  id="slug"
                  name="slug"
                  placeholder="username: letters, numbers, underscore, period"
                  value={slug}
                  onChange={(e) => {
                    setSlugEdited(true);
                    setSlug(normalizeSlugInput(e.target.value));
                  }}
                  hint={slugStatus === 'checking' ? 'Checking availability...' : undefined}
                  error={slugStatus === 'taken' || slugStatus === 'error'}
                  success={slugStatus === 'available'}
                />
                {slugStatus === 'error' && slugReason ? (
                  <p className="mt-1.5 text-xs text-error-500">{slugReason}</p>
                ) : null}
              </div>
              <div>
                <DatePicker
                  id="dob-picker"
                  label="Date of Birth"
                  placeholder="YYYY-MM-DD"
                  defaultDate={dob || undefined}
                  onChange={(selectedDates, dateStr) => {
                    setDob(dateStr);
                  }}
                />
              </div>
              <div>
                <Label>
                  Gender
                </Label>
                <Select
                  options={[
                    { value: '', label: 'Select gender' },
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                    { value: 'non-binary', label: 'Non-binary' },
                    { value: 'other', label: 'Other' },
                    { value: 'prefer_not_to_say', label: 'Prefer not to say' },
                  ]}
                  defaultValue={gender}
                  onChange={(val) => setGender(val)}
                />
              </div>
              <div>
                <button
                  className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save and Continue"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}