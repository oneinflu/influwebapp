import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";
import Alert from "../components/ui/alert/Alert";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../components/ui/table";
import api from "../utils/api";
import DatePicker from "../components/form/date-picker";

type ProjectDoc = {
  _id: string;
  name: string;
  client: string;
  status?: string;
  approval_status?: string;
  deliverables?: string[];
};

type MilestoneDoc = {
  _id: string;
  name: string;
  description?: string;
  due_date: string;
  amount: number;
  status?: string;
  invoice_attached?: { invoice_id?: string | null };
};

type InvoiceOption = { _id: string; invoice_number: string };
type InvoiceListItem = { _id: string; invoice_number?: string };
type ClientOption = { _id: string; business_name?: string };

function formatDate(d?: string) {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString(); } catch { return String(d); }
}

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<ProjectDoc | null>(null);
  const [milestones, setMilestones] = useState<MilestoneDoc[]>([]);
  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [clientName, setClientName] = useState<string>("");

  // New milestone form state
  const [mName, setMName] = useState<string>("");
  const [mDue, setMDue] = useState<string>("");
  const [mAmount, setMAmount] = useState<string>("");
  const [mDesc, setMDesc] = useState<string>("");
  const [creating, setCreating] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) return;
      setLoading(true);
      setErrorMessage("");
      try {
        const { data: proj } = await api.get<ProjectDoc>(`/projects/${id}`);
        if (cancelled) return;
        setProject(proj ?? null);
        // Resolve client name for display
        if (proj?.client) {
          try {
            const { data: client } = await api.get<ClientOption>(`/clients/${proj.client}`);
            if (!cancelled) setClientName(client?.business_name || client?._id || String(proj.client));
          } catch {
            if (!cancelled) setClientName(String(proj.client));
          }
        } else {
          setClientName("");
        }
        // Load milestones attached to project
        const deliverables = Array.isArray(proj?.deliverables) ? (proj.deliverables as string[]) : [];
        const milestonePromises = deliverables.map((mid) =>
          api.get<MilestoneDoc>(`/milestones/${mid}`).then((r) => r.data).catch(() => null)
        );
        const ms = (await Promise.all(milestonePromises)).filter(Boolean) as MilestoneDoc[];
        setMilestones(ms);
        // Load invoices for this project's client to allow attaching
        if (proj?.client) {
          const { data } = await api.get<InvoiceListItem[]>("/invoices", { params: { client: proj.client } });
          const raw = Array.isArray(data) ? data : [];
          const opts: InvoiceOption[] = raw.map((i) => {
            const idStr = i?._id != null ? String(i._id) : "";
            const invNum = i?.invoice_number != null ? String(i.invoice_number) : (idStr ? idStr.slice(-6) : "");
            return { _id: idStr, invoice_number: invNum };
          });
          setInvoices(opts);
        } else {
          setInvoices([]);
        }
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
          return "Failed to load project.";
        })();
        setErrorMessage(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [id]);

  async function createMilestone() {
    if (!id) return;
    setCreating(true);
    setErrorMessage("");
    try {
      const payload = {
        name: mName.trim(),
        due_date: mDue,
        amount: Number(mAmount || 0),
        description: mDesc.trim() || undefined,
      };
      if (!payload.name || !payload.due_date || !payload.amount) {
        setErrorMessage("Please fill name, due date and amount.");
        setCreating(false);
        return;
      }
      const { data: created } = await api.post<MilestoneDoc>("/milestones", payload);
      await api.post(`/milestones/${created._id}/attach-to-project`, { project_id: id });
      // Reset form and reload
      setMName("");
      setMDue("");
      setMAmount("");
      setMDesc("");
      // Reload project and milestones
      const { data: proj } = await api.get<ProjectDoc>(`/projects/${id}`);
      setProject(proj ?? null);
      if (proj?.client) {
        try {
          const { data: client } = await api.get<ClientOption>(`/clients/${proj.client}`);
          setClientName(client?.business_name || client?._id || String(proj.client));
        } catch {
          setClientName(String(proj.client));
        }
      } else {
        setClientName("");
      }
      const deliverables = Array.isArray(proj?.deliverables) ? (proj.deliverables as string[]) : [];
      const milestonePromises = deliverables.map((mid) =>
        api.get<MilestoneDoc>(`/milestones/${mid}`).then((r) => r.data).catch(() => null)
      );
      const ms = (await Promise.all(milestonePromises)).filter(Boolean) as MilestoneDoc[];
      setMilestones(ms);
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
        return "Failed to create milestone.";
      })();
      setErrorMessage(message);
    } finally {
      setCreating(false);
    }
  }

  async function attachInvoice(milestoneId: string, invoiceId: string) {
    setErrorMessage("");
    try {
      if (!invoiceId) {
        setErrorMessage("Select an invoice to attach.");
        return;
      }
      await api.post(`/milestones/${milestoneId}/attach-invoice`, { invoice_id: invoiceId });
      // update local milestone state
      setMilestones((prev) => prev.map((m) => (m._id === milestoneId ? { ...m, invoice_attached: { invoice_id: invoiceId } } : m)));
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
        return "Failed to attach invoice.";
      })();
      setErrorMessage(message);
    }
  }

  return (
    <>
      <PageMeta title="Project Details" description="Manage milestones for project" />
      <PageBreadcrumb pageTitle="Project Details" />

      <div className="space-y-6">
        <ComponentCard title="Project" desc="Overview">
          <div className="flex items-center justify-between">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-2">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Name</p>
                <div className="text-sm text-gray-900 dark:text-white/90">{project?.name || "—"}</div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Client</p>
                <div className="mt-1 inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700 dark:bg-white/10 dark:text-gray-200">
                  {clientName || project?.client || "—"}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</p>
                <div className="mt-1 inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700 dark:bg-white/10 dark:text-gray-200">
                  {(project?.status || "draft").replace(/_/g, " ")}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Approval</p>
                <div className="mt-1 inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700 dark:bg-white/10 dark:text-gray-200">
                  {(project?.approval_status || "awaiting_approval").replace(/_/g, " ")}
                </div>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate("/projects")}>Back</Button>
          </div>
          {errorMessage && (
            <div className="mt-3"><Alert variant="error" title="Error" message={errorMessage} /></div>
          )}
        </ComponentCard>

        <ComponentCard title="Milestones" desc="Deliverables and billing milestones">
          {errorMessage && (
            <div className="-mt-2 mb-2">
              <Alert variant="error" title="Error" message={errorMessage} />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-2">
              <input
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]"
                placeholder="Milestone name"
                value={mName}
                onChange={(e) => setMName(e.target.value)}
              />
              <input
                className="hidden"
              />
              <DatePicker
                id="milestone-due-date"
                label={undefined}
                placeholder="Due date"
                defaultDate={mDue || undefined}
                onChange={(_selectedDates, dateStr) => setMDue(dateStr)}
              />
              <input
                type="number"
                min={0}
                step={0.01}
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]"
                placeholder="Amount"
                value={mAmount}
                onChange={(e) => setMAmount(e.target.value)}
              />
              <input
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]"
                placeholder="Description (optional)"
                value={mDesc}
                onChange={(e) => setMDesc(e.target.value)}
              />
              <Button size="sm" onClick={() => void createMilestone()} disabled={creating}>{creating ? "Adding..." : "Add Milestone"}</Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] mt-4">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Name</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Due</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Amount</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Invoice</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {loading ? (
                    <TableRow>
                      <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">Loading milestones...</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                    </TableRow>
                  ) : milestones.length === 0 ? (
                    <TableRow>
                      <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">No milestones yet.</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                    </TableRow>
                  ) : (
                    milestones.map((m) => (
                      <TableRow key={m._id}>
                        <TableCell className="px-5 py-4 sm:px-6 text-start">
                          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">{m.name}</span>
                          {m.description && (<span className="block text-theme-xs text-gray-500 dark:text-gray-400">{m.description}</span>)}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{formatDate(m.due_date)}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{typeof m.amount === "number" ? m.amount.toFixed(2) : String(m.amount)}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{(m.status || "yet_to_start").replace(/_/g, " ")}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          {m.invoice_attached?.invoice_id ? (
                            <span className="inline-block rounded-md bg-gray-100 dark:bg-white/[0.06] px-2 py-1 text-theme-xs">Attached</span>
                          ) : (
                            <span className="inline-block rounded-md bg-gray-100 dark:bg-white/[0.06] px-2 py-1 text-theme-xs">None</span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-start">
                          <div className="flex items-center gap-2">
                            {!m.invoice_attached?.invoice_id && (
                              <select
                                className="px-2 py-1 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]"
                                defaultValue=""
                                onChange={(e) => void attachInvoice(m._id, e.target.value)}
                              >
                                <option value="">Attach invoice...</option>
                                {invoices.map((inv) => (
                                  <option key={inv._id} value={inv._id}>{inv.invoice_number}</option>
                                ))}
                              </select>
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
    </>
  );
}