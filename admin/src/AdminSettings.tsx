import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { FiEdit2, FiPlus, FiRefreshCw, FiToggleLeft, FiToggleRight } from "react-icons/fi";
import { useAdminAuth } from "./adminAuth";
import AdminSelect from "./AdminSelect";

type Language = "en" | "hi" | "mr";
type SettingsTab = "departments" | "officers" | "templates";
type TemplateLanguage = "en" | "hi" | "mr";

interface DepartmentRecord {
  _id: string;
  name: string;
  code: string;
  description: string;
  active: boolean;
}

interface OfficerRecord {
  _id: string;
  name: string;
  title: string;
  departmentId: string | Pick<DepartmentRecord, "_id" | "name" | "code" | "active">;
  email: string;
  phone: string;
  active: boolean;
}

interface ReplyTemplateRecord {
  _id: string;
  title: string;
  message: string;
  language: TemplateLanguage;
  active: boolean;
}

const copy = {
  en: {
    title: "Manage shared settings",
    description: "Maintain the departments, officers and reply templates used by the admin team.",
    departments: "Departments",
    officers: "Officers",
    templates: "Reply templates",
    addDepartment: "Add department",
    addOfficer: "Add officer",
    addTemplate: "Add reply template",
    departmentName: "Department name",
    code: "Department code",
    descriptionField: "Description (optional)",
    officerName: "Officer name",
    designation: "Designation",
    department: "Department",
    email: "Email (optional)",
    phone: "Phone (optional)",
    templateTitle: "Template name",
    message: "Reply message",
    language: "Language",
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    deactivate: "Deactivate",
    activate: "Activate",
    active: "Active",
    inactive: "Inactive",
    noDepartments: "No departments yet. Add one to start organizing assignments.",
    noOfficers: "No officers yet. Add officers and link them to a department.",
    noTemplates: "No reply templates yet. Add one for your team to reuse.",
    ownerOnly: "Only the owner can add, edit or deactivate these records. Admins can view them.",
    adminRole: "Administrator view",
    loading: "Loading shared settings…",
    retry: "Try again",
    error: "Could not load settings.",
    saved: "Changes saved.",
    required: "Fill in all required fields.",
    departmentRequired: "Add an active department before creating an officer.",
    errorHeading: "Settings could not be loaded",
    en: "English",
    hi: "Hindi",
    mr: "Marathi",
  },
  hi: {
    title: "साझा सेटिंग प्रबंधित करें",
    description: "प्रशासक टीम के विभाग, अधिकारी और उत्तर के साँचे सँभालें।",
    departments: "विभाग",
    officers: "अधिकारी",
    templates: "उत्तर के साँचे",
    addDepartment: "विभाग जोड़ें",
    addOfficer: "अधिकारी जोड़ें",
    addTemplate: "उत्तर का साँचा जोड़ें",
    departmentName: "विभाग का नाम",
    code: "विभाग कोड",
    descriptionField: "विवरण (वैकल्पिक)",
    officerName: "अधिकारी का नाम",
    designation: "पद",
    department: "विभाग",
    email: "ईमेल (वैकल्पिक)",
    phone: "फ़ोन (वैकल्पिक)",
    templateTitle: "साँचे का नाम",
    message: "उत्तर संदेश",
    language: "भाषा",
    save: "सहेजें",
    cancel: "रद्द करें",
    edit: "बदलें",
    deactivate: "निष्क्रिय करें",
    activate: "सक्रिय करें",
    active: "सक्रिय",
    inactive: "निष्क्रिय",
    noDepartments: "अभी कोई विभाग नहीं है। असाइनमेंट व्यवस्थित करने के लिए विभाग जोड़ें।",
    noOfficers: "अभी कोई अधिकारी नहीं है। अधिकारी जोड़कर विभाग से जोड़ें।",
    noTemplates: "अभी कोई उत्तर साँचा नहीं है। टीम के उपयोग के लिए साँचा जोड़ें।",
    ownerOnly: "केवल मालिक इन रिकॉर्ड को जोड़, बदल या निष्क्रिय कर सकता है। प्रशासक इन्हें देख सकते हैं।",
    adminRole: "प्रशासक दृश्य",
    loading: "साझा सेटिंग लोड हो रही हैं…",
    retry: "फिर कोशिश करें",
    error: "सेटिंग लोड नहीं हो सकीं।",
    saved: "बदलाव सहेजे गए।",
    required: "सभी ज़रूरी फ़ील्ड भरें।",
    departmentRequired: "अधिकारी जोड़ने से पहले एक सक्रिय विभाग जोड़ें।",
    errorHeading: "सेटिंग लोड नहीं हो सकीं",
    en: "अंग्रेज़ी",
    hi: "हिन्दी",
    mr: "मराठी",
  },
  mr: {
    title: "सामायिक सेटिंग्ज व्यवस्थापित करा",
    description: "प्रशासक टीमसाठी विभाग, अधिकारी आणि उत्तराचे नमुने सांभाळा.",
    departments: "विभाग",
    officers: "अधिकारी",
    templates: "उत्तराचे नमुने",
    addDepartment: "विभाग जोडा",
    addOfficer: "अधिकारी जोडा",
    addTemplate: "उत्तराचा नमुना जोडा",
    departmentName: "विभागाचे नाव",
    code: "विभाग कोड",
    descriptionField: "वर्णन (ऐच्छिक)",
    officerName: "अधिकाऱ्याचे नाव",
    designation: "पद",
    department: "विभाग",
    email: "ईमेल (ऐच्छिक)",
    phone: "फोन (ऐच्छिक)",
    templateTitle: "नमुन्याचे नाव",
    message: "उत्तर संदेश",
    language: "भाषा",
    save: "जतन करा",
    cancel: "रद्द करा",
    edit: "बदला",
    deactivate: "निष्क्रिय करा",
    activate: "सक्रिय करा",
    active: "सक्रिय",
    inactive: "निष्क्रिय",
    noDepartments: "अद्याप विभाग नाहीत. नेमणुका व्यवस्थित करण्यासाठी विभाग जोडा.",
    noOfficers: "अद्याप अधिकारी नाहीत. अधिकारी जोडून विभागाशी जोडा.",
    noTemplates: "अद्याप उत्तराचे नमुने नाहीत. टीमसाठी नमुना जोडा.",
    ownerOnly: "फक्त मालक या नोंदी जोडू, बदलू किंवा निष्क्रिय करू शकतो. प्रशासक त्या पाहू शकतात.",
    adminRole: "प्रशासक दृश्य",
    loading: "सामायिक सेटिंग्ज लोड होत आहेत…",
    retry: "पुन्हा प्रयत्न करा",
    error: "सेटिंग्ज लोड होऊ शकल्या नाहीत.",
    saved: "बदल जतन झाले.",
    required: "सर्व आवश्यक माहिती भरा.",
    departmentRequired: "अधिकारी जोडण्यापूर्वी सक्रिय विभाग जोडा.",
    errorHeading: "सेटिंग्ज लोड होऊ शकल्या नाहीत",
    en: "इंग्रजी",
    hi: "हिंदी",
    mr: "मराठी",
  },
} satisfies Record<Language, Record<string, string>>;

interface FormValues {
  name: string;
  code: string;
  description: string;
  title: string;
  departmentId: string;
  email: string;
  phone: string;
  message: string;
  language: TemplateLanguage;
}

const emptyForm: FormValues = {
  name: "",
  code: "",
  description: "",
  title: "",
  departmentId: "",
  email: "",
  phone: "",
  message: "",
  language: "hi",
};

const readDepartmentId = (officer: OfficerRecord): string =>
  typeof officer.departmentId === "string" ? officer.departmentId : officer.departmentId._id;

export default function AdminSettings({
  language,
  initialTab,
}: {
  language: Language;
  initialTab: SettingsTab;
}) {
  const { admin, request } = useAdminAuth();
  const text = copy[language];
  const canManage = admin?.role === "owner";
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [officers, setOfficers] = useState<OfficerRecord[]>([]);
  const [templates, setTemplates] = useState<ReplyTemplateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormValues>(emptyForm);

  const loadData = async (): Promise<boolean> => {
    setLoading(true);
    setError("");
    try {
      const [departmentResponse, officerResponse, templateResponse] = await Promise.all([
        request<{ departments: DepartmentRecord[] }>("/departments"),
        request<{ officers: OfficerRecord[] }>("/officers"),
        request<{ templates: ReplyTemplateRecord[] }>("/reply-templates"),
      ]);
      setDepartments(departmentResponse.departments);
      setOfficers(officerResponse.officers);
      setTemplates(templateResponse.templates);
      return true;
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : text.error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const activeDepartments = useMemo(() => departments.filter((department) => department.active), [departments]);
  const records = tab === "departments" ? departments : tab === "officers" ? officers : templates;
  const addLabel = tab === "departments" ? text.addDepartment : tab === "officers" ? text.addOfficer : text.addTemplate;
  const emptyLabel = tab === "departments" ? text.noDepartments : tab === "officers" ? text.noOfficers : text.noTemplates;

  const startCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, departmentId: activeDepartments[0]?._id ?? "", language });
    setFormError("");
    setSuccess("");
    setFormOpen(true);
  };

  const startEdit = (record: DepartmentRecord | OfficerRecord | ReplyTemplateRecord) => {
    setFormError("");
    setSuccess("");
    setEditingId(record._id);
    if (tab === "departments") {
      const department = record as DepartmentRecord;
      setForm({
        ...emptyForm,
        name: department.name,
        code: department.code,
        description: department.description,
      });
    } else if (tab === "officers") {
      const officer = record as OfficerRecord;
      setForm({
        ...emptyForm,
        name: officer.name,
        title: officer.title,
        departmentId: readDepartmentId(officer),
        email: officer.email,
        phone: officer.phone,
      });
    } else {
      const template = record as ReplyTemplateRecord;
      setForm({
        ...emptyForm,
        title: template.title,
        message: template.message,
        language: template.language,
      });
    }
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
  };

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    setSuccess("");
    let path = "";
    let payload: Record<string, string> = {};
    if (tab === "departments") {
      path = editingId ? `/departments/${editingId}` : "/departments";
      payload = { name: form.name, code: form.code, description: form.description };
    } else if (tab === "officers") {
      path = editingId ? `/officers/${editingId}` : "/officers";
      payload = {
        name: form.name,
        title: form.title,
        departmentId: form.departmentId,
        email: form.email,
        phone: form.phone,
      };
    } else {
      path = editingId ? `/reply-templates/${editingId}` : "/reply-templates";
      payload = { title: form.title, message: form.message, language: form.language };
    }

    try {
      await request(path, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const refreshed = await loadData();
      closeForm();
      if (refreshed) setSuccess(text.saved);
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : text.error);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (record: DepartmentRecord | OfficerRecord | ReplyTemplateRecord) => {
    setError("");
    setSuccess("");
    try {
      const path = tab === "departments"
        ? `/departments/${record._id}`
        : tab === "officers"
          ? `/officers/${record._id}`
          : `/reply-templates/${record._id}`;
      await request(path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !record.active }),
      });
      if (await loadData()) setSuccess(text.saved);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : text.error);
    }
  };

  const renderFormField = (label: string, value: string, key: keyof FormValues, required = false, maxLength = 200): ReactNode => (
    <label className="settings-field" key={key}>
      <span>{label}{required && <b aria-hidden="true"> *</b>}</span>
      <input
        value={value}
        required={required}
        maxLength={maxLength}
        onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
      />
    </label>
  );

  const renderForm = () => (
    <form className="settings-form" onSubmit={submitForm}>
      {tab === "departments" ? (
        <>
          {renderFormField(text.departmentName, form.name, "name", true, 100)}
          {renderFormField(text.code, form.code, "code", true, 20)}
          {renderFormField(text.descriptionField, form.description, "description", false, 500)}
        </>
      ) : tab === "officers" ? (
        <>
          {renderFormField(text.officerName, form.name, "name", true, 100)}
          {renderFormField(text.designation, form.title, "title", true, 100)}
          <label className="settings-field">
            <span>{text.department}<b aria-hidden="true"> *</b></span>
            <AdminSelect
              ariaLabel={text.department}
              required
              value={form.departmentId}
              onChange={(departmentId) => setForm((current) => ({ ...current, departmentId }))}
              options={[
                { value: "", label: text.department, disabled: true },
                ...activeDepartments.map((department) => ({ value: department._id, label: department.name })),
              ]}
            />
          </label>
          {activeDepartments.length === 0 && <p className="settings-error">{text.departmentRequired}</p>}
          {renderFormField(text.email, form.email, "email", false, 254)}
          {renderFormField(text.phone, form.phone, "phone", false, 30)}
        </>
      ) : (
        <>
          {renderFormField(text.templateTitle, form.title, "title", true, 100)}
          <label className="settings-field">
            <span>{text.language}<b aria-hidden="true"> *</b></span>
            <AdminSelect
              ariaLabel={text.language}
              value={form.language}
              onChange={(language) => setForm((current) => ({ ...current, language: language as TemplateLanguage }))}
              options={(["en", "hi", "mr"] as const).map((code) => ({ value: code, label: text[code] }))}
            />
          </label>
          <label className="settings-field settings-field-wide">
            <span>{text.message}<b aria-hidden="true"> *</b></span>
            <textarea
              required
              maxLength={2000}
              rows={4}
              value={form.message}
              onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
            />
          </label>
        </>
      )}
      {formError && <p className="settings-error" role="alert">{formError}</p>}
      <div className="settings-form-actions">
        <button type="button" className="settings-secondary-button" onClick={closeForm}>{text.cancel}</button>
        <button type="submit" className="settings-primary-button" disabled={saving}>
          {saving ? <FiRefreshCw className="settings-spinning" /> : null}{text.save}
        </button>
      </div>
    </form>
  );

  return (
    <div className="settings-page">
      <header className="settings-page-heading">
        <div>
          <h2>{text.title}</h2>
          <p>{text.description}</p>
        </div>
        <span className={`settings-role-badge ${canManage ? "settings-role-owner" : ""}`}>
          {canManage ? text.ownerOnly : text.adminRole}
        </span>
      </header>
      <div className="settings-tabs" role="tablist" aria-label={text.title}>
        {([
          ["departments", text.departments],
          ["officers", text.officers],
          ["templates", text.templates],
        ] as const).map(([key, label]) => (
          <button
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`settings-tab ${tab === key ? "settings-tab-active" : ""}`}
            key={key}
            onClick={() => {
              setTab(key);
              closeForm();
              setSuccess("");
              setError("");
            }}
          >{label}</button>
        ))}
      </div>
      <section className="panel settings-content">
        <div className="settings-list-heading">
          <div>
            <h3>{tab === "departments" ? text.departments : tab === "officers" ? text.officers : text.templates}</h3>
            <p>{canManage ? text.ownerOnly : text.adminRole}</p>
          </div>
          {canManage && (
            <button type="button" className="settings-primary-button" onClick={startCreate}>
              <FiPlus size={16} />{addLabel}
            </button>
          )}
        </div>
        {success && <p className="settings-success" role="status">{success}</p>}
        {error && <div className="settings-error-block" role="alert"><p>{error}</p><button type="button" onClick={() => void loadData()}>{text.retry}</button></div>}
        {formOpen && <div className="settings-form-card"><h3>{editingId ? text.edit : addLabel}</h3>{renderForm()}</div>}
        {loading ? (
          <div className="settings-loading"><FiRefreshCw className="settings-spinning" />{text.loading}</div>
        ) : !error && records.length === 0 ? (
          <div className="settings-empty"><span><FiPlus size={19} /></span><p>{emptyLabel}</p></div>
        ) : !error ? (
          <div className="settings-record-list">
            {tab === "departments" && (departments as DepartmentRecord[]).map((department) => (
              <article className={`settings-record ${department.active ? "" : "settings-record-inactive"}`} key={department._id}>
                <span className="settings-record-icon">D</span>
                <div className="settings-record-main">
                  <div className="settings-record-title"><h4>{department.name}</h4><span className={`settings-status ${department.active ? "is-active" : ""}`}>{department.active ? text.active : text.inactive}</span></div>
                  <p><span className="settings-code">{department.code}</span>{department.description && <> · {department.description}</>}</p>
                </div>
                {canManage && <div className="settings-record-actions">
                  <button type="button" aria-label={`${text.edit}: ${department.name}`} onClick={() => startEdit(department)}><FiEdit2 size={15} />{text.edit}</button>
                  <button type="button" aria-label={`${department.active ? text.deactivate : text.activate}: ${department.name}`} onClick={() => void toggleActive(department)}>{department.active ? <FiToggleRight size={17} /> : <FiToggleLeft size={17} />}{department.active ? text.deactivate : text.activate}</button>
                </div>}
              </article>
            ))}
            {tab === "officers" && (officers as OfficerRecord[]).map((officer) => {
              const department = typeof officer.departmentId === "string"
                ? departments.find((entry) => entry._id === officer.departmentId)
                : officer.departmentId;
              return (
                <article className={`settings-record ${officer.active ? "" : "settings-record-inactive"}`} key={officer._id}>
                  <span className="settings-record-avatar">{officer.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase()}</span>
                  <div className="settings-record-main">
                    <div className="settings-record-title"><h4>{officer.name}</h4><span className={`settings-status ${officer.active ? "is-active" : ""}`}>{officer.active ? text.active : text.inactive}</span></div>
                    <p>{officer.title} · {department?.name ?? "—"}{officer.email ? ` · ${officer.email}` : ""}{officer.phone ? ` · ${officer.phone}` : ""}</p>
                  </div>
                  {canManage && <div className="settings-record-actions">
                    <button type="button" aria-label={`${text.edit}: ${officer.name}`} onClick={() => startEdit(officer)}><FiEdit2 size={15} />{text.edit}</button>
                    <button type="button" aria-label={`${officer.active ? text.deactivate : text.activate}: ${officer.name}`} onClick={() => void toggleActive(officer)}>{officer.active ? <FiToggleRight size={17} /> : <FiToggleLeft size={17} />}{officer.active ? text.deactivate : text.activate}</button>
                  </div>}
                </article>
              );
            })}
            {tab === "templates" && (templates as ReplyTemplateRecord[]).map((template) => (
              <article className={`settings-record settings-template-record ${template.active ? "" : "settings-record-inactive"}`} key={template._id}>
                <span className="settings-record-icon settings-template-icon">{template.language.toUpperCase()}</span>
                <div className="settings-record-main">
                  <div className="settings-record-title"><h4>{template.title}</h4><span className={`settings-status ${template.active ? "is-active" : ""}`}>{template.active ? text.active : text.inactive}</span></div>
                  <p>{template.message}</p>
                </div>
                {canManage && <div className="settings-record-actions">
                  <button type="button" aria-label={`${text.edit}: ${template.title}`} onClick={() => startEdit(template)}><FiEdit2 size={15} />{text.edit}</button>
                  <button type="button" aria-label={`${template.active ? text.deactivate : text.activate}: ${template.title}`} onClick={() => void toggleActive(template)}>{template.active ? <FiToggleRight size={17} /> : <FiToggleLeft size={17} />}{template.active ? text.deactivate : text.activate}</button>
                </div>}
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
