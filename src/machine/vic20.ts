// Add global VIC-20 debug functions that are available even when machine isn't initialized
(function() {
  // Add global functions for VIC-20 iframe URL generation
  (window as any).vic20_debug = {
    // Generate iframe URL with program data
    generateIframeURL: (programData: Uint8Array, useBase64: boolean = true) => {
      const baseURL = 'vic20-iframe.html';
      
      if (useBase64) {
        // Convert to base64 for shorter URLs
        const binaryString = String.fromCharCode.apply(null, Array.from(programData));
        const base64Data = btoa(binaryString);
        return `${baseURL}?program=${encodeURIComponent(base64Data)}`;
      } else {
        // Convert to hex string
        const hexString = Array.from(programData).map(b => b.toString(16).padStart(2, '0')).join(' ');
        return `${baseURL}?hex=${encodeURIComponent(hexString)}`;
      }
    },
    
    // Open iframe with current compiled program
    openIframeWithCurrentProgram: () => {
      const output = (window as any).IDE?.getCurrentOutput();
      if (output && output instanceof Uint8Array) {
        const url = (window as any).vic20_debug.generateIframeURL(output);
        //window.open(url, '_blank');
        console.log('Opened VIC-20 iframe with current program:', url);
        return url;
      } else {
        console.error('No compiled program available. Compile first.');
        return null;
      }
    },
    
    // Get current program as hex string for manual loading
    getCurrentProgramHex: () => {
      const output = (window as any).IDE?.getCurrentOutput();
      if (output && output instanceof Uint8Array) {
        const hexString = Array.from(output).map(b => b.toString(16).padStart(2, '0')).join(' ');
        console.log('Current program hex:', hexString);
        return hexString;
      } else {
        console.error('No compiled program available. Compile first.');
        return null;
      }
    },
    
    // Get current program info
    getCurrentProgramInfo: () => {
      const output = (window as any).IDE?.getCurrentOutput();
      if (output && output instanceof Uint8Array) {
        console.log('Current program info:');
        console.log('  Size:', output.length, 'bytes');
        console.log('  First 16 bytes:', Array.from(output.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' '));
        if (output.length >= 2) {
          const loadAddress = (output[1] << 8) | output[0];
          console.log('  Load address: 0x' + loadAddress.toString(16));
        }
        return {
          size: output.length,
          loadAddress: output.length >= 2 ? (output[1] << 8) | output[0] : null,
          firstBytes: Array.from(output.slice(0, 16))
        };
      } else {
        console.error('No compiled program available. Compile first.');
        return null;
      }
    }
  };
  
  console.log("✅ VIC-20 debug functions added to window.vic20_debug");
  console.log("Available functions:");
  console.log("  - vic20_debug.generateIframeURL(programData, useBase64)");
  console.log("  - vic20_debug.openIframeWithCurrentProgram()");
  console.log("  - vic20_debug.getCurrentProgramHex()");
  console.log("  - vic20_debug.getCurrentProgramInfo()");
})();

import { Machine, CpuState, EmuState } from '../common/baseplatform';

declare global {
  interface Window {
    vic20_module?: any;
    Module?: any;
    vic20Instance?: VIC20ChipsMachine;
  }
}

export class VIC20ChipsMachine implements Machine {
  private module: any = null;
  private canvas: HTMLCanvasElement | null = null;
  private running = false;
  private name: string;
  private description: string;
  private programLoaded = false; // Track if a program has been loaded
  private isLoadingProgram = false; // Prevent infinite loops during loading

  private emulatorFocused = false; // Track if emulator is focused
  
  // CPU stub for interface compliance
  cpu = {
    getPC: () => 0,
    getSP: () => 0,
    isStable: () => true,
    saveState: () => ({ PC: 0, SP: 0 }),
    loadState: (state: any) => {},
    reset: () => {},
    connectMemoryBus: (bus: any) => {}
  };

  constructor() {
    this.name = "VIC-20 (chips-test)";
    this.description = "VIC-20 emulator using chips-test WebAssembly";
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }

  async init(): Promise<void> {
    try {
      console.log("Initializing chips-test VIC-20 emulator...");

      // Create canvas for the emulator
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'canvas';
      this.canvas.width = 800;
      this.canvas.height = 501;
      this.canvas.style.border = '1px solid #333';
      this.canvas.style.width = '100%';
      this.canvas.style.height = 'auto';
      this.canvas.style.maxWidth = '800px';
      this.canvas.style.maxHeight = '600px';
      this.canvas.style.outline = 'none';
      this.canvas.style.cursor = 'pointer'; // Add pointer cursor to indicate clickable
      
      // Add canvas to the pre-existing VIC-20 chips div
      const vic20Div = document.getElementById('vic20-chips-div');
      const vic20Screen = document.getElementById('vic20-chips-screen');
      
      if (vic20Div && vic20Screen) {
        vic20Screen.appendChild(this.canvas);
        console.log("✅ Added VIC-20 canvas to pre-existing div");
      } else {
        // Fallback: add to document body
        document.body.appendChild(this.canvas);
        console.log("✅ Added VIC-20 canvas to document body");
      }

      // Connect the canvas to the emulator immediately
      this.connectCanvasToEmulator();
      
      // Add click-to-focus functionality
      this.addClickToFocusFunctionality();
      
      // Add simple focus prevention without complex tracking
      this.addSimpleFocusProtection();
      
      // Load the VIC-20 script if not already loaded (non-blocking)
      this.loadVIC20ScriptIfNeeded();
      
      // Add drag and drop listeners
      this.addCanvasDragAndDropListeners();
      
      // Try to detect module after a short delay (non-blocking)
        setTimeout(() => {
          this.detectModule();
        this.enableJoystickSupport();
      }, 1000);
      
    } catch (error) {
      console.error("Error initializing VIC-20 chips emulator:", error);
    }
  }



  private loadVIC20ScriptIfNeeded(): void {
    // Check if VIC-20 script is already loaded
    if (typeof (window as any).h !== 'undefined') {
      console.log("✅ VIC-20 script already loaded");
      return;
    }
    
    // Check if script tag already exists
    const existingScript = document.querySelector('script[src*="vic20.js"]');
    if (existingScript) {
      console.log("✅ VIC-20 script tag already exists, waiting for it to load");
      return;
    }
    
    console.log("🔧 Loading VIC-20 script...");
    
    // Load the VIC-20 script with timestamp to prevent caching
    const script = document.createElement('script');
    script.src = `res/vic20.js?t=${Date.now()}`;
    script.async = true;
    
    script.onload = () => {
      console.log("✅ VIC-20 script loaded successfully");
      
      // Check if the VIC-20 script set up any global keyboard listeners
      setTimeout(() => {
        console.log("🔍 Checking for global keyboard event listeners...");
            const h = (window as any).h;
        if (h) {
          console.log("🔍 VIC-20 'h' object functions:", Object.keys(h).filter(k => typeof h[k] === 'function'));
          
          // Check if canvas has any event listeners
          if (h.canvas) {
            console.log("🔍 VIC-20 canvas found:", h.canvas);
            console.log("🔍 Canvas tabIndex:", h.canvas.tabIndex);
            console.log("🔍 Canvas focusable:", h.canvas.tabIndex >= 0);
          }
        }
      }, 1000);
    };
    
    script.onerror = (error) => {
      console.error("❌ Failed to load VIC-20 script:", error);
    };
    
    document.head.appendChild(script);
  }

  private detectModule(): void {
    // Try to detect the module
    if (typeof (window as any).Module !== 'undefined' && (window as any).Module) {
      console.log("Found Module object, setting module reference");
      this.module = (window as any).Module;
    } else if ((window as any).h) {
      console.log("Found 'h' object, using as module");
      this.module = (window as any).h;
    } else {
      console.log("VIC-20 module not detected yet, will retry later");
      return;
    }
    
    console.log("VIC-20 chips-test emulator module detected");
  }
  
  private enableJoystickSupport(): void {
    console.log("🔧 Enabling joystick support...");
    
    if ((window as any).h && typeof (window as any).h.__sargs_add_kvp === 'function') {
      try {
        (window as any).h.__sargs_add_kvp('joystick', 'true');
        console.log("✅ Joystick support enabled via URL parameters");
      } catch (e) {
        console.log("❌ Error enabling joystick support:", e);
      }
    }
    
    // Also try to enable joystick support in the module
    if (this.module && typeof this.module.vic20_enable_joystick === 'function') {
      try {
        this.module.vic20_enable_joystick(true);
        console.log("✅ Joystick support enabled via module function");
      } catch (e) {
        console.log("❌ Error enabling joystick support in module:", e);
      }
    }
  }
  
  private connectCanvasToEmulator(): void {
    if (!this.canvas) {
      console.log("❌ No canvas available for emulator connection");
      return;
    }
    
    console.log("🔗 Connecting canvas to VIC-20 emulator for display output...");
    
    // Try to connect the canvas to the emulator module
    if (this.module) {
      // Set the canvas on the module if it has a canvas property
      if (typeof this.module.canvas === 'undefined') {
        this.module.canvas = this.canvas;
        console.log("✅ Connected canvas to module.canvas");
      }
      
      // Try to set the canvas on the global scope for the WASM module
      if (typeof (window as any).canvas === 'undefined') {
        (window as any).canvas = this.canvas;
        console.log("✅ Connected canvas to window.canvas");
      }
      
      // Try to trigger a display refresh
      if (typeof this.module.requestAnimationFrame === 'function') {
        console.log("✅ Module has requestAnimationFrame - display should work");
      }
    }
    
    // Add drag-and-drop event listeners to the canvas for manual file loading
    this.addCanvasDragAndDropListeners();
    
    // Check if the canvas is being used by the emulator
    setTimeout(() => {
      if (this.canvas) {
        const ctx = this.canvas.getContext('2d');
        if (ctx) {
          // Try to draw a test pattern to verify the canvas is working
          ctx.fillStyle = 'black';
          ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
          ctx.fillStyle = 'white';
          ctx.font = '16px monospace';
          ctx.fillText('VIC-20 Emulator Ready', 10, 30);
          console.log("✅ Canvas is working - test pattern drawn");
        }
      }
    }, 1000);
  }

  private async waitForModuleDetection(): Promise<void> {
    // Wait for module to be detected
    let attempts = 0;
    const maxAttempts = 20; // 2 seconds
    
    while (attempts < maxAttempts) {
      if (this.module || (window as any).Module || (window as any).h) {
        this.detectModule();
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      console.log("VIC-20 module detection timed out, but emulator should still work");
      this.detectModule();
    }
  }

  run(): void {
    if (this.module && this.running) return;
    this.running = true;
    
    // The chips-test emulator runs automatically, we just need to ensure it's started
    if (this.module && typeof (this.module as any).vic20_run === 'function') {
      (this.module as any).vic20_run();
    } else if (typeof (window as any).vic20_run === 'function') {
      (window as any).vic20_run();
    }
  }

  stop(): void {
    this.running = false;
    // The chips-test emulator doesn't have a stop function, it runs continuously
    // We just mark it as not running
  }

  reset(): void {
    if (this.module && typeof (this.module as any).vic20_reset === 'function') {
      (this.module as any).vic20_reset();
    } else if (typeof (window as any).vic20_reset === 'function') {
      (window as any).vic20_reset();
    }
  }

  advanceFrame(trap: () => boolean): number {
    // The chips-test emulator runs automatically
    return 0;
  }

  loadROM(data: Uint8Array, title?: string): void {
    console.log(`VIC20ChipsPlatform loadROM called with title: ${title} and ${data.length} bytes`);
    
    // Store the program data for later use
    const prgData = data;
    
    // Debug compilation output
    this.debugCompilationOutput();
    
    // Use the simplified approach: direct drop event
    this.loadProgram(prgData);
    
    // Add global debug functions
    this.addGlobalDebugFunctions();
  }

  loadControlsState(state: any): void {
    // No controls state for VIC-20 chips
  }

  saveControlsState(): any {
    return {};
  }

  loadProgram(program: Uint8Array): void {
    console.log("VIC20ChipsPlatform loadROM called with title: hello.c and", program.length, "bytes");
    
    if (this.isLoadingProgram) {
      console.log("⚠️ Program already loading, ignoring to prevent infinite loop");
      return;
    }
    
    this.isLoadingProgram = true;
    
    try {
      // Get the VIC-20 module
    const h = (window as any).h;
      if (!h) {
        console.log("❌ No 'h' object available for loading program");
        return;
      }
      
      console.log("✅ Found 'h' object, using as module");
      
      // Try to load the program using the drop function
      if (typeof h.__sapp_emsc_begin_drop === 'function') {
        console.log("🎯 Loading program via drop function...");
        
        // Create a File object
        const file = new File([program], "main.prg", { type: "application/octet-stream" });
          
          // Create a DataTransfer and add the File
        const dt = new DataTransfer();
        dt.items.add(file);
          
          // Create a synthetic drop event
        const dropEvent = new DragEvent("drop", {
            dataTransfer: dt,
            bubbles: true,
            cancelable: true
          });
          
          // Find the canvas and dispatch the event
        const canvas = document.getElementById("canvas");
          if (canvas) {
            canvas.dispatchEvent(dropEvent);
            console.log("✅ Drop event dispatched to canvas");
            
          // Wait for program to load, then execute
            setTimeout(() => {
            console.log("🎯 Executing loaded program...");
              this.executeLoadedProgram();
          }, 1000);
          } else {
            console.log("❌ Canvas not found");
          }
        } else {
        console.log("❌ No drop function available");
      }
    } catch (error) {
      console.error("Error loading program:", error);
    } finally {
      // Reset the flag after a delay
            setTimeout(() => {
        this.isLoadingProgram = false;
      }, 2000);
    }
  }
  

  

  
  private executeLoadedProgram(): void {
    console.log("🎯 Executing loaded program...");
    
    const h = (window as any).h;
    if (!h) {
      console.log("❌ No 'h' object available for execution");
      return;
    }
    
    // Try to find and call an execution function
    const executionFunctions = Object.keys(h).filter(fn => 
      fn.toLowerCase().includes('run') || 
      fn.toLowerCase().includes('execute') ||
      fn.toLowerCase().includes('start') ||
      fn.toLowerCase().includes('main')
    );
    
    console.log("🎯 Found potential execution functions:", executionFunctions);
    
    // Try the most likely execution function
    if (typeof h.__sapp_emsc_begin_drop === 'function') {
      console.log("🎯 Trying __sapp_emsc_begin_drop...");
      try {
        h.__sapp_emsc_begin_drop();
        console.log("✅ Successfully called __sapp_emsc_begin_drop");
      } catch (error) {
        console.log("❌ Error calling __sapp_emsc_begin_drop:", error);
      }
    }
    
    // Try other common execution functions
    for (const funcName of executionFunctions) {
      if (typeof h[funcName] === 'function') {
        console.log(`🎯 Trying ${funcName}...`);
        try {
          h[funcName]();
          console.log(`✅ Successfully called ${funcName}`);
          break;
        } catch (error) {
          console.log(`❌ Error calling ${funcName}:`, error);
        }
      }
    }
  }
  
  private loadProgramViaURL(program: Uint8Array): void {
    console.log("=== ATTEMPTING URL PARAMETER LOAD ===");
    
    let prgData: Uint8Array;
    
    // Check if program already has PRG header
    if (program.length >= 2 && program[0] === 0x18 && program[1] === 0x10) {
      console.log("Program already has PRG header, using as-is");
      prgData = program;
    } else {
      console.log("Adding PRG header to program");
      // VIC-20 PRG header: 0x18, 0x10 (load address 0x1000)
      prgData = new Uint8Array(program.length + 2);
      prgData[0] = 0x18; // Low byte of load address (0x10)
      prgData[1] = 0x10; // High byte of load address (0x10)
      prgData.set(program, 2);
    }
    
    // Create a blob URL for the program
    const blob = new Blob([prgData], { type: 'application/octet-stream' });
    const fileUrl = URL.createObjectURL(blob);
    console.log("Created temporary file URL:", fileUrl);
    
    // Create new URL with file parameter
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('file', fileUrl);
    newUrl.searchParams.set('autorun', '1');
    newUrl.searchParams.set('joystick', 'true'); // Enable joystick support
    console.log("New URL with file parameter and joystick:", newUrl.toString());
    
    // Try to add the file parameter to the emulator via the 'h' object
    if ((window as any).h) {
      const h = (window as any).h;
      
      // Look for URL-related functions
      const urlFunctions = Object.keys(h).filter(fn => 
        fn.toLowerCase().includes('url') || 
        fn.toLowerCase().includes('param') || 
        fn.toLowerCase().includes('args') || 
        fn.toLowerCase().includes('parse')
      );
      console.log("URL-related functions found:", urlFunctions);
      
      // Try calling any URL-related functions
      for (const fn of urlFunctions) {
        if (typeof h[fn] === 'function') {
          console.log(`Trying to call ${fn}...`);
          try {
            h[fn]();
            console.log(`✅ Successfully called ${fn}`);
          } catch (e) {
            console.log(`❌ Error calling ${fn}:`, e);
          }
        }
      }
      
      // Try to add file parameter via __sargs_add_kvp if available
      if (typeof h.__sargs_add_kvp === 'function') {
        console.log("Trying to add file parameter via __sargs_add_kvp...");
        try {
          h.__sargs_add_kvp('file', fileUrl);
          h.__sargs_add_kvp('autorun', '1');
          h.__sargs_add_kvp('joystick', 'true'); // Enable joystick support
          
          // Add input parameter if present in URL
          const urlParams = new URLSearchParams(window.location.search);
          const inputParam = urlParams.get('input');
          if (inputParam) {
            console.log("Found input parameter:", inputParam);
            h.__sargs_add_kvp('input', inputParam);
          }
          
          console.log("✅ Successfully added file parameters including joystick support");
        } catch (e) {
          console.log("❌ Error adding file parameters:", e);
        }
      }
    }
    
    // Fallback to drop method after a short delay
    setTimeout(() => {
      console.log("Falling back to drop method...");
      this.loadProgramViaDrop(prgData);
    }, 1000);
  }
  
  private loadProgramViaDrop(prgData: Uint8Array): void {
    console.log("=== ATTEMPTING DROP METHOD LOAD ===");
    
    // Parse PRG header
    const loadAddress = (prgData[1] << 8) | prgData[0];
    console.log("Detected load address: 0x" + loadAddress.toString(16).toUpperCase() + " (" + loadAddress + ")");
    console.log("PRG header bytes: 0x" + prgData[0].toString(16).toUpperCase() + " 0x" + prgData[1].toString(16).toUpperCase());
    
    // Validate load address
    if (loadAddress === 0x1001 || loadAddress === 0x1200 || loadAddress === 0x1018) {
      if (loadAddress === 0x1018) {
        console.log("✅ Valid VIC-20 BASIC program detected (0x1018) - alternative load address");
      } else {
        console.log("✅ Valid VIC-20 program detected");
      }
    } else {
      console.log("⚠️ Unexpected load address - may not be a valid VIC-20 program");
    }
    
    // Check for available functions
    const h = (window as any).h;
    const availableWindowFunctions = Object.keys(window).filter(key => 
      typeof (window as any)[key] === 'function' && 
      (key.toLowerCase().includes('drop') || key.toLowerCase().includes('load') || key.toLowerCase().includes('run'))
    );
    const availableModuleFunctions = this.module ? Object.keys(this.module).filter(key => 
      typeof this.module![key] === 'function' && 
      (key.toLowerCase().includes('drop') || key.toLowerCase().includes('load') || key.toLowerCase().includes('run'))
    ) : [];
    
    console.log("Available window functions:", availableWindowFunctions);
    console.log("Available module functions:", availableModuleFunctions);
    
    console.log("PRG data length:", prgData.length);
    console.log("PRG header:", prgData[0], prgData[1]);
    console.log("First few bytes of program:", prgData.slice(0, 10));
    
    // Allocate memory in WASM heap
    let ptr: number;
    try {
      if (typeof this.module!._malloc === 'function') {
        ptr = this.module!._malloc(prgData.length);
        console.log("✅ Allocated memory at address:", ptr);
      } else if (typeof this.module!._fs_emsc_alloc === 'function') {
        ptr = this.module!._fs_emsc_alloc(prgData.length);
        console.log("✅ Allocated memory using _fs_emsc_alloc at address:", ptr);
      } else {
        console.log("❌ No memory allocation function available");
        return;
      }
    } catch (error) {
      console.log("❌ Error allocating memory:", error);
      return;
    }
    
    // Copy data to WASM heap
    try {
      if (this.module!.HEAPU8) {
        this.module!.HEAPU8.set(prgData, ptr);
        console.log("✅ Copied PRG data to WASM heap");
      } else if (this.module!.HEAP8) {
        this.module!.HEAP8.set(prgData, ptr);
        console.log("✅ Copied PRG data to WASM heap using HEAP8");
      } else if (this.module!.HEAP) {
        // Try to copy using the generic HEAP
        for (let i = 0; i < prgData.length; i++) {
          this.module!.HEAP[ptr + i] = prgData[i];
        }
        console.log("✅ Copied PRG data to WASM heap using generic HEAP");
      } else {
        console.log("❌ No WASM heap available - trying alternative approach");
        // Try calling drop functions without memory allocation
        this.callDropFunctionsWithoutMemory(prgData);
        return;
      }
    } catch (error) {
      console.log("❌ Error copying data to WASM heap:", error);
      console.log("Trying alternative approach without memory allocation...");
      this.callDropFunctionsWithoutMemory(prgData);
      return;
    }
    
    console.log("PRG header:", prgData[0], prgData[1]);
    console.log("First few bytes of program:", prgData.slice(0, 10));
    
    // Attempt to trigger drag-and-drop functionality using 'h' object
    console.log("Attempting to trigger drag-and-drop functionality using 'h' object");
    console.log("PRG data to load:", prgData);
    console.log("PRG data length:", prgData.length);
    console.log("First 10 bytes:", prgData.slice(0, 10));
    
    // Check if we have the complete drop sequence
    const dropFunctions = ['__sapp_emsc_begin_drop', '__sapp_emsc_drop', '__sapp_emsc_end_drop'];
    const hasAllDropFunctions = dropFunctions.every(fn => typeof h[fn] === 'function');
    
    if (hasAllDropFunctions) {
      console.log("Found complete drop sequence, calling all three functions...");
      
      try {
        h.__sapp_emsc_begin_drop();
        console.log("Called __sapp_emsc_begin_drop successfully");
      } catch (error) {
        console.log("❌ Error calling __sapp_emsc_begin_drop:", error);
      }
      
      try {
        h.__sapp_emsc_drop(ptr, prgData.length);
        console.log("Called __sapp_emsc_drop successfully");
      } catch (error) {
        console.log("❌ Error calling __sapp_emsc_drop:", error);
      }
      
      try {
        h.__sapp_emsc_end_drop();
        console.log("Called __sapp_emsc_end_drop successfully");
      } catch (error) {
        console.log("❌ Error calling __sapp_emsc_end_drop:", error);
      }
    } else {
      console.log("❌ Missing drop functions:", dropFunctions.filter(fn => typeof h[fn] !== 'function'));
    }
    
    console.log("=== SIMPLIFIED EXECUTION APPROACH ===");
    
    // Call _main to ensure emulator is running
    if (typeof this.module!._main === 'function') {
      try {
        this.module!._main();
        console.log("✅ Calling _main to ensure emulator is running...");
      } catch (error) {
        console.log("❌ Error calling _main:", error);
      }
    }
    
    console.log("✅ Program loaded and emulator should be running");
    console.log("✅ Check the VIC-20 screen for output");
    console.log("✅ Try clicking on the canvas to interact with the emulator");
    
    // Force display refresh
    this.forceDisplayRefresh();
    
    // Verify and execute the loaded ROM
    console.log("🔄 About to call verifyAndExecuteLoadedROM...");
    this.verifyAndExecuteLoadedROM(prgData);
    
    console.log("✅ VIC-20 program loading complete!");
    console.log("✅ The emulator should now be running with your program");
    console.log("✅ Check the VIC-20 screen for any output");
    console.log("✅ You can interact with the emulator by clicking on the canvas");
    
    // Try direct memory loading as a fallback
    this.tryDirectMemoryLoading(prgData);
    
    // Debug: Log compilation output
    this.debugCompilationOutput();
    
    // Also try to trigger execution manually
    this.tryManualExecution(prgData);
    
    // Try the drop approach as well
    this.tryDropApproach(prgData);
  }
  
  private debugCompilationOutput(): void {
    console.log("=== DEBUGGING COMPILATION OUTPUT ===");
    
    // Try to access the worker's virtual file system
    if (typeof (window as any).worker !== 'undefined') {
      console.log("✅ Worker found, checking virtual file system...");
      
      // Check if we can access the store
      if ((window as any).worker.store) {
        console.log("✅ Store found, checking files...");
        const files = Object.keys((window as any).worker.store.workfs || {});
        console.log("Files in virtual file system:", files);
        
        // Check for main output file
        if ((window as any).worker.store.workfs['main']) {
          const mainFile = (window as any).worker.store.workfs['main'];
          console.log("Main file found:", mainFile);
          console.log("Main file size:", mainFile.data.length);
          console.log("Main file first 32 bytes:", Array.from(mainFile.data.slice(0, 32)).map((b: number) => b.toString(16).padStart(2, '0')).join(' '));
        }
        
        // Check for map file
        if ((window as any).worker.store.workfs['main.map']) {
          const mapFile = (window as any).worker.store.workfs['main.map'];
          console.log("Map file found:", mapFile);
          console.log("Map file content:", mapFile.data);
        }
      }
    }
    
    // Also check if we can access the builder
    if (typeof (window as any).builder !== 'undefined') {
      console.log("✅ Builder found");
      console.log("Builder steps:", (window as any).builder.steps);
    }
    
    // Check for any global compilation state
    if (typeof (window as any).current_output !== 'undefined') {
      console.log("✅ Current output found:", (window as any).current_output);
      console.log("Current output length:", (window as any).current_output?.length);
      
      // Log the first 32 bytes of the current output
      if ((window as any).current_output && (window as any).current_output.length > 0) {
        console.log("Current output first 32 bytes (hex):", Array.from((window as any).current_output.slice(0, 32)).map((b: number) => b.toString(16).padStart(2, '0')).join(' '));
        console.log("Current output first 32 bytes (decimal):", Array.from((window as any).current_output.slice(0, 32)).join(' '));
      }
    }
    
    // Check for compilation parameters
    if (typeof (window as any).compparams !== 'undefined') {
      console.log("✅ Compilation parameters found:", (window as any).compparams);
    }
    
    // Check for debug symbols
    if (typeof (window as any).platform !== 'undefined' && (window as any).platform.debugSymbols) {
      console.log("✅ Debug symbols found:", (window as any).platform.debugSymbols);
    }
  }
  
  private addGlobalDebugFunctions(): void {
    // Add global functions for debugging and testing
    (window as any).vic20_debug = {
      loadProgram: (data: Uint8Array) => this.loadProgram(data),
      getCanvas: () => this.getCanvas(),
      getModule: () => this.module,
      getCPUState: () => this.getCPUState(),
      readMemory: (address: number) => this.read(address),
      writeMemory: (address: number, value: number) => this.write(address, value),
      reset: () => this.reset(),
      run: () => this.run(),
      stop: () => this.stop(),
      // Add function to generate iframe URL with program data
      generateIframeURL: (programData: Uint8Array, useBase64: boolean = true) => {
        const baseURL = 'vic20-iframe.html';
        
        if (useBase64) {
          // Convert to base64 for shorter URLs
          const binaryString = String.fromCharCode.apply(null, Array.from(programData));
          const base64Data = btoa(binaryString);
          return `${baseURL}?program=${encodeURIComponent(base64Data)}`;
        } else {
          // Convert to hex string
          const hexString = Array.from(programData).map(b => b.toString(16).padStart(2, '0')).join(' ');
          return `${baseURL}?hex=${encodeURIComponent(hexString)}`;
        }
      },
      // Add function to open iframe with current compiled program
      openIframeWithCurrentProgram: () => {
        const output = (window as any).IDE?.getCurrentOutput();
        if (output && output instanceof Uint8Array) {
          const url = (window as any).vic20_debug.generateIframeURL(output);
          window.open(url, '_blank');
          console.log('Opened VIC-20 iframe with current program:', url);
        } else {
          console.error('No compiled program available. Compile first.');
        }
      }
    };
    
    console.log("✅ VIC-20 debug functions added to window.vic20_debug");
    console.log("Available functions:");
    console.log("  - vic20_debug.loadProgram(data)");
    console.log("  - vic20_debug.getCanvas()");
    console.log("  - vic20_debug.getModule()");
    console.log("  - vic20_debug.getCPUState()");
    console.log("  - vic20_debug.readMemory(address)");
    console.log("  - vic20_debug.writeMemory(address, value)");
    console.log("  - vic20_debug.reset()");
    console.log("  - vic20_debug.run()");
    console.log("  - vic20_debug.stop()");
    console.log("  - vic20_debug.generateIframeURL(programData, useBase64)");
    console.log("  - vic20_debug.openIframeWithCurrentProgram()");
  }
  
  private loadProgramDirectly(data: Uint8Array): void {
    console.log("=== LOADING PROGRAM DIRECTLY ===");
    
    if (!this.module) {
      console.log("❌ No module available");
      return;
    }
    
    try {
      // Parse PRG header
      const loadAddress = (data[1] << 8) | data[0];
      const programData = data.slice(2); // Skip PRG header
      
      console.log("Load address:", loadAddress.toString(16));
      console.log("Program data length:", programData.length);
      
      // Load program directly into VIC-20 memory
      for (let i = 0; i < programData.length; i++) {
        const address = loadAddress + i;
        this.write(address, programData[i]);
      }
      
      console.log("✅ Program loaded directly into VIC-20 memory");
      
      // For BASIC programs, set the BASIC start pointer
      if (loadAddress === 0x1001) {
        this.write(0x2B, loadAddress & 0xFF); // BASIC start low
        this.write(0x2C, (loadAddress >> 8) & 0xFF); // BASIC start high
        this.write(0x2D, (loadAddress + programData.length) & 0xFF); // BASIC end low
        this.write(0x2E, ((loadAddress + programData.length) >> 8) & 0xFF); // BASIC end high
        
        console.log("✅ BASIC pointers set");
      }
      
      // Try to trigger program execution
      const h = (window as any).h;
      if (h) {
        console.log("🔍 Checking for vic20_reset function...");
        if (typeof h.vic20_reset === 'function') {
          h.vic20_reset();
          console.log("✅ VIC-20 reset called");
        } else {
          console.log("❌ vic20_reset function not found");
        }
        
        // Also try to set PC to load address
        console.log("🔍 Checking for vic20_set_pc function...");
        if (typeof h.vic20_set_pc === 'function') {
          h.vic20_set_pc(loadAddress);
          console.log("✅ PC set to load address");
        } else {
          console.log("❌ vic20_set_pc function not found");
        }
        
        // Try alternative reset methods
        console.log("🔍 Trying alternative reset methods...");
        if (typeof h.reset === 'function') {
          h.reset();
          console.log("✅ h.reset() called");
        }
        if (typeof h.vic20_reset_cpu === 'function') {
          h.vic20_reset_cpu();
          console.log("✅ h.vic20_reset_cpu() called");
        }
        if (typeof h.vic20_run === 'function') {
          h.vic20_run();
          console.log("✅ h.vic20_run() called");
        }
        
        // Try to trigger execution by calling _main
        console.log("🔍 Trying to trigger execution via _main...");
        if (typeof h._main === 'function') {
          h._main();
          console.log("✅ h._main() called to trigger execution");
        }
      } else {
        console.log("❌ No 'h' object available for execution");
      }
      
      // Force display refresh
      this.forceDisplayRefresh();
      
    } catch (error) {
      console.log("❌ Error in direct loading:", error);
    }
  }
  
  private tryManualExecution(prgData: Uint8Array): void {
    console.log("=== TRYING MANUAL EXECUTION ===");
    
    if (!this.module) {
      console.log("❌ No module available for manual execution");
      return;
    }
    
    try {
      // Parse PRG header
      const loadAddress = (prgData[1] << 8) | prgData[0];
      const programData = prgData.slice(2); // Skip PRG header
      
      console.log("Manual execution - Load address:", loadAddress.toString(16));
      console.log("Manual execution - Program data length:", programData.length);
      
      // Try to load program directly into VIC-20 memory
      for (let i = 0; i < programData.length; i++) {
        const address = loadAddress + i;
        this.write(address, programData[i]);
      }
      
      console.log("✅ Program loaded directly into VIC-20 memory for manual execution");
      
      // For BASIC programs, set the BASIC start pointer
      if (loadAddress === 0x1001) {
        this.write(0x2B, loadAddress & 0xFF); // BASIC start low
        this.write(0x2C, (loadAddress >> 8) & 0xFF); // BASIC start high
        this.write(0x2D, (loadAddress + programData.length) & 0xFF); // BASIC end low
        this.write(0x2E, ((loadAddress + programData.length) >> 8) & 0xFF); // BASIC end high
        
        console.log("✅ BASIC pointers set for manual execution");
      }
      
      // Try to trigger program execution
      if (typeof this.module.vic20_reset === 'function') {
        this.module.vic20_reset();
        console.log("✅ VIC-20 reset called for manual execution");
      }
      
      // Also try to set PC to load address
      if (typeof this.module.vic20_set_pc === 'function') {
        this.module.vic20_set_pc(loadAddress);
        console.log("✅ PC set to load address for manual execution");
      }
      
    } catch (error) {
      console.log("❌ Error in manual execution:", error);
    }
  }
  
  private tryDirectMemoryLoading(prgData: Uint8Array): void {
    console.log("=== TRYING DIRECT MEMORY LOADING ===");
    
    if (!this.module) {
      console.log("❌ No module available for direct memory loading");
      return;
    }
    
    // Parse PRG header
    const loadAddress = (prgData[1] << 8) | prgData[0];
    const programData = prgData.slice(2); // Skip PRG header
    
    console.log("Load address:", loadAddress.toString(16));
    console.log("Program data length:", programData.length);
    
    // Try to load program directly into VIC-20 memory
    try {
      // Load program data into memory starting at load address
      for (let i = 0; i < programData.length; i++) {
        const address = loadAddress + i;
        this.write(address, programData[i]);
      }
      
      console.log("✅ Program loaded directly into VIC-20 memory");
      
      // Try to set PC to load address for BASIC programs
      if (loadAddress === 0x1001) {
        // For BASIC programs, we need to set the BASIC start pointer
        this.write(0x2B, loadAddress & 0xFF); // BASIC start low
        this.write(0x2C, (loadAddress >> 8) & 0xFF); // BASIC start high
        this.write(0x2D, (loadAddress + programData.length) & 0xFF); // BASIC end low
        this.write(0x2E, ((loadAddress + programData.length) >> 8) & 0xFF); // BASIC end high
        
        console.log("✅ BASIC pointers set for program execution");
      }
      
      // Try to trigger program execution
      if (typeof this.module.vic20_reset === 'function') {
        this.module.vic20_reset();
        console.log("✅ VIC-20 reset called to start program execution");
      }
      
    } catch (error) {
      console.log("❌ Error in direct memory loading:", error);
    }
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  getFPS(): number {
    return 60; // VIC-20 runs at 60 FPS
  }

  read(address: number): number {
    if (this.module && this.module.vic20_read_memory) {
      return this.module.vic20_read_memory(address);
    }
    return 0;
  }

  write(address: number, value: number): void {
    if (this.module && this.module.vic20_write_memory) {
      this.module.vic20_write_memory(address, value);
    }
  }

  getCPUState(): CpuState {
    return {
      PC: 0,
      SP: 0
    };
  }

  saveState(): EmuState {
    if (this.module && this.module.vic20_save_state) {
      const state = this.module.vic20_save_state();
      return { c: { PC: 0, SP: 0 }, b: state };
    }
    return { c: { PC: 0, SP: 0 }, b: null };
  }

  loadState(state: EmuState): void {
    if (this.module && this.module.vic20_load_state && state.b) {
      this.module.vic20_load_state(state.b);
    }
  }

  destroy(): void {
    this.running = false;
    
    // Clean up global reference
    if ((window as any).vic20Instance === this) {
      (window as any).vic20Instance = null;
    }
    
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.canvas = null;
    this.module = null;
    
    // Hide the VIC-20 chips div when destroyed
    const vic20Div = document.getElementById('vic20-chips-div');
    if (vic20Div) {
      vic20Div.style.display = 'none';
      console.log("✅ Hidden VIC-20 chips div");
    }
  }
  

 
  // Joystick support
  private joymask0 = 0;
  private joymask1 = 0;

  setKeyInput(key: number, code: number, flags: number): void {
    // Handle joystick input for VIC-20
    if (key == 16 || key == 17 || key == 18 || key == 224) return; // meta keys
    
    var mask = 0;
    var mask2 = 0;
    
    // Player 1 joystick (arrow keys + space)
    if (key == 37) { key = 0x8; mask = 0x4; } // LEFT
    if (key == 38) { key = 0xb; mask = 0x1; } // UP
    if (key == 39) { key = 0x9; mask = 0x8; } // RIGHT
    if (key == 40) { key = 0xa; mask = 0x2; } // DOWN
    if (key == 32) { mask = 0x10; } // FIRE (space)
    
    // Player 2 joystick (WASD + E)
    if (key == 65) { key = 65; mask2 = 0x4; } // LEFT (A)
    if (key == 87) { key = 87; mask2 = 0x1; } // UP (W)
    if (key == 68) { key = 68; mask2 = 0x8; } // RIGHT (D)
    if (key == 83) { key = 83; mask2 = 0x2; } // DOWN (S)
    if (key == 69) { mask2 = 0x10; } // FIRE (E)
    
    // Function keys
    if (key == 113) { key = 0xf1; } // F2
    if (key == 115) { key = 0xf3; } // F4
    if (key == 119) { key = 0xf5; } // F8
    if (key == 121) { key = 0xf7; } // F10
    
    if (flags & 1) { // KeyDown
      this.joymask0 |= mask;
      this.joymask1 |= mask2;
    } else if (flags & 2) { // KeyUp
      this.joymask0 &= ~mask;
      this.joymask1 &= ~mask2;
    }
    
    // Update joystick state in the chips-test emulator
    if (this.module && typeof this.module.vic20_joystick === 'function') {
      this.module.vic20_joystick(this.joymask0, this.joymask1);
    } else if ((window as any).h && typeof (window as any).h.vic20_joystick === 'function') {
      (window as any).h.vic20_joystick(this.joymask0, this.joymask1);
    } else if ((window as any).h && typeof (window as any).h.__sargs_add_kvp === 'function') {
      // Try to set joystick state via URL parameters
      try {
        (window as any).h.__sargs_add_kvp('joystick0', this.joymask0.toString());
        (window as any).h.__sargs_add_kvp('joystick1', this.joymask1.toString());
      } catch (e) {
        console.log("❌ Error setting joystick state:", e);
      }
    }
    
    // Also try to write joystick state directly to VIC-20 I/O registers
    if (this.module) {
      // VIC-20 joystick port 1 (VIA 1, port A)
      this.write(0x9111, this.joymask0);
      // VIC-20 joystick port 2 (VIA 2, port A) 
      this.write(0x9121, this.joymask1);
    }
  }

  // Simulate keyboard input for typing commands
  private simulateKeyboardInput(text: string): void {
    console.log("🎯 Attempting to simulate keyboard input for:", text);
    
    // Look for keyboard-related functions
    const h = (window as any).h;
    if (h) {
      const keyboardFunctions = Object.keys(h).filter(fn => 
        fn.toLowerCase().includes('key') || 
        fn.toLowerCase().includes('input') || 
        fn.toLowerCase().includes('char') ||
        fn.toLowerCase().includes('type') ||
        fn.toLowerCase().includes('text') ||
        fn.toLowerCase().includes('send') ||
        fn.toLowerCase().includes('write')
      );
      
      console.log("🎯 Found keyboard functions:", keyboardFunctions);
      
      // Try each keyboard function
      for (const fn of keyboardFunctions) {
        if (typeof h[fn] === 'function') {
          console.log(`🎯 Trying keyboard function: ${fn}`);
          try {
            h[fn](text);
            console.log(`✅ Successfully called ${fn} with text: ${text}`);
            return;
          } catch (e) {
            console.log(`❌ Error calling ${fn}:`, e);
          }
        }
      }
      
      // Try to find a function that can send text to the emulator
      if (typeof h.sendText === 'function') {
        console.log("🎯 Trying sendText function...");
        try {
          h.sendText(text);
          console.log(`✅ Successfully sent text via sendText: ${text}`);
          return;
        } catch (e) {
          console.log(`❌ Error calling sendText:`, e);
        }
      }
      
      // Try to find a function that can write to the emulator input
      if (typeof h.writeInput === 'function') {
        console.log("🎯 Trying writeInput function...");
        try {
          h.writeInput(text);
          console.log(`✅ Successfully wrote input: ${text}`);
          return;
        } catch (e) {
          console.log(`❌ Error calling writeInput:`, e);
        }
      }
    }
    
    // Fallback to individual key simulation with delays
    console.log("🎯 No keyboard function found, trying individual key simulation with delays...");
    let delay = 0;
    for (const char of text) {
      setTimeout(() => {
        const keyCode = char.charCodeAt(0);
        this.simulateKeyPress(keyCode);
      }, delay);
      delay += 50; // 50ms delay between characters
    }
  }

  private simulateKeyPress(keyCode: number): void {
    console.log(`🎯 Attempting to simulate key press for key code: ${keyCode}`);
    
    const h = (window as any).h;
    if (!h) {
      console.log("❌ No 'h' object available for key simulation");
      return;
    }
    
    // Log all available functions to see what keyboard functions exist
    console.log("🔍 Available functions on h object:", Object.keys(h));
    
    // Try different approaches for keyboard input
    const keyFunctions = [
      'keydown', 'keypress', 'keyup', 'key', 'input', 'sendKey', 'pressKey',
      'keyboard', 'keyboardInput', 'keyboardEvent', 'simulateKey', 'simulateKeyPress'
    ];
    
    for (const funcName of keyFunctions) {
      if (typeof h[funcName] === 'function') {
        console.log(`🎯 Trying ${funcName} function...`);
        try {
          // Try different parameter formats
          h[funcName](keyCode);
          console.log(`✅ ${funcName} called successfully with keyCode ${keyCode}`);
          return;
        } catch (e) {
          console.log(`❌ ${funcName} failed:`, e);
        }
      }
    }
    
    // If no keyboard functions found, try to create a keyboard event and dispatch it
    console.log("🎯 Trying to create and dispatch keyboard event...");
    try {
      const keyEvent = new KeyboardEvent('keydown', {
        keyCode: keyCode,
        which: keyCode,
        key: keyCode === 112 ? 'F1' : keyCode === 13 ? 'Enter' : String.fromCharCode(keyCode),
        code: keyCode === 112 ? 'F1' : keyCode === 13 ? 'Enter' : `Key${String.fromCharCode(keyCode)}`,
        bubbles: true,
        cancelable: true
      });
      
      // Try to dispatch on the canvas
      if (h.canvas) {
        h.canvas.dispatchEvent(keyEvent);
        console.log(`✅ Keyboard event dispatched on h.canvas for key ${keyCode}`);
        return;
      } else if (h.xc) {
        h.xc.dispatchEvent(keyEvent);
        console.log(`✅ Keyboard event dispatched on h.xc for key ${keyCode}`);
        return;
      } else if (this.canvas) {
        this.canvas.dispatchEvent(keyEvent);
        console.log(`✅ Keyboard event dispatched on this.canvas for key ${keyCode}`);
        return;
      }
    } catch (e) {
      console.log("❌ Error creating/dispatching keyboard event:", e);
    }
    
    console.log(`❌ No key function found for key ${keyCode} (${String.fromCharCode(keyCode)})`);
  }

  // Verify if the program was actually loaded into memory
  private verifyProgramLoaded(expectedData: Uint8Array): void {
    console.log("=== VERIFYING PROGRAM LOAD ===");
    
    if (!(window as any).h) {
      console.log("❌ No 'h' object available for verification");
      return;
    }
    
    const h = (window as any).h;
    
    // First, let's analyze what functions are available
    console.log("=== ANALYZING AVAILABLE FUNCTIONS ===");
    const availableFunctions = Object.keys(h);
    console.log("All available functions:", availableFunctions);
    
    // Look for any function that might be related to program execution
    const executionFunctions = availableFunctions.filter(func => 
      func.toLowerCase().includes('run') || 
      func.toLowerCase().includes('exec') || 
      func.toLowerCase().includes('start') || 
      func.toLowerCase().includes('main') ||
      func.toLowerCase().includes('call') ||
      func.toLowerCase().includes('jump')
    );
    console.log("Potential execution functions:", executionFunctions);
    
    // Try calling _main if it exists (this might restart the program)
    if (typeof h._main === 'function') {
      console.log("Found _main function, trying to call it...");
      try {
        h._main();
        console.log("✅ Successfully called _main function");
      } catch (error) {
        console.log("❌ Error calling _main function:", error);
      }
    }
    
    // Try to read memory at expected VIC-20 locations
    const memoryFunctions = [
      'vic20_read_memory', 'read_memory', 'memory_read', 'get_memory',
      'vic20_memory_read', 'read_byte', 'get_byte'
    ];
    
    let memoryReadFunction = null;
    for (const funcName of memoryFunctions) {
      if (typeof h[funcName] === 'function') {
        memoryReadFunction = h[funcName];
        console.log(`Found memory read function: ${funcName}`);
        break;
      }
    }
    
    if (memoryReadFunction) {
      // Check memory at common VIC-20 locations
      const locations = [0x1001, 0x1200, 0x1000, 0x1201];
      
      for (const addr of locations) {
        try {
          const value = memoryReadFunction(addr);
          console.log(`Memory at 0x${addr.toString(16).toUpperCase()}: 0x${value.toString(16).toUpperCase()} (${value})`);
        } catch (error) {
          console.log(`Error reading memory at 0x${addr.toString(16).toUpperCase()}:`, error);
        }
      }
      
      // Try to read the first few bytes of the expected program
      if (expectedData.length >= 2) {
        const loadAddress = expectedData[0] | (expectedData[1] << 8);
        console.log(`Checking memory starting at load address: 0x${loadAddress.toString(16).toUpperCase()}`);
        
        for (let i = 0; i < Math.min(10, expectedData.length - 2); i++) {
          try {
            const addr = loadAddress + i;
            const expected = expectedData[i + 2];
            const actual = memoryReadFunction(addr);
            const match = expected === actual ? "✅" : "❌";
            console.log(`${match} Memory[0x${addr.toString(16).toUpperCase()}]: expected 0x${expected.toString(16).toUpperCase()}, got 0x${actual.toString(16).toUpperCase()}`);
          } catch (error) {
            console.log(`Error reading memory at offset ${i}:`, error);
          }
        }
      }
    } else {
      console.log("❌ No memory read function found");
      
      // Try to get program state or loaded files info
      const stateFunctions = [
        'vic20_get_state', 'get_state', 'get_program_state', 'get_loaded_program',
        'vic20_program_info', 'program_info', 'get_file_info'
      ];
      
      for (const funcName of stateFunctions) {
        if (typeof h[funcName] === 'function') {
          try {
            const state = h[funcName]();
            console.log(`Program state from ${funcName}:`, state);
          } catch (error) {
            console.log(`Error calling ${funcName}:`, error);
          }
        }
      }
    }
  }

  private forceDisplayRefresh(): void {
    console.log("🔄 Forcing VIC-20 display refresh...");
    
    // Try multiple approaches to refresh the display
    if (this.module) {
      // Method 1: Use requestAnimationFrame if available
      if (typeof this.module.requestAnimationFrame === 'function') {
        console.log("✅ Using module.requestAnimationFrame for display refresh");
        this.module.requestAnimationFrame(() => {
          console.log("✅ Display refresh triggered via requestAnimationFrame");
        });
      }
      
      // Method 2: Try to call any display-related functions
      const displayFunctions = ['refresh', 'redraw', 'update', 'render', 'display'];
      for (const funcName of displayFunctions) {
        if (typeof this.module[funcName] === 'function') {
          console.log(`✅ Calling module.${funcName}() for display refresh`);
          try {
            this.module[funcName]();
          } catch (e) {
            console.log(`❌ Error calling ${funcName}:`, e);
          }
        }
      }
      
      // Method 3: Try to trigger a frame update
      if (typeof this.module._main === 'function') {
        console.log("✅ Calling _main again to trigger frame update");
        try {
          this.module._main();
        } catch (e) {
          console.log("❌ Error calling _main for display refresh:", e);
        }
      }
    }
    
    // Method 4: Draw a visual indicator on the canvas
    setTimeout(() => {
      if (this.canvas) {
        const ctx = this.canvas.getContext('2d');
        if (ctx) {
          // Draw a small indicator that the program is loaded
          ctx.fillStyle = 'green';
          ctx.fillRect(this.canvas.width - 20, 10, 10, 10);
          ctx.fillStyle = 'white';
          ctx.font = '12px monospace';
          ctx.fillText('LOADED', this.canvas.width - 80, 20);
          console.log("✅ Visual indicator drawn on canvas");
        }
      }
    }, 500);
    
    console.log("✅ Display refresh attempts completed");
  }

  private verifyAndExecuteLoadedROM(prgData: Uint8Array): void {
    console.log("🔄 DISABLED: verifyAndExecuteLoadedROM to prevent crashes");
    console.log("🔄 Skipping program verification and execution for safety");
    return;
  }
  
  private triggerProgramExecution(): void {
    console.log("🔄 DISABLED: triggerProgramExecution to prevent crashes");
    console.log("🔄 Skipping all execution function calls for safety");
    return;
  }

  private callDropFunctionsWithoutMemory(prgData: Uint8Array): void {
    console.log("🔄 DISABLED: callDropFunctionsWithoutMemory to prevent crashes");
    console.log("🔄 Skipping all drop function calls for safety");
    return;
  }

  private simulateFileReading(prgData: Uint8Array): void {
    console.log("🎯 === SIMULATING FILE READING (DISABLED FOR SAFETY) ===");
    
    // Temporarily disabled to prevent crashes
    console.log("🔄 Skipping emulator state check to prevent crashes");
    
    // Create a File object from the PRG data
    const blob = new Blob([prgData], { type: 'application/octet-stream' });
    const file = new File([blob], 'program.prg', { type: 'application/octet-stream' });
    console.log("📁 Created File object:", file.name, file.size, "bytes");
    
    // Store the file in h.dd (like the native drop handler does)
    if (this.module && this.module.h) {
      this.module.h.dd = file;
      console.log("📁 Stored file in h.dd");
    }
    
    // Find HEAPU8 for memory access
    let heapU8: Uint8Array | null = null;
    const h = this.module?.h;
    
    // Try multiple ways to find HEAPU8
    if ((window as any).t && (window as any).t instanceof Uint8Array) {
      heapU8 = (window as any).t;
      console.log("✅ Found HEAPU8 via window.t");
    } else if ((window as any).r && (window as any).r instanceof Uint8Array) {
      heapU8 = (window as any).r;
      console.log("✅ Found HEAPU8 via window.r");
    } else if (h?.HEAPU8) {
      heapU8 = h.HEAPU8;
      console.log("✅ Found HEAPU8 via h.HEAPU8");
    } else if (h?.HEAP8) {
      heapU8 = new Uint8Array(h.HEAP8.buffer);
      console.log("✅ Found HEAPU8 via h.HEAP8 conversion");
    } else if (h?.HEAP) {
      heapU8 = new Uint8Array(h.HEAP.buffer);
      console.log("✅ Found HEAPU8 via h.HEAP conversion");
    }
    
    if (!heapU8) {
      console.error("❌ No WASM heap available for file reading simulation");
      return;
    }
    
    // Parse PRG header to get load address
    const loadAddress = prgData[0] | (prgData[1] << 8);
    console.log(`📍 Load address from PRG header: 0x${loadAddress.toString(16).padStart(4, '0')} (${loadAddress})`);
    
    // Extract program data (skip 2-byte header)
    const programData = prgData.slice(2);
    console.log(`📦 Program data size: ${programData.length} bytes`);
    
    // DEBUG: Memory contents before loading to see what's there
    console.log("🔍 DEBUG: Memory contents before loading:");
    const addressesToCheck = [0x1000, 0x1001, 0x1018, 0x1200];
    for (const addr of addressesToCheck) {
      try {
        const beforeValue = heapU8[addr];
        console.log(`  - 0x${addr.toString(16).padStart(4, '0')}: 0x${beforeValue.toString(16).padStart(2, '0')} (before)`);
      } catch (e) {
        console.log(`  - 0x${addr.toString(16).padStart(4, '0')}: <error> (${e})`);
      }
    }
    
    // Copy program data directly to load address
    try {
      heapU8.set(programData, loadAddress);
      console.log(`✅ Successfully copied ${programData.length} bytes to address 0x${loadAddress.toString(16).padStart(4, '0')}`);
    } catch (e) {
      console.error("❌ Error copying data to WASM heap:", e);
      return;
    }
    
    // DEBUG: Verify the data was actually copied correctly
    console.log("🔍 DEBUG: Memory contents after loading:");
    for (let i = 0; i < Math.min(16, programData.length); i++) {
      const addr = loadAddress + i;
      try {
        const afterValue = heapU8[addr];
        const expectedValue = programData[i];
        const match = afterValue === expectedValue ? "✅" : "❌";
        console.log(`  - 0x${addr.toString(16).padStart(4, '0')}: 0x${afterValue.toString(16).padStart(2, '0')} (expected: 0x${expectedValue.toString(16).padStart(2, '0')}) ${match}`);
      } catch (e) {
        console.log(`  - 0x${addr.toString(16).padStart(4, '0')}: <error> (${e})`);
      }
    }
    
    // For now, just copy the data and don't interfere with normal drag-and-drop
    console.log("🔄 Data copied successfully - skipping drop function calls to avoid conflicts");
    
    // Trigger execution with key presses after a delay
    setTimeout(() => {
      console.log("🎯 Triggering execution with key presses...");
      this.simulateKeyPress(13); // RETURN
    }, 200);
    
    setTimeout(() => {
      this.simulateKeyPress(112); // F1
    }, 300);
    
    setTimeout(() => {
      this.simulateKeyPress(114); // F3
    }, 400);
    
    // Also try to trigger execution via direct function calls
    setTimeout(() => {
      this.triggerProgramExecution();
    }, 500);
  }

  private debugMemoryAfterLoading(): void {
    console.log("🔍 DEBUG: Checking memory after loading...");
    
    try {
      const h = (window as any).h;
      if (!h) {
        console.log("❌ No 'h' object available for memory check");
        return;
      }
      
      // Try to read memory at common VIC-20 addresses
      const addressesToCheck = [
        0x1000, // BASIC program start
        0x1001, // Alternative BASIC start
        0x1018, // Another common start
        0x1200, // Another common start
        0x2000, // Cartridge area
        0x4000, // Cartridge area
        0x6000, // Cartridge area
        0x8000, // Character ROM
        0x9000, // I/O area
        0xc000, // BASIC ROM
        0xe000, // KERNAL ROM
      ];
      
      console.log("🔍 DEBUG: Memory contents at key addresses:");
      
      for (const addr of addressesToCheck) {
        try {
          // Try different memory reading approaches
          let value = null;
          
          // Try direct memory access if available
          if ((window as any).t && typeof (window as any).t[addr] !== 'undefined') {
            value = (window as any).t[addr];
            console.log(`  - 0x${addr.toString(16).padStart(4, '0')}: 0x${value.toString(16).padStart(2, '0')} (global t)`);
          } else if ((window as any).r && typeof (window as any).r[addr] !== 'undefined') {
            value = (window as any).r[addr];
            console.log(`  - 0x${addr.toString(16).padStart(4, '0')}: 0x${value.toString(16).padStart(2, '0')} (global r)`);
          } else if (h.HEAPU8 && typeof h.HEAPU8[addr] !== 'undefined') {
            value = h.HEAPU8[addr];
            console.log(`  - 0x${addr.toString(16).padStart(4, '0')}: 0x${value.toString(16).padStart(2, '0')} (HEAPU8)`);
          } else if (h.HEAP8 && typeof h.HEAP8[addr] !== 'undefined') {
            value = h.HEAP8[addr];
            console.log(`  - 0x${addr.toString(16).padStart(4, '0')}: 0x${value.toString(16).padStart(2, '0')} (HEAP8)`);
          } else if (h.HEAP && typeof h.HEAP[addr] !== 'undefined') {
            value = h.HEAP[addr];
            console.log(`  - 0x${addr.toString(16).padStart(4, '0')}: 0x${value.toString(16).padStart(2, '0')} (HEAP)`);
          } else {
            console.log(`  - 0x${addr.toString(16).padStart(4, '0')}: <no access> (no heap available)`);
          }
        } catch (e) {
          console.log(`  - 0x${addr.toString(16).padStart(4, '0')}: <error> (${e})`);
        }
      }
      
      // Try to find any memory reading functions
      console.log("🔍 DEBUG: Looking for memory reading functions...");
      const memoryFunctions = Object.keys(h).filter(fn => 
        typeof h[fn] === 'function' && 
        (fn.toLowerCase().includes('read') || 
         fn.toLowerCase().includes('memory') || 
         fn.toLowerCase().includes('peek') ||
         fn.toLowerCase().includes('get'))
      );
      console.log("  - Available memory functions:", memoryFunctions);
      
      // Try to read a range of memory if we have a memory reading function
      if (memoryFunctions.length > 0) {
        const testFn = memoryFunctions[0];
        console.log(`🔍 DEBUG: Testing memory reading with ${testFn}...`);
        
        try {
          // Try reading a range of memory
          const testRange = [0x1000, 0x1001, 0x1002, 0x1003, 0x1004, 0x1005];
          for (const addr of testRange) {
            try {
              const result = h[testFn](addr);
              console.log(`  - ${testFn}(0x${addr.toString(16).padStart(4, '0')}): ${result}`);
            } catch (e) {
              console.log(`  - ${testFn}(0x${addr.toString(16).padStart(4, '0')}): <error> (${e})`);
            }
          }
        } catch (e) {
          console.log(`  - Error testing ${testFn}:`, e);
        }
      }
      
    } catch (error) {
      console.log("❌ Error during memory debugging:", error);
    }
  }



  private checkAndResetEmulatorState(): void {
    console.log("🔍 DEBUG: Checking emulator state before loading...");
    
    try {
      const h = (window as any).h;
      if (!h) {
        console.log("❌ No 'h' object available for state check");
        return;
      }
      
      // Check current state
      console.log("🔍 DEBUG: Current emulator state:");
      console.log("  - calledRun:", h.calledRun);
      console.log("  - running:", this.running);
      console.log("  - programLoaded:", this.programLoaded);
      
      // Look for reset or initialization functions
      const resetFunctions = Object.keys(h).filter(fn => 
        typeof h[fn] === 'function' && 
        (fn.toLowerCase().includes('reset') || 
         fn.toLowerCase().includes('init') || 
         fn.toLowerCase().includes('clear') ||
         fn.toLowerCase().includes('boot') ||
         fn.toLowerCase().includes('start'))
      );
      
      console.log("🔍 DEBUG: Available reset/init functions:", resetFunctions);
      
      // Try to reset the emulator if needed
      if (resetFunctions.length > 0) {
        console.log("🔄 Attempting to reset emulator state...");
        
        for (const fn of resetFunctions) {
          try {
            console.log(`🎯 Trying to call ${fn}...`);
            h[fn]();
            console.log(`✅ Successfully called ${fn}()`);
            
            // Wait a moment for reset to take effect
            // Temporarily disabled setTimeout to prevent crashes
            console.log("🔄 Skipping setTimeout to prevent crashes");
            // setTimeout(() => {
            //   console.log("🔍 DEBUG: Emulator state after reset:");
            //   console.log("  - calledRun:", h.calledRun);
            //   console.log("  - running:", this.running);
            //   console.log("  - programLoaded:", this.programLoaded);
            // }, 100);
            
            return; // Successfully reset
          } catch (e) {
            console.log(`❌ Error calling ${fn}():`, e);
          }
        }
      }
      
      // If no reset functions, try calling _main to ensure emulator is running
      if (typeof h._main === 'function') {
        console.log("🔄 Calling _main to ensure emulator is running...");
        try {
          h._main();
          console.log("✅ Called _main successfully");
        } catch (e) {
          console.log("❌ Error calling _main:", e);
        }
      }
      
      // Try to clear any existing program data
      console.log("🔄 Attempting to clear existing program data...");
      if ((window as any).t) {
        try {
          // Temporarily disabled memory clearing to prevent crashes
          console.log("🔄 Skipping memory clearing to prevent crashes");
          // const heapU8 = (window as any).t;
          // for (let addr = 0x1000; addr < 0x2000; addr++) {
          //   heapU8[addr] = 0;
          // }
          // console.log("✅ Cleared BASIC program area");
        } catch (e) {
          console.log("❌ Error clearing program area:", e);
        }
      }
      
    } catch (error) {
      console.log("❌ Error during emulator state check:", error);
    }
  }

  private tryDropApproach(prgData: Uint8Array): void {
    // Original drop approach as fallback
    console.log("🔄 Trying drop approach as fallback...");
    
    try {
      const h = (window as any).h;
      if (!h) {
        console.log("❌ No 'h' object available");
        return;
      }
      
      // Create a proper File object with the program data
      const file = new File([prgData], 'program.prg', { 
        type: 'application/octet-stream',
        lastModified: Date.now()
      });
      
      // Create a proper DataTransfer object
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      
      // Create a proper drop event
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dataTransfer
      });
      
      // Find the correct canvas that has the drop event listeners
      let targetCanvas: HTMLCanvasElement | null = null;
      
      if (h.xc) {
        targetCanvas = h.xc;
        console.log("✅ Found canvas through h.xc:", targetCanvas);
      } else if (h.canvas) {
        targetCanvas = h.canvas;
        console.log("✅ Found canvas through h.canvas:", targetCanvas);
      } else {
        console.log("❌ No canvas found on h object");
        return;
      }
      
      console.log("🎯 Dispatching drop event on canvas:", targetCanvas);
      
      // Dispatch the drop event on the canvas
      const success = targetCanvas.dispatchEvent(dropEvent);
      console.log(`✅ Drop event dispatched successfully: ${success}`);
      
      // Wait a moment for the event to be processed
      setTimeout(() => {
        console.log("🔄 Drop event should have been processed by now");
        console.log("🎯 Checking if program is running...");
        
        // Check if calledRun changed (this might indicate the program started)
        console.log("🎯 Checking calledRun status:", h.calledRun);
        
        // Try calling _main a few times to see if it triggers execution
        for (let i = 0; i < 3; i++) {
          try {
            if (typeof h._main === 'function') {
              h._main();
              console.log(`✅ _main called successfully (attempt ${i + 1})`);
            }
          } catch (e) {
            console.log(`❌ Error calling _main (attempt ${i + 1}):`, e);
          }
          
          // Wait a bit between calls
          if (i < 2) {
            setTimeout(() => {}, 100);
          }
        }
        
      }, 300);
      
    } catch (error) {
      console.log("❌ Error during drop approach:", error);
    }
  }

  private addCanvasDragAndDropListeners(): void {
    // Try multiple canvas references
    let targetCanvas = this.canvas;
    
    if (!targetCanvas) {
      // Try to find canvas from the emulator
      const h = (window as any).h;
      if (h && h.canvas) {
        targetCanvas = h.canvas;
        console.log("🎯 Using emulator canvas for drag-and-drop listeners");
      } else if (h && h.xc) {
        targetCanvas = h.xc;
        console.log("🎯 Using emulator xc for drag-and-drop listeners");
      } else {
        // Try to find canvas by ID
        targetCanvas = document.getElementById("canvas") as HTMLCanvasElement;
        console.log("🎯 Using document canvas for drag-and-drop listeners");
      }
    }
    
    if (!targetCanvas) {
      console.log("❌ No canvas available for drag-and-drop listeners");
      return;
    }
    
    console.log("🎯 Adding drag-and-drop event listeners to canvas for manual file loading...");
    
    try {
      // Add drag-and-drop event listeners for manual file loading
      targetCanvas.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("🎯 Drag over detected on canvas");
      });
      
      targetCanvas.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("🎯 Manual drop event detected on canvas");
        
        // Prevent infinite loops - only handle manual drops, not programmatic ones
        if (this.isLoadingProgram) {
          console.log("⚠️ Program already loading, ignoring drop event to prevent infinite loop");
          return;
        }
        
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
          const file = files[0];
          console.log("🎯 Manual file dropped:", file.name, file.size, "bytes");
          
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result instanceof ArrayBuffer) {
              const data = new Uint8Array(event.target.result);
              console.log("🎯 Manual file data loaded:", data.length, "bytes");
              console.log("🎯 First 16 bytes:", Array.from(data.slice(0, 16)));
              
              // Load the manually dropped file using the simplified method
              this.loadProgram(data);
            }
          };
          reader.readAsArrayBuffer(file);
        }
      });
      
      console.log("✅ Manual drag-and-drop listeners added to canvas");
    } catch (error) {
      console.log("❌ Error adding drag-and-drop listeners:", error);
    }
  }

  // Add this method to help debug drag-and-drop vs our approach
  private captureDragAndDropData(): void {
    console.log("🔍 DEBUG: Setting up drag-and-drop capture...");
    
    try {
      const h = (window as any).h;
      if (!h) {
        console.log("❌ No 'h' object available");
        return;
      }
      
      // Store original functions
      const originalBeginDrop = h.__sapp_emsc_begin_drop;
      const originalDrop = h.__sapp_emsc_drop;
      const originalEndDrop = h.__sapp_emsc_end_drop;
      
      // Override with logging versions
      h.__sapp_emsc_begin_drop = function(...args: any[]) {
        console.log("🔍 CAPTURED: __sapp_emsc_begin_drop called with:", args);
        return originalBeginDrop.apply(this, args);
      };
      
      h.__sapp_emsc_drop = function(...args: any[]) {
        console.log("🔍 CAPTURED: __sapp_emsc_drop called with:", args);
        return originalDrop.apply(this, args);
      };
      
      h.__sapp_emsc_end_drop = function(...args: any[]) {
        console.log("🔍 CAPTURED: __sapp_emsc_end_drop called with:", args);
        return originalEndDrop.apply(this, args);
      };
      
      // Also capture h.dd changes
      let originalDd = h.dd;
      Object.defineProperty(h, 'dd', {
        get: function() { return originalDd; },
        set: function(value) {
          console.log("🔍 CAPTURED: h.dd set to:", value);
          if (value && value.length > 0) {
            console.log("🔍 CAPTURED: First file in h.dd:", value[0]);
            console.log("🔍 CAPTURED: File size:", value[0].size);
            console.log("🔍 CAPTURED: File name:", value[0].name);
          }
          originalDd = value;
        }
      });
      
      console.log("✅ Drag-and-drop capture set up. Now try dragging and dropping a file to see the captured data.");
      
    } catch (error) {
      console.log("❌ Error setting up drag-and-drop capture:", error);
    }
  }





  private addSimpleFocusProtection(): void {
    if (!this.canvas) return;

    console.log("✅ Simple focus protection added - no global overrides");
  }

  private addClickToFocusFunctionality(): void {
    if (!this.canvas) return;

    console.log("🎯 Adding click-to-focus functionality to VIC-20 canvas");

    // Make canvas focusable
    this.canvas.tabIndex = 0;
    this.canvas.style.outline = 'none';

    // Add click event listener to focus the canvas
    this.canvas.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      
      if (!this.emulatorFocused) {
        this.emulatorFocused = true;
        this.canvas?.focus();
        this.canvas!.style.border = '2px solid #4CAF50'; // Green border when focused
        this.canvas!.style.cursor = 'default'; // Change cursor to indicate focused state
        console.log("🎯 VIC-20 emulator focused - keyboard input enabled");
      }
    });

    // Add click event listener to document to unfocus when clicking elsewhere
    document.addEventListener('click', (event) => {
      // Check if the click was outside the canvas
      if (this.canvas && !this.canvas.contains(event.target as Node)) {
        if (this.emulatorFocused) {
          this.emulatorFocused = false;
          this.canvas!.style.border = '1px solid #333'; // Reset border
          this.canvas!.style.cursor = 'pointer'; // Reset cursor
          console.log("🎯 VIC-20 emulator unfocused - keyboard input disabled");
        }
      }
    });

    // Add keyboard event listeners that only work when focused
    this.canvas.addEventListener('keydown', (event) => {
      if (!this.emulatorFocused) {
        return; // Ignore keyboard events when not focused
      }
      
      console.log(`🎯 Key pressed in VIC-20 emulator: ${event.key} (keyCode: ${event.keyCode})`);
      
      // Forward the key event to the VIC-20 emulator using direct function calls
      this.forwardKeyEventToEmulator(event);
    });

    // Add keyup event listener
    this.canvas.addEventListener('keyup', (event) => {
      if (!this.emulatorFocused) {
        return; // Ignore keyboard events when not focused
      }
      
      console.log(`🎯 Key released in VIC-20 emulator: ${event.key} (keyCode: ${event.keyCode})`);
      
      // Forward the keyup event to the VIC-20 emulator using direct function calls
      this.forwardKeyUpEventToEmulator(event);
    });

    console.log("✅ Click-to-focus functionality added to VIC-20 canvas");
  }

  private forwardKeyEventToEmulator(event: KeyboardEvent): void {
    // Try to forward the key event to the VIC-20 emulator using direct function calls
    const h = (window as any).h;
    if (h) {
      // Try the VIC-20 keyboard input function with correct parameters
      if (typeof h._ === 'function') {
        try {
          h._(this.canvas, event.keyCode, 2, 0);
          console.log("🎯 Sent keydown to VIC-20 via _ function with keyCode:", event.keyCode);
        } catch (e) {
          console.log("❌ Error sending keydown:", e);
        }
      }
      
      // Also try the alternative keyboard input function
      if (typeof h.setKeyInput === 'function') {
        try {
          h.setKeyInput(event.keyCode, event.keyCode, 1); // 1 for keydown
          console.log("🎯 Sent keydown to VIC-20 via setKeyInput with keyCode:", event.keyCode);
        } catch (e) {
          console.log("❌ Error sending keydown via setKeyInput:", e);
        }
      }
    }
  }

  private forwardKeyUpEventToEmulator(event: KeyboardEvent): void {
    // Try to forward the keyup event to the VIC-20 emulator using direct function calls
    const h = (window as any).h;
    if (h) {
      // Try the VIC-20 keyboard input function with correct parameters
      if (typeof h.Z === 'function') {
        try {
          h.Z(this.canvas, event.keyCode, 3, 0);
          console.log("🎯 Sent keyup to VIC-20 via Z function with keyCode:", event.keyCode);
        } catch (e) {
          console.log("❌ Error sending keyup:", e);
        }
      }
      
      // Also try the alternative keyboard input function
      if (typeof h.setKeyInput === 'function') {
        try {
          h.setKeyInput(event.keyCode, event.keyCode, 2); // 2 for keyup
          console.log("🎯 Sent keyup to VIC-20 via setKeyInput with keyCode:", event.keyCode);
        } catch (e) {
          console.log("❌ Error sending keyup via setKeyInput:", e);
        }
      }
    }
  }
} 
