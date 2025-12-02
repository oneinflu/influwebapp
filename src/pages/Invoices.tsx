/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb.tsx";
import ComponentCard from "../components/common/ComponentCard.tsx";
import PageMeta from "../components/common/PageMeta.tsx";
import Button from "../components/ui/button/Button.tsx";
import Alert from "../components/ui/alert/Alert.tsx";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../components/ui/table/index.tsx";
import Badge from "../components/ui/badge/Badge.tsx";
import api from "../utils/api.ts";
import { useAuth } from "../context/AuthContext.tsx";
import { useNavigate } from "react-router";
import PermissionGate from "../components/common/PermissionGate.tsx";
import DatePicker from "../components/form/date-picker.tsx";
import { generateInvoicePdf } from "../utils/invoicePdf.ts";

type InvoiceItem = {
  _id: string;
  invoice_number: string;
  issue_date: string;
  due_date?: string;
  currency?: "INR" | "USD" | "EUR" | "GBP";
  tax_percentage?: number;
  subtotal?: number;
  total?: number;
  payment_status?: "pending" | "partially_paid" | "paid" | "overdue" | "cancelled";
  pdf_url?: string;
  created_by: string;
  client: string;
  project?: string;
};

function formatDate(d?: string) {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString(); } catch { return String(d); }
}

export default function Invoices() {
  const navigate = useNavigate();
  const { type, user } = useAuth();
  const ownerId = useMemo(() => (type === "user" ? user?._id ?? null : null), [type, user]);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [paymentStatus, setPaymentStatus] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [clientMap, setClientMap] = useState<Record<string, string>>({});

  async function downloadInvoicePdf(id: string) {
    try {
      const { data: inv } = await api.get(`/invoices/${id}`);
      const { data: pay } = await api.get(`/payments`, { params: { invoice_id: id } });
      const raisedByName = (user?.profile?.displayName || (user as any)?.registration?.name || "").trim();
      // Resolve client display name from ObjectID if needed
      let billedToName = (inv?.client || "").toString();
      let billedToInfo: { name?: string; address?: string; gst?: string; pan?: string; email?: string; phone?: string } | undefined;
      try {
        if (inv?.client) {
          const { data: client } = await api.get<{ _id: string; business_name?: string; address?: string; gst_number?: string; pan_number?: string; point_of_contact?: { name?: string; phone?: string; email?: string }; location?: { country?: string; city?: string; town?: string; pincode?: string } }>(`/clients/${inv.client}`);
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
        itemsForPdf = (Array.isArray(allMilestones) ? allMilestones : [])
          .filter((m) => m?.invoice_attached?.invoice_id && String(m.invoice_attached.invoice_id) === String(id))
          .map((m) => ({ name: m?.name, description: m?.description, due_date: m?.due_date, amount: m?.amount }));
      } catch { /* ignore; items will remain empty */ }
      await generateInvoicePdf(inv as any, Array.isArray(pay) ? (pay as any[]) : [], {
        raisedByName,
        billedToName,
        billedBy: billedByInfo,
        billedTo: billedToInfo,
        items: itemsForPdf,
        footerLogoUrl: "/favicon.png",
        footerText: 'Powered by oneinflu.com',
        footerLinkUrl: 'https://oneinflu.com',
      });
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
        return "Failed to prepare PDF.";
      })();
      setErrorMessage(message);
    }
  }

  async function load() {
    if (!ownerId) return;
    setLoading(true);
    setErrorMessage("");
    try {
      const params: Record<string, string> = { created_by: ownerId };
      if (q.trim()) params.q = q.trim();
      if (paymentStatus) params.payment_status = paymentStatus;
      if (from) params.from = from;
      if (to) params.to = to;
      const [{ data: invData }, { data: clientsResp }] = await Promise.all([
        api.get(`/invoices/user/${ownerId}`, { params }),
        api.get(`/clients/user/${ownerId}`),
      ]);
      setItems(Array.isArray(invData) ? invData : []);
      const cmap: Record<string, string> = {};
      (Array.isArray(clientsResp) ? clientsResp : []).forEach((c: any) => {
        if (c && c._id) cmap[String(c._id)] = String(c.business_name || c._id);
      });
      setClientMap(cmap);
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
        return "Failed to load invoices.";
      })();
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId]);

  async function cancelInvoice(id: string) {
    setErrorMessage("");
    try {
      await api.post(`/invoices/${id}/cancel`);
      await load();
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
        return "Failed to cancel invoice.";
      })();
      setErrorMessage(message);
    }
  }

  return (
    <>
      <PageMeta title="Invoices" description="Track invoices and payments" />
      <PageBreadcrumb pageTitle="Invoices" />

      <PermissionGate group="invoices">
      <div className="space-y-6">
        <ComponentCard title="Invoices" desc="List and manage your invoices">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-2">
              <input
                className="h-11 px-3 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]"
                placeholder="Search invoice number"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <select
                className="h-11 px-3 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]"
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <DatePicker
                id="inv-filter-from"
                defaultDate={from || undefined}
                onChange={(_selectedDates, dateStr) => { setFrom(dateStr); }}
                placeholder="From"
              />
              <DatePicker
                id="inv-filter-to"
                defaultDate={to || undefined}
                onChange={(_selectedDates, dateStr) => { setTo(dateStr); }}
                placeholder="To"
              />
              <Button size="sm" variant="outline" onClick={() => void load()}>Apply</Button>
            </div>
            <Button size="sm" onClick={() => navigate("/invoices/new")}>Add Invoice</Button>
          </div>

          {errorMessage && (
            <div className="mt-3"><Alert variant="error" title="Error" message={errorMessage} /></div>
          )}

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] mt-4">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Invoice #</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Client</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Issue Date</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Due Date</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Subtotal</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Tax %</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Total</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Currency</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {loading ? (
                    <TableRow>
                      <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">Loading invoices...</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">No invoices found.</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                    </TableRow>
                  ) : (
                      items.map((inv) => (
                        <TableRow key={inv._id}>
                          <TableCell className="px-5 py-4 sm:px-6 text-start">
                          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">{(inv as any).invoiceNo || (inv as any).invoice_number}</span>
                          </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{(() => { const cid = (inv as any).client || (inv as any).clientId; return clientMap[cid] || cid; })()}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{formatDate((inv as any).issue_date || (inv as any).issuedAt)}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{formatDate((inv as any).due_date || (inv as any).dueDate)}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{(() => { const sub = (inv as any).subtotal ?? (inv as any).subTotal; return typeof sub === "number" ? sub.toFixed(2) : "0.00"; })()}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{(() => { const pct = (inv as any).tax_percentage ?? ((Array.isArray((inv as any).taxes) && (inv as any).taxes[0]?.ratePercent) || undefined); return typeof pct === "number" ? pct.toFixed(2) : "0.00"; })()}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{(() => { const tt = (inv as any).total ?? (inv as any).total_amount; return typeof tt === "number" ? tt.toFixed(2) : "0.00"; })()}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{(inv as any).currency || "INR"}</TableCell>
                        <TableCell className="px-4 py-3 text-start">
                          {(() => {
                            const rawStatus = ((inv as any).payment_status || (inv as any).status || "pending").toString();
                            const label = rawStatus.replace(/_/g, " ");
                            const s = rawStatus.toLowerCase();
                            const color = s === "paid" ? "success" : s === "cancelled" ? "error" : s === "overdue" ? "warning" : "info";
                            return <Badge variant="light" size="sm" color={color as any}>{label}</Badge>;
                          })()}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-start">
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => void downloadInvoicePdf(inv._id)}>Download PDF</Button>
                            <Button size="sm" variant="outline" onClick={() => navigate(`/invoices/${inv._id}`)}>Payments</Button>
                            {inv.payment_status !== "cancelled" && inv.payment_status !== "paid" && (
                              <Button size="sm" variant="outline" onClick={() => void cancelInvoice(inv._id)}>Cancel</Button>
                            )}
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
    </>
  );
}
