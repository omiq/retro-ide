"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emu_1 = require("../common/emu");
class X86DOSBoxPlatform {
    constructor(mainElement) {
        this.pauseResumeSupported = false;
        this.mainElement = mainElement;
        // Listen for messages from the iframe
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'emulator_capabilities') {
                console.log("X86DOSBoxPlatform: Received emulator capabilities:", event.data.capabilities);
                if (event.data.capabilities && typeof event.data.capabilities.pauseResume === 'boolean') {
                    this.pauseResumeSupported = event.data.capabilities.pauseResume;
                    console.log("X86DOSBoxPlatform: Pause/resume supported:", this.pauseResumeSupported);
                    // Update the UI to show/hide pause/resume buttons
                    this.updateControlButtons();
                }
            }
            else if (event.data && event.data.type === 'debug_objects') {
                console.log("X86DOSBoxPlatform: Received debug message from iframe:", event.data.message);
                console.log("Note: Debug objects are available in the iframe context, not the main window");
            }
        });
    }
    getName() {
        return 'x86 (DOSBox)';
    }
    getDescription() {
        return 'x86 DOSBox - Run C programs in a DOS environment with Turbo C';
    }
    async init() {
        console.log("X86DOSBoxPlatform init() called");
        // No special initialization needed
    }
    async start() {
        console.log("X86DOSBoxPlatform start() called - using iframe approach");
        // Set up compilation listener immediately
        this.setupCompilationListener();
        // Initially hide pause/resume buttons until we know if they're supported
        this.pauseResumeSupported = false;
        setTimeout(() => this.updateControlButtons(), 100);
        // Check if iframe already exists
        let iframe = document.getElementById("x86dosbox-iframe");
        if (!iframe) {
            // Create iframe for DOSBox emulator
            iframe = document.createElement('iframe');
            iframe.id = 'x86dosbox-iframe';
            iframe.style.width = '100%';
            iframe.style.height = '600px';
            iframe.style.border = '1px solid #ccc';
            iframe.style.backgroundColor = '#000';
            // Add iframe to the main element
            this.mainElement.innerHTML = '';
            this.mainElement.appendChild(iframe);
            console.log("X86DOSBoxPlatform: iframe created");
            // Load the iframe content
            iframe.src = 'x86dosbox-iframe.html';
        }
        else {
            console.log("X86DOSBoxPlatform: iframe already exists, reusing");
        }
        // Set up iframe with auto-compilation (async)
        this.setupIframeWithAutoCompilation().catch(error => {
            console.error("X86DOSBoxPlatform: Error in setupIframeWithAutoCompilation:", error);
        });
    }
    stop() {
        console.log("X86DOSBoxPlatform stop() called");
        // Instead of sending a message, reload the iframe directly
        const frame = document.getElementById("x86dosbox-iframe");
        if (frame) {
            frame.src = frame.src; // Reload the iframe
            console.log("X86DOSBoxPlatform: Reloaded iframe for stop/reset");
        }
    }
    reset() {
        console.log("X86DOSBoxPlatform reset() called");
        // Instead of sending a message, reload the iframe directly
        const frame = document.getElementById("x86dosbox-iframe");
        if (frame) {
            frame.src = frame.src; // Reload the iframe
            console.log("X86DOSBoxPlatform: Reloaded iframe for reset");
        }
    }
    pause() {
        // Pause functionality disabled for now - not essential
        console.log("X86DOSBoxPlatform: Pause functionality disabled");
    }
    resume() {
        // Resume functionality disabled for now - not essential
        console.log("X86DOSBoxPlatform: Resume functionality disabled");
    }
    isRunning() {
        // For iframe-based emulators, we assume they're always running
        return true;
    }
    getToolForFilename(filename) {
        // For DOSBox, we don't use traditional build tools - compilation happens in the emulator
        const lowerFilename = filename.toLowerCase();
        if (lowerFilename.endsWith('.c'))
            return 'none';
        if (lowerFilename.endsWith('.bas'))
            return 'none';
        if (lowerFilename.endsWith('.pas'))
            return 'none';
        if (lowerFilename.endsWith('.asm'))
            return 'none';
        return 'none';
    }
    getDefaultExtension() {
        return '.c';
    }
    getPresets() {
        return [
            { id: 'hello.bas', name: 'Hello World (QBASIC)', category: 'QBASIC Tutorial' },
            { id: 'graphics.bas', name: 'Graphics Demo (QBASIC)' },
            { id: 'hellodos.c', name: 'Hello World (C)', category: 'TurboC Tutorial' },
            { id: 'graphics.c', name: 'BGI Graphics Demo (C)' },
            { id: 'ansitest.c', name: 'ANSI Escape Codes Test (C)' },
            { id: 'cursors.c', name: 'Cursor Control Test (C)' },
            { id: 'hello.pas', name: 'Hello World (Pascal)', category: 'Turbo Pascal Tutorial' },
            { id: 'graphics.pas', name: 'Graphics Demo (Pascal)' },
            { id: 'hello.asm', name: 'Hello World (NASM)', category: 'NASM Tutorial' },
            { id: 'simple.asm', name: 'Simple Graphics (NASM)' },
            { id: 'pattern.asm', name: 'Pattern Demo (NASM)' },
            { id: 'graphics.asm', name: 'Advanced Graphics (NASM)' },
        ];
    }
    loadROM(title, rom) {
        var _a, _b, _c;
        console.log("X86DOSBoxPlatform loadROM called with title:", title, "and", rom.length, "bytes");
        const frame = document.getElementById("x86dosbox-iframe");
        if (frame && frame.contentWindow) {
            // Check if this is a C or BASIC program
            if (rom && rom.length > 0) {
                console.log("X86DOSBoxPlatform: Program detected, sending via postMessage");
                // Extract the actual filename from the title or get it from the current project
                let filename = 'program.c';
                if (title && (title.endsWith('.c') || title.endsWith('.bas') || title.endsWith('.pas') || title.endsWith('.asm'))) {
                    filename = title;
                }
                else {
                    // Try to get the current main filename
                    const currentFilename = (_b = (_a = window.IDE) === null || _a === void 0 ? void 0 : _a.getCurrentMainFilename) === null || _b === void 0 ? void 0 : _b.call(_a);
                    if (currentFilename && (currentFilename.endsWith('.c') || currentFilename.endsWith('.bas') || currentFilename.endsWith('.pas') || currentFilename.endsWith('.asm'))) {
                        filename = currentFilename;
                    }
                    else {
                        // Try to get filename from the project
                        const project = (_c = window.IDE) === null || _c === void 0 ? void 0 : _c.getCurrentProject();
                        const files = (project === null || project === void 0 ? void 0 : project.getFiles()) || {};
                        const fileKeys = Object.keys(files);
                        if (fileKeys.length > 0) {
                            filename = fileKeys[0];
                        }
                    }
                }
                console.log("X86DOSBoxPlatform: Using filename:", filename);
                // Don't reload the iframe - just send the program data
                frame.contentWindow.postMessage({
                    type: 'compiled_program',
                    program: rom,
                    filename: filename,
                    autoLoad: true
                }, '*');
            }
            else {
                console.error("X86DOSBoxPlatform: No program data to load");
            }
        }
        else {
            console.error("X86DOSBoxPlatform: iframe not found or contentWindow not available");
        }
    }
    getMemoryMap() {
        return {
            main: [
                { name: "DOS Memory", start: 0, size: 1048576, type: "ram" }
            ]
        };
    }
    getROMExtension(rom) {
        return ".exe";
    }
    updateControlButtons() {
        // Disable pause/resume functionality for now - not essential
        const pauseButton = document.getElementById('dbg_pause');
        const resumeButton = document.getElementById('dbg_go');
        if (pauseButton) {
            pauseButton.style.display = 'none'; // Always hide pause button
            console.log("X86DOSBoxPlatform: Pause button disabled");
        }
        else {
            console.log("X86DOSBoxPlatform: Pause button not found");
        }
        if (resumeButton) {
            resumeButton.style.display = 'none'; // Always hide resume button
            console.log("X86DOSBoxPlatform: Resume button disabled");
        }
        else {
            console.log("X86DOSBoxPlatform: Resume button not found");
        }
    }
    async setupIframeWithAutoCompilation() {
        var _a;
        console.log("X86DOSBoxPlatform: Setting up iframe with auto-compilation");
        // Check if auto-compile is enabled
        const autoCompileEnabled = window.autoCompileEnabled === true;
        console.log("X86DOSBoxPlatform: Auto-compile enabled:", autoCompileEnabled);
        // Check if we have a compiled program
        const output = (_a = window.IDE) === null || _a === void 0 ? void 0 : _a.getCurrentOutput();
        if (output && output instanceof Uint8Array) {
            console.log("X86DOSBoxPlatform: Found compiled program, loading iframe");
            this.loadROM("compiled_program", output);
        }
        else {
            // For x86dosbox, we don't need to compile - we send source code directly to the emulator
            console.log("X86DOSBoxPlatform: No compiled program found, sending source code directly to emulator");
            await this.sendSourceCodeToEmulator();
        }
    }
    async sendSourceCodeToEmulator() {
        console.log("X86DOSBoxPlatform: Sending source code directly to emulator");
        let retryCount = 0;
        const maxRetries = 5;
        // Wait for the iframe to be ready
        const waitForIframe = () => {
            var _a, _b, _c;
            const frame = document.getElementById("x86dosbox-iframe");
            if (frame && frame.contentWindow) {
                console.log("X86DOSBoxPlatform: Iframe ready, getting source code");
                // Try to get the current file content from the IDE using the same approach as MSX platforms
                const getCurrentProject = (_a = window.IDE) === null || _a === void 0 ? void 0 : _a.getCurrentProject;
                const getCurrentMainFilename = (_b = window.IDE) === null || _b === void 0 ? void 0 : _b.getCurrentMainFilename;
                let mainFile;
                let fileContent;
                if (getCurrentProject && getCurrentMainFilename) {
                    const currentProject = getCurrentProject();
                    const currentFile = getCurrentMainFilename();
                    console.log("X86DOSBoxPlatform: Current file:", currentFile);
                    if (currentProject && currentFile) {
                        const fileData = currentProject.getFile(currentFile);
                        if (fileData) {
                            mainFile = currentFile;
                            fileContent = fileData;
                            console.log("X86DOSBoxPlatform: Got content from project.getFile(), length:", fileContent === null || fileContent === void 0 ? void 0 : fileContent.length);
                        }
                    }
                }
                // If still no content, try to get it from the editor directly
                if (!fileContent && ((_c = window.IDE) === null || _c === void 0 ? void 0 : _c.getCurrentEditor)) {
                    const editor = window.IDE.getCurrentEditor();
                    if (editor && editor.getValue) {
                        fileContent = editor.getValue();
                        console.log("X86DOSBoxPlatform: Got content from editor, length:", fileContent === null || fileContent === void 0 ? void 0 : fileContent.length);
                    }
                }
                if (!mainFile || !fileContent) {
                    retryCount++;
                    if (retryCount < maxRetries) {
                        console.log(`X86DOSBoxPlatform: No source code to send, retrying in 1 second (attempt ${retryCount}/${maxRetries})`);
                        setTimeout(waitForIframe, 1000);
                        return;
                    }
                    else {
                        console.log("X86DOSBoxPlatform: Max retries reached, giving up on auto-loading source code");
                        return;
                    }
                }
                // Convert content to string if needed
                const sourceCode = typeof fileContent === 'string' ? fileContent : new TextDecoder().decode(fileContent);
                console.log("X86DOSBoxPlatform: Sending source code to emulator for file:", mainFile);
                // Send the source code directly to the emulator
                frame.contentWindow.postMessage({
                    type: 'compiled_program',
                    program: new TextEncoder().encode(sourceCode),
                    filename: mainFile,
                    autoLoad: true
                }, '*');
            }
            else {
                console.log("X86DOSBoxPlatform: Iframe not ready yet, retrying in 500ms");
                setTimeout(waitForIframe, 500);
            }
        };
        // Wait longer for the IDE to be fully initialized and file loaded
        setTimeout(waitForIframe, 3000);
    }
    setupCompilationListener() {
        console.log("X86DOSBoxPlatform: Setting up compilation listener");
        // Check if we've already set up the listener
        if (window.x86dosboxCompilationListenerSetup) {
            console.log("X86DOSBoxPlatform: Compilation listener already set up, skipping");
            return;
        }
        // Mark that we've set up the listener
        window.x86dosboxCompilationListenerSetup = true;
        // Hook into the global setCompileOutput function to detect successful compilations
        const originalSetCompileOutput = window.setCompileOutput;
        window.setCompileOutput = (output) => {
            // Call the original function
            if (originalSetCompileOutput) {
                originalSetCompileOutput(output);
            }
            // Check if auto-compile is enabled before processing output
            const autoCompileEnabled = window.autoCompileEnabled === true;
            const isManualCompilation = window.isManualCompilation === true;
            console.log("X86DOSBoxPlatform: Compilation output received - autoCompileEnabled:", autoCompileEnabled, "isManualCompilation:", isManualCompilation);
            console.log("X86DOSBoxPlatform: Raw autoCompileEnabled value:", window.autoCompileEnabled);
            console.log("X86DOSBoxPlatform: Output type:", typeof output, "is Uint8Array:", output instanceof Uint8Array);
            // Always load programs when they're compiled, regardless of autocompile setting
            if (output && output instanceof Uint8Array) {
                console.log("X86DOSBoxPlatform: Compilation completed, sending program to iframe");
                // Wait a bit for the compilation output to be processed, then use loadROM
                setTimeout(() => {
                    this.loadROM("compiled_program", output);
                }, 1000);
            }
        };
    }
}
// Register the platform
emu_1.PLATFORMS['x86dosbox'] = X86DOSBoxPlatform;
exports.default = X86DOSBoxPlatform;
//# sourceMappingURL=x86dosbox.js.map