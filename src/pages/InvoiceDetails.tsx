/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
import PageBreadcrumb from "../components/common/PageBreadCrumb.tsx";
import ComponentCard from "../components/common/ComponentCard.tsx";
import PageMeta from "../components/common/PageMeta.tsx";
import Button from "../components/ui/button/Button.tsx";
import Alert from "../components/ui/alert/Alert.tsx";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../components/ui/table/index.tsx";
import api from "../utils/api.ts";
import { useAuth } from "../context/AuthContext.tsx";
import Badge from "../components/ui/badge/Badge.tsx";
import DatePicker from "../components/form/date-picker.tsx";
import { generateInvoicePdf } from "../utils/invoicePdf.ts";

type InvoiceDoc = {
  _id: string;
  invoice_number: string;
  client?: string;
  project?: string;
  issue_date?: string;
  due_date?: string;
  subtotal?: number;
  tax?: number;
  total_amount?: number;
  currency?: string;
  payment_status?: string;
};

type PaymentDoc = {
  _id: string;
  payment_date: string;
  amount: number;
  mode?: string;
  transaction_id?: string;
  remarks?: string;
  receipt_url?: string;
  is_verified?: boolean;
};
type PaymentMode = "BANK" | "UPI" | "CASH" | "CARD" | "OTHER";
type PaymentCreatePayload = {
  invoice_id: string;
  payment_date: string;
  amount: number;
  mode?: PaymentMode | string;
  transaction_id?: string;
  remarks?: string;
  receipt_url?: string;
  is_verified?: boolean;
  paid_by?: string;
  received_by?: string;
};

function formatDate(d?: string) {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString(); } catch { return String(d); }
}

export default function InvoiceDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { type, user } = useAuth();
  const ownerId = useMemo(() => (type === "user" ? user?._id ?? null : null), [type, user]);

  const [invoice, setInvoice] = useState<InvoiceDoc | null>(null);
  const [payments, setPayments] = useState<PaymentDoc[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [pDate, setPDate] = useState<string>("");
  const [pAmount, setPAmount] = useState<string>("");
  const [pMode, setPMode] = useState<PaymentMode>("BANK");
  const [pTxn, setPTxn] = useState<string>("");
  const [pRemarks, setPRemarks] = useState<string>("");
  const [pReceipt, setPReceipt] = useState<string>("");
  const [pVerified, setPVerified] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  async function downloadPdf() {
    const raisedByName = (user?.profile?.displayName || (user as any)?.registration?.name || "").trim();
    // Resolve client display name from ObjectID if needed
    let billedToName = (invoice?.client || "").toString();
    let billedToInfo: { name?: string; address?: string; gst?: string; pan?: string; email?: string; phone?: string } | undefined;
    try {
      if (invoice?.client) {
        const { data: client } = await api.get<{ _id: string; business_name?: string; address?: string; gst_number?: string; pan_number?: string; point_of_contact?: { name?: string; phone?: string; email?: string }; location?: { country?: string; city?: string; town?: string; pincode?: string } }>(`/clients/${invoice.client}`);
        billedToName = (client?.business_name || client?._id || billedToName).toString();
        const locParts = [client?.location?.city, client?.location?.town, client?.location?.country, client?.location?.pincode].filter(Boolean);
        const address = (client?.address || locParts.join(", ") || "").toString();
        billedToInfo = {
          name: billedToName,
          address,
          gst: client?.gst_number,
          pan: client?.pan_number,
          email: client?.point_of_contact?.email,
          phone: client?.point_of_contact?.phone,
        };
      }
    } catch { /* ignore and use fallback */ }
    const byReg = (user as any)?.registration || {};
    const byBiz = (user as any)?.businessInformation || {};
    const bizAddr = byBiz?.businessAddress || {};
    const byAddress = [bizAddr?.line1, bizAddr?.line2, bizAddr?.city, bizAddr?.state, bizAddr?.postalCode, bizAddr?.country].filter((x: any) => x && String(x).trim().length > 0).join(", ");
    const billedByInfo = {
      name: raisedByName || byBiz?.businessName,
      address: byAddress || undefined,
      gst: byBiz?.gstNumber,
      pan: byBiz?.businessPAN || byBiz?.individualPAN,
      email: byReg?.email,
      phone: byReg?.phone,
    };
    // Load milestones linked to this invoice and prepare items for PDF
    let itemsForPdf: Array<{ name?: string; description?: string; due_date?: string; amount?: number }> = [];
    try {
      const { data: allMilestones } = await api.get<any[]>("/milestones", { params: { has_invoice: true } });
      const invId = invoice?._id || id;
      itemsForPdf = (Array.isArray(allMilestones) ? allMilestones : [])
        .filter((m) => m?.invoice_attached?.invoice_id && String(m.invoice_attached.invoice_id) === String(invId))
        .map((m) => ({ name: m?.name, description: m?.description, due_date: m?.due_date, amount: m?.amount }));
    } catch { /* ignore; items will remain empty */ }
    await generateInvoicePdf(invoice, payments, {
      raisedByName,
      billedToName,
      billedBy: billedByInfo,
      billedTo: billedToInfo,
      items: itemsForPdf,
      footerLogoUrl: "/favicon.png",
      footerText: 'Powered by oneinflu.com',
      footerLinkUrl: 'https://oneinflu.com',
    });
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) return;
      setLoading(true);
      setErrorMessage("");
      try {
        const { data: inv } = await api.get<InvoiceDoc>(`/invoices/${id}`);
        if (cancelled) return;
        setInvoice(inv ?? null);
        const { data: pay } = await api.get<PaymentDoc[]>("/payments", { params: { invoice_id: id } });
        if (cancelled) return;
        setPayments(Array.isArray(pay) ? pay : []);
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
          return "Failed to load invoice.";
        })();
        setErrorMessage(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [id]);

  async function addPayment() {
    if (!id) return;
    setCreating(true);
    setErrorMessage("");
    try {
      const payload: PaymentCreatePayload = {
        invoice_id: id,
        payment_date: pDate,
        amount: Number(pAmount || 0),
        mode: pMode,
        transaction_id: pTxn || undefined,
        remarks: pRemarks || undefined,
        receipt_url: pReceipt || undefined,
        is_verified: pVerified,
        paid_by: invoice?.client ?? undefined,
        received_by: ownerId ?? undefined,
      };
      if (!payload.payment_date || !payload.amount) {
        setErrorMessage("Please fill payment date and amount.");
        setCreating(false);
        return;
      }
      await api.post("/payments", payload);
      const { data: inv } = await api.get<InvoiceDoc>(`/invoices/${id}`);
      setInvoice(inv ?? null);
      const { data: pay } = await api.get<PaymentDoc[]>("/payments", { params: { invoice_id: id } });
      setPayments(Array.isArray(pay) ? pay : []);
      setPDate("");
      setPAmount("");
      setPMode("BANK");
      setPTxn("");
      setPRemarks("");
      setPReceipt("");
      setPVerified(false);
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
        return "Failed to add payment.";
      })();
      setErrorMessage(message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <PageMeta title="Invoice Details" description="Manage payments for invoice" />
      <PageBreadcrumb pageTitle="Invoice Details" />

      <div className="space-y-6">
        <ComponentCard title="Invoice" desc="Overview">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-theme-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Number:</span> {invoice?.invoice_number || ""}</p>
              <p className="text-theme-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Client:</span> {invoice?.client || ""}</p>
              <p className="text-theme-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Issue:</span> {formatDate(invoice?.issue_date)}</p>
              <p className="text-theme-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Due:</span> {formatDate(invoice?.due_date)}</p>
              <p className="text-theme-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Total:</span> {typeof invoice?.total_amount === "number" ? invoice?.total_amount.toFixed(2) : invoice?.total_amount ?? ""} {invoice?.currency || ""}</p>
              <div className="text-theme-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <span className="font-medium">Payment Status:</span>
                {(() => {
                  const status = (invoice?.payment_status || "unpaid").replace(/_/g, " ");
                  const raw = (invoice?.payment_status || "unpaid").toLowerCase();
                  const color = raw === "paid" ? "success" : raw === "cancelled" ? "error" : raw === "overdue" ? "warning" : "info";
                  return <Badge variant="light" size="sm" color={color as any}>{status}</Badge>;
                })()}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate("/invoices")}>Back</Button>
              <Button size="sm" onClick={() => downloadPdf()}>Download PDF</Button>
            </div>
          </div>
          {errorMessage && (
            <div className="mt-3"><Alert variant="error" title="Error" message={errorMessage} /></div>
          )}
        </ComponentCard>

        <ComponentCard title="Add Payment" desc="Record a payment receipt">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="min-w-56">
              <DatePicker
                id="payment-date"
                label="Payment Date"
                defaultDate={pDate || undefined}
                onChange={(_selectedDates, dateStr) => { setPDate(dateStr); }}
                placeholder="Select payment date"
              />
            </div>
            <input type="number" min={0} step={0.01} placeholder="Amount" className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]" value={pAmount} onChange={(e) => setPAmount(e.target.value)} />
            <select className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]" value={pMode} onChange={(e) => setPMode(e.target.value as PaymentMode)}>
              <option value="BANK">Bank</option>
              <option value="UPI">UPI</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="OTHER">Other</option>
            </select>
            <input placeholder="Transaction ID" className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]" value={pTxn} onChange={(e) => setPTxn(e.target.value)} />
            <input placeholder="Receipt URL" className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]" value={pReceipt} onChange={(e) => setPReceipt(e.target.value)} />
            <input placeholder="Remarks" className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]" value={pRemarks} onChange={(e) => setPRemarks(e.target.value)} />
            <label className="inline-flex items-center gap-2 text-theme-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={pVerified} onChange={(e) => setPVerified(e.target.checked)} />
              Verified
            </label>
            <Button size="sm" onClick={() => void addPayment()} disabled={creating}>{creating ? "Adding..." : "Add Payment"}</Button>
          </div>
        </ComponentCard>

        <ComponentCard title="Payments" desc="Receipts recorded against this invoice">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Date</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Amount</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Mode</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Transaction</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Verified</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {loading ? (
                    <TableRow>
                      <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">Loading payments...</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                    </TableRow>
                  ) : payments.length === 0 ? (
                    <TableRow>
                      <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">No payments recorded.</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                    </TableRow>
                  ) : (
                    payments.map((p) => (
                      <TableRow key={p._id}>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{formatDate(p.payment_date)}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{typeof p.amount === "number" ? p.amount.toFixed(2) : String(p.amount)}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{(p.mode || "").toString()}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{p.transaction_id || "—"}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{p.is_verified ? "Yes" : "No"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </ComponentCard>
      </div>
    </>
  );
}