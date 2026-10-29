import { getJob, serializeJob, tickJob } from "@/lib/look/jobs";
import { SAMPLE_PHOTO_HASH } from "@/lib/look/sample";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const job = await getJob(jobId);
  if (!job) {
    return Response.json(
      {
        error:
          "This look paused after a refresh. Generate it again — we will reuse cached frames when we have them.",
        offerSample: true,
        samplePhotoHash: SAMPLE_PHOTO_HASH,
        code: "job_missing",
      },
      { status: 404 },
    );
  }
  const next = await tickJob(job);
  return Response.json(serializeJob(next));
}
