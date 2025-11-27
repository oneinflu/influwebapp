 
import { useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb.tsx";
import ComponentCard from "../components/common/ComponentCard.tsx";
import PageMeta from "../components/common/PageMeta.tsx";
import Button from "../components/ui/button/Button.tsx";
import Alert from "../components/ui/alert/Alert.tsx";
import api from "../utils/api.ts";
import { useAuth } from "../context/AuthContext.tsx";
import { useNavigate } from "react-router";
import DatePicker from "../components/form/date-picker.tsx";

type ClientOption = { _id: string; business_name?: string };
type ProjectOption = { _id: string; name?: string; client?: string };
type ServiceOption = { _id: string; name?: string };
type RateCardOption = { _id: string; title?: string };
type QuotationOption = { _id: string; clientId?: string; totalCost?: number };

export default function InvoicesNew() {
  const navigate = useNavigate();
  const { type, user } = useAuth();
  const ownerId = useMemo(() => (type === "user" ? user?._id ?? null : null), [type, user]);

  const [invoiceNo, setInvoiceNo] = useState<string>("");
  const [issuedAt, setIssuedAt] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState<string>("");
  const [currency, setCurrency] = useState<"INR" | "USD" | "EUR" | "GBP">("INR");
  const [taxRatePercent, setTaxRatePercent] = useState<number>(0);
  const [clientId, setClientId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [quotationId, setQuotationId] = useState<string>("");
  const [poNumber, setPoNumber] = useState<string>("");
  const [status, setStatus] = useState<string>("sent");
  const [issuedTo, setIssuedTo] = useState<{ name: string; company?: string; billingAddress?: string; email?: string; phone?: string; gstNumber?: string }>({ name: "" });

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [rateCards, setRateCards] = useState<RateCardOption[]>([]);
  const [quotations, setQuotations] = useState<QuotationOption[]>([]);
  const clientMap = useMemo(() => {
    const m: Record<string, string> = {};
    clients.forEach((c) => { if (c && c._id) m[String(c._id)] = String(c.business_name || c._id); });
    return m;
  }, [clients]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function preload() {
      if (!ownerId) return;
      try {
        const [clientsRes, projectsRes, servicesRes, rateRes, quotationsRes] = await Promise.all([
          api.get("/clients", { params: { user_id: ownerId } }).catch(() => ({ data: [] })),
          api.get("/projects").catch(() => ({ data: [] })),
          api.get("/services", { params: { user_id: ownerId } }).catch(() => ({ data: [] })),
          api.get("/rate-cards").catch(() => ({ data: [] })),
          api.get("/quotations", { params: { user_id: ownerId } }).catch(() => ({ data: [] })),
        ]);
        if (!cancelled) {
          setClients(Array.isArray(clientsRes.data) ? clientsRes.data : []);
          setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : []);
          setServices(Array.isArray(servicesRes.data) ? servicesRes.data : []);
          setRateCards(Array.isArray(rateRes.data) ? rateRes.data : []);
          setQuotations(Array.isArray(quotationsRes.data) ? quotationsRes.data : []);
        }
      } catch {
        // ignore preload errors
      }
    }
    preload();
    return () => { cancelled = true; };
  }, [ownerId]);

  // Items state
  type ItemRow = { description: string; serviceId?: string; rateCardId?: string; qty: number; unitPrice: number };
  const [items, setItems] = useState<ItemRow[]>([{ description: "", serviceId: "", rateCardId: "", qty: 1, unitPrice: 0 }]);
  function addItemRow() { setItems((prev) => [...prev, { description: "", serviceId: "", rateCardId: "", qty: 1, unitPrice: 0 }]); }
  function updateItem(idx: number, field: keyof ItemRow, value: string | number) {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: field === "qty" || field === "unitPrice" ? Number(value) : value } : it));
  }
  function removeItem(idx: number) { setItems((prev) => prev.filter((_, i) => i !== idx)); }

  const subTotal = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.qty || 0) * Number(it.unitPrice || 0)), 0);
  }, [items]);
  const taxAmount = useMemo(() => Number(((subTotal * (taxRatePercent / 100)) || 0).toFixed(2)), [subTotal, taxRatePercent]);
  const grandTotal = useMemo(() => Number((subTotal + taxAmount).toFixed(2)), [subTotal, taxAmount]);

  async function handleSubmit() {
    setErrorMessage("");
    if (!ownerId) { setErrorMessage("Not authenticated."); return; }
    if (!invoiceNo.trim()) { setErrorMessage("Invoice number is required."); return; }
    if (!clientId) { setErrorMessage("Client is required."); return; }
    if (!issuedAt) { setErrorMessage("Issue date is required."); return; }
    // Ensure issuedTo is populated from selected client if missing
    let issuedToData = issuedTo;
    if (!issuedToData?.name?.trim()) {
      try {
        const { data: client } = await api.get(`/clients/${clientId}`);
        const locParts = [client?.location?.city, client?.location?.town, client?.location?.country, client?.location?.pincode].filter(Boolean);
        const address = (client?.address || locParts.join(", ") || "").toString();
        issuedToData = {
          name: (client?.business_name || client?._id || "").toString(),
          company: client?.business_name ? String(client.business_name) : undefined,
          billingAddress: address || undefined,
          email: client?.point_of_contact?.email,
          phone: client?.point_of_contact?.phone,
          gstNumber: client?.gst_number,
        };
      } catch {
        setErrorMessage("Issued To name is required from selected client.");
        return;
      }
    }
    setLoading(true);
    try {
      const payload = {
        invoiceNo: invoiceNo.trim(),
        clientId,
        issuedTo: issuedToData,
        currency,
        items: items.map((it) => {
          const amount = Number((Number(it.qty || 0) * Number(it.unitPrice || 0)).toFixed(2));
          const taxAmt = Number(((amount * (taxRatePercent / 100)) || 0).toFixed(2));
          return {
            description: String(it.description || "").trim(),
            serviceId: it.serviceId || undefined,
            rateCardId: it.rateCardId || undefined,
            qty: Number(it.qty || 0),
            unitPrice: Number(it.unitPrice || 0),
            amount,
            taxRatePercent: taxRatePercent,
            taxAmount: taxAmt,
          };
        }),
        taxes: [{ name: `${taxRatePercent}% GST`, ratePercent: taxRatePercent, amount: taxAmount }],
        status,
        issuedAt,
        dueDate: dueDate || undefined,
        projectId: projectId || undefined,
        quotationId: quotationId || undefined,
        meta: poNumber ? { poNumber } : undefined,
      };
      const { data } = await api.post("/invoices", payload);
      if (data && data._id) {
        navigate("/invoices");
      } else {
        setErrorMessage("Unexpected response creating invoice.");
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
        return "Failed to create invoice.";
      })();
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageMeta title="New Invoice" description="Create a new invoice" />
      <PageBreadcrumb pageTitle="New Invoice" />

      <div className="space-y-6">
        <ComponentCard title="Invoice Details" desc="Fill in the invoice information">
          {errorMessage && (
            <div className="mb-3"><Alert variant="error" title="Error" message={errorMessage} /></div>
          )}

          

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Invoice Number *</label>
              <input
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="INV-2025-0001"
              />
              </div>
              <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Client *</label>
              <select
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]"
                value={clientId}
                onChange={(e) => {
                  const v = e.target.value;
                  setClientId(v);
                  setProjectId("");
                  void (async () => {
                    if (!v) return;
                    try {
                      const { data: client } = await api.get(`/clients/${v}`);
                      const locParts = [client?.location?.city, client?.location?.town, client?.location?.country, client?.location?.pincode].filter(Boolean);
                      const address = (client?.address || locParts.join(", ") || "").toString();
                      setIssuedTo({
                        name: (client?.business_name || client?._id || "").toString(),
                        company: client?.business_name ? String(client.business_name) : undefined,
                        billingAddress: address || undefined,
                        email: client?.point_of_contact?.email,
                        phone: client?.point_of_contact?.phone,
                        gstNumber: client?.gst_number,
                      });
                    } catch {
                      // ignore
                    }
                  })();
                }}
              >
                <option value="">Select client</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>{c.business_name || c._id}</option>
                ))}
              </select>
              </div>

            <div>
              <DatePicker
                id="invoice-issue-date"
                label="Issue Date *"
                defaultDate={issuedAt || new Date()}
                onChange={(_selectedDates, dateStr) => { setIssuedAt(dateStr); }}
                placeholder="Select issue date"
              />
            </div>
            <div>
              <DatePicker
                id="invoice-due-date"
                label="Due Date"
                defaultDate={dueDate || undefined}
                onChange={(_selectedDates, dateStr) => { setDueDate(dateStr); }}
                placeholder="Select due date"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Currency</label>
              <select
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as typeof currency)}
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Tax Percentage</label>
              <select
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]"
                value={String(taxRatePercent)}
                onChange={(e) => setTaxRatePercent(Number(e.target.value))}
              >
                <option value="0">0%</option>
                <option value="5">5%</option>
                <option value="18">18%</option>
                <option value="40">40%</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Subtotal (auto)</label>
              <input
                readOnly
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]"
                value={subTotal.toFixed(2)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Total (auto)</label>
              <input
                readOnly
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]"
                value={grandTotal.toFixed(2)}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Status</label>
              <select
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Quotation (optional)</label>
              <select
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]"
                value={quotationId}
                onChange={(e) => setQuotationId(e.target.value)}
              >
                <option value="">Select quotation</option>
                {quotations.map((q) => (
                  <option key={q._id} value={q._id}>
                    {(q.clientId && clientMap[q.clientId]) ? clientMap[q.clientId] : q._id}
                    {typeof q.totalCost === "number" ? ` — ${q.totalCost}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Project (optional)</label>
              <select
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={!clientId}
              >
                <option value="">{clientId ? "Select project" : "Select client first"}</option>
                {clientId && projects
                  .filter((p) => String(p.client || "") === String(clientId))
                  .map((p) => (
                    <option key={p._id} value={p._id}>{p.name || p._id}</option>
                  ))}
              </select>
            </div>
            
            

            <div className="sm:col-span-2">
              <div className="border-t border-gray-200 dark:border-gray-800 my-4"></div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Items</label>
              <div className="space-y-3">
                {items.map((it, idx) => (
                  <div key={`item-${idx}`} className="grid grid-cols-1 gap-2 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                      <input className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]" placeholder="Description" value={it.description} onChange={(e) => updateItem(idx, "description", e.target.value)} />
                    </div>
                    <div>
                      <select className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]" value={it.serviceId || ""} onChange={(e) => updateItem(idx, "serviceId", e.target.value)}>
                        <option value="">Service</option>
                        {services.map((s) => (<option key={s._id} value={s._id}>{s.name || s._id}</option>))}
                      </select>
                    </div>
                    <div>
                      <select className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]" value={it.rateCardId || ""} onChange={(e) => updateItem(idx, "rateCardId", e.target.value)}>
                        <option value="">Rate Card</option>
                        {rateCards.map((r) => (<option key={r._id} value={r._id}>{r.title || r._id}</option>))}
                      </select>
                    </div>
                    <div>
                      <input type="number" min={0} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]" placeholder="Qty" value={String(it.qty)} onChange={(e) => updateItem(idx, "qty", Number(e.target.value))} />
                    </div>
                    <div>
                      <input type="number" min={0} step={0.01} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]" placeholder="Unit Price" value={String(it.unitPrice)} onChange={(e) => updateItem(idx, "unitPrice", Number(e.target.value))} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => removeItem(idx)}>Remove</Button>
                    </div>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={addItemRow}>Add Item</Button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">PO Number (meta)</label>
              <input className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]" placeholder="PO-8891" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Subtotal (auto)</label>
                  <input readOnly className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]" value={subTotal.toFixed(2)} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Tax Amount (auto)</label>
                  <input readOnly className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]" value={taxAmount.toFixed(2)} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Total (auto)</label>
                  <input readOnly className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]" value={grandTotal.toFixed(2)} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Button size="sm" onClick={() => void handleSubmit()} disabled={loading}>Create Invoice</Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/invoices")}>Cancel</Button>
          </div>
        </ComponentCard>
      </div>
    </>
  );
}
