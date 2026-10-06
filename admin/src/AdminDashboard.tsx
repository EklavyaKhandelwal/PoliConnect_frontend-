import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import {
  FiBell,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiClock,
  FiClipboard,
  FiFileText,
  FiGlobe,
  FiGrid,
  FiEye,
  FiEyeOff,
  FiLock,
  FiLogOut,
  FiMail,
  FiMenu,
  FiMessageCircle,
  FiRefreshCw,
  FiSearch,
  FiSettings,
  FiUsers,
  FiX,
} from "react-icons/fi";
import leaderImage from "../../src/assets/images/leader.png";
import { useAdminAuth } from "./adminAuth";
import AdminSettings from "./AdminSettings";
import AdminSystemSettings from "./AdminSystemSettings";
import AdminSelect from "./AdminSelect";
import AdminComplaints from "./AdminComplaints";
import AdminSuggestions from "./AdminSuggestions";
import { defaultAdminConfiguration, type AdminConfiguration, type ComplaintActivityType } from "./adminSettingsTypes";

type Language = "hi" | "en" | "mr";
type Section = "overview" | "complaints" | "suggestions" | "reports" | "departments" | "templates" | "settings";
type AnalyticsRange = { from: string; to: string; bucket: "hour" | "day" | "month" };

interface AnalyticsData {
  range: { from: string; to: string };
  bucket: "hour" | "day" | "month";
  metrics: {
    submitted: number;
    open: number;
    resolved: number;
    overdue: number;
    resolutionRate: number;
  };
  categoryBreakdown: Array<{ category: string; count: number }>;
  statusBreakdown: Array<{ status: string; count: number }>;
  trend: Array<{ period: string; count: number }>;
  recentActivity: Array<{
    complaintNumber: string;
    category: string;
    type: ComplaintActivityType;
    status: string | null;
    message: string | null;
    updatedBy: string | null;
    createdAt: string;
  }>;
  recentComplaints: Array<{
    complaintNumber: string;
    category: string;
    details: string;
    area: string;
    status: string;
    assignedDepartment: { id: string; name: string; code: string } | null;
    slaDeadline: string | null;
    slaPausedAt: string | null;
    createdAt: string | null;
  }>;
}

type ComplaintActivity = AnalyticsData["recentActivity"][number];
type AdminNotification = ComplaintActivity & { id: string; isRead: boolean };

const notificationId = (activity: ComplaintActivity) =>
  "id" in activity && typeof activity.id === "string"
    ? activity.id
    : `${activity.complaintNumber}:${activity.type}:${activity.createdAt}`;

const analyticsText = {
  en: {
    dateRange: "Date range",
    from: "From",
    to: "To",
    last7: "7 days",
    last30: "30 days",
    last12Months: "12 months",
    today: "Today · hourly",
    submitted: "Submitted",
    submittedHelp: "Created during this range",
    open: "Open now",
    openHelp: "Current complaints not resolved or rejected",
    resolvedInRange: "Resolved",
    resolvedHelp: "Marked resolved during this range",
    overdueNow: "Overdue now",
    overdueHelp: "Open, past SLA, and not paused",
    resolutionRate: "Resolution rate",
    rateHelp: "Resolved in range ÷ submitted in range",
    categories: "Submissions by category",
    statusBreakdown: "Current status of submissions",
    trend: "Complaint submissions over time",
    recentComplaints: "Recent complaints",
    recentActivity: "Recent activity",
    activityFilter: "Complaint",
    allComplaints: "All complaints",
    updates: "updates",
    loadingNotifications: "Loading recent updates…",
    noNotifications: "No recent complaint updates.",
    noUnreadNotifications: "You’re all caught up.",
    notificationError: "Could not load notifications.",
    markAllRead: "Mark all read",
    allNotifications: "All",
    unreadNotifications: "Unread",
    loadMoreNotifications: "Load older notifications",
    noComplaints: "No complaints were submitted during this date range.",
    noActivity: "No complaint activity in this date range.",
    loading: "Loading live complaint data…",
    loadError: "Could not load dashboard data.",
    retry: "Retry",
    sla: "SLA deadline",
    paused: "Paused",
    assigned: "Assigned",
    events: {
      registered: "Complaint submitted",
      assigned: "Complaint assigned",
      status_changed: "Status updated",
      resolved: "Complaint resolved",
      rejected: "Complaint rejected",
      citizen_reply: "Citizen replied",
      citizen_reopened: "Complaint reopened",
    },
    statuses: {
      received: "New",
      under_review: "Under review",
      in_progress: "In progress",
      waiting_for_citizen: "Waiting for citizen",
      resolved: "Resolved",
      rejected: "Rejected",
    },
  },
  hi: {
    dateRange: "तारीख की अवधि",
    from: "से",
    to: "तक",
    last7: "7 दिन",
    last30: "30 दिन",
    last12Months: "12 महीने",
    today: "आज · घंटेवार",
    submitted: "दर्ज शिकायतें",
    submittedHelp: "इस अवधि में दर्ज",
    open: "अभी खुली",
    openHelp: "जो हल या अस्वीकृत नहीं हुईं",
    resolvedInRange: "हल की गईं",
    resolvedHelp: "इस अवधि में हल चिह्नित",
    overdueNow: "समय-सीमा पार",
    overdueHelp: "खुली, समय-सीमा पार और रुकी नहीं",
    resolutionRate: "समाधान दर",
    rateHelp: "अवधि में हल ÷ अवधि में दर्ज",
    categories: "श्रेणी के अनुसार दर्ज शिकायतें",
    statusBreakdown: "दर्ज शिकायतों की वर्तमान स्थिति",
    trend: "समय के अनुसार शिकायतें",
    recentComplaints: "हाल की शिकायतें",
    recentActivity: "हाल की गतिविधि",
    activityFilter: "शिकायत",
    allComplaints: "सभी शिकायतें",
    updates: "अपडेट",
    loadingNotifications: "हाल के अपडेट लोड हो रहे हैं…",
    noNotifications: "शिकायतों के कोई हालिया अपडेट नहीं हैं।",
    noUnreadNotifications: "कोई अपठित सूचना नहीं है।",
    notificationError: "सूचनाएँ लोड नहीं हो सकीं।",
    markAllRead: "सभी पढ़े हुए चिह्नित करें",
    allNotifications: "सभी",
    unreadNotifications: "अपठित",
    loadMoreNotifications: "पुरानी सूचनाएँ लोड करें",
    noComplaints: "इस तारीख की अवधि में कोई शिकायत दर्ज नहीं हुई।",
    noActivity: "इस तारीख की अवधि में कोई गतिविधि नहीं।",
    loading: "लाइव शिकायत डेटा लोड हो रहा है…",
    loadError: "डैशबोर्ड डेटा लोड नहीं हो सका।",
    retry: "फिर कोशिश करें",
    sla: "समय-सीमा",
    paused: "रुकी हुई",
    assigned: "विभाग",
    events: {
      registered: "शिकायत दर्ज हुई",
      assigned: "शिकायत नियत हुई",
      status_changed: "स्थिति अपडेट हुई",
      resolved: "शिकायत हल हुई",
      rejected: "शिकायत अस्वीकृत हुई",
      citizen_reply: "नागरिक ने जवाब दिया",
      citizen_reopened: "शिकायत फिर खोली गई",
    },
    statuses: {
      received: "नई",
      under_review: "जाँच में",
      in_progress: "काम जारी",
      waiting_for_citizen: "नागरिक के जवाब की प्रतीक्षा",
      resolved: "हल",
      rejected: "अस्वीकृत",
    },
  },
  mr: {
    dateRange: "तारीख श्रेणी",
    from: "पासून",
    to: "पर्यंत",
    last7: "7 दिवस",
    last30: "30 दिवस",
    last12Months: "१२ महिने",
    today: "आज · तासानुसार",
    submitted: "दाखल तक्रारी",
    submittedHelp: "या कालावधीत दाखल",
    open: "सध्या खुल्या",
    openHelp: "निकाली किंवा नामंजूर नसलेल्या",
    resolvedInRange: "निकाली",
    resolvedHelp: "या कालावधीत निकाली म्हणून चिन्हांकित",
    overdueNow: "मुदत संपली",
    overdueHelp: "खुल्या, मुदत संपलेली आणि थांबवलेली नाही",
    resolutionRate: "निकाल दर",
    rateHelp: "कालावधीत निकाली ÷ कालावधीत दाखल",
    categories: "वर्गानुसार दाखल तक्रारी",
    statusBreakdown: "दाखल तक्रारींची सध्याची स्थिती",
    trend: "कालावधीनुसार तक्रारी",
    recentComplaints: "अलीकडील तक्रारी",
    recentActivity: "अलीकडील हालचाली",
    activityFilter: "तक्रार",
    allComplaints: "सर्व तक्रारी",
    updates: "अपडेट",
    loadingNotifications: "अलीकडील अपडेट लोड होत आहेत…",
    noNotifications: "तक्रारींचे अलीकडील अपडेट नाहीत.",
    noUnreadNotifications: "अपठित सूचना नाहीत.",
    notificationError: "सूचना लोड होऊ शकल्या नाहीत.",
    markAllRead: "सर्व वाचलेले म्हणून चिन्हांकित करा",
    allNotifications: "सर्व",
    unreadNotifications: "न वाचलेले",
    loadMoreNotifications: "जुन्या सूचना लोड करा",
    noComplaints: "या तारीख श्रेणीत कोणतीही तक्रार दाखल नाही.",
    noActivity: "या तारीख श्रेणीत तक्रारीची हालचाल नाही.",
    loading: "थेट तक्रार डेटा लोड होत आहे…",
    loadError: "डॅशबोर्ड डेटा लोड होऊ शकला नाही.",
    retry: "पुन्हा प्रयत्न करा",
    sla: "मुदत",
    paused: "थांबवले",
    assigned: "विभाग",
    events: {
      registered: "तक्रार दाखल झाली",
      assigned: "तक्रार नेमली",
      status_changed: "स्थिती अपडेट झाली",
      resolved: "तक्रार निकाली",
      rejected: "तक्रार नामंजूर",
      citizen_reply: "नागरिकाने उत्तर दिले",
      citizen_reopened: "तक्रार पुन्हा उघडली",
    },
    statuses: {
      received: "नवीन",
      under_review: "तपासणी सुरू",
      in_progress: "काम सुरू",
      waiting_for_citizen: "नागरिकाच्या उत्तराची प्रतीक्षा",
      resolved: "निकाली",
      rejected: "नामंजूर",
    },
  },
} satisfies Record<Language, {
  dateRange: string;
  from: string;
  to: string;
  last7: string;
  last30: string;
  last12Months: string;
  today: string;
  submitted: string;
  submittedHelp: string;
  open: string;
  openHelp: string;
  resolvedInRange: string;
  resolvedHelp: string;
  overdueNow: string;
  overdueHelp: string;
  resolutionRate: string;
  rateHelp: string;
  categories: string;
  statusBreakdown: string;
  trend: string;
  recentComplaints: string;
  recentActivity: string;
  activityFilter: string;
  allComplaints: string;
  updates: string;
  loadingNotifications: string;
  noNotifications: string;
  noUnreadNotifications: string;
  notificationError: string;
  markAllRead: string;
  allNotifications: string;
  unreadNotifications: string;
  loadMoreNotifications: string;
  noComplaints: string;
  noActivity: string;
  loading: string;
  loadError: string;
  retry: string;
  sla: string;
  paused: string;
  assigned: string;
  events: Record<string, string>;
  statuses: Record<string, string>;
}>;

const translations = {
  hi: {
    brand: "जन-शिकायत केंद्र",
    office: "सांसद कार्यालय · झांसी-ललितपुर",
    overview: "ओवरव्यू",
    complaints: "शिकायतें",
    suggestions: "सुझाव",
    reports: "रिपोर्ट",
    departments: "विभाग व अधिकारी",
    templates: "उत्तर के साँचे",
    settings: "सेटिंग",
    settingsLoadError: "संस्था की सेटिंग लोड नहीं हो सकीं; डिफ़ॉल्ट जानकारी दिखाई जा रही है।",
    today: "आज",
    dashboard: "ओवरव्यू",
    dateSubtitle: "शिकायतों और नागरिक सेवाओं की आज की स्थिति",
    search: "शिकायत नंबर, नाम या गाँव खोजें",
    newToday: "नई (आज)",
    overdue: "समय-सीमा पार",
    inProgress: "काम जारी",
    citizenReply: "नागरिक के जवाब का इंतज़ार",
    resolved: "इस सप्ताह हल",
    addedSinceYesterday: "कल से नई",
    needsAttention: "तुरंत ध्यान दें",
    pause: "रोकें",
    ofTotal: "कुल",
    activeByCategory: "श्रेणी के अनुसार सक्रिय शिकायतें",
    last14Days: "खुली शिकायतें · पिछले 14 दिन",
    comparedTo: "14 दिन पहले",
    comparedNow: "आज",
    recentComplaints: "ध्यान चाहिए",
    seeAll: "सभी देखें",
    tableSubtitle: "समय-सीमा पार, नागरिक के जवाब का इंतज़ार, या हाल ही में नई",
    complaint: "शिकायत",
    location: "स्थान",
    status: "स्थिति",
    responseTime: "समय-सीमा",
    department: "विभाग",
    suggestionPanel: "नए सुझाव",
    suggestionsAll: "सभी सुझाव देखें",
    daysAgo: "दिन पहले",
    hoursAgo: "घंटे पहले",
    water: "पानी",
    road: "सड़क",
    electricity: "बिजली",
    cleanliness: "सफाई",
    health: "स्वास्थ्य",
    ration: "राशन / पेंशन",
    other: "अन्य",
    working: "काम जारी",
    waitingCitizen: "नागरिक के जवाब का इंतज़ार",
    overdueTag: "समय-सीमा पार",
    newTag: "नई",
    departmentP: "PWD",
    departmentEducation: "बेसिक शिक्षा",
    departmentWater: "जल निगम",
    departmentSocial: "समाज कल्याण",
    neutral: "—",
    suggestionWater: "बस्ती में कई हैंड पंप महिलाओं के लिए शौचालय और पीने के पानी की व्यवस्था हो।",
    suggestionThanks: "मेडिकल कॉलेज की नई ओपीडी ने बहुत राहत दी। पूरी टीम को धन्यवाद।",
    suggestionQuestion: "ललितपुर में रोजगार मेला कब लगेगा? तारीख पहले बता दें तो अच्छा।",
    area: "सिपरी बाज़ार",
    locationJhansi: "सिपरी, झांसी",
    mau: "मऊ",
    babina: "बबीना",
    talbehat: "तालबेहट",
    lalitpur: "ललितपुर",
    avatarName: "अमित वर्मा",
    avatarRole: "जनसंपर्क अधिकारी",
    navComing: "यह पृष्ठ जल्द उपलब्ध होगा।",
    noResults: "कोई मेल खाती शिकायत नहीं मिली।",
    notifications: "सूचनाएँ",
    language: "भाषा",
    adminLoginTitle: "प्रशासक लॉगिन",
    adminLoginDescription: "प्रशासन डैशबोर्ड में प्रवेश करने के लिए साइन इन करें।",
    authPanelTitle: "जवाबदेह प्रशासन, बेहतर सेवा।",
    authPanelDescription: "नागरिकों की शिकायतों और सुझावों को सुरक्षित रूप से संभालने के लिए साइन इन करें।",
    authBenefitOne: "शिकायतों की स्थिति और प्रगति देखें",
    authBenefitTwo: "विभागों के साथ कार्रवाई का समन्वय करें",
    authBenefitThree: "हर अपडेट को सुरक्षित और जवाबदेह रखें",
    secureAdminAccess: "सुरक्षित प्रशासक पहुँच",
    passwordVisibility: "पासवर्ड दिखाएँ",
    hidePassword: "पासवर्ड छिपाएँ",
    emailAddress: "ईमेल",
    password: "पासवर्ड",
    signIn: "साइन इन करें",
    signingIn: "साइन इन हो रहा है...",
    signOut: "लॉग आउट",
    signOutConfirmTitle: "लॉग आउट करें?",
    signOutConfirmMessage: "क्या आप प्रशासक डैशबोर्ड से लॉग आउट करना चाहते हैं?",
    cancel: "रद्द करें",
    confirmingSignOut: "लॉग आउट हो रहा है...",
    ownerRole: "मालिक",
    adminRole: "प्रशासक",
    retryConnection: "पुनः प्रयास करें",
    checkingAccess: "प्रशासक पहुँच की जाँच हो रही है...",
    searchSuggestions: "सुझाव संदर्भ संख्या या संदेश खोजें",
    allSuggestions: "सभी",
    unreadSuggestions: "बिना पढ़े",
    ideas: "सुझाव",
    thanks: "धन्यवाद",
    questions: "सवाल",
    suggestionResults: "नागरिकों के सुझाव और शिकायत प्रतिक्रिया देखें।",
    allSuggestionsCount: "सभी सुझाव",
    suggestionQuestionType: "सवाल",
    suggestionThanksType: "धन्यवाद",
    suggestionIdeaType: "सुझाव",
    citizen: "नागरिक",
    actionHeader: "कार्रवाई",
    markRead: "पढ़ा हुआ चिन्ह करें",
    readHint: "नागरिक को कोई सूचना नहीं",
    highlightSuggestion: "सांसद जी को दिखाएँ",
    highlightHint: "साप्ताहिक सारांश में शामिल होगा",
    convertComplaint: "इसे शिकायत में बदलें",
    convertHint: "मंदर संख्या, समय-सीमा चुनें, विभाग को टैग करना",
    replyHeader: "नागरिक को उत्तर (वैकल्पिक)",
    replyPlaceholder: "अपना उत्तर लिखें...",
    replyTemplate: "साँचा: सुझाव के लिए धन्यवाद",
    replyTemplateThanks: "सुझाव के लिए धन्यवाद",
    replyTemplateReview: "समीक्षा के लिए अग्रेषित",
    replyTemplateComplaint: "शिकायत हेतु आवश्यक जानकारी",
    sendReply: "उत्तर भेजें",
    replySent: "उत्तर भेज दिया गया (स्थिर पूर्वावलोकन)।",
    suggestionSelected: "सुझाव चुनें",
    selectedAuthor: "सीमा सिंह",
    replyDefault: "सीमा जी, आपके सुझाव के लिए धन्यवाद। बस नगर पालिका और परिवहन विभाग के साथ अगली बैठक में इसे साझा किया जाएगा।",
    statusRead: "पढ़ा गया",
    statusHighlighted: "साप्ताहिक सारांश में जोड़ा गया",
    statusConverted: "शिकायत में बदलने के लिए चुना गया",
    daysShort: "दिन",
    todayTime: "आज, 4:12 PM",
    yesterdayTime: "कल, 11:40 AM",
    rajuName: "राजू यादव",
    poojaName: "पूजा देवी",
    anilName: "अनिल कुमार",
    manjuName: "मंजू देवी",
    suggestionSchool: "गाँव के सरकारी स्कूल में कंप्यूटर लैब शुरू हो तो बच्चों को फायदा होगा।",
    suggestionRoadThanks: "हमारे गाँव की सड़क के डामर में काम हुआ। आपका आभार।",
    suggestionHealth: "महिलाओं के लिए एक दिन मोबाइल स्वास्थ्य सेवा भेजें।",
    suggestionJobs: "बुंदेलखंड एक्सप्रेसवे के पास का सर्विस रोड कब तक बनेगा?",
  },
  en: {
    brand: "Public Grievance Centre",
    office: "MP Office · Jhansi-Lalitpur",
    overview: "Overview",
    complaints: "Complaints",
    suggestions: "Suggestions",
    reports: "Reports",
    departments: "Departments & officers",
    templates: "Reply templates",
    settings: "Settings",
    settingsLoadError: "Organization settings could not be loaded; defaults are being shown.",
    today: "Today",
    dashboard: "Overview",
    dateSubtitle: "Today’s complaint and citizen service snapshot",
    search: "Search complaint no., name or village",
    newToday: "New today",
    overdue: "SLA overdue",
    inProgress: "In progress",
    citizenReply: "Awaiting citizen",
    resolved: "Resolved this week",
    addedSinceYesterday: "Added since yesterday",
    needsAttention: "Needs attention",
    pause: "Pause",
    ofTotal: "of total",
    activeByCategory: "Active complaints by category",
    last14Days: "Open complaints · last 14 days",
    comparedTo: "14 days ago",
    comparedNow: "Today",
    recentComplaints: "Needs attention",
    seeAll: "See all",
    tableSubtitle: "Overdue, awaiting citizen reply, or recently received",
    complaint: "Complaint",
    location: "Location",
    status: "Status",
    responseTime: "SLA",
    department: "Department",
    suggestionPanel: "New suggestions",
    suggestionsAll: "View all suggestions",
    daysAgo: "days ago",
    hoursAgo: "hours ago",
    water: "Water",
    road: "Road",
    electricity: "Electricity",
    cleanliness: "Cleanliness",
    health: "Health",
    ration: "Ration / pension",
    other: "Other",
    working: "In progress",
    waitingCitizen: "Awaiting citizen",
    overdueTag: "SLA overdue",
    newTag: "New",
    departmentP: "PWD",
    departmentEducation: "Basic Education",
    departmentWater: "Water Board",
    departmentSocial: "Social Welfare",
    neutral: "—",
    suggestionWater: "Several hand pumps in the neighbourhood are broken. Please arrange toilets and drinking water for women.",
    suggestionThanks: "The medical college’s new OPD has brought great relief. Thanks to the whole team.",
    suggestionQuestion: "When will the employment fair be held in Lalitpur? Sharing the date in advance would help.",
    area: "Sipri Bazaar",
    locationJhansi: "Sipri, Jhansi",
    mau: "Mau",
    babina: "Babina",
    talbehat: "Talbehat",
    lalitpur: "Lalitpur",
    avatarName: "Amit Verma",
    avatarRole: "Public Relations Officer",
    navComing: "This page will be available soon.",
    noResults: "No matching complaints found.",
    notifications: "Notifications",
    language: "Language",
    adminLoginTitle: "Admin sign in",
    adminLoginDescription: "Sign in to access the administration dashboard.",
    authPanelTitle: "Accountable administration. Better service.",
    authPanelDescription: "Sign in to securely manage citizens’ complaints and suggestions.",
    authBenefitOne: "Track complaint status and progress",
    authBenefitTwo: "Coordinate actions across departments",
    authBenefitThree: "Keep every update secure and accountable",
    secureAdminAccess: "Secure administrator access",
    passwordVisibility: "Show password",
    hidePassword: "Hide password",
    emailAddress: "Email",
    password: "Password",
    signIn: "Sign in",
    signingIn: "Signing in...",
    signOut: "Sign out",
    signOutConfirmTitle: "Sign out?",
    signOutConfirmMessage: "Are you sure you want to sign out of the admin dashboard?",
    cancel: "Cancel",
    confirmingSignOut: "Signing out...",
    ownerRole: "Owner",
    adminRole: "Administrator",
    retryConnection: "Retry connection",
    checkingAccess: "Checking admin access...",
    searchSuggestions: "Search suggestion reference or message",
    allSuggestions: "All",
    unreadSuggestions: "Unread",
    ideas: "Ideas",
    thanks: "Thanks",
    questions: "Questions",
    suggestionResults: "Review citizen suggestions and complaint feedback.",
    allSuggestionsCount: "All suggestions",
    suggestionQuestionType: "Question",
    suggestionThanksType: "Thanks",
    suggestionIdeaType: "Idea",
    citizen: "Citizen",
    actionHeader: "Actions",
    markRead: "Mark as read",
    readHint: "No citizen notification",
    highlightSuggestion: "Highlight for MP",
    highlightHint: "Include in weekly summary",
    convertComplaint: "Convert to complaint",
    convertHint: "Choose a category, SLA and department",
    replyHeader: "Reply to citizen (optional)",
    replyPlaceholder: "Write your reply...",
    replyTemplate: "Template: Thanks for your suggestion",
    replyTemplateThanks: "Thanks for your suggestion",
    replyTemplateReview: "Forwarded for review",
    replyTemplateComplaint: "Details needed for a complaint",
    sendReply: "Send reply",
    replySent: "Reply sent (static preview).",
    suggestionSelected: "Select a suggestion",
    selectedAuthor: "Seema Singh",
    replyDefault: "Thank you for your suggestion, Seema. We’ll share it with the municipality and transport department at the next review meeting.",
    statusRead: "Marked as read",
    statusHighlighted: "Added to weekly summary",
    statusConverted: "Selected to convert to a complaint",
    daysShort: "days",
    todayTime: "Today, 4:12 PM",
    yesterdayTime: "Yesterday, 11:40 AM",
    rajuName: "Raju Yadav",
    poojaName: "Pooja Devi",
    anilName: "Anil Kumar",
    manjuName: "Manju Devi",
    suggestionSchool: "Starting a computer lab at the village government school would help children.",
    suggestionRoadThanks: "The road in our village has been resurfaced. Thank you.",
    suggestionHealth: "Please send a mobile health service for women once a week.",
    suggestionJobs: "When will the service road near the Bundelkhand Expressway be completed?",
  },
  mr: {
    brand: "जनता तक्रार केंद्र",
    office: "खासदार कार्यालय · झांसी-ललितपूर",
    overview: "आढावा",
    complaints: "तक्रारी",
    suggestions: "सूचना",
    reports: "अहवाल",
    departments: "विभाग व अधिकारी",
    templates: "उत्तर नमुने",
    settings: "सेटिंग्ज",
    settingsLoadError: "संस्थेच्या सेटिंग्ज लोड होऊ शकल्या नाहीत; डीफॉल्ट माहिती दाखवली आहे.",
    today: "आज",
    dashboard: "आढावा",
    dateSubtitle: "आजच्या तक्रारी आणि नागरिक सेवांचा आढावा",
    search: "तक्रार क्रमांक, नाव किंवा गाव शोधा",
    newToday: "आज नवीन",
    overdue: "मुदत संपली",
    inProgress: "काम सुरू",
    citizenReply: "नागरिकांच्या उत्तराची प्रतीक्षा",
    resolved: "या आठवड्यात सोडवले",
    addedSinceYesterday: "कालपासून नवीन",
    needsAttention: "लक्ष देणे आवश्यक",
    pause: "थांबवा",
    ofTotal: "एकूण",
    activeByCategory: "वर्गानुसार सक्रिय तक्रारी",
    last14Days: "खुल्या तक्रारी · मागील 14 दिवस",
    comparedTo: "14 दिवसांपूर्वी",
    comparedNow: "आज",
    recentComplaints: "लक्ष द्या",
    seeAll: "सर्व पहा",
    tableSubtitle: "मुदत संपलेली, नागरिकांच्या उत्तराची प्रतीक्षा किंवा नवीन",
    complaint: "तक्रार",
    location: "ठिकाण",
    status: "स्थिती",
    responseTime: "मुदत",
    department: "विभाग",
    suggestionPanel: "नवीन सूचना",
    suggestionsAll: "सर्व सूचना पहा",
    daysAgo: "दिवसांपूर्वी",
    hoursAgo: "तासांपूर्वी",
    water: "पाणी",
    road: "रस्ता",
    electricity: "वीज",
    cleanliness: "स्वच्छता",
    health: "आरोग्य",
    ration: "रेशन / पेन्शन",
    other: "इतर",
    working: "काम सुरू",
    waitingCitizen: "नागरिकांच्या उत्तराची प्रतीक्षा",
    overdueTag: "मुदत संपली",
    newTag: "नवीन",
    departmentP: "PWD",
    departmentEducation: "मूलभूत शिक्षण",
    departmentWater: "जल मंडळ",
    departmentSocial: "समाज कल्याण",
    neutral: "—",
    suggestionWater: "वस्तीतील अनेक हँडपंप बंद आहेत. महिलांसाठी शौचालय आणि पिण्याच्या पाण्याची व्यवस्था करा.",
    suggestionThanks: "वैद्यकीय महाविद्यालयाच्या नवीन ओपीडीमुळे मोठा दिलासा मिळाला. संपूर्ण टीमचे आभार.",
    suggestionQuestion: "ललितपूरमध्ये रोजगार मेळा कधी होईल? तारीख आधी सांगितल्यास चांगले.",
    area: "सिपरी बाजार",
    locationJhansi: "सिपरी, झांसी",
    mau: "मऊ",
    babina: "बबीना",
    talbehat: "तालबेहट",
    lalitpur: "ललितपूर",
    avatarName: "अमित वर्मा",
    avatarRole: "जनसंपर्क अधिकारी",
    navComing: "हे पृष्ठ लवकरच उपलब्ध होईल.",
    noResults: "जुळणाऱ्या तक्रारी सापडल्या नाहीत.",
    notifications: "सूचना",
    language: "भाषा",
    adminLoginTitle: "प्रशासक लॉगिन",
    adminLoginDescription: "प्रशासन डॅशबोर्डमध्ये प्रवेश करण्यासाठी साइन इन करा.",
    authPanelTitle: "जबाबदार प्रशासन, उत्तम सेवा.",
    authPanelDescription: "नागरिकांच्या तक्रारी आणि सूचना सुरक्षितपणे हाताळण्यासाठी साइन इन करा.",
    authBenefitOne: "तक्रारींची स्थिती आणि प्रगती पाहा",
    authBenefitTwo: "विभागांमधील कार्यवाहीचा समन्वय साधा",
    authBenefitThree: "प्रत्येक अपडेट सुरक्षित आणि जबाबदार ठेवा",
    secureAdminAccess: "सुरक्षित प्रशासक प्रवेश",
    passwordVisibility: "पासवर्ड दाखवा",
    hidePassword: "पासवर्ड लपवा",
    emailAddress: "ईमेल",
    password: "पासवर्ड",
    signIn: "साइन इन करा",
    signingIn: "साइन इन होत आहे...",
    signOut: "लॉग आउट",
    signOutConfirmTitle: "लॉग आउट करायचे?",
    signOutConfirmMessage: "तुम्हाला प्रशासक डॅशबोर्डमधून लॉग आउट करायचे आहे का?",
    cancel: "रद्द करा",
    confirmingSignOut: "लॉग आउट होत आहे...",
    ownerRole: "मालक",
    adminRole: "प्रशासक",
    retryConnection: "पुन्हा प्रयत्न करा",
    checkingAccess: "प्रशासक प्रवेश तपासत आहे...",
    searchSuggestions: "सूचना संदर्भ क्रमांक किंवा संदेश शोधा",
    allSuggestions: "सर्व",
    unreadSuggestions: "न वाचलेल्या",
    ideas: "सूचना",
    thanks: "आभार",
    questions: "प्रश्न",
    suggestionResults: "नागरिकांच्या सूचना आणि तक्रारींचा अभिप्राय पहा.",
    allSuggestionsCount: "सर्व सूचना",
    suggestionQuestionType: "प्रश्न",
    suggestionThanksType: "आभार",
    suggestionIdeaType: "सूचना",
    citizen: "नागरिक",
    actionHeader: "कारवाई",
    markRead: "वाचलेली म्हणून चिन्हांकित करा",
    readHint: "नागरिकाला सूचना पाठवली जाणार नाही",
    highlightSuggestion: "खासदारांना दाखवा",
    highlightHint: "साप्ताहिक सारांशात समाविष्ट होईल",
    convertComplaint: "तक्रारीत रूपांतर करा",
    convertHint: "वर्ग, मुदत आणि विभाग निवडा",
    replyHeader: "नागरिकाला उत्तर (ऐच्छिक)",
    replyPlaceholder: "तुमचे उत्तर लिहा...",
    replyTemplate: "नमुना: सूचनेसाठी धन्यवाद",
    replyTemplateThanks: "सूचनेसाठी धन्यवाद",
    replyTemplateReview: "पुनरावलोकनासाठी पाठवले",
    replyTemplateComplaint: "तक्रारीसाठी आवश्यक माहिती",
    sendReply: "उत्तर पाठवा",
    replySent: "उत्तर पाठवले (स्थिर पूर्वावलोकन).",
    suggestionSelected: "सूचना निवडा",
    selectedAuthor: "सीमा सिंह",
    replyDefault: "सीमा जी, तुमच्या सूचनेसाठी धन्यवाद. पुढील आढावा बैठकीत ती नगरपालिका आणि परिवहन विभागासोबत मांडू.",
    statusRead: "वाचले म्हणून चिन्हांकित",
    statusHighlighted: "साप्ताहिक सारांशात जोडले",
    statusConverted: "तक्रारीत रूपांतरासाठी निवडले",
    daysShort: "दिवस",
    todayTime: "आज, 4:12 PM",
    yesterdayTime: "काल, 11:40 AM",
    rajuName: "राजू यादव",
    poojaName: "पूजा देवी",
    anilName: "अनिल कुमार",
    manjuName: "मंजू देवी",
    suggestionSchool: "गावातील सरकारी शाळेत संगणक प्रयोगशाळा सुरू केल्यास मुलांना फायदा होईल.",
    suggestionRoadThanks: "आमच्या गावातील रस्त्याचे डांबरीकरण झाले. धन्यवाद.",
    suggestionHealth: "महिलांसाठी आठवड्यातून एकदा फिरती आरोग्य सेवा पाठवा.",
    suggestionJobs: "बुंदेलखंड द्रुतगती मार्गाजवळील सेवा रस्ता कधी पूर्ण होईल?",
  },
} satisfies Record<Language, Record<string, string>>;

const navItems: { key: Section; icon: typeof FiGrid; translation: keyof typeof translations.en }[] = [
  { key: "overview", icon: FiGrid, translation: "overview" },
  { key: "complaints", icon: FiClipboard, translation: "complaints" },
  { key: "suggestions", icon: FiMessageCircle, translation: "suggestions" },
  { key: "reports", icon: FiFileText, translation: "reports" },
  { key: "departments", icon: FiUsers, translation: "departments" },
  { key: "templates", icon: FiMenu, translation: "templates" },
  { key: "settings", icon: FiSettings, translation: "settings" },
];

const languageLabels: Record<Language, string> = { hi: "हिन्दी", en: "English", mr: "मराठी" };
const languages: Language[] = ["hi", "en", "mr"];

function LanguageMenu({
  language,
  label,
  className,
  onChange,
}: {
  language: Language;
  label: string;
  className: string;
  onChange: (language: Language) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const focusOption = (index: number) => {
    rootRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')[index]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Home" || event.key === "End") {
      event.preventDefault();
      if (!open) setOpen(true);
      const options = rootRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]');
      const focusedIndex = options ? Array.from(options).findIndex((option) => option === document.activeElement) : -1;
      const currentIndex = focusedIndex >= 0 ? focusedIndex : languages.indexOf(language);
      const nextIndex = event.key === "Home"
        ? 0
        : event.key === "End"
          ? languages.length - 1
          : (currentIndex + (event.key === "ArrowDown" ? 1 : languages.length - 1)) % languages.length;
      requestAnimationFrame(() => focusOption(nextIndex));
    }
  };

  return (
    <div
      className={`language-menu ${className}`}
      ref={rootRef}
      onKeyDown={handleKeyDown}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      {className === "auth-language" && <span>{label}</span>}
      <button
        type="button"
        className="language-menu-trigger"
        ref={triggerRef}
        aria-label={`${label}: ${languageLabels[language]}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {className !== "auth-language" && <FiGlobe className="language-globe" size={15} aria-hidden="true" />}
        <span>{languageLabels[language]}</span>
        <FiChevronDown className="language-chevron" size={14} aria-hidden="true" />
      </button>
      {open && (
        <div className="language-menu-popover" role="listbox" aria-label={label}>
          {languages.map((code) => (
            <button
              type="button"
              role="option"
              aria-selected={language === code}
              tabIndex={language === code ? 0 : -1}
              key={code}
              onClick={() => {
                onChange(code);
                setOpen(false);
                triggerRef.current?.focus();
              }}
            >
              <span>{languageLabels[code]}</span>
              {language === code && <FiCheck size={14} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function readLanguage(): Language {
  try {
    const saved = localStorage.getItem("citizen-admin-language");
    return saved === "en" || saved === "mr" || saved === "hi" ? saved : "hi";
  } catch {
    return "hi";
  }
}

function dateRangeForDays(days: number): AnalyticsRange {
  const today = new Date();
  const to = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const from = new Date(to.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    bucket: days === 1 ? "hour" : "day",
  };
}

function dateRangeForTwelveMonths(): AnalyticsRange {
  const today = new Date();
  const from = new Date(Date.UTC(today.getFullYear(), today.getMonth() - 11, 1));
  const to = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10), bucket: "month" };
}

function withRangeBucket(from: string, to: string): AnalyticsRange {
  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T00:00:00.000Z`);
  const days = Math.floor((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  return { from, to, bucket: days === 1 ? "hour" : days > 90 ? "month" : "day" };
}

function AnalyticsView({
  language,
  t,
  data,
  range,
  onRangeChange,
  loading,
  error,
  onRetry,
  reportMode,
}: {
  language: Language;
  t: typeof translations.en;
  data: AnalyticsData | null;
  range: AnalyticsRange;
  onRangeChange: (range: AnalyticsRange) => void;
  loading: boolean;
  error: string;
  onRetry: () => void;
  reportMode: boolean;
}) {
  const text = analyticsText[language];
  const locale = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN";
  const number = new Intl.NumberFormat(locale);
  const trend = data?.trend ?? [];
  const [activeTrendIndex, setActiveTrendIndex] = useState<number | null>(null);
  const [activityComplaint, setActivityComplaint] = useState("all");
  const trendMax = Math.max(1, ...trend.map((item) => item.count));
  const chartPoints = trend.map((item, index) => {
    const x = trend.length <= 1 ? 260 : 10 + (index / (trend.length - 1)) * 500;
    const y = 170 - (item.count / trendMax) * 140;
    return `${x},${y}`;
  });
  const trendLine = chartPoints.map((point, index) => `${index === 0 ? "M" : "L"}${point}`).join(" ");
  const trendArea = chartPoints.length
    ? `${trendLine} L${chartPoints[chartPoints.length - 1].split(",")[0]},174 L${chartPoints[0].split(",")[0]},174 Z`
    : "";
  const maxCategoryCount = Math.max(1, ...(data?.categoryBreakdown.map((item) => item.count) ?? []));
  const recentActivity = data?.recentActivity ?? [];
  const activityComplaintNumbers = Array.from(new Set(recentActivity.map((activity) => activity.complaintNumber)));
  const selectedActivityComplaint = activityComplaintNumbers.includes(activityComplaint) ? activityComplaint : "all";
  const visibleActivity = selectedActivityComplaint === "all"
    ? recentActivity
    : recentActivity.filter((activity) => activity.complaintNumber === selectedActivityComplaint);
  const activityGroups = visibleActivity.reduce<Array<{
    complaintNumber: string;
    category: string;
    activities: typeof recentActivity;
  }>>((groups, activity) => {
    const group = groups.find((item) => item.complaintNumber === activity.complaintNumber);
    if (group) group.activities.push(activity);
    else groups.push({
      complaintNumber: activity.complaintNumber,
      category: activity.category,
      activities: [activity],
    });
    return groups;
  }, []);

  const categoryName = (category: string) => {
    if (category === "education") {
      return language === "hi" ? "शिक्षा" : language === "mr" ? "शिक्षण" : "Education";
    }
    return t[category as keyof typeof t] ?? category;
  };
  const statusName = (status: string) =>
    Object.entries(text.statuses).find(([key]) => key === status)?.[1] ?? status.replaceAll("_", " ");
  const activityName = (type: string) =>
    Object.entries(text.events).find(([key]) => key === type)?.[1] ?? type;
  const formatDate = (value: string | null) => value
    ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(value))
    : "—";
  const periodLabel = (period: string, bucket = data?.bucket ?? range.bucket) => {
    const [date, hour] = period.split("T");
    const [year, month, day] = date.split("-").map(Number);
    const dateLabel = new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      ...(bucket === "month" ? { year: "numeric" as const } : {}),
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, bucket === "month" ? 1 : day)));
    if (hour === undefined) return dateLabel;
    const timeLabel = new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, day, Number(hour))));
    return `${dateLabel}, ${timeLabel}`;
  };
  const formatActivityTime = (value: string) => new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
  const presets = [
    { range: dateRangeForDays(1), label: text.today },
    { range: dateRangeForDays(7), label: text.last7 },
    { range: dateRangeForDays(30), label: text.last30 },
    { range: dateRangeForTwelveMonths(), label: text.last12Months },
  ];
  const setCustomRange = (from: string, to: string) => {
    if (from && to) onRangeChange(withRangeBucket(from, to));
  };

  const rangePicker = (
    <div className="analytics-range">
      <span>{text.dateRange}</span>
      <div className="analytics-presets" role="group" aria-label={text.dateRange}>
        {presets.map(({ range: preset, label }) => (
          <button
            type="button"
            key={label}
            className={range.from === preset.from && range.to === preset.to ? "analytics-preset-active" : ""}
            onClick={() => onRangeChange(preset)}
          >
            {label}
          </button>
        ))}
      </div>
      <label>{text.from}
        <input
          type="date"
          value={range.from}
          max={range.to}
          onChange={(event) => setCustomRange(event.target.value, range.to)}
        />
      </label>
      <label>{text.to}
        <input
          type="date"
          value={range.to}
          min={range.from}
          onChange={(event) => setCustomRange(range.from, event.target.value)}
        />
      </label>
    </div>
  );

  return (
    <div className="dashboard-content analytics-content" aria-busy={loading}>
      {rangePicker}
      {error && (
        <div className="analytics-error" role="alert">
          <span>{text.loadError} {error}</span>
          <button type="button" onClick={onRetry}>{text.retry}</button>
        </div>
      )}
      {loading && data && (
        <div className="analytics-refresh-indicator" role="status" aria-live="polite">
          <span className="page-spinner page-spinner-small" aria-hidden="true" />
          {text.loading}
        </div>
      )}
      {loading && !data ? (
        <p className="analytics-loading" role="status">{text.loading}</p>
      ) : data ? (
        <>
          <section className="stats-grid analytics-stats" aria-label={reportMode ? t.reports : t.overview} aria-busy={loading}>
            <StatCard icon={<FiClipboard />} tone="blue" title={text.submitted} value={number.format(data.metrics.submitted)} foot={text.submittedHelp} />
            <StatCard icon={<FiRefreshCw />} tone="amber" title={text.open} value={number.format(data.metrics.open)} foot={text.openHelp} />
            <StatCard icon={<FiCheck />} tone="green" title={text.resolvedInRange} value={number.format(data.metrics.resolved)} foot={text.resolvedHelp} />
            <StatCard icon={<FiClock />} tone="red" title={text.overdueNow} value={number.format(data.metrics.overdue)} foot={text.overdueHelp} />
            <StatCard icon={<FiFileText />} tone="blue" title={text.resolutionRate} value={`${number.format(data.metrics.resolutionRate)}%`} foot={text.rateHelp} />
          </section>

          <section className="chart-grid analytics-charts">
            <article className="panel category-panel">
              <PanelHeading title={text.categories} subtitle={`${text.submitted}: ${number.format(data.metrics.submitted)}`} />
              <div className="bar-chart">
                {data.categoryBreakdown.map(({ category, count }) => (
                  <div className="bar-row" key={category}>
                    <span className="bar-label">{categoryName(category)}</span>
                    <span className="bar-track"><span className="bar-fill" style={{ width: `${(count / maxCategoryCount) * 100}%` }} /></span>
                    <strong>{number.format(count)}</strong>
                  </div>
                ))}
              </div>
            </article>
            <article className="panel trend-panel">
              <PanelHeading title={text.trend} subtitle={`${periodLabel(range.from, range.bucket)} – ${periodLabel(range.to, range.bucket)}`} />
              {trend.length ? (
                <div className="line-chart analytics-line-chart">
                  <div className="chart-y-labels"><span>{number.format(trendMax)}</span><span>{number.format(Math.ceil(trendMax / 2))}</span><span>0</span></div>
                  <svg viewBox="0 0 520 190" preserveAspectRatio="none" role="group" aria-label={text.trend}>
                    <defs><linearGradient id="liveTrendFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#3b70f5" stopOpacity=".16" /><stop offset="100%" stopColor="#3b70f5" stopOpacity="0" /></linearGradient></defs>
                    {[25, 95, 174].map((y) => <line key={y} x1="8" x2="512" y1={y} y2={y} className="grid-line" />)}
                    <path d={trendArea} fill="url(#liveTrendFill)" />
                    <path d={trendLine} className="trend-line" />
                    {chartPoints.map((point, index) => {
                      const [cx, cy] = point.split(",");
                      return (
                        <circle
                          key={trend[index].period}
                          cx={cx}
                          cy={cy}
                          r={trend[index].count > 0 ? 4 : 2}
                          className={trend[index].count > 0 ? "trend-point trend-point-active" : "trend-point"}
                          tabIndex={0}
                          role="img"
                          aria-label={`${periodLabel(trend[index].period)}: ${number.format(trend[index].count)} ${text.submitted}`}
                          onFocus={() => setActiveTrendIndex(index)}
                          onBlur={() => setActiveTrendIndex(null)}
                          onPointerEnter={() => setActiveTrendIndex(index)}
                          onPointerLeave={(event) => {
                            if (event.pointerType !== "touch") setActiveTrendIndex(null);
                          }}
                          onClick={() => setActiveTrendIndex(activeTrendIndex === index ? null : index)}
                        >
                          <title>{`${periodLabel(trend[index].period)}: ${number.format(trend[index].count)} ${text.submitted}`}</title>
                        </circle>
                      );
                    })}
                  </svg>
                  {activeTrendIndex !== null && trend[activeTrendIndex] && (
                    <span
                      className="trend-tooltip"
                      role="status"
                      style={{
                        left: `${Math.min(85, Math.max(15, Number(chartPoints[activeTrendIndex]?.split(",")[0]) / 520 * 100))}%`,
                        top: `${Math.max(0, Number(chartPoints[activeTrendIndex]?.split(",")[1]) / 190 * 140 - 28)}px`,
                      }}
                    >
                      <strong>{periodLabel(trend[activeTrendIndex].period)}</strong>
                      <span>{number.format(trend[activeTrendIndex].count)} {text.submitted}</span>
                    </span>
                  )}
                  <span className="chart-x-labels"><span>{periodLabel(trend[0].period)}</span><span>{periodLabel(trend[trend.length - 1].period)}</span></span>
                </div>
              ) : <p className="analytics-empty">{text.noComplaints}</p>}
            </article>
          </section>

          {reportMode && (
            <section className="panel report-status-panel">
              <PanelHeading title={text.statusBreakdown} subtitle={text.submittedHelp} />
              <div className="report-status-grid">
                {data.statusBreakdown.map(({ status, count }) => (
                  <div className="report-status-item" key={status}>
                    <span className={`status-pill status-${status}`}><i />{statusName(status)}</span>
                    <strong>{number.format(count)}</strong>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="lower-grid analytics-lower-grid">
            <article className="panel complaints-panel">
              <PanelHeading title={text.recentComplaints} subtitle={text.submittedHelp} />
              {data.recentComplaints.length ? (
                <div className="complaint-table-wrap">
                  <table className="complaint-table">
                    <thead><tr><th>{t.complaint}</th><th>{t.location}</th><th>{t.status}</th><th>{text.sla}</th><th>{t.department}</th></tr></thead>
                    <tbody>
                      {data.recentComplaints.map((complaint) => (
                        <tr key={complaint.complaintNumber}>
                          <td><strong>{categoryName(complaint.category)} · {complaint.details}</strong><small>{complaint.complaintNumber}</small></td>
                          <td>{complaint.area || "—"}</td>
                          <td><span className={`status-pill status-${complaint.status}`}><i />{statusName(complaint.status)}</span></td>
                          <td>{complaint.slaPausedAt ? text.paused : formatDate(complaint.slaDeadline)}</td>
                          <td>{complaint.assignedDepartment?.name ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="analytics-empty">{text.noComplaints}</p>}
            </article>
            <article className="panel analytics-activity-panel">
              <PanelHeading title={text.recentActivity} subtitle={text.dateRange} />
              {recentActivity.length ? (
                <>
                  <label className="activity-filter">
                    <span>{text.activityFilter}</span>
                    <AdminSelect
                      value={selectedActivityComplaint}
                      onChange={setActivityComplaint}
                      ariaLabel={text.activityFilter}
                      className="activity-select"
                      options={[
                        { value: "all", label: text.allComplaints },
                        ...activityComplaintNumbers.map((complaintNumber) => ({
                          value: complaintNumber,
                          label: complaintNumber,
                        })),
                      ]}
                    />
                  </label>
                  <div className="activity-groups-list">
                    {activityGroups.map((group) => (
                      <section className="activity-complaint-group" key={group.complaintNumber}>
                        <header>
                          <strong>{group.complaintNumber}</strong>
                          <span>{categoryName(group.category)} · {group.activities.length} {text.updates}</span>
                        </header>
                        <ul className="analytics-activity-list">
                          {group.activities.map((activity, index) => (
                            <li key={`${activity.type}-${activity.createdAt}-${index}`}>
                              <span className="activity-marker" />
                              <div>
                                <strong>{activityName(activity.type)}</strong>
                                {activity.message && <p className="activity-message">{activity.message}</p>}
                                <small>{formatActivityTime(activity.createdAt)}{activity.updatedBy ? ` · ${activity.updatedBy}` : ""}</small>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                </>
              ) : <p className="analytics-empty">{text.noActivity}</p>}
            </article>
          </section>
        </>
      ) : !error ? <p className="analytics-loading" role="status">{text.loading}</p> : null}
    </div>
  );
}

function AdminDashboard() {
  const auth = useAdminAuth();
  const [language, setLanguage] = useState<Language>(readLanguage);
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationActivity, setNotificationActivity] = useState<AdminNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [notificationsRetry, setNotificationsRetry] = useState(0);
  const [notificationCounts, setNotificationCounts] = useState({ total: 0, unread: 0 });
  const [notificationFilter, setNotificationFilter] = useState<"all" | "unread">("all");
  const [notificationCursor, setNotificationCursor] = useState<string | null>(null);
  const [notificationNextCursor, setNotificationNextCursor] = useState<string | null>(null);
  const [expandedNotificationComplaint, setExpandedNotificationComplaint] = useState("");
  const [suggestionSearch, setSuggestionSearch] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>(() => dateRangeForDays(30));
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");
  const [analyticsRetry, setAnalyticsRetry] = useState(0);
  const [adminConfigurationState, setAdminConfigurationState] = useState<{
    adminId: string;
    settings: AdminConfiguration;
  } | null>(null);
  const [adminConfigurationError, setAdminConfigurationError] = useState<{ adminId: string; message: string } | null>(null);
  const [adminConfigurationRetry, setAdminConfigurationRetry] = useState(0);
  const [unreadSuggestionCount, setUnreadSuggestionCount] = useState<number | null>(null);
  const [suggestionCountError, setSuggestionCountError] = useState("");
  const t = translations[language];
  const handleUnreadSuggestionCountChange = useCallback((count: number) => {
    setUnreadSuggestionCount(count);
    setSuggestionCountError("");
  }, []);
  const currentAdminId = auth.admin?.id ?? "";
  const adminConfiguration = adminConfigurationState?.adminId === currentAdminId
    ? adminConfigurationState.settings
    : null;
  const configurationError = adminConfigurationError?.adminId === currentAdminId
    ? adminConfigurationError.message
    : "";
  const configurationLoading = Boolean(currentAdminId && !adminConfiguration && !configurationError);
  const notificationPreferences = adminConfiguration?.notifications ?? defaultAdminConfiguration.notifications;
  const visibleNotificationActivity = notificationActivity.filter((activity) => notificationPreferences[activity.type]);
  const notificationGroups = Array.from(
    visibleNotificationActivity.reduce((groups, activity) => {
      const group = groups.get(activity.complaintNumber) ?? [];
      group.push(activity);
      groups.set(activity.complaintNumber, group);
      return groups;
    }, new Map<string, AdminNotification[]>()),
    ([complaintNumber, activities]) => ({ complaintNumber, activities }),
  );
  const notificationText = analyticsText[language];
  const notificationTypeFilter = Object.entries(notificationPreferences)
    .filter(([, enabled]) => enabled)
    .map(([type]) => type)
    .join(",");

  useEffect(() => {
    if (!auth.admin) return;
    let active = true;
    const adminId = auth.admin.id;
    auth.request<{ settings: AdminConfiguration }>("/settings")
      .then(({ settings }) => {
        if (!active) return;
        setAdminConfigurationState({ adminId, settings });
        setAdminConfigurationError(null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setAdminConfigurationError({
          adminId,
          message: error instanceof Error ? error.message : "Could not load admin settings.",
        });
      });
    return () => {
      active = false;
    };
  }, [auth.admin?.id, auth.request, adminConfigurationRetry]);

  useEffect(() => {
    if (!auth.admin || !notificationsOpen) return;
    let active = true;
    const query = new URLSearchParams({
      filter: notificationFilter,
      types: notificationTypeFilter,
      ...(notificationCursor ? { cursor: notificationCursor } : {}),
    });
    setNotificationsLoading(true);
    auth.request<{
      activities: AdminNotification[];
      counts: { total: number; unread: number };
      nextCursor: string | null;
    }>(`/notifications?${query}`)
      .then((data) => {
        if (!active) return;
        setNotificationActivity((current) => {
          if (!notificationCursor) return data.activities;
          const knownIds = new Set(current.map((activity) => activity.id));
          return [...current, ...data.activities.filter((activity) => !knownIds.has(activity.id))];
        });
        setNotificationCounts(data.counts);
        setNotificationNextCursor(data.nextCursor);
      })
      .catch((error: unknown) => {
        if (active) setNotificationsError(error instanceof Error ? error.message : notificationText.notificationError);
      })
      .finally(() => {
        if (active) setNotificationsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    auth.admin,
    auth.request,
    notificationsOpen,
    notificationsRetry,
    notificationText.notificationError,
    notificationFilter,
    notificationCursor,
    notificationTypeFilter,
  ]);

  useEffect(() => {
    if (!auth.admin) {
      setUnreadSuggestionCount(null);
      setSuggestionCountError("");
      return;
    }
    let active = true;
    auth.request<{ counts: { unread: number } }>("/suggestions?status=received&page=1")
      .then((data) => {
        if (!active) return;
        setUnreadSuggestionCount(data.counts.unread);
        setSuggestionCountError("");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setUnreadSuggestionCount(null);
        setSuggestionCountError(error instanceof Error ? error.message : "Could not load unread suggestion count.");
      });
    return () => {
      active = false;
    };
  }, [auth.admin, auth.request]);

  useEffect(() => {
    if (!auth.admin || (activeSection !== "overview" && activeSection !== "reports")) return;
    let active = true;
    setAnalyticsLoading(true);
    setAnalyticsError("");
    const query = new URLSearchParams({
      ...analyticsRange,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    }).toString();
    auth.request<AnalyticsData>(`/analytics/overview?${query}`)
      .then((data) => {
        if (active) setAnalyticsData(data);
      })
      .catch((error: unknown) => {
        if (active) setAnalyticsError(error instanceof Error ? error.message : "The dashboard request failed.");
      })
      .finally(() => {
        if (active) setAnalyticsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeSection, auth.admin, auth.request, analyticsRange.from, analyticsRange.to, analyticsRange.bucket, analyticsRetry]);

  const changeLanguage = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    try {
      localStorage.setItem("citizen-admin-language", nextLanguage);
    } catch {
      console.warn("Could not save the admin language preference.");
    }
  };

  const selectSection = (section: Section) => {
    setActiveSection(section);
    setMenuOpen(false);
  };

  const markNotificationRead = async (activity: AdminNotification) => {
    if (activity.isRead) return true;
    if (!currentAdminId) return false;
    try {
      await auth.request<{ success: true }>("/notifications/read-state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [notificationId(activity)] }),
      });
      setNotificationActivity((current) => current
        .map((item) => item.id === activity.id ? { ...item, isRead: true } : item)
        .filter((item) => notificationFilter !== "unread" || !item.isRead));
      setNotificationCounts((current) => ({
        ...current,
        unread: Math.max(0, current.unread - 1),
      }));
      setNotificationsError("");
      return true;
    } catch (error) {
      setNotificationsError(error instanceof Error ? error.message : notificationText.notificationError);
      return false;
    }
  };

  const markAllNotificationsRead = async () => {
    if (!currentAdminId || notificationCounts.unread === 0) return;
    try {
      await auth.request<{ success: true }>("/notifications/read-state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      setNotificationCounts((current) => ({ ...current, unread: 0 }));
      if (notificationFilter === "unread") {
        setNotificationActivity([]);
        setNotificationNextCursor(null);
        setNotificationCursor(null);
      } else {
        setNotificationActivity((current) => current.map((activity) => ({ ...activity, isRead: true })));
      }
      setNotificationsError("");
    } catch (error) {
      setNotificationsError(error instanceof Error ? error.message : notificationText.notificationError);
    }
  };

  const openComplaintFromNotification = async (activity: AdminNotification) => {
    if (!await markNotificationRead(activity)) return;
    setSearch(activity.complaintNumber);
    selectSection("complaints");
    setNotificationsOpen(false);
  };

  const retryAdminConfiguration = () => {
    setAdminConfigurationError(null);
    setAdminConfigurationRetry((current) => current + 1);
  };

  const handleAdminConfigurationSaved = (settings: AdminConfiguration) => {
    if (!currentAdminId) return;
    setAdminConfigurationState({ adminId: currentAdminId, settings });
    setAdminConfigurationError(null);
  };

  const formattedDate = new Intl.DateTimeFormat(
    language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  ).format(new Date());
  const organizationName = adminConfiguration?.profile.organizationName || t.brand;
  const officeName = adminConfiguration?.profile.officeName || t.office;

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginBusy(true);
    setLoginError("");
    try {
      await auth.login(loginEmail, loginPassword);
      setLoginPassword("");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Admin sign-in failed.");
    } finally {
      setLoginBusy(false);
    }
  };

  const handleLogout = async () => {
    setLogoutBusy(true);
    setLoginError("");
    try {
      await auth.logout();
      setLogoutConfirmOpen(false);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Could not sign out cleanly.");
    } finally {
      setLogoutBusy(false);
    }
  };

  if (auth.loading) {
    return (
      <main className="auth-screen" lang={language}>
        <div className="page-loading" role="status" aria-live="polite">
          <span className="page-spinner" aria-hidden="true" />
          <span>{t.checkingAccess}</span>
        </div>
      </main>
    );
  }

  if (!auth.admin) {
    return (
      <main className="auth-screen" lang={language}>
        <div className="auth-layout">
          <aside className="auth-visual auth-visual-desktop">
            <div className="auth-orb auth-orb-top" />
            <div className="auth-orb auth-orb-bottom" />
            <div className="auth-visual-brand">
              <span className="auth-visual-mark"><FiClipboard size={21} /></span>
              <span><strong>{t.brand}</strong><small>{t.office}</small></span>
            </div>
            <div className="auth-visual-copy">
              <span className="auth-kicker"><FiLock size={14} />{t.secureAdminAccess}</span>
              <h2>{t.authPanelTitle}</h2>
              <p>{t.authPanelDescription}</p>
              <ul>
                {[t.authBenefitOne, t.authBenefitTwo, t.authBenefitThree].map((benefit) => (
                  <li key={benefit}><span><FiCheck size={15} /></span>{benefit}</li>
                ))}
              </ul>
            </div>
            <img className="auth-leader-image" src={leaderImage} alt="" />
          </aside>

          <section className="auth-panel">
            <div className="auth-mobile-hero">
              <div className="auth-orb auth-orb-top" />
              <div className="auth-mobile-brand">
                <span className="auth-visual-mark"><FiClipboard size={21} /></span>
                <span><strong>{t.brand}</strong><small>{t.office}</small></span>
              </div>
              <div className="auth-mobile-copy">
                <div><span>{t.secureAdminAccess}</span><h2>{t.authPanelTitle}</h2></div>
                <img src={leaderImage} alt="" />
              </div>
            </div>
            <div className="auth-form-wrap">
            <LanguageMenu language={language} label={t.language} className="auth-language" onChange={changeLanguage} />
              <div className="auth-form-heading">
                <span className="auth-heading-mark"><FiLock size={19} /></span>
                <p>{t.secureAdminAccess}</p>
                <h1>{t.adminLoginTitle}</h1>
                <p className="auth-description">{t.adminLoginDescription}</p>
              </div>
              <form className="auth-form" onSubmit={handleLogin}>
                <label>{t.emailAddress}
                  <span className="auth-input-wrap">
                    <FiMail aria-hidden="true" />
                    <input
                      type="email"
                      autoComplete="username"
                      required
                      maxLength={254}
                      value={loginEmail}
                      onChange={(event) => setLoginEmail(event.target.value)}
                    />
                  </span>
                </label>
                <label>{t.password}
                  <span className="auth-input-wrap">
                    <FiLock aria-hidden="true" />
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      maxLength={72}
                      value={loginPassword}
                      onChange={(event) => setLoginPassword(event.target.value)}
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      aria-label={showLoginPassword ? t.hidePassword : t.passwordVisibility}
                      onClick={() => setShowLoginPassword((shown) => !shown)}
                    >{showLoginPassword ? <FiEyeOff /> : <FiEye />}</button>
                  </span>
                </label>
                {(auth.connectionError || loginError) && (
                  <p className="auth-error" role="alert">{auth.connectionError || loginError}</p>
                )}
                {auth.connectionError && (
                  <button className="auth-retry" type="button" onClick={auth.retry}>{t.retryConnection}</button>
                )}
                <button className="auth-submit" type="submit" disabled={loginBusy}>
                  {loginBusy ? <><span className="auth-spinner" />{t.signingIn}</> : <>{t.signIn}<FiChevronRight size={18} /></>}
                </button>
              </form>
              <p className="auth-security-note"><FiLock size={13} />{t.secureAdminAccess}</p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-shell" lang={language}>
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark"><FiClipboard size={23} /></span>
          <span className="brand-copy">
            <strong>{organizationName}</strong>
            <small>{officeName}</small>
          </span>
          <button className="icon-button sidebar-close" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><FiX /></button>
        </div>
        <nav className="sidebar-nav" aria-label="Admin navigation">
          {navItems.map(({ key, icon: Icon, translation }) => (
            <button
              type="button"
              key={key}
              className={`nav-item ${activeSection === key ? "nav-item-active" : ""}`}
              onClick={() => selectSection(key)}
            >
              <Icon size={18} />
              <span>{t[translation]}</span>
              {key === "suggestions" && unreadSuggestionCount !== null && unreadSuggestionCount > 0 && (
                <span className="nav-badge">{unreadSuggestionCount}</span>
              )}
              {key === "suggestions" && suggestionCountError && (
                <span className="nav-badge nav-badge-error" title={suggestionCountError} aria-label={suggestionCountError}>!</span>
              )}
            </button>
          ))}
        </nav>
        <div className="profile-card">
          <span className="avatar">{(auth.admin.name || auth.admin.email).trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase()}</span>
          <span className="profile-copy"><strong>{auth.admin.name || auth.admin.email}</strong><small>{auth.admin.role === "owner" ? t.ownerRole : t.adminRole}</small></span>
          <button type="button" className="sign-out-button" onClick={() => setLogoutConfirmOpen(true)} disabled={logoutBusy} aria-label={t.signOut} title={t.signOut}>
            <FiLogOut size={16} />
          </button>
        </div>
      </aside>

      {logoutConfirmOpen && (
        <div
          className="logout-confirm-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget && !logoutBusy) setLogoutConfirmOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" && !logoutBusy) setLogoutConfirmOpen(false);
          }}
        >
          <section
            className="logout-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
            aria-describedby="logout-confirm-message"
          >
            <span className="logout-confirm-icon"><FiLogOut size={19} /></span>
            <h2 id="logout-confirm-title">{t.signOutConfirmTitle}</h2>
            <p id="logout-confirm-message">{t.signOutConfirmMessage}</p>
            {loginError && <p className="logout-confirm-error" role="alert">{loginError}</p>}
            <div className="logout-confirm-actions">
              <button
                type="button"
                className="logout-confirm-cancel"
                onClick={() => setLogoutConfirmOpen(false)}
                disabled={logoutBusy}
                autoFocus
              >{t.cancel}</button>
              <button
                type="button"
                className="logout-confirm-submit"
                onClick={() => void handleLogout()}
                disabled={logoutBusy}
              >{logoutBusy ? <><span className="auth-spinner" />{t.confirmingSignOut}</> : t.signOut}</button>
            </div>
          </section>
        </div>
      )}

      {menuOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}

      <section className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><FiMenu /></button>
          <div className="page-heading">
            <h1>{t[navItems.find((item) => item.key === activeSection)?.translation ?? "overview"]}</h1>
            <p>{formattedDate} · {activeSection === "suggestions"
              ? t.suggestionResults
              : activeSection === "overview" || activeSection === "reports"
                ? `${analyticsRange.from} – ${analyticsRange.to}`
                : t.dateSubtitle}</p>
          </div>
          <label className={`search-box ${activeSection !== "suggestions" ? "search-box-hidden" : ""}`}>
            <FiSearch size={17} />
            <input
              value={activeSection === "suggestions" ? suggestionSearch : search}
              onChange={(event) => activeSection === "suggestions" ? setSuggestionSearch(event.target.value) : setSearch(event.target.value)}
              placeholder={activeSection === "suggestions" ? t.searchSuggestions : t.search}
              aria-label={activeSection === "suggestions" ? t.searchSuggestions : t.search}
            />
            {(activeSection === "suggestions" ? suggestionSearch : search) && (
              <button
                type="button"
                className="search-clear"
                aria-label={language === "en" ? "Clear search" : language === "mr" ? "शोध पुसून टाका" : "खोज साफ़ करें"}
                onClick={() => activeSection === "suggestions" ? setSuggestionSearch("") : setSearch("")}
              ><FiX /></button>
            )}
          </label>
          <LanguageMenu language={language} label={t.language} className="language-select" onChange={changeLanguage} />
          <div className="notification-wrap">
            <button
              type="button"
              className={`icon-button notification-button ${notificationsOpen ? "icon-button-selected" : ""}`}
              aria-label={notificationCounts.unread ? `${t.notifications} (${notificationCounts.unread})` : t.notifications}
              aria-expanded={notificationsOpen}
              onClick={() => {
                const open = !notificationsOpen;
                if (open) {
                  setNotificationActivity([]);
                  setNotificationCounts({ total: 0, unread: 0 });
                  setNotificationCursor(null);
                  setNotificationNextCursor(null);
                  setNotificationsLoading(true);
                  setNotificationsError("");
                }
                setNotificationsOpen(open);
              }}
            >
              <FiBell size={19} />
              {notificationCounts.unread > 0 && <span className="notification-dot" aria-hidden="true" />}
            </button>
            {notificationsOpen && (
              <section className="notification-popover" aria-label={t.notifications}>
                <header>
                  <strong>{t.notifications}</strong>
                  <button
                    type="button"
                    onClick={() => void markAllNotificationsRead()}
                    disabled={notificationCounts.unread === 0}
                  >{notificationText.markAllRead} ({notificationCounts.unread})</button>
                </header>
                <div className="notification-tabs" role="tablist" aria-label={t.notifications}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={notificationFilter === "all"}
                    className={notificationFilter === "all" ? "notification-tab-active" : ""}
                    onClick={() => {
                      setNotificationFilter("all");
                      setNotificationCursor(null);
                      setNotificationNextCursor(null);
                      setNotificationActivity([]);
                      setExpandedNotificationComplaint("");
                      setNotificationsError("");
                    }}
                  >{notificationText.allNotifications}<span>{notificationCounts.total}</span></button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={notificationFilter === "unread"}
                    className={notificationFilter === "unread" ? "notification-tab-active" : ""}
                    onClick={() => {
                      setNotificationFilter("unread");
                      setNotificationCursor(null);
                      setNotificationNextCursor(null);
                      setNotificationActivity([]);
                      setExpandedNotificationComplaint("");
                      setNotificationsError("");
                    }}
                  >{notificationText.unreadNotifications}<span>{notificationCounts.unread}</span></button>
                </div>
                {notificationsError ? (
                  <div className="notification-state" role="alert">
                    <p>{notificationsError || notificationText.notificationError}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setNotificationCursor(null);
                        setNotificationActivity([]);
                        setNotificationsLoading(true);
                        setNotificationsError("");
                        setNotificationsRetry((value) => value + 1);
                      }}
                    >{notificationText.retry}</button>
                  </div>
                ) : notificationsLoading && notificationGroups.length === 0 ? (
                  <div className="notification-state" role="status">
                    <span className="page-spinner page-spinner-small" aria-hidden="true" />
                    <p>{notificationText.loadingNotifications}</p>
                  </div>
                ) : notificationGroups.length === 0 ? (
                  <p className="notification-state">
                    {notificationFilter === "unread" ? notificationText.noUnreadNotifications : notificationText.noNotifications}
                  </p>
                ) : (
                  <>
                    <ul className="notification-list">
                    {notificationGroups.map(({ complaintNumber, activities }) => {
                      const latestActivity = activities[0];
                      const unreadCount = activities.filter((activity) => !activity.isRead).length;
                      const isExpanded = expandedNotificationComplaint === complaintNumber;
                      return (
                        <li key={complaintNumber} className={`notification-group ${unreadCount ? "notification-group-unread" : ""}`}>
                          <button
                            type="button"
                            className="notification-group-toggle"
                            aria-expanded={isExpanded}
                            onClick={() => setExpandedNotificationComplaint(isExpanded ? "" : complaintNumber)}
                          >
                            <span className="notification-group-copy">
                              <strong>{complaintNumber} · {t[latestActivity.category as keyof typeof t] ?? latestActivity.category}</strong>
                              <small>
                                {notificationText.events[latestActivity.type] ?? latestActivity.type}
                                {" · "}{activities.length} {notificationText.updates}
                              </small>
                            </span>
                            <span className="notification-group-indicators">
                              {unreadCount > 0 && <span className="notification-unread-count">{unreadCount}</span>}
                              <FiChevronDown aria-hidden="true" />
                            </span>
                          </button>
                          {isExpanded && (
                            <ul className="notification-event-list">
                              {activities.map((activity) => {
                                const eventLabel = notificationText.events[activity.type] ?? activity.type;
                                const locale = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN";
                                const time = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(activity.createdAt));
                                return (
                                  <li key={activity.id}>
                                    <button
                                      type="button"
                                      className={`notification-event ${activity.isRead ? "" : "notification-event-unread"}`}
                                      onClick={() => void openComplaintFromNotification(activity)}
                                    >
                                      <span><strong>{eventLabel}</strong>{!activity.isRead && <i aria-hidden="true" />}</span>
                                      <small>{time}{activity.updatedBy ? ` · ${activity.updatedBy}` : ""}</small>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                    </ul>
                    {notificationNextCursor && (
                      <button
                        type="button"
                        className="notification-load-more"
                        disabled={notificationsLoading}
                        onClick={() => setNotificationCursor(notificationNextCursor)}
                      >
                        {notificationsLoading && <span className="page-spinner page-spinner-small" aria-hidden="true" />}
                        {notificationText.loadMoreNotifications}
                      </button>
                    )}
                  </>
                )}
              </section>
            )}
          </div>
        </header>

        {configurationError && (
          <div className="settings-error-block admin-configuration-warning" role="alert">
            <p>{t.settingsLoadError} {configurationError}</p>
            <button type="button" onClick={retryAdminConfiguration}>{t.retryConnection}</button>
          </div>
        )}

        {activeSection === "overview" ? (
          <AnalyticsView
            language={language}
            t={t}
            data={analyticsData}
            range={analyticsRange}
            onRangeChange={setAnalyticsRange}
            loading={analyticsLoading}
            error={analyticsError}
            onRetry={() => setAnalyticsRetry((value) => value + 1)}
            reportMode={false}
          />
        ) : activeSection === "reports" ? (
          <AnalyticsView
            language={language}
            t={t}
            data={analyticsData}
            range={analyticsRange}
            onRangeChange={setAnalyticsRange}
            loading={analyticsLoading}
            error={analyticsError}
            onRetry={() => setAnalyticsRetry((value) => value + 1)}
            reportMode
          />
        ) : activeSection === "suggestions" ? (
          <AdminSuggestions
            language={language}
            search={suggestionSearch}
            onUnreadCountChange={handleUnreadSuggestionCountChange}
          />
        ) : activeSection === "complaints" ? (
          <AdminComplaints language={language} search={search} onSearch={setSearch} />
        ) : activeSection === "settings" ? (
          <AdminSystemSettings
            language={language}
            settings={adminConfiguration}
            loading={configurationLoading}
            error={configurationError}
            onRetry={retryAdminConfiguration}
            onSaved={handleAdminConfigurationSaved}
          />
        ) : activeSection === "departments" || activeSection === "templates" ? (
          <AdminSettings
            key={activeSection}
            language={language}
            initialTab={activeSection === "templates" ? "templates" : "departments"}
          />
        ) : (
          <section className="placeholder-panel panel">
            <span className="placeholder-icon"><FiGrid size={26} /></span>
            <h2>{t[navItems.find((item) => item.key === activeSection)?.translation ?? "overview"]}</h2>
            <p>{t.navComing}</p>
            <button type="button" className="primary-button" onClick={() => selectSection("overview")}>{t.dashboard}</button>
          </section>
        )}
        <footer className="static-note">{organizationName} · {language === "en" ? "Live complaint and citizen input records" : language === "mr" ? "थेट तक्रार आणि नागरिक संदेश नोंदी" : "लाइव शिकायत और नागरिक संदेश रिकॉर्ड"}</footer>
      </section>
    </main>
  );
}

function StatCard({ icon, tone, title, value, foot, footText }: { icon: ReactNode; tone: string; title: string; value: string; foot: string; footText?: string }) {
  return (
    <article className={`stat-card stat-${tone}`}>
      <div className="stat-top"><span>{title}</span><span className="stat-icon">{icon}</span></div>
      <strong className="stat-value">{value}</strong>
      <p>{footText ? <><strong>{foot}</strong> {footText}</> : foot}</p>
    </article>
  );
}

function PanelHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return <div className="panel-heading"><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>;
}

export default AdminDashboard;
