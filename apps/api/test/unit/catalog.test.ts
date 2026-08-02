import { describe, it, expect } from "vitest";
import {
  SERVICE_CATALOG,
  SERVICE_KEYS,
  BILLING_PLANS,
  planIncludesService,
  getPlan,
} from "@mew/shared";

describe("service catalog", () => {
  it("has 10 services with unique keys", () => {
    expect(SERVICE_CATALOG).toHaveLength(10);
    expect(new Set(SERVICE_KEYS).size).toBe(10);
  });

  it("every service has the required fields", () => {
    for (const s of SERVICE_CATALOG) {
      expect(s.key).toBeTruthy();
      expect(s.name).toBeTruthy();
      expect(["live", "beta", "planned"]).toContain(s.status);
    }
  });
});

describe("billing plans + entitlements", () => {
  it("only references real service keys", () => {
    for (const plan of BILLING_PLANS) {
      for (const key of plan.includedServices) {
        expect(SERVICE_KEYS).toContain(key);
      }
    }
  });

  it("Pro includes every service; Starter does not include lead follow-up", () => {
    expect(getPlan("pro")!.includedServices).toEqual(
      expect.arrayContaining([...SERVICE_KEYS]),
    );
    expect(planIncludesService("pro", "sales_assistant")).toBe(true);
    expect(planIncludesService("starter", "receptionist")).toBe(true);
    expect(planIncludesService("starter", "lead_follow_up")).toBe(false);
  });

  it("no plan → no access", () => {
    expect(planIncludesService(null, "receptionist")).toBe(false);
    expect(planIncludesService("nonexistent", "receptionist")).toBe(false);
  });
});
