import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

type ShareData = { title?: string; text?: string; url?: string };
type NavigatorWithShare = Navigator & { share?: (data: ShareData) => Promise<void> };

export default function SidebarWidget() {
  const { user } = useAuth();

  const profileSlug = useMemo(() => {
    const prof = user?.profile as Record<string, unknown> | undefined;
    const slug = prof && typeof prof["slug"] === "string" ? (prof["slug"] as string) : undefined;
    const id = user?._id ? String(user._id) : undefined;
    return slug || (id ? id.slice(-6) : "");
  }, [user]);
  const publicUrl = `https://oneinflu.com/profile/${profileSlug}`;

  const [, setCopied] = useState<"code" | "link" | null>(null);

  const copy = async (text: string, type: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // ignore clipboard errors
    }
  };

  const share = async () => {
    if (typeof navigator !== "undefined") {
      const nav = navigator as NavigatorWithShare;
      if (typeof nav.share === "function") {
        try {
          await nav.share({
            title: "Public Profile",
            text: `Check my profile on Influ`,
            url: publicUrl,
          });
          return;
        } catch {
          // ignore
        }
      }
    }
    copy(publicUrl, "link");
  };

  return (
    <div className="mx-auto mb-10 w-full max-w-60 rounded-2xl bg-gray-50 px-4 py-5 text-center dark:bg-white/[0.03]">
      <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">Public Profile</h3>
      <p className="mb-4 text-gray-500 text-theme-sm dark:text-gray-400">Share your Profile to anyone</p>

     

      <div className="mt-3 break-all text-gray-600 text-theme-sm dark:text-gray-300">{publicUrl}</div>

      <div className="mt-4 flex items-center justify-center gap-2">
        <button
          type="button"
          className="px-3 py-2 text-sm font-medium rounded-lg bg-brand-500 text-white hover:bg-brand-600"
          onClick={share}
        >
          Share
        </button>
        <button
          type="button"
          className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          onClick={() => copy(publicUrl, "link")}
        >
          Copy Link
        </button>
      </div>
    </div>
  );
}
