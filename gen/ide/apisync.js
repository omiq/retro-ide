"use strict";
/**
 * RetroGameCoders API Sync Integration
 * UI functions for authentication, project management, and file synchronization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentApiProjectId = getCurrentApiProjectId;
exports.setCurrentApiProject = setCurrentApiProject;
exports.getCurrentApiProject = getCurrentApiProject;
exports._registerUser = _registerUser;
exports._loginUser = _loginUser;
exports._logoutUser = _logoutUser;
exports.updateApiAuthUI = updateApiAuthUI;
exports.closeApiUserMenu = closeApiUserMenu;
exports.toggleApiUserMenu = toggleApiUserMenu;
exports._createApiProject = _createApiProject;
exports._listApiProjects = _listApiProjects;
exports.bindToApiProject = bindToApiProject;
exports._pushToApi = _pushToApi;
exports._pullFromApi = _pullFromApi;
const apiservice_1 = require("./apiservice");
const dialogs_1 = require("./dialogs");
const analytics_1 = require("./analytics");
const ui_1 = require("./ui");
const util_1 = require("../common/util");
// Store current API project ID in session
let currentApiProjectId = null;
let currentApiProject = null;
/**
 * Determine filetype in MIME-style format: "platform/filetype" or "tool/filetype"
 * Examples: "c64/c", "bbc/basic", "vic20/asm", "pixelart/png"
 */
function determineFiletype(path) {
    if (!ui_1.platform_id || !ui_1.platform) {
        return undefined;
    }
    // Get file extension
    const ext = path.toLowerCase().substring(path.lastIndexOf('.'));
    // Map extensions to file types
    const extensionMap = {
        '.bas': 'basic',
        '.c': 'c',
        '.h': 'c', // Header files are C
        '.asm': 'asm',
        '.s': 'asm', // Assembly
        '.prg': 'prg',
        '.rom': 'rom',
        '.bin': 'bin',
        '.txt': 'text',
        '.json': 'json',
        '.png': 'png',
        '.jpg': 'jpg',
        '.jpeg': 'jpeg',
        '.gif': 'gif',
    };
    const fileType = extensionMap[ext] || ext.substring(1); // Remove dot, use extension as type
    // Return MIME-style: "platform/filetype"
    return `${ui_1.platform_id}/${fileType}`;
}
/**
 * Get current API project ID
 */
function getCurrentApiProjectId() {
    return currentApiProjectId;
}
/**
 * Set current API project
 */
function setCurrentApiProject(project) {
    currentApiProject = project;
    currentApiProjectId = project ? project.id : null;
}
/**
 * Get current API project
 */
function getCurrentApiProject() {
    return currentApiProject;
}
// ==================== Authentication ====================
/**
 * Register a new user
 */
async function _registerUser() {
    const modal = $("#registerApiModal");
    const btn = $("#registerApiButton");
    modal.modal('show');
    btn.off('click').on('click', async () => {
        // Get and trim all values
        const name = ($("#registerApiName").val() + "").trim();
        const email = ($("#registerApiEmail").val() + "").trim();
        const password = ($("#registerApiPassword").val() + "").trim();
        const confirmPassword = ($("#registerApiConfirmPassword").val() + "").trim();
        // Clear any previous error styling
        $("#registerApiPassword, #registerApiConfirmPassword").removeClass('is-invalid');
        // Validate all fields are filled
        if (!name || !email || !password || !confirmPassword) {
            (0, dialogs_1.alertError)("Please fill in all fields.");
            if (!password)
                $("#registerApiPassword").addClass('is-invalid');
            if (!confirmPassword)
                $("#registerApiConfirmPassword").addClass('is-invalid');
            return;
        }
        // Validate password length
        if (password.length < 8) {
            (0, dialogs_1.alertError)("Password must be at least 8 characters.");
            $("#registerApiPassword").addClass('is-invalid');
            return;
        }
        // Validate passwords match
        if (password !== confirmPassword) {
            (0, dialogs_1.alertError)("Passwords do not match. Please check and try again.");
            $("#registerApiPassword").addClass('is-invalid');
            $("#registerApiConfirmPassword").addClass('is-invalid');
            return;
        }
        modal.modal('hide');
        (0, dialogs_1.setWaitDialog)(true);
        try {
            const api = (0, apiservice_1.getApiService)();
            // Pass password_confirmation to API (already validated to match password above)
            const response = await api.register(name, email, password, confirmPassword);
            (0, dialogs_1.setWaitDialog)(false);
            (0, dialogs_1.alertInfo)(`Welcome ${response.user.name}! You are now registered and logged in.`);
            (0, analytics_1.gaEvent)('api', 'register', 'success');
            modal.modal('hide');
            // Refresh UI to show logged-in state
            updateApiAuthUI();
        }
        catch (e) {
            (0, dialogs_1.setWaitDialog)(false);
            (0, dialogs_1.alertError)("Registration failed: " + e.message);
            (0, analytics_1.gaEvent)('api', 'register', 'error');
        }
    });
}
/**
 * Login user
 */
async function _loginUser() {
    const modal = $("#loginApiModal");
    const btn = $("#loginApiButton");
    modal.modal('show');
    btn.off('click').on('click', async () => {
        const email = $("#loginApiEmail").val() + "";
        const password = $("#loginApiPassword").val() + "";
        if (!email || !password) {
            (0, dialogs_1.alertError)("Please enter email and password.");
            return;
        }
        modal.modal('hide');
        (0, dialogs_1.setWaitDialog)(true);
        try {
            const api = (0, apiservice_1.getApiService)();
            const response = await api.login(email, password);
            (0, dialogs_1.setWaitDialog)(false);
            (0, dialogs_1.alertInfo)(`Welcome back, ${response.user.name}!`);
            (0, analytics_1.gaEvent)('api', 'login', 'success');
            updateApiAuthUI();
        }
        catch (e) {
            (0, dialogs_1.setWaitDialog)(false);
            (0, dialogs_1.alertError)("Login failed: " + e.message);
            (0, analytics_1.gaEvent)('api', 'login', 'error');
        }
    });
}
/**
 * Logout user
 */
async function _logoutUser() {
    closeApiUserMenu();
    if (!confirm("Are you sure you want to logout?")) {
        return;
    }
    (0, dialogs_1.setWaitDialog)(true);
    try {
        const api = (0, apiservice_1.getApiService)();
        await api.logout();
        setCurrentApiProject(null);
        (0, dialogs_1.setWaitDialog)(false);
        (0, dialogs_1.alertInfo)("You have been logged out.");
        (0, analytics_1.gaEvent)('api', 'logout', 'success');
        updateApiAuthUI();
    }
    catch (e) {
        (0, dialogs_1.setWaitDialog)(false);
        (0, dialogs_1.alertError)("Logout failed: " + e.message);
    }
}
/**
 * Simple MD5 implementation for Gravatar
 * Based on: https://github.com/blueimp/JavaScript-MD5 (simplified)
 */
function md5(string) {
    function md5cycle(x, k) {
        let a = x[0], b = x[1], c = x[2], d = x[3];
        a = ff(a, b, c, d, k[0], 7, -680876936);
        d = ff(d, a, b, c, k[1], 12, -389564586);
        c = ff(c, d, a, b, k[2], 17, 606105819);
        b = ff(b, c, d, a, k[3], 22, -1044525330);
        a = ff(a, b, c, d, k[4], 7, -176418897);
        d = ff(d, a, b, c, k[5], 12, 1200080426);
        c = ff(c, d, a, b, k[6], 17, -1473231341);
        b = ff(b, c, d, a, k[7], 22, -45705983);
        a = ff(a, b, c, d, k[8], 7, 1770035416);
        d = ff(d, a, b, c, k[9], 12, -1958414417);
        c = ff(c, d, a, b, k[10], 17, -42063);
        b = ff(b, c, d, a, k[11], 22, -1990404162);
        a = ff(a, b, c, d, k[12], 7, 1804603682);
        d = ff(d, a, b, c, k[13], 12, -40341101);
        c = ff(c, d, a, b, k[14], 17, -1502002290);
        b = ff(b, c, d, a, k[15], 22, 1236535329);
        a = gg(a, b, c, d, k[1], 5, -165796510);
        d = gg(d, a, b, c, k[6], 9, -1069501632);
        c = gg(c, d, a, b, k[11], 14, 643717713);
        b = gg(b, c, d, a, k[0], 20, -373897302);
        a = gg(a, b, c, d, k[5], 5, -701558691);
        d = gg(d, a, b, c, k[10], 9, 38016083);
        c = gg(c, d, a, b, k[15], 14, -660478335);
        b = gg(b, c, d, a, k[4], 20, -405537848);
        a = gg(a, b, c, d, k[9], 5, 568446438);
        d = gg(d, a, b, c, k[14], 9, -1019803690);
        c = gg(c, d, a, b, k[3], 14, -187363961);
        b = gg(b, c, d, a, k[8], 20, 1163531501);
        a = gg(a, b, c, d, k[13], 5, -1444681467);
        d = gg(d, a, b, c, k[2], 9, -51403784);
        c = gg(c, d, a, b, k[7], 14, 1735328473);
        b = gg(b, c, d, a, k[12], 20, -1926607734);
        a = hh(a, b, c, d, k[5], 4, -378558);
        d = hh(d, a, b, c, k[8], 11, -2022574463);
        c = hh(c, d, a, b, k[11], 16, 1839030562);
        b = hh(b, c, d, a, k[14], 23, -35309556);
        a = hh(a, b, c, d, k[1], 4, -1530992060);
        d = hh(d, a, b, c, k[4], 11, 1272893353);
        c = hh(c, d, a, b, k[7], 16, -155497632);
        b = hh(b, c, d, a, k[10], 23, -1094730640);
        a = hh(a, b, c, d, k[13], 4, 681279174);
        d = hh(d, a, b, c, k[0], 11, -358537222);
        c = hh(c, d, a, b, k[3], 16, -722521979);
        b = hh(b, c, d, a, k[6], 23, 76029189);
        a = hh(a, b, c, d, k[9], 4, -640364487);
        d = hh(d, a, b, c, k[12], 11, -421815835);
        c = hh(c, d, a, b, k[15], 16, 530742520);
        b = hh(b, c, d, a, k[2], 23, -995338651);
        a = ii(a, b, c, d, k[0], 6, -198630844);
        d = ii(d, a, b, c, k[7], 10, 1126891415);
        c = ii(c, d, a, b, k[14], 15, -1416354905);
        b = ii(b, c, d, a, k[5], 21, -57434055);
        a = ii(a, b, c, d, k[12], 6, 1700485571);
        d = ii(d, a, b, c, k[3], 10, -1894986606);
        c = ii(c, d, a, b, k[10], 15, -1051523);
        b = ii(b, c, d, a, k[1], 21, -2054922799);
        a = ii(a, b, c, d, k[8], 6, 1873313359);
        d = ii(d, a, b, c, k[15], 10, -30611744);
        c = ii(c, d, a, b, k[6], 15, -1560198380);
        b = ii(b, c, d, a, k[13], 21, 1309151649);
        a = ii(a, b, c, d, k[4], 6, -145523070);
        d = ii(d, a, b, c, k[11], 10, -1120210379);
        c = ii(c, d, a, b, k[2], 15, 718787259);
        b = ii(b, c, d, a, k[9], 21, -343485551);
        x[0] = add32(a, x[0]);
        x[1] = add32(b, x[1]);
        x[2] = add32(c, x[2]);
        x[3] = add32(d, x[3]);
    }
    function cmn(q, a, b, x, s, t) {
        a = add32(add32(a, q), add32(x, t));
        return add32((a << s) | (a >>> (32 - s)), b);
    }
    function ff(a, b, c, d, x, s, t) {
        return cmn((b & c) | ((~b) & d), a, b, x, s, t);
    }
    function gg(a, b, c, d, x, s, t) {
        return cmn((b & d) | (c & (~d)), a, b, x, s, t);
    }
    function hh(a, b, c, d, x, s, t) {
        return cmn(b ^ c ^ d, a, b, x, s, t);
    }
    function ii(a, b, c, d, x, s, t) {
        return cmn(c ^ (b | (~d)), a, b, x, s, t);
    }
    function add32(a, b) {
        return (a + b) & 0xFFFFFFFF;
    }
    function rhex(n) {
        const hexChars = '0123456789abcdef';
        let s = '';
        for (let j = 0; j < 4; j++) {
            s += hexChars.charAt((n >> (j * 8 + 4)) & 0x0F) + hexChars.charAt((n >> (j * 8)) & 0x0F);
        }
        return s;
    }
    // Convert string to UTF-8 bytes
    const utf8Bytes = [];
    for (let i = 0; i < string.length; i++) {
        const charCode = string.charCodeAt(i);
        if (charCode < 0x80) {
            utf8Bytes.push(charCode);
        }
        else if (charCode < 0x800) {
            utf8Bytes.push(0xc0 | (charCode >> 6));
            utf8Bytes.push(0x80 | (charCode & 0x3f));
        }
        else if (charCode < 0xd800 || charCode >= 0xe000) {
            utf8Bytes.push(0xe0 | (charCode >> 12));
            utf8Bytes.push(0x80 | ((charCode >> 6) & 0x3f));
            utf8Bytes.push(0x80 | (charCode & 0x3f));
        }
        else {
            // Surrogate pair
            i++;
            const charCode2 = string.charCodeAt(i);
            const codePoint = 0x10000 + (((charCode & 0x3ff) << 10) | (charCode2 & 0x3ff));
            utf8Bytes.push(0xf0 | (codePoint >> 18));
            utf8Bytes.push(0x80 | ((codePoint >> 12) & 0x3f));
            utf8Bytes.push(0x80 | ((codePoint >> 6) & 0x3f));
            utf8Bytes.push(0x80 | (codePoint & 0x3f));
        }
    }
    const x = [];
    let k = [];
    let i;
    for (i = 0; i < utf8Bytes.length; i++) {
        x[i >> 2] |= (utf8Bytes[i] & 0xFF) << ((i % 4) * 8);
    }
    x[i >> 2] |= 0x80 << ((i % 4) * 8);
    const n = ((i + 8) >> 6) + 1;
    const w = new Array(n * 16);
    for (i = 0; i < n * 16; i++) {
        w[i] = x[i] || 0;
    }
    w[n * 16 - 2] = utf8Bytes.length * 8;
    const h = [1732584193, -271733879, -1732584194, 271733878];
    for (i = 0; i < w.length; i += 16) {
        k = w.slice(i, i + 16);
        md5cycle(h, k);
    }
    return rhex(h[0]) + rhex(h[1]) + rhex(h[2]) + rhex(h[3]);
}
/**
 * Set user avatar with fallback chain:
 * 1. user.avatar_url (if provided by API)
 * 2. Gravatar (based on email - users can set their own at gravatar.com)
 * 3. DiceBear Avatars (free, generates nice avatars from name/initials)
 * 4. Canvas initials (final fallback)
 */
async function setUserAvatar(avatarImg, user) {
    // Try 1: Use avatar_url from API if available
    if (user.avatar_url) {
        avatarImg.attr("src", user.avatar_url);
        return;
    }
    // Try 2: Gravatar (email-based, users can set their own at gravatar.com)
    if (user.email) {
        const normalizedEmail = user.email.trim().toLowerCase();
        const emailHash = md5(normalizedEmail);
        const gravatarUrl = `https://www.gravatar.com/avatar/${emailHash}?s=64&d=404&r=pg`;
        // Test if Gravatar exists (404 means no Gravatar set)
        const gravatarExists = await testImageExists(gravatarUrl);
        if (gravatarExists) {
            avatarImg.attr("src", gravatarUrl);
            return;
        }
    }
    // Try 3: DiceBear Avatars (free, no API key needed, always works)
    // Using "initials" style - generates nice avatars from name
    const seed = user.name.toLowerCase().replace(/\s+/g, '-');
    const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    // Use initials style with your brand colors
    const dicebearUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&size=64&backgroundColor=9305eb,a799ff,d6ccf7,99ffff&fontSize=40`;
    // Set DiceBear avatar (it's reliable, so we don't need to test)
    avatarImg.attr("src", dicebearUrl);
    // Optional: Test if it loads, fallback to canvas if it fails
    const img = new Image();
    img.onerror = () => {
        // Fallback: Generate initials avatar on canvas
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            const colors = ['#9305eb', '#a799ff', '#d6ccf7', '#99ffff'];
            const colorIndex = user.name.charCodeAt(0) % colors.length;
            ctx.fillStyle = colors[colorIndex];
            ctx.fillRect(0, 0, 32, 32);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(initials, 16, 16);
        }
        avatarImg.attr("src", canvas.toDataURL());
    };
    img.src = dicebearUrl;
}
/**
 * Test if an image URL exists (for Gravatar fallback)
 */
function testImageExists(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
        // Timeout after 2 seconds
        setTimeout(() => resolve(false), 2000);
    });
}
/**
 * Update authentication UI based on current state
 */
async function updateApiAuthUI() {
    const api = (0, apiservice_1.getApiService)();
    const isAuthenticated = api.isAuthenticated();
    // Show/hide login/register buttons vs avatar
    $("#apiAuthButtons").toggle(!isAuthenticated);
    $("#apiUserAvatar").toggle(isAuthenticated);
    // Enable/disable Sync menu items based on authentication state
    const syncMenuItems = [
        "#item_api_projects",
        "#item_api_create_project",
        "#item_api_push",
        "#item_api_pull"
    ];
    syncMenuItems.forEach(selector => {
        const $item = $(selector);
        const $parent = $item.parent('li');
        if (isAuthenticated) {
            $item.removeClass('disabled');
            $parent.removeClass('disabled');
            $item.css('opacity', '1').css('pointer-events', 'auto');
        }
        else {
            $item.addClass('disabled');
            $parent.addClass('disabled');
            $item.css('opacity', '0.65').css('pointer-events', 'none');
        }
    });
    if (isAuthenticated) {
        try {
            const user = await api.getUser();
            $("#apiUserName").text(user.name);
            $("#apiUserEmail").text(user.email);
            // Set avatar image with fallback chain
            const avatarImg = $("#apiAvatarImg");
            await setUserAvatar(avatarImg, user);
        }
        catch (e) {
            console.error("Failed to get user info:", e);
        }
    }
}
/**
 * Close user menu dropdown
 */
function closeApiUserMenu() {
    $("#apiUserMenu").hide();
    $(document).off('click.apiMenu');
}
/**
 * Toggle user menu dropdown
 */
function toggleApiUserMenu() {
    const menu = $("#apiUserMenu");
    menu.toggle();
    // Close menu when clicking outside
    $(document).on('click.apiMenu', function (e) {
        if (!$(e.target).closest('#apiUserAvatar').length) {
            closeApiUserMenu();
        }
    });
}
// ==================== Projects ====================
/**
 * Create a new project
 */
async function _createApiProject() {
    closeApiUserMenu();
    const api = (0, apiservice_1.getApiService)();
    if (!api.isAuthenticated()) {
        (0, dialogs_1.alertError)("Please login first.");
        return;
    }
    const modal = $("#createApiProjectModal");
    const btn = $("#createApiProjectButton");
    // Pre-fill with current project name if available
    const currentFile = (0, ui_1.getCurrentMainFilename)();
    if (currentFile) {
        $("#createApiProjectTitle").val((0, util_1.getFilenamePrefix)(currentFile));
    }
    modal.modal('show');
    btn.off('click').on('click', async () => {
        const title = $("#createApiProjectTitle").val() + "";
        const description = $("#createApiProjectDescription").val() + "";
        const isPublic = $("#createApiProjectPublic").is(':checked');
        if (!title) {
            (0, dialogs_1.alertError)("Please enter a project title.");
            return;
        }
        modal.modal('hide');
        // Wait for modal to fully close, then show wait dialog and proceed
        modal.one('hidden.bs.modal', async () => {
            (0, dialogs_1.setWaitDialog)(true);
            try {
                const project = await api.createProject({
                    title,
                    description: description || undefined,
                    public: isPublic,
                });
                // Bind to the new project
                setCurrentApiProject(project);
                // Automatically push files to the new project
                (0, dialogs_1.setWaitProgress)(0.5);
                const currentProj = (0, ui_1.getCurrentProject)();
                const files = {};
                const filetypes = {};
                // Collect all project source files (exclude bin/ directory - we'll add current compiled output separately)
                for (const [path, data] of Object.entries(currentProj.filedata)) {
                    if (data && !path.startsWith('bin/')) {
                        files[path] = data;
                        const filetype = determineFiletype(path);
                        if (filetype) {
                            filetypes[path] = filetype;
                        }
                    }
                }
                // Include current compiled output if available (this is the latest build)
                const output = (0, ui_1.getCurrentOutput)();
                if (output instanceof Uint8Array) {
                    const mainFile = (0, ui_1.getCurrentMainFilename)();
                    if (mainFile) {
                        const romPath = `bin/${mainFile}.rom`;
                        files[romPath] = output;
                        const filetype = determineFiletype(romPath);
                        if (filetype) {
                            filetypes[romPath] = filetype;
                        }
                    }
                }
                (0, dialogs_1.setWaitProgress)(0.8);
                await api.pushProjectFiles(project.id, files, filetypes);
                (0, dialogs_1.setWaitDialog)(false);
                (0, dialogs_1.alertInfo)(`Project "${project.title}" published successfully! Files pushed to server.`);
                (0, analytics_1.gaEvent)('api', 'project', 'create');
                (0, analytics_1.gaEvent)('api', 'sync', 'push');
            }
            catch (e) {
                (0, dialogs_1.setWaitDialog)(false);
                (0, dialogs_1.alertError)("Failed to publish project: " + e.message);
                (0, analytics_1.gaEvent)('api', 'project', 'create_error');
            }
        });
    });
}
/**
 * List user's projects
 */
async function _listApiProjects() {
    closeApiUserMenu();
    const api = (0, apiservice_1.getApiService)();
    if (!api.isAuthenticated()) {
        (0, dialogs_1.alertError)("Please login first.");
        return;
    }
    (0, dialogs_1.setWaitDialog)(true);
    try {
        const projects = await api.getProjects();
        (0, dialogs_1.setWaitDialog)(false);
        if (projects.length === 0) {
            (0, dialogs_1.alertInfo)("You don't have any projects yet. Create one to get started!");
            return;
        }
        // Show project selection modal
        showProjectListModal(projects);
    }
    catch (e) {
        (0, dialogs_1.setWaitDialog)(false);
        (0, dialogs_1.alertError)("Failed to load projects: " + e.message);
    }
}
/**
 * Show project list modal
 */
function showProjectListModal(projects) {
    let html = '<div class="list-group">';
    for (const project of projects) {
        html += `<a href="#" class="list-group-item list-group-item-action" data-project-id="${project.id}">
      <h5 class="mb-1">${project.title}</h5>
      <p class="mb-1">${project.description || 'No description'}</p>
      <small>${project.public ? 'Public' : 'Private'}</small>
    </a>`;
    }
    html += '</div>';
    bootbox.dialog({
        title: 'Select a Project',
        message: html,
        buttons: {
            cancel: {
                label: 'Cancel',
                className: 'btn-secondary'
            }
        }
    });
    // Attach click handlers after dialog is rendered
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
        $('.bootbox .list-group-item').off('click').on('click', function (e) {
            e.preventDefault();
            const projectId = $(this).data('project-id');
            const project = projects.find(p => p.id === projectId);
            if (project) {
                bootbox.hideAll();
                bindToApiProject(project);
            }
        });
    }, 100);
}
/**
 * Bind current workspace to an API project
 */
async function bindToApiProject(project) {
    (0, dialogs_1.setWaitDialog)(true);
    try {
        setCurrentApiProject(project);
        // Pull files from API project
        const api = (0, apiservice_1.getApiService)();
        const files = await api.pullProjectFiles(project.id);
        // Update current project with API files - update both store and filedata, and refresh open windows
        const currentProj = (0, ui_1.getCurrentProject)();
        console.log('bindToApiProject: Got', Object.keys(files).length, 'files:', Object.keys(files));
        let mainFile = null;
        for (const [path, content] of Object.entries(files)) {
            // Skip binary/compiled files in bin/ directory (they're generated from source, don't pull them)
            if (path.startsWith('bin/') && (path.endsWith('.rom') || path.endsWith('.prg'))) {
                console.log('bindToApiProject: Skipping compiled binary file', path, '- these are generated from source');
                continue; // Don't store or process compiled binaries
            }
            console.log('bindToApiProject: Updating file', path, 'content type:', typeof content, 'length:', typeof content === 'string' ? content.length : 'binary');
            // Update the store
            await currentProj.updateFileInStore(path, content);
            // Update filedata
            currentProj.filedata[path] = content;
            // Update open window if it exists
            ui_1.projectWindows.updateFile(path, content);
            // Determine main file (prefer .bas, .c, .asm files, skip bin/ directory)
            if (!mainFile && !path.startsWith('bin/') && (path.endsWith('.bas') || path.endsWith('.c') || path.endsWith('.asm') || path.endsWith('.prg'))) {
                mainFile = path;
            }
        }
        // Refresh window list to register all files with the window system
        (0, ui_1.refreshWindowList)();
        // Set main file if we found one and it's not already set
        let fileToOpen = null;
        if (mainFile && !currentProj.mainPath) {
            console.log('bindToApiProject: Setting main file to', mainFile);
            currentProj.setMainFile(mainFile);
            fileToOpen = mainFile;
        }
        else if (mainFile && currentProj.mainPath !== mainFile) {
            console.log('bindToApiProject: Updating main file from', currentProj.mainPath, 'to', mainFile);
            currentProj.setMainFile(mainFile);
            fileToOpen = mainFile;
        }
        else if (Object.keys(files).length > 0 && !mainFile) {
            // If no source file found, use the first file
            const firstFile = Object.keys(files)[0];
            if (!currentProj.mainPath) {
                console.log('bindToApiProject: Setting main file to first file', firstFile);
                currentProj.setMainFile(firstFile);
                fileToOpen = firstFile;
            }
        }
        else if (currentProj.mainPath) {
            // Use existing main file if no new one was determined
            fileToOpen = currentProj.mainPath;
        }
        // Update URL to reflect the new project and file
        if (fileToOpen) {
            // Open the main file window (now that it's registered)
            ui_1.projectWindows.createOrShow(fileToOpen);
            // Update URL with new file and platform
            (0, ui_1.gotoNewLocation)(false, {
                file: fileToOpen,
                platform: ui_1.platform_id
            });
        }
        (0, dialogs_1.setWaitDialog)(false);
        (0, dialogs_1.alertInfo)(`Synced with project "${project.title}". Files pulled from server.`);
        (0, analytics_1.gaEvent)('api', 'project', 'bind');
    }
    catch (e) {
        (0, dialogs_1.setWaitDialog)(false);
        (0, dialogs_1.alertError)("Failed to sync with project: " + e.message);
    }
}
// ==================== Push/Pull ====================
/**
 * Push current project files to API
 */
async function _pushToApi() {
    closeApiUserMenu();
    const api = (0, apiservice_1.getApiService)();
    if (!api.isAuthenticated()) {
        (0, dialogs_1.alertError)("Please login first.");
        return;
    }
    if (!currentApiProjectId) {
        (0, dialogs_1.alertError)("No project selected. Please create or select a project first.");
        return;
    }
    const modal = $("#pushApiModal");
    const btn = $("#pushApiButton");
    modal.modal('show');
    btn.off('click').on('click', async () => {
        const commitMsg = $("#pushApiCommitMsg").val() + "";
        if (!commitMsg) {
            (0, dialogs_1.alertError)("Please enter a commit message.");
            return;
        }
        modal.modal('hide');
        // Wait for modal to fully close, then show wait dialog and proceed
        modal.one('hidden.bs.modal', async () => {
            (0, dialogs_1.setWaitDialog)(true);
            (0, dialogs_1.setWaitProgress)(0.3);
            try {
                const currentProj = (0, ui_1.getCurrentProject)();
                const files = {};
                const filetypes = {};
                // Collect all project source files (exclude bin/ directory - we'll add current compiled output separately)
                for (const [path, data] of Object.entries(currentProj.filedata)) {
                    if (data && !path.startsWith('bin/')) {
                        files[path] = data;
                        const filetype = determineFiletype(path);
                        if (filetype) {
                            filetypes[path] = filetype;
                        }
                    }
                }
                // Include current compiled output if available (this is the latest build)
                const output = (0, ui_1.getCurrentOutput)();
                if (output instanceof Uint8Array) {
                    const mainFile = (0, ui_1.getCurrentMainFilename)();
                    const romPath = `bin/${mainFile}.rom`;
                    files[romPath] = output;
                    const filetype = determineFiletype(romPath);
                    if (filetype) {
                        filetypes[romPath] = filetype;
                    }
                }
                (0, dialogs_1.setWaitProgress)(0.6);
                await api.pushProjectFiles(currentApiProjectId, files, filetypes);
                (0, dialogs_1.setWaitDialog)(false);
                (0, dialogs_1.alertInfo)("Files pushed to server successfully!");
                (0, analytics_1.gaEvent)('api', 'sync', 'push');
            }
            catch (e) {
                (0, dialogs_1.setWaitDialog)(false);
                (0, dialogs_1.alertError)("Failed to push files: " + e.message);
                (0, analytics_1.gaEvent)('api', 'sync', 'push_error');
            }
        });
    });
}
/**
 * Pull project files from API
 */
async function _pullFromApi() {
    closeApiUserMenu();
    const api = (0, apiservice_1.getApiService)();
    if (!api.isAuthenticated()) {
        (0, dialogs_1.alertError)("Please login first.");
        return;
    }
    if (!currentApiProjectId) {
        (0, dialogs_1.alertError)("No project selected. Please create or select a project first.");
        return;
    }
    if (!confirm("Pull from server and replace all local files? Any unsaved changes will be overwritten.")) {
        return;
    }
    (0, dialogs_1.setWaitDialog)(true);
    try {
        const files = await api.pullProjectFiles(currentApiProjectId);
        console.log('_pullFromApi: Got', Object.keys(files).length, 'files:', Object.keys(files));
        // Update current project - update both store and filedata, and refresh open windows
        const currentProj = (0, ui_1.getCurrentProject)();
        for (const [path, content] of Object.entries(files)) {
            // Skip binary/compiled files in bin/ directory (they're generated from source, don't pull them)
            if (path.startsWith('bin/') && (path.endsWith('.rom') || path.endsWith('.prg'))) {
                console.log('_pullFromApi: Skipping compiled binary file', path, '- these are generated from source');
                continue; // Don't store or process compiled binaries
            }
            console.log('_pullFromApi: Updating file', path, 'content type:', typeof content, 'length:', typeof content === 'string' ? content.length : 'binary');
            // Update the store
            await currentProj.updateFileInStore(path, content);
            // Update filedata
            currentProj.filedata[path] = content;
            // Update open window if it exists
            ui_1.projectWindows.updateFile(path, content);
        }
        // Refresh window list to register all files with the window system
        (0, ui_1.refreshWindowList)();
        (0, dialogs_1.setWaitDialog)(false);
        (0, dialogs_1.alertInfo)(`Files pulled from server successfully! (${Object.keys(files).length} files)`);
        (0, analytics_1.gaEvent)('api', 'sync', 'pull');
    }
    catch (e) {
        (0, dialogs_1.setWaitDialog)(false);
        console.error('_pullFromApi: Error:', e);
        (0, dialogs_1.alertError)("Failed to pull files: " + e.message);
        (0, analytics_1.gaEvent)('api', 'sync', 'pull_error');
    }
}
//# sourceMappingURL=apisync.js.map