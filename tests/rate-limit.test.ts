import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetDurableMemoryForTests } from "@/lib/store/durable";
import {
  clientIp,
  consumeLiveLookSlot,
  liveCapMessage,
  liveCapSnapshot,
} from "@/lib/youcam/rate-limit";

describe("live look caps", () => {
  const prev = {
    global: process.env.YOUCAM_GLOBAL_DAILY_CAP,
    ip: process.env.YOUCAM_DAILY_IP_CAP,
  };

  beforeEach(() => {
    resetDurableMemoryForTests();
    process.env.YOUCAM_GLOBAL_DAILY_CAP = "2";
    process.env.YOUCAM_DAILY_IP_CAP = "1";
  });

  afterEach(() => {
    resetDurableMemoryForTests();
    if (prev.global === undefined) delete process.env.YOUCAM_GLOBAL_DAILY_CAP;
    else process.env.YOUCAM_GLOBAL_DAILY_CAP = prev.global;
    if (prev.ip === undefined) delete process.env.YOUCAM_DAILY_IP_CAP;
    else process.env.YOUCAM_DAILY_IP_CAP = prev.ip;
  });

  it("prefers the Netlify client IP header over x-forwarded-for", () => {
    const headers = new Headers({
      "x-forwarded-for": "1.1.1.1, 8.8.8.8",
      "x-nf-client-connection-ip": "9.9.9.9",
    });
    expect(clientIp(headers)).toBe("9.9.9.9");
  });

  it("stops a device at the per-IP cap and offers the sample photo", async () => {
    const first = await consumeLiveLookSlot("10.0.0.1");
    expect(first.allowed).toBe(true);
    const denied = await consumeLiveLookSlot("10.0.0.1");
    expect(denied.allowed).toBe(false);
    expect(denied.code).toBe("ip_cap");
    expect(denied.offerSample).toBe(true);
    expect(denied.message).toBe(liveCapMessage("ip_cap", 1));
    const other = await consumeLiveLookSlot("10.0.0.2");
    expect(other.allowed).toBe(true);
  });

  it("stops the whole site at the global cap even for a new IP", async () => {
    expect((await consumeLiveLookSlot("10.0.0.1")).allowed).toBe(true);
    expect((await consumeLiveLookSlot("10.0.0.2")).allowed).toBe(true);
    const denied = await consumeLiveLookSlot("10.0.0.3");
    expect(denied.allowed).toBe(false);
    expect(denied.code).toBe("global_cap");
    expect(denied.offerSample).toBe(true);
    expect(denied.message).toContain("sample photo");
    const snap = await liveCapSnapshot("10.0.0.3");
    expect(snap.globalUsed).toBe(2);
    expect(snap.globalRemaining).toBe(0);
  });
});
