"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Apple2EPlatform = void 0;
const emu_1 = require("../common/emu");
const APPLE2E_PRESETS = [
    { id: 'hello.bas', name: 'Hello World (BASIC)', category: 'BASIC Tutorial' },
    { id: 'colors.bas', name: 'Color Demo (BASIC)' },
    { id: 'graphics.bas', name: 'Graphics Demo (BASIC)' },
    { id: 'keyboard.bas', name: 'Keyboard Demo (BASIC)' },
    { id: 'game.bas', name: 'Simple Game (BASIC)' },
];
class Apple2EPlatform {
    constructor(mainElement) {
        this.iframe = null;
        this.emulatorReady = false;
        this.lastLoadedProgram = null;
        this.isLoadingProgram = false;
        this.mainElement = mainElement;
        // Listen for messages from iframe
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'apple2e_ready') {
                console.log('Apple2EPlatform: Emulator ready');
                this.emulatorReady = true;
                // Small delay to ensure emulator is fully initialized before accepting ROM loads
                // This helps prevent race conditions when files are switched quickly
                setTimeout(() => {
                    console.log('Apple2EPlatform: Emulator fully ready, can accept ROM loads');
                }, 200);
            }
            else if (event.data && event.data.type === 'apple2e_error') {
                console.error('Apple2EPlatform: Emulator error:', event.data.error);
                this.emulatorReady = false;
            }
        });
    }
    getName() {
        return 'Apple IIe';
    }
    getDescription() {
        return 'Apple IIe - 6502-based personal computer';
    }
    async init() {
        console.log('Apple2EPlatform init() called');
    }
    start() {
        console.log('Apple2EPlatform start() called');
        // Create iframe for Apple IIe emulator
        this.iframe = document.createElement('iframe');
        this.iframe.id = 'apple2e-iframe';
        this.iframe.style.width = '100%';
        this.iframe.style.height = '600px';
        this.iframe.style.border = '1px solid #ccc';
        this.iframe.style.backgroundColor = '#000';
        this.iframe.setAttribute('tabindex', '0'); // Make iframe focusable
        this.iframe.setAttribute('allow', 'pointer-events'); // Allow pointer events
        // Don't add any event listeners to the iframe from parent
        // The iframe should handle all its own events
        // Cross-origin restrictions might prevent access anyway
        console.log('Apple2EPlatform: Iframe will handle its own events');
        // Prevent the IDE from pausing when clicking on the iframe
        // The iframe should handle its own focus without triggering IDE pause/resume
        this.iframe.addEventListener('focus', (e) => {
            // Don't let iframe focus trigger IDE pause
            e.stopPropagation();
        }, true);
        this.iframe.addEventListener('click', (e) => {
            // Don't let iframe clicks trigger IDE pause
            e.stopPropagation();
        }, true);
        // Add iframe to the main element
        this.mainElement.innerHTML = '';
        this.mainElement.appendChild(this.iframe);
        // CRITICAL: Don't intercept clicks on the iframe at all
        // Remove any event listeners that might block clicks
        // The iframe needs to handle its own clicks completely
        // Ensure iframe container doesn't block pointer events
        this.mainElement.style.pointerEvents = 'auto';
        this.mainElement.style.userSelect = 'none';
        // Ensure iframe itself can receive clicks
        this.iframe.style.pointerEvents = 'auto';
        this.iframe.style.border = '1px solid #ccc';
        // Don't add any click handlers on the parent - let iframe handle everything
        console.log('Apple2EPlatform: Iframe created, clicks should pass through to iframe');
        // Load the iframe
        this.iframe.src = 'apple2e-iframe.html';
        console.log('Apple2EPlatform: iframe created and loading');
        // Reset emulator when it becomes ready (ensures clean BASIC prompt on page load)
        const checkReady = setInterval(() => {
            if (this.emulatorReady && this.iframe && this.iframe.contentWindow) {
                clearInterval(checkReady);
                // Auto-reset when platform starts to ensure clean state
                console.log('Apple2EPlatform: Auto-resetting emulator on start for clean BASIC prompt');
                this.reset();
            }
        }, 100);
        // Timeout after 10 seconds
        setTimeout(() => clearInterval(checkReady), 10000);
    }
    stop() {
        console.log('Apple2EPlatform stop() called');
        if (this.iframe && this.iframe.contentWindow) {
            this.iframe.contentWindow.postMessage({ type: 'stop' }, '*');
        }
    }
    reset() {
        console.log('Apple2EPlatform reset() called');
        if (this.iframe && this.iframe.contentWindow) {
            this.iframe.contentWindow.postMessage({ type: 'reset' }, '*');
        }
    }
    isRunning() {
        return this.emulatorReady;
    }
    getToolForFilename(filename) {
        // For now, only support BASIC
        const lowerFilename = filename.toLowerCase();
        if (lowerFilename.endsWith('.bas')) {
            return 'applesoftbasic'; // Use AppleSoft BASIC compiler
        }
        return 'applesoftbasic'; // Default to BASIC
    }
    getDefaultExtension() {
        return '.bas';
    }
    getPresets() {
        return APPLE2E_PRESETS;
    }
    pause() {
        console.log('Apple2EPlatform pause() called');
        if (this.iframe && this.iframe.contentWindow) {
            this.iframe.contentWindow.postMessage({ type: 'stop' }, '*');
        }
    }
    break() {
        console.log('Apple2EPlatform break() called (Ctrl+C / BRK)');
        if (this.iframe && this.iframe.contentWindow) {
            this.iframe.contentWindow.postMessage({ type: 'break' }, '*');
        }
    }
    resume() {
        console.log('Apple2EPlatform resume() called');
        if (this.iframe && this.iframe.contentWindow) {
            this.iframe.contentWindow.postMessage({ type: 'run' }, '*');
        }
        // Also ensure emulator is running via API if available
        const api = this.getApple2API();
        if (api && api.apple2 && !api.apple2.isRunning()) {
            api.apple2.run();
        }
    }
    /**
     * Get access to the apple2 API object from the iframe
     * This allows you to use the API reference functions
     *
     * Usage:
     * const api = platform.getApple2API();
     * const apple2 = api.apple2;
     * const io = api.getIO();
     * io.setKeyBuffer("PRINT \"HELLO\"\r");
     */
    getApple2API() {
        if (!this.iframe || !this.iframe.contentWindow) {
            console.warn('Apple2EPlatform: iframe not available');
            return null;
        }
        try {
            // Access the iframe's window object
            const iframeWindow = this.iframe.contentWindow;
            if (!iframeWindow.apple2 && !iframeWindow.APPLE2_API) {
                console.warn('Apple2EPlatform: apple2 API not available in iframe yet');
                return null;
            }
            // Return API wrapper that proxies to iframe
            return {
                // Direct access to apple2 instance
                get apple2() {
                    var _a;
                    return iframeWindow.apple2 || ((_a = iframeWindow.APPLE2_API) === null || _a === void 0 ? void 0 : _a.apple2);
                },
                // Convenience methods
                getIO: () => {
                    var _a;
                    const apple2 = iframeWindow.apple2 || ((_a = iframeWindow.APPLE2_API) === null || _a === void 0 ? void 0 : _a.apple2);
                    if (!apple2) {
                        console.error('Apple2EPlatform: Cannot getIO - emulator not available');
                        return null;
                    }
                    const io = apple2.getIO();
                    if (!io) {
                        console.error('Apple2EPlatform: getIO() returned null');
                        return null;
                    }
                    console.log('Apple2EPlatform: getIO() returned:', {
                        hasSetKeyBuffer: typeof io.setKeyBuffer === 'function',
                        hasKeyDown: typeof io.keyDown === 'function',
                        methods: Object.keys(io).filter(k => typeof io[k] === 'function')
                    });
                    return io;
                },
                getCPU: () => {
                    var _a;
                    const apple2 = iframeWindow.apple2 || ((_a = iframeWindow.APPLE2_API) === null || _a === void 0 ? void 0 : _a.apple2);
                    return apple2 ? apple2.getCPU() : null;
                },
                setAcceleration: (enabled) => {
                    const api = iframeWindow.APPLE2_API;
                    if (api && api.setAcceleration) {
                        api.setAcceleration(enabled);
                    }
                    else {
                        console.error('Apple2EPlatform: setAcceleration not available');
                    }
                },
                getAcceleration: () => {
                    const api = iframeWindow.APPLE2_API;
                    if (api && api.getAcceleration) {
                        return api.getAcceleration();
                    }
                    return false;
                },
                reset: () => {
                    var _a;
                    const apple2 = iframeWindow.apple2 || ((_a = iframeWindow.APPLE2_API) === null || _a === void 0 ? void 0 : _a.apple2);
                    if (!apple2) {
                        console.error('Apple2EPlatform: Cannot reset - emulator not available');
                        return false;
                    }
                    console.log('Apple2EPlatform: Resetting emulator (enters BASIC)...');
                    apple2.reset();
                    // Ensure it's running after reset
                    setTimeout(() => {
                        if (!apple2.isRunning()) {
                            console.log('Apple2EPlatform: Starting emulator after reset');
                            apple2.run();
                        }
                        console.log('Apple2EPlatform: Reset complete, BASIC prompt should be ready');
                    }, 100);
                    return true;
                },
                run: () => {
                    var _a;
                    const apple2 = iframeWindow.apple2 || ((_a = iframeWindow.APPLE2_API) === null || _a === void 0 ? void 0 : _a.apple2);
                    if (apple2)
                        apple2.run();
                },
                stop: () => {
                    var _a;
                    const apple2 = iframeWindow.apple2 || ((_a = iframeWindow.APPLE2_API) === null || _a === void 0 ? void 0 : _a.apple2);
                    if (apple2)
                        apple2.stop();
                },
                isRunning: () => {
                    var _a;
                    const apple2 = iframeWindow.apple2 || ((_a = iframeWindow.APPLE2_API) === null || _a === void 0 ? void 0 : _a.apple2);
                    return apple2 ? apple2.isRunning() : false;
                },
                // Type text into emulator
                type: (text) => {
                    var _a;
                    const apple2 = iframeWindow.apple2 || ((_a = iframeWindow.APPLE2_API) === null || _a === void 0 ? void 0 : _a.apple2);
                    if (!apple2) {
                        console.error('Apple2EPlatform: Cannot type - emulator not available');
                        console.log('Available in iframe:', {
                            apple2: !!iframeWindow.apple2,
                            APPLE2_API: !!iframeWindow.APPLE2_API
                        });
                        return false;
                    }
                    console.log('Apple2EPlatform: Typing text:', text.substring(0, 50));
                    console.log('Apple2EPlatform: Emulator running?', apple2.isRunning());
                    const io = apple2.getIO();
                    if (!io) {
                        console.error('Apple2EPlatform: Cannot type - getIO() returned null');
                        return false;
                    }
                    if (!io.setKeyBuffer) {
                        console.error('Apple2EPlatform: Cannot type - io.setKeyBuffer is not a function');
                        console.log('IO object:', Object.keys(io));
                        return false;
                    }
                    // CRITICAL: Reset first to get to BASIC prompt
                    // The emulator must be reset before typing, which puts it into BASIC
                    // This is especially important if a previous program is still running
                    console.log('Apple2EPlatform: Resetting emulator to enter BASIC...');
                    apple2.reset();
                    // Ensure emulator is running after reset
                    if (!apple2.isRunning()) {
                        console.log('Apple2EPlatform: Starting emulator after reset...');
                        apple2.run();
                    }
                    // Wait for reset to complete and BASIC prompt to be ready
                    // Apple II needs time to boot into BASIC after reset
                    console.log('Apple2EPlatform: Waiting for BASIC prompt...');
                    setTimeout(() => {
                        sendTextToEmulator(io, text);
                    }, 1200);
                    // Helper function to send text using setKeyBuffer (the working method)
                    function sendTextToEmulator(io, text) {
                        console.log('Apple2EPlatform: Sending text:', JSON.stringify(text.substring(0, 80)));
                        // CRITICAL: Focus the canvas in the iframe for keyboard input
                        // This is essential for iframe-based emulators - keyboard input requires focus
                        try {
                            const iframeDoc = iframeWindow.document;
                            const canvas = iframeDoc.querySelector('#screen');
                            if (canvas && canvas.focus) {
                                canvas.focus();
                                console.log('Apple2EPlatform: Focused canvas in iframe for keyboard input');
                            }
                        }
                        catch (e) {
                            console.warn('Apple2EPlatform: Could not focus canvas (cross-origin?):', e);
                        }
                        // Format text correctly: ensure it starts with \r and ends with RUN\r if it's a program
                        let formattedText = text;
                        // If text contains line numbers (BASIC program), format it properly
                        if (/^\d+\s/.test(text.trim())) {
                            // It's a BASIC program - format it correctly
                            formattedText = text.replace(/\r\n/g, '\r').replace(/\n/g, '\r');
                            // Add leading \r to ensure fresh prompt
                            if (!formattedText.startsWith('\r')) {
                                formattedText = '\r' + formattedText;
                            }
                            // Ensure it ends with \r
                            if (!formattedText.endsWith('\r')) {
                                formattedText += '\r';
                            }
                            // Add RUN\r at the end to execute
                            formattedText += 'RUN\r';
                            console.log('Apple2EPlatform: Formatted BASIC program:', JSON.stringify(formattedText.substring(0, 100)));
                        }
                        // Use setKeyBuffer (this is the method that works!)
                        // Small delay to ensure focus is set
                        setTimeout(() => {
                            try {
                                io.setKeyBuffer(formattedText);
                                console.log('Apple2EPlatform: ✅ setKeyBuffer called with formatted text');
                                console.log('Apple2EPlatform: Program sent to emulator');
                                // Reset after sending program to ensure clean state for next load
                                // This helps with race conditions when switching files quickly
                                setTimeout(() => {
                                    var _a;
                                    const apple2 = iframeWindow.apple2 || ((_a = iframeWindow.APPLE2_API) === null || _a === void 0 ? void 0 : _a.apple2);
                                    if (apple2) {
                                        console.log('Apple2EPlatform: Resetting emulator after program sent (for clean state)...');
                                        apple2.reset();
                                        if (!apple2.isRunning()) {
                                            apple2.run();
                                        }
                                        console.log('Apple2EPlatform: Reset complete, ready for next program');
                                        // Clear the last loaded program hash so we can load the same program again if needed
                                        // (but only after reset completes)
                                        setTimeout(() => {
                                            this.lastLoadedProgram = null;
                                        }, 500);
                                    }
                                }, 500);
                            }
                            catch (e) {
                                console.error('Apple2EPlatform: setKeyBuffer failed:', e);
                            }
                        }, 100);
                    }
                    return true;
                },
                // Get video modes
                getVideoModes: () => {
                    var _a;
                    const apple2 = iframeWindow.apple2 || ((_a = iframeWindow.APPLE2_API) === null || _a === void 0 ? void 0 : _a.apple2);
                    return apple2 ? apple2.getVideoModes() : null;
                },
                // Get stats
                getStats: () => {
                    var _a;
                    const apple2 = iframeWindow.apple2 || ((_a = iframeWindow.APPLE2_API) === null || _a === void 0 ? void 0 : _a.apple2);
                    return apple2 ? apple2.getStats() : null;
                },
                // Break/interrupt a running BASIC program (Ctrl+C / BRK)
                // On Apple II, Ctrl+C sends BRK (0x03) which interrupts running programs
                break: () => {
                    var _a;
                    const apple2 = iframeWindow.apple2 || ((_a = iframeWindow.APPLE2_API) === null || _a === void 0 ? void 0 : _a.apple2);
                    if (!apple2) {
                        console.error('Apple2EPlatform: Cannot break - emulator not available');
                        return false;
                    }
                    // Send break command via postMessage so iframe can handle focus
                    if (this.iframe && this.iframe.contentWindow) {
                        console.log('Apple2EPlatform: Sending break command to iframe (will handle focus)');
                        this.iframe.contentWindow.postMessage({ type: 'break' }, '*');
                        return true;
                    }
                    // Fallback: try direct access (but focus might not work)
                    const io = apple2.getIO();
                    if (!io) {
                        console.error('Apple2EPlatform: Cannot break - getIO() returned null');
                        return false;
                    }
                    console.log('Apple2EPlatform: Sending BRK (Ctrl+C) to interrupt program...');
                    // Send BRK character (0x03) - this is Ctrl+C on Apple II
                    // This will interrupt/break out of a running BASIC program
                    try {
                        io.keyDown(0x03); // BRK character (Ctrl+C)
                        setTimeout(() => {
                            if (io.keyUp)
                                io.keyUp();
                        }, 50);
                        console.log('Apple2EPlatform: ✅ BRK sent');
                        return true;
                    }
                    catch (e) {
                        console.error('Apple2EPlatform: Error sending BRK:', e);
                        return false;
                    }
                }
            };
        }
        catch (e) {
            console.error('Apple2EPlatform: Error accessing iframe API:', e);
            return null;
        }
    }
    loadROM(title, rom) {
        console.log('Apple2EPlatform loadROM() called', { title, romLength: rom === null || rom === void 0 ? void 0 : rom.length });
        // For BASIC programs, we'll send them as text to be typed into the emulator
        if (!rom || rom.length === 0) {
            console.warn('Apple2EPlatform: No ROM data provided');
            return;
        }
        // Prevent duplicate loads - check if this is the same program or if one is already loading
        const programText = new TextDecoder().decode(rom);
        const programHash = programText.substring(0, 50);
        if (this.isLoadingProgram) {
            console.warn('Apple2EPlatform: Already loading a program, ignoring duplicate request');
            return;
        }
        if (this.lastLoadedProgram === programHash) {
            console.warn('Apple2EPlatform: Same program already loaded, ignoring duplicate request');
            return;
        }
        // Mark as loading and remember this program
        this.isLoadingProgram = true;
        this.lastLoadedProgram = programHash;
        if (this.iframe && this.iframe.contentWindow) {
            // Always wait for emulator to be ready, even if emulatorReady flag is set
            // This prevents race conditions when switching files quickly
            const sendWhenReady = () => {
                if (!this.iframe || !this.iframe.contentWindow) {
                    console.error('Apple2EPlatform: iframe lost during wait');
                    return;
                }
                // Double-check emulator is actually ready by checking the iframe
                const iframeWindow = this.iframe.contentWindow;
                if (!iframeWindow.apple2 && !this.emulatorReady) {
                    console.log('Apple2EPlatform: Emulator not ready yet, waiting...');
                    setTimeout(sendWhenReady, 100);
                    return;
                }
                // Emulator is ready, send the program
                console.log('Apple2EPlatform: Emulator ready, sending program');
                this.sendROMToEmulator(rom);
            };
            if (!this.emulatorReady) {
                console.log('Apple2EPlatform: Emulator not ready yet, waiting...');
                // Wait for emulator to be ready
                const checkReady = setInterval(() => {
                    if (this.emulatorReady && this.iframe && this.iframe.contentWindow) {
                        clearInterval(checkReady);
                        sendWhenReady();
                    }
                }, 100);
                // Timeout after 10 seconds
                setTimeout(() => {
                    clearInterval(checkReady);
                    if (this.emulatorReady) {
                        sendWhenReady();
                    }
                    else {
                        console.error('Apple2EPlatform: Timeout waiting for emulator to be ready');
                    }
                }, 10000);
            }
            else {
                // Even if flag says ready, verify and wait a bit to ensure stability
                console.log('Apple2EPlatform: Emulator ready flag set, verifying...');
                setTimeout(sendWhenReady, 100);
            }
        }
    }
    sendROMToEmulator(rom) {
        if (!this.iframe || !this.iframe.contentWindow) {
            console.error('Apple2EPlatform: Cannot send ROM - iframe not available');
            this.isLoadingProgram = false;
            return;
        }
        // Convert Uint8Array to string (assuming it's text/BASIC)
        const program = new TextDecoder().decode(rom);
        console.log('Apple2EPlatform: Sending program to iframe:', program.substring(0, 50));
        this.iframe.contentWindow.postMessage({
            type: 'load_basic',
            data: { program: program }
        }, '*');
        // Clear loading flag after a delay (in case of errors, the iframe handler will also clear it)
        setTimeout(() => {
            this.isLoadingProgram = false;
        }, 2000);
    }
    getROMExtension(rom) {
        // For BASIC programs, return .bas
        return '.bas';
    }
    readAddress(addr) {
        // Not implemented for iframe-based emulator
        return 0;
    }
    writeAddress(addr, val) {
        // Not implemented for iframe-based emulator
    }
    getMemoryMap() {
        return {
            main: [
                { name: 'Zero Page RAM', start: 0x0, size: 0x100, type: 'ram' },
                { name: 'Line Input RAM', start: 0x200, size: 0x100, type: 'ram' },
                { name: 'Text/Lores Page 1', start: 0x400, size: 0x400, type: 'ram' },
                { name: 'Hires Page 1', start: 0x2000, size: 0x2000, type: 'ram' },
                { name: 'Hires Page 2', start: 0x4000, size: 0x2000, type: 'ram' },
                { name: 'I/O', start: 0xc000, size: 0x1000, type: 'io' },
                { name: 'ROM', start: 0xd000, size: 0x3000, type: 'rom' },
            ]
        };
    }
    showHelp() {
        return 'https://github.com/whscullin/apple2js#readme';
    }
}
exports.Apple2EPlatform = Apple2EPlatform;
// Register the platform
emu_1.PLATFORMS['apple2e'] = Apple2EPlatform;
// Export for dynamic loading
exports.default = Apple2EPlatform;
//# sourceMappingURL=apple2e.js.map