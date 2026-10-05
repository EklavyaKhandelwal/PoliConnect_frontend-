import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent, type PointerEvent } from "react";
import {
  FiAlertCircle,
  FiArrowLeft,
  FiCheckCircle,
  FiCheck,
  FiClock,
  FiInfo,
  FiLoader,
  FiLock,
  FiMapPin,
  FiPaperclip,
  FiPhone,
  FiSend,
  FiUsers,
  FiUser,
  FiX,
} from "react-icons/fi";
import { useAdminAuth } from "./adminAuth";
import AdminSelect from "./AdminSelect";

type Language = "en" | "hi" | "mr";
type Status = "received" | "under_review" | "in_progress" | "waiting_for_citizen" | "resolved" | "rejected";

interface Department {
  _id: string;
  name: string;
  code: string;
  active: boolean;
}

interface Officer {
  _id: string;
  name: string;
  title: string;
  departmentId: string | { _id: string };
  active: boolean;
}

interface AdminComplaint {
  complaintNumber: string;
  category: string;
  details: string;
  photos: string[];
  location: { area?: string; latitude?: number; longitude?: number };
  status: Status;
  statusHistory: { status: Status; message?: string; updatedBy?: string; photos?: string[]; createdAt: string }[];
  activityHistory: { type: string; status?: Status; message?: string; updatedBy?: string; createdAt: string }[];
  publicMessages: { sender: "admin" | "citizen"; senderName?: string; message: string; photos: string[]; requiresResponse: boolean; readAt?: string | null; createdAt: string }[];
  internalNotes: { message: string; createdBy: string; createdAt: string }[];
  contact: { name: string | null; phone: string; privateName: boolean };
  assignedDepartment: { id: string; name: string; code: string } | null;
  assignedOfficer: { id: string; name: string; title: string } | null;
  slaStartedAt: string | null;
  slaDeadline: string | null;
  slaPausedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  citizenFeedback: { confirmation: "resolved" | "not_resolved"; comment: string } | null;
}

interface AdminProgressUpdate {
  type: "registered" | "assigned" | "status_changed";
  status?: Status;
  message?: string;
  updatedBy?: string;
  createdAt: string;
}

const content = {
  en: {
    loading: "Loading complaint details…", loadError: "Could not load complaint details.", retry: "Try again",
    close: "Close complaint details", complaint: "Complaint", detailsTitle: "Details", category: "Category",
    conversation: "Citizen conversation", publicReply: "Reply to citizen", privateNote: "Internal note",
    citizen: "Citizen", privateName: "Name withheld", call: "Call citizen",
    citizenInfo: "Citizen information", assignTeam: "Assign department", resolveComplaint: "Resolve complaint",
    reopenComplaint: "Reopen complaint", reopened: "Complaint reopened.", closedReply: "Reopen this complaint to send a message.",
    attachPhotos: "Attach photos", removePhoto: "Remove photo", photoLimit: "You can attach up to 4 photos, each up to 5 MB.",
    photoTypeError: "Choose supported image files only.", openMap: "Open in Google Maps",
    replyPlaceholder: "Write an update for the citizen…",
    approximateLocation: "Approximate area · open map for details",
    requestInformationHint: "Sets status to Waiting for citizen and pauses the SLA until they reply.",
    sent: "Sent", seenByCitizen: "Seen by citizen",
    feedbackComment: "Citizen comment",
    phone: "Phone", location: "Location", deadline: "SLA deadline", created: "Filed", originalPhotos: "Reported photos",
    progress: "Progress", team: "Team assignment", department: "Department", selectDepartment: "Select department",
    officer: "Officer", selectOfficer: "Select officer (optional)", targetDays: "Resolution target (working days)",
    saveAssignment: "Save assignment", status: "Update status", selectStatus: "Select status",
    message: "Citizen-facing message or reason", statusHint: "A reason is required to reject; a resolution summary is required to resolve.",
    photos: "Resolution photos (optional)", update: "Save status update", sendMessage: "Reply to citizen",
    askReply: "Request information from the citizen", send: "Send", note: "Internal note (admin only)",
    addNote: "Add internal note", internalNotes: "Internal notes",
    noMessages: "No messages yet.", required: "Please complete the required fields.",
    saving: "Saving…", saved: "Update saved.", citizenFeedback: "Citizen feedback",
    weekdays: "Weekdays only; weekends are excluded from the SLA deadline.", slaPaused: "SLA paused", slaStopped: "SLA stopped",
    status_received: "New", status_under_review: "Under review", status_in_progress: "In progress",
    status_waiting_for_citizen: "Waiting for citizen", status_resolved: "Resolved", status_rejected: "Rejected",
    activity_registered: "Complaint registered", activity_assigned: "Team assigned",
    activity_status_changed: "Complaint updated", activity_resolved: "Complaint resolved",
    activity_rejected: "Complaint closed", activity_citizen_reply: "Citizen replied",
    activity_citizen_reopened: "Citizen requested more work",
    failedAction: "Could not save this complaint update.", locationMissing: "Not provided",
    complainantPrivacy: "The citizen asked to keep their name private.",
    resizeDetails: "Resize details panel",
  },
  hi: {
    loading: "शिकायत का विवरण लोड हो रहा है…", loadError: "शिकायत का विवरण लोड नहीं हो सका।", retry: "फिर कोशिश करें",
    close: "शिकायत विवरण बंद करें", complaint: "शिकायत", detailsTitle: "विवरण", category: "श्रेणी",
    conversation: "नागरिक से बातचीत", publicReply: "नागरिक को जवाब दें", privateNote: "आंतरिक नोट",
    citizen: "नागरिक", privateName: "नाम गोपनीय", call: "नागरिक को कॉल करें",
    citizenInfo: "नागरिक की जानकारी", assignTeam: "विभाग को सौंपें", resolveComplaint: "शिकायत हल करें",
    reopenComplaint: "शिकायत फिर खोलें", reopened: "शिकायत फिर से खोल दी गई।", closedReply: "संदेश भेजने के लिए शिकायत फिर खोलें।",
    attachPhotos: "फ़ोटो जोड़ें", removePhoto: "फ़ोटो हटाएँ", photoLimit: "अधिकतम 4 फ़ोटो जोड़ें, हर फ़ोटो 5 MB तक।",
    photoTypeError: "केवल समर्थित छवि फ़ाइलें चुनें।", openMap: "Google Maps में खोलें",
    replyPlaceholder: "नागरिक के लिए अपडेट लिखें…",
    approximateLocation: "अनुमानित क्षेत्र · विवरण के लिए मानचित्र खोलें",
    requestInformationHint: "स्थिति ‘नागरिक के जवाब की प्रतीक्षा’ होगी और समय-सीमा रुक जाएगी।",
    sent: "भेजा गया", seenByCitizen: "नागरिक ने देख लिया",
    feedbackComment: "नागरिक की टिप्पणी",
    phone: "फ़ोन", location: "स्थान", deadline: "समय-सीमा", created: "दर्ज हुई", originalPhotos: "शिकायत की फोटो",
    progress: "प्रगति", team: "टीम असाइन करें", department: "विभाग", selectDepartment: "विभाग चुनें",
    officer: "अधिकारी", selectOfficer: "अधिकारी चुनें (वैकल्पिक)", targetDays: "हल करने की समय-सीमा (कार्यदिवस)",
    saveAssignment: "असाइनमेंट सहेजें", status: "स्थिति अपडेट करें", selectStatus: "स्थिति चुनें",
    message: "नागरिक को संदेश या कारण", statusHint: "अस्वीकार करने के लिए कारण और हल करने के लिए समाधान विवरण ज़रूरी है।",
    photos: "समाधान की फोटो (वैकल्पिक)", update: "स्थिति अपडेट सहेजें", sendMessage: "नागरिक को जवाब भेजें",
    askReply: "नागरिक से जानकारी माँगें", send: "भेजें", note: "आंतरिक नोट (केवल प्रशासक)",
    addNote: "आंतरिक नोट जोड़ें", internalNotes: "आंतरिक नोट",
    noMessages: "अभी कोई संदेश नहीं है।", required: "ज़रूरी फ़ील्ड भरें।",
    saving: "सहेज रहे हैं…", saved: "अपडेट सहेजा गया।", citizenFeedback: "नागरिक की प्रतिक्रिया",
    weekdays: "समय-सीमा की गणना में शनिवार और रविवार शामिल नहीं हैं।", slaPaused: "समय-सीमा रुकी हुई है", slaStopped: "समय-सीमा रोक दी गई है",
    status_received: "नई", status_under_review: "जाँच में", status_in_progress: "काम जारी",
    status_waiting_for_citizen: "नागरिक के जवाब का इंतज़ार", status_resolved: "हल", status_rejected: "अस्वीकृत",
    activity_registered: "शिकायत दर्ज हुई", activity_assigned: "टीम को सौंपी गई",
    activity_status_changed: "शिकायत अपडेट हुई", activity_resolved: "शिकायत हल हुई",
    activity_rejected: "शिकायत बंद हुई", activity_citizen_reply: "नागरिक का जवाब",
    activity_citizen_reopened: "नागरिक ने आगे काम का अनुरोध किया",
    failedAction: "शिकायत अपडेट नहीं हो सका।", locationMissing: "नहीं दी गई",
    complainantPrivacy: "नागरिक ने अपना नाम गोपनीय रखने का अनुरोध किया है।",
    resizeDetails: "विवरण पैनल का आकार बदलें",
  },
  mr: {
    loading: "तक्रारीचा तपशील लोड होत आहे…", loadError: "तक्रारीचा तपशील लोड करता आला नाही.", retry: "पुन्हा प्रयत्न करा",
    close: "तक्रारीचा तपशील बंद करा", complaint: "तक्रार", detailsTitle: "तपशील", category: "श्रेणी",
    conversation: "नागरिकाशी संवाद", publicReply: "नागरिकाला उत्तर द्या", privateNote: "अंतर्गत नोंद",
    citizen: "नागरिक", privateName: "नाव गोपनीय", call: "नागरिकाला कॉल करा",
    citizenInfo: "नागरिकाची माहिती", assignTeam: "विभागाकडे सोपवा", resolveComplaint: "तक्रार निकाली काढा",
    reopenComplaint: "तक्रार पुन्हा उघडा", reopened: "तक्रार पुन्हा उघडली.", closedReply: "संदेश पाठवण्यासाठी तक्रार पुन्हा उघडा.",
    attachPhotos: "फोटो जोडा", removePhoto: "फोटो काढा", photoLimit: "कमाल 4 फोटो जोडा; प्रत्येक फोटो 5 MB पर्यंत.",
    photoTypeError: "फक्त समर्थित प्रतिमा फायली निवडा.", openMap: "Google Maps मध्ये उघडा",
    replyPlaceholder: "नागरिकासाठी अद्यतन लिहा…",
    approximateLocation: "अंदाजे ठिकाण · अधिक माहितीसाठी नकाशा उघडा",
    requestInformationHint: "स्थिती ‘नागरिकाच्या उत्तराची प्रतीक्षा’ होईल आणि मुदत थांबेल.",
    sent: "पाठवले", seenByCitizen: "नागरिकाने पाहिले",
    feedbackComment: "नागरिकाची टिप्पणी",
    phone: "फोन", location: "ठिकाण", deadline: "कालमर्यादा", created: "नोंदवली", originalPhotos: "तक्रारीचे फोटो",
    progress: "प्रगती", team: "टीम नेमा", department: "विभाग", selectDepartment: "विभाग निवडा",
    officer: "अधिकारी", selectOfficer: "अधिकारी निवडा (ऐच्छिक)", targetDays: "निकाली काढण्याची मुदत (कामाचे दिवस)",
    saveAssignment: "नेमणूक जतन करा", status: "स्थिती अद्यतनित करा", selectStatus: "स्थिती निवडा",
    message: "नागरिकासाठी संदेश किंवा कारण", statusHint: "नामंजूर करण्यासाठी कारण आणि निकाली काढण्यासाठी तपशील आवश्यक.",
    photos: "समाधानाचे फोटो (ऐच्छिक)", update: "स्थिती जतन करा", sendMessage: "नागरिकाला उत्तर पाठवा",
    askReply: "नागरिकाकडून माहिती मागा", send: "पाठवा", note: "अंतर्गत नोंद (फक्त प्रशासक)",
    addNote: "अंतर्गत नोंद जोडा", internalNotes: "अंतर्गत नोंदी",
    noMessages: "अद्याप संदेश नाहीत.", required: "आवश्यक माहिती भरा.",
    saving: "जतन होत आहे…", saved: "अद्यतन जतन केले.", citizenFeedback: "नागरिकाचा अभिप्राय",
    weekdays: "मुदत मोजताना शनिवार आणि रविवार वगळले जातात.", slaPaused: "मुदत थांबवली आहे", slaStopped: "मुदत थांबवली आहे",
    status_received: "नवीन", status_under_review: "तपासणी सुरू", status_in_progress: "काम सुरू",
    status_waiting_for_citizen: "नागरिकाच्या उत्तराची प्रतीक्षा", status_resolved: "निकाली", status_rejected: "नामंजूर",
    activity_registered: "तक्रार नोंदवली", activity_assigned: "टीमकडे सोपवली",
    activity_status_changed: "तक्रार अद्यतनित केली", activity_resolved: "तक्रार सोडवली",
    activity_rejected: "तक्रार बंद केली", activity_citizen_reply: "नागरिकाचे उत्तर",
    activity_citizen_reopened: "नागरिकाने पुढील कामाची विनंती केली",
    failedAction: "तक्रारीचे अद्यतन जतन करता आले नाही.", locationMissing: "दिलेली नाही",
    complainantPrivacy: "नागरिकाने नाव गोपनीय ठेवण्याची विनंती केली आहे.",
    resizeDetails: "तपशील पॅनेलचा आकार बदला",
  },
} satisfies Record<Language, Record<string, string>>;

const statusOptions: Status[] = ["under_review", "in_progress", "waiting_for_citizen", "resolved", "rejected"];

const departmentOf = (officer: Officer): string =>
  typeof officer.departmentId === "string" ? officer.departmentId : officer.departmentId._id;

const dateTime = (value: string | null, language: Language): string => value
  ? new Intl.DateTimeFormat(language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value))
  : "—";

const workingTimeBetween = (start: number, end: number): number => {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  let cursor = start;
  let elapsed = 0;
  while (cursor < end) {
    const current = new Date(cursor);
    const nextDay = Date.UTC(
      current.getUTCFullYear(),
      current.getUTCMonth(),
      current.getUTCDate() + 1,
    );
    if (current.getUTCDay() !== 0 && current.getUTCDay() !== 6) {
      elapsed += Math.min(end, nextDay) - cursor;
    }
    cursor = nextDay;
  }
  return elapsed;
};

const getProgressUpdates = (complaint: AdminComplaint): AdminProgressUpdate[] => {
  const milestones: AdminProgressUpdate[] = [];
  const statusUpdates = [...complaint.statusHistory]
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  let previousStatus: Status | undefined;

  for (const update of statusUpdates) {
    if (update.status === previousStatus) continue;
    milestones.push({
      type: update.status === "received" ? "registered" : "status_changed",
      status: update.status,
      message: update.message,
      updatedBy: update.updatedBy,
      createdAt: update.createdAt,
    });
    previousStatus = update.status;
  }
  for (const update of complaint.activityHistory) {
    if (update.type === "assigned") {
      milestones.push({
        type: "assigned",
        message: update.message,
        updatedBy: update.updatedBy,
        createdAt: update.createdAt,
      });
    }
  }
  const priority = (type: AdminProgressUpdate["type"]) =>
    type === "registered" ? 0 : type === "assigned" ? 1 : 2;
  milestones.sort((left, right) =>
    new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime() ||
    priority(left.type) - priority(right.type),
  );
  if (milestones.length === 0 && complaint.createdAt) {
    milestones.push({ type: "registered", status: "received", createdAt: complaint.createdAt });
  }
  return milestones;
};

const initialsForName = (name: string): string => {
  const initials = name.trim().split(/\s+/u).slice(0, 2).map((part) => Array.from(part)[0] ?? "").join("");
  return initials.toLocaleUpperCase() || "?";
};

export default function AdminComplaintDetail({
  complaintNumber,
  language,
  onClose,
  onUpdated,
}: {
  complaintNumber: string;
  language: Language;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { admin, request } = useAdminAuth();
  const t: Record<string, string> = content[language];
  const factsRef = useRef<HTMLElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const assignmentRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLFormElement>(null);
  const [detailsPanelWidth, setDetailsPanelWidth] = useState(() => window.innerWidth <= 1050 ? 320 : 350);
  const [isResizingDetails, setIsResizingDetails] = useState(false);
  const [complaint, setComplaint] = useState<AdminComplaint | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [officerId, setOfficerId] = useState("");
  const [workingDays, setWorkingDays] = useState("5");
  const [status, setStatus] = useState<Status>("in_progress");
  const [statusMessage, setStatusMessage] = useState("");
  const [resolutionPhotos, setResolutionPhotos] = useState<File[]>([]);
  const [reply, setReply] = useState("");
  const [replyPhotos, setReplyPhotos] = useState<File[]>([]);
  const [replyPhotoPreviews, setReplyPhotoPreviews] = useState<string[]>([]);
  const [requiresResponse, setRequiresResponse] = useState(false);
  const [note, setNote] = useState("");
  const [composerMode, setComposerMode] = useState<"reply" | "note">("reply");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    const observer = new ResizeObserver(() => {
      const max = Math.max(240, Math.min(600, workspace.getBoundingClientRect().width - 232));
      setDetailsPanelWidth((width) => Math.min(max, Math.max(240, width)));
    });
    observer.observe(workspace);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const previews = replyPhotos.map((photo) => URL.createObjectURL(photo));
    setReplyPhotoPreviews(previews);
    return () => previews.forEach((preview) => URL.revokeObjectURL(preview));
  }, [replyPhotos]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void Promise.all([
      request<{ complaint: AdminComplaint }>(`/complaints/${encodeURIComponent(complaintNumber)}`),
      request<{ departments: Department[] }>("/departments"),
      request<{ officers: Officer[] }>("/officers"),
    ])
      .then(([detail, departmentResult, officerResult]) => {
        if (!active) return;
        setComplaint(detail.complaint);
        setDepartments(departmentResult.departments.filter((item) => item.active));
        setOfficers(officerResult.officers.filter((item) => item.active));
        const department = detail.complaint.assignedDepartment?.id ?? "";
        setDepartmentId(department);
        setOfficerId(detail.complaint.assignedOfficer?.id ?? "");
        setStatus(
          detail.complaint.status === "received" ? "under_review" :
          detail.complaint.status === "under_review" || detail.complaint.status === "waiting_for_citizen" ? "in_progress" :
          "resolved",
        );
        setError("");
        setSuccess("");
        if (detail.complaint.slaDeadline) {
          const cursor = new Date();
          const end = new Date(detail.complaint.slaDeadline);
          let days = 0;
          while (cursor < end && days < 60) {
            cursor.setUTCDate(cursor.getUTCDate() + 1);
            if (cursor.getUTCDay() !== 0 && cursor.getUTCDay() !== 6) days += 1;
          }
          setWorkingDays(String(Math.max(1, days)));
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : t.loadError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [complaintNumber, request, retry, t.loadError]);

  useEffect(() => {
    if (loading || !complaint) return;
    let active = true;
    let requestPending = false;
    const refreshConversation = async () => {
      if (requestPending || saving) return;
      requestPending = true;
      try {
        const result = await request<{ complaint: AdminComplaint }>(
          `/complaints/${encodeURIComponent(complaintNumber)}`,
        );
        if (active) setComplaint(result.complaint);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : t.loadError);
      } finally {
        requestPending = false;
      }
    };
    const interval = window.setInterval(() => void refreshConversation(), 15000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [complaintNumber, complaint, loading, request, saving, t.loadError]);

  const availableOfficers = useMemo(
    () => officers.filter((item) => departmentOf(item) === departmentId),
    [officers, departmentId],
  );
  const detailsWidthBounds = () => {
    const workspaceWidth = workspaceRef.current?.getBoundingClientRect().width ?? window.innerWidth;
    const min = 240;
    return { min, max: Math.max(min, Math.min(600, workspaceWidth - 232)) };
  };
  const updateDetailsPanelWidth = (nextWidth: number) => {
    const bounds = detailsWidthBounds();
    setDetailsPanelWidth(Math.min(bounds.max, Math.max(bounds.min, nextWidth)));
  };
  const handleDividerPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsResizingDetails(true);
  };
  const handleDividerPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const workspaceBounds = workspaceRef.current?.getBoundingClientRect();
    if (!workspaceBounds) return;
    updateDetailsPanelWidth(workspaceBounds.right - event.clientX - 6);
  };
  const handleDividerPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsResizingDetails(false);
  };
  const handleDividerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      updateDetailsPanelWidth(detailsPanelWidth + 20);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      updateDetailsPanelWidth(detailsPanelWidth - 20);
    } else if (event.key === "Home") {
      event.preventDefault();
      updateDetailsPanelWidth(detailsWidthBounds().min);
    } else if (event.key === "End") {
      event.preventDefault();
      updateDetailsPanelWidth(detailsWidthBounds().max);
    }
  };
  const conversationItems = complaint ? [
    ...complaint.publicMessages.map((item, index) => ({
      kind: "message" as const,
      item,
      index,
      timestamp: new Date(item.createdAt).getTime(),
    })),
    ...complaint.internalNotes.map((item, index) => ({
      kind: "note" as const,
      item,
      index,
      timestamp: new Date(item.createdAt).getTime(),
    })),
  ].sort((left, right) => left.timestamp - right.timestamp) : [];
  const progressActivities = complaint ? getProgressUpdates(complaint) : [];
  const inferredSlaStart = complaint?.activityHistory.find((item) => item.type === "assigned")?.createdAt;
  const slaStartValue = complaint?.slaStartedAt ?? inferredSlaStart ?? null;
  const slaStart = slaStartValue ? new Date(slaStartValue).getTime() : Number.NaN;
  const slaEnd = complaint?.slaDeadline ? new Date(complaint.slaDeadline).getTime() : Number.NaN;
  const closedUpdate = complaint?.statusHistory.slice().reverse().find((item) =>
    item.status === "resolved" || item.status === "rejected",
  );
  const slaCurrent = complaint?.slaPausedAt
    ? new Date(complaint.slaPausedAt).getTime()
    : closedUpdate
      ? new Date(closedUpdate.createdAt).getTime()
      : Date.now();
  const totalSlaTime = workingTimeBetween(slaStart, slaEnd);
  const elapsedSlaTime = workingTimeBetween(slaStart, slaCurrent);
  const slaProgress = totalSlaTime > 0
    ? Math.min(100, Math.max(0, (elapsedSlaTime / totalSlaTime) * 100))
    : 0;
  const slaIsClosed = complaint ? ["resolved", "rejected"].includes(complaint.status) : false;
  const latitude = complaint?.location.latitude;
  const longitude = complaint?.location.longitude;
  const hasCoordinates = latitude !== undefined && longitude !== undefined &&
    Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
  const hasMapLocation = hasCoordinates || Boolean(complaint?.location.area?.trim());
  const googleMapsUrl = complaint && hasMapLocation
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      hasCoordinates ? `${latitude},${longitude}` : complaint.location.area || complaint.complaintNumber,
    )}`
    : undefined;
  const openStreetMapUrl = hasCoordinates
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.005}%2C${latitude - 0.003}%2C${longitude + 0.005}%2C${latitude + 0.003}&layer=mapnik&marker=${latitude}%2C${longitude}`
    : "";

  const sendAction = async (body: BodyInit, contentType?: string) => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const result = await request<{ complaint: AdminComplaint }>(
        `/complaints/${encodeURIComponent(complaintNumber)}`,
        {
          method: "PATCH",
          headers: contentType ? { "Content-Type": contentType } : undefined,
          body,
        },
      );
      setComplaint(result.complaint);
      setSuccess(t.saved);
      onUpdated();
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.failedAction);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveAssignment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!departmentId || !workingDays) {
      setError(t.required);
      return;
    }
    const body = JSON.stringify({
      action: "assign",
      departmentId,
      officerId: officerId || null,
      slaWorkingDays: Number(workingDays),
    });
    void sendAction(body, "application/json");
  };

  const saveStatus = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!statusMessage.trim() && (status === "resolved" || status === "rejected" || status === "waiting_for_citizen")) {
      setError(t.required);
      return;
    }
    const form = new FormData();
    form.append("action", "status");
    form.append("status", status);
    form.append("message", statusMessage);
    resolutionPhotos.forEach((photo) => form.append("photos", photo, photo.name));
    void sendAction(form).then((saved) => {
      if (saved) {
        setStatusMessage("");
        setResolutionPhotos([]);
      }
    });
  };

  const sendReply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reply.trim()) {
      setError(t.required);
      return;
    }
    const form = new FormData();
    form.append("action", "message");
    form.append("message", reply.trim());
    form.append("requiresResponse", String(requiresResponse));
    replyPhotos.forEach((photo) => form.append("photos", photo, photo.name));
    void sendAction(form).then((saved) => {
      if (saved) {
        setReply("");
        setReplyPhotos([]);
        setRequiresResponse(false);
      }
    });
  };

  const addReplyPhotos = (files: FileList | null) => {
    if (!files?.length) return;
    const additions = Array.from(files);
    if (replyPhotos.length + additions.length > 4 || additions.some((file) => file.size > 5 * 1024 * 1024)) {
      setError(t.photoLimit);
      return;
    }
    if (additions.some((file) => !file.type.startsWith("image/"))) {
      setError(t.photoTypeError);
      return;
    }
    setReplyPhotos((current) => [...current, ...additions]);
    setError("");
  };

  const removeReplyPhoto = (index: number) => {
    setReplyPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index));
  };

  const saveNote = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!note.trim()) {
      setError(t.required);
      return;
    }
    void sendAction(JSON.stringify({ action: "note", message: note.trim() }), "application/json")
      .then((saved) => { if (saved) setNote(""); });
  };

  const reopenComplaint = () => {
    void sendAction(JSON.stringify({ action: "reopen" }), "application/json")
      .then((saved) => {
      if (saved) {
        setStatus("in_progress");
        setSuccess(t.reopened);
      }
    });
  };

  return (
    <div className="admin-detail-overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="admin-detail-dialog" role="dialog" aria-modal="true" aria-label={`${t.complaint} ${complaintNumber}`}>
        <header className="admin-detail-header">
          <button type="button" className="admin-detail-back" onClick={onClose} aria-label={t.close}><FiArrowLeft /></button>
          <div>
            <strong>{complaint
              ? `${complaint.category.replaceAll("_", " ")}${complaint.location.area ? ` — ${complaint.location.area}` : ""}`
              : complaintNumber}</strong>
            <small>{t.complaint} / {complaintNumber}{complaint?.createdAt ? ` · ${dateTime(complaint.createdAt, language)}` : ""}</small>
          </div>
          <button type="button" className="admin-detail-close" onClick={onClose} aria-label={t.close}><FiX /></button>
        </header>

        {loading ? (
          <div className="admin-detail-state"><FiLoader className="queue-spin" />{t.loading}</div>
        ) : error && !complaint ? (
          <div className="admin-detail-state admin-detail-error" role="alert">
            <FiAlertCircle /><p>{error || t.loadError}</p>
            <button type="button" onClick={() => setRetry((value) => value + 1)}>{t.retry}</button>
          </div>
        ) : complaint ? (
          <div className="admin-detail-content">
            <div className="admin-detail-toolbar">
              <div className="admin-detail-toolbar-state">
                <span className={`queue-status queue-status-${complaint.status}`}><i />{t[`status_${complaint.status}`]}</span>
                {complaint.slaDeadline && <span><FiClock />{complaint.slaPausedAt ? t.slaPaused : dateTime(complaint.slaDeadline, language)}</span>}
              </div>
              <div className="admin-detail-toolbar-actions">
                <button type="button" onClick={() => factsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}><FiInfo />{t.citizenInfo}</button>
                {!["resolved", "rejected"].includes(complaint.status) ? (
                  <>
                    <button type="button" onClick={() => assignmentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}><FiUsers />{t.assignTeam}</button>
                    <button type="button" className="admin-detail-toolbar-primary" onClick={() => {
                      setStatus("resolved");
                      setError("");
                      statusRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }}><FiCheckCircle />{t.resolveComplaint}</button>
                  </>
                ) : (
                  <button type="button" className="admin-detail-toolbar-primary" disabled={saving} onClick={reopenComplaint}>
                    <FiClock />{saving ? t.saving : t.reopenComplaint}
                  </button>
                )}
              </div>
            </div>
            <div
              ref={workspaceRef}
              className={`admin-detail-workspace ${isResizingDetails ? "admin-detail-workspace-resizing" : ""}`}
              style={{ "--admin-detail-sidebar-width": `${detailsPanelWidth}px` } as CSSProperties}
            >
              <main className="admin-detail-conversation">
                <header className="admin-detail-chat-heading">
                  <h2>{complaint.category.replaceAll("_", " ")}{complaint.location.area ? ` — ${complaint.location.area}` : ""}</h2>
                  <p>{t.complaint} / {complaintNumber} · {t.created}: {dateTime(complaint.createdAt, language)}</p>
                </header>

                {(error || success) && (
                  <p className={error ? "admin-detail-feedback admin-detail-feedback-error" : "admin-detail-feedback"} role={error ? "alert" : "status"}>
                    {error || success}
                  </p>
                )}

                <div className="admin-detail-chat-scroll">
                  <div className="admin-detail-message-row admin-detail-message-row-citizen">
                    <span className="admin-detail-avatar"><FiUser /></span>
                    <article className="admin-detail-message">
                      <header>
                        <strong>{complaint.contact.name || (complaint.contact.privateName ? t.privateName : t.citizen)}</strong>
                        <time>{dateTime(complaint.createdAt, language)}</time>
                      </header>
                      <p>{complaint.details}</p>
                      {complaint.photos.length > 0 && (
                        <div className="admin-detail-message-photos">
                          {complaint.photos.map((photo, index) => (
                            <a href={photo} target="_blank" rel="noreferrer" key={`${photo}-${index}`}>
                              <img src={photo} alt={`${t.originalPhotos} ${index + 1}`} />
                            </a>
                          ))}
                        </div>
                      )}
                    </article>
                  </div>

                  {conversationItems.length === 0 && <p className="admin-detail-empty-chat">{t.noMessages}</p>}
                  {conversationItems.map((entry) => entry.kind === "note" ? (
                    <div className="admin-detail-internal-event" key={`note-${entry.item.createdAt}-${entry.index}`}>
                      <FiLock aria-hidden="true" />
                      <div>
                        <strong>{t.privateNote} · {entry.item.createdBy}</strong>
                        <p>{entry.item.message}</p>
                        <time>{dateTime(entry.item.createdAt, language)}</time>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`admin-detail-message-row ${entry.item.sender === "admin" ? "admin-detail-message-row-admin" : "admin-detail-message-row-citizen"}`}
                      key={`message-${entry.item.createdAt}-${entry.index}`}
                    >
                    <span className="admin-detail-avatar">{entry.item.sender === "admin"
                      ? initialsForName(entry.item.senderName || admin?.name || "Administration")
                      : <FiUser />}</span>
                    <article className="admin-detail-message">
                      <header>
                        <strong>{entry.item.sender === "admin" ? entry.item.senderName || admin?.name || "Administration" : t.citizen}</strong>
                        {entry.item.sender !== "admin" && <time>{dateTime(entry.item.createdAt, language)}</time>}
                        </header>
                        <p>{entry.item.message}</p>
                        {entry.item.photos.length > 0 && (
                          <div className="admin-detail-message-photos">
                            {entry.item.photos.map((photo, photoIndex) => (
                              <a href={photo} target="_blank" rel="noreferrer" key={`${photo}-${photoIndex}`}>
                                <img src={photo} alt="" />
                              </a>
                            ))}
                          </div>
                        )}
                        {entry.item.sender === "admin" && (
                          <footer className="admin-detail-message-meta">
                            <time>{dateTime(entry.item.createdAt, language)}</time>
                            <span
                              className={`admin-detail-message-checks ${entry.item.readAt ? "admin-detail-message-checks-seen" : ""}`}
                              aria-label={entry.item.readAt ? t.seenByCitizen : t.sent}
                              title={entry.item.readAt ? `${t.seenByCitizen} · ${dateTime(entry.item.readAt, language)}` : t.sent}
                            >
                              <FiCheck />
                              {entry.item.readAt && <FiCheck />}
                            </span>
                          </footer>
                        )}
                      </article>
                    </div>
                  ))}
                </div>

                <form
                  className={`admin-detail-composer ${["resolved", "rejected"].includes(complaint.status) && composerMode === "reply" ? "admin-detail-composer-closed" : ""}`}
                  onSubmit={composerMode === "reply" ? sendReply : saveNote}
                >
                    <div className="admin-detail-composer-tabs" role="tablist" aria-label={t.conversation}>
                      <button type="button" role="tab" aria-selected={composerMode === "reply"} onClick={() => { setComposerMode("reply"); setError(""); }}>{t.publicReply}</button>
                      <button type="button" role="tab" aria-selected={composerMode === "note"} onClick={() => { setComposerMode("note"); setError(""); }}><FiLock />{t.privateNote}</button>
                    </div>
                    <textarea
                      aria-label={composerMode === "reply" ? t.sendMessage : t.note}
                      placeholder={composerMode === "reply" && ["resolved", "rejected"].includes(complaint.status) ? t.closedReply : composerMode === "reply" ? t.replyPlaceholder : t.note}
                      value={composerMode === "reply" ? reply : note}
                      maxLength={1000}
                      rows={2}
                      disabled={composerMode === "reply" && ["resolved", "rejected"].includes(complaint.status)}
                      onChange={(event) => {
                        if (composerMode === "reply") setReply(event.target.value);
                        else setNote(event.target.value);
                        setError("");
                      }}
                    />
                    {composerMode === "reply" && (
                      <>
                        {replyPhotoPreviews.length > 0 && (
                          <div className="admin-detail-reply-photos">
                            {replyPhotoPreviews.map((preview, index) => (
                              <div className="admin-detail-reply-photo" key={`${replyPhotos[index]?.name}-${index}`}>
                                <img src={preview} alt={replyPhotos[index]?.name || t.attachPhotos} />
                                <button type="button" onClick={() => removeReplyPhoto(index)} aria-label={t.removePhoto}>
                                  <FiX />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <label className={`admin-detail-attach-photos ${["resolved", "rejected"].includes(complaint.status) ? "admin-detail-attach-photos-disabled" : ""}`}>
                          <FiPaperclip />
                          {t.attachPhotos} · {replyPhotos.length}/4
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
                            multiple
                            disabled={["resolved", "rejected"].includes(complaint.status)}
                            onChange={(event) => {
                              addReplyPhotos(event.currentTarget.files);
                              event.currentTarget.value = "";
                            }}
                          />
                        </label>
                      </>
                    )}
                    <div className="admin-detail-composer-actions">
                      {composerMode === "reply" ? (
                        <div className="admin-detail-response-request">
                          <label className="admin-detail-checkbox">
                            <input type="checkbox" checked={requiresResponse} disabled={["resolved", "rejected"].includes(complaint.status)} onChange={(event) => { setRequiresResponse(event.target.checked); setError(""); }} />
                            {t.askReply}
                          </label>
                          {requiresResponse && <small>{t.requestInformationHint}</small>}
                        </div>
                      ) : <span className="admin-detail-private-hint"><FiLock />{t.note}</span>}
                      <button type="submit" disabled={saving || !(composerMode === "reply" ? reply.trim() : note.trim()) || (composerMode === "reply" && ["resolved", "rejected"].includes(complaint.status))}>
                        <FiSend />{saving ? t.saving : composerMode === "reply" ? t.send : t.addNote}
                      </button>
                    </div>
                  </form>
              </main>

              <div
                className="admin-detail-resizer"
                role="separator"
                aria-label={t.resizeDetails}
                aria-orientation="vertical"
                aria-valuemin={detailsWidthBounds().min}
                aria-valuemax={detailsWidthBounds().max}
                aria-valuenow={detailsPanelWidth}
                tabIndex={0}
                onPointerDown={handleDividerPointerDown}
                onPointerMove={handleDividerPointerMove}
                onPointerUp={handleDividerPointerUp}
                onPointerCancel={handleDividerPointerUp}
                onKeyDown={handleDividerKeyDown}
                onDoubleClick={() => updateDetailsPanelWidth(350)}
              />
              <aside className="admin-detail-sidebar">
                <section className="admin-detail-card admin-detail-facts" ref={factsRef}>
                  <h3>{t.detailsTitle}</h3>
                  <dl>
                    <div><dt>{t.status}</dt><dd><span className={`queue-status queue-status-${complaint.status}`}><i />{t[`status_${complaint.status}`]}</span></dd></div>
                    <div><dt>{t.category}</dt><dd>{complaint.category.replaceAll("_", " ")}</dd></div>
                    <div><dt>{t.department}</dt><dd>{complaint.assignedDepartment?.name || t.locationMissing}</dd></div>
                    <div><dt>{t.officer}</dt><dd>{complaint.assignedOfficer?.name || t.locationMissing}</dd></div>
                    <div><dt>{t.deadline}</dt><dd>{complaint.slaPausedAt ? (slaIsClosed ? t.slaStopped : t.slaPaused) : complaint.slaDeadline ? dateTime(complaint.slaDeadline, language) : t.locationMissing}</dd></div>
                  </dl>
                  {complaint.slaDeadline && <div className={`admin-detail-sla-bar ${complaint.slaPausedAt && !slaIsClosed ? "admin-detail-sla-bar-paused" : ""} ${slaIsClosed ? "admin-detail-sla-bar-closed" : ""} ${!complaint.slaPausedAt && !slaIsClosed && slaProgress >= 100 ? "admin-detail-sla-bar-overdue" : ""} ${!complaint.slaPausedAt && !slaIsClosed && slaProgress >= 75 && slaProgress < 100 ? "admin-detail-sla-bar-warning" : ""}`} role="progressbar" aria-label={t.deadline} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(slaProgress)}><span style={{ width: `${slaProgress}%` }} /></div>}
                </section>

                <section className="admin-detail-card admin-detail-location-card">
                  <h3>{t.location}</h3>
                  <div className="admin-detail-map-frame">
                    {googleMapsUrl ? (
                      <a className="admin-detail-map-preview" href={googleMapsUrl} target="_blank" rel="noreferrer" aria-label={t.openMap}>
                        {hasCoordinates ? (
                          <iframe title={`${t.location}: ${complaint.location.area || complaint.complaintNumber}`} src={openStreetMapUrl} loading="lazy" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="admin-detail-map-placeholder">
                            <FiMapPin aria-hidden="true" />
                            <span>{t.approximateLocation}</span>
                          </div>
                        )}
                        <span className="admin-detail-map-open"><FiMapPin />{t.openMap}</span>
                      </a>
                    ) : (
                      <div className="admin-detail-map-preview admin-detail-map-preview-unavailable" aria-label={t.locationMissing}>
                        <div className="admin-detail-map-placeholder">
                          <FiMapPin aria-hidden="true" />
                          <span>{t.locationMissing}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <strong>{complaint.location.area || t.locationMissing}</strong>
                  <small>{hasCoordinates
                    ? `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`
                    : t.locationMissing}</small>
                </section>

                <article className="admin-detail-card admin-detail-citizen">
                  <h3>{t.citizen}</h3>
                  <div className="admin-detail-citizen-row">
                    <span className="admin-detail-avatar"><FiUser /></span>
                    <div>
                      <p>{complaint.contact.name || t.privateName}</p>
                      <a href={`tel:${complaint.contact.phone}`}>{complaint.contact.phone}</a>
                    </div>
                    <a className="admin-detail-call-button" href={`tel:${complaint.contact.phone}`} aria-label={t.call}><FiPhone /></a>
                  </div>
                  {complaint.contact.privateName && <small>{t.complainantPrivacy}</small>}
                </article>

                <section className="admin-detail-card">
                  <h3>{t.progress}</h3>
                  <ol className="admin-detail-timeline">
                    {progressActivities.map((item, index) => (
                      <li key={`${item.type}-${item.createdAt}-${index}`}>
                        <span><FiCheck /></span>
                        <div><strong>{item.type === "registered" || item.type === "assigned"
                          ? t[`activity_${item.type}`]
                          : item.status
                            ? t[`status_${item.status}`]
                            : t.activity_status_changed}</strong>
                          <p>{item.message || dateTime(item.createdAt, language)}</p>
                          {item.updatedBy && <small>{item.updatedBy}</small>}
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>

                {!["resolved", "rejected"].includes(complaint.status) && (
                  <>
                    <form className="admin-detail-card admin-detail-form" ref={assignmentRef} onSubmit={saveAssignment}>
                      <h3>{t.team}</h3>
                      <label>{t.department}
                        <AdminSelect ariaLabel={t.department} value={departmentId} required
                          onChange={(value) => { setDepartmentId(value); setOfficerId(""); }}
                          options={[{ value: "", label: t.selectDepartment }, ...departments.map((item) => ({ value: item._id, label: `${item.name} (${item.code})` }))]} />
                      </label>
                      <label>{t.officer}
                        <AdminSelect ariaLabel={t.officer} value={officerId} onChange={setOfficerId} disabled={!departmentId}
                          options={[{ value: "", label: t.selectOfficer }, ...availableOfficers.map((item) => ({ value: item._id, label: `${item.name} · ${item.title}` }))]} />
                      </label>
                      <label>{t.targetDays}
                        <input type="number" min="1" max="60" value={workingDays} onChange={(event) => { setWorkingDays(event.target.value); setError(""); }} required />
                      </label>
                      <small>{t.weekdays}</small>
                      <button type="submit" disabled={saving}>{saving ? t.saving : t.saveAssignment}</button>
                    </form>

                    <form className="admin-detail-card admin-detail-form" ref={statusRef} onSubmit={saveStatus}>
                      <h3>{t.status}</h3>
                      <label>{t.selectStatus}
                        <AdminSelect ariaLabel={t.selectStatus} value={status} onChange={(value) => setStatus(value as Status)}
                          options={statusOptions.map((option) => ({ value: option, label: t[`status_${option}`] }))} />
                      </label>
                      <label>{t.message}
                        <textarea value={statusMessage} maxLength={1000} rows={3} onChange={(event) => { setStatusMessage(event.target.value); setError(""); }} />
                      </label>
                      <small>{t.statusHint}</small>
                      {status === "resolved" && (
                        <label className="admin-detail-file">{t.photos}
                          <input type="file" accept="image/*" multiple onChange={(event) => setResolutionPhotos(Array.from(event.currentTarget.files ?? []))} />
                        </label>
                      )}
                      <button type="submit" disabled={saving}>{saving ? t.saving : t.update}</button>
                    </form>
                  </>
                )}

                {complaint.citizenFeedback && (
                  <article className="admin-detail-card admin-detail-feedback-card">
                    <h3>{t.citizenFeedback}</h3>
                    <span className={`admin-detail-feedback-rating ${complaint.citizenFeedback.confirmation === "resolved" ? "admin-detail-feedback-rating-positive" : "admin-detail-feedback-rating-negative"}`}>
                      {complaint.citizenFeedback.confirmation === "resolved" ? t.status_resolved : t.status_in_progress}
                    </span>
                    {complaint.citizenFeedback.comment && <p><strong>{t.feedbackComment}:</strong> {complaint.citizenFeedback.comment}</p>}
                  </article>
                )}
              </aside>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
