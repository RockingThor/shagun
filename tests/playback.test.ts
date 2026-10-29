import { describe, expect, it } from "vitest";
import {
  capturedStepsReady,
  demoPlaybackFrame,
  isCapturedPlayback,
} from "@/lib/look/playback";
import type { ChainStep } from "@/lib/look/chain";

function job(fromStep: ChainStep = "clothes") {
  return {
    status: "success" as const,
    demoMode: true,
    samplePhoto: true,
    fromStep,
    currentStep: "lipstick" as const,
    selfiePreviewUrl: "/demo/selfie.jpg",
    currentImageUrl: "/demo/looks/diwali-lipstick.jpg",
    finalImageUrl: "/demo/looks/diwali-lipstick.jpg",
    steps: [
      { id: "clothes" as const, status: "success", imageUrl: "/c.jpg" },
      { id: "hair" as const, status: "success", imageUrl: "/h.jpg" },
      { id: "earrings" as const, status: "success", imageUrl: "/e.jpg" },
      { id: "lipstick" as const, status: "success", imageUrl: "/l.jpg" },
    ],
  };
}

describe("captured playback", () => {
  it("treats sample and demo jobs as client-played looks", () => {
    expect(isCapturedPlayback({ demoMode: true, samplePhoto: false })).toBe(true);
    expect(isCapturedPlayback({ demoMode: false, samplePhoto: true })).toBe(true);
    expect(isCapturedPlayback({ demoMode: false, samplePhoto: false })).toBe(
      false,
    );
  });

  it("is ready when every queued step already has a captured frame", () => {
    expect(capturedStepsReady(job())).toBe(true);
    expect(
      capturedStepsReady({
        ...job(),
        steps: job().steps.map((step) =>
          step.id === "lipstick" ? { ...step, imageUrl: null } : step,
        ),
      }),
    ).toBe(false);
  });

  it("plays clothes then hair then earrings then lipstick without waiting on the server", () => {
    const finalJob = job();
    const first = demoPlaybackFrame(finalJob, 0);
    expect(first.status).toBe("running");
    expect(first.currentStep).toBe("clothes");
    expect(first.steps.map((step) => step.status)).toEqual([
      "running",
      "pending",
      "pending",
      "pending",
    ]);
    expect(first.finalImageUrl).toBeNull();

    const second = demoPlaybackFrame(finalJob, 1);
    expect(second.currentStep).toBe("hair");
    expect(second.steps[0]?.status).toBe("success");
    expect(second.steps[1]?.status).toBe("running");
    expect(second.currentImageUrl).toBe("/c.jpg");
  });

  it("starts a lipstick swap on the last chip only", () => {
    const frame = demoPlaybackFrame(job("lipstick"), 0);
    expect(frame.currentStep).toBe("lipstick");
    expect(frame.steps.map((step) => step.status)).toEqual([
      "success",
      "success",
      "success",
      "running",
    ]);
  });
});
