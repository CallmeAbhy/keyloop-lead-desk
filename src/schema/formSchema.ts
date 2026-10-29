// src/schema/formSchema.ts

export type AttributeType =
  | "string"
  | "number"
  | "textarea"
  | "dropdown"
  | "multiSelect"
  | "datetime"
  | "readonly";

export interface AttributeSchema {
  key: string;
  label: string;
  type: AttributeType;
  options?: string[];
  required?: boolean;
  isSystemLocked?: boolean; // Protects core pricing/DAP trigger fields from accidental deletion
  dependsOn?: {
    key: string;
    operator: "equals" | "notEquals" | "greaterThan";
    value: any;
  };
  helperText?: string;
}

export interface SectionSchema {
  id:
    | "basicDetails"
    | "productPricing"
    | "dapSection"
    | "quoteConfig"
    | "cafSection";
  title: string;
  subtitle: string;
  isRepeatable: boolean;
  roleVisibility?: "ALL" | "REP_AND_MANAGER";
  attributes: AttributeSchema[];
}

export interface FormVersionRecord {
  versionId: string;
  versionNumber: string; // e.g., "v1.0", "v1.1"
  status: "PUBLISHED" | "DRAFT" | "ARCHIVED";
  updatedAt: string;
  updatedBy: string;
  changelog: string;
  sections: SectionSchema[];
}

export const VEHICLE_CATALOG: Record<string, number> = {
  "2025 BMW X5 xDrive40i (SUV)": 65000,
  "2025 BMW 530i M Sport (Sedan)": 58000,
  "2025 Audi Q7 Quattro (SUV)": 62500,
  "2025 Mercedes-Benz GLC 300": 59500,
};

export const ADDON_CATALOG: Record<string, number> = {
  "Panoramic Sunroof": 1800,
  "Extended 5-Year Warranty": 2400,
  "Matte Stealth Paint Protection": 3200,
  "ADAS Pro Driver Assistance": 2100,
};

export const INITIAL_FORM_SECTIONS: SectionSchema[] = [
  {
    id: "basicDetails",
    title: "1. Basic Details & Live Call Discovery",
    subtitle: "Capture customer qualification details while on the call.",
    isRepeatable: false,
    attributes: [
      {
        key: "customerName",
        label: "Customer Full Name",
        type: "string",
        required: true,
        isSystemLocked: true,
      },
      {
        key: "phone",
        label: "Phone Number (E.164 Verified)",
        type: "string",
        required: true,
        isSystemLocked: true,
      },
      {
        key: "email",
        label: "Email Address",
        type: "string",
        required: true,
        isSystemLocked: true,
      },
      {
        key: "originatorRep",
        label: "Originating Sales Rep",
        type: "readonly",
        isSystemLocked: true,
      },
      {
        key: "leadStatus",
        label: "Lead Lifecycle Status",
        type: "dropdown",
        options: ["New", "Contacted", "Qualified", "Converted", "Lost"],
        required: true,
        isSystemLocked: true,
      },
      {
        key: "lostReason",
        label: "Lost Lead Attribution Reason",
        type: "dropdown",
        options: [
          "Price / Budget Mismatch",
          "Bought Competitor Vehicle",
          "Unresponsive / Ghosted",
          "Financing Rejected",
        ],
        dependsOn: { key: "leadStatus", operator: "equals", value: "Lost" },
        helperText: "Visible only when Lead Status is marked Lost",
      },
      {
        key: "calledCustomer",
        label: "Called Customer?",
        type: "dropdown",
        options: ["No", "Yes - Connected", "Yes - Left Voicemail"],
        required: true,
        isSystemLocked: true,
      },
      {
        key: "callNotes",
        label: "Call & Discovery Notes (Persisted to Timeline)",
        type: "textarea",
        dependsOn: {
          key: "calledCustomer",
          operator: "notEquals",
          value: "No",
        },
        helperText:
          "Automatically logs to the chronological activity feed on save",
      },
      {
        key: "appointmentBooked",
        label: "Showroom Appointment Booked?",
        type: "dropdown",
        options: ["No", "Yes"],
        dependsOn: {
          key: "calledCustomer",
          operator: "equals",
          value: "Yes - Connected",
        },
      },
      {
        key: "appointmentDate",
        label: "Scheduled Appointment Date & Time",
        type: "datetime",
        dependsOn: {
          key: "appointmentBooked",
          operator: "equals",
          value: "Yes",
        },
      },
    ],
  },
  {
    id: "productPricing",
    title: "2. Product & Pricing Configuration",
    subtitle:
      "Cloneable section: Add multiple vehicles if the customer is cross-shopping to prevent duplicate leads.",
    isRepeatable: true,
    attributes: [
      {
        key: "vehicleModel",
        label: "Select Inventory Vehicle",
        type: "dropdown",
        options: Object.keys(VEHICLE_CATALOG),
        required: true,
        isSystemLocked: true,
      },
      {
        key: "interestedFeatures",
        label: "Configured Add-Ons & Packages",
        type: "multiSelect",
        options: Object.keys(ADDON_CATALOG),
        isSystemLocked: true,
      },
      {
        key: "tookTestDrive",
        label: "Test Drive Status (Vehicle Specific)",
        type: "dropdown",
        options: [
          "No",
          "Scheduled",
          "Completed - Loved It",
          "Completed - Comparing Options",
        ],
      },
      {
        key: "basePrice",
        label: "Calculated Base Price (MSRP + Add-ons) [$]",
        type: "readonly",
        isSystemLocked: true,
      },
      {
        key: "proposedDiscountPct",
        label: "Proposed Rep Discount (%) [>5% Triggers DAP]",
        type: "number",
        isSystemLocked: true,
        helperText:
          "Rep limit is 5%. Entering >5% dynamically mounts the DAP Section below.",
      },
      {
        key: "netPrice",
        label: "Final Net Price After Discount [$]",
        type: "readonly",
        isSystemLocked: true,
      },
    ],
  },
  {
    id: "dapSection",
    title: "3. DAP (Discount Approval Process)",
    subtitle:
      "Mounted dynamically because a proposed vehicle discount exceeds the 5% Salesperson threshold.",
    isRepeatable: false,
    roleVisibility: "REP_AND_MANAGER",
    attributes: [
      {
        key: "maxDiscountSummary",
        label: "Triggered Discount Summary",
        type: "readonly",
        isSystemLocked: true,
      },
      {
        key: "repJustification",
        label: "Rep Business Justification for Manager",
        type: "textarea",
        required: true,
        helperText: "Explain why this discount is required to win the deal",
      },
      {
        key: "dapStatus",
        label: "DAP Manager Decision",
        type: "dropdown",
        options: [
          "Pending Manager Approval",
          "Approved by Sales Manager",
          "Rejected - Revise Pricing",
        ],
        isSystemLocked: true,
      },
      {
        key: "managerComments",
        label: "Sales Manager Audit Notes",
        type: "string",
        dependsOn: {
          key: "dapStatus",
          operator: "notEquals",
          value: "Pending Manager Approval",
        },
      },
    ],
  },
  {
    id: "quoteConfig",
    title: "4. Quote Configuration & Client Sharing",
    subtitle:
      "Dependent on Product-Pricing & DAP clearance. Internal to Rep until shared with the client.",
    isRepeatable: false,
    attributes: [
      {
        key: "paymentMode",
        label: "Customer Payment Structure",
        type: "dropdown",
        options: [
          "Full Cash / Wire",
          "Dealership Finance (EMI)",
          "Corporate Lease",
        ],
      },
      {
        key: "emiTenure",
        label: "Financing Tenure",
        type: "dropdown",
        options: ["24 Months", "36 Months", "48 Months", "60 Months"],
        dependsOn: {
          key: "paymentMode",
          operator: "equals",
          value: "Dealership Finance (EMI)",
        },
      },
      {
        key: "quoteVisibility",
        label: "Quote Publication State",
        type: "dropdown",
        options: [
          "Draft (Visible to Rep Only)",
          "Published & Shared with Client",
        ],
        isSystemLocked: true,
      },
      {
        key: "clientDecision",
        label: "Client Quote Decision",
        type: "dropdown",
        options: [
          "Awaiting Client Review",
          "Client Accepted Quote(s)",
          "Client Requested Changes",
        ],
        dependsOn: {
          key: "quoteVisibility",
          operator: "equals",
          value: "Published & Shared with Client",
        },
        isSystemLocked: true,
      },
    ],
  },
  {
    id: "cafSection",
    title: "5. CAF (Customer Acceptance Form — Final Master Order)",
    subtitle:
      "Select specific accepted quote(s) to bundle into the binding final sales contract.",
    isRepeatable: false,
    attributes: [
      {
        key: "cafReferenceId",
        label: "Master CAF Reference ID",
        type: "readonly",
        isSystemLocked: true,
      },
      {
        key: "selectedQuoteIds",
        label: "Select Accepted Quote(s) for CAF Bundle",
        type: "multiSelect",
        options: [],
        isSystemLocked: true,
      },
      {
        key: "consolidatedOrderSummary",
        label: "Consolidated Final Deal Value [$]",
        type: "readonly",
        isSystemLocked: true,
      },
      {
        key: "deliveryAddress",
        label: "Customer Registration & Delivery Address",
        type: "textarea",
        required: true,
      },
      {
        key: "kycDocument",
        label: "Verified KYC Identification",
        type: "dropdown",
        options: ["Driver License", "Passport", "National Tax / PAN Card"],
      },
    ],
  },
];

const FORM_MASTER_STORAGE_KEY = "keyloop_form_master_versions_v1";

const DEFAULT_VERSIONS: FormVersionRecord[] = [
  {
    versionId: "ver-100",
    versionNumber: "v1.0",
    status: "PUBLISHED",
    updatedAt: "2026-10-30 09:00 AM",
    updatedBy: "Rajesh Singh (Sales Manager)",
    changelog:
      "Initial baseline Dealership Consultation & CPQ 5-Section Form Schema.",
    sections: INITIAL_FORM_SECTIONS,
  },
];

export const formMasterStore = {
  getAllVersions(): FormVersionRecord[] {
    const raw = localStorage.getItem(FORM_MASTER_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(
        FORM_MASTER_STORAGE_KEY,
        JSON.stringify(DEFAULT_VERSIONS),
      );
      return DEFAULT_VERSIONS;
    }
    return JSON.parse(raw);
  },

  getPublishedVersion(): FormVersionRecord {
    const versions = this.getAllVersions();
    return versions.find((v) => v.status === "PUBLISHED") || versions[0];
  },

  saveDraftVersion(
    sections: SectionSchema[],
    changelog: string,
    author: string,
  ): FormVersionRecord {
    const versions = this.getAllVersions();
    const existingDraftIdx = versions.findIndex((v) => v.status === "DRAFT");
    const nextNum = `v1.${versions.length}`;

    const draftRecord: FormVersionRecord = {
      versionId:
        existingDraftIdx >= 0
          ? versions[existingDraftIdx].versionId
          : `ver-${Date.now()}`,
      versionNumber:
        existingDraftIdx >= 0
          ? versions[existingDraftIdx].versionNumber
          : `${nextNum}-draft`,
      status: "DRAFT",
      updatedAt: "Just now",
      updatedBy: author,
      changelog: changelog || "Unpublished working draft modifications",
      sections: JSON.parse(JSON.stringify(sections)),
    };

    if (existingDraftIdx >= 0) {
      versions[existingDraftIdx] = draftRecord;
    } else {
      versions.unshift(draftRecord);
    }

    localStorage.setItem(FORM_MASTER_STORAGE_KEY, JSON.stringify(versions));
    return draftRecord;
  },

  publishVersion(
    sections: SectionSchema[],
    changelog: string,
    author: string,
  ): FormVersionRecord {
    const versions = this.getAllVersions()
      .map((v) => ({
        ...v,
        status: v.status === "PUBLISHED" ? ("ARCHIVED" as const) : v.status,
      }))
      .filter((v) => v.status !== "DRAFT");

    const nextVersionNumber = `v1.${versions.length}`;
    const newPublished: FormVersionRecord = {
      versionId: `ver-${Date.now()}`,
      versionNumber: nextVersionNumber,
      status: "PUBLISHED",
      updatedAt: "Just now",
      updatedBy: author,
      changelog: changelog || `Published ${nextVersionNumber} schema update`,
      sections: JSON.parse(JSON.stringify(sections)),
    };

    const updatedList = [newPublished, ...versions];
    localStorage.setItem(FORM_MASTER_STORAGE_KEY, JSON.stringify(updatedList));
    return newPublished;
  },

  activateHistoricalVersion(versionId: string): FormVersionRecord {
    const versions = this.getAllVersions().map((v) => ({
      ...v,
      status:
        v.versionId === versionId
          ? ("PUBLISHED" as const)
          : v.status === "PUBLISHED"
            ? ("ARCHIVED" as const)
            : v.status,
    }));
    localStorage.setItem(FORM_MASTER_STORAGE_KEY, JSON.stringify(versions));
    return versions.find((v) => v.versionId === versionId)!;
  },

  resetFormMaster(): FormVersionRecord[] {
    localStorage.setItem(
      FORM_MASTER_STORAGE_KEY,
      JSON.stringify(DEFAULT_VERSIONS),
    );
    return DEFAULT_VERSIONS;
  },
};
