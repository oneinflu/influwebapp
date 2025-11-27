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
import { Modal } from "../components/ui/modal";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import TextArea from "../components/form/input/TextArea";
import Select from "../components/form/Select";
import DeleteConfirm from "../components/ui/confirm/DeleteConfirm";
import { PencilIcon, TrashBinIcon, InfoIcon } from "../icons";

export interface ClientItem {
  _id: string;
  business_name: string;
  industry?: string;
  type?: "individual" | "company" | "organization" | "agency";
  status?: "active" | "inactive";
  logo?: string;
  invoice_type?: "consumer" | "business";
  gst_number?: string;
  pan_number?: string;
  location?: {
    country?: string;
    city?: string;
    town?: string;
    pincode?: string;
  };
  address?: string;
  social_handles?: Array<{
    platform: "Instagram" | "YouTube" | "Twitter" | "LinkedIn" | "Facebook" | "Other";
    handle: string;
  }>;
  point_of_contact?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export default function Clients() {
  const { user, type } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Edit modal state
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [editLoading, setEditLoading] = useState<boolean>(false);
  const [editError, setEditError] = useState<string>("");
  const [editClientId, setEditClientId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>("");
  const [industry, setIndustry] = useState<string>("");
  const [clientType, setClientType] = useState<"individual" | "company" | "organization" | "agency" | "">("");
  const [status, setStatus] = useState<"active" | "inactive" | "">("");
  const [invoiceType, setInvoiceType] = useState<"consumer" | "business" | "">("");
  const [logo, setLogo] = useState<string>("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [gstNumber, setGstNumber] = useState<string>("");
  const [panNumber, setPanNumber] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [town, setTown] = useState<string>("");
  const [pincode, setPincode] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [pocName, setPocName] = useState<string>("");
  const [pocEmail, setPocEmail] = useState<string>("");
  const [pocPhone, setPocPhone] = useState<string>("");
  type SocialPlatform = "Instagram" | "YouTube" | "Twitter" | "LinkedIn" | "Facebook" | "Other";
  interface SocialHandleForm { platform: SocialPlatform; handle: string }
  const [socialHandles, setSocialHandles] = useState<SocialHandleForm[]>([]);
  const [logoPreview, setLogoPreview] = useState<string>("");

  // Delete modal state
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [deleteClientId, setDeleteClientId] = useState<string | null>(null);

  // View modal state
  const [viewOpen, setViewOpen] = useState<boolean>(false);
  const [viewClient, setViewClient] = useState<ClientItem | null>(null);

  const ownerId = useMemo(() => (type === "user" ? user?._id ?? null : null), [type, user]);

  useEffect(() => {
    let cancelled = false;
    async function fetchClients() {
      if (!ownerId) return; // wait for auth
      setLoading(true);
      setErrorMessage("");
      try {
        const { data } = await api.get("/clients", { params: { user_id: ownerId } });
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
          return "Failed to load clients.";
        })();
        setErrorMessage(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchClients();
    return () => {
      cancelled = true;
    };
  }, [ownerId]);

  function openEdit(c: ClientItem) {
    setEditClientId(c._id);
    setBusinessName(c.business_name || "");
    setIndustry(c.industry || "");
    setClientType(c.type ?? "");
    setStatus(c.status ?? "active");
    setInvoiceType(c.invoice_type ?? "");
    setLogo(c.logo || "");
    setLogoFile(null);
    setLogoPreview("");
    setGstNumber(c.gst_number || "");
    setPanNumber(c.pan_number || "");
    setCountry(c.location?.country || "");
    setCity(c.location?.city || "");
    setTown(c.location?.town || "");
    setPincode(c.location?.pincode || "");
    setAddress(c.address || "");
    setPocName(c.point_of_contact?.name || "");
    setPocEmail(c.point_of_contact?.email || "");
    setPocPhone(c.point_of_contact?.phone || "");
    setSocialHandles(
      Array.isArray(c.social_handles)
        ? c.social_handles.map((h) => ({ platform: h.platform as SocialPlatform, handle: h.handle || "" }))
        : []
    );
    setEditError("");
    setEditOpen(true);
  }

  useEffect(() => {
    if (logoFile) {
      const url = URL.createObjectURL(logoFile);
      setLogoPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setLogoPreview("");
  }, [logoFile]);

  async function saveEdit() {
    if (!editClientId) return;
    setEditLoading(true);
    setEditError("");
    try {
      const payload: Partial<ClientItem> & {
        point_of_contact?: { name?: string; email?: string; phone?: string };
      } = {
        business_name: businessName,
        industry: industry.trim() ? industry : undefined,
        type: clientType === "" ? undefined : clientType,
        status: status === "" ? undefined : status,
        logo: logo.trim() ? logo : undefined,
        invoice_type: invoiceType === "" ? undefined : invoiceType,
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
          name: pocName.trim() ? pocName : undefined,
          email: pocEmail.trim() ? pocEmail : undefined,
          phone: pocPhone.trim() ? pocPhone : undefined,
        },
      };
      let data;
      if (logoFile) {
        const form = new FormData();
        form.append("logo", logoFile);
        form.append("data", JSON.stringify(payload));
        ({ data } = await api.put(`/clients/${editClientId}`, form));
      } else {
        ({ data } = await api.put(`/clients/${editClientId}`, payload));
      }
      if (data && data._id) {
        setItems((prev) => prev.map((it) => (it._id === data._id ? { ...it, ...data } : it)));
        setEditOpen(false);
        // reset
        setEditClientId(null);
        setLogoFile(null);
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
        return "Failed to update client.";
      })();
      setEditError(message);
    } finally {
      setEditLoading(false);
    }
  }

  function openDelete(c: ClientItem) {
    setDeleteClientId(c._id);
    setDeleteOpen(true);
  }

  function openView(c: ClientItem) {
    setViewClient(c);
    setViewOpen(true);
  }

  async function confirmDelete() {
    if (!deleteClientId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/clients/${deleteClientId}`);
      setItems((prev) => prev.filter((it) => it._id !== deleteClientId));
      setDeleteOpen(false);
      setDeleteClientId(null);
    } catch (err) {
      // show an alert in page level
      const message = ((): string => {
        if (err && typeof err === "object") {
          const anyErr = err as { response?: { data?: unknown } };
          const respData = anyErr.response?.data;
          if (respData && typeof respData === "object" && "error" in respData) {
            const msg = (respData as { error?: unknown }).error;
            if (typeof msg === "string" && msg.trim().length > 0) return msg;
          }
        }
        return "Failed to delete client.";
      })();
      setErrorMessage(message);
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <>
      <PageMeta title="Clients" description="Clients owned by current user" />
      <PageBreadcrumb pageTitle="Clients" />
      <div className="space-y-6">
        <ComponentCard title="Clients">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">List of all clients that belong to your account.</p>
            <Button size="sm" onClick={() => navigate("/clients/new")}>Add New Client</Button>
          </div>

          {errorMessage && (
            <Alert variant="error" title="Error" message={errorMessage} />
          )}

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Business</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Industry</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Type</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Contact</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
                  </TableRow>
                </TableHeader>

                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {loading ? (
                    <TableRow>
                      <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">
                        Loading clients...
                      </TableCell>
                      <TableCell children={undefined}></TableCell>
                      <TableCell children={undefined}></TableCell>
                      <TableCell children={undefined}></TableCell>
                      <TableCell children={undefined}></TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">
                        No clients found.
                      </TableCell>
                      <TableCell children={undefined}></TableCell>
                      <TableCell children={undefined}></TableCell>
                      <TableCell children={undefined}></TableCell>
                      <TableCell children={undefined}></TableCell>
                    </TableRow>
                  ) : (
                    items.map((c) => (
                      <TableRow key={c._id}>
                        <TableCell className="px-5 py-4 sm:px-6 text-start">
                          <div className="flex items-center gap-3">
                            <div>
                              <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                                {c.business_name}
                              </span>
                              <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                                {c.industry || "—"}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          {c.industry || "—"}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          {c.type || "—"}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          <div>
                            <span className="block text-theme-sm">{c.point_of_contact?.name || "—"}</span>
                            <span className="block text-theme-xs text-gray-500 dark:text-gray-400">{c.point_of_contact?.email || ""}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                          {(c.status || "active").charAt(0).toUpperCase() + (c.status || "active").slice(1)}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-start">
                          <div className="flex items-center gap-2">
                            <button
                              aria-label="View"
                              className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-brand-600 hover:bg-brand-50 dark:border-white/10 dark:bg-white/5 dark:text-white/80"
                              onClick={() => openView(c)}
                            >
                              <InfoIcon width={16} height={16} />
                            </button>
                            <button
                              aria-label="Edit"
                              className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white/80"
                              onClick={() => openEdit(c)}
                            >
                              <PencilIcon width={16} height={16} />
                            </button>
                            <button
                              aria-label="Delete"
                              className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-error-600 hover:bg-error-50 dark:border-white/10 dark:bg-white/5 dark:text-error-400"
                              onClick={() => openDelete(c)}
                            >
                              <TrashBinIcon width={16} height={16} />
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

      {/* Edit Modal */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">Edit Client</h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">Update client details.</p>
          </div>
          {editError && <Alert variant="error" title="Error" message={editError} />}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void saveEdit();
            }}
            className="flex flex-col"
          >
            <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label>Business name</Label>
                  <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                </div>
                <div>
                  <Label>Industry</Label>
                  <Input value={industry} onChange={(e) => setIndustry(e.target.value)} />
                </div>
                <div>
                  <Label>Logo</Label>
                  {(logoPreview || logo) && (
                    <div className="mb-3 flex items-center gap-3">
                      <img src={logoPreview || logo || ''} alt={businessName || "Logo"} className="h-12 w-12 rounded object-cover border border-gray-200" />
                      {logo && !logoPreview && (
                        <a href={logo} target="_blank" rel="noreferrer" className="text-brand-600 text-theme-xs hover:underline">Open current</a>
                      )}
                    </div>
                  )}
                  <input
                    id="logo-file-edit"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                    className="sr-only"
                  />
                  <div className="flex items-center justify-between rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="text-theme-xs text-gray-600 dark:text-gray-400">
                      <p className="font-medium text-gray-800 dark:text-white/90">Upload a new logo</p>
                      <p>PNG/JPG up to 5MB. Square images look best.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label htmlFor="logo-file-edit">
                        <Button size="sm">Choose Image</Button>
                      </label>
                      {logoFile && (
                        <Button size="sm" variant="outline" onClick={() => setLogoFile(null)}>Clear</Button>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <Label>Type</Label>
                  <Select
                    key={`type-${clientType || ""}`}
                    defaultValue={clientType || ""}
                    options={[
                      { value: "individual", label: "Individual" },
                      { value: "company", label: "Company" },
                      { value: "organization", label: "Organization" },
                      { value: "agency", label: "Agency" },
                    ]}
                    onChange={(v: string) =>
                      setClientType(
                        v === "individual" ||
                          v === "company" ||
                          v === "organization" ||
                          v === "agency"
                          ? v
                          : ""
                      )
                    }
                  />
                </div>
                <div>
                  <Label>Invoice type</Label>
                  <Select
                    key={`invoice-${invoiceType || ""}`}
                    defaultValue={invoiceType || ""}
                    options={[
                      { value: "consumer", label: "Consumer" },
                      { value: "business", label: "Business" },
                    ]}
                    onChange={(v: string) =>
                      setInvoiceType(v === "consumer" || v === "business" ? v : "")
                    }
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    key={`status-${status || ""}`}
                    defaultValue={status || ""}
                    options={[
                      { value: "active", label: "Active" },
                      { value: "inactive", label: "Inactive" },
                    ]}
                    onChange={(v: string) =>
                      setStatus(v === "active" || v === "inactive" ? v : "")
                    }
                  />
                </div>
                <div>
                  <Label>GST Number</Label>
                  <Input placeholder="15-char GSTIN" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
                </div>
                <div>
                  <Label>PAN Number</Label>
                  <Input placeholder="10-char PAN" value={panNumber} onChange={(e) => setPanNumber(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Address</Label>
                  <TextArea placeholder="Street, area, etc." value={address} onChange={(val) => setAddress(val)} />
                </div>
                <div>
                  <Label>POC Name</Label>
                  <Input value={pocName} onChange={(e) => setPocName(e.target.value)} />
                </div>
                <div>
                  <Label>POC Email</Label>
                  <Input value={pocEmail} onChange={(e) => setPocEmail(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label>POC Phone</Label>
                  <Input value={pocPhone} onChange={(e) => setPocPhone(e.target.value)} />
                </div>
                <div>
                  <Label>Country</Label>
                  <Input placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
                </div>
                <div>
                  <Label>City</Label>
                  <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div>
                  <Label>Town</Label>
                  <Input placeholder="Town" value={town} onChange={(e) => setTown(e.target.value)} />
                </div>
                <div>
                  <Label>Pincode</Label>
                  <Input placeholder="Pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label>Social Handles</Label>
                    <button
                      type="button"
                      className="text-sm text-brand-600 hover:underline"
                      onClick={() => setSocialHandles((prev) => [...prev, { platform: "Instagram", handle: "" }])}
                    >
                      Add Handle
                    </button>
                  </div>
                  <div className="space-y-3 mt-2">
                    {socialHandles.length === 0 ? (
                      <p className="text-theme-xs text-gray-500 dark:text-gray-400">No social handles added.</p>
                    ) : (
                      socialHandles.map((h, idx) => (
                        <div key={idx} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <div>
                            <Label>Platform</Label>
                            <Select
                              defaultValue={h.platform}
                              options={[
                                { value: "Instagram", label: "Instagram" },
                                { value: "YouTube", label: "YouTube" },
                                { value: "Twitter", label: "Twitter" },
                                { value: "LinkedIn", label: "LinkedIn" },
                                { value: "Facebook", label: "Facebook" },
                                { value: "Other", label: "Other" },
                              ]}
                              onChange={(v: string) =>
                                setSocialHandles((prev) => {
                                  const arr = [...prev];
                                  arr[idx] = { ...arr[idx], platform: v as SocialPlatform };
                                  return arr;
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label>Handle</Label>
                            <Input
                              placeholder="@brand"
                              value={h.handle}
                              onChange={(e) =>
                                setSocialHandles((prev) => {
                                  const arr = [...prev];
                                  arr[idx] = { ...arr[idx], handle: e.target.value };
                                  return arr;
                                })
                              }
                            />
                          </div>
                          <div className="sm:col-span-2 flex justify-end">
                            <button
                              type="button"
                              className="text-theme-xs text-error-600 hover:underline"
                              onClick={() => setSocialHandles((prev) => prev.filter((_, i) => i !== idx))}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button size="sm" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button size="sm" disabled={editLoading || !businessName.trim()}>{editLoading ? "Saving..." : "Save Changes"}</Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={viewOpen} onClose={() => setViewOpen(false)} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">Client Details</h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">View complete client information.</p>
          </div>
          {viewClient && (
            <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3 space-y-6">
              {/* General */}
              <div>
                <h5 className="mb-2 text-theme-sm font-semibold text-gray-700 dark:text-white/80">General</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Business name</Label>
                    <p className="text-theme-sm text-gray-800 dark:text-white/90">{viewClient.business_name}</p>
                  </div>
                  <div>
                    <Label>Industry</Label>
                    <p className="text-theme-sm text-gray-800 dark:text-white/90">{viewClient.industry || "—"}</p>
                  </div>
                  <div>
                    <Label>Type</Label>
                    <p className="text-theme-sm text-gray-800 dark:text-white/90">{viewClient.type || "—"}</p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <p className="text-theme-sm text-gray-800 dark:text-white/90">{viewClient.status || "—"}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Logo</Label>
                    {viewClient.logo ? (
                      <div className="mt-1 flex items-center gap-3">
                        <img src={viewClient.logo} alt={viewClient.business_name} className="h-10 w-10 rounded object-cover border border-gray-200" />
                        <a href={viewClient.logo} target="_blank" rel="noreferrer" className="text-brand-600 text-theme-xs hover:underline">Open logo</a>
                      </div>
                    ) : (
                      <p className="text-theme-sm text-gray-800 dark:text-white/90">—</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact (POC) */}
              <div>
                <h5 className="mb-2 text-theme-sm font-semibold text-gray-700 dark:text-white/80">Point of Contact</h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label>Name</Label>
                    <p className="text-theme-sm text-gray-800 dark:text-white/90">{viewClient.point_of_contact?.name || "—"}</p>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p className="text-theme-sm text-gray-800 dark:text-white/90">{viewClient.point_of_contact?.email || ""}</p>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <p className="text-theme-sm text-gray-800 dark:text-white/90">{viewClient.point_of_contact?.phone || ""}</p>
                  </div>
                </div>
              </div>

              {/* Invoice & IDs */}
              <div>
                <h5 className="mb-2 text-theme-sm font-semibold text-gray-700 dark:text-white/80">Invoice & IDs</h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label>Invoice type</Label>
                    <p className="text-theme-sm text-gray-800 dark:text-white/90">{viewClient.invoice_type || "—"}</p>
                  </div>
                  <div>
                    <Label>GST Number</Label>
                    <p className="text-theme-sm text-gray-800 dark:text-white/90">{viewClient.gst_number || ""}</p>
                  </div>
                  <div>
                    <Label>PAN Number</Label>
                    <p className="text-theme-sm text-gray-800 dark:text-white/90">{viewClient.pan_number || ""}</p>
                  </div>
                </div>
              </div>

              {/* Location & Address */}
              <div>
                <h5 className="mb-2 text-theme-sm font-semibold text-gray-700 dark:text-white/80">Location & Address</h5>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <Label>Country</Label>
                    <p className="text-theme-sm text-gray-800 dark:text-white/90">{viewClient.location?.country || ""}</p>
                  </div>
                  <div>
                    <Label>City</Label>
                    <p className="text-theme-sm text-gray-800 dark:text-white/90">{viewClient.location?.city || ""}</p>
                  </div>
                  <div>
                    <Label>Town</Label>
                    <p className="text-theme-sm text-gray-800 dark:text-white/90">{viewClient.location?.town || ""}</p>
                  </div>
                  <div>
                    <Label>Pincode</Label>
                    <p className="text-theme-sm text-gray-800 dark:text-white/90">{viewClient.location?.pincode || ""}</p>
                  </div>
                  <div className="sm:col-span-4">
                    <Label>Address</Label>
                    <p className="text-theme-sm text-gray-800 dark:text-white/90">{viewClient.address || ""}</p>
                  </div>
                </div>
              </div>

              {/* Social Handles */}
              <div>
                <h5 className="mb-2 text-theme-sm font-semibold text-gray-700 dark:text-white/80">Social Handles</h5>
                {Array.isArray(viewClient.social_handles) && viewClient.social_handles.length > 0 ? (
                  <div className="space-y-2">
                    {viewClient.social_handles.map((h, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div>
                          <span className="block text-theme-sm text-gray-800 dark:text-white/90">{h.platform}</span>
                          <span className="block text-theme-xs text-gray-500 dark:text-gray-400">{h.handle}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-theme-sm text-gray-800 dark:text-white/90">—</p>
                )}
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
            <Button size="sm" variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <DeleteConfirm
        isOpen={deleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Client"
        description="Are you sure you want to delete this client? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={deleteLoading}
      />
    </>
  );
}