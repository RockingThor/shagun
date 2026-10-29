export type YouCamFileRequest = {
  content_type: string;
  file_name: string;
  file_size: number;
};

export type YouCamUploadedFile = {
  file_id: string;
  content_type?: string;
  file_name?: string;
  requests: Array<{
    method: string;
    url: string;
    headers?: Record<string, string>;
  }>;
};

export type YouCamTaskStatus = "running" | "success" | "error" | string;

export type ParsedTask = {
  taskStatus: YouCamTaskStatus;
  taskId?: string;
  url?: string;
  dstId?: string;
  error?: string;
  raw: unknown;
};

export type ImageSource = {
  fileId?: string;
  url?: string;
};

export type YouCamErrorPayload = {
  status?: number;
  error?: string;
  error_code?: string;
  message?: string;
};
