/**
 * KSS Project Service (KSS.Service.Project).
 * Server-side only. Base URL from PROJECT_API_BASE_URL. JWT Bearer required.
 *
 * Phase 0 exposes read-only lookups (worksites + projects, with translations)
 * used by Cash Advance pickers. Generic BaseController route:
 *   list = GET /Api/{Entity}/ToListAll
 */

function getBaseUrl(): string {
  const baseUrl = process.env.PROJECT_API_BASE_URL;
  if (!baseUrl) {
    throw new Error('PROJECT_API_BASE_URL environment variable is required but not set.');
  }
  return baseUrl;
}

async function req<T>(token: string, method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    let message = errorText;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed?.message) message = String(parsed.message);
    } catch {
      /* keep raw text */
    }
    throw new Error(message || `Request failed: ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// ============================================
// Worksite (read shapes)
// ============================================

export interface WorksiteView {
  id: string;
  projectId: string;
  code: string;
  supervisorPersonId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface WorksiteTranslationView {
  worksiteId: string;
  languageId: number;
  name: string;
}

export interface ProjectView {
  id: string;
  code: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface ProjectTranslationView {
  projectId: string;
  languageId: number;
  name: string;
}

// ============================================
// Write shapes (Insert / Update DTOs)
// One DTO per operation — Insert never carries a backend-generated id.
// ============================================

export interface ProjectInsert {
  code: string;
  isActive: boolean;
}

export interface ProjectUpdate {
  id: string;
  code: string;
  isActive: boolean;
}

export interface ProjectTranslationInsert {
  projectId: string;
  languageId: number;
  name: string;
}

export interface ProjectTranslationUpdate {
  projectId: string;
  languageId: number;
  name: string;
}

export interface WorksiteInsert {
  projectId: string;
  code: string;
  supervisorPersonId: string | null;
  isActive: boolean;
}

export interface WorksiteUpdate {
  id: string;
  projectId: string;
  code: string;
  supervisorPersonId: string | null;
  isActive: boolean;
}

export interface WorksiteTranslationInsert {
  worksiteId: string;
  languageId: number;
  name: string;
}

export interface WorksiteTranslationUpdate {
  worksiteId: string;
  languageId: number;
  name: string;
}

// ============================================
// Read funcs (used by Cash Advance pickers — DO NOT rename)
// ============================================

export const listWorksites = (token: string) =>
  req<WorksiteView[]>(token, 'GET', `/Api/Worksite/ToListAll`);

export const listWorksiteTranslations = (token: string) =>
  req<WorksiteTranslationView[]>(token, 'GET', `/Api/WorksiteTranslation/ToListAll`);

export const listProjects = (token: string) =>
  req<ProjectView[]>(token, 'GET', `/Api/Project/ToListAll`);

export const listProjectTranslations = (token: string) =>
  req<ProjectTranslationView[]>(token, 'GET', `/Api/ProjectTranslation/ToListAll`);

// ============================================
// Project — write (GUID key)
// ============================================

export const createProject = (token: string, dto: ProjectInsert) =>
  req<ProjectView>(token, 'POST', `/Api/Project/AddDto`, dto);

export const updateProject = (token: string, dto: ProjectUpdate) =>
  req<ProjectView>(token, 'PUT', `/Api/Project/UpdateDto`, dto);

export const removeProject = (token: string, entity: ProjectView | { id: string }) =>
  req<void>(token, 'DELETE', `/Api/Project/Remove`, entity);

// ============================================
// ProjectTranslation — write (composite key projectId + languageId)
// ============================================

export const createProjectTranslation = (token: string, dto: ProjectTranslationInsert) =>
  req<ProjectTranslationView>(token, 'POST', `/Api/ProjectTranslation/AddDto`, dto);

export const updateProjectTranslation = (token: string, dto: ProjectTranslationUpdate) =>
  req<ProjectTranslationView>(token, 'PUT', `/Api/ProjectTranslation/UpdateDto`, dto);

export const removeProjectTranslation = (
  token: string,
  entity: ProjectTranslationView | { projectId: string; languageId: number },
) => req<void>(token, 'DELETE', `/Api/ProjectTranslation/Remove`, entity);

// ============================================
// Worksite — write (GUID key)
// ============================================

export const createWorksite = (token: string, dto: WorksiteInsert) =>
  req<WorksiteView>(token, 'POST', `/Api/Worksite/AddDto`, dto);

export const updateWorksite = (token: string, dto: WorksiteUpdate) =>
  req<WorksiteView>(token, 'PUT', `/Api/Worksite/UpdateDto`, dto);

export const removeWorksite = (token: string, entity: WorksiteView | { id: string }) =>
  req<void>(token, 'DELETE', `/Api/Worksite/Remove`, entity);

// ============================================
// WorksiteTranslation — write (composite key worksiteId + languageId)
// ============================================

export const createWorksiteTranslation = (token: string, dto: WorksiteTranslationInsert) =>
  req<WorksiteTranslationView>(token, 'POST', `/Api/WorksiteTranslation/AddDto`, dto);

export const updateWorksiteTranslation = (token: string, dto: WorksiteTranslationUpdate) =>
  req<WorksiteTranslationView>(token, 'PUT', `/Api/WorksiteTranslation/UpdateDto`, dto);

export const removeWorksiteTranslation = (
  token: string,
  entity: WorksiteTranslationView | { worksiteId: string; languageId: number },
) => req<void>(token, 'DELETE', `/Api/WorksiteTranslation/Remove`, entity);
