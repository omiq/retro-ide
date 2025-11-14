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
  filetype?: string;  // MIME-style: "platform/filetype" or "tool/filetype" (e.g., "c64/c", "bbc/basic", "pixelart/png")
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

    let response: Response;
    try {
      console.log('API Request:', options.method || 'GET', url);
      response = await fetch(url, {
        ...options,
        headers,
      });
      console.log('API Response:', response.status, response.statusText);
    } catch (error: any) {
      // Handle network errors (CORS, connection refused, etc.)
      const errorMessage = error.message || 'Network error';
      console.error('API Request failed:', error);
      
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        const origin = window.location.origin;
        const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
        
        let corsNote = '';
        if (isLocalhost) {
          corsNote = 
            `\n⚠️ You're running on localhost (${origin})\n` +
            `The API server needs to allow requests from localhost for local development.\n\n` +
            `Add to your API server CORS configuration:\n` +
            `- Access-Control-Allow-Origin: ${origin}\n` +
            `- Or for development: Access-Control-Allow-Origin: *\n\n`;
        } else {
          corsNote = 
            `The API server at ${this.baseUrl} needs to allow requests from:\n` +
            `${origin}\n\n`;
        }
        
        const detailedError = 
          `Cannot connect to API server.\n\n` +
          `URL: ${url}\n` +
          `Origin: ${origin}\n` +
          `Error: ${errorMessage}\n\n` +
          `This is likely a CORS (Cross-Origin Resource Sharing) issue.\n` +
          corsNote +
          `Please check:\n` +
          `- CORS headers are configured on the API server\n` +
          `- The API server allows requests from your IDE domain (including localhost for development)\n` +
          `- Check browser console (F12) for more details\n` +
          `- Check Network tab to see the actual request/response`;
        throw new Error(detailedError);
      }
      throw new Error(`Network error: ${errorMessage}`);
    }

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
      } catch (e) {
        // If response isn't JSON, try to get text
        try {
          const text = await response.text();
          if (text) errorMessage = text;
        } catch (e2) {
          // Ignore
        }
      }
      throw new Error(errorMessage);
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
   * Note: password_confirmation should match password (validated client-side before calling this)
   */
  async register(name: string, email: string, password: string, passwordConfirmation?: string): Promise<ApiAuthResponse> {
    const body: any = { name, email, password };
    // Include password_confirmation if provided (API may require it)
    if (passwordConfirmation !== undefined) {
      body.password_confirmation = passwordConfirmation;
    }
    
    const response = await this.apiRequest<ApiAuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
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
    filetype?: string;  // MIME-style: "platform/filetype" or "tool/filetype"
    language?: string;
    project_id?: string;
    public?: boolean;
  }): Promise<ApiFile> {
    return this.apiRequest<ApiFile>('/api/files', {
      method: 'POST',
      body: JSON.stringify({
        title: data.title,
        content: data.content,
        filetype: data.filetype || null,
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
    filetype?: string;  // MIME-style: "platform/filetype" or "tool/filetype"
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
   * @param projectId - Project ID
   * @param files - Map of file paths to file data
   * @param filetypes - Optional map of file paths to MIME-style filetypes (e.g., "c64/c", "bbc/basic")
   */
  async pushProjectFiles(
    projectId: string,
    files: { [path: string]: FileData },
    filetypes?: { [path: string]: string }
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
      const filetype = filetypes?.[path];
      
      if (fileMap[title]) {
        // Update existing file
        results[path] = await this.updateFile(fileMap[title].id, {
          content: contentStr,
          filetype: filetype,
        });
      } else {
        // Create new file
        results[path] = await this.createFile({
          title,
          content: contentStr,
          filetype: filetype,
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
    console.log('pullProjectFiles: Got', files.length, 'files from API');
    const result: { [path: string]: FileData } = {};

    for (const file of files) {
      console.log('pullProjectFiles: Processing file', file.title, 'content length:', file.content?.length || 0);
      result[file.title] = file.content;
    }

    console.log('pullProjectFiles: Returning', Object.keys(result).length, 'files:', Object.keys(result));
    return result;
  }
}

/**
 * ProjectFilesystem implementation using RetroGameCoders API
 */
export class ApiProjectFilesystem implements ProjectFilesystem {
  private api: RetroGameCodersApiService;
  private projectId: string;
  private fileCache: { [path: string]: ApiFile } = {};

  constructor(api: RetroGameCodersApiService, projectId: string) {
    this.api = api;
    this.projectId = projectId;
  }

  async getFileData(path: string): Promise<FileData> {
    // Check cache first
    if (this.fileCache[path]) {
      return this.fileCache[path].content;
    }

    // Try to find file in project
    const files = await this.api.getProjectFiles(this.projectId);
    const file = files.find(f => f.title === path);
    
    if (file) {
      this.fileCache[path] = file;
      return file.content;
    }

    return null;
  }

  async setFileData(path: string, data: FileData): Promise<void> {
    const content = typeof data === 'string' ? data : new TextDecoder().decode(data);
    
    // Note: filetype would need to be determined here if we had access to platform
    // For now, ApiProjectFilesystem is less commonly used than direct push/pull
    
    if (this.fileCache[path]) {
      // Update existing file
      const updated = await this.api.updateFile(this.fileCache[path].id, {
        content,
      });
      this.fileCache[path] = updated;
    } else {
      // Create new file
      const created = await this.api.createFile({
        title: path,
        content,
        project_id: this.projectId,
      });
      this.fileCache[path] = created;
    }
  }

  /**
   * Clear the file cache
   */
  clearCache() {
    this.fileCache = {};
  }

  /**
   * Preload all project files into cache
   */
  async preloadFiles(): Promise<void> {
    const files = await this.api.getProjectFiles(this.projectId);
    this.fileCache = {};
    for (const file of files) {
      this.fileCache[file.title] = file;
    }
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

