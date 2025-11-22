import { ArrowDownIcon, ArrowUpIcon, BoxIconLine, GroupIcon } from "../../icons";
import Badge from "../ui/badge/Badge";

type Props = {
  customers: number;
  customersDeltaPct?: number;
  orders: number;
  ordersDeltaPct?: number;
  loading?: boolean;
};

export default function EcommerceMetrics({
  customers,
  customersDeltaPct = 0,
  orders,
  ordersDeltaPct = 0,
  loading,
}: Props) {
  const custUp = customersDeltaPct >= 0;
  const ordersUp = ordersDeltaPct >= 0;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
      {/* <!-- Metric Item Start --> */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <GroupIcon className="text-gray-800 size-6 dark:text-white/90" />
        </div>

        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Customers</span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {loading ? "—" : customers.toLocaleString()}
            </h4>
          </div>
          <Badge color={custUp ? "success" : "error"}>
            {custUp ? <ArrowUpIcon /> : <ArrowDownIcon />}
            {loading ? "—" : `${Math.abs(customersDeltaPct).toFixed(2)}%`}
          </Badge>
        </div>
      </div>
      {/* <!-- Metric Item End --> */}

      {/* <!-- Metric Item Start --> */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <BoxIconLine className="text-gray-800 size-6 dark:text-white/90" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Orders</span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {loading ? "—" : orders.toLocaleString()}
            </h4>
          </div>

        
          <Badge color={ordersUp ? "success" : "error"}>
            {ordersUp ? <ArrowUpIcon /> : <ArrowDownIcon />}
            {loading ? "—" : `${Math.abs(ordersDeltaPct).toFixed(2)}%`}
          </Badge>
        </div>
      </div>
      {/* <!-- Metric Item End --> */}
    </div>
  );
}
