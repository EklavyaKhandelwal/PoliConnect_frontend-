import { useEffect, useMemo, useState } from "react";
import {
  FiCheck,
  FiChevronRight,
  FiFileText,
  FiHeart,
  FiHelpCircle,
  FiMessageCircle,
  FiMenu,
  FiRefreshCw,
  FiSend,
  FiStar,
  FiZap,
} from "react-icons/fi";
import { useAdminAuth } from "./adminAuth";
import AdminSelect from "./AdminSelect";

type Language = "hi" | "en" | "mr";
type SuggestionType = "suggestion" | "thanks" | "question";
type SuggestionFilter = "all" | "unread" | SuggestionType;
type InboxTab = "suggestions" | "feedback";

interface ReplyTemplate {
  _id: string;
  title: string;
  message: string;
  language: Language;
  active: boolean;
}

interface AdminSuggestion {
  referenceNumber: string;
  type: SuggestionType;
  message: string;
  keepNamePrivate: boolean;
  citizenName: string | null;
  status: "received" | "read";
  readAt: string | null;
  isHighlighted: boolean;
  adminReplies: Array<{ message: string; repliedBy: string; createdAt: string }>;
  createdAt: string | null;
}

interface SuggestionPage {
  suggestions: AdminSuggestion[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  counts: Record<"all" | "unread" | SuggestionType, number>;
}

interface AdminFeedback {
  complaintNumber: string;
  category: string;
  complaintDetails: string;
  status: string;
  confirmation: "resolved" | "not_resolved";
  rating: number | null;
  tags: string[];
  comment: string;
  submittedAt: string | null;
  isRead: boolean;
  readAt: string | null;
  readBy: string | null;
  isHighlighted: boolean;
  adminReplies: Array<{ message: string; repliedBy: string; createdAt: string }>;
}

interface FeedbackPage {
  feedback: AdminFeedback[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: { averageRating: number; ratingCount: number; total: number };
}

const copy = {
  en: {
    suggestions: "Suggestions",
    feedback: "Complaint feedback",
    all: "All",
    unread: "Unread",
    ideas: "Suggestions",
    thanks: "Thanks",
    questions: "Questions",
    inbox: "Citizen submissions",
    search: "Search reference or message",
    noSuggestions: "No suggestions match this filter.",
    noFeedback: "No complaint feedback has been submitted yet.",
    loading: "Loading citizen submissions…",
    loadingFeedback: "Loading complaint feedback…",
    error: "Could not load citizen submissions.",
    retry: "Try again",
    namePrivate: "Name kept private",
    anonymous: "Citizen",
    submitted: "Submitted",
    actions: "Actions",
    markRead: "Mark as read",
    markUnread: "Mark as unread",
    readHint: "Update inbox status",
    highlight: "Highlight for weekly summary",
    unhighlight: "Remove from weekly summary",
    highlighted: "Highlighted",
    replyTitle: "Reply to citizen",
    replyPlaceholder: "Write a message the citizen can see…",
    replyCaveat: "This reply will appear in the citizen app.",
    saveReply: "Send reply",
    replySaved: "Reply sent to the citizen.",
    templatePlaceholder: "Choose a saved reply",
    templateLoadError: "Saved replies could not be loaded.",
    feedbackMarkRead: "Mark feedback as read",
    feedbackMarkUnread: "Mark feedback as unread",
    feedbackHighlight: "Highlight for weekly summary",
    feedbackUnhighlight: "Remove from weekly summary",
    feedbackReply: "Reply to feedback",
    feedbackReplyPlaceholder: "Write a reply the citizen can see…",
    feedbackSend: "Send reply",
    previous: "Previous",
    next: "Next",
    page: "Page",
    of: "of",
    rating: "Average rating",
    responses: "responses",
    resolved: "Citizen confirmed resolution",
    notResolved: "Citizen reported it is not resolved",
    complaint: "Complaint",
    category: "Category",
    comment: "Citizen comment",
    noComment: "No written comment.",
    tags: {
      quick: "Quick response",
      polite: "Polite service",
      complete: "Complete resolution",
      faster: "Needs faster action",
    },
    categoryNames: {
      road: "Road",
      water: "Water",
      electricity: "Electricity",
      cleanliness: "Cleanliness",
      health: "Health",
      ration: "Ration / pension",
      education: "Education",
      other: "Other",
    },
    types: { suggestion: "Suggestion", thanks: "Thanks", question: "Question" },
    templates: {
      thanks: "Thanks for your suggestion",
      review: "Forwarded for review",
      details: "Details needed for a complaint",
    },
    replies: {
      thanks: "Thank you for sharing your feedback with us.",
      review: "Your suggestion has been shared with the relevant team for review. Thank you.",
      details: "Please share where the issue is and when it started so we can understand it better.",
    },
  },
  hi: {
    suggestions: "सुझाव",
    feedback: "शिकायत प्रतिक्रिया",
    all: "सभी",
    unread: "बिना पढ़े",
    ideas: "सुझाव",
    thanks: "धन्यवाद",
    questions: "सवाल",
    inbox: "नागरिक संदेश",
    search: "संदर्भ संख्या या संदेश खोजें",
    noSuggestions: "इस फ़िल्टर में कोई सुझाव नहीं मिला।",
    noFeedback: "अभी तक शिकायत पर कोई प्रतिक्रिया नहीं मिली।",
    loading: "नागरिक संदेश लोड हो रहे हैं…",
    loadingFeedback: "शिकायत प्रतिक्रिया लोड हो रही है…",
    error: "नागरिक संदेश लोड नहीं हो सके।",
    retry: "फिर कोशिश करें",
    namePrivate: "नाम गोपनीय रखा गया",
    anonymous: "नागरिक",
    submitted: "दर्ज किया",
    actions: "कार्रवाई",
    markRead: "पढ़ा हुआ चिह्नित करें",
    markUnread: "बिना पढ़ा चिह्नित करें",
    readHint: "इनबॉक्स स्थिति बदलें",
    highlight: "साप्ताहिक सारांश में रखें",
    unhighlight: "साप्ताहिक सारांश से हटाएँ",
    highlighted: "सारांश में शामिल",
    replyTitle: "नागरिक को जवाब दें",
    replyPlaceholder: "नागरिक के लिए संदेश लिखें…",
    replyCaveat: "यह जवाब नागरिक के ऐप में दिखाई देगा।",
    saveReply: "जवाब भेजें",
    replySaved: "नागरिक को जवाब भेज दिया गया।",
    templatePlaceholder: "सहेजा हुआ जवाब चुनें",
    templateLoadError: "सहेजे हुए जवाब लोड नहीं हो सके।",
    feedbackMarkRead: "प्रतिक्रिया पढ़ी हुई चिह्नित करें",
    feedbackMarkUnread: "प्रतिक्रिया बिना पढ़ी चिह्नित करें",
    feedbackHighlight: "साप्ताहिक सारांश में रखें",
    feedbackUnhighlight: "साप्ताहिक सारांश से हटाएँ",
    feedbackReply: "प्रतिक्रिया का जवाब दें",
    feedbackReplyPlaceholder: "नागरिक के लिए जवाब लिखें…",
    feedbackSend: "जवाब भेजें",
    previous: "पिछला",
    next: "अगला",
    page: "पृष्ठ",
    of: "में से",
    rating: "औसत रेटिंग",
    responses: "प्रतिक्रियाएँ",
    resolved: "नागरिक ने समाधान की पुष्टि की",
    notResolved: "नागरिक ने बताया कि समस्या हल नहीं हुई",
    complaint: "शिकायत",
    category: "श्रेणी",
    comment: "नागरिक की टिप्पणी",
    noComment: "कोई लिखित टिप्पणी नहीं।",
    tags: {
      quick: "त्वरित जवाब",
      polite: "विनम्र सेवा",
      complete: "पूरा समाधान",
      faster: "तेज़ कार्रवाई चाहिए",
    },
    categoryNames: {
      road: "सड़क",
      water: "पानी",
      electricity: "बिजली",
      cleanliness: "सफाई",
      health: "स्वास्थ्य",
      ration: "राशन / पेंशन",
      education: "शिक्षा",
      other: "अन्य",
    },
    types: { suggestion: "सुझाव", thanks: "धन्यवाद", question: "सवाल" },
    templates: {
      thanks: "सुझाव के लिए धन्यवाद",
      review: "समीक्षा के लिए भेजा",
      details: "शिकायत के लिए विवरण चाहिए",
    },
    replies: {
      thanks: "अपनी प्रतिक्रिया साझा करने के लिए धन्यवाद।",
      review: "आपका सुझाव समीक्षा के लिए संबंधित टीम को भेज दिया गया है। धन्यवाद।",
      details: "समस्या कहाँ है और कब से है, यह बताएं ताकि हम इसे बेहतर समझ सकें।",
    },
  },
  mr: {
    suggestions: "सूचना",
    feedback: "तक्रार अभिप्राय",
    all: "सर्व",
    unread: "न वाचलेले",
    ideas: "सूचना",
    thanks: "आभार",
    questions: "प्रश्न",
    inbox: "नागरिक संदेश",
    search: "संदर्भ क्रमांक किंवा संदेश शोधा",
    noSuggestions: "या फिल्टरमध्ये सूचना आढळली नाही.",
    noFeedback: "अद्याप तक्रारीवर अभिप्राय आलेला नाही.",
    loading: "नागरिक संदेश लोड होत आहेत…",
    loadingFeedback: "तक्रार अभिप्राय लोड होत आहे…",
    error: "नागरिक संदेश लोड होऊ शकले नाहीत.",
    retry: "पुन्हा प्रयत्न करा",
    namePrivate: "नाव गोपनीय ठेवले",
    anonymous: "नागरिक",
    submitted: "दाखल",
    actions: "कृती",
    markRead: "वाचले म्हणून चिन्हांकित करा",
    markUnread: "न वाचलेले म्हणून चिन्हांकित करा",
    readHint: "इनबॉक्स स्थिती बदला",
    highlight: "साप्ताहिक सारांशात ठेवा",
    unhighlight: "साप्ताहिक सारांशातून काढा",
    highlighted: "सारांशात समाविष्ट",
    replyTitle: "नागरिकाला उत्तर द्या",
    replyPlaceholder: "नागरिकासाठी संदेश लिहा…",
    replyCaveat: "हे उत्तर नागरिकाच्या अॅपमध्ये दिसेल.",
    saveReply: "उत्तर पाठवा",
    replySaved: "नागरिकाला उत्तर पाठवले.",
    templatePlaceholder: "जतन केलेले उत्तर निवडा",
    templateLoadError: "जतन केलेली उत्तरे लोड करता आली नाहीत.",
    feedbackMarkRead: "अभिप्राय वाचलेला म्हणून चिन्हांकित करा",
    feedbackMarkUnread: "अभिप्राय न वाचलेला म्हणून चिन्हांकित करा",
    feedbackHighlight: "साप्ताहिक सारांशात ठेवा",
    feedbackUnhighlight: "साप्ताहिक सारांशातून काढा",
    feedbackReply: "अभिप्रायाला उत्तर द्या",
    feedbackReplyPlaceholder: "नागरिकासाठी उत्तर लिहा…",
    feedbackSend: "उत्तर पाठवा",
    previous: "मागील",
    next: "पुढील",
    page: "पृष्ठ",
    of: "पैकी",
    rating: "सरासरी रेटिंग",
    responses: "अभिप्राय",
    resolved: "नागरिकाने निराकरणाची पुष्टी केली",
    notResolved: "नागरिकाने समस्या सुटली नसल्याचे कळवले",
    complaint: "तक्रार",
    category: "वर्ग",
    comment: "नागरिकाची टिप्पणी",
    noComment: "लिखित टिप्पणी नाही.",
    tags: {
      quick: "जलद प्रतिसाद",
      polite: "विनम्र सेवा",
      complete: "पूर्ण निराकरण",
      faster: "जलद कृती आवश्यक",
    },
    categoryNames: {
      road: "रस्ता",
      water: "पाणी",
      electricity: "वीज",
      cleanliness: "स्वच्छता",
      health: "आरोग्य",
      ration: "रेशन / पेन्शन",
      education: "शिक्षण",
      other: "इतर",
    },
    types: { suggestion: "सूचना", thanks: "आभार", question: "प्रश्न" },
    templates: {
      thanks: "सूचनेसाठी धन्यवाद",
      review: "पुनरावलोकनासाठी पाठवले",
      details: "तक्रारीसाठी तपशील आवश्यक",
    },
    replies: {
      thanks: "तुमचा अभिप्राय आमच्याशी शेअर केल्याबद्दल धन्यवाद.",
      review: "तुमची सूचना पुनरावलोकनासाठी संबंधित पथकाकडे पाठवली आहे. धन्यवाद.",
      details: "समस्या कुठे आणि कधीपासून आहे ते सांगा, जेणेकरून आम्हाला ती समजेल.",
    },
  },
} as const;

const suggestionTypes: SuggestionType[] = ["suggestion", "thanks", "question"];
const typeIcons = {
  suggestion: FiZap,
  thanks: FiHeart,
  question: FiHelpCircle,
};

function formatDate(value: string | null, locale: string): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function SuggestionTypeBadge({ type, language }: { type: SuggestionType; language: Language }) {
  const Icon = typeIcons[type];
  return (
    <span className={`suggestion-type ${type}`}>
      <Icon size={12} />
      {copy[language].types[type]}
    </span>
  );
}

export default function AdminSuggestions({
  language,
  search,
  onUnreadCountChange,
}: {
  language: Language;
  search: string;
  onUnreadCountChange: (count: number) => void;
}) {
  const { request } = useAdminAuth();
  const t = copy[language];
  const locale = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN";
  const [tab, setTab] = useState<InboxTab>("suggestions");
  const [filter, setFilter] = useState<SuggestionFilter>("unread");
  const [suggestionPage, setSuggestionPage] = useState<SuggestionPage | null>(null);
  const [feedbackPage, setFeedbackPage] = useState<FeedbackPage | null>(null);
  const [selectedReference, setSelectedReference] = useState("");
  const [reply, setReply] = useState("");
  const [feedbackReplies, setFeedbackReplies] = useState<Record<string, string>>({});
  const [replyTemplate, setReplyTemplate] = useState("");
  const [replyTemplates, setReplyTemplates] = useState<ReplyTemplate[]>([]);
  const [templateLoadError, setTemplateLoadError] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (tab !== "suggestions") return;
    let active = true;
    setLoading(true);
    setError("");
    const query = new URLSearchParams({
      search: search.trim(),
      page: String(page),
      ...(filter === "unread" ? { status: "received" } : {}),
      ...(filter !== "all" && filter !== "unread" ? { type: filter } : {}),
    });
    request<SuggestionPage>(`/suggestions?${query}`)
      .then((data) => {
        if (!active) return;
        setSuggestionPage(data);
        onUnreadCountChange(data.counts.unread);
        setSelectedReference((selected) =>
          data.suggestions.some((suggestion) => suggestion.referenceNumber === selected)
            ? selected
            : data.suggestions[0]?.referenceNumber ?? "",
        );
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : t.error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filter, onUnreadCountChange, page, request, retry, search, tab, t.error]);

  useEffect(() => {
    if (tab !== "feedback") return;
    let active = true;
    setLoading(true);
    setError("");
    const query = new URLSearchParams({ search: search.trim(), page: String(page) });
    request<FeedbackPage>(`/feedback?${query}`)
      .then((data) => {
        if (active) setFeedbackPage(data);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : t.error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, request, retry, search, tab, t.error]);

  useEffect(() => {
    if (tab !== "suggestions") return;
    let active = true;
    setTemplateLoadError("");
    request<{ templates: ReplyTemplate[] }>("/reply-templates")
      .then(({ templates }) => {
        if (!active) return;
        setReplyTemplates(templates.filter((template) => template.active));
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setTemplateLoadError(loadError instanceof Error ? loadError.message : t.templateLoadError);
      });
    return () => {
      active = false;
    };
  }, [request, tab, t.templateLoadError]);

  const selectedSuggestion = suggestionPage?.suggestions.find(
    (suggestion) => suggestion.referenceNumber === selectedReference,
  ) ?? null;

  const filters = useMemo(() => [
    { key: "all" as const, label: t.all, count: suggestionPage?.counts.all ?? 0 },
    { key: "unread" as const, label: t.unread, count: suggestionPage?.counts.unread ?? 0 },
    ...suggestionTypes.map((type) => ({
      key: type,
      label: type === "suggestion" ? t.ideas : t.types[type],
      count: suggestionPage?.counts[type] ?? 0,
    })),
  ], [suggestionPage?.counts, t]);

  const performAction = async (
    action: "read" | "unread" | "highlight" | "reply",
    payload: Record<string, unknown> = {},
  ) => {
    if (!selectedSuggestion) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await request<{ success: true; suggestion: AdminSuggestion }>(
        `/suggestions/${encodeURIComponent(selectedSuggestion.referenceNumber)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...payload }),
        },
      );
      if (action === "reply") {
        setReply("");
        setNotice(t.replySaved);
      }
      setRetry((value) => value + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : t.error);
    } finally {
      setSaving(false);
    }
  };

  const performFeedbackAction = async (
    item: AdminFeedback,
    action: "read" | "unread" | "highlight" | "reply",
    payload: Record<string, unknown> = {},
  ) => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await request(
        `/feedback/${encodeURIComponent(item.complaintNumber)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...payload }),
        },
      );
      if (action === "reply") {
        setFeedbackReplies((drafts) => ({ ...drafts, [item.complaintNumber]: "" }));
        setNotice(t.replySaved);
      }
      setRetry((value) => value + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : t.error);
    } finally {
      setSaving(false);
    }
  };

  const setActiveTab = (nextTab: InboxTab) => {
    setTab(nextTab);
    setPage(1);
    setError("");
    setNotice("");
  };

  return (
    <div className="suggestions-page">
      <div className="suggestion-content-tabs" role="tablist" aria-label={t.inbox}>
        <button type="button" role="tab" aria-selected={tab === "suggestions"} onClick={() => setActiveTab("suggestions")}>
          <FiMessageCircle size={14} />{t.suggestions}<span>{suggestionPage?.counts.all ?? 0}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === "feedback"} onClick={() => setActiveTab("feedback")}>
          <FiStar size={14} />{t.feedback}<span>{feedbackPage?.summary.total ?? 0}</span>
        </button>
      </div>

      {tab === "suggestions" ? (
        <>
          <div className="suggestion-filter-row" role="tablist" aria-label={t.suggestions}>
            {filters.map(({ key, label, count }) => (
              <button
                type="button"
                role="tab"
                aria-selected={filter === key}
                className={`suggestion-filter ${filter === key ? "suggestion-filter-active" : ""}`}
                key={key}
                onClick={() => {
                  setFilter(key);
                  setPage(1);
                  setNotice("");
                }}
              >
                {label}<span>{count}</span>
              </button>
            ))}
          </div>

          {error && <div className="settings-error-block" role="alert"><p>{t.error} {error}</p><button type="button" onClick={() => setRetry((value) => value + 1)}>{t.retry}</button></div>}

          <section className="suggestion-workspace">
            <div className="panel suggestion-inbox">
              <div className="suggestion-inbox-heading">
                <strong>{t.inbox}</strong>
                <span>{suggestionPage?.total ?? 0}</span>
              </div>
              <div className="suggestion-inbox-list" aria-busy={loading}>
                {loading && !suggestionPage ? <p className="settings-loading">{t.loading}</p> : null}
                {suggestionPage?.suggestions.map((suggestion) => {
                  const unread = suggestion.status === "received";
                  return (
                    <button
                      type="button"
                      className={`suggestion-inbox-item ${selectedReference === suggestion.referenceNumber ? "suggestion-inbox-item-active" : ""} ${unread ? "suggestion-inbox-item-unread" : ""}`}
                      key={suggestion.referenceNumber}
                      onClick={() => {
                        setSelectedReference(suggestion.referenceNumber);
                        setReply("");
                        setNotice("");
                      }}
                    >
                      <SuggestionTypeBadge type={suggestion.type} language={language} />
                      {unread && <span className="unread-indicator" />}
                      <span className="suggestion-inbox-text">{suggestion.message}</span>
                      <small>{suggestion.referenceNumber} · {formatDate(suggestion.createdAt, locale)}</small>
                    </button>
                  );
                })}
                {!loading && suggestionPage?.suggestions.length === 0 && <p className="empty-search">{t.noSuggestions}</p>}
              </div>
              <Pagination
                page={suggestionPage?.page ?? page}
                totalPages={suggestionPage?.totalPages ?? 1}
                onPageChange={setPage}
                previous={t.previous}
                next={t.next}
                label={t.page}
                of={t.of}
                disabled={loading}
              />
            </div>

            <div className="panel suggestion-detail">
              {selectedSuggestion ? (
                <>
                  <header className="suggestion-detail-header">
                    <div><SuggestionTypeBadge type={selectedSuggestion.type} language={language} /><span className="suggestion-id">{selectedSuggestion.referenceNumber}</span></div>
                    <small>{t.submitted} · {formatDate(selectedSuggestion.createdAt, locale)}</small>
                  </header>
                  <blockquote className="suggestion-quote">“{selectedSuggestion.message}”</blockquote>
                  <div className="citizen-card">
                    <span className="citizen-avatar">{selectedSuggestion.citizenName?.slice(0, 2) ?? "न"}</span>
                    <span><strong>{selectedSuggestion.keepNamePrivate ? t.namePrivate : selectedSuggestion.citizenName ?? t.anonymous}</strong><small>{selectedSuggestion.keepNamePrivate ? t.namePrivate : t.submitted}</small></span>
                  </div>

                  <div className="detail-divider" />
                  <h3 className="suggestion-section-label">{t.actions}</h3>
                  <div className="suggestion-actions">
                    <button type="button" className="suggestion-action" disabled={saving} onClick={() => void performAction(selectedSuggestion.status === "read" ? "unread" : "read")}>
                      <span className="action-icon action-icon-green"><FiCheck size={18} /></span>
                      <span><strong>{selectedSuggestion.status === "read" ? t.markUnread : t.markRead}</strong><small>{t.readHint}</small></span>
                      <FiChevronRight className="action-chevron" size={17} />
                    </button>
                    <button type="button" className="suggestion-action" disabled={saving} onClick={() => void performAction("highlight", { enabled: !selectedSuggestion.isHighlighted })}>
                      <span className="action-icon action-icon-amber"><FiStar size={17} /></span>
                      <span><strong>{selectedSuggestion.isHighlighted ? t.unhighlight : t.highlight}</strong><small>{selectedSuggestion.isHighlighted ? t.highlighted : t.highlight}</small></span>
                      <FiChevronRight className="action-chevron" size={17} />
                    </button>
                  </div>

                  {selectedSuggestion.adminReplies.map((item, index) => (
                    <article className="suggestion-admin-reply" key={`${item.createdAt}-${index}`}>
                      <strong>{item.repliedBy} · {formatDate(item.createdAt, locale)}</strong>
                      <p>{item.message}</p>
                    </article>
                  ))}

                  <div className="reply-heading-row"><h3 className="suggestion-section-label">{t.replyTitle}</h3>{notice && <span className="reply-success"><FiCheck size={13} />{notice}</span>}</div>
                  <textarea className="suggestion-reply" aria-label={t.replyTitle} placeholder={t.replyPlaceholder} value={reply} onChange={(event) => setReply(event.target.value)} maxLength={1000} />
                  {templateLoadError && <p className="suggestion-reply-caveat" role="alert">{t.templateLoadError} {templateLoadError}</p>}
                  <div className="reply-controls">
                    <div className="reply-template"><FiMenu size={14} /><AdminSelect
                      className="reply-template-select"
                      ariaLabel={t.templatePlaceholder}
                      value={replyTemplate}
                      onChange={(template) => {
                        setReplyTemplate(template);
                        const selectedTemplate = replyTemplates.find((item) => item._id === template);
                        if (selectedTemplate) setReply(selectedTemplate.message);
                      }}
                      options={[
                        { value: "", label: t.templatePlaceholder },
                        ...replyTemplates.map((template) => ({
                          value: template._id,
                          label: `${template.title} · ${template.language.toUpperCase()}`,
                        })),
                      ]}
                    /></div>
                    <button type="button" className="send-reply-button" disabled={saving || !reply.trim()} onClick={() => void performAction("reply", { message: reply.trim() })}>{saving ? <FiRefreshCw className="settings-spinning" size={13} /> : t.saveReply}<FiSend size={13} /></button>
                  </div>
                  <p className="suggestion-reply-caveat">{t.replyCaveat}</p>
                </>
              ) : (
                <div className="suggestion-empty-detail"><FiMessageCircle size={26} /><p>{loading ? t.loading : t.noSuggestions}</p></div>
              )}
            </div>
          </section>
        </>
      ) : (
        <section className="panel feedback-workspace" aria-busy={loading}>
          <div className="feedback-summary">
            <div><FiStar size={18} /><span><strong>{feedbackPage?.summary.averageRating.toFixed(1) ?? "0.0"} / 5</strong><small>{t.rating}</small></span></div>
            <div><FiFileText size={18} /><span><strong>{feedbackPage?.summary.total ?? 0}</strong><small>{t.responses}</small></span></div>
          </div>
          {error && <div className="settings-error-block" role="alert"><p>{t.error} {error}</p><button type="button" onClick={() => setRetry((value) => value + 1)}>{t.retry}</button></div>}
          {loading && !feedbackPage ? <p className="settings-loading">{t.loadingFeedback}</p> : null}
          {feedbackPage?.feedback.length ? (
            <div className="feedback-list">
              {feedbackPage.feedback.map((item) => (
                <article className="feedback-card" key={item.complaintNumber}>
                  <header>
                    <div><strong>{t.complaint} {item.complaintNumber}</strong><small>{t.category}: {t.categoryNames[item.category as keyof typeof t.categoryNames] ?? item.category}</small></div>
                    <time>{formatDate(item.submittedAt, locale)}</time>
                  </header>
                  <p className={`feedback-confirmation ${item.confirmation === "resolved" ? "feedback-confirmation-positive" : "feedback-confirmation-attention"}`}>
                    {item.confirmation === "resolved" ? t.resolved : t.notResolved}
                  </p>
                  {item.rating !== null && <div className="feedback-rating" aria-label={`${item.rating} / 5`}>{Array.from({ length: 5 }, (_, index) => <FiStar key={index} className={item.rating !== null && index < item.rating ? "feedback-star-filled" : ""} />)}<strong>{item.rating} / 5</strong></div>}
                  {item.tags.length > 0 && <div className="feedback-tags">{item.tags.map((tag) => <span key={tag}>{t.tags[tag as keyof typeof t.tags] ?? tag}</span>)}</div>}
                  <h3>{t.comment}</h3>
                  <p className="feedback-comment">{item.comment || t.noComment}</p>
                  <div className="suggestion-actions">
                    <button type="button" className="suggestion-action" disabled={saving} onClick={() => void performFeedbackAction(item, item.isRead ? "unread" : "read")}>
                      <span className="action-icon action-icon-green"><FiCheck size={18} /></span>
                      <span><strong>{item.isRead ? t.feedbackMarkUnread : t.feedbackMarkRead}</strong><small>{item.readBy ? `${item.readBy} · ${formatDate(item.readAt, locale)}` : t.readHint}</small></span>
                      <FiChevronRight className="action-chevron" size={17} />
                    </button>
                    <button type="button" className="suggestion-action" disabled={saving} onClick={() => void performFeedbackAction(item, "highlight", { enabled: !item.isHighlighted })}>
                      <span className="action-icon action-icon-amber"><FiStar size={17} /></span>
                      <span><strong>{item.isHighlighted ? t.feedbackUnhighlight : t.feedbackHighlight}</strong><small>{item.isHighlighted ? t.highlighted : t.feedbackHighlight}</small></span>
                      <FiChevronRight className="action-chevron" size={17} />
                    </button>
                  </div>
                  {item.adminReplies.map((sentReply, index) => (
                    <article className="suggestion-admin-reply" key={`${sentReply.createdAt}-${index}`}>
                      <strong>{sentReply.repliedBy} · {formatDate(sentReply.createdAt, locale)}</strong>
                      <p>{sentReply.message}</p>
                    </article>
                  ))}
                  <h3>{t.feedbackReply}</h3>
                  <textarea
                    className="suggestion-reply"
                    aria-label={`${t.feedbackReply} ${item.complaintNumber}`}
                    placeholder={t.feedbackReplyPlaceholder}
                    value={feedbackReplies[item.complaintNumber] ?? ""}
                    onChange={(event) => setFeedbackReplies((drafts) => ({
                      ...drafts,
                      [item.complaintNumber]: event.target.value,
                    }))}
                    maxLength={1000}
                  />
                  <div className="reply-controls">
                    <span>{notice}</span>
                    <button
                      type="button"
                      className="send-reply-button"
                      disabled={saving || !(feedbackReplies[item.complaintNumber] ?? "").trim()}
                      onClick={() => void performFeedbackAction(item, "reply", {
                        message: (feedbackReplies[item.complaintNumber] ?? "").trim(),
                      })}
                    >
                      {saving ? <FiRefreshCw className="settings-spinning" size={13} /> : t.feedbackSend}<FiSend size={13} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : !loading && feedbackPage ? <p className="analytics-empty">{t.noFeedback}</p> : null}
          <Pagination
            page={feedbackPage?.page ?? page}
            totalPages={feedbackPage?.totalPages ?? 1}
            onPageChange={setPage}
            previous={t.previous}
            next={t.next}
            label={t.page}
            of={t.of}
            disabled={loading}
          />
        </section>
      )}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
  previous,
  next,
  label,
  of,
  disabled,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  previous: string;
  next: string;
  label: string;
  of: string;
  disabled: boolean;
}) {
  return (
    <nav className="suggestion-pagination" aria-label={`${label} ${page} ${of} ${totalPages}`}>
      <button type="button" disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)}>{previous}</button>
      <span>{label} {page} {of} {totalPages}</span>
      <button type="button" disabled={disabled || page >= totalPages} onClick={() => onPageChange(page + 1)}>{next}</button>
    </nav>
  );
}
