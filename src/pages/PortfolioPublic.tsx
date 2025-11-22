import { useEffect, useState } from "react";
import { useParams } from "react-router";
import Alert from "../components/ui/alert/Alert";
import api from "../utils/api";

type PortfolioItem = {
  _id: string;
  type: "image" | "video" | "audio" | "document";
  media_url: string;
  thumbnail_url?: string;
  title?: string;
  description?: string;
};

export default function PortfolioPublic() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<PortfolioItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) return;
      setLoading(true);
      setErrorMessage("");
      try {
        const { data } = await api.get(`/portfolios/${id}`);
        if (!cancelled) setItem(data || null);
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
          return "Unable to load item.";
        })();
        setErrorMessage(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return <div className="p-6 text-gray-600 dark:text-gray-400">Loading...</div>;
  }
  if (errorMessage) {
    return <div className="p-6 max-w-xl mx-auto"><Alert variant="error" title="Error" message={errorMessage} /></div>;
  }
  if (!item) {
    return <div className="p-6 text-gray-600 dark:text-gray-400">Item not found</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800 bg-white dark:bg-white/[0.03]">
        <h1 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">{item.title || "Portfolio Item"}</h1>
        {item.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{item.description}</p>
        )}
        <div className="aspect-video mb-3 overflow-hidden rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center">
          {item.type === "image" && (
           
            <img src={item.media_url} alt={item.title || "media"} className="w-full h-full object-contain" />
          )}
          {item.type === "video" && (
            <video src={item.media_url} controls className="w-full h-full" />
          )}
          {item.type === "audio" && (
            <audio src={item.media_url} controls className="w-full" />
          )}
          {item.type === "document" && (
            <a href={item.media_url} target="_blank" rel="noreferrer" className="text-brand-500 underline">Open Document</a>
          )}
        </div>
      </div>
    </div>
  );
}