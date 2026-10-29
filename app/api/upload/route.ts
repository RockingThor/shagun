import { hashBuffer, storeUpload } from "@/lib/look/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Choose a chest-up selfie." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: "Keep the photo under 10 MB." },
      { status: 400 },
    );
  }
  const contentType = file.type || "image/jpeg";
  if (!ALLOWED.has(contentType)) {
    return Response.json(
      { error: "Use a JPG or PNG. YouCam rejects most other formats." },
      { status: 400 },
    );
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const hash = hashBuffer(bytes);
  const previewUrl = `data:${contentType};base64,${bytes.toString("base64")}`;
  await storeUpload({
    hash,
    bytes,
    contentType,
    fileName: file.name || "selfie.jpg",
    previewUrl,
  });
  return Response.json({
    hash,
    previewUrl,
    fileName: file.name,
    bytes: file.size,
  });
}
