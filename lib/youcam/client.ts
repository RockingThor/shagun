import { youcamConfig } from "@/lib/youcam/config";
import type {
  ParsedTask,
  YouCamErrorPayload,
  YouCamFileRequest,
  YouCamUploadedFile,
} from "@/lib/youcam/types";

class YouCamApiError extends Error {
  status: number;
  code?: string;
  body: unknown;

  constructor(message: string, status: number, body: unknown, code?: string) {
    super(message);
    this.name = "YouCamApiError";
    this.status = status;
    this.body = body;
    this.code = code;
  }
}

function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function youcamFetch(
  path: string,
  init: RequestInit & { skipAuth?: boolean } = {},
): Promise<unknown> {
  const config = youcamConfig();
  if (!config.apiKey) {
    throw new YouCamApiError("YOUCAM_API_KEY is not set", 401, null);
  }
  const url = path.startsWith("http") ? path : `${config.baseUrl}${path}`;
  const headers = new Headers(init.headers);
  if (!init.skipAuth) {
    headers.set("Authorization", `Bearer ${config.apiKey}`);
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(url, { ...init, headers });
  const body = await readJson(response);
  if (!response.ok) {
    const err = (body ?? {}) as YouCamErrorPayload;
    throw new YouCamApiError(
      err.error || err.message || `YouCam ${response.status}`,
      response.status,
      body,
      err.error_code,
    );
  }
  return body;
}

function firstFile(payload: unknown): YouCamUploadedFile {
  const data = unwrapData<{ files?: YouCamUploadedFile[] }>(payload);
  const file = data.files?.[0];
  if (!file?.file_id || !file.requests?.[0]?.url) {
    throw new YouCamApiError(
      "File API did not return file_id and a PUT URL",
      500,
      payload,
    );
  }
  return file;
}

export async function createYouCamFile(
  meta: YouCamFileRequest,
): Promise<YouCamUploadedFile> {
  const config = youcamConfig();
  const payload = await youcamFetch(config.filePath, {
    method: "POST",
    body: JSON.stringify({ files: [meta] }),
  });
  return firstFile(payload);
}

export async function putYouCamBytes(
  file: YouCamUploadedFile,
  bytes: Buffer,
): Promise<void> {
  const request = file.requests[0];
  const headers = new Headers(request.headers);
  if (!headers.has("Content-Type") && file.content_type) {
    headers.set("Content-Type", file.content_type);
  }
  const response = await fetch(request.url, {
    method: request.method || "PUT",
    headers,
    body: new Uint8Array(bytes),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new YouCamApiError(
      `S3 PUT failed (${response.status})`,
      response.status,
      text,
    );
  }
}

export async function uploadToYouCam(input: {
  bytes: Buffer;
  contentType: string;
  fileName: string;
}): Promise<string> {
  const file = await createYouCamFile({
    content_type: input.contentType,
    file_name: input.fileName,
    file_size: input.bytes.byteLength,
  });
  await putYouCamBytes(file, input.bytes);
  return file.file_id;
}

export async function createYouCamTask(
  featurePath: string,
  body: Record<string, unknown>,
): Promise<string> {
  const payload = await youcamFetch(featurePath, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = unwrapData<{ task_id?: string }>(payload);
  if (!data.task_id) {
    throw new YouCamApiError("Task create did not return task_id", 500, payload);
  }
  return data.task_id;
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

function firstResultObject(results: unknown): Record<string, unknown> | undefined {
  if (!results) return undefined;
  if (Array.isArray(results)) {
    const first = results[0];
    if (first && typeof first === "object") {
      const record = first as Record<string, unknown>;
      if (record.data && typeof record.data === "object") {
        return record.data as Record<string, unknown>;
      }
      return record;
    }
    return undefined;
  }
  if (typeof results === "object") return results as Record<string, unknown>;
  return undefined;
}

export function parseYouCamTask(payload: unknown): ParsedTask {
  const root = (payload ?? {}) as Record<string, unknown>;
  const data = unwrapData<Record<string, unknown>>(payload);
  const result = firstResultObject(data?.results ?? root.results);
  const nested = (result?.data as Record<string, unknown> | undefined) ?? {};
  const errorValue = data?.error ?? root.error ?? result?.error;
  const error =
    typeof errorValue === "string"
      ? errorValue
      : errorValue && typeof errorValue === "object"
        ? pickString(
            (errorValue as Record<string, unknown>).message,
            (errorValue as Record<string, unknown>).error,
            (errorValue as Record<string, unknown>).code,
          )
        : undefined;

  return {
    taskStatus: String(
      data?.task_status ?? root.task_status ?? "running",
    ) as ParsedTask["taskStatus"],
    taskId: pickString(data?.task_id, root.task_id),
    url: pickString(
      result?.url,
      nested.url,
      (data?.results as Record<string, unknown> | undefined)?.url,
    ),
    dstId: pickString(
      result?.dst_id,
      nested.dst_id,
      data?.dst_id,
      root.dst_id,
    ),
    error,
    errorMessage: pickString(
      data?.error_message,
      root.error_message,
      error,
    ),
    raw: payload,
  };
}

export async function getYouCamTask(
  featurePath: string,
  taskId: string,
): Promise<ParsedTask> {
  const payload = await youcamFetch(
    `${featurePath.replace(/\/$/, "")}/${encodeURIComponent(taskId)}`,
    { method: "GET" },
  );
  return parseYouCamTask(payload);
}

export { sourceFields } from "@/lib/youcam/payloads";
export { YouCamApiError };
