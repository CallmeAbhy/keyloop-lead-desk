// src/App.tsx
import React, { useState, useMemo } from "react";
import {
  Zap,
  Flame,
  Droplets,
  Trash2,
  ShieldAlert,
  CheckCircle2,
  Send,
  Clock,
  PhoneCall,
  CopyPlus,
  RotateCcw,
  UserCheck,
  FileCheck2,
  ChevronDown,
  ChevronRight,
  TrainTrack,
  Webhook,
  UserPlus,
  Users,
  Settings2,
  PlusCircle,
  Rocket,
  Save,
  History,
  LayoutDashboard,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import {
  formMasterStore,
  type AttributeSchema,
  type AttributeType,
  type SectionSchema,
  type FormVersionRecord,
} from "./schema/formSchema";
import {
  mockApi,
  calculatePricing,
  type LeadRecord,
  type ProductPricingItem,
} from "./api/mockBackend";

interface UserAccount {
  id: string;
  name: string;
  role: "REP" | "MANAGER";
}

const ACCOUNTS: UserAccount[] = [
  { id: "rep-1", name: "Abhay (Sales Rep 1)", role: "REP" },
  { id: "rep-2", name: "Sarah Jenkins (Sales Rep 2)", role: "REP" },
  { id: "mgr-1", name: "Rajesh Singh (Sales Manager - DAP)", role: "MANAGER" },
];

export default function App() {
  const [leads, setLeads] = useState<LeadRecord[]>(() => mockApi.getLeads());
  const [selectedLeadId, setSelectedLeadId] = useState<string>(leads[0].id);
  const [ageFilter, setAgeFilter] = useState<
    "ALL" | "POOL" | "MY_LEADS" | "THUNDER" | "FIRE" | "WATER"
  >("ALL");

  // Advanced Search & Status Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  const [currentUser, setCurrentUser] = useState<UserAccount>(ACCOUNTS[0]);
  const [activeView, setActiveView] = useState<"WORKSPACE" | "FORM_MASTER">(
    "WORKSPACE",
  );
  const [quickNote, setQuickNote] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [formVersions, setFormVersions] = useState<FormVersionRecord[]>(() =>
    formMasterStore.getAllVersions(),
  );
  const publishedForm = useMemo(
    () => formVersions.find((v) => v.status === "PUBLISHED") || formVersions[0],
    [formVersions],
  );

  const [builderSections, setBuilderSections] = useState<SectionSchema[]>(() =>
    JSON.parse(JSON.stringify(publishedForm.sections)),
  );
  const [builderSelectedSectionId, setBuilderSelectedSectionId] =
    useState<SectionSchema["id"]>("basicDetails");
  const [changelogInput, setChangelogInput] = useState("");

  const [newAttrLabel, setNewAttrLabel] = useState("");
  const [newAttrKey, setNewAttrKey] = useState("");
  const [newAttrType, setNewAttrType] = useState<AttributeType>("string");
  const [newAttrOptions, setNewAttrOptions] = useState("");
  const [newAttrDependsKey, setNewAttrDependsKey] = useState("");
  const [newAttrDependsVal, setNewAttrDependsVal] = useState("");

  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    basicDetails: true,
    productPricing: true,
    dapSection: true,
    quoteConfig: true,
    cafSection: true,
  });

  const selectedLead = useMemo(
    () => leads.find((l) => l.id === selectedLeadId) || leads[0],
    [leads, selectedLeadId],
  );

  const [draft, setDraft] = useState<LeadRecord>(selectedLead);

  const handleSelectLead = (lead: LeadRecord) => {
    setSelectedLeadId(lead.id);
    setDraft(lead);
  };

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3800);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const jumpToJunction = (sectionId: string) => {
    setExpandedSections((prev) => ({ ...prev, [sectionId]: true }));
    const el = document.getElementById(`junction-${sectionId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Advanced Search & Filter Pipeline
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      // Age & Pool filters
      if (ageFilter === "POOL" && l.basicDetails.originatorRep) return false;
      if (
        ageFilter === "MY_LEADS" &&
        l.basicDetails.originatorRep !== currentUser.name
      )
        return false;
      if (ageFilter === "THUNDER" && l.createdAtHoursAgo > 1) return false;
      if (
        ageFilter === "FIRE" &&
        (l.createdAtHoursAgo < 6 || l.createdAtHoursAgo >= 12)
      )
        return false;
      if (ageFilter === "WATER" && l.createdAtHoursAgo < 12) return false;

      // Status dropdown filter
      if (statusFilter !== "ALL" && l.basicDetails.leadStatus !== statusFilter)
        return false;

      // Advanced Search Query (Matches Name, Phone, Email, or Lead ID)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = l.basicDetails.customerName.toLowerCase().includes(q);
        const matchPhone = l.basicDetails.phone.toLowerCase().includes(q);
        const matchEmail = l.basicDetails.email.toLowerCase().includes(q);
        const matchId = l.id.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchEmail && !matchId) return false;
      }

      return true;
    });
  }, [leads, ageFilter, currentUser.name, statusFilter, searchQuery]);

  const maxDiscountItem = useMemo(() => {
    return draft.productPricing.reduce(
      (max, item) =>
        item.proposedDiscountPct > max.proposedDiscountPct ? item : max,
      draft.productPricing[0],
    );
  }, [draft.productPricing]);

  const isUnassigned = !draft.basicDetails.originatorRep;
  const isOwnedByOtherRep =
    !isUnassigned &&
    currentUser.role === "REP" &&
    draft.basicDetails.originatorRep !== currentUser.name;

  const isDapRequired =
    maxDiscountItem && maxDiscountItem.proposedDiscountPct > 5;
  const isDapCleared =
    !isDapRequired ||
    draft.dapSection.dapStatus === "Approved by Sales Manager";
  const isCafUnlocked =
    isDapCleared &&
    draft.quoteConfig.quoteVisibility === "Published & Shared with Client" &&
    draft.quoteConfig.clientDecision === "Client Accepted Quote(s)";

  const metroJunctions = useMemo(() => {
    return [
      {
        id: "basicDetails",
        name: "J1: Basic & Call",
        sub:
          draft.basicDetails.calledCustomer !== "No"
            ? "Call Logged"
            : "Webhook Pre-filled",
        status: draft.basicDetails.calledCustomer !== "No" ? "DONE" : "ACTIVE",
      },
      {
        id: "productPricing",
        name: `J2: Product/Price (${draft.productPricing.length})`,
        sub: `Net: $${draft.productPricing.reduce((s, v) => s + v.netPrice, 0).toLocaleString()}`,
        status: draft.productPricing.length > 0 ? "DONE" : "ACTIVE",
      },
      {
        id: "dapSection",
        name: "J3: DAP Approval",
        sub: !isDapRequired
          ? "Bypassed (<=5%)"
          : draft.dapSection.dapStatus === "Approved by Sales Manager"
            ? "Manager Approved"
            : "Pending Manager (>5%)",
        status: !isDapRequired
          ? "BYPASSED"
          : draft.dapSection.dapStatus === "Approved by Sales Manager"
            ? "DONE"
            : "BLOCKED",
      },
      {
        id: "quoteConfig",
        name: "J4: Quote Config",
        sub: !isDapCleared
          ? "Locked by DAP"
          : draft.quoteConfig.quoteVisibility.startsWith("Published")
            ? "Shared w/ Client"
            : "Draft (Rep Only)",
        status: !isDapCleared
          ? "LOCKED"
          : draft.quoteConfig.clientDecision === "Client Accepted Quote(s)"
            ? "DONE"
            : "ACTIVE",
      },
      {
        id: "cafSection",
        name: "J5: Master CAF",
        sub: draft.cafSection.isCafSent
          ? "Dispatched & Won"
          : isCafUnlocked
            ? "Ready to Dispatch"
            : "Awaiting Quote Accept",
        status: draft.cafSection.isCafSent
          ? "DONE"
          : isCafUnlocked
            ? "ACTIVE"
            : "LOCKED",
      },
    ];
  }, [draft, isDapRequired, isDapCleared, isCafUnlocked]);

  const isAttributeVisible = (
    attr: AttributeSchema,
    sectionValues: Record<string, any>,
  ) => {
    if (!attr.dependsOn) return true;
    const targetVal = sectionValues[attr.dependsOn.key];
    if (attr.dependsOn.operator === "equals")
      return targetVal === attr.dependsOn.value;
    if (attr.dependsOn.operator === "notEquals")
      return targetVal !== attr.dependsOn.value;
    if (attr.dependsOn.operator === "greaterThan")
      return Number(targetVal) > Number(attr.dependsOn.value);
    return true;
  };

  const updateSectionField = (
    sectionKey: "basicDetails" | "dapSection" | "quoteConfig" | "cafSection",
    attrKey: string,
    value: any,
  ) => {
    setDraft((prev) => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        [attrKey]: value,
      },
    }));
  };

  const updateProductPricingItem = (
    index: number,
    attrKey: string,
    value: any,
  ) => {
    setDraft((prev) => {
      const updatedList = [...prev.productPricing];
      const current = { ...updatedList[index], [attrKey]: value };
      const { basePrice, netPrice } = calculatePricing(
        current.vehicleModel,
        current.interestedFeatures,
        current.proposedDiscountPct,
      );
      current.basePrice = basePrice;
      current.netPrice = netPrice;
      updatedList[index] = current;

      const highest = updatedList.reduce(
        (m, i) => (i.proposedDiscountPct > m.proposedDiscountPct ? i : m),
        updatedList[0],
      );
      const dapSummary =
        highest.proposedDiscountPct > 5
          ? `${highest.proposedDiscountPct}% Discount on ${highest.vehicleModel} (Net: $${highest.netPrice.toLocaleString()})`
          : "Within 5% Rep Threshold";

      return {
        ...prev,
        productPricing: updatedList,
        dapSection: {
          ...prev.dapSection,
          maxDiscountSummary: dapSummary,
        },
      };
    });
  };

  const handleClaimLead = () => {
    const claimed = mockApi.claimLeadFromPool(draft.id, currentUser.name);
    setDraft(claimed);
    setLeads(mockApi.getLeads());
    triggerToast(`Lead ${draft.id} claimed from pool by ${currentUser.name}!`);
  };

  const handleSimulateWebhookDeduplication = () => {
    const merged = mockApi.simulateIncomingWebhook(draft.id);
    setDraft(merged);
    setLeads(mockApi.getLeads());
    setExpandedSections((prev) => ({ ...prev, productPricing: true }));
    triggerToast(
      "Webhook Received: Duplicate customer detected! Appended 2nd vehicle to Product-Pricing.",
    );
  };

  const cloneProductPricingSection = () => {
    const newVehicle: ProductPricingItem = {
      id: `veh-${Date.now()}`,
      vehicleModel: "2025 BMW 530i M Sport (Sedan)",
      interestedFeatures: [],
      tookTestDrive: "No",
      basePrice: 58000,
      proposedDiscountPct: 0,
      netPrice: 58000,
      source: "REP_CONFIGURED",
    };
    const nextDraft: LeadRecord = {
      ...draft,
      productPricing: [...draft.productPricing, newVehicle],
    };
    const saved = mockApi.saveLead(
      nextDraft,
      "Rep cloned Product-Pricing section: Added vehicle option during discovery call.",
      "SYSTEM_MERGE",
      currentUser.name,
    );
    setDraft(saved);
    setLeads(mockApi.getLeads());
    triggerToast(
      "Cloned Product-Pricing section for multi-vehicle comparison!",
    );
  };

  const removeProductPricingSection = (index: number) => {
    if (draft.productPricing.length <= 1) return;
    const removed = draft.productPricing[index];
    const nextDraft: LeadRecord = {
      ...draft,
      productPricing: draft.productPricing.filter((_, idx) => idx !== index),
    };
    const saved = mockApi.saveLead(
      nextDraft,
      `Removed vehicle option (${removed.vehicleModel}) from Product-Pricing configuration.`,
      "STATUS_CHANGE",
      currentUser.name,
    );
    setDraft(saved);
    setLeads(mockApi.getLeads());
  };

  const handleSaveDynamicForm = () => {
    const summaryParts: string[] = [];
    if (draft.basicDetails.calledCustomer !== "No") {
      summaryParts.push(`Call: ${draft.basicDetails.calledCustomer}`);
    }
    if (draft.basicDetails.callNotes) {
      summaryParts.push(`Notes: "${draft.basicDetails.callNotes}"`);
    }
    if (isDapRequired) {
      summaryParts.push(
        `DAP: ${draft.dapSection.dapStatus} (${maxDiscountItem.proposedDiscountPct}% off)`,
      );
    }
    if (
      draft.quoteConfig.quoteVisibility === "Published & Shared with Client"
    ) {
      summaryParts.push(`Quote: ${draft.quoteConfig.clientDecision}`);
    }

    // Calculate sum of only the selected quote IDs in CAF section!
    const selectedQuotes: string[] = Array.isArray(
      draft.cafSection.selectedQuoteIds,
    )
      ? draft.cafSection.selectedQuoteIds
      : [];
    const matchedVehicles = draft.productPricing.filter(
      (v) =>
        selectedQuotes.includes(v.vehicleModel) || selectedQuotes.length === 0,
    );
    const totalDealValue = matchedVehicles.reduce(
      (acc, v) => acc + v.netPrice,
      0,
    );
    const vehicleNames = matchedVehicles
      .map((v) => `${v.vehicleModel} ($${v.netPrice.toLocaleString()})`)
      .join(" + ");

    const updatedDraft: LeadRecord = {
      ...draft,
      cafSection: {
        ...draft.cafSection,
        consolidatedOrderSummary: `${matchedVehicles.length} Selected Quote(s): ${vehicleNames} | Total Final Order: $${totalDealValue.toLocaleString()}`,
      },
    };

    const logMessage =
      summaryParts.length > 0
        ? `Updated Form (${publishedForm.versionNumber}) — ${summaryParts.join(" | ")}`
        : `Saved Lead & Pricing configuration (${publishedForm.versionNumber}).`;

    const saved = mockApi.saveLead(
      updatedDraft,
      logMessage,
      isDapRequired ? "DAP_EVENT" : "CALL",
      currentUser.name,
    );
    setDraft(saved);
    setLeads(mockApi.getLeads());
    triggerToast(
      `Form saved using active schema ${publishedForm.versionNumber}!`,
    );
  };

  const handleDispatchCaf = () => {
    const selectedQuotes: string[] = Array.isArray(
      draft.cafSection.selectedQuoteIds,
    )
      ? draft.cafSection.selectedQuoteIds
      : [];
    const matchedVehicles = draft.productPricing.filter(
      (v) =>
        selectedQuotes.includes(v.vehicleModel) || selectedQuotes.length === 0,
    );
    const totalDealValue = matchedVehicles.reduce(
      (acc, v) => acc + v.netPrice,
      0,
    );

    const updatedDraft: LeadRecord = {
      ...draft,
      basicDetails: { ...draft.basicDetails, leadStatus: "Converted" },
      cafSection: { ...draft.cafSection, isCafSent: true },
    };
    const saved = mockApi.saveLead(
      updatedDraft,
      `Dispatched Master CAF (${draft.cafSection.cafReferenceId}) bundling ${matchedVehicles.length} quote(s) to ${draft.basicDetails.email} for $${totalDealValue.toLocaleString()}. Deal Won!`,
      "CAF_DISPATCH",
      currentUser.name,
    );
    setDraft(saved);
    setLeads(mockApi.getLeads());
    triggerToast("Master CAF Emailed to Customer & Deal Marked Converted!");
  };

  const handleQuickLogActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNote.trim()) return;
    const saved = mockApi.saveLead(
      draft,
      quickNote.trim(),
      "CALL",
      currentUser.name,
    );
    setDraft(saved);
    setLeads(mockApi.getLeads());
    setQuickNote("");
    triggerToast("Follow-up activity persisted to timeline!");
  };

  // ================= FORM MASTER STUDIO HANDLERS =================
  const selectedBuilderSection = useMemo(
    () =>
      builderSections.find((s) => s.id === builderSelectedSectionId) ||
      builderSections[0],
    [builderSections, builderSelectedSectionId],
  );

  const handleAddCustomAttribute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttrLabel.trim()) return;
    const cleanKey =
      newAttrKey.trim() ||
      newAttrLabel
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_");

    const newAttr: AttributeSchema = {
      key: cleanKey,
      label: newAttrLabel.trim(),
      type: newAttrType,
      options:
        newAttrType === "dropdown" || newAttrType === "multiSelect"
          ? newAttrOptions
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      dependsOn:
        newAttrDependsKey && newAttrDependsVal
          ? {
              key: newAttrDependsKey,
              operator: "equals",
              value: newAttrDependsVal,
            }
          : undefined,
      helperText: "Custom attribute added via Form Master Studio",
    };

    setBuilderSections((prev) =>
      prev.map((sec) =>
        sec.id === builderSelectedSectionId
          ? { ...sec, attributes: [...sec.attributes, newAttr] }
          : sec,
      ),
    );

    setNewAttrLabel("");
    setNewAttrKey("");
    setNewAttrOptions("");
    setNewAttrDependsKey("");
    setNewAttrDependsVal("");
    triggerToast(`Added attribute "${newAttr.label}" to working draft!`);
  };

  const handleRemoveCustomAttribute = (attrKey: string) => {
    setBuilderSections((prev) =>
      prev.map((sec) =>
        sec.id === builderSelectedSectionId
          ? {
              ...sec,
              attributes: sec.attributes.filter((a) => a.key !== attrKey),
            }
          : sec,
      ),
    );
    triggerToast(`Removed attribute "${attrKey}" from working draft.`);
  };

  const handleSaveDraftVersion = () => {
    formMasterStore.saveDraftVersion(
      builderSections,
      changelogInput,
      currentUser.name,
    );
    setFormVersions(formMasterStore.getAllVersions());
    triggerToast("Saved Form Schema as Working Draft.");
  };

  const handlePublishNewVersion = () => {
    const pub = formMasterStore.publishVersion(
      builderSections,
      changelogInput,
      currentUser.name,
    );
    setFormVersions(formMasterStore.getAllVersions());
    setChangelogInput("");
    triggerToast(
      `Published Form ${pub.versionNumber}! Live across all Sales Rep workspaces.`,
    );
  };

  const handleRollbackVersion = (ver: FormVersionRecord) => {
    const activated = formMasterStore.activateHistoricalVersion(ver.versionId);
    setFormVersions(formMasterStore.getAllVersions());
    setBuilderSections(JSON.parse(JSON.stringify(activated.sections)));
    triggerToast(
      `Activated Form Version ${activated.versionNumber} as Live Published Schema!`,
    );
  };

  const renderAttributeControl = (
    attr: AttributeSchema,
    value: any,
    onChange: (val: any) => void,
    disabledOverride = false,
  ) => {
    const isWebhookPrefilled = ["customerName", "phone", "email"].includes(
      attr.key,
    );
    const isReadonly =
      attr.type === "readonly" ||
      disabledOverride ||
      isUnassigned ||
      isOwnedByOtherRep;

    // Special handler for CAF section's quote selection multi-select so options populate dynamically from productPricing!
    if (attr.key === "selectedQuoteIds") {
      const availableVehicles = draft.productPricing.map((v) => v.vehicleModel);
      const selectedList: string[] = Array.isArray(value) ? value : [];
      const toggleQuote = (veh: string) => {
        if (isReadonly) return;
        if (selectedList.includes(veh)) {
          onChange(selectedList.filter((i) => i !== veh));
        } else {
          onChange([...selectedList, veh]);
        }
      };
      return (
        <div className="space-y-1.5 pt-1">
          <p className="text-[10px] text-slate-500">
            Select which quote(s) to include in this CAF order (leaves empty to
            include all):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {availableVehicles.map((veh) => {
              const active = selectedList.includes(veh);
              return (
                <button
                  type="button"
                  key={veh}
                  disabled={isReadonly}
                  onClick={() => toggleQuote(veh)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    active
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {active ? "✓ Selected: " : "+ Add: "} {veh.split("(")[0]}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (attr.type === "dropdown") {
      return (
        <select
          value={value || ""}
          disabled={isReadonly}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-indigo-600 focus:outline-none disabled:bg-slate-100"
        >
          <option value="">-- Select --</option>
          {attr.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    if (attr.type === "multiSelect") {
      const selectedList: string[] = Array.isArray(value) ? value : [];
      const toggleItem = (opt: string) => {
        if (isReadonly) return;
        if (selectedList.includes(opt)) {
          onChange(selectedList.filter((i) => i !== opt));
        } else {
          onChange([...selectedList, opt]);
        }
      };
      return (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {attr.options?.map((opt) => {
            const active = selectedList.includes(opt);
            return (
              <button
                type="button"
                key={opt}
                disabled={isReadonly}
                onClick={() => toggleItem(opt)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  active
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {active ? "✓ " : "+ "}
                {opt}
              </button>
            );
          })}
        </div>
      );
    }

    if (attr.type === "textarea") {
      return (
        <textarea
          rows={2}
          value={value || ""}
          disabled={isReadonly}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-indigo-600 focus:outline-none disabled:bg-slate-100"
          placeholder={`Enter ${attr.label}...`}
        />
      );
    }

    return (
      <input
        type={
          attr.type === "number"
            ? "number"
            : attr.type === "datetime"
              ? "datetime-local"
              : "text"
        }
        value={value ?? ""}
        readOnly={isReadonly || isWebhookPrefilled}
        onChange={(e) =>
          onChange(
            attr.type === "number" ? Number(e.target.value) : e.target.value,
          )
        }
        className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none ${
          isReadonly || isWebhookPrefilled
            ? "border-slate-200 bg-slate-100 font-semibold text-slate-700"
            : "border-slate-300 bg-white text-slate-800 focus:border-indigo-600"
        }`}
      />
    );
  };

  const unassignedCount = leads.filter(
    (l) => !l.basicDetails.originatorRep,
  ).length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 px-5 py-3 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-bold">
            KL
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight">
                Keyloop LeadDesk & CPQ Engine
              </h1>
              <span className="rounded bg-indigo-500/30 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                Schema: {publishedForm.versionNumber}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Advanced Search • Granular CAF Quote Bundling • Form Master
            </p>
          </div>
        </div>

        {activeView === "WORKSPACE" ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setAgeFilter("ALL")}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                ageFilter === "ALL"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              All ({leads.length})
            </button>
            <button
              onClick={() => setAgeFilter("POOL")}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                ageFilter === "POOL"
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-slate-800 text-emerald-400 hover:bg-slate-700"
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Pool ({unassignedCount})</span>
            </button>
            <button
              onClick={() => setAgeFilter("MY_LEADS")}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                ageFilter === "MY_LEADS"
                  ? "bg-indigo-500 text-white"
                  : "bg-slate-800 text-indigo-300 hover:bg-slate-700"
              }`}
            >
              My Leads
            </button>
            <button
              onClick={() => setAgeFilter("THUNDER")}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                ageFilter === "THUNDER"
                  ? "bg-amber-400 text-slate-950"
                  : "bg-slate-800 text-amber-300 hover:bg-slate-700"
              }`}
            >
              <Zap className="h-3.5 w-3.5 fill-current" />
              <span>&lt;1h</span>
            </button>
            <button
              onClick={() => setAgeFilter("FIRE")}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                ageFilter === "FIRE"
                  ? "bg-orange-500 text-white"
                  : "bg-slate-800 text-orange-400 hover:bg-slate-700"
              }`}
            >
              <Flame className="h-3.5 w-3.5 fill-current" />
              <span>6h+</span>
            </button>
            <button
              onClick={() => setAgeFilter("WATER")}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                ageFilter === "WATER"
                  ? "bg-sky-500 text-white"
                  : "bg-slate-800 text-sky-400 hover:bg-slate-700"
              }`}
            >
              <Droplets className="h-3.5 w-3.5 fill-current" />
              <span>12h+</span>
            </button>
          </div>
        ) : (
          <div className="rounded-lg bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300">
            🛠️ Form Master Studio (Schema Versioning)
          </div>
        )}

        <div className="flex items-center gap-2">
          {currentUser.role === "MANAGER" && (
            <button
              onClick={() =>
                setActiveView(
                  activeView === "WORKSPACE" ? "FORM_MASTER" : "WORKSPACE",
                )
              }
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold shadow transition ${
                activeView === "FORM_MASTER"
                  ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                  : "bg-amber-400 text-slate-950 hover:bg-amber-300"
              }`}
            >
              {activeView === "FORM_MASTER" ? (
                <>
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Back to Workspace
                </>
              ) : (
                <>
                  <Settings2 className="h-3.5 w-3.5" />
                  Form Master
                </>
              )}
            </button>
          )}

          <div className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs">
            <Users className="h-3.5 w-3.5 text-indigo-400" />
            <select
              value={currentUser.id}
              onChange={(e) => {
                const found =
                  ACCOUNTS.find((a) => a.id === e.target.value) || ACCOUNTS[0];
                setCurrentUser(found);
                if (found.role !== "MANAGER") setActiveView("WORKSPACE");
                triggerToast(`Switched session to ${found.name}`);
              }}
              className="bg-transparent font-bold text-white focus:outline-none"
            >
              {ACCOUNTS.map((acc) => (
                <option
                  key={acc.id}
                  value={acc.id}
                  className="bg-slate-900 text-white"
                >
                  {acc.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              const resetLeads = mockApi.resetDemoData();
              const resetForms = formMasterStore.resetFormMaster();
              setLeads(resetLeads);
              setDraft(resetLeads[0]);
              setSelectedLeadId(resetLeads[0].id);
              setFormVersions(resetForms);
              setBuilderSections(
                JSON.parse(JSON.stringify(resetForms[0].sections)),
              );
              triggerToast("Reset Leads & Form Master.");
            }}
            className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        </div>
      </header>

      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {toastMsg}
        </div>
      )}

      {/* ================= VIEW 1: FORM MASTER STUDIO ================= */}
      {activeView === "FORM_MASTER" && currentUser.role === "MANAGER" ? (
        <main className="mx-auto grid max-w-[1600px] grid-cols-12 gap-5 p-5">
          <section className="col-span-12 space-y-4 lg:col-span-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Select Form Section
              </h2>
              <div className="mt-3 space-y-2">
                {builderSections.map((sec) => (
                  <button
                    key={sec.id}
                    onClick={() => setBuilderSelectedSectionId(sec.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      builderSelectedSectionId === sec.id
                        ? "border-indigo-600 bg-indigo-50/70 font-bold text-indigo-950"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-xs font-bold">{sec.title}</div>
                    <div className="mt-0.5 text-[11px] text-slate-500">
                      {sec.attributes.length} Attributes
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                <History className="h-3.5 w-3.5 text-indigo-600" />
                Schema Versions ({formVersions.length})
              </h2>
              <div className="mt-3 space-y-2.5">
                {formVersions.map((ver) => (
                  <div
                    key={ver.versionId}
                    className={`rounded-xl border p-3 text-xs ${
                      ver.status === "PUBLISHED"
                        ? "border-emerald-300 bg-emerald-50/60"
                        : ver.status === "DRAFT"
                          ? "border-amber-300 bg-amber-50/60"
                          : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">
                        {ver.versionNumber}
                      </span>
                      <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {ver.status}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-700">
                      {ver.changelog}
                    </p>
                    {ver.status !== "PUBLISHED" && (
                      <button
                        onClick={() => handleRollbackVersion(ver)}
                        className="mt-2 font-bold text-indigo-600 hover:underline"
                      >
                        Activate & Publish
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="col-span-12 lg:col-span-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Section Metadata Editor
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  {selectedBuilderSection.title}
                </h2>
              </div>
              <div className="mt-4 space-y-2.5">
                {selectedBuilderSection.attributes.map((attr) => (
                  <div
                    key={attr.key}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {attr.label}
                        </span>
                        <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-800">
                          {attr.type}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        Key: <code>{attr.key}</code>
                      </div>
                    </div>
                    {!attr.isSystemLocked && (
                      <button
                        onClick={() => handleRemoveCustomAttribute(attr.key)}
                        className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="col-span-12 space-y-4 lg:col-span-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600">
                <PlusCircle className="h-4 w-4" />
                Add Custom Attribute
              </h3>
              <form
                onSubmit={handleAddCustomAttribute}
                className="mt-3 space-y-3"
              >
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Display Label *
                  </label>
                  <input
                    type="text"
                    required
                    value={newAttrLabel}
                    onChange={(e) => setNewAttrLabel(e.target.value)}
                    placeholder="e.g., Trade-In Vehicle Available?"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Type
                    </label>
                    <select
                      value={newAttrType}
                      onChange={(e) =>
                        setNewAttrType(e.target.value as AttributeType)
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
                    >
                      <option value="string">String</option>
                      <option value="number">Number</option>
                      <option value="dropdown">Dropdown</option>
                      <option value="multiSelect">Multi-Select</option>
                      <option value="textarea">Textarea</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      JSON Key
                    </label>
                    <input
                      type="text"
                      value={newAttrKey}
                      onChange={(e) => setNewAttrKey(e.target.value)}
                      placeholder="auto_key"
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                    />
                  </div>
                </div>
                {(newAttrType === "dropdown" ||
                  newAttrType === "multiSelect") && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Options (Comma-separated)
                    </label>
                    <input
                      type="text"
                      required
                      value={newAttrOptions}
                      onChange={(e) => setNewAttrOptions(e.target.value)}
                      placeholder="No, Yes"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full rounded-xl bg-indigo-600 py-2 text-xs font-bold text-white shadow hover:bg-indigo-700"
                >
                  + Append Attribute
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-emerald-300 bg-emerald-50/50 p-5 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                Publish Schema
              </h3>
              <input
                type="text"
                value={changelogInput}
                onChange={(e) => setChangelogInput(e.target.value)}
                placeholder="Release notes..."
                className="mt-3 w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs"
              />
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveDraftVersion}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white py-2 text-xs font-bold text-slate-800"
                >
                  <Save className="h-3.5 w-3.5" /> Save Draft
                </button>
                <button
                  type="button"
                  onClick={handlePublishNewVersion}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white shadow"
                >
                  <Rocket className="h-3.5 w-3.5" /> Publish
                </button>
              </div>
            </div>
          </section>
        </main>
      ) : (
        /* ================= VIEW 2: WORKSPACE (WITH ADVANCED SEARCH & CAF QUOTE SELECTOR) ================= */
        <main className="mx-auto grid max-w-[1650px] grid-cols-12 gap-4 p-4">
          {/* LEFT COLUMN: Advanced Search Bar + Lead Inbox */}
          <section className="col-span-12 space-y-3 lg:col-span-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between pb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Lead Inbox ({filteredLeads.length})
                </h2>
                <button
                  onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                  className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition ${
                    showAdvancedSearch
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <SlidersHorizontal className="h-3 w-3" /> Advanced Search
                </button>
              </div>

              {/* Search Input Bar */}
              <div className="relative mt-1">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, phone, email, ID..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Advanced Search Collapsible Filters */}
              {showAdvancedSearch && (
                <div className="mt-3 space-y-2.5 border-t border-slate-100 pt-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-700">
                      Filter by Lead Lifecycle Status
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="New">New</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Qualified">Qualified</option>
                      <option value="Converted">Converted</option>
                      <option value="Lost">Lost</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2.5">
              {filteredLeads.map((lead) => {
                const isSelected = lead.id === draft.id;
                const inPool = !lead.basicDetails.originatorRep;
                const hasDap = lead.productPricing.some(
                  (p) => p.proposedDiscountPct > 5,
                );

                return (
                  <div
                    key={lead.id}
                    onClick={() => handleSelectLead(lead)}
                    className={`cursor-pointer rounded-xl border p-3.5 transition ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-600"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-indigo-600">
                            {lead.id}
                          </span>
                          {inPool ? (
                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                              POOL
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-slate-500">
                              • {lead.basicDetails.originatorRep.split(" (")[0]}
                            </span>
                          )}
                        </div>
                        <h3 className="mt-0.5 text-sm font-bold text-slate-900">
                          {lead.basicDetails.customerName}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {lead.basicDetails.phone}
                        </p>
                      </div>

                      <div>
                        {lead.createdAtHoursAgo <= 1 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                            <Zap className="h-3 w-3 fill-amber-500" />{" "}
                            {lead.createdAtHoursAgo}h
                          </span>
                        )}
                        {lead.createdAtHoursAgo >= 6 &&
                          lead.createdAtHoursAgo < 12 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-800">
                              <Flame className="h-3 w-3 fill-orange-500" />{" "}
                              {lead.createdAtHoursAgo}h
                            </span>
                          )}
                        {lead.createdAtHoursAgo >= 12 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-800">
                            <Droplets className="h-3 w-3 fill-sky-500" />{" "}
                            {lead.createdAtHoursAgo}h
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                        {lead.basicDetails.leadStatus}
                      </span>
                      <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-800">
                        {lead.productPricing.length} Car(s)
                      </span>
                      {hasDap && (
                        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                          DAP
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* CENTER COLUMN: Metro Line + Collapsible Published Form */}
          <section className="col-span-12 lg:col-span-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                      {draft.id}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                      Owner:{" "}
                      {draft.basicDetails.originatorRep ||
                        "Unassigned (In Pool)"}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900">
                    {draft.basicDetails.customerName} — Consultation Flow
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSimulateWebhookDeduplication}
                    className="flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-800 hover:bg-purple-100"
                  >
                    <Webhook className="h-3.5 w-3.5" />
                    Simulate 2nd Car Webhook
                  </button>

                  {!isUnassigned && !isOwnedByOtherRep && (
                    <button
                      onClick={handleSaveDynamicForm}
                      className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-indigo-700"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Save Form & Log
                    </button>
                  )}
                </div>
              </div>

              {isUnassigned && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3.5">
                  <div>
                    <h3 className="text-xs font-bold text-emerald-950">
                      🎯 Unassigned Pool Lead
                    </h3>
                    <p className="text-xs text-emerald-800">
                      Claim lead from pool to begin configuring quotes.
                    </p>
                  </div>
                  <button
                    onClick={handleClaimLead}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700"
                  >
                    <UserPlus className="h-4 w-4" />
                    Take Up Lead
                  </button>
                </div>
              )}

              <div className="mt-4 grid grid-cols-12 gap-4">
                {/* Metro Line Sidebar */}
                <aside className="col-span-12 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:col-span-4">
                  <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                    <TrainTrack className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Metro Route (5 Junctions)</span>
                  </div>
                  <div className="relative space-y-3 pl-2">
                    {metroJunctions.map((j, idx) => {
                      const isDone = j.status === "DONE";
                      const isBlocked =
                        j.status === "BLOCKED" || j.status === "LOCKED";
                      const isBypassed = j.status === "BYPASSED";

                      return (
                        <div
                          key={j.id}
                          className="relative flex items-start gap-2.5"
                        >
                          {idx < metroJunctions.length - 1 && (
                            <div
                              className={`absolute left-2.5 top-5 h-7 w-0.5 ${isDone ? "bg-emerald-500" : "bg-slate-300"}`}
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => jumpToJunction(j.id)}
                            className={`z-10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition ${
                              isDone
                                ? "bg-emerald-600 text-white"
                                : isBypassed
                                  ? "bg-slate-300 text-slate-600"
                                  : isBlocked
                                    ? "bg-amber-500 text-white"
                                    : "bg-indigo-600 text-white"
                            }`}
                          >
                            {idx + 1}
                          </button>
                          <div
                            onClick={() => jumpToJunction(j.id)}
                            className="cursor-pointer rounded-lg p-1 hover:bg-slate-200/60"
                          >
                            <div className="text-xs font-bold text-slate-900">
                              {j.name}
                            </div>
                            <div
                              className={`text-[11px] font-medium ${isBlocked ? "text-amber-700" : isDone ? "text-emerald-700" : "text-slate-500"}`}
                            >
                              {j.sub}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </aside>

                {/* Collapsible Form Sections */}
                <div className="col-span-12 space-y-3 sm:col-span-8">
                  {publishedForm.sections.map((section: SectionSchema) => {
                    if (section.id === "dapSection" && !isDapRequired)
                      return null;
                    if (section.id === "quoteConfig" && !isDapCleared)
                      return null;
                    if (section.id === "cafSection" && !isCafUnlocked)
                      return null;

                    const isExpanded = !!expandedSections[section.id];

                    if (
                      section.isRepeatable &&
                      section.id === "productPricing"
                    ) {
                      return (
                        <div
                          id={`junction-${section.id}`}
                          key={section.id}
                          className="rounded-xl border border-indigo-200 bg-indigo-50/20"
                        >
                          <div
                            onClick={() => toggleSection(section.id)}
                            className="flex cursor-pointer items-center justify-between p-3.5 hover:bg-indigo-50/50"
                          >
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-indigo-600" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-indigo-600" />
                              )}
                              <div>
                                <h3 className="text-xs font-bold text-slate-900">
                                  {section.title}
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                  {draft.productPricing.length} vehicle(s)
                                  configured
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={isUnassigned || isOwnedByOtherRep}
                              onClick={(e) => {
                                e.stopPropagation();
                                cloneProductPricingSection();
                              }}
                              className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-40"
                            >
                              <CopyPlus className="h-3 w-3" /> + Clone Vehicle
                            </button>
                          </div>

                          {isExpanded && (
                            <div className="space-y-3 border-t border-indigo-100 p-3.5">
                              {draft.productPricing.map((vehicleItem, idx) => (
                                <div
                                  key={vehicleItem.id}
                                  className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm"
                                >
                                  <div className="mb-2.5 flex items-center justify-between border-b border-slate-100 pb-2">
                                    <span className="text-xs font-bold text-indigo-600">
                                      Vehicle #{idx + 1}
                                    </span>
                                    {draft.productPricing.length > 1 &&
                                      !isUnassigned &&
                                      !isOwnedByOtherRep && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            removeProductPricingSection(idx)
                                          }
                                          className="text-[11px] font-medium text-rose-600 hover:text-rose-700"
                                        >
                                          <Trash2 className="h-3 w-3 inline" />{" "}
                                          Remove
                                        </button>
                                      )}
                                  </div>
                                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {section.attributes.map((attr) => {
                                      if (
                                        !isAttributeVisible(attr, vehicleItem)
                                      )
                                        return null;
                                      return (
                                        <div
                                          key={attr.key}
                                          className={
                                            attr.type === "multiSelect"
                                              ? "sm:col-span-2"
                                              : ""
                                          }
                                        >
                                          <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                                            {attr.label}
                                          </label>
                                          {renderAttributeControl(
                                            attr,
                                            (vehicleItem as any)[attr.key],
                                            (val) =>
                                              updateProductPricingItem(
                                                idx,
                                                attr.key,
                                                val,
                                              ),
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }

                    const sectionState = (draft as any)[section.id] || {};
                    const isDapSection = section.id === "dapSection";
                    const isCafSection = section.id === "cafSection";

                    return (
                      <div
                        id={`junction-${section.id}`}
                        key={section.id}
                        className={`rounded-xl border ${isDapSection ? "border-amber-300 bg-amber-50/40" : isCafSection ? "border-emerald-300 bg-emerald-50/30" : "border-slate-200 bg-white"}`}
                      >
                        <div
                          onClick={() => toggleSection(section.id)}
                          className="flex cursor-pointer items-center justify-between p-3.5 hover:bg-slate-50/80"
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-slate-600" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-slate-600" />
                            )}
                            <div>
                              <h3 className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                                {isDapSection && (
                                  <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                                )}
                                {isCafSection && (
                                  <FileCheck2 className="h-3.5 w-3.5 text-emerald-600" />
                                )}
                                {section.title}
                              </h3>
                              <p className="text-[11px] text-slate-500">
                                {section.subtitle}
                              </p>
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-slate-100 p-3.5">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              {section.attributes.map((attr) => {
                                if (!isAttributeVisible(attr, sectionState))
                                  return null;
                                const lockDapDecision =
                                  isDapSection &&
                                  attr.key === "dapStatus" &&
                                  currentUser.role !== "MANAGER";

                                return (
                                  <div
                                    key={attr.key}
                                    className={
                                      attr.type === "textarea" ||
                                      attr.key === "consolidatedOrderSummary" ||
                                      attr.key === "selectedQuoteIds"
                                        ? "sm:col-span-2"
                                        : ""
                                    }
                                  >
                                    <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                                      {attr.label}
                                    </label>
                                    {renderAttributeControl(
                                      attr,
                                      sectionState[attr.key],
                                      (val) =>
                                        updateSectionField(
                                          section.id as any,
                                          attr.key,
                                          val,
                                        ),
                                      lockDapDecision,
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {isCafSection && (
                              <div className="mt-4 flex items-center justify-between border-t border-emerald-200 pt-3">
                                <span className="text-xs font-medium text-emerald-900">
                                  {draft.cafSection.isCafSent
                                    ? "✅ Master CAF emailed & Deal Closed."
                                    : "Ready to dispatch."}
                                </span>
                                <button
                                  type="button"
                                  onClick={handleDispatchCaf}
                                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-700"
                                >
                                  <Send className="h-3.5 w-3.5" />{" "}
                                  {draft.cafSection.isCafSent
                                    ? "Resend CAF"
                                    : "Email Master CAF"}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* RIGHT COLUMN: Follow-Up Activity Logger & Timeline */}
          <section className="col-span-12 space-y-4 lg:col-span-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <PhoneCall className="h-3.5 w-3.5 text-indigo-600" />
                Follow-Up Activity Logger
              </h2>
              <form
                onSubmit={handleQuickLogActivity}
                className="mt-2.5 space-y-2"
              >
                <textarea
                  rows={2}
                  disabled={isUnassigned || isOwnedByOtherRep}
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder={
                    isUnassigned
                      ? "Claim lead first..."
                      : "Log follow-up note..."
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none disabled:bg-slate-100"
                />
                <button
                  type="submit"
                  disabled={isUnassigned || isOwnedByOtherRep}
                  className="w-full rounded-lg bg-slate-900 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-40"
                >
                  + Log Activity
                </button>
              </form>

              <div className="mt-4 border-t border-slate-100 pt-3">
                <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Clock className="h-3.5 w-3.5" /> Timeline (
                  {draft.activities.length})
                </h3>
                <div className="mt-3 max-h-[540px] space-y-2.5 overflow-y-auto pr-1">
                  {draft.activities.map((act) => (
                    <div
                      key={act.id}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs"
                    >
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                        <span className="flex items-center gap-1 text-indigo-600">
                          <UserCheck className="h-3 w-3" /> {act.actor}
                        </span>
                        <span>{act.timestamp}</span>
                      </div>
                      <p className="mt-1 font-medium text-slate-800">
                        {act.summary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}
