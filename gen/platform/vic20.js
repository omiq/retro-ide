"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vic20_1 = require("../machine/vic20");
const emu_1 = require("../common/emu");
const VIC20_PRESETS = [
    { id: 'hello.bas', name: 'Hello World (BASIC)', category: 'BASIC Tutorial' },
    { id: 'control.bas', name: 'Control Codes Demo (BASIC)' },
    { id: 'labels.bas', name: 'Label Demo (BASIC)' },
    { id: 'guess.bas', name: 'Number Guessing (BASIC)' },
    { id: 'hello.c', name: 'Hello World', category: 'C' },
    { id: 'siegegame.c', name: 'Siege Game' },
    { id: 'skeleton.cc65', name: 'C/CC65 Boilerplate' },
];
const VIC20_MEMORY_MAP = { main: [
        { name: 'RAM', start: 0x0000, size: 0x1000, type: 'ram' },
        { name: 'Screen RAM', start: 0x1000, size: 0x0400, type: 'ram' },
        { name: 'Color RAM', start: 0x9400, size: 0x0400, type: 'io' },
        { name: 'Character ROM', start: 0x8000, size: 0x1000, type: 'rom' },
        { name: 'BASIC ROM', start: 0xc000, size: 0x2000, type: 'rom' },
        { name: 'KERNAL ROM', start: 0xe000, size: 0x2000, type: 'rom' },
        { name: 'VIC I/O', start: 0x9000, size: 0x0400, type: 'io' },
        { name: 'VIA 1', start: 0x9110, size: 0x0010, type: 'io' },
        { name: 'VIA 2', start: 0x9120, size: 0x0010, type: 'io' },
    ] };
// Chips-test VIC-20 platform
class VIC20ChipsPlatform {
    constructor(mainElement) {
        this.running = false;
        this.timer = null;
        this.lastLoadedProgram = null;
        this.mainElement = mainElement;
        this.machine = new vic20_1.VIC20ChipsMachine();
    }
    async start() {
        console.log("VIC20ChipsPlatform start() called - EMULATOR DISABLED FOR TESTING");
        // DISABLED: Emulator loading for testing editor in one tab and isolated emulator in another
        // The platform is available but no emulator is loaded or displayed
        // Clear the main element but don't add any emulator
        //   this.mainElement.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">VIC-20 Emulator disabled for testing.<br>Use the isolated emulator in another tab.</div>';
        this.mainElement.innerHTML = '<iframe id="vic20-iframe" src="vic20-iframe.html" style="width: 100%; height: 500px; border: none;"></iframe>';
        console.log("VIC20ChipsPlatform: iframe created, setting up with auto-compilation");
        // Wait for the iframe to load, then set it up with auto-compilation
        setTimeout(() => {
            this.setupIframeWithAutoCompilation();
        }, 1000);
        // Set up a listener for compilation events to reload the iframe
        this.setupCompilationListener();
        // Show control buttons (reset, pause, resume)
        this.updateControlButtons();
    }
    setupCompilationListener() {
        // Listen for compilation events from the IDE
        const originalSetCompileOutput = window.setCompileOutput;
        if (originalSetCompileOutput) {
            window.setCompileOutput = (data) => {
                // Call the original function
                originalSetCompileOutput(data);
                // If compilation was successful, reload the iframe with the new program
                if (data && data.output && !data.errors) {
                    console.log("VIC20ChipsPlatform: Compilation detected, reloading iframe");
                    setTimeout(() => {
                        this.setupIframeWithAutoCompilation();
                    }, 500);
                }
            };
        }
    }
    nextFrame() {
        if (this.running)
            this.machine.advanceFrame(() => false);
    }
    pause() {
        console.log("VIC20ChipsPlatform pause() called");
        // Send pause command to iframe emulator
        const frame = document.getElementById("vic20-iframe");
        if (frame && frame.contentWindow) {
            frame.contentWindow.postMessage({ type: 'pause' }, '*');
            console.log("VIC20ChipsPlatform: Sent pause command to iframe");
        }
        // Also pause the local machine for consistency
        this.running = false;
        if (this.timer)
            this.timer.stop();
    }
    resume() {
        console.log("VIC20ChipsPlatform resume() called");
        // Send resume command to iframe emulator
        const frame = document.getElementById("vic20-iframe");
        if (frame && frame.contentWindow) {
            frame.contentWindow.postMessage({ type: 'resume' }, '*');
            console.log("VIC20ChipsPlatform: Sent resume command to iframe");
        }
        // Also resume the local machine for consistency
        this.running = true;
        if (this.timer)
            this.timer.start();
    }
    loadROM(title, rom) {
        console.log("VIC20ChipsPlatform loadROM called with title:", title, "and", rom.length, "bytes");
        // Store the program for reload after reset
        this.lastLoadedProgram = { title, rom };
        var frame = document.getElementById("vic20-iframe");
        if (frame && frame.contentWindow) {
            // For BASIC programs, the tokenized PRG is already compiled and passed as 'rom'
            // VIC-20 uses the same Commodore BASIC V2 as C64, so we can load the tokenized PRG directly
            // No special handling needed - just load it like any other program
            // For non-BASIC programs or if we couldn't get the source, use the regular method
            // Instead of using URL parameters for large programs, use postMessage
            if (rom.length > 1000) { // If program is larger than 1KB, use postMessage
                console.log("VIC20ChipsPlatform: Large program detected, using postMessage instead of URL");
                // Load the iframe with just the base URL
                const baseURL = 'vic20-iframe.html?t=' + Date.now();
                frame.src = baseURL;
                // Set up a one-time load event listener
                const onLoad = () => {
                    console.log("VIC20ChipsPlatform: iframe loaded, sending program via postMessage");
                    // Send the program data via postMessage
                    frame.contentWindow.postMessage({
                        type: 'compiled_program',
                        program: rom,
                        autoLoad: true
                    }, '*');
                    frame.removeEventListener('load', onLoad);
                };
                frame.addEventListener('load', onLoad);
            }
            else {
                // For small programs, use URL parameters
                const vic20_debug = window.vic20_debug;
                if (vic20_debug && vic20_debug.generateIframeURL) {
                    // Handle async generateIframeURL (like C64 does)
                    const urlResult = vic20_debug.generateIframeURL(rom);
                    if (urlResult instanceof Promise) {
                        urlResult.then((iframeURL) => {
                            console.log("VIC20ChipsPlatform: Generated iframe URL:", iframeURL);
                            if (iframeURL) {
                                const cacheBuster = '&t=' + Date.now();
                                const freshURL = iframeURL + cacheBuster;
                                console.log("VIC20ChipsPlatform: Loading fresh URL with cache buster:", freshURL);
                                // Set up a one-time load event listener
                                const onLoad = () => {
                                    console.log("VIC20ChipsPlatform: iframe loaded, calling checkForProgramInURL");
                                    if (frame.contentWindow.checkForProgramInURL) {
                                        frame.contentWindow.checkForProgramInURL();
                                    }
                                    frame.removeEventListener('load', onLoad);
                                };
                                frame.addEventListener('load', onLoad);
                                // Set the location (this triggers the load event)
                                frame.contentWindow.location = freshURL;
                            }
                            else {
                                console.error("VIC20ChipsPlatform: generateIframeURL returned null");
                            }
                        }).catch((error) => {
                            console.error("VIC20ChipsPlatform: Error generating iframe URL:", error);
                        });
                    }
                    else {
                        // Synchronous version
                        const iframeURL = urlResult;
                        console.log("VIC20ChipsPlatform: Generated iframe URL:", iframeURL);
                        if (iframeURL) {
                            const cacheBuster = '&t=' + Date.now();
                            const freshURL = iframeURL + cacheBuster;
                            console.log("VIC20ChipsPlatform: Loading fresh URL with cache buster:", freshURL);
                            // Set up a one-time load event listener
                            const onLoad = () => {
                                console.log("VIC20ChipsPlatform: iframe loaded, calling checkForProgramInURL");
                                if (frame.contentWindow.checkForProgramInURL) {
                                    frame.contentWindow.checkForProgramInURL();
                                }
                                frame.removeEventListener('load', onLoad);
                            };
                            frame.addEventListener('load', onLoad);
                            // Set the location (this triggers the load event)
                            frame.contentWindow.location = freshURL;
                        }
                        else {
                            console.error("VIC20ChipsPlatform: generateIframeURL returned null");
                        }
                    }
                }
                else {
                    console.error("VIC20ChipsPlatform: vic20_debug.generateIframeURL not available");
                }
            }
        }
        else {
            console.error("VIC20ChipsPlatform: iframe not found or contentWindow not available");
        }
        if (this.machine) {
            this.machine.loadProgram(rom);
        }
        else {
            console.error("VIC20ChipsPlatform: machine is null!");
        }
    }
    // New method to handle initial iframe setup with auto-compilation
    setupIframeWithAutoCompilation() {
        console.log("VIC20ChipsPlatform: Setting up iframe with auto-compilation");
        var frame = document.getElementById("vic20-iframe");
        if (!frame || !frame.contentWindow) {
            console.error("VIC20ChipsPlatform: iframe not found or contentWindow not available");
            return;
        }
        const vic20_debug = window.vic20_debug;
        if (!vic20_debug || !vic20_debug.openIframeWithCurrentProgram) {
            console.error("VIC20ChipsPlatform: vic20_debug not available");
            return;
        }
        // Check if we have a compiled program
        const iframeURL = vic20_debug.openIframeWithCurrentProgram();
        console.log("VIC20ChipsPlatform: Initial iframe URL check:", iframeURL);
        if (iframeURL) {
            // We have a compiled program, load it with cache busting
            console.log("VIC20ChipsPlatform: Found compiled program, loading iframe");
            const cacheBuster = '&t=' + Date.now();
            const freshURL = iframeURL + cacheBuster;
            console.log("VIC20ChipsPlatform: Loading fresh URL with cache buster:", freshURL);
            this.loadIframeWithProgram(freshURL);
        }
        else {
            // No compiled program, trigger compilation
            console.log("VIC20ChipsPlatform: No compiled program found, triggering compilation");
            this.triggerCompilationAndReload();
        }
    }
    loadIframeWithProgram(iframeURL) {
        var frame = document.getElementById("vic20-iframe");
        if (!frame || !frame.contentWindow)
            return;
        // Set up a one-time load event listener
        const onLoad = () => {
            console.log("VIC20ChipsPlatform: iframe loaded, calling checkForProgramInURL");
            if (frame.contentWindow.checkForProgramInURL) {
                frame.contentWindow.checkForProgramInURL();
            }
            frame.removeEventListener('load', onLoad);
        };
        frame.addEventListener('load', onLoad);
        // Set the location (this triggers the load event)
        frame.contentWindow.location = iframeURL;
    }
    triggerCompilationAndReload() {
        var _a, _b;
        console.log("VIC20ChipsPlatform: Triggering compilation...");
        // Access the global worker to trigger compilation
        const worker = window.worker;
        if (!worker) {
            console.error("VIC20ChipsPlatform: Global worker not found");
            return;
        }
        // Set up a listener for compilation completion
        const originalOnMessage = worker.onmessage;
        worker.onmessage = (event) => {
            // Call the original handler
            if (originalOnMessage) {
                originalOnMessage.call(worker, event);
            }
            // Check if compilation completed successfully
            if (event.data && event.data.output) {
                console.log("VIC20ChipsPlatform: Compilation completed, reloading iframe");
                // Wait a bit for the compilation output to be processed
                setTimeout(() => {
                    const vic20_debug = window.vic20_debug;
                    if (vic20_debug && vic20_debug.openIframeWithCurrentProgram) {
                        const newIframeURL = vic20_debug.openIframeWithCurrentProgram();
                        if (newIframeURL) {
                            // Add a cache-busting parameter to ensure we get the latest version
                            const cacheBuster = '&t=' + Date.now();
                            const freshURL = newIframeURL + cacheBuster;
                            console.log("VIC20ChipsPlatform: Loading fresh URL with cache buster:", freshURL);
                            this.loadIframeWithProgram(freshURL);
                        }
                    }
                    // Restore original message handler
                    worker.onmessage = originalOnMessage;
                }, 1000);
            }
        };
        // Trigger compilation by sending a build message
        if (worker.postMessage) {
            worker.postMessage({
                type: 'build',
                files: ((_b = (_a = window.IDE) === null || _a === void 0 ? void 0 : _a.getCurrentProject()) === null || _b === void 0 ? void 0 : _b.getFiles()) || {}
            });
        }
        else {
            console.error("VIC20ChipsPlatform: Worker postMessage not available");
            worker.onmessage = originalOnMessage;
        }
    }
    getPresets() {
        return VIC20_PRESETS;
    }
    getMemoryMap() {
        return VIC20_MEMORY_MAP;
    }
    getDefaultExtension() {
        return ".c";
    }
    getROMExtension(rom) {
        // VIC-20 PRG files start with load address (little-endian)
        // Common load addresses: 0x1001 (BASIC), 0x1200, 0x1300, etc.
        if (rom && rom.length >= 2) {
            const loadAddress = (rom[1] << 8) | rom[0];
            // Check if it's a valid VIC-20 load address
            if (loadAddress >= 0x1000 && loadAddress <= 0xFFFF) {
                return ".prg";
            }
        }
        return ".bin";
    }
    readAddress(a) {
        return this.machine.read(a);
    }
    writeAddress(a, v) {
        this.machine.write(a, v);
    }
    getCPUState() {
        return this.machine.getCPUState();
    }
    saveState() {
        return this.machine.saveState();
    }
    loadState(state) {
        this.machine.loadState(state);
    }
    reset() {
        console.log("VIC20ChipsPlatform reset() called");
        // Simply reload the iframe - much simpler and gives a fresh state
        const frame = document.getElementById("vic20-iframe");
        if (frame) {
            // Reload the iframe with a cache buster to force a fresh load
            // If the program was loaded via URL, it will automatically reload
            // If it was loaded via postMessage, we'll need to handle that in the iframe
            const currentSrc = frame.src.split('?')[0]; // Get base URL without params
            const cacheBuster = '?t=' + Date.now();
            // If we have a last loaded program and it's small enough for URL, regenerate URL
            if (this.lastLoadedProgram && this.lastLoadedProgram.rom.length <= 1000) {
                const vic20_debug = window.vic20_debug;
                if (vic20_debug && vic20_debug.generateIframeURL) {
                    const urlResult = vic20_debug.generateIframeURL(this.lastLoadedProgram.rom);
                    if (urlResult instanceof Promise) {
                        urlResult.then((iframeURL) => {
                            if (iframeURL) {
                                frame.src = iframeURL + '&t=' + Date.now();
                                console.log("VIC20ChipsPlatform: Reloaded iframe with program URL");
                            }
                            else {
                                frame.src = currentSrc + cacheBuster;
                                console.log("VIC20ChipsPlatform: Reloaded iframe (fallback)");
                            }
                        });
                    }
                    else {
                        const iframeURL = urlResult;
                        if (iframeURL) {
                            frame.src = iframeURL + '&t=' + Date.now();
                            console.log("VIC20ChipsPlatform: Reloaded iframe with program URL");
                        }
                        else {
                            frame.src = currentSrc + cacheBuster;
                            console.log("VIC20ChipsPlatform: Reloaded iframe (fallback)");
                        }
                    }
                }
                else {
                    // Fallback: just reload current src
                    frame.src = frame.src + (frame.src.includes('?') ? '&' : '?') + 't=' + Date.now();
                    console.log("VIC20ChipsPlatform: Reloaded iframe (fallback - no generateIframeURL)");
                }
            }
            else {
                // Large program or no program - just reload with cache buster
                frame.src = frame.src + (frame.src.includes('?') ? '&' : '?') + 't=' + Date.now();
                console.log("VIC20ChipsPlatform: Reloaded iframe");
            }
        }
        // Also reset the local machine for consistency
        if (this.machine) {
            this.machine.reset();
        }
    }
    updateControlButtons() {
        // VIC-20 supports reset, pause, and resume
        const resetButton = document.getElementById('dbg_reset');
        const pauseButton = document.getElementById('dbg_pause');
        const resumeButton = document.getElementById('dbg_go');
        if (resetButton) {
            resetButton.style.display = 'inline-block';
            console.log("VIC20ChipsPlatform: Reset button visible");
        }
        if (pauseButton) {
            pauseButton.style.display = 'inline-block';
            console.log("VIC20ChipsPlatform: Pause button visible");
        }
        if (resumeButton) {
            resumeButton.style.display = 'inline-block';
            console.log("VIC20ChipsPlatform: Resume button visible");
        }
    }
    setKeyInput(key, code, flags) {
        this.machine.setKeyInput(key, code, flags);
    }
    loadControlsState(state) {
        this.machine.loadControlsState(state);
    }
    saveControlsState() {
        return this.machine.saveControlsState();
    }
    getFPS() {
        return this.machine.getFPS();
    }
    showHelp() {
        return "https://8bitworkshop.com/docs/platforms/cbm/index.html#vic-20";
    }
    isStable() {
        // Assume stable for chips-test emulator
        return true;
    }
    isRunning() {
        return this.running;
    }
    getToolForFilename(filename) {
        if (filename.toLowerCase().endsWith(".bas"))
            return "c64basic";
        if (filename.endsWith(".c"))
            return "cc65";
        if (filename.endsWith(".dasm"))
            return "dasm";
        if (filename.endsWith(".acme"))
            return "acme";
        if (filename.endsWith(".wiz"))
            return "wiz";
        return "cc65";
    }
}
// DISABLED: VIC-20 platform registration to allow testing editor in one tab and isolated emulator in another
// PLATFORMS['vic20'] = VIC20ChipsPlatform;
// ENABLED: Platform registration but emulator is disabled in start() method
emu_1.PLATFORMS['vic20'] = VIC20ChipsPlatform;
// Export the platform class for dynamic loading
exports.default = VIC20ChipsPlatform;
//# sourceMappingURL=vic20.js.map