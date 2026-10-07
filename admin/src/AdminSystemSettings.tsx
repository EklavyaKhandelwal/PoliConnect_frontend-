import { useState, type FormEvent } from "react";
import { FiCheck, FiSave } from "react-icons/fi";
import { useAdminAuth } from "./adminAuth";
import {
  cloneAdminConfiguration,
  complaintCategoryKeys,
  notificationEventKeys,
  type AdminConfiguration,
  type ComplaintActivityType,
  type ComplaintCategoryKey,
} from "./adminSettingsTypes";

type Language = "en" | "hi" | "mr";

const copy = {
  en: {
    title: "Organization settings",
    description: "Manage the organization profile, default service targets, and in-app updates.",
    ownerOnly: "Only the owner can change organization settings. Admins can view them.",
    adminRole: "Administrator view",
    organization: "Organization profile",
    profileHelp: "These details identify the administration team in the dashboard.",
    organizationName: "Organization name",
    officeName: "Office name",
    address: "Office address",
    email: "Contact email",
    phone: "Contact phone",
    sla: "Service targets",
    slaHelp: "Default resolution targets used when assigning new complaints. Existing deadlines are not changed.",
    category: "Complaint category",
    workingDays: "Working days",
    notifications: "In-app notifications",
    notificationsHelp: "Choose which complaint events appear in the notification bell.",
    save: "Save settings",
    saving: "Saving…",
    saved: "Settings saved.",
    loading: "Loading organization settings…",
    loadError: "Organization settings could not be loaded.",
    retry: "Try again",
    saveError: "Settings could not be saved.",
    registered: "Complaint submitted",
    assigned: "Complaint assigned",
    status_changed: "Status updated",
    resolved: "Complaint resolved",
    rejected: "Complaint rejected",
    citizen_reply: "Citizen replied",
    citizen_reopened: "Complaint reopened",
    road: "Road",
    water: "Water",
    electricity: "Electricity",
    cleanliness: "Cleanliness",
    health: "Health",
    ration: "Ration / pension",
    education: "Education",
    other: "Other",
  },
  hi: {
    title: "संस्था की सेटिंग",
    description: "संस्था की जानकारी, सेवा की समय-सीमा और ऐप सूचनाएँ प्रबंधित करें।",
    ownerOnly: "केवल मालिक संस्था की सेटिंग बदल सकता है। प्रशासक इन्हें देख सकते हैं।",
    adminRole: "प्रशासक दृश्य",
    organization: "संस्था की जानकारी",
    profileHelp: "यह जानकारी डैशबोर्ड में प्रशासन टीम की पहचान बताती है।",
    organizationName: "संस्था का नाम",
    officeName: "कार्यालय का नाम",
    address: "कार्यालय का पता",
    email: "संपर्क ईमेल",
    phone: "संपर्क फ़ोन",
    sla: "सेवा समय-सीमा",
    slaHelp: "नई शिकायतें सौंपते समय लागू होने वाली डिफ़ॉल्ट समय-सीमा। मौजूदा समय-सीमा नहीं बदलेगी।",
    category: "शिकायत श्रेणी",
    workingDays: "कार्यदिवस",
    notifications: "ऐप सूचनाएँ",
    notificationsHelp: "चुनें कि कौन-सी शिकायत गतिविधियाँ सूचना घंटी में दिखें।",
    save: "सेटिंग सहेजें",
    saving: "सहेज रहे हैं…",
    saved: "सेटिंग सहेजी गई।",
    loading: "संस्था की सेटिंग लोड हो रही हैं…",
    loadError: "संस्था की सेटिंग लोड नहीं हो सकीं।",
    retry: "फिर कोशिश करें",
    saveError: "सेटिंग सहेजी नहीं जा सकीं।",
    registered: "शिकायत दर्ज हुई",
    assigned: "शिकायत सौंपी गई",
    status_changed: "स्थिति अपडेट हुई",
    resolved: "शिकायत हल हुई",
    rejected: "शिकायत अस्वीकृत हुई",
    citizen_reply: "नागरिक ने जवाब दिया",
    citizen_reopened: "शिकायत फिर खोली गई",
    road: "सड़क",
    water: "पानी",
    electricity: "बिजली",
    cleanliness: "सफाई",
    health: "स्वास्थ्य",
    ration: "राशन / पेंशन",
    education: "शिक्षा",
    other: "अन्य",
  },
  mr: {
    title: "संस्थेच्या सेटिंग्ज",
    description: "संस्थेची माहिती, सेवा-मुदती आणि अॅप सूचना व्यवस्थापित करा.",
    ownerOnly: "फक्त मालक संस्थेच्या सेटिंग्ज बदलू शकतो. प्रशासक त्या पाहू शकतात.",
    adminRole: "प्रशासक दृश्य",
    organization: "संस्थेची माहिती",
    profileHelp: "ही माहिती डॅशबोर्डमध्ये प्रशासन टीमची ओळख दर्शवते.",
    organizationName: "संस्थेचे नाव",
    officeName: "कार्यालयाचे नाव",
    address: "कार्यालयाचा पत्ता",
    email: "संपर्क ईमेल",
    phone: "संपर्क फोन",
    sla: "सेवा-मुदती",
    slaHelp: "नवीन तक्रारी नेमताना वापरली जाणारी डीफॉल्ट मुदत. सध्याच्या मुदती बदलणार नाहीत.",
    category: "तक्रार वर्ग",
    workingDays: "कामाचे दिवस",
    notifications: "अॅप सूचना",
    notificationsHelp: "सूचना घंटीत कोणत्या तक्रार हालचाली दिसाव्यात ते निवडा.",
    save: "सेटिंग्ज जतन करा",
    saving: "जतन होत आहे…",
    saved: "सेटिंग्ज जतन झाल्या.",
    loading: "संस्थेच्या सेटिंग्ज लोड होत आहेत…",
    loadError: "संस्थेच्या सेटिंग्ज लोड होऊ शकल्या नाहीत.",
    retry: "पुन्हा प्रयत्न करा",
    saveError: "सेटिंग्ज जतन होऊ शकल्या नाहीत.",
    registered: "तक्रार दाखल झाली",
    assigned: "तक्रार नेमली",
    status_changed: "स्थिती अपडेट झाली",
    resolved: "तक्रार निकाली",
    rejected: "तक्रार नामंजूर",
    citizen_reply: "नागरिकाने उत्तर दिले",
    citizen_reopened: "तक्रार पुन्हा उघडली",
    road: "रस्ता",
    water: "पाणी",
    electricity: "वीज",
    cleanliness: "स्वच्छता",
    health: "आरोग्य",
    ration: "रेशन / पेन्शन",
    education: "शिक्षण",
    other: "इतर",
  },
} satisfies Record<Language, Record<string, string>>;

function SettingsLoadingState({
  language,
  error,
  onRetry,
}: {
  language: Language;
  error: string;
  onRetry: () => void;
}) {
  const text = copy[language];
  return (
    <section className="settings-page">
      {error ? (
        <div className="settings-error-block" role="alert">
          <p>{text.loadError} {error}</p>
          <button type="button" onClick={onRetry}>{text.retry}</button>
        </div>
      ) : (
        <div className="settings-loading" role="status" aria-live="polite">
          <span className="page-spinner" aria-hidden="true" />
          {text.loading}
        </div>
      )}
    </section>
  );
}

function SettingsEditor({
  language,
  initialSettings,
  onSaved,
}: {
  language: Language;
  initialSettings: AdminConfiguration;
  onSaved: (settings: AdminConfiguration) => void;
}) {
  const { admin, request } = useAdminAuth();
  const text = copy[language];
  const canManage = admin?.role === "owner";
  const [settings, setSettings] = useState(() => cloneAdminConfiguration(initialSettings));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const updateProfile = (key: keyof AdminConfiguration["profile"], value: string) => {
    setSettings((current) => ({ ...current, profile: { ...current.profile, [key]: value } }));
    setSuccess("");
  };

  const updateSla = (category: ComplaintCategoryKey, value: number) => {
    if (!Number.isInteger(value) || value < 1 || value > 60) return;
    setSettings((current) => ({
      ...current,
      slaWorkingDays: { ...current.slaWorkingDays, [category]: value },
    }));
    setSuccess("");
  };

  const updateNotification = (type: ComplaintActivityType) => {
    setSettings((current) => ({
      ...current,
      notifications: { ...current.notifications, [type]: !current.notifications[type] },
    }));
    setSuccess("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await request<{ settings: AdminConfiguration }>("/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const saved = cloneAdminConfiguration(response.settings);
      setSettings(saved);
      onSaved(saved);
      setSuccess(text.saved);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : text.saveError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="settings-page">
      <header className="settings-page-heading">
        <div>
          <h2>{text.title}</h2>
          <p>{text.description}</p>
        </div>
        <span className={`settings-role-badge ${canManage ? "settings-role-owner" : ""}`}>
          {canManage ? text.ownerOnly : text.adminRole}
        </span>
      </header>
      <form className="system-settings-form" onSubmit={submit}>
        <section className="panel system-settings-panel">
          <header className="system-settings-section-heading">
            <div><h3>{text.organization}</h3><p>{text.profileHelp}</p></div>
          </header>
          <div className="system-settings-profile-grid">
            <label className="settings-field">
              <span>{text.organizationName}</span>
              <input maxLength={100} value={settings.profile.organizationName} disabled={!canManage} onChange={(event) => updateProfile("organizationName", event.target.value)} />
            </label>
            <label className="settings-field">
              <span>{text.officeName}</span>
              <input maxLength={100} value={settings.profile.officeName} disabled={!canManage} onChange={(event) => updateProfile("officeName", event.target.value)} />
            </label>
            <label className="settings-field">
              <span>{text.address}</span>
              <input maxLength={250} value={settings.profile.address} disabled={!canManage} onChange={(event) => updateProfile("address", event.target.value)} />
            </label>
            <label className="settings-field">
              <span>{text.email}</span>
              <input type="email" maxLength={254} value={settings.profile.contactEmail} disabled={!canManage} onChange={(event) => updateProfile("contactEmail", event.target.value)} />
            </label>
            <label className="settings-field">
              <span>{text.phone}</span>
              <input type="tel" maxLength={30} value={settings.profile.contactPhone} disabled={!canManage} onChange={(event) => updateProfile("contactPhone", event.target.value)} />
            </label>
          </div>
        </section>

        <section className="panel system-settings-panel">
          <header className="system-settings-section-heading">
            <div><h3>{text.sla}</h3><p>{text.slaHelp}</p></div>
          </header>
          <div className="system-settings-sla-grid">
            {complaintCategoryKeys.map((category) => (
              <label className="system-settings-sla-field" key={category}>
                <span>{text[category]}</span>
                <span className="system-settings-number">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    step={1}
                    required
                    value={settings.slaWorkingDays[category]}
                    disabled={!canManage}
                    aria-label={`${text[category]} · ${text.workingDays}`}
                    onChange={(event) => updateSla(category, event.currentTarget.valueAsNumber)}
                  />
                  <small>{text.workingDays}</small>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="panel system-settings-panel">
          <header className="system-settings-section-heading">
            <div><h3>{text.notifications}</h3><p>{text.notificationsHelp}</p></div>
          </header>
          <div className="system-settings-notifications">
            {notificationEventKeys.map((type) => (
              <label className="system-settings-toggle-row" key={type}>
                <span>{text[type]}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.notifications[type]}
                  aria-label={text[type]}
                  disabled={!canManage}
                  onClick={() => updateNotification(type)}
                  className={`system-settings-switch ${settings.notifications[type] ? "system-settings-switch-on" : ""}`}
                ><span /></button>
              </label>
            ))}
          </div>
        </section>

        {error && <p className="settings-error" role="alert">{error}</p>}
        {success && <p className="settings-success" role="status"><FiCheck />{success}</p>}
        {canManage && (
          <div className="system-settings-actions">
            <button type="submit" className="settings-primary-button" disabled={saving}>
              {saving ? <span className="page-spinner page-spinner-small" aria-hidden="true" /> : <FiSave />}
              {saving ? text.saving : text.save}
            </button>
          </div>
        )}
      </form>
    </section>
  );
}

export default function AdminSystemSettings({
  language,
  settings,
  loading,
  error,
  onRetry,
  onSaved,
}: {
  language: Language;
  settings: AdminConfiguration | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
  onSaved: (settings: AdminConfiguration) => void;
}) {
  if (!settings) {
    return <SettingsLoadingState language={language} error={loading ? "" : error} onRetry={onRetry} />;
  }
  return <SettingsEditor language={language} initialSettings={settings} onSaved={onSaved} />;
}
