import { getJob, serializeJob, tickJob } from "@/lib/look/jobs";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const job = getJob(jobId);
  if (!job) {
    return Response.json({ error: "That look is no longer in memory." }, { status: 404 });
  }
  const next = await tickJob(job);
  return Response.json(serializeJob(next));
}
