"use strict";
/**
 * RetroGameCoders API Service
 * Handles authentication, projects, and file synchronization
 * API Documentation: https://api.retrogamecoders.com/docs.openapi
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiProjectFilesystem = exports.RetroGameCodersApiService = void 0;
exports.getApiService = getApiService;
const util_1 = require("../common/util");
const API_BASE_URL = 'https://api.retrogamecoders.com';
class RetroGameCodersApiService {
    constructor(baseUrl = API_BASE_URL) {
        this.authToken = null;
        this.baseUrl = baseUrl;
        // Load token from cookie if available
        this.authToken = (0, util_1.getCookie)('__rgc_api_token');
    }
    /**
     * Get authentication token
     */
    getToken() {
        return this.authToken;
    }
    /**
     * Set authentication token
     */
    setToken(token) {
        this.authToken = token;
        if (token) {
            (0, util_1.setCookie)('__rgc_api_token', token, 365); // Store for 1 year
        }
        else {
            (0, util_1.setCookie)('__rgc_api_token', '', -1); // Delete cookie
        }
    }
    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.authToken;
    }
    /**
     * Make authenticated API request
     */
    async apiRequest(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = Object.assign({ 'Content-Type': 'application/json', 'Accept': 'application/json' }, options.headers);
        // Add auth token if available
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        let response;
        try {
            console.log('API Request:', options.method || 'GET', url);
            response = await fetch(url, Object.assign(Object.assign({}, options), { headers }));
            console.log('API Response:', response.status, response.statusText);
        }
        catch (error) {
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
                }
                else {
                    corsNote =
                        `The API server at ${this.baseUrl} needs to allow requests from:\n` +
                            `${origin}\n\n`;
                }
                const detailedError = `Cannot connect to API server.\n\n` +
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
                }
                else if (errorData.error) {
                    errorMessage = errorData.error;
                }
                else if (typeof errorData === 'string') {
                    errorMessage = errorData;
                }
            }
            catch (e) {
                // If response isn't JSON, try to get text
                try {
                    const text = await response.text();
                    if (text)
                        errorMessage = text;
                }
                catch (e2) {
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
        return null;
    }
    // ==================== Authentication ====================
    /**
     * Register a new user
     * Note: password_confirmation should match password (validated client-side before calling this)
     */
    async register(name, email, password, passwordConfirmation) {
        const body = { name, email, password };
        // Include password_confirmation if provided (API may require it)
        if (passwordConfirmation !== undefined) {
            body.password_confirmation = passwordConfirmation;
        }
        const response = await this.apiRequest('/api/auth/register', {
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
    async login(email, password) {
        const response = await this.apiRequest('/api/auth/login', {
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
    async getUser() {
        return this.apiRequest('/api/auth/user');
    }
    /**
     * Update user profile
     */
    async updateUser(data) {
        return this.apiRequest('/api/auth/user', {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }
    /**
     * Logout (revoke current token)
     */
    async logout() {
        try {
            await this.apiRequest('/api/auth/logout', {
                method: 'POST',
            });
        }
        finally {
            this.setToken(null);
        }
    }
    /**
     * Send password reset link
     */
    async forgotPassword(email) {
        return this.apiRequest('/api/auth/password/forgot', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
    }
    /**
     * Reset password with token
     */
    async resetPassword(token, email, password) {
        return this.apiRequest('/api/auth/password/reset', {
            method: 'POST',
            body: JSON.stringify({ token, email, password }),
        });
    }
    /**
     * Social login (Google, GitHub)
     */
    async socialLogin(provider, token) {
        const response = await this.apiRequest(`/api/auth/social/${provider}`, {
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
    async getProjects() {
        return this.apiRequest('/api/projects');
    }
    /**
     * Get a specific project
     */
    async getProject(projectId) {
        return this.apiRequest(`/api/projects/${projectId}`);
    }
    /**
     * Create a new project
     */
    async createProject(data) {
        return this.apiRequest('/api/projects', {
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
    async updateProject(projectId, data) {
        return this.apiRequest(`/api/projects/${projectId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }
    /**
     * Delete a project
     */
    async deleteProject(projectId) {
        return this.apiRequest(`/api/projects/${projectId}`, {
            method: 'DELETE',
        });
    }
    /**
     * Get all files for a project
     */
    async getProjectFiles(projectId) {
        return this.apiRequest(`/api/projects/${projectId}/files`);
    }
    // ==================== Files ====================
    /**
     * Get all user's files
     */
    async getFiles() {
        return this.apiRequest('/api/files');
    }
    /**
     * Get a specific file
     */
    async getFile(fileId) {
        return this.apiRequest(`/api/files/${fileId}`);
    }
    /**
     * Create a new file
     */
    async createFile(data) {
        return this.apiRequest('/api/files', {
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
    async updateFile(fileId, data) {
        return this.apiRequest(`/api/files/${fileId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }
    /**
     * Delete a file
     */
    async deleteFile(fileId) {
        return this.apiRequest(`/api/files/${fileId}`, {
            method: 'DELETE',
        });
    }
    /**
     * Get all revisions for a file
     */
    async getFileRevisions(fileId) {
        return this.apiRequest(`/api/files/${fileId}/revisions`);
    }
    /**
     * Revert file to a specific revision
     */
    async revertFile(fileId, revisionId) {
        return this.apiRequest(`/api/files/${fileId}/revert/${revisionId}`, {
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
    async pushProjectFiles(projectId, files, filetypes) {
        const projectFiles = await this.getProjectFiles(projectId);
        const fileMap = {};
        // Create map of existing files by title
        for (const file of projectFiles) {
            fileMap[file.title] = file;
        }
        const results = {};
        // Create or update each file
        for (const [path, content] of Object.entries(files)) {
            const title = path; // Use path as title for now
            const contentStr = typeof content === 'string' ? content : new TextDecoder().decode(content);
            const filetype = filetypes === null || filetypes === void 0 ? void 0 : filetypes[path];
            if (fileMap[title]) {
                // Update existing file
                results[path] = await this.updateFile(fileMap[title].id, {
                    content: contentStr,
                    filetype: filetype,
                });
            }
            else {
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
    async pullProjectFiles(projectId) {
        var _a;
        const files = await this.getProjectFiles(projectId);
        console.log('pullProjectFiles: Got', files.length, 'files from API');
        const result = {};
        for (const file of files) {
            console.log('pullProjectFiles: Processing file', file.title, 'content length:', ((_a = file.content) === null || _a === void 0 ? void 0 : _a.length) || 0);
            result[file.title] = file.content;
        }
        console.log('pullProjectFiles: Returning', Object.keys(result).length, 'files:', Object.keys(result));
        return result;
    }
}
exports.RetroGameCodersApiService = RetroGameCodersApiService;
/**
 * ProjectFilesystem implementation using RetroGameCoders API
 */
class ApiProjectFilesystem {
    constructor(api, projectId) {
        this.fileCache = {};
        this.api = api;
        this.projectId = projectId;
    }
    async getFileData(path) {
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
    async setFileData(path, data) {
        const content = typeof data === 'string' ? data : new TextDecoder().decode(data);
        // Note: filetype would need to be determined here if we had access to platform
        // For now, ApiProjectFilesystem is less commonly used than direct push/pull
        if (this.fileCache[path]) {
            // Update existing file
            const updated = await this.api.updateFile(this.fileCache[path].id, {
                content,
            });
            this.fileCache[path] = updated;
        }
        else {
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
    async preloadFiles() {
        const files = await this.api.getProjectFiles(this.projectId);
        this.fileCache = {};
        for (const file of files) {
            this.fileCache[file.title] = file;
        }
    }
}
exports.ApiProjectFilesystem = ApiProjectFilesystem;
// Singleton instance
let apiService = null;
/**
 * Get or create the API service instance
 */
function getApiService() {
    if (!apiService) {
        apiService = new RetroGameCodersApiService();
    }
    return apiService;
}
//# sourceMappingURL=apiservice.js.map