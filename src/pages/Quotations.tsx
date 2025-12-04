import { useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";
import Alert from "../components/ui/alert/Alert";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../components/ui/table";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router";
import { Modal } from "../components/ui/modal/index";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import Select from "../components/form/Select";
import TagInput from "../components/form/input/TagInput";
import Checkbox from "../components/form/input/Checkbox";

interface QuotationItem {
  _id: string;
  clientId?: string;
  serviceId?: string;
  rateCardId?: string;
  deliverables?: string[];
  quantity?: number;
  totalCost?: number;
  taxes?: { gstPercent?: number };
  paymentTerms?: string[];
  validity?: number;
  addOns?: Array<{ name?: string; price?: number }>;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface ClientOption {
  _id: string;
  business_name?: string;
}

interface ServiceOption {
  _id: string;
  name?: string;
}

interface RateCardOption {
  _id: string;
  title?: string;
  serviceId?: string;
}

function formatDate(d?: string) {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString(); } catch { return String(d); }
}

export default function Quotations() {
  const navigate = useNavigate();
  const { type, user } = useAuth();
  const ownerId = useMemo(() => (type === "user" ? user?._id ?? null : null), [type, user]);
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [rateCards, setRateCards] = useState<RateCardOption[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationItem | null>(null);
  const [editingQuotation, setEditingQuotation] = useState<QuotationItem | null>(null);
  const [deletingQuotation, setDeletingQuotation] = useState<QuotationItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      if (!ownerId) return;
      setLoading(true);
      setErrorMessage("");
      try {
        const [quotationsRes, clientsRes, servicesRes, rateCardsRes] = await Promise.all([
          api.get(`/quotations/user/${ownerId}`),
          api.get(`/clients/user/${ownerId}`),
          api.get(`/services`, { params: { user_id: ownerId } }),
          api.get(`/rate-cards/user/${ownerId}`),
        ]);
        if (!cancelled) {
          setItems(Array.isArray(quotationsRes.data) ? quotationsRes.data : []);
          setClients(Array.isArray(clientsRes.data) ? clientsRes.data : []);
          setServices(Array.isArray(servicesRes.data) ? servicesRes.data : []);
          setRateCards(Array.isArray(rateCardsRes.data) ? rateCardsRes.data : []);
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
          return "Failed to load data.";
        })();
        setErrorMessage(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [ownerId]);

  const clientMap = useMemo(() => new Map(clients.map(c => [c._id, c.business_name])), [clients]);
  const serviceMap = useMemo(() => new Map(services.map(s => [s._id, s.name])), [services]);
  const rateCardMap = useMemo(() => new Map(rateCards.map(r => [r._id, r.title])), [rateCards]);


  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuotation) return;
    try {
      const res = await api.put(`/quotations/${editingQuotation._id}`, editingQuotation);
      setItems(items.map(item => item._id === editingQuotation._id ? res.data : item));
      setEditingQuotation(null);
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to update quotation.");
    }
  };

  const handleDelete = async () => {
    if (!deletingQuotation) return;
    try {
      await api.delete(`/quotations/${deletingQuotation._id}`);
      setItems(items.filter(item => item._id !== deletingQuotation._id));
      setDeletingQuotation(null);
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to delete quotation.");
    }
  };

  return (
    <>
      <PageMeta title="Quotations" description="Manage quotations" />
      <PageBreadcrumb pageTitle="Quotations" />
      <div className="space-y-6">
        <ComponentCard title="Quotations" desc="List of quotations">
          {errorMessage && (
            <Alert variant="error" title="Error" message={errorMessage} />
          )}

          <div className="flex items-center justify-end">
            <Button size="sm" variant="primary" onClick={() => navigate("/quotations/new")}>Add Quotation</Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] mt-6">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Client</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Service</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Rate Card</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Quantity</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Total</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">GST %</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Validity (days)</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Active</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Created</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Updated</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Actions</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {loading ? (
                    <TableRow>
                      <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">Loading quotations...</TableCell>
                      <TableCell>{''}</TableCell>
                      <TableCell>{''}</TableCell>
                      <TableCell>{''}</TableCell>
                      <TableCell>{''}</TableCell>
                      <TableCell>{''}</TableCell>
                      <TableCell>{''}</TableCell>
                      <TableCell>{''}</TableCell>
                      <TableCell>{''}</TableCell>
                      <TableCell>{''}</TableCell>
                      <TableCell>{''}</TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">No quotations found.</TableCell>
                      <TableCell>{''}</TableCell>
                      <TableCell>{''}</TableCell>
                      <TableCell>{''}</TableCell>
                      <TableCell>{''}</TableCell>
                      <TableCell>{''}</TableCell>
                      <TableCell>{''}</TableCell>
                      <TableCell>{''}</TableCell>
                      <TableCell>{''}</TableCell>
                      <TableCell>{''}</TableCell>
                      <TableCell>{''}</TableCell>
                    </TableRow>
                  ) : (
                    items.map((q) => (
                      <TableRow key={q._id}>
                        <TableCell className="px-5 py-4 sm:px-6 text-start">
                          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">{clientMap.get(q.clientId || "") || "—"}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-700 text-start text-theme-sm dark:text-gray-300">{serviceMap.get(q.serviceId || "") || "—"}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-700 text-start text-theme-sm dark:text-gray-300">{rateCardMap.get(q.rateCardId || "") || "—"}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-700 text-start text-theme-sm dark:text-gray-300">{typeof q.quantity === "number" ? q.quantity : "—"}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-700 text-start text-theme-sm dark:text-gray-300">{typeof q.totalCost === "number" ? `₹ ${q.totalCost.toLocaleString()}` : "—"}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-700 text-start text-theme-sm dark:text-gray-300">{typeof q.taxes?.gstPercent === "number" ? q.taxes!.gstPercent! : "—"}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-700 text-start text-theme-sm dark:text-gray-300">{typeof q.validity === "number" ? q.validity : "—"}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{q.isActive ? "Yes" : "No"}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{formatDate(q.createdAt)}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{formatDate(q.updatedAt)}</TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setSelectedQuotation(q)} startIcon={<Eye className="h-4 w-4" />}>{"\u0000"}</Button>
                            <Button variant="outline" size="sm" onClick={() => setEditingQuotation(q)} startIcon={<Pencil className="h-4 w-4" />}>{""}</Button>
                            <Button variant="outline" size="sm" onClick={() => setDeletingQuotation(q)} startIcon={<Trash2 className="h-4 w-4" />}>{""}</Button>
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
      {selectedQuotation && (
        <Modal isOpen={!!selectedQuotation} onClose={() => setSelectedQuotation(null)} className="max-w-[700px] m-4">
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Quotation Details</h3>
            <div><strong>Client:</strong> {clientMap.get(selectedQuotation.clientId || "") || "—"}</div>
            <div><strong>Service:</strong> {serviceMap.get(selectedQuotation.serviceId || "") || "—"}</div>
            <div><strong>Rate Card:</strong> {rateCardMap.get(selectedQuotation.rateCardId || "") || "—"}</div>
            <div><strong>Quantity:</strong> {selectedQuotation.quantity}</div>
            <div><strong>Total Cost:</strong> {selectedQuotation.totalCost}</div>
            <div><strong>GST %:</strong> {selectedQuotation.taxes?.gstPercent}</div>
            <div><strong>Validity:</strong> {selectedQuotation.validity} days</div>
            <div><strong>Deliverables:</strong></div>
            <ul className="list-disc list-inside">
              {selectedQuotation.deliverables?.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
            <div><strong>Payment Terms:</strong></div>
            <ul className="list-disc list-inside">
              {selectedQuotation.paymentTerms?.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
            <div><strong>Add-ons:</strong></div>
            <ul className="list-disc list-inside">
              {selectedQuotation.addOns?.map((a, i) => <li key={i}>{a.name}: {a.price}</li>)}
            </ul>
          </div>
        </Modal>
      )}

      {editingQuotation && (
        <Modal isOpen={!!editingQuotation} onClose={() => setEditingQuotation(null)} className="max-w-[700px] m-4">
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Edit Quotation</h3>
            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label>Client</Label>
                  <Select
                    options={clients.map((c) => ({ value: c._id, label: c.business_name || c._id }))}
                    defaultValue={editingQuotation.clientId}
                    onChange={(v) => setEditingQuotation({ ...editingQuotation, clientId: String(v) })}
                  />
                </div>
                <div>
                  <Label>Service</Label>
                  <Select
                    options={services.map((s) => ({ value: s._id, label: s.name || s._id }))}
                    defaultValue={editingQuotation.serviceId}
                    onChange={(v) => setEditingQuotation({ ...editingQuotation, serviceId: String(v), rateCardId: '' })}
                  />
                </div>
                <div>
                  <Label>Rate Card</Label>
                  <Select
                    options={rateCards.filter(rc => !editingQuotation.serviceId || rc.serviceId === editingQuotation.serviceId).map(r => ({ value: r._id, label: r.title || r._id }))}
                    defaultValue={editingQuotation.rateCardId}
                    onChange={(v) => setEditingQuotation({ ...editingQuotation, rateCardId: String(v) })}
                  />
                </div>
                <div>
                  <Label>Quantity</Label>
                  <Input type="number" value={String(editingQuotation.quantity || '')} onChange={(e) => setEditingQuotation({ ...editingQuotation, quantity: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Total Cost</Label>
                  <Input type="number" value={String(editingQuotation.totalCost || '')} onChange={(e) => setEditingQuotation({ ...editingQuotation, totalCost: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>GST %</Label>
                  <Select
                    options={[
                      { value: "0", label: "No GST / 0%" },
                      { value: "5", label: "5%" },
                      { value: "18", label: "18%" },
                      { value: "40", label: "40%" },
                    ]}
                    defaultValue={String(editingQuotation.taxes?.gstPercent || '')}
                    onChange={(v) => setEditingQuotation({ ...editingQuotation, taxes: { gstPercent: Number(v) } })}
                  />
                </div>
                <div>
                  <Label>Validity (days)</Label>
                  <Input type="number" value={String(editingQuotation.validity || '')} onChange={(e) => setEditingQuotation({ ...editingQuotation, validity: Number(e.target.value) })} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Deliverables</Label>
                  <TagInput values={editingQuotation.deliverables || []} onChange={(v) => setEditingQuotation({ ...editingQuotation, deliverables: v })} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Payment Terms</Label>
                  <div className="space-y-2">
                    {editingQuotation.paymentTerms?.map((pt, idx) => (
                      <div key={`pt-${idx}`} className="flex items-center gap-2">
                        <Input value={pt} onChange={(e) => {
                          const newPaymentTerms = [...(editingQuotation.paymentTerms || [])];
                          newPaymentTerms[idx] = e.target.value;
                          setEditingQuotation({ ...editingQuotation, paymentTerms: newPaymentTerms });
                        }} />
                        <Button type="button" variant="outline" size="sm" onClick={() => {
                          const newPaymentTerms = [...(editingQuotation.paymentTerms || [])];
                          newPaymentTerms.splice(idx, 1);
                          setEditingQuotation({ ...editingQuotation, paymentTerms: newPaymentTerms });
                        }}>Remove</Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => {
                      const newPaymentTerms = [...(editingQuotation.paymentTerms || []), ''];
                      setEditingQuotation({ ...editingQuotation, paymentTerms: newPaymentTerms });
                    }}>Add payment term</Button>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <Label>Add-ons</Label>
                  <div className="space-y-2">
                    {editingQuotation.addOns?.map((ad, idx) => (
                      <div key={`ad-${idx}`} className="grid grid-cols-1 gap-2 sm:grid-cols-6">
                        <div className="sm:col-span-4">
                          <Input placeholder="Name" value={ad.name} onChange={(e) => {
                            const newAddOns = [...(editingQuotation.addOns || [])];
                            newAddOns[idx] = { ...newAddOns[idx], name: e.target.value };
                            setEditingQuotation({ ...editingQuotation, addOns: newAddOns });
                          }} />
                        </div>
                        <div className="sm:col-span-2 flex items-center gap-2">
                          <Input type="number" placeholder="Price" value={String(ad.price)} onChange={(e) => {
                            const newAddOns = [...(editingQuotation.addOns || [])];
                            newAddOns[idx] = { ...newAddOns[idx], price: Number(e.target.value) };
                            setEditingQuotation({ ...editingQuotation, addOns: newAddOns });
                          }} />
                          <Button type="button" variant="outline" size="sm" onClick={() => {
                            const newAddOns = [...(editingQuotation.addOns || [])];
                            newAddOns.splice(idx, 1);
                            setEditingQuotation({ ...editingQuotation, addOns: newAddOns });
                          }}>Remove</Button>
                        </div>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => {
                      const newAddOns = [...(editingQuotation.addOns || []), { name: '', price: 0 }];
                      setEditingQuotation({ ...editingQuotation, addOns: newAddOns });
                    }}>Add add-on</Button>
                  </div>
                </div>
                <div>
                  <Checkbox label="Active" checked={editingQuotation.isActive ?? false} onChange={(v) => setEditingQuotation({ ...editingQuotation, isActive: v })} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button type="submit" variant="primary">Save Changes</Button>
                <Button type="button" variant="outline" onClick={() => setEditingQuotation(null)}>Cancel</Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {deletingQuotation && (
        <Modal isOpen={!!deletingQuotation} onClose={() => setDeletingQuotation(null)} className="max-w-[700px] m-4">
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Delete Quotation</h3>
            <p>Are you sure you want to delete this quotation? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeletingQuotation(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleDelete}>Delete</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
