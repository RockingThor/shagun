import sharp from "sharp";

const MAX_SIDE = 1024;
const JPEG_QUALITY = 93;

export async function prepareJpeg(
  bytes: Buffer,
  { maxSide = MAX_SIDE, quality = JPEG_QUALITY } = {},
): Promise<{ bytes: Buffer; contentType: "image/jpeg"; fileName: string }> {
  const image = sharp(bytes, { failOn: "none" }).rotate();
  const meta = await image.metadata();
  const width = meta.width ?? maxSide;
  const height = meta.height ?? maxSide;
  const longest = Math.max(width, height);
  const resized =
    longest > maxSide
      ? image.resize({
          width: width >= height ? maxSide : undefined,
          height: height > width ? maxSide : undefined,
          fit: "inside",
          withoutEnlargement: true,
        })
      : image;
  const jpeg = await resized.jpeg({ quality, mozjpeg: true }).toBuffer();
  return { bytes: jpeg, contentType: "image/jpeg", fileName: "frame.jpg" };
}

export async function fetchAsJpeg(url: string): Promise<{
  bytes: Buffer;
  contentType: "image/jpeg";
  fileName: string;
}> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not download YouCam result (${response.status})`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  return prepareJpeg(bytes);
}
