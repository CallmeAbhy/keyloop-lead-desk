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
  Lock,
  Users,
} from "lucide-react";
import {
  LEAD_DYNAMIC_FORM_SCHEMA,
  type AttributeSchema,
  type SectionSchema,
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
  const [currentUser, setCurrentUser] = useState<UserAccount>(ACCOUNTS[0]);
  const [quickNote, setQuickNote] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Collapsible Section State (Metro Line clicking expands and scrolls to section)
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

  // Filter leads by Pool, My Leads, or ⚡ (<1h), 🔥 (>=6h), 💧 (>=12h)
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (ageFilter === "POOL") return !l.basicDetails.originatorRep;
      if (ageFilter === "MY_LEADS")
        return l.basicDetails.originatorRep === currentUser.name;
      if (ageFilter === "THUNDER") return l.createdAtHoursAgo <= 1;
      if (ageFilter === "FIRE")
        return l.createdAtHoursAgo >= 6 && l.createdAtHoursAgo < 12;
      if (ageFilter === "WATER") return l.createdAtHoursAgo >= 12;
      return true;
    });
  }, [leads, ageFilter, currentUser.name]);

  // Dynamic Section Dependency Calculations
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

  // Metro Line Virtual Junctions Computation
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
        visible: true,
      },
      {
        id: "productPricing",
        name: `J2: Product/Price (${draft.productPricing.length})`,
        sub: `Net: $${draft.productPricing.reduce((s, v) => s + v.netPrice, 0).toLocaleString()}`,
        status: draft.productPricing.length > 0 ? "DONE" : "ACTIVE",
        visible: true,
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
        visible: true,
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
        visible: true,
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
        visible: true,
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

  // Claim Unassigned Lead from Pool
  const handleClaimLead = () => {
    const claimed = mockApi.claimLeadFromPool(draft.id, currentUser.name);
    setDraft(claimed);
    setLeads(mockApi.getLeads());
    triggerToast(`Lead ${draft.id} claimed from pool by ${currentUser.name}!`);
  };

  // Simulate Customer Submitting 2nd Vehicle on Website Webhook
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

    const totalDealValue = draft.productPricing.reduce(
      (acc, v) => acc + v.netPrice,
      0,
    );
    const vehicleNames = draft.productPricing
      .map((v) => `${v.vehicleModel} ($${v.netPrice.toLocaleString()})`)
      .join(" + ");

    const updatedDraft: LeadRecord = {
      ...draft,
      cafSection: {
        ...draft.cafSection,
        consolidatedOrderSummary: `${draft.productPricing.length} Vehicle(s): ${vehicleNames} | Total Deal Value: $${totalDealValue.toLocaleString()}`,
      },
    };

    const logMessage =
      summaryParts.length > 0
        ? `Updated Form — ${summaryParts.join(" | ")}`
        : `Saved Lead & Pricing configuration (${draft.productPricing.length} vehicle[s]).`;

    const saved = mockApi.saveLead(
      updatedDraft,
      logMessage,
      isDapRequired ? "DAP_EVENT" : "CALL",
      currentUser.name,
    );
    setDraft(saved);
    setLeads(mockApi.getLeads());
    triggerToast("Form saved & logged to Chronological Activity Timeline!");
  };

  const handleDispatchCaf = () => {
    const totalDealValue = draft.productPricing.reduce(
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
      `Dispatched Master CAF (${draft.cafSection.cafReferenceId}) to ${draft.basicDetails.email} for $${totalDealValue.toLocaleString()}. Deal Won!`,
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

  const renderAttributeControl = (
    attr: AttributeSchema,
    value: any,
    onChange: (val: any) => void,
    disabledOverride = false,
  ) => {
    // Customer Name, Phone, Email in Basic Details are pre-filled by Webhook (Read-only badge)
    const isWebhookPrefilled = ["customerName", "phone", "email"].includes(
      attr.key,
    );
    const isReadonly =
      attr.type === "readonly" ||
      disabledOverride ||
      isUnassigned ||
      isOwnedByOtherRep;

    if (attr.type === "dropdown") {
      return (
        <select
          value={value || ""}
          disabled={isReadonly}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-indigo-600 focus:outline-none disabled:bg-slate-100"
        >
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
      {/* Top Bar with ⚡ Thunder (<1h), 🔥 Fire (>=6h), 💧 Water (>=12h), Pool Filter & Account Switcher */}
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 px-5 py-3 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-bold">
            KL
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">
              Keyloop LeadDesk & CPQ Metro Engine
            </h1>
            <p className="text-[11px] text-slate-400">
              Webhook Deduplication • Lead Pool Claiming • 5-Junction
              Collapsible Form
            </p>
          </div>
        </div>

        {/* SLA & Pool Filters */}
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
            <span>Unassigned Pool ({unassignedCount})</span>
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

        {/* Multi-Rep & Manager Session Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs">
            <Users className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-slate-400">Logged in:</span>
            <select
              value={currentUser.id}
              onChange={(e) => {
                const found =
                  ACCOUNTS.find((a) => a.id === e.target.value) || ACCOUNTS[0];
                setCurrentUser(found);
                triggerToast(`Switched active session to ${found.name}`);
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
              const reset = mockApi.resetDemoData();
              setLeads(reset);
              setDraft(reset[0]);
              setSelectedLeadId(reset[0].id);
              triggerToast("Demo database reset to initial state.");
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

      {/* Main 12-Column Workspace: Inbox (3) + Metro Line & Collapsible Form (6) + Activity Log (3) */}
      <main className="mx-auto grid max-w-[1650px] grid-cols-12 gap-4 p-4">
        {/* LEFT COLUMN (3 cols): Lead Inbox & Pool */}
        <section className="col-span-12 space-y-2.5 lg:col-span-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Lead Inbox ({filteredLeads.length})
            </h2>
          </div>

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
                          UNASSIGNED POOL
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
                    {lead.productPricing.length} Vehicle(s)
                  </span>
                  {hasDap && (
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                      DAP: {lead.dapSection.dapStatus.split(" ")[0]}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* CENTER COLUMN (6 cols): Metro Line Sidebar + Collapsible Dynamic Form */}
        <section className="col-span-12 lg:col-span-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            {/* Lead Header + Webhook & Pool Claim Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    {draft.id}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                    Owner:{" "}
                    {draft.basicDetails.originatorRep || "Unassigned (In Pool)"}
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  {draft.basicDetails.customerName} — Dealership Consultation
                  Flow
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSimulateWebhookDeduplication}
                  title="Simulates customer submitting a 2nd vehicle inquiry on the website"
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

            {/* Pool Claim Banner if Unassigned */}
            {isUnassigned && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3.5">
                <div>
                  <h3 className="text-xs font-bold text-emerald-950">
                    🎯 Unassigned Pool Lead (Pre-filled from Website Webhook)
                  </h3>
                  <p className="text-xs text-emerald-800">
                    This lead has no assigned Sales Rep. Claim it to lock
                    ownership and begin configuring quotes.
                  </p>
                </div>
                <button
                  onClick={handleClaimLead}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700"
                >
                  <UserPlus className="h-4 w-4" />
                  Take Up Lead as {currentUser.name.split(" (")[0]}
                </button>
              </div>
            )}

            {/* Read-only lock banner if owned by another Sales Rep */}
            {isOwnedByOtherRep && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                <Lock className="h-4 w-4 text-rose-600" />
                <span>
                  <strong>Locked to {draft.basicDetails.originatorRep}:</strong>{" "}
                  You are currently logged in as{" "}
                  <strong>{currentUser.name}</strong>. Switch account in the top
                  bar to edit this lead.
                </span>
              </div>
            )}

            {/* Split Grid Inside Center Card: Metro Line Sidebar (3 cols) + Collapsible Form Sections (9 cols) */}
            <div className="mt-4 grid grid-cols-12 gap-4">
              {/* METRO LINE SIDEBAR (5 Virtual Junctions) */}
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
                        {/* Vertical Connector Track */}
                        {idx < metroJunctions.length - 1 && (
                          <div
                            className={`absolute left-2.5 top-5 h-7 w-0.5 ${
                              isDone ? "bg-emerald-500" : "bg-slate-300"
                            }`}
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
                                  : "bg-indigo-600 text-white ring-2 ring-indigo-200"
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
                            className={`text-[11px] font-medium ${
                              isBlocked
                                ? "text-amber-700"
                                : isDone
                                  ? "text-emerald-700"
                                  : "text-slate-500"
                            }`}
                          >
                            {j.sub}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </aside>

              {/* COLLAPSIBLE DYNAMIC FORM SECTIONS */}
              <div className="col-span-12 space-y-3 sm:col-span-8">
                {LEAD_DYNAMIC_FORM_SCHEMA.map((section: SectionSchema) => {
                  if (section.id === "dapSection" && !isDapRequired)
                    return null;
                  if (section.id === "quoteConfig" && !isDapCleared)
                    return null;
                  if (section.id === "cafSection" && !isCafUnlocked)
                    return null;

                  const isExpanded = !!expandedSections[section.id];

                  // Repeatable Section: Product-Pricing Details
                  if (section.isRepeatable && section.id === "productPricing") {
                    return (
                      <div
                        id={`junction-${section.id}`}
                        key={section.id}
                        className="rounded-xl border border-indigo-200 bg-indigo-50/20"
                      >
                        {/* Collapsible Header */}
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
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-indigo-600">
                                      Vehicle #{idx + 1}
                                    </span>
                                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                      {vehicleItem.source === "CUSTOMER_WEBHOOK"
                                        ? "🌐 Selected by User via Webhook"
                                        : "👤 Added by Rep"}
                                    </span>
                                  </div>

                                  {draft.productPricing.length > 1 &&
                                    !isUnassigned &&
                                    !isOwnedByOtherRep && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeProductPricingSection(idx)
                                        }
                                        className="flex items-center gap-1 text-[11px] font-medium text-rose-600 hover:text-rose-700"
                                      >
                                        <Trash2 className="h-3 w-3" /> Remove
                                      </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  {section.attributes.map((attr) => {
                                    if (!isAttributeVisible(attr, vehicleItem))
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

                  // Non-Repeatable Collapsible Sections
                  const sectionState = (draft as any)[section.id] || {};
                  const isDapSection = section.id === "dapSection";
                  const isCafSection = section.id === "cafSection";

                  return (
                    <div
                      id={`junction-${section.id}`}
                      key={section.id}
                      className={`rounded-xl border ${
                        isDapSection
                          ? "border-amber-300 bg-amber-50/40"
                          : isCafSection
                            ? "border-emerald-300 bg-emerald-50/30"
                            : "border-slate-200 bg-white"
                      }`}
                    >
                      {/* Collapsible Section Header */}
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

                        {section.id === "basicDetails" && (
                          <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                            Webhook Pre-filled
                          </span>
                        )}
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
                                    attr.key === "consolidatedOrderSummary"
                                      ? "sm:col-span-2"
                                      : ""
                                  }
                                >
                                  <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                                    {attr.label}
                                    {[
                                      "customerName",
                                      "phone",
                                      "email",
                                    ].includes(attr.key) && (
                                      <span className="ml-1 text-[10px] font-normal text-indigo-600">
                                        (Webhook Verified)
                                      </span>
                                    )}
                                    {lockDapDecision && (
                                      <span className="ml-1 text-[10px] font-normal text-amber-700">
                                        (Switch account to Rajesh Singh
                                        [Manager] to approve)
                                      </span>
                                    )}
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
                                  ? "✅ Master CAF emailed to client & Deal Closed."
                                  : "Singleton CAF ready to dispatch."}
                              </span>
                              <button
                                type="button"
                                onClick={handleDispatchCaf}
                                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-700"
                              >
                                <Send className="h-3.5 w-3.5" />
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

        {/* RIGHT COLUMN (3 cols): Persistent Chronological Activity Timeline */}
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
                    ? "Claim lead from pool first to log activities..."
                    : "Log follow-up note (e.g., Called customer)..."
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none disabled:bg-slate-100"
              />
              <button
                type="submit"
                disabled={isUnassigned || isOwnedByOtherRep}
                className="w-full rounded-lg bg-slate-900 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-40"
              >
                + Log Follow-Up Activity
              </button>
            </form>

            <div className="mt-4 border-t border-slate-100 pt-3">
              <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                Chronological Activity Log ({draft.activities.length})
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
    </div>
  );
}
