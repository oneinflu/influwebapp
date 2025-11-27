
import FinanceOverview from "../../components/ecommerce/FinanceOverview";


import PageMeta from "../../components/common/PageMeta";
import { useEffect, useMemo, useState } from "react";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

type InvoiceDoc = {
  _id: string;
  invoice_number?: string;
  issue_date?: string;
  total?: number;
  currency?: string;
  payment_status?: string;
  client?: string;
};

type ClientDoc = {
  _id: string;
  business_name?: string;
  logo?: string;
  created_at?: string;
};

type PaymentDoc = {
  _id: string;
  amount: number;
  payment_date?: string;
  invoice_id?: string;
};
type CollaboratorDoc = {
  _id: string;
  status?: string;
  type?: string;
};

function formatCurrency(amount: number, currency = "INR") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `₹${amount.toFixed(0)}`;
  }
}

export default function Home() {
  const { type, user } = useAuth();
  const ownerId = type === "user" ? user?._id : undefined;

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceDoc[]>([]);
  const [payments, setPayments] = useState<PaymentDoc[]>([]);
  const [clients, setClients] = useState<ClientDoc[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorDoc[]>([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const [{ data: invRes }, { data: payRes }, { data: cliRes }, { data: colRes }] = await Promise.all([
          api.get("/invoices", { params: ownerId ? { created_by: ownerId } : undefined }),
          api.get("/payments", { params: ownerId ? { received_by: ownerId } : undefined }),
          api.get("/clients", { params: ownerId ? { user_id: ownerId } : undefined }),
          api.get("/collaborators", { params: ownerId ? { managed_by: ownerId } : undefined }),
        ]);
        if (!mounted) return;
        setInvoices(invRes?.items || invRes || []);
        setPayments(payRes?.items || payRes || []);
        setClients(cliRes?.items || cliRes || []);
        setCollaborators(colRes?.items || colRes || []);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Failed to load dashboard data", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [ownerId]);


  // Sum of payments per invoice (for outstanding due computation)
  const paymentsByInvoice = useMemo(() => {
    const map = new Map<string, number>();
    payments.forEach((p) => {
      if (p.invoice_id) {
        map.set(p.invoice_id, (map.get(p.invoice_id) || 0) + (p.amount || 0));
      }
    });
    return map;
  }, [payments]);

  const totalPaymentsReceived = useMemo(() => {
    return payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [payments]);

  const totalPaymentDue = useMemo(() => {
    return invoices
      .filter((inv) => inv.payment_status !== "paid" && inv.payment_status !== "cancelled")
      .reduce((sum, inv) => {
        const paid = paymentsByInvoice.get(inv._id) || 0;
        const total = inv.total || 0;
        return sum + Math.max(0, total - paid);
      }, 0);
  }, [invoices, paymentsByInvoice]);

  const overdueInvoicesCount = useMemo(() => {
    return invoices.filter((inv) => inv.payment_status === "overdue").length;
  }, [invoices]);

  const currencyLabel = useMemo(() => invoices[0]?.currency || "INR", [invoices]);

 
 

  
  return (
    <>
      <PageMeta
        title="React.js Ecommerce Dashboard | TailAdmin - React.js Admin Dashboard Template"
        description="This is React.js Ecommerce Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
      />
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12">
          <FinanceOverview
            clients={clients.length}
            collaborators={collaborators.length}
            invoices={invoices.length}
            paymentsReceived={formatCurrency(totalPaymentsReceived, currencyLabel)}
            paymentDue={formatCurrency(totalPaymentDue, currencyLabel)}
            overdueInvoices={overdueInvoicesCount}
            loading={loading}
          />
        </div>
        

        
      </div>
    </>
  );
}
