import { AlertIcon, BoxIconLine, DollarLineIcon, GroupIcon, UserIcon } from "../../icons";

type Props = {
  clients: number;
  collaborators: number;
  invoices: number;
  paymentsReceived: string; // formatted currency
  paymentDue: string; // formatted currency
  overdueInvoices: number;
  loading?: boolean;
};

export default function FinanceOverview({
  clients,
  collaborators,
  invoices,
  paymentsReceived,
  paymentDue,
  overdueInvoices,
  loading,
}: Props) {
  const Card = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) => (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
        {icon}
      </div>
      <div className="mt-5">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">{loading ? "—" : value}</h4>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 md:gap-6">
      <Card icon={<GroupIcon className="text-gray-800 size-6 dark:text-white/90" />} label="Customers" value={clients.toLocaleString()} />
      <Card icon={<UserIcon className="text-gray-800 size-6 dark:text-white/90" />} label="Collaborators" value={collaborators.toLocaleString()} />
      <Card icon={<BoxIconLine className="text-gray-800 size-6 dark:text-white/90" />} label="Invoices" value={invoices.toLocaleString()} />
      <Card icon={<DollarLineIcon className="text-gray-800 size-6 dark:text-white/90" />} label="Payments Received" value={paymentsReceived} />
      <Card icon={<DollarLineIcon className="text-gray-800 size-6 dark:text-white/90" />} label="Payment Due" value={paymentDue} />
      <Card icon={<AlertIcon className="text-gray-800 size-6 dark:text-white/90" />} label="Overdue Invoices" value={overdueInvoices.toLocaleString()} />
    </div>
  );
}