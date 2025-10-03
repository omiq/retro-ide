"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vic20_1 = require("../machine/vic20");
const emu_1 = require("../common/emu");
const VIC20_PRESETS = [
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
        this.running = false;
        if (this.timer)
            this.timer.stop();
    }
    resume() {
        this.running = true;
        if (this.timer)
            this.timer.start();
    }
    loadROM(title, rom) {
        console.log("VIC20ChipsPlatform loadROM called with title:", title, "and", rom.length, "bytes");
        var frame = document.getElementById("vic20-iframe");
        if (frame && frame.contentWindow) {
            const vic20_debug = window.vic20_debug;
            if (vic20_debug && vic20_debug.openIframeWithCurrentProgram) {
                // Debug: Log the URL being generated
                const iframeURL = vic20_debug.openIframeWithCurrentProgram();
                console.log("VIC20ChipsPlatform: Generated iframe URL:", iframeURL);
                if (iframeURL) {
                    // Add cache busting to ensure we get the latest version
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
                    console.error("VIC20ChipsPlatform: openIframeWithCurrentProgram returned null");
                }
            }
            else {
                console.error("VIC20ChipsPlatform: vic20_debug not available");
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
        this.machine.reset();
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