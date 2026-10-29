// src/App.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { calculatePricing, mockApi } from "./api/mockBackend";

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
});
