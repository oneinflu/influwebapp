
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import Alert from "../components/ui/alert/Alert";
import api from "../utils/api";
import { PaperPlaneIcon } from "../icons";

type PricingPlan = { name?: string; price?: number; period?: string; features?: string[] };
type Service = { _id: string; name: string; description?: string; deliverables?: string[]; pricing_plans?: PricingPlan[] };
type ClientItem = { _id: string; logo?: string; business_name?: string; industry?: string };
type ProjectItem = { _id: string; name?: string; client?: string; status?: string; project_budget?: number; completion_date?: string };
type PortfolioItem = { _id: string; type: 'image' | 'video' | 'audio' | 'document'; media_url: string; thumbnail_url?: string; title?: string; description?: string };
type TestimonialItem = { _id: string; testimonials?: string; rating?: number; given_on?: string };
type StatsItem = { label: string; value: number };
type ServerStats = { clients?: number; team_members?: number; projects?: number; years_in_business?: string; avg_rating?: number };

type Payload = {
  user: {
    _id: string;
    name: string;
    primaryRole?: string;
    country?: string;
    avatar?: string;
    slug: string;
    shortBio?: string;
    socialHandles?: { platform?: string; url?: string }[];
  };
  coverPhoto?: string;
  stats?: StatsItem[];
  services: Service[];
  clients: ClientItem[];
  projects: ProjectItem[];
  showcaseMedia: PortfolioItem[];
  testimonials: TestimonialItem[];
};

export default function PublicProfile() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<Payload | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!slug) return;
      setLoading(true);
      setErrorMessage("");
      try {
        const { data } = await api.get(`/public/profile/${slug}`);
        if (!cancelled) setData(data || null);
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
          return "Unable to load public profile.";
        })();
        setErrorMessage(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [slug]);

  // Payment plans are no longer displayed separately

  const displayStats = useMemo(() => {
    const serverStats = Array.isArray(data?.stats) ? (data!.stats as unknown as ServerStats[]) : [];
    const s = serverStats && serverStats.length > 0 ? serverStats[0] : null;
    if (!s) return [] as StatsItem[];
    const items: StatsItem[] = [];
    if (typeof s.clients === 'number' && s.clients > 0) items.push({ label: 'Clients', value: s.clients });
    if (typeof s.team_members === 'number' && s.team_members > 0) items.push({ label: 'Team Members', value: s.team_members });
    if (typeof s.projects === 'number' && s.projects > 0) items.push({ label: 'Projects', value: s.projects });
    if (typeof s.avg_rating === 'number' && s.avg_rating > 0) items.push({ label: 'Avg. Rating', value: s.avg_rating });
    if (typeof s.years_in_business === 'string' && s.years_in_business.trim()) {
      const yrs = parseInt(s.years_in_business.trim(), 10);
      if (!Number.isNaN(yrs) && yrs > 0) items.push({ label: 'Years in Business', value: yrs });
    }
    return items;
  }, [data]);
 
  if (loading) {
    return <div className="p-6 text-gray-600 dark:text-gray-400">Loading profile...</div>;
  }
  if (errorMessage) {
    return <div className="p-6 max-w-xl mx-auto"><Alert variant="error" title="Error" message={errorMessage} /></div>;
  }
  if (!data) {
    return <div className="p-6 text-gray-600 dark:text-gray-400">Profile not found</div>;
  }

  const { user, coverPhoto, services, clients, testimonials, showcaseMedia } = data;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B101A]">
      {/* Hero Cover */}
      <div className="relative h-64 md:h-80 w-full overflow-hidden">
        {coverPhoto ? (
          <img src={coverPhoto} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-brand-500/20 to-fuchsia-500/20" />
        )}
        <div className="absolute inset-0 bg-black/25" />
      </div>

      {/* Profile Card */}
      <div className="max-w-5xl mx-auto px-4">
        <div className="relative -mt-20 md:-mt-24">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] p-6 md:p-8 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-full ring-4 ring-white dark:ring-gray-900 overflow-hidden -mt-20 md:-mt-24 bg-gray-100 dark:bg-white/5">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-semibold text-gray-500 dark:text-white/40">
                    {(user.name || "").slice(0,1).toUpperCase()}
                  </div>
                )}
              </div>
              <h1 className="mt-4 text-2xl md:text-3xl font-bold text-gray-900 dark:text-white/90">{user.name}</h1>
              <p className="mt-1 text-sm md:text-base text-gray-600 dark:text-gray-400">{user.primaryRole} {user.country ? `• ${user.country}` : ""}</p>
              {user.shortBio && (
                <p className="mt-3 max-w-2xl text-gray-700 dark:text-gray-300 text-sm md:text-[15px]">{user.shortBio}</p>
              )}
              {Array.isArray(user.socialHandles) && user.socialHandles.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  {user.socialHandles.filter(h => h?.url).map((h, i) => (
                    <a
                      key={i}
                      href={(h.url as string) || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.06] px-3 py-1.5 text-sm text-gray-800 dark:text-white/90 hover:bg-gray-50 dark:hover:bg-white/[0.1]"
                      aria-label={`Visit ${h.platform || 'social'} profile`}
                    >
                      <PaperPlaneIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      <span>{h.platform || 'Profile'}</span>
                    </a>
                  ))}
                </div>
              )}

              {/* Stats */}
              {displayStats && displayStats.length > 0 && (
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
                  {displayStats.map((s, idx) => (
                    <div key={idx} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-white/[0.03] p-3">
                      <div className="text-xl font-semibold text-gray-900 dark:text-white/90">{s.value}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Services */}
          <section className="md:col-span-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]">
            <div className="p-5 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">Services</h2>
            </div>
            <div className="p-5">
              {services.length === 0 ? (
                <div className="text-sm text-gray-600 dark:text-gray-400">No services published yet.</div>
              ) : (
                <div className="space-y-4">
                  {services.map((s) => {
                const plans = s.pricing_plans || [];
                const pricedPlans = plans.filter((p) => typeof p.price === 'number');
                const minPrice = pricedPlans.length > 0 ? Math.min(...pricedPlans.map((p) => p.price as number)) : null;
                const primaryPeriod = pricedPlans.length > 0 ? pricedPlans[0]?.period : undefined;
                const planNames = plans.map((p) => p.name).filter(Boolean) as string[];
                const primaryFeatures = (plans[0]?.features || []).slice(0, 4);
                const deliverables = (s.deliverables || []).slice(0, 4);
                const extraDeliverables = (s.deliverables?.length || 0) - deliverables.length;

                return (
                  <div key={s._id} className="w-full group rounded-xl border border-gray-200 dark:border-gray-800 p-5 transition hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-white/[0.03] shadow-sm">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="text-base md:text-lg font-semibold text-gray-900 dark:text-white/90">{s.name}</div>
                        {s.description && (
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{s.description}</p>
                        )}

                        {(primaryFeatures.length > 0 || deliverables.length > 0) && (
                          <div className="mt-3">
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">What’s included</div>
                            {primaryFeatures.length > 0 ? (
                              <ul className="text-xs text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1">
                                {primaryFeatures.map((f, i) => (
                                  <li key={i}>{f}</li>
                                ))}
                              </ul>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {deliverables.map((d, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-white/[0.06] text-gray-700 dark:text-gray-300"
                                  >
                                    {d}
                                  </span>
                                ))}
                                {extraDeliverables > 0 && (
                                  <span className="px-2 py-1 rounded-full text-xs bg-gray-50 dark:bg-white/[0.04] text-gray-600 dark:text-gray-400">+{extraDeliverables} more</span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="w-full md:w-56 shrink-0">
                        <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 bg-gray-50 dark:bg-white/[0.04] text-center">
                          <div className="text-sm text-gray-600 dark:text-gray-400">Starting at</div>
                          <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white/90">
                            {minPrice !== null ? `$${minPrice}` : 'Contact'}
                            {primaryPeriod ? <span className="ml-1 text-sm font-medium text-gray-600 dark:text-gray-400">/{primaryPeriod}</span> : null}
                          </div>
                          {planNames.length > 1 && (
                            <div className="mt-2 flex flex-wrap justify-center gap-2">
                              {planNames.slice(0, 3).map((n, i) => (
                                <span key={i} className="px-2 py-1 rounded-full text-xs bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300">{n}</span>
                              ))}
                              {planNames.length > 3 && (
                                <span className="px-2 py-1 rounded-full text-xs bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300">+{planNames.length - 3}</span>
                              )}
                            </div>
                          )}
                          <a
                            href="#"
                            className="mt-3 inline-flex items-center justify-center w-full rounded-md bg-gray-900 dark:bg-white/90 text-white dark:text-gray-900 text-sm font-medium py-2 hover:opacity-90 transition"
                          >
                            Request Quote
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
                </div>
              )}
            </div>
          </section>

          
        </div>

        {/* Portfolio */}
        <section className="mt-8 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]">
          <div className="p-5 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">Portfolio</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Selected media from recent work</p>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {(!showcaseMedia || showcaseMedia.length === 0) && (
              <div className="text-sm text-gray-600 dark:text-gray-400">No portfolio media published.</div>
            )}
            {showcaseMedia && showcaseMedia.map((m) => (
              <div key={m._id} className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                {m.type === 'image' && (
                  <img src={m.thumbnail_url || m.media_url} alt={m.title || 'Portfolio image'} className="w-full h-48 object-cover" />
                )}
                {m.type === 'video' && (
                  <video controls className="w-full h-48 object-cover">
                    <source src={m.media_url} />
                  </video>
                )}
                {m.type !== 'image' && m.type !== 'video' && (
                  <div className="p-4 text-sm text-gray-600 dark:text-gray-400">{m.title || m.type}</div>
                )}
                {(m.title || m.description) && (
                  <div className="p-4">
                    {m.title && (
                      <div className="text-sm font-semibold text-gray-900 dark:text-white/90">{m.title}</div>
                    )}
                    {m.description && (
                      <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">{m.description}</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Clients */}
        <section className="mt-8 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]">
          <div className="p-5 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">Clients</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Brands and businesses I’ve worked with</p>
          </div>
          <div className="p-5 grid grid-cols-2 md:grid-cols-6 gap-4 items-center">
            {clients.length === 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-400">No clients listed.</div>
            )}
            {clients.map((c) => (
              <div key={c._id} className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                  {c.logo ? (
                    <img src={c.logo} alt={c.business_name || 'client'} className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-sm text-gray-600 dark:text-gray-400">{(c.business_name || '').slice(0,1)}</div>
                  )}
                </div>
                <div className="mt-2 text-xs text-gray-700 dark:text-gray-300 text-center">{c.business_name || 'Client'}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="mt-8 mb-12 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]">
          <div className="p-5 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">Testimonials</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">What clients say</p>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            {testimonials.length === 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-400">No testimonials yet.</div>
            )}
            {testimonials.map((t) => (
              <div key={t._id} className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <div className="flex items-center gap-2">
                  <div className="text-base font-semibold text-gray-900 dark:text-white/90">Rating</div>
                  <div className="text-yellow-500">{"★".repeat(Math.max(0, Math.min(5, t.rating || 0)))}</div>
                </div>
                {t.testimonials && (
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{t.testimonials}</p>
                )}
                {t.given_on && (
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">{new Date(t.given_on).toLocaleDateString()}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}