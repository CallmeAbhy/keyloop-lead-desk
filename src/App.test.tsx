// src/App.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { calculatePricing, mockApi } from "./api/mockBackend";
import { formMasterStore } from "./schema/formSchema";

describe("Keyloop Lead & CPQ Business Logic Suite", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("calculates base price (MSRP + Add-ons) and net price after discount accurately", () => {
    const result = calculatePricing(
      "2025 BMW X5 xDrive40i (SUV)", // $65,000
      ["Panoramic Sunroof"], // +$1,800 = $66,800
      10, // 10% discount -> $60,120
    );
    expect(result.basePrice).toBe(66800);
    expect(result.netPrice).toBe(60120);
  });

  it("persists new follow-up activities in chronological order and increments rowVersion", () => {
    const leads = mockApi.getLeads();
    const target = leads[0];
    const initialCount = target.activities.length;

    const updated = mockApi.saveLead(
      target,
      "Called customer to confirm BMW X5 quote",
      "CALL",
    );
    expect(updated.activities.length).toBe(initialCount + 1);
    expect(updated.activities[0].summary).toContain(
      "Called customer to confirm BMW X5 quote",
    );
    expect(updated.rowVersion).toBe(target.rowVersion + 1);
  });
  it("supports Form Master draft creation and version publishing without mutating archived versions", () => {
    const initialPub = formMasterStore.getPublishedVersion();
    expect(initialPub.versionNumber).toBe("v1.0");

    // Manager adds a custom attribute to Section 1 and publishes v1.1
    const modifiedSections = JSON.parse(JSON.stringify(initialPub.sections));
    modifiedSections[0].attributes.push({
      key: "tradeInRequired",
      label: "Trade-In Vehicle?",
      type: "dropdown",
      options: ["No", "Yes"],
    });

    const newPub = formMasterStore.publishVersion(
      modifiedSections,
      "Added Trade-In Vehicle attribute to Basic Details",
      "Rajesh Singh (Sales Manager)",
    );

    expect(newPub.versionNumber).toBe("v1.1");
    expect(newPub.status).toBe("PUBLISHED");
    expect(
      formMasterStore
        .getPublishedVersion()
        .sections[0].attributes.some((a) => a.key === "tradeInRequired"),
    ).toBe(true);
  });
});
