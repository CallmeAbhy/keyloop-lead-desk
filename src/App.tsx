// src/App.tsx
import React, { useState, useMemo } from "react";
import {
  Zap,
  Flame,
  Droplets,
  Plus,
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
} from "lucide-react";
// Replace lines 18-26 in src/App.tsx with this:
import {
  LEAD_DYNAMIC_FORM_SCHEMA,
  type AttributeSchema,
} from "./schema/formSchema";
import {
  mockApi,
  calculatePricing,
  type LeadRecord,
  type ProductPricingItem,
} from "./api/mockBackend";

export default function App() {
  const [leads, setLeads] = useState<LeadRecord[]>(() => mockApi.getLeads());
  const [selectedLeadId, setSelectedLeadId] = useState<string>(leads[0].id);
  const [ageFilter, setAgeFilter] = useState<
    "ALL" | "THUNDER" | "FIRE" | "WATER"
  >("ALL");
  const [activeRole, setActiveRole] = useState<"REP" | "MANAGER">("REP");
  const [quickNote, setQuickNote] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const selectedLead = useMemo(
    () => leads.find((l) => l.id === selectedLeadId) || leads[0],
    [leads, selectedLeadId],
  );

  // Local editable form state synced with selectedLead
  const [draft, setDraft] = useState<LeadRecord>(selectedLead);

  const handleSelectLead = (lead: LeadRecord) => {
    setSelectedLeadId(lead.id);
    setDraft(lead);
  };

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Filter leads by ⚡ (<1h), 🔥 (>=6h), 💧 (>=12h)
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (ageFilter === "THUNDER") return l.createdAtHoursAgo <= 1;
      if (ageFilter === "FIRE")
        return l.createdAtHoursAgo >= 6 && l.createdAtHoursAgo < 12;
      if (ageFilter === "WATER") return l.createdAtHoursAgo >= 12;
      return true;
    });
  }, [leads, ageFilter]);

  // Dynamic Section Dependency Calculations
  const maxDiscountItem = useMemo(() => {
    return draft.productPricing.reduce(
      (max, item) =>
        item.proposedDiscountPct > max.proposedDiscountPct ? item : max,
      draft.productPricing[0],
    );
  }, [draft.productPricing]);

  const isDapRequired =
    maxDiscountItem && maxDiscountItem.proposedDiscountPct > 5;
  const isDapCleared =
    !isDapRequired ||
    draft.dapSection.dapStatus === "Approved by Sales Manager";
  const isCafUnlocked =
    isDapCleared &&
    draft.quoteConfig.quoteVisibility === "Published & Shared with Client" &&
    draft.quoteConfig.clientDecision === "Client Accepted Quote(s)";

  // Attribute-level dependency evaluator
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

  // Update non-repeatable section attribute
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

  // Update repeatable Product-Pricing section item & recalculate price/DAP
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

  // Clone / Append Product-Pricing Section (Solves Cross-Shopping Duplicate Lead Case)
  const cloneProductPricingSection = () => {
    const newVehicle: ProductPricingItem = {
      id: `veh-${Date.now()}`,
      vehicleModel: "2025 BMW 530i M Sport (Sedan)",
      interestedFeatures: [],
      tookTestDrive: "No",
      basePrice: 58000,
      proposedDiscountPct: 0,
      netPrice: 58000,
    };
    const nextDraft: LeadRecord = {
      ...draft,
      productPricing: [...draft.productPricing, newVehicle],
    };
    const saved = mockApi.saveLead(
      nextDraft,
      "Cloned Product-Pricing section: Added 2nd vehicle option for customer cross-shopping comparison.",
      "SYSTEM_MERGE",
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
    );
    setDraft(saved);
    setLeads(mockApi.getLeads());
  };

  // Persist Dynamic Form & Automatically Append Chronological Activity Event
  const handleSaveDynamicForm = () => {
    const summaryParts: string[] = [];
    if (draft.basicDetails.calledCustomer !== "No") {
      summaryParts.push(`Call Status: ${draft.basicDetails.calledCustomer}`);
    }
    if (draft.basicDetails.callNotes) {
      summaryParts.push(`Notes: "${draft.basicDetails.callNotes}"`);
    }
    if (isDapRequired) {
      summaryParts.push(
        `DAP Status: ${draft.dapSection.dapStatus} (${maxDiscountItem.proposedDiscountPct}% off)`,
      );
    }
    if (
      draft.quoteConfig.quoteVisibility === "Published & Shared with Client"
    ) {
      summaryParts.push(`Quote Shared (${draft.quoteConfig.clientDecision})`);
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
        consolidatedOrderSummary: `${draft.productPricing.length} Vehicle(s): ${vehicleNames} | Total Final Deal: $${totalDealValue.toLocaleString()}`,
      },
    };

    const logMessage =
      summaryParts.length > 0
        ? `Saved Lead Form — ${summaryParts.join(" | ")}`
        : `Updated Lead & Pricing configuration (${draft.productPricing.length} vehicle option[s]).`;

    const saved = mockApi.saveLead(
      updatedDraft,
      logMessage,
      isDapRequired ? "DAP_EVENT" : "CALL",
    );
    setDraft(saved);
    setLeads(mockApi.getLeads());
    triggerToast("Form saved & logged to Chronological Activity Timeline!");
  };

  // Dispatch Final Singleton CAF to Client
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
      `Dispatched Final CAF (${draft.cafSection.cafReferenceId}) to ${draft.basicDetails.email} for $${totalDealValue.toLocaleString()}. Deal Won!`,
      "CAF_DISPATCH",
    );
    setDraft(saved);
    setLeads(mockApi.getLeads());
    triggerToast("Final CAF Emailed to Customer & Deal Marked Converted!");
  };

  // Direct Quick Follow-Up Activity Logger (Explicit Keyloop Requirement #3)
  const handleQuickLogActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNote.trim()) return;
    const saved = mockApi.saveLead(draft, quickNote.trim(), "CALL");
    setDraft(saved);
    setLeads(mockApi.getLeads());
    setQuickNote("");
    triggerToast("Follow-up activity persisted to timeline!");
  };

  // Generic Dynamic Attribute Input Renderer
  const renderAttributeControl = (
    attr: AttributeSchema,
    value: any,
    onChange: (val: any) => void,
    disabledOverride = false,
  ) => {
    const isReadonly = attr.type === "readonly" || disabledOverride;

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
        readOnly={isReadonly}
        onChange={(e) =>
          onChange(
            attr.type === "number" ? Number(e.target.value) : e.target.value,
          )
        }
        className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none ${
          isReadonly
            ? "border-slate-200 bg-slate-100 font-semibold text-slate-700"
            : "border-slate-300 bg-white text-slate-800 focus:border-indigo-600"
        }`}
      />
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Bar with ⚡ Thunder (<1h), 🔥 Fire (>=6h), 💧 Water (>=12h) Icons */}
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-3 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-bold">
            KL
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight">
              Keyloop LeadDesk & CPQ Engine
            </h1>
            <p className="text-xs text-slate-400">
              Metadata-Driven Dynamic Form • Multi-Vehicle Deduplication • DAP
            </p>
          </div>
        </div>

        {/* SLA Urgency Icon Bar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAgeFilter("ALL")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              ageFilter === "ALL"
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            All Leads ({leads.length})
          </button>
          <button
            onClick={() => setAgeFilter("THUNDER")}
            title="Leads created < 1 hour ago"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              ageFilter === "THUNDER"
                ? "bg-amber-400 text-slate-950 shadow-sm"
                : "bg-slate-800 text-amber-300 hover:bg-slate-700"
            }`}
          >
            <Zap className="h-4 w-4 fill-current" />
            <span>&lt; 1h Fresh</span>
          </button>
          <button
            onClick={() => setAgeFilter("FIRE")}
            title="Leads created >= 6 hours ago"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              ageFilter === "FIRE"
                ? "bg-orange-500 text-white shadow-sm"
                : "bg-slate-800 text-orange-400 hover:bg-slate-700"
            }`}
          >
            <Flame className="h-4 w-4 fill-current" />
            <span>6h+ Urgent</span>
          </button>
          <button
            onClick={() => setAgeFilter("WATER")}
            title="Leads created >= 12 hours ago"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              ageFilter === "WATER"
                ? "bg-sky-500 text-white shadow-sm"
                : "bg-slate-800 text-sky-400 hover:bg-slate-700"
            }`}
          >
            <Droplets className="h-4 w-4 fill-current" />
            <span>12h+ Cold</span>
          </button>
        </div>

        {/* Role Toggle for Live DAP Approval Demo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg bg-slate-800 p-1 text-xs">
            <button
              onClick={() => setActiveRole("REP")}
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                activeRole === "REP"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400"
              }`}
            >
              Rep View
            </button>
            <button
              onClick={() => setActiveRole("MANAGER")}
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                activeRole === "MANAGER"
                  ? "bg-emerald-600 text-white"
                  : "text-slate-400"
              }`}
            >
              Sales Manager (DAP)
            </button>
          </div>
          <button
            onClick={() => {
              const reset = mockApi.resetDemoData();
              setLeads(reset);
              setDraft(reset[0]);
              setSelectedLeadId(reset[0].id);
              triggerToast("Demo data reset to initial state.");
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

      {/* Main 3-Column Dealership Workspace */}
      <main className="mx-auto grid max-w-[1600px] grid-cols-12 gap-5 p-5">
        {/* LEFT COLUMN (3 cols): Lead Inbox Cards */}
        <section className="col-span-12 space-y-3 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Incoming Lead Inbox ({filteredLeads.length})
            </h2>
          </div>

          {filteredLeads.map((lead) => {
            const isSelected = lead.id === draft.id;
            const hasDap = lead.productPricing.some(
              (p) => p.proposedDiscountPct > 5,
            );
            return (
              <div
                key={lead.id}
                onClick={() => handleSelectLead(lead)}
                className={`cursor-pointer rounded-xl border p-4 transition all ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-50/60 shadow-sm ring-1 ring-indigo-600"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-indigo-600">
                      {lead.id}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      {lead.basicDetails.customerName}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {lead.basicDetails.phone}
                    </p>
                  </div>
                  {/* Urgency Icon Badge */}
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

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                    {lead.basicDetails.leadStatus}
                  </span>
                  {lead.productPricing.length > 1 && (
                    <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-800">
                      Comparing {lead.productPricing.length} Cars
                    </span>
                  )}
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

        {/* CENTER COLUMN (6 cols): The Single Configurable Dynamic Form Engine */}
        <section className="col-span-12 space-y-5 lg:col-span-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Configurable Form Engine (Form → Section → Attribute)
                </span>
                <h2 className="text-lg font-bold text-slate-900">
                  {draft.basicDetails.customerName} — Dealership Consultation
                  Flow
                </h2>
              </div>
              <button
                onClick={handleSaveDynamicForm}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-indigo-700"
              >
                <CheckCircle2 className="h-4 w-4" />
                Save Form & Log Progress
              </button>
            </div>

            <div className="mt-5 space-y-6">
              {LEAD_DYNAMIC_FORM_SCHEMA.map((section) => {
                // Section-level conditional mounting rules
                if (section.id === "dapSection" && !isDapRequired) return null;
                if (section.id === "quoteConfig" && !isDapCleared) return null;
                if (section.id === "cafSection" && !isCafUnlocked) return null;

                // Render Repeatable Section (Product-Pricing Details)
                if (section.isRepeatable && section.id === "productPricing") {
                  return (
                    <div
                      key={section.id}
                      className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">
                            {section.title}
                          </h3>
                          <p className="text-xs text-slate-500">
                            {section.subtitle}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={cloneProductPricingSection}
                          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
                        >
                          <CopyPlus className="h-3.5 w-3.5" />+ Clone Vehicle
                          Option (Cross-Shopping)
                        </button>
                      </div>

                      <div className="space-y-4">
                        {draft.productPricing.map((vehicleItem, idx) => (
                          <div
                            key={vehicleItem.id}
                            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                          >
                            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                                Vehicle Option #{idx + 1}
                              </span>
                              {draft.productPricing.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeProductPricingSection(idx)
                                  }
                                  className="flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Remove
                                  Option
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">
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
                                    {attr.helperText && (
                                      <p className="mt-1 text-[11px] text-slate-500">
                                        {attr.helperText}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                // Render Standard / Conditionally Appended Singleton Sections
                const sectionState = (draft as any)[section.id] || {};
                const isDapSection = section.id === "dapSection";
                const isCafSection = section.id === "cafSection";

                return (
                  <div
                    key={section.id}
                    className={`rounded-xl border p-4 ${
                      isDapSection
                        ? "border-amber-300 bg-amber-50/50"
                        : isCafSection
                          ? "border-emerald-300 bg-emerald-50/40"
                          : "border-slate-200 bg-slate-50/50"
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                          {isDapSection && (
                            <ShieldAlert className="h-4 w-4 text-amber-600" />
                          )}
                          {isCafSection && (
                            <FileCheck2 className="h-4 w-4 text-emerald-600" />
                          )}
                          {section.title}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {section.subtitle}
                        </p>
                      </div>
                      {isDapSection && (
                        <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                          {activeRole === "MANAGER"
                            ? "Manager Approval Mode Unlocked"
                            : "Rep View"}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {section.attributes.map((attr) => {
                        if (!isAttributeVisible(attr, sectionState))
                          return null;
                        const lockDapDecision =
                          isDapSection &&
                          attr.key === "dapStatus" &&
                          activeRole !== "MANAGER";

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
                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                              {attr.label}
                              {lockDapDecision && (
                                <span className="ml-1 text-[11px] font-normal text-amber-700">
                                  (Switch top bar to Sales Manager to approve)
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
                            {attr.helperText && (
                              <p className="mt-1 text-[11px] text-slate-500">
                                {attr.helperText}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Singleton Final CAF Dispatch Action Button */}
                    {isCafSection && (
                      <div className="mt-4 flex items-center justify-between border-t border-emerald-200 pt-3">
                        <span className="text-xs font-medium text-emerald-900">
                          {draft.cafSection.isCafSent
                            ? "✅ Master CAF has been emailed to the client and deal is closed."
                            : "Ready to generate & email consolidated CAF for all accepted vehicles."}
                        </span>
                        <button
                          type="button"
                          onClick={handleDispatchCaf}
                          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700"
                        >
                          <Send className="h-3.5 w-3.5" />
                          {draft.cafSection.isCafSent
                            ? "Resend Final CAF"
                            : "Email Final CAF to Client"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Helper Banners when downstream sections are waiting on dependencies */}
              {!isDapCleared && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                  🔒 <strong>Section 4 (Quote Config) Locked:</strong> Discount
                  exceeds 5% Rep authority. Switch to{" "}
                  <strong>Sales Manager (DAP)</strong> in the top bar and set
                  DAP Status to <em>"Approved by Sales Manager"</em> to unlock
                  Quote Configuration.
                </div>
              )}
              {isDapCleared && !isCafUnlocked && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-900">
                  ℹ️ <strong>To Unlock Section 5 (Final CAF):</strong> In
                  Section 4, set Quote Publication State to{" "}
                  <em>"Published & Shared with Client"</em> and Client Decision
                  to <em>"Client Accepted Quote(s)"</em>.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN (3 cols): Persistent Chronological Activity Timeline (Core Requirement #2 & #3) */}
        <section className="col-span-12 space-y-4 lg:col-span-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <PhoneCall className="h-3.5 w-3.5 text-indigo-600" />
              Quick Follow-Up Logger
            </h2>
            <form onSubmit={handleQuickLogActivity} className="mt-3 space-y-2">
              <textarea
                rows={2}
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                placeholder="Log immediate activity (e.g., Called customer, confirmed Saturday test drive)..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-600 focus:outline-none"
              />
              <button
                type="submit"
                className="w-full rounded-lg bg-slate-900 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                + Log Follow-Up Activity
              </button>
            </form>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                Chronological Activity Log ({draft.activities.length})
              </h3>

              <div className="mt-3 space-y-3">
                {draft.activities.map((act) => (
                  <div
                    key={act.id}
                    className="relative rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs"
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
