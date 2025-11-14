"use strict";
/**
 * RetroGameCoders API Service
 * Handles authentication, projects, and file synchronization
 * API Documentation: https://api.retrogamecoders.com/docs.openapi
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetroGameCodersApiService = void 0;
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
        const response = await fetch(url, Object.assign(Object.assign({}, options), { headers }));
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
        return null;
    }
    // ==================== Authentication ====================
    /**
     * Register a new user
     */
    async register(name, email, password) {
        const response = await this.apiRequest('/api/auth/register', {
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
     */
    async pushProjectFiles(projectId, files) {
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
            if (fileMap[title]) {
                // Update existing file
                results[path] = await this.updateFile(fileMap[title].id, {
                    content: contentStr,
                });
            }
            else {
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
    async pullProjectFiles(projectId) {
        const files = await this.getProjectFiles(projectId);
        const result = {};
        for (const file of files) {
            result[file.title] = file.content;
        }
        return result;
    }
}
exports.RetroGameCodersApiService = RetroGameCodersApiService;
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
//# sourceMappingURL=apiserice.js.map