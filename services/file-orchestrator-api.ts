/**
 * KSS File Orchestrator Service
 *
 * ALL file operations go through the orchestrator.
 * The frontend NEVER calls FileStorage instances directly.
 */

function getOrchestratorUrl(): string {
  const url = process.env.FILE_ORCHESTRATOR_API_BASE_URL;
  if (!url) throw new Error('FILE_ORCHESTRATOR_API_BASE_URL is not set.');
  return url;
}

function getHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function throwApiError(response: Response, defaultMessage: string) {
  const errorText = await response.text().catch(() => response.statusText);
  if (response.status === 401) {
    throw new Error('Authentication token expired. Please log in again.');
  }
  let message = defaultMessage;
  try {
    const errorJson = JSON.parse(errorText);
    message = errorJson.message || message;
  } catch {
    message = errorText || message;
  }
  throw new Error(message);
}

// ─── Get available storage instance (returns id for storing in Document table) ───

export async function getAvailableInstance(token: string, category: string) {
  const res = await fetch(
    `${getOrchestratorUrl()}/Api/FileOrchestrator/GetAvailableInstance?category=${encodeURIComponent(category)}`,
    { method: 'GET', headers: getHeaders(token) },
  );
  if (!res.ok) await throwApiError(res, 'No storage instance available');
  return res.json();
}

// ─── Upload file (through orchestrator proxy) ───

export async function uploadFile(
  token: string,
  documentId: string,
  category: string,
  fileData: Buffer,
) {
  const res = await fetch(
    `${getOrchestratorUrl()}/Api/FileOrchestrator/Upload`,
    {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({
        documentId,
        category,
        fileData: fileData.toString('base64'),
      }),
    },
  );
  if (!res.ok) await throwApiError(res, 'Failed to upload file');
  return res.json();
}

// ─── Download file (through orchestrator proxy) ───

export async function downloadFile(
  token: string,
  documentId: string,
  storageInstanceId: number,
) {
  const res = await fetch(
    `${getOrchestratorUrl()}/Api/FileOrchestrator/Download`,
    {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ documentId, storageInstanceId }),
    },
  );
  if (!res.ok) await throwApiError(res, 'Failed to download file');
  const data = await res.json();
  return data.fileData as string | null;
}

// ─── Delete file (through orchestrator proxy) ───

export async function deleteFile(
  token: string,
  documentId: string,
  storageInstanceId: number,
) {
  const res = await fetch(
    `${getOrchestratorUrl()}/Api/FileOrchestrator/DeleteFile`,
    {
      method: 'DELETE',
      headers: getHeaders(token),
      body: JSON.stringify({ documentId, storageInstanceId }),
    },
  );
  if (!res.ok) await throwApiError(res, 'Failed to delete file');
}

// ─── Stats ───

export async function getStorageStats(token: string) {
  const res = await fetch(
    `${getOrchestratorUrl()}/Api/FileOrchestrator/Stats`,
    { method: 'GET', headers: getHeaders(token) },
  );
  if (!res.ok) await throwApiError(res, 'Failed to get storage stats');
  return res.json();
}
