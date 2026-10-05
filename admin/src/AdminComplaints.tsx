import { useEffect, useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiClipboard,
  FiCheckSquare,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiRefreshCw,
  FiSearch,
} from "react-icons/fi";
import { useAdminAuth } from "./adminAuth";
import AdminSelect from "./AdminSelect";
import AdminComplaintDetail from "./AdminComplaintDetail";

type Language = "hi" | "en" | "mr";
type Status = "received" | "under_review" | "in_progress" | "waiting_for_citizen" | "resolved" | "rejected";
type StatusFilter = "all" | Status | "overdue";
type SlaFilter = "all" | "overdue" | "due_soon" | "on_track" | "no_deadline";
type Category = "road" | "water" | "electricity" | "cleanliness" | "health" | "ration" | "education" | "other";
type SortOrder = "newest" | "oldest" | "sla_asc" | "sla_desc";

interface ComplaintRow {
  id: string;
  complaintNumber: string;
  category: Category;
  details: string;
  location: { area: string };
  status: Status;
  citizenName: string | null;
  assignedDepartment: { id: string; name: string; code: string } | null;
  slaDeadline: string | null;
  slaPausedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface ComplaintPage {
  complaints: ComplaintRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  counts: Record<StatusFilter, number>;
  areas: string[];
}

const copy = {
  en: {
    subtitle: "Review, filter, and track citizen complaints.",
    search: "Search complaint number, details, or citizen",
    all: "All complaints", received: "New", under_review: "Under review", in_progress: "In progress",
    waiting_for_citizen: "Waiting for citizen", overdue: "Overdue", resolved: "Resolved", rejected: "Rejected",
    category: "All categories", location: "All blocks", sla: "Any SLA", dueSoon: "Due soon",
    onTrack: "On track", noDeadline: "No deadline", newest: "Newest first", oldest: "Oldest first",
    slaSoonest: "SLA deadline: soonest", slaLatest: "SLA deadline: latest",
    complaint: "Complaint", citizen: "Citizen", categoryHeading: "Category", locationHeading: "Location",
    status: "Status", deadline: "SLA deadline", department: "Department", updated: "Updated",
    noDeadlineValue: "Not set", slaPaused: "SLA paused", anonymous: "Name withheld", noDepartment: "Unassigned",
    loading: "Loading complaints…", errorTitle: "Could not load complaints",
    retry: "Try again", emptyTitle: "No complaints found", emptyBody: "Try changing or clearing the selected filters.",
    reset: "Clear filters", showing: "Showing", of: "of", page: "Page", selectPage: "Select current page",
    selected: "selected", assign: "Assign department", changeStatus: "Change status",
    actionsSoon: "Bulk actions are not available yet; open a complaint to manage it.",
    overdueTag: "Overdue", dueSoonTag: "Due soon", onTrackTag: "On track",
  },
  hi: {
    subtitle: "नागरिक शिकायतें देखें, छाँटें और उनकी स्थिति ट्रैक करें।",
    search: "शिकायत नंबर, विवरण या नागरिक खोजें",
    all: "सभी शिकायतें", received: "नई", under_review: "जाँच में", in_progress: "काम जारी",
    waiting_for_citizen: "नागरिक के जवाब का इंतज़ार", overdue: "समय-सीमा पार", resolved: "हल", rejected: "अस्वीकृत",
    category: "सभी श्रेणियाँ", location: "सभी ब्लॉक", sla: "कोई भी समय-सीमा", dueSoon: "जल्द देय",
    onTrack: "समय पर", noDeadline: "समय-सीमा नहीं", newest: "नवीनतम पहले", oldest: "सबसे पुरानी पहले",
    slaSoonest: "समय-सीमा: निकटतम", slaLatest: "समय-सीमा: सबसे दूर",
    complaint: "शिकायत", citizen: "नागरिक", categoryHeading: "श्रेणी", locationHeading: "स्थान",
    status: "स्थिति", deadline: "समय-सीमा", department: "विभाग", updated: "अपडेट",
    noDeadlineValue: "तय नहीं", slaPaused: "समय-सीमा रुकी", anonymous: "नाम गोपनीय", noDepartment: "नियत नहीं",
    loading: "शिकायतें लोड हो रही हैं…", errorTitle: "शिकायतें लोड नहीं हो सकीं",
    retry: "फिर से कोशिश करें", emptyTitle: "कोई शिकायत नहीं मिली", emptyBody: "चुने हुए फ़िल्टर बदलें या हटाएँ।",
    reset: "फ़िल्टर साफ़ करें", showing: "दिखा रहे हैं", of: "में से", page: "पृष्ठ", selectPage: "इस पृष्ठ को चुनें",
    selected: "चुनी गईं", assign: "विभाग नियत करें", changeStatus: "स्थिति बदलें",
    actionsSoon: "सामूहिक कार्रवाई उपलब्ध नहीं है। शिकायत खोलकर कार्रवाई करें।",
    overdueTag: "समय-सीमा पार", dueSoonTag: "जल्द देय", onTrackTag: "समय पर",
  },
  mr: {
    subtitle: "नागरिकांच्या तक्रारी तपासा, फिल्टर करा आणि त्यांचा मागोवा घ्या.",
    search: "तक्रार क्रमांक, तपशील किंवा नागरिक शोधा",
    all: "सर्व तक्रारी", received: "नवीन", under_review: "तपासणी सुरू", in_progress: "काम सुरू",
    waiting_for_citizen: "नागरिकाच्या उत्तराची प्रतीक्षा", overdue: "मुदत संपली", resolved: "निकाली", rejected: "नामंजूर",
    category: "सर्व श्रेणी", location: "सर्व ब्लॉक", sla: "कोणतीही मुदत", dueSoon: "लवकर देय",
    onTrack: "वेळेत", noDeadline: "मुदत नाही", newest: "नवीन प्रथम", oldest: "जुने प्रथम",
    slaSoonest: "मुदत: जवळची प्रथम", slaLatest: "मुदत: दूरची प्रथम",
    complaint: "तक्रार", citizen: "नागरिक", categoryHeading: "श्रेणी", locationHeading: "ठिकाण",
    status: "स्थिती", deadline: "मुदत", department: "विभाग", updated: "अपडेट",
    noDeadlineValue: "ठरलेली नाही", slaPaused: "मुदत थांबवली", anonymous: "नाव गोपनीय", noDepartment: "नेमलेला नाही",
    loading: "तक्रारी लोड होत आहेत…", errorTitle: "तक्रारी लोड होऊ शकल्या नाहीत",
    retry: "पुन्हा प्रयत्न करा", emptyTitle: "तक्रारी आढळल्या नाहीत", emptyBody: "निवडलेले फिल्टर बदला किंवा काढा.",
    reset: "फिल्टर साफ करा", showing: "दाखवत आहे", of: "पैकी", page: "पृष्ठ", selectPage: "हे पृष्ठ निवडा",
    selected: "निवडले", assign: "विभाग नेमा", changeStatus: "स्थिती बदला",
    actionsSoon: "एकत्रित कृती उपलब्ध नाहीत. कृतीसाठी तक्रार उघडा.",
    overdueTag: "मुदत संपली", dueSoonTag: "लवकर देय", onTrackTag: "वेळेत",
  },
} satisfies Record<Language, Record<string, string>>;

const categoryLabels: Record<Language, Record<Category, string>> = {
  en: { road: "Road", water: "Water", electricity: "Electricity", cleanliness: "Cleanliness", health: "Health", ration: "Ration / pension", education: "Education", other: "Other" },
  hi: { road: "सड़क", water: "पानी", electricity: "बिजली", cleanliness: "सफाई", health: "स्वास्थ्य", ration: "राशन / पेंशन", education: "शिक्षा", other: "अन्य" },
  mr: { road: "रस्ता", water: "पाणी", electricity: "वीज", cleanliness: "स्वच्छता", health: "आरोग्य", ration: "रेशन / पेन्शन", education: "शिक्षण", other: "इतर" },
};

const categories: Category[] = ["road", "water", "electricity", "cleanliness", "health", "ration", "education", "other"];
const tabs: StatusFilter[] = ["all", "received", "under_review", "in_progress", "waiting_for_citizen", "overdue", "resolved", "rejected"];

const addWorkingDays = (from: Date, workingDays: number): Date => {
  const result = new Date(from);
  let remaining = workingDays;
  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    const day = result.getUTCDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return result;
};

function formatDate(value: string | null, language: Language): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function AdminComplaints({
  language,
  search,
  onSearch,
}: {
  language: Language;
  search: string;
  onSearch: (value: string) => void;
}) {
  const { request } = useAdminAuth();
  const t = copy[language];
  const [status, setStatus] = useState<StatusFilter>("all");
  const [category, setCategory] = useState("all");
  const [area, setArea] = useState("");
  const [sla, setSla] = useState<SlaFilter>("all");
  const [sort, setSort] = useState<SortOrder>("newest");
  const [page, setPage] = useState(1);
  const [retryKey, setRetryKey] = useState(0);
  const [data, setData] = useState<ComplaintPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [openedComplaint, setOpenedComplaint] = useState<string | null>(null);
  const normalizedSearch = useMemo(() => search.trim(), [search]);

  useEffect(() => {
    setPage(1);
    setSelected([]);
  }, [status, category, area, sla, sort, normalizedSearch]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({
        status,
        category,
        area,
        sla,
        sort,
        page: String(page),
        search: normalizedSearch,
      });
      void request<ComplaintPage>(`/complaints?${params.toString()}`)
        .then((result) => {
          if (active) setData(result);
        })
        .catch((reason: unknown) => {
          if (active) setError(reason instanceof Error ? reason.message : t.errorTitle);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, normalizedSearch ? 250 : 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [request, status, category, area, sla, sort, page, normalizedSearch, retryKey, t.errorTitle]);

  const pageRows = data?.complaints ?? [];
  const soonLimit = addWorkingDays(new Date(), 2).getTime();
  const allPageSelected = pageRows.length > 0 && pageRows.every((row) => selected.includes(row.id));
  const resetFilters = () => {
    setStatus("all");
    setCategory("all");
    setArea("");
    setSla("all");
    setSort("newest");
    setPage(1);
  };
  const togglePageSelection = () => {
    setSelected((current) => allPageSelected
      ? current.filter((id) => !pageRows.some((row) => row.id === id))
      : [...new Set([...current, ...pageRows.map((row) => row.id)])]);
  };
  const statusLabel = (value: Status) => t[value];

  return (
    <section className="admin-complaints" aria-busy={loading}>
      <div className="admin-complaints-heading">
        <div><p>{t.subtitle}</p></div>
        {loading && <span className="queue-loading-indicator"><FiRefreshCw className="queue-spin" />{t.loading}</span>}
      </div>

      <div className="queue-tabs" role="tablist" aria-label={t.status}>
        {tabs.map((tab) => (
          <button
            type="button"
            role="tab"
            aria-selected={status === tab}
            className={`queue-tab ${status === tab ? "queue-tab-active" : ""}`}
            key={tab}
            onClick={() => { setStatus(tab); setPage(1); }}
          >
            {t[tab]}<span>{data?.counts[tab] ?? "—"}</span>
          </button>
        ))}
      </div>

      <div className="queue-filters">
        <label className="queue-filter-search">
          <FiSearch aria-hidden="true" />
          <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder={t.search} aria-label={t.search} />
        </label>
        <label><span className="visually-hidden">{t.category}</span>
          <AdminSelect ariaLabel={t.category} value={category} onChange={(value) => { setCategory(value); setPage(1); }}
            options={[{ value: "all", label: t.category }, ...categories.map((item) => ({ value: item, label: categoryLabels[language][item] }))]} />
        </label>
        <label><span className="visually-hidden">{t.location}</span>
          <AdminSelect ariaLabel={t.location} value={area} onChange={(value) => { setArea(value); setPage(1); }}
            options={[{ value: "", label: t.location }, ...(data?.areas ?? []).map((item) => ({ value: item, label: item }))]} />
        </label>
        <label><span className="visually-hidden">{t.sla}</span>
          <AdminSelect ariaLabel={t.sla} value={sla} onChange={(value) => { setSla(value as SlaFilter); setPage(1); }}
            options={[
              { value: "all", label: t.sla },
              { value: "overdue", label: t.overdue },
              { value: "due_soon", label: t.dueSoon },
              { value: "on_track", label: t.onTrack },
              { value: "no_deadline", label: t.noDeadline },
            ]} />
        </label>
        <label><span className="visually-hidden">{language === "en" ? "Sort complaints" : language === "mr" ? "तक्रारी क्रमवारीत लावा" : "शिकायतें क्रमबद्ध करें"}</span>
          <AdminSelect ariaLabel={language === "en" ? "Sort complaints" : language === "mr" ? "तक्रारी क्रमवारीत लावा" : "शिकायतें क्रमबद्ध करें"}
            value={sort} onChange={(value) => { setSort(value as SortOrder); setPage(1); }}
            options={[
              { value: "newest", label: t.newest },
              { value: "oldest", label: t.oldest },
              { value: "sla_asc", label: t.slaSoonest },
              { value: "sla_desc", label: t.slaLatest },
            ]} />
        </label>
      </div>

      {selected.length > 0 && (
        <div className="queue-bulk-bar">
          <span><FiCheckSquare />{selected.length} {t.selected}</span>
          <button type="button" disabled title={t.actionsSoon}>{t.assign}</button>
          <button type="button" disabled title={t.actionsSoon}>{t.changeStatus}</button>
          <small>{t.actionsSoon}</small>
        </div>
      )}

      {error ? (
        <div className="queue-state queue-error" role="alert">
          <FiAlertCircle />
          <h2>{t.errorTitle}</h2>
          <p>{error}</p>
          <button type="button" onClick={() => setRetryKey((key) => key + 1)}><FiRefreshCw />{t.retry}</button>
        </div>
      ) : !loading && data && data.total === 0 ? (
        <div className="queue-state">
          <FiClipboard />
          <h2>{t.emptyTitle}</h2>
          <p>{t.emptyBody}</p>
          <button type="button" onClick={resetFilters}>{t.reset}</button>
        </div>
      ) : (
        <div className="queue-table-wrap">
          <table className="queue-table">
            <thead>
              <tr>
                <th className="queue-select-cell"><input type="checkbox" aria-label={t.selectPage} checked={allPageSelected} onChange={togglePageSelection} /></th>
                <th>{t.complaint}</th><th>{t.citizen}</th><th>{t.categoryHeading}</th>
                <th>{t.locationHeading}</th><th>{t.status}</th><th>{t.deadline}</th>
                <th>{t.department}</th><th>{t.updated}</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => {
                const overdue = row.slaPausedAt === null && row.slaDeadline !== null && new Date(row.slaDeadline).getTime() < Date.now() &&
                  row.status !== "resolved" && row.status !== "rejected";
                const dueSoon = row.slaPausedAt === null && row.slaDeadline !== null && !overdue &&
                  new Date(row.slaDeadline).getTime() <= soonLimit &&
                  row.status !== "resolved" && row.status !== "rejected";
                return (
                  <tr key={row.id}>
                    <td className="queue-select-cell"><input type="checkbox" aria-label={`${t.complaint} ${row.complaintNumber}`} checked={selected.includes(row.id)} onChange={() => setSelected((current) => current.includes(row.id) ? current.filter((id) => id !== row.id) : [...current, row.id])} /></td>
                    <td className="queue-complaint-cell">
                      <button
                        type="button"
                        className="queue-open-complaint"
                        onClick={() => setOpenedComplaint(row.complaintNumber)}
                        aria-label={`${t.complaint} ${row.complaintNumber}`}
                      >{row.complaintNumber}</button>
                      <span>{row.details}</span>
                    </td>
                    <td>{row.citizenName || t.anonymous}</td>
                    <td>{categoryLabels[language][row.category]}</td>
                    <td>{row.location.area || "—"}</td>
                    <td><span className={`queue-status queue-status-${row.status}`}><i />{statusLabel(row.status)}</span></td>
                    <td><span className={`queue-deadline ${overdue ? "queue-deadline-overdue" : dueSoon ? "queue-deadline-soon" : ""}`}>
                      {overdue ? <FiAlertCircle /> : dueSoon ? <FiClock /> : null}
                      {row.slaPausedAt && row.slaDeadline ? t.slaPaused : row.slaDeadline ? formatDate(row.slaDeadline, language) : t.noDeadlineValue}
                      {overdue && <small>{t.overdueTag}</small>}
                      {dueSoon && <small>{t.dueSoonTag}</small>}
                    </span></td>
                    <td>{row.assignedDepartment?.name ?? t.noDepartment}</td>
                    <td>{formatDate(row.updatedAt, language)}</td>
                  </tr>
                );
              })}
              {loading && pageRows.length === 0 && <tr><td colSpan={9} className="queue-table-loading">{t.loading}</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {!error && data && data.total > 0 && (
        <div className="queue-pagination">
          <span>{t.showing} {((page - 1) * data.pageSize) + 1}–{Math.min(page * data.pageSize, data.total)} {t.of} {data.total}</span>
          <div>
            <span>{t.page} {page} / {data.totalPages}</span>
            <button type="button" aria-label={language === "en" ? "Previous page" : language === "mr" ? "मागील पृष्ठ" : "पिछला पृष्ठ"} disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}><FiChevronLeft /></button>
            <button type="button" aria-label={language === "en" ? "Next page" : language === "mr" ? "पुढील पृष्ठ" : "अगला पृष्ठ"} disabled={page >= data.totalPages || loading} onClick={() => setPage((current) => current + 1)}><FiChevronRight /></button>
          </div>
        </div>
      )}
      {openedComplaint && (
        <AdminComplaintDetail
          complaintNumber={openedComplaint}
          language={language}
          onClose={() => setOpenedComplaint(null)}
          onUpdated={() => setRetryKey((key) => key + 1)}
        />
      )}
    </section>
  );
}
