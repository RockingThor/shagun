import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { OCCASION_LOOKS } from "@/lib/look/defaults";
import {
  createLookJob,
  resetLookMemoryForTests,
  serializeJob,
  tickJob,
} from "@/lib/look/jobs";
import { SAMPLE_PHOTO_HASH } from "@/lib/look/sample";
import { resetDurableMemoryForTests } from "@/lib/store/durable";

describe("sample photo in live mode", () => {
  const prev = {
    demo: process.env.DEMO_MODE,
    key: process.env.YOUCAM_API_KEY,
  };

  beforeEach(() => {
    resetLookMemoryForTests();
    resetDurableMemoryForTests();
    process.env.DEMO_MODE = "false";
    process.env.YOUCAM_API_KEY = "test-key-not-a-secret";
  });

  afterEach(() => {
    resetLookMemoryForTests();
    resetDurableMemoryForTests();
    if (prev.demo === undefined) delete process.env.DEMO_MODE;
    else process.env.DEMO_MODE = prev.demo;
    if (prev.key === undefined) delete process.env.YOUCAM_API_KEY;
    else process.env.YOUCAM_API_KEY = prev.key;
  });

  it("serves captured demo looks at zero units even when a live key is set", async () => {
    const started = Date.now();
    const job = await createLookJob({
      imageHash: SAMPLE_PHOTO_HASH,
      occasion: "diwali",
      budget: 14000,
    });
    expect(Date.now() - started).toBeLessThan(500);
    expect(job.samplePhoto).toBe(true);
    expect(job.demoMode).toBe(true);
    expect(job.status).toBe("success");
    await tickJob(job);
    expect(job.status).toBe("success");
    expect(job.unitsUsed).toBe(0);
    expect(job.steps.clothes.imageUrl).toBe("/demo/looks/diwali-clothes.jpg");
    expect(job.steps.lipstick.imageUrl).toBe("/demo/looks/diwali-lipstick.jpg");
    const payload = serializeJob(job);
    expect(payload.unitsPlanned).toBe(0);
    expect(payload.samplePhoto).toBe(true);
  });

  it("keeps sample-catalog swaps on captured frames instead of calling YouCam", async () => {
    const job = await createLookJob({
      imageHash: SAMPLE_PHOTO_HASH,
      occasion: "diwali",
      budget: 14000,
      look: { ...OCCASION_LOOKS.diwali, earringId: "gold-hoops" },
      fromStep: "earrings",
    });
    expect(job.demoMode).toBe(true);
    expect(job.status).toBe("success");
    await tickJob(job);
    expect(job.status).toBe("success");
    expect(job.unitsUsed).toBe(0);
    expect(job.steps.clothes.imageUrl).toBe("/demo/looks/diwali-clothes.jpg");
    expect(job.steps.hair.imageUrl).toBe("/demo/looks/diwali-hair.jpg");
    expect(job.steps.earrings.imageUrl).toBe("/demo/looks/diwali-hair.jpg");
  });
});
