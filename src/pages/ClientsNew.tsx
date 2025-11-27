import { useEffect, useRef, useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import TextArea from "../components/form/input/TextArea";
import Select from "../components/form/Select";
import SearchSelect from "../components/form/SearchSelect";
import Button from "../components/ui/button/Button";
import Alert from "../components/ui/alert/Alert";
import PhoneInput from "../components/form/group-input/PhoneInput";
import api from "../utils/api";
import { useNavigate } from "react-router";

type ClientType = "individual" | "company" | "organization" | "agency";
type InvoiceType = "consumer" | "business";
type ClientStatus = "active" | "inactive";
type SocialPlatform = "Instagram" | "YouTube" | "Twitter" | "LinkedIn" | "Facebook" | "Other";

interface SocialHandleForm {
  platform: SocialPlatform;
  handle: string;
}

const INDUSTRY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "Advertising & Marketing", label: "Advertising & Marketing" },
  { value: "Agriculture", label: "Agriculture" },
  { value: "Aerospace & Defense", label: "Aerospace & Defense" },
  { value: "Automotive", label: "Automotive" },
  { value: "Banking & Finance", label: "Banking & Finance" },
  { value: "Biotechnology", label: "Biotechnology" },
  { value: "Chemicals", label: "Chemicals" },
  { value: "Construction", label: "Construction" },
  { value: "Consumer Goods", label: "Consumer Goods" },
  { value: "Education", label: "Education" },
  { value: "Electronics", label: "Electronics" },
  { value: "Energy & Utilities", label: "Energy & Utilities" },
  { value: "Entertainment & Media", label: "Entertainment & Media" },
  { value: "Food & Beverage", label: "Food & Beverage" },
  { value: "Government", label: "Government" },
  { value: "Healthcare", label: "Healthcare" },
  { value: "Hospitality & Travel", label: "Hospitality & Travel" },
  { value: "Insurance", label: "Insurance" },
  { value: "IT & Software", label: "IT & Software" },
  { value: "Jewelry & Accessories", label: "Jewelry & Accessories" },
  { value: "Legal", label: "Legal" },
  { value: "Logistics & Transportation", label: "Logistics & Transportation" },
  { value: "Manufacturing", label: "Manufacturing" },
  { value: "Mining & Metals", label: "Mining & Metals" },
  { value: "Nonprofit", label: "Nonprofit" },
  { value: "Pharmaceuticals", label: "Pharmaceuticals" },
  { value: "Professional Services", label: "Professional Services" },
  { value: "Real Estate", label: "Real Estate" },
  { value: "Retail & E-commerce", label: "Retail & E-commerce" },
  { value: "Sports & Recreation", label: "Sports & Recreation" },
  { value: "Telecommunications", label: "Telecommunications" },
  { value: "Textiles & Apparel", label: "Textiles & Apparel" },
  { value: "Arts & Crafts", label: "Arts & Crafts" },
  { value: "Home & Furniture", label: "Home & Furniture" },
  { value: "Beauty & Personal Care", label: "Beauty & Personal Care" },
  { value: "Other", label: "Other" },
];

export default function ClientsNew() {
  const navigate = useNavigate();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [businessName, setBusinessName] = useState<string>("");
  const [industry, setIndustry] = useState<string>("");
  const [type, setType] = useState<ClientType>("individual");
  const [invoiceType, setInvoiceType] = useState<InvoiceType>("consumer");
  const [gstNumber, setGstNumber] = useState<string>("");
  const [panNumber, setPanNumber] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [town, setTown] = useState<string>("");
  const [pincode, setPincode] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [status, setStatus] = useState<ClientStatus>("active");
  const [pocName, setPocName] = useState<string>("");
  const [pocEmail, setPocEmail] = useState<string>("");
  const [pocPhone, setPocPhone] = useState<string>("");
  const [socialHandles, setSocialHandles] = useState<SocialHandleForm[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (logoFile) {
      const url = URL.createObjectURL(logoFile);
      setLogoPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setLogoPreview("");
  }, [logoFile]);

  function addSocialHandle() {
    setSocialHandles((prev) => [...prev, { platform: "Instagram", handle: "" }]);
  }

  function updateSocialHandle(index: number, next: Partial<SocialHandleForm>) {
    setSocialHandles((prev) => {
      const arr = [...prev];
      arr[index] = { ...arr[index], ...next } as SocialHandleForm;
      return arr;
    });
  }

  function removeSocialHandle(index: number) {
    setSocialHandles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    setErrorMessage("");
    // Minimal client-side validation based on schema requirements
    if (!businessName.trim()) {
      setErrorMessage("Business name is required.");
      return;
    }
    if (!pocName.trim()) {
      setErrorMessage("Point of contact name is required.");
      return;
    }
    if (!pocEmail.trim()) {
      setErrorMessage("Point of contact email is required.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        business_name: businessName.trim(),
        industry: industry.trim() || undefined,
        type,
        invoice_type: invoiceType,
        gst_number: gstNumber.trim().toUpperCase() || undefined,
        pan_number: panNumber.trim().toUpperCase() || undefined,
        location: {
          country: country.trim() || undefined,
          city: city.trim() || undefined,
          town: town.trim() || undefined,
          pincode: pincode.trim() || undefined,
        },
        address: address.trim() || undefined,
        social_handles: socialHandles
          .filter((h) => h.handle && h.handle.trim().length > 0)
          .map((h) => ({ platform: h.platform, handle: h.handle.trim() })),
        point_of_contact: {
          name: pocName.trim(),
          email: pocEmail.trim().toLowerCase(),
          phone: pocPhone.trim() || undefined,
        },
        status,
      } as const;
      let data;
      if (logoFile) {
        const form = new FormData();
        form.append("logo", logoFile);
        form.append("data", JSON.stringify(payload));
        ({ data } = await api.post("/clients", form));
      } else {
        ({ data } = await api.post("/clients", payload));
      }
      if (data && data._id) {
        navigate("/clients");
      } else {
        navigate("/clients");
      }
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
        return "Failed to create client.";
      })();
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageMeta title="Add Client" description="Create a new client" />
      <PageBreadcrumb pageTitle="Add Client" />
      <div className="space-y-6">
        <ComponentCard title="New Client" desc="Fill in all required information based on the model">
          {errorMessage && (
            <Alert variant="error" title="Error" message={errorMessage} />
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit();
            }}
            className="space-y-6"
          >
            {/* Business Info */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>
                  Business name <span className="text-error-500">*</span>
                </Label>
                <Input placeholder="Acme Corp" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              </div>
              <div>
                <Label>Industry</Label>
                <SearchSelect
                  options={INDUSTRY_OPTIONS}
                  defaultValue={industry}
                  onChange={(v) => setIndustry(v)}
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  options={[
                    { value: "individual", label: "Individual" },
                    { value: "company", label: "Company" },
                    { value: "organization", label: "Organization" },
                    { value: "agency", label: "Agency" },
                  ]}
                  defaultValue={type}
                  onChange={(v) => setType(v as ClientType)}
                />
              </div>
              <div>
                <Label>Invoice type</Label>
                <Select
                  options={[
                    { value: "consumer", label: "Consumer" },
                    { value: "business", label: "Business" },
                  ]}
                  defaultValue={invoiceType}
                  onChange={(v) => setInvoiceType(v as InvoiceType)}
                />
              </div>
              <div>
                <Label>Logo</Label>
                {logoPreview && (
                  <div className="mb-3 flex items-center gap-3">
                    <img src={logoPreview} alt="Selected logo" className="h-12 w-12 rounded object-cover border border-gray-200" />
                    <span className="text-theme-xs text-gray-600 dark:text-gray-400">{logoFile?.name}</span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  id="logo-file-new"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <div className="flex items-center justify-between rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="text-theme-xs text-gray-600 dark:text-gray-400">
                    <p className="font-medium text-gray-800 dark:text-white/90">Upload a logo</p>
                    <p>PNG/JPG up to 5MB. Square images look best.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" type="button" onClick={() => fileInputRef.current?.click()}>Choose Image</Button>
                    {logoFile && (
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        onClick={() => {
                          setLogoFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  options={[
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                  ]}
                  defaultValue={status}
                  onChange={(v) => setStatus(v as ClientStatus)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Address</Label>
                <TextArea placeholder="Street, area, etc." value={address} onChange={(val) => setAddress(val)} />
              </div>
            </div>

            {/* Location */}
            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-400">Location</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label>Country</Label>
                  <Input value={country} onChange={(e) => setCountry(e.target.value)} />
                </div>
                <div>
                  <Label>City</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div>
                  <Label>Town</Label>
                  <Input value={town} onChange={(e) => setTown(e.target.value)} />
                </div>
                <div>
                  <Label>Pincode</Label>
                  <Input value={pincode} onChange={(e) => setPincode(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Tax Identifiers */}
            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-400">Tax Identifiers</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label>GST Number</Label>
                  <Input placeholder="15-char GSTIN" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
                </div>
                <div>
                  <Label>PAN Number</Label>
                  <Input placeholder="10-char PAN" value={panNumber} onChange={(e) => setPanNumber(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Point of Contact */}
            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-400">Point of Contact</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label>
                    Name <span className="text-error-500">*</span>
                  </Label>
                  <Input placeholder="Full name" value={pocName} onChange={(e) => setPocName(e.target.value)} />
                </div>
                <div>
                  <Label>
                    Email <span className="text-error-500">*</span>
                  </Label>
                  <Input placeholder="name@company.com" value={pocEmail} onChange={(e) => setPocEmail(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Phone</Label>
                  <PhoneInput
                    countries={[
                      { code: "US", label: "+1" },
                      { code: "IN", label: "+91" },
                      { code: "GB", label: "+44" },
                    ]}
                    onChange={(val) => setPocPhone(val)}
                  />
                </div>
              </div>
            </div>

            {/* Social Handles */}
            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-400">Social Handles</h4>
              <div className="space-y-4">
                {socialHandles.map((h, idx) => (
                  <div key={idx} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Platform</Label>
                      <Select
                        options={[
                          { value: "Instagram", label: "Instagram" },
                          { value: "YouTube", label: "YouTube" },
                          { value: "Twitter", label: "Twitter" },
                          { value: "LinkedIn", label: "LinkedIn" },
                          { value: "Facebook", label: "Facebook" },
                          { value: "Other", label: "Other" },
                        ]}
                        defaultValue={h.platform}
                        onChange={(v) => updateSocialHandle(idx, { platform: v as SocialPlatform })}
                      />
                    </div>
                    <div>
                      <Label>Handle</Label>
                      <Input placeholder="@acme" value={h.handle} onChange={(e) => updateSocialHandle(idx, { handle: e.target.value })} />
                    </div>
                    <div>
                      <Button size="sm" variant="outline" type="button" onClick={() => removeSocialHandle(idx)}>Remove</Button>
                    </div>
                  </div>
                ))}
                <Button size="sm" type="button" onClick={addSocialHandle}>Add Social Handle</Button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button size="sm" type="submit" disabled={loading || !businessName.trim() || !pocEmail.trim() || !pocName.trim()}>
                {loading ? "Creating..." : "Create Client"}
              </Button>
              <Button size="sm" variant="outline" type="button" onClick={() => navigate("/clients")}>Cancel</Button>
            </div>
          </form>
        </ComponentCard>
      </div>
    </>
  );
}
