/**
 * RetroGameCoders API Service
 * Handles authentication, projects, and file synchronization
 * API Documentation: https://api.retrogamecoders.com/docs.openapi
 */

import { getCookie, setCookie } from "../common/util";
import { FileData } from "../common/workertypes";
import { ProjectFilesystem } from "./project";

const API_BASE_URL = 'https://api.retrogamecoders.com';

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

export interface ApiProject {
  id: string;
  title: string;
  description?: string;
  public: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ApiFile {
  id: string;
  project_id?: string;
  title: string;
  content: string;
  language?: string;
  public: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ApiRevision {
  id: string;
  file_id: string;
  content: string;
  created_at: string;
}

export interface ApiAuthResponse {
  token: string;
  user: ApiUser;
}

export class RetroGameCodersApiService {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    // Load token from cookie if available
    this.authToken = getCookie('__rgc_api_token');
  }

  /**
   * Get authentication token
   */
  getToken(): string | null {
    return this.authToken;
  }

  /**
   * Set authentication token
   */
  setToken(token: string | null) {
    this.authToken = token;
    if (token) {
      setCookie('__rgc_api_token', token, 365); // Store for 1 year
    } else {
      setCookie('__rgc_api_token', '', -1); // Delete cookie
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.authToken;
  }

  /**
   * Make authenticated API request
   */
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    };

    // Add auth token if available
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorData.message || `API request failed: ${response.status} ${response.statusText}`);
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    }

    return null as T;
  }

  // ==================== Authentication ====================

  /**
   * Register a new user
   */
  async register(name: string, email: string, password: string): Promise<ApiAuthResponse> {
    const response = await this.apiRequest<ApiAuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  /**
   * Login user and get token
   */
  async login(email: string, password: string): Promise<ApiAuthResponse> {
    const response = await this.apiRequest<ApiAuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  /**
   * Get authenticated user
   */
  async getUser(): Promise<ApiUser> {
    return this.apiRequest<ApiUser>('/api/auth/user');
  }

  /**
   * Update user profile
   */
  async updateUser(data: {
    name?: string;
    email?: string;
    password?: string;
    avatar_url?: string;
  }): Promise<ApiUser> {
    return this.apiRequest<ApiUser>('/api/auth/user', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Logout (revoke current token)
   */
  async logout(): Promise<void> {
    try {
      await this.apiRequest('/api/auth/logout', {
        method: 'POST',
      });
    } finally {
      this.setToken(null);
    }
  }

  /**
   * Send password reset link
   */
  async forgotPassword(email: string): Promise<void> {
    return this.apiRequest('/api/auth/password/forgot', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, email: string, password: string): Promise<void> {
    return this.apiRequest('/api/auth/password/reset', {
      method: 'POST',
      body: JSON.stringify({ token, email, password }),
    });
  }

  /**
   * Social login (Google, GitHub)
   */
  async socialLogin(provider: 'google' | 'github', token: string): Promise<ApiAuthResponse> {
    const response = await this.apiRequest<ApiAuthResponse>(`/api/auth/social/${provider}`, {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  // ==================== Projects ====================

  /**
   * Get all user's projects
   */
  async getProjects(): Promise<ApiProject[]> {
    return this.apiRequest<ApiProject[]>('/api/projects');
  }

  /**
   * Get a specific project
   */
  async getProject(projectId: string): Promise<ApiProject> {
    return this.apiRequest<ApiProject>(`/api/projects/${projectId}`);
  }

  /**
   * Create a new project
   */
  async createProject(data: {
    title: string;
    description?: string;
    public?: boolean;
  }): Promise<ApiProject> {
    return this.apiRequest<ApiProject>('/api/projects', {
      method: 'POST',
      body: JSON.stringify({
        title: data.title,
        description: data.description || null,
        public: data.public !== undefined ? data.public : false,
      }),
    });
  }

  /**
   * Update a project
   */
  async updateProject(projectId: string, data: {
    title?: string;
    description?: string;
    public?: boolean;
  }): Promise<ApiProject> {
    return this.apiRequest<ApiProject>(`/api/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: string): Promise<void> {
    return this.apiRequest(`/api/projects/${projectId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get all files for a project
   */
  async getProjectFiles(projectId: string): Promise<ApiFile[]> {
    return this.apiRequest<ApiFile[]>(`/api/projects/${projectId}/files`);
  }

  // ==================== Files ====================

  /**
   * Get all user's files
   */
  async getFiles(): Promise<ApiFile[]> {
    return this.apiRequest<ApiFile[]>('/api/files');
  }

  /**
   * Get a specific file
   */
  async getFile(fileId: string): Promise<ApiFile> {
    return this.apiRequest<ApiFile>(`/api/files/${fileId}`);
  }

  /**
   * Create a new file
   */
  async createFile(data: {
    title: string;
    content: string;
    language?: string;
    project_id?: string;
    public?: boolean;
  }): Promise<ApiFile> {
    return this.apiRequest<ApiFile>('/api/files', {
      method: 'POST',
      body: JSON.stringify({
        title: data.title,
        content: data.content,
        language: data.language || null,
        project_id: data.project_id || null,
        public: data.public !== undefined ? data.public : false,
      }),
    });
  }

  /**
   * Update a file
   */
  async updateFile(fileId: string, data: {
    title?: string;
    content?: string;
    language?: string;
    project_id?: string;
    public?: boolean;
  }): Promise<ApiFile> {
    return this.apiRequest<ApiFile>(`/api/files/${fileId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string): Promise<void> {
    return this.apiRequest(`/api/files/${fileId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get all revisions for a file
   */
  async getFileRevisions(fileId: string): Promise<ApiRevision[]> {
    return this.apiRequest<ApiRevision[]>(`/api/files/${fileId}/revisions`);
  }

  /**
   * Revert file to a specific revision
   */
  async revertFile(fileId: string, revisionId: string): Promise<ApiFile> {
    return this.apiRequest<ApiFile>(`/api/files/${fileId}/revert/${revisionId}`, {
      method: 'POST',
    });
  }

  // ==================== Sync Helpers ====================

  /**
   * Push all project files to server (create or update)
   */
  async pushProjectFiles(
    projectId: string,
    files: { [path: string]: FileData }
  ): Promise<{ [path: string]: ApiFile }> {
    const projectFiles = await this.getProjectFiles(projectId);
    const fileMap: { [title: string]: ApiFile } = {};
    
    // Create map of existing files by title
    for (const file of projectFiles) {
      fileMap[file.title] = file;
    }

    const results: { [path: string]: ApiFile } = {};

    // Create or update each file
    for (const [path, content] of Object.entries(files)) {
      const title = path; // Use path as title for now
      const contentStr = typeof content === 'string' ? content : new TextDecoder().decode(content);
      
      if (fileMap[title]) {
        // Update existing file
        results[path] = await this.updateFile(fileMap[title].id, {
          content: contentStr,
        });
      } else {
        // Create new file
        results[path] = await this.createFile({
          title,
          content: contentStr,
          project_id: projectId,
        });
      }
    }

    return results;
  }

  /**
   * Pull all project files from server
   */
  async pullProjectFiles(projectId: string): Promise<{ [path: string]: FileData }> {
    const files = await this.getProjectFiles(projectId);
    const result: { [path: string]: FileData } = {};

    for (const file of files) {
      result[file.title] = file.content;
    }

    return result;
  }
}

// Singleton instance
let apiService: RetroGameCodersApiService | null = null;

/**
 * Get or create the API service instance
 */
export function getApiService(): RetroGameCodersApiService {
  if (!apiService) {
    apiService = new RetroGameCodersApiService();
  }
  return apiService;
}

