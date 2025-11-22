import { useEffect, useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import Alert from "../components/ui/alert/Alert";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../components/ui/table";
import api from "../utils/api";

interface CategoryItem {
  _id: string;
  name: string;
  slug: string;
  parent?: string | null;
  is_active?: boolean;
}

export default function Categories() {
  const [items, setItems] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function fetchCategories() {
      setLoading(true);
      setErrorMessage("");
      try {
        const { data } = await api.get("/categories", { params: { is_active: "true" } });
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
          return "Failed to load categories.";
        })();
        setErrorMessage(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchCategories();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <PageMeta title="Categories" description="View system categories" />
      <PageBreadcrumb pageTitle="Categories" />
      <div className="space-y-6">
        <ComponentCard title="Categories">
          <p className="text-sm text-gray-500 dark:text-gray-400">System categories used across catalog and taxonomy.</p>

          {errorMessage && (
            <Alert variant="error" title="Error" message={errorMessage} />
          )}

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Name</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Slug</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Parent</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Active</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {loading ? (
                    <TableRow>
                      <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">Loading categories...</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">No categories found.</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                      <TableCell>{""}</TableCell>
                    </TableRow>
                  ) : (
                    items.map((c) => (
                      <TableRow key={c._id}>
                        <TableCell className="px-5 py-4 sm:px-6 text-start">
                          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">{c.name}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          {c.slug}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          {c.parent ? String(c.parent) : "—"}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                          {c.is_active ? "Yes" : "No"}
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