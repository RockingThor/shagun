"use client";

import { BeforeAfter } from "@/components/before-after";
import { useRuntimeStatus } from "@/components/runtime-status";
import { SafeImage } from "@/components/safe-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BUDGET_MAX,
  BUDGET_MIN,
  BUDGET_PRESETS,
  DEFAULT_BUDGET,
  OCCASION_COPY,
  OCCASIONS,
  CATEGORY_LABEL,
  formatInr,
  itemsInCategory,
  type CatalogItem,
  type Category,
  type Occasion,
} from "@/data/catalog";
import { readCart, writeCart, type CartLook } from "@/lib/cart";
import { cn } from "@/lib/cn";
import {
  CHAIN_STEPS,
  STEP_META,
  categoryToStep,
  stepsFrom,
  withSwappedItem,
  type ChainStep,
  type LookIds,
} from "@/lib/look/chain";
import { DEMO_SELFIE } from "@/lib/look/defaults";
import {
  DEMO_STEP_MS,
  capturedStepsReady,
  demoPlaybackFrame,
  isCapturedPlayback,
  prefetchUrls,
} from "@/lib/look/playback";
import { SAMPLE_PHOTO_HASH } from "@/lib/look/sample";
import { remainingBudget } from "@/lib/look/picker";
import { Check, Loader2, RotateCcw, Sparkles, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type JobStep = {
  id: ChainStep;
  label: string;
  api: string;
  detail: string;
  units: number;
  status: string;
  imageUrl: string | null;
  dstId?: string | null;
  error: string | null;
  note: string | null;
};

type JobPayload = {
  jobId: string;
  status: "running" | "success" | "error";
  demoMode: boolean;
  samplePhoto?: boolean;
  error: string | null;
  occasion: Occasion;
  budget: number;
  look: LookIds;
  items: CatalogItem[];
  total: number;
  withinBudget: boolean;
  leftover: number;
  fromStep: ChainStep;
  currentStep: ChainStep;
  selfiePreviewUrl: string;
  currentImageUrl: string;
  finalImageUrl: string | null;
  unitsUsed: number;
  unitsPlanned: number;
  note: string | null;
  steps: JobStep[];
};

type ApiError = {
  error?: string;
  code?: string;
  offerSample?: boolean;
  samplePhotoHash?: string;
};

function priorStepsFrom(job: JobPayload | null) {
  if (!job) return undefined;
  return job.steps.map((step) => ({
    id: step.id,
    status: step.status,
    imageUrl: step.imageUrl,
    dstId: step.dstId,
  }));
}

export function StyleStudio() {
  const runtime = useRuntimeStatus();
  const demoMode = runtime?.demoMode;
  const inputRef = useRef<HTMLInputElement>(null);
  const [occasion, setOccasion] = useState<Occasion>("diwali");
  const [budget, setBudget] = useState(DEFAULT_BUDGET);
  const [imageHash, setImageHash] = useState<string | null>(SAMPLE_PHOTO_HASH);
  const [previewUrl, setPreviewUrl] = useState(DEMO_SELFIE);
  const [uploading, setUploading] = useState(false);
  const [job, setJob] = useState<JobPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [offerSample, setOfferSample] = useState(false);
  const [swapCategory, setSwapCategory] = useState<Category | null>(null);
  const [added, setAdded] = useState(false);

  const usingSample = imageHash === SAMPLE_PHOTO_HASH;
  const playbackGen = useRef(0);
  const liveJobId =
    job && job.status === "running" && !isCapturedPlayback(job)
      ? job.jobId
      : null;

  useEffect(() => {
    if (!liveJobId) return;
    let cancelled = false;
    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/look/${liveJobId}`);
      const next = (await response.json()) as JobPayload & ApiError;
      if (cancelled) return;
      if (!response.ok) {
        setMessage(next.error ?? "Lost the render job.");
        setOfferSample(Boolean(next.offerSample));
        setBusy(false);
        return;
      }
      setJob(next);
      if (next.status === "error") {
        setBusy(false);
        return;
      }
      if (next.status !== "running") setBusy(false);
    }, 900);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [liveJobId]);

  function loadSamplePhoto() {
    playbackGen.current += 1;
    setImageHash(SAMPLE_PHOTO_HASH);
    setPreviewUrl(DEMO_SELFIE);
    setJob(null);
    setAdded(false);
    setOfferSample(false);
    setMessage(null);
  }

  async function onFile(file: File) {
    setUploading(true);
    setMessage(null);
    setOfferSample(false);
    const body = new FormData();
    body.set("file", file);
    const response = await fetch("/api/upload", { method: "POST", body });
    const data = (await response.json()) as {
      hash?: string;
      previewUrl?: string;
      error?: string;
    };
    setUploading(false);
    if (!response.ok || !data.hash || !data.previewUrl) {
      setMessage(data.error ?? "Could not read that photo.");
      return;
    }
    setImageHash(data.hash);
    setPreviewUrl(data.previewUrl);
    setJob(null);
    setAdded(false);
  }

  async function startJob(
    look?: LookIds,
    fromStep?: ChainStep,
    overrides?: { hash?: string; preview?: string; prior?: JobPayload | null },
  ) {
    const hash = overrides?.hash ?? imageHash;
    const preview = overrides?.preview ?? previewUrl;
    const priorJob = overrides?.prior === undefined ? job : overrides.prior;
    const gen = ++playbackGen.current;
    if (!hash) {
      setMessage("Upload a chest-up selfie, or use the sample.");
      return;
    }
    setBusy(true);
    setAdded(false);
    setMessage(null);
    setOfferSample(false);
    const response = await fetch("/api/look", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageHash: hash,
        occasion,
        budget,
        look,
        fromStep,
        selfiePreviewUrl: preview,
        priorSteps: look ? priorStepsFrom(priorJob) : undefined,
      }),
    });
    const data = (await response.json()) as JobPayload & ApiError;
    if (!response.ok) {
      setBusy(false);
      setMessage(data.error ?? "Could not start the look.");
      setOfferSample(Boolean(data.offerSample));
      return;
    }
    if (capturedStepsReady(data)) {
      await playCapturedLook(data, gen);
      return;
    }
    if (playbackGen.current !== gen) return;
    setJob(data);
    if (data.status !== "running") setBusy(false);
  }

  async function playCapturedLook(finalJob: JobPayload, gen: number) {
    prefetchUrls([
      finalJob.selfiePreviewUrl,
      ...finalJob.steps.map((step) => step.imageUrl),
    ]);
    const runningCount = stepsFrom(finalJob.fromStep).length;
    setBusy(true);
    for (let index = 0; index < runningCount; index += 1) {
      if (playbackGen.current !== gen) return;
      setJob(demoPlaybackFrame(finalJob, index));
      await new Promise((resolve) => window.setTimeout(resolve, DEMO_STEP_MS));
    }
    if (playbackGen.current !== gen) return;
    setJob(finalJob);
    setBusy(false);
  }

  function addToCart() {
    if (!job || !job.finalImageUrl) return;
    const entry: CartLook = {
      id: job.jobId,
      occasion: job.occasion,
      budget: job.budget,
      ids: job.look,
      items: job.items,
      total: job.total,
      beforeUrl: job.selfiePreviewUrl,
      afterUrl: job.finalImageUrl,
      addedAt: Date.now(),
    };
    const next = [entry, ...readCart().filter((item) => item.id !== entry.id)];
    writeCart(next);
    setAdded(true);
  }

  const lookItems = job?.items ?? [];
  const swapping = swapCategory
    ? lookItems.find((item) => item.category === swapCategory)
    : undefined;
  const swapOptions = useMemo(() => {
    if (!swapCategory) return [];
    return itemsInCategory(swapCategory).filter((item) =>
      item.occasions.includes(occasion),
    );
  }, [swapCategory, occasion]);

  const resultSrc = job?.finalImageUrl || job?.currentImageUrl || previewUrl;
  const failedStep = job?.steps.find((step) => step.status === "error");
  const liveLeft =
    demoMode === false && runtime
      ? Math.min(
          runtime.globalRemaining ?? runtime.globalDailyCap,
          runtime.ipRemaining ?? runtime.dailyIpCap,
        )
      : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <section className="space-y-4">
        {job?.finalImageUrl ? (
          <BeforeAfter
            beforeSrc={job.selfiePreviewUrl}
            afterSrc={job.finalImageUrl}
            beforeLabel="Your photo"
            afterLabel="Full look"
          />
        ) : (
          <div className="overflow-hidden rounded-[28px] border border-gold/40 bg-cream-deep">
            <SafeImage
              src={resultSrc}
              alt="Look preview"
              className="aspect-[3/4] w-full"
            />
          </div>
        )}
        <div className="grid grid-cols-4 gap-2">
          {CHAIN_STEPS.map((step) => {
            const meta = job?.steps.find((item) => item.id === step);
            const status = meta?.status ?? "pending";
            return (
              <div
                key={step}
                className={cn(
                  "rounded-2xl border px-2 py-2 text-center",
                  status === "success" || status === "cached"
                    ? "border-gold bg-gold-soft/20"
                    : status === "running"
                      ? "border-saffron bg-saffron/10"
                      : status === "skipped"
                        ? "border-gold/50 bg-gold-soft/10"
                        : status === "error"
                        ? "border-maroon bg-maroon/10"
                        : "border-gold/20 bg-white/40",
                )}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-maroon">
                  {STEP_META[step].label}
                </p>
                <p className="mt-1 text-[11px] text-ink/70">
                  {status === "running" ? (
                    <Loader2 className="mx-auto size-3.5 animate-spin" />
                  ) : status === "success" || status === "cached" ? (
                    <Check className="mx-auto size-3.5 text-saffron" />
                  ) : status === "skipped" ? (
                    "skip"
                  ) : status === "error" ? (
                    <span className="inline-flex flex-col items-center gap-0.5 text-maroon">
                      <X className="size-3.5" />
                      failed
                    </span>
                  ) : (
                    `${STEP_META[step].units}u`
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-6">
        <div>
          <Badge>Chest-up selfie</Badge>
          <h1 className="mt-3 font-display text-4xl text-maroon">
            Style a look within {formatInr(budget)}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-ink/75">
            {demoMode === true
              ? "Demo mode is on — real YouCam renders, no units spent. Clothes, then hair, then earrings, then lipstick."
              : demoMode === false && usingSample
                ? "Live YouCam is on, but the sample photo uses the captured chain at zero units. Upload your own selfie to spend the live balance."
                : demoMode === false
                  ? "Live YouCam: clothes, then hair, then earrings, then lipstick. Hair runs before jewellery so it cannot wipe the earrings."
                  : "Clothes, then hair, then earrings, then lipstick. Hair runs before jewellery so it cannot wipe the earrings."}
          </p>
          {demoMode === false && liveLeft !== null ? (
            <p className="mt-2 text-xs text-ink/55">
              {liveLeft} live look
              {liveLeft === 1 ? "" : "s"} left today on this site
              {runtime
                ? ` · ${runtime.globalRemaining ?? "—"} global / ${runtime.ipRemaining ?? "—"} on this device`
                : ""}
              .
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={uploading || busy}
          >
            <Upload className="size-4" />
            {uploading ? "Reading…" : "Upload selfie"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => loadSamplePhoto()}
          >
            Use sample photo
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onFile(file);
            }}
          />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-maroon">
            Occasion
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {OCCASIONS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setOccasion(id);
                  setJob(null);
                  setAdded(false);
                }}
                className={cn(
                  "rounded-2xl border px-3 py-3 text-left",
                  occasion === id
                    ? "border-saffron bg-saffron/10"
                    : "border-gold/30 bg-white/50 hover:border-gold",
                )}
              >
                <span className="block text-sm font-semibold text-maroon">
                  {OCCASION_COPY[id].label}
                </span>
                <span className="mt-1 block text-[11px] text-ink/60">
                  {OCCASION_COPY[id].kicker}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-end justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-maroon">
              Budget
            </p>
            <p className="font-display text-2xl text-saffron">{formatInr(budget)}</p>
          </div>
          <input
            type="range"
            min={BUDGET_MIN}
            max={BUDGET_MAX}
            step={100}
            value={budget}
            onChange={(event) => {
              setBudget(Number(event.target.value));
              setAdded(false);
            }}
            className="mt-3 w-full accent-saffron"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {BUDGET_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setBudget(preset)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs",
                  budget === preset
                    ? "border-maroon bg-maroon text-ivory"
                    : "border-gold/40 text-ink/70",
                )}
              >
                {formatInr(preset)}
              </button>
            ))}
          </div>
        </div>

        <Button
          type="button"
          onClick={() => void startJob()}
          disabled={busy}
          className="w-full py-3"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {busy ? "Rendering the look…" : "Generate the look"}
        </Button>

        {message ? (
          <div className="space-y-3 rounded-2xl border border-maroon/30 bg-maroon/8 px-4 py-3 text-sm text-maroon">
            <p>{message}</p>
            {offerSample ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="maroon"
                  className="px-4 py-1.5 text-xs"
                  onClick={() => {
                    loadSamplePhoto();
                    void startJob(undefined, undefined, {
                      hash: SAMPLE_PHOTO_HASH,
                      preview: DEMO_SELFIE,
                      prior: null,
                    });
                  }}
                >
                  Try the sample photo
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        {job ? (
          <div className="space-y-4 rounded-[28px] border border-gold/40 bg-white/70 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-saffron">
                  {OCCASION_COPY[job.occasion].label} look
                </p>
                <p className="font-display text-2xl text-maroon">
                  {formatInr(job.total)}
                  <span className="ml-2 text-base text-ink/50">
                    of {formatInr(job.budget)}
                  </span>
                </p>
              </div>
              <Badge>
                {job.samplePhoto
                  ? "Sample · 0 units"
                  : `${job.unitsUsed}/${job.unitsPlanned} units`}
              </Badge>
            </div>
            {job.status === "error" ? (
              <div className="space-y-3 rounded-2xl border border-maroon/40 bg-maroon/8 px-4 py-3">
                <p className="text-sm font-semibold text-maroon">
                  {failedStep
                    ? `${failedStep.label} could not finish.`
                    : "This look could not finish."}
                </p>
                <p className="text-sm leading-6 text-ink/75">
                  {job.error || failedStep?.error || "YouCam returned an error."}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    className="px-4 py-1.5 text-xs"
                    disabled={busy}
                    onClick={() => void startJob(job.look, job.fromStep)}
                  >
                    <RotateCcw className="size-3.5" />
                    Try this look again
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="px-4 py-1.5 text-xs"
                    disabled={busy}
                    onClick={() => {
                      loadSamplePhoto();
                      void startJob(undefined, undefined, {
                        hash: SAMPLE_PHOTO_HASH,
                        preview: DEMO_SELFIE,
                        prior: null,
                      });
                    }}
                  >
                    Use the sample photo
                  </Button>
                </div>
              </div>
            ) : null}
            {job.note ? (
              <p className="rounded-2xl border border-gold/40 bg-gold-soft/20 px-4 py-3 text-sm text-maroon">
                {job.note}
              </p>
            ) : null}
            {!job.withinBudget ? (
              <p className="text-sm text-saffron">
                This occasion look is {formatInr(Math.abs(job.leftover))} over the
                budget you set.
              </p>
            ) : (
              <p className="text-sm text-ink/70">
                {formatInr(Math.max(0, job.leftover))} left in the budget.
              </p>
            )}
            <ul className="space-y-3">
              {job.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl bg-cream px-2 py-2"
                >
                  <SafeImage
                    src={item.image}
                    alt={item.name}
                    className="size-14 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-saffron">
                      {CATEGORY_LABEL[item.category]}
                    </p>
                    <p className="truncate font-medium text-ink">{item.name}</p>
                    <p className="text-xs text-ink/60">{formatInr(item.priceInr)}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="px-3 py-1.5 text-xs"
                    disabled={busy}
                    onClick={() => setSwapCategory(item.category)}
                  >
                    Swap
                  </Button>
                </li>
              ))}
            </ul>
            <Button
              type="button"
              variant="maroon"
              className="w-full py-3"
              disabled={!job.finalImageUrl || added}
              onClick={addToCart}
            >
              {added ? "Added to cart" : "Add the whole look to cart"}
            </Button>
            <p className="text-xs leading-5 text-ink/55">
              One tap puts all four pieces in the cart. You would otherwise have
              bought them blind.
            </p>
          </div>
        ) : null}
      </section>

      {swapCategory && swapping && job ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div className="max-h-[86vh] w-full max-w-lg overflow-auto rounded-[28px] bg-cream p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl text-maroon">
                Swap {swapCategory}
              </h2>
              <button type="button" onClick={() => setSwapCategory(null)}>
                <X className="size-5" />
              </button>
            </div>
            <p className="mt-1 text-sm text-ink/65">
              Remaining for this piece:{" "}
              {formatInr(remainingBudget(job.budget, job.items, swapping))}
            </p>
            <ul className="mt-4 space-y-2">
              {swapOptions.map((option) => {
                const fits =
                  option.priceInr <=
                  remainingBudget(job.budget, job.items, swapping);
                const selected = option.id === swapping.id;
                return (
                  <li key={option.id}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        const nextLook = withSwappedItem(job.look, option);
                        setSwapCategory(null);
                        void startJob(nextLook, categoryToStep(option.category));
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left",
                        selected
                          ? "border-saffron bg-saffron/10"
                          : "border-gold/30 bg-white/70",
                      )}
                    >
                      <SafeImage
                        src={option.image}
                        alt={option.name}
                        className="size-14 rounded-xl"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{option.name}</span>
                        <span className="block text-xs text-ink/60">
                          {formatInr(option.priceInr)}
                          {fits ? "" : " · over remaining budget"}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
