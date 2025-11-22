/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
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
type MilestoneOption = { _id: string; name?: string };

export default function InvoicesNew() {
  const navigate = useNavigate();
  const { type, user } = useAuth();
  const ownerId = useMemo(() => (type === "user" ? user?._id ?? null : null), [type, user]);

  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [issueDate, setIssueDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState<string>("");
  const [currency, setCurrency] = useState<"INR" | "USD" | "EUR" | "GBP">("INR");
  const [taxPercentage, setTaxPercentage] = useState<number>(0);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "partially_paid" | "paid" | "overdue" | "cancelled">("pending");
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [clientId, setClientId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [milestoneId, setMilestoneId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [milestones, setMilestones] = useState<MilestoneOption[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function preload() {
      if (!ownerId) return;
      try {
        const [clientsRes, projectsRes] = await Promise.all([
          api.get("/clients", { params: { user_id: ownerId } }).catch(() => ({ data: [] })),
          api.get("/projects").catch(() => ({ data: [] })),
        ]);
        if (!cancelled) {
          setClients(Array.isArray(clientsRes.data) ? clientsRes.data : []);
          setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : []);
        }
      } catch {
        // ignore preload errors
      }
    }
    preload();
    return () => { cancelled = true; };
  }, [ownerId]);

  // Load milestones when a project is selected
  useEffect(() => {
    let cancelled = false;
    async function loadMilestones() {
      setMilestones([]);
      setMilestoneId("");
      if (!projectId) return;
      try {
        const { data: proj } = await api.get(`/projects/${projectId}`);
        const ids: string[] = Array.isArray(proj?.deliverables) ? proj.deliverables : [];
        if (!ids.length) return;
        const results = await Promise.all(
          ids.map((id: string) => api.get(`/milestones/${id}`).catch(() => ({ data: null })))
        );
        const list: MilestoneOption[] = results
          .map((r) => r.data)
          .filter(Boolean)
          .map((m: any) => ({ _id: m._id, name: m.name }));
        if (!cancelled) setMilestones(list);
      } catch {
        // ignore errors
      }
    }
    void loadMilestones();
    return () => { cancelled = true; };
  }, [projectId]);

  const computedTotal = useMemo(() => {
    const pct = Number.isFinite(taxPercentage) ? taxPercentage : 0;
    const sub = Number.isFinite(subtotal) ? subtotal : 0;
    return Number((sub * (1 + pct / 100)).toFixed(2));
  }, [taxPercentage, subtotal]);

  async function handleSubmit() {
    setErrorMessage("");
    if (!ownerId) { setErrorMessage("Not authenticated."); return; }
    if (!invoiceNumber.trim()) { setErrorMessage("Invoice number is required."); return; }
    if (!clientId) { setErrorMessage("Client is required."); return; }
    if (!issueDate) { setErrorMessage("Issue date is required."); return; }
    setLoading(true);
    try {
      const payload = {
        invoice_number: invoiceNumber.trim(),
        issue_date: issueDate,
        due_date: dueDate || undefined,
        tax_percentage: taxPercentage,
        subtotal,
        total: computedTotal,
        currency,
        payment_status: paymentStatus,
        pdf_url: pdfUrl.trim() || undefined,
        created_by: ownerId,
        client: clientId,
        project: projectId || undefined,
        notes: notes.trim() || undefined,
      };
      const { data } = await api.post("/invoices", payload);
      if (data && data._id) {
        // Attach invoice to selected milestone if provided
        if (milestoneId) {
          try {
            await api.post(`/milestones/${milestoneId}/attach-invoice`, { invoice_id: data._id });
          } catch (attachErr) {
            // surface but still navigate
            setErrorMessage((prev) => prev ? prev : "Invoice created, but linking to milestone failed.");
          }
        }
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
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
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
                  // Reset project/milestone when client changes
                  setProjectId("");
                  setMilestoneId("");
                  setMilestones([]);
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
                defaultDate={issueDate || new Date()}
                onChange={(_selectedDates, dateStr) => { setIssueDate(dateStr); }}
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
              <input
                type="number"
                step="0.01"
                min={0}
                max={100}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]"
                value={taxPercentage}
                onChange={(e) => setTaxPercentage(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Subtotal</label>
              <input
                type="number"
                step="0.01"
                min={0}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]"
                value={subtotal}
                onChange={(e) => setSubtotal(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Total (auto)</label>
              <input
                readOnly
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]"
                value={computedTotal.toFixed(2)}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Payment Status</label>
              <select
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]"
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as typeof paymentStatus)}
              >
                <option value="pending">Pending</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">PDF URL</label>
              <input
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]"
                value={pdfUrl}
                onChange={(e) => setPdfUrl(e.target.value)}
                placeholder="https://..."
              />
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
            {projectId && (
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Link to Milestone</label>
                <select
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]"
                  value={milestoneId}
                  onChange={(e) => setMilestoneId(e.target.value)}
                  disabled={milestones.length === 0}
                >
                  <option value="">{milestones.length ? "Select milestone" : "No milestones in this project"}</option>
                  {milestones.map((m) => (
                    <option key={m._id} value={m._id}>{m.name || m._id}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Notes</label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
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