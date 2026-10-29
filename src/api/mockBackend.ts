// src/api/mockBackend.ts
import { VEHICLE_CATALOG, ADDON_CATALOG } from "../schema/formSchema";

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  actor: string;
  type:
    | "CALL"
    | "SYSTEM_MERGE"
    | "DAP_EVENT"
    | "QUOTE_EVENT"
    | "CAF_DISPATCH"
    | "STATUS_CHANGE"
    | "POOL_CLAIM";
  summary: string;
}

export interface ProductPricingItem {
  id: string;
  vehicleModel: string;
  interestedFeatures: string[];
  tookTestDrive: string;
  basePrice: number;
  proposedDiscountPct: number;
  netPrice: number;
  source?: "CUSTOMER_WEBHOOK" | "REP_CONFIGURED";
}

export interface LeadRecord {
  id: string;
  createdAtHoursAgo: number;
  rowVersion: number;
  basicDetails: {
    customerName: string;
    phone: string;
    email: string;
    originatorRep: string; // Empty string '' means UNASSIGNED (In Lead Pool!)
    leadStatus: string;
    lostReason: string;
    calledCustomer: string;
    callNotes: string;
    appointmentBooked: string;
    appointmentDate: string;
  };
  productPricing: ProductPricingItem[];
  dapSection: {
    maxDiscountSummary: string;
    repJustification: string;
    dapStatus: string;
    managerComments: string;
  };
  quoteConfig: {
    paymentMode: string;
    emiTenure: string;
    quoteVisibility: string;
    clientDecision: string;
  };
  cafSection: {
    cafReferenceId: string;
    consolidatedOrderSummary: string;
    deliveryAddress: string;
    kycDocument: string;
    isCafSent: boolean;
    selectedQuoteIds?: string[];
  };
  activities: ActivityLogItem[];
}

const STORAGE_KEY = "keyloop_leads_db_v2";

export function calculatePricing(
  vehicleModel: string,
  features: string[],
  discountPct: number,
) {
  const vehicleBase = VEHICLE_CATALOG[vehicleModel] || 58000;
  const addonsTotal = (features || []).reduce(
    (sum, f) => sum + (ADDON_CATALOG[f] || 0),
    0,
  );
  const basePrice = vehicleBase + addonsTotal;
  const safeDiscount = Math.min(Math.max(Number(discountPct) || 0, 0), 30);
  const netPrice = Math.round(basePrice * (1 - safeDiscount / 100));
  return { basePrice, netPrice };
}

const INITIAL_LEADS: LeadRecord[] = [
  {
    id: "LEAD-100",
    createdAtHoursAgo: 0.2, // ⚡ Fresh Unassigned Pool Lead!
    rowVersion: 1,
    basicDetails: {
      customerName: "Ananya Deshmukh",
      phone: "+91 99887 76655",
      email: "ananya.d@example.com",
      originatorRep: "", // UNASSIGNED IN POOL
      leadStatus: "New",
      lostReason: "",
      calledCustomer: "No",
      callNotes: "",
      appointmentBooked: "No",
      appointmentDate: "",
    },
    productPricing: [
      {
        id: "veh-100",
        vehicleModel: "2025 BMW X5 xDrive40i (SUV)",
        interestedFeatures: ["Panoramic Sunroof"],
        tookTestDrive: "No",
        basePrice: 66800,
        proposedDiscountPct: 0,
        netPrice: 66800,
        source: "CUSTOMER_WEBHOOK",
      },
    ],
    dapSection: {
      maxDiscountSummary: "Within 5% Rep Threshold",
      repJustification: "",
      dapStatus: "Pending Manager Approval",
      managerComments: "",
    },
    quoteConfig: {
      paymentMode: "Dealership Finance (EMI)",
      emiTenure: "36 Months",
      quoteVisibility: "Draft (Visible to Rep Only)",
      clientDecision: "Awaiting Client Review",
    },
    cafSection: {
      cafReferenceId: "CAF-2026-9080",
      consolidatedOrderSummary: "",
      deliveryAddress: "",
      kycDocument: "Driver License",
      isCafSent: false,
    },
    activities: [
      {
        id: "act-100",
        timestamp: "12 mins ago",
        actor: "Website Webhook",
        type: "STATUS_CHANGE",
        summary:
          "Incoming web inquiry received (Customer & Vehicle pre-filled). Added to Unassigned Lead Pool.",
      },
    ],
  },
  {
    id: "LEAD-101",
    createdAtHoursAgo: 0.5, // ⚡ Thunder (< 1 hour ago)
    rowVersion: 1,
    basicDetails: {
      customerName: "Rahul Sharma",
      phone: "+91 98765 43210",
      email: "rahul.sharma@example.com",
      originatorRep: "Abhay (Sales Rep 1)",
      leadStatus: "Contacted",
      lostReason: "",
      calledCustomer: "Yes - Connected",
      callNotes:
        "Customer is confused between an SUV (BMW X5) and a Sedan (BMW 530i). Needs side-by-side pricing.",
      appointmentBooked: "Yes",
      appointmentDate: "2026-10-31T11:00",
    },
    productPricing: [
      {
        id: "veh-1",
        vehicleModel: "2025 BMW X5 xDrive40i (SUV)",
        interestedFeatures: ["Panoramic Sunroof", "Extended 5-Year Warranty"],
        tookTestDrive: "Completed - Loved It",
        basePrice: 69200,
        proposedDiscountPct: 8,
        netPrice: 63664,
        source: "CUSTOMER_WEBHOOK",
      },
      {
        id: "veh-2",
        vehicleModel: "2025 BMW 530i M Sport (Sedan)",
        interestedFeatures: ["ADAS Pro Driver Assistance"],
        tookTestDrive: "Scheduled",
        basePrice: 60100,
        proposedDiscountPct: 4,
        netPrice: 57696,
        source: "CUSTOMER_WEBHOOK",
      },
    ],
    dapSection: {
      maxDiscountSummary:
        "8% Discount requested on 2025 BMW X5 xDrive40i (Exceeds 5% Rep Authority)",
      repJustification:
        "Customer is cross-shopping X5 and 530i. Approving 8% on in-stock X5 locks immediate closing.",
      dapStatus: "Pending Manager Approval",
      managerComments: "",
    },
    quoteConfig: {
      paymentMode: "Dealership Finance (EMI)",
      emiTenure: "48 Months",
      quoteVisibility: "Draft (Visible to Rep Only)",
      clientDecision: "Awaiting Client Review",
    },
    cafSection: {
      cafReferenceId: "CAF-2026-9081",
      consolidatedOrderSummary: "",
      deliveryAddress: "B-402 Skyline Apartments, SG Highway, Ahmedabad",
      kycDocument: "Driver License",
      isCafSent: false,
    },
    activities: [
      {
        id: "act-3",
        timestamp: "10 mins ago",
        actor: "Abhay (Sales Rep 1)",
        type: "DAP_EVENT",
        summary:
          "Configured 8% discount on 2025 BMW X5 ($63,664 Net). Triggered DAP Manager Approval.",
      },
      {
        id: "act-2",
        timestamp: "18 mins ago",
        actor: "Abhay (Sales Rep 1)",
        type: "CALL",
        summary:
          "Called customer (Connected): Discussed SUV vs Sedan options; booked showroom visit.",
      },
      {
        id: "act-1",
        timestamp: "25 mins ago",
        actor: "Webhook Deduplication Engine",
        type: "SYSTEM_MERGE",
        summary:
          "2nd Web Inquiry detected for +91 98765 43210 (BMW 530i). Auto-merged into existing Lead Product-Pricing.",
      },
    ],
  },
  {
    id: "LEAD-102",
    createdAtHoursAgo: 7, // 🔥 Fire (>= 6 hours ago)
    rowVersion: 1,
    basicDetails: {
      customerName: "Priya Nair",
      phone: "+91 98201 11223",
      email: "priya.nair@example.com",
      originatorRep: "Sarah Jenkins (Sales Rep 2)",
      leadStatus: "New",
      lostReason: "",
      calledCustomer: "No",
      callNotes: "",
      appointmentBooked: "No",
      appointmentDate: "",
    },
    productPricing: [
      {
        id: "veh-201",
        vehicleModel: "2025 Audi Q7 Quattro (SUV)",
        interestedFeatures: ["Panoramic Sunroof"],
        tookTestDrive: "No",
        basePrice: 64300,
        proposedDiscountPct: 3,
        netPrice: 62371,
        source: "CUSTOMER_WEBHOOK",
      },
    ],
    dapSection: {
      maxDiscountSummary: "",
      repJustification: "",
      dapStatus: "Pending Manager Approval",
      managerComments: "",
    },
    quoteConfig: {
      paymentMode: "Full Cash / Wire",
      emiTenure: "36 Months",
      quoteVisibility: "Draft (Visible to Rep Only)",
      clientDecision: "Awaiting Client Review",
    },
    cafSection: {
      cafReferenceId: "CAF-2026-9082",
      consolidatedOrderSummary: "",
      deliveryAddress: "",
      kycDocument: "Passport",
      isCafSent: false,
    },
    activities: [
      {
        id: "act-201",
        timestamp: "7 hours ago",
        actor: "Website Webhook",
        type: "STATUS_CHANGE",
        summary:
          "Lead captured from Dealership Website for 2025 Audi Q7 Quattro. Assigned to Sarah Jenkins.",
      },
    ],
  },
  {
    id: "LEAD-103",
    createdAtHoursAgo: 14, // 💧 Water (>= 12 hours ago)
    rowVersion: 1,
    basicDetails: {
      customerName: "Vikramaditya Mehta",
      phone: "+91 97112 33445",
      email: "vikram.mehta@example.com",
      originatorRep: "Abhay (Sales Rep 1)",
      leadStatus: "Contacted",
      lostReason: "",
      calledCustomer: "Yes - Left Voicemail",
      callNotes:
        "Left voicemail regarding corporate lease options on Mercedes GLC 300.",
      appointmentBooked: "No",
      appointmentDate: "",
    },
    productPricing: [
      {
        id: "veh-301",
        vehicleModel: "2025 Mercedes-Benz GLC 300",
        interestedFeatures: ["Extended 5-Year Warranty"],
        tookTestDrive: "No",
        basePrice: 61900,
        proposedDiscountPct: 2,
        netPrice: 60662,
        source: "CUSTOMER_WEBHOOK",
      },
    ],
    dapSection: {
      maxDiscountSummary: "",
      repJustification: "",
      dapStatus: "Pending Manager Approval",
      managerComments: "",
    },
    quoteConfig: {
      paymentMode: "Corporate Lease",
      emiTenure: "36 Months",
      quoteVisibility: "Draft (Visible to Rep Only)",
      clientDecision: "Awaiting Client Review",
    },
    cafSection: {
      cafReferenceId: "CAF-2026-9083",
      consolidatedOrderSummary: "",
      deliveryAddress: "",
      kycDocument: "National Tax / PAN Card",
      isCafSent: false,
    },
    activities: [
      {
        id: "act-301",
        timestamp: "14 hours ago",
        actor: "Website Webhook",
        type: "STATUS_CHANGE",
        summary:
          "Lead created from partner website webhook. Going cold (>12h).",
      },
    ],
  },
];

export const mockApi = {
  getLeads(): LeadRecord[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_LEADS));
      return INITIAL_LEADS;
    }
    return JSON.parse(raw);
  },

  saveLead(
    updatedLead: LeadRecord,
    newActivitySummary?: string,
    activityType: ActivityLogItem["type"] = "CALL",
    actorName = "Abhay (Sales Rep 1)",
  ): LeadRecord {
    const leads = this.getLeads();
    const idx = leads.findIndex((l) => l.id === updatedLead.id);
    if (idx === -1) throw new Error("Lead not found");

    if (leads[idx].rowVersion !== updatedLead.rowVersion) {
      throw new Error(
        "409_CONFLICT: This lead was modified by another session.",
      );
    }

    const nextLead: LeadRecord = {
      ...updatedLead,
      rowVersion: updatedLead.rowVersion + 1,
      activities: newActivitySummary
        ? [
            {
              id: `act-${Date.now()}`,
              timestamp: "Just now",
              actor: actorName,
              type: activityType,
              summary: newActivitySummary,
            },
            ...updatedLead.activities,
          ]
        : updatedLead.activities,
    };

    leads[idx] = nextLead;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
    return nextLead;
  },

  claimLeadFromPool(leadId: string, repName: string): LeadRecord {
    const leads = this.getLeads();
    const target = leads.find((l) => l.id === leadId);
    if (!target) throw new Error("Lead not found");
    if (target.basicDetails.originatorRep) {
      throw new Error("Lead already claimed by another representative");
    }

    const claimed: LeadRecord = {
      ...target,
      basicDetails: {
        ...target.basicDetails,
        originatorRep: repName,
      },
    };
    return this.saveLead(
      claimed,
      `Lead claimed from Unassigned Pool by ${repName}. Ownership locked.`,
      "POOL_CLAIM",
      repName,
    );
  },

  // Simulates an incoming Webhook from the Vehicle Website (Deduplicates by phone/email!)
  simulateIncomingWebhook(leadId: string): LeadRecord {
    const leads = this.getLeads();
    const target = leads.find((l) => l.id === leadId) || leads[0];
    const newVehicle: ProductPricingItem = {
      id: `veh-web-${Date.now()}`,
      vehicleModel: "2025 Mercedes-Benz GLC 300",
      interestedFeatures: ["Panoramic Sunroof"],
      tookTestDrive: "No",
      basePrice: 61300,
      proposedDiscountPct: 0,
      netPrice: 61300,
      source: "CUSTOMER_WEBHOOK",
    };

    const merged: LeadRecord = {
      ...target,
      productPricing: [...target.productPricing, newVehicle],
    };

    return this.saveLead(
      merged,
      `Webhook Ingestion: Customer (${target.basicDetails.phone}) submitted a 2nd web inquiry for 2025 Mercedes-Benz GLC 300. Deduplicated & appended to Product-Pricing.`,
      "SYSTEM_MERGE",
      "Webhook Deduplication Service",
    );
  },

  resetDemoData(): LeadRecord[] {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_LEADS));
    return INITIAL_LEADS;
  },
};
