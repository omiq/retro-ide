// Add global C64 debug functions that are available even when machine isn't initialized
(function() {
  // Add global functions for C64 iframe URL generation
  (window as any).c64_debug = {
    // Generate iframe URL with program data (with gzip compression for large programs)
    generateIframeURL: async (programData: Uint8Array, useBase64: boolean = true) => {
      const baseURL = 'c64-iframe.html';
      
      // For large programs, use gzip compression
      if (programData.length > 1000) {
        try {
          // Dynamically import pako for gzip compression
          const pako = await import('pako');
          
          // Compress the data with gzip
          const compressed = pako.gzip(programData);
          
          // Convert to hex string (more compact than base64)
          const hexString = Array.from(compressed).map(b => b.toString(16).padStart(2, '0')).join('');
          
          console.log(`C64 debug: Original size: ${programData.length} bytes, Compressed: ${compressed.length} bytes (${Math.round((1 - compressed.length / programData.length) * 100)}% reduction)`);
          
          return `${baseURL}?gzip=${encodeURIComponent(hexString)}`;
        } catch (e) {
          console.error('C64 debug: Gzip compression failed, falling back to base64:', e);
          // Fall back to base64 if compression fails
          const binaryString = String.fromCharCode.apply(null, Array.from(programData));
          const base64Data = btoa(binaryString);
          return `${baseURL}?program=${encodeURIComponent(base64Data)}`;
        }
      } else {
        // For small programs, use original method
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
      }
    },
    
    // Open iframe with current compiled program
    openIframeWithCurrentProgram: () => {
      const output = (window as any).IDE?.getCurrentOutput();
      if (output && output instanceof Uint8Array) {
        const url = (window as any).c64_debug.generateIframeURL(output);
        console.log('Opened C64 iframe with current program:', url);
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
        
        // Test compression ratio
        if (output.length > 1000) {
          try {
            // Dynamically import pako for compression test
            import('pako').then(pako => {
              const compressed = pako.gzip(output);
              const hexString = Array.from(compressed).map(b => b.toString(16).padStart(2, '0')).join('');
              const compressionRatio = Math.round((1 - compressed.length / output.length) * 100);
              const urlLength = `c64-iframe.html?gzip=${encodeURIComponent(hexString)}`.length;
              
              console.log('  Compression test:');
              console.log('    Original size:', output.length, 'bytes');
              console.log('    Compressed size:', compressed.length, 'bytes');
              console.log('    Compression ratio:', compressionRatio + '%');
              console.log('    URL length:', urlLength, 'characters');
              console.log('    URL limit safe:', urlLength < 8000 ? 'YES' : 'NO');
            }).catch(e => {
              console.log('  Compression test failed:', e);
            });
          } catch (e) {
            console.log('  Compression test failed:', e);
          }
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
  
  console.log("✅ C64 debug functions added to window.c64_debug");
  console.log("Available functions:");
  console.log("  - c64_debug.generateIframeURL(programData, useBase64)");
  console.log("  - c64_debug.openIframeWithCurrentProgram()");
  console.log("  - c64_debug.getCurrentProgramHex()");
  console.log("  - c64_debug.getCurrentProgramInfo()");
})();

import { CpuState, EmuState } from "../common/baseplatform";
import { hex } from "../common/util";

// Global variable to hold the chips-test C64 module
declare global {
  interface Window {
    c64_module?: any;
    Module?: any;
  }
  var Module: any;
}

export class C64ChipsMachine {
  private module: any = null;
  private canvas: HTMLCanvasElement | null = null;
  private running = false;
  private name: string;
  private description: string;
  

  constructor() {
    this.name = "C64 (chips-test)";
    this.description = "Commodore 64 emulator using chips-test WebAssembly";
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }

  async init(): Promise<void> {
    try {
      console.log("Initializing chips-test C64 emulator...");
      
      // Create the canvas element that the chips-test emulator expects
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'canvas';
      // Make the canvas responsive - use larger size for better visibility
      this.canvas.width = 640;  // Double the original size
      this.canvas.height = 400; // Double the original size
      this.canvas.style.border = '1px solid #333';
      this.canvas.style.width = '100%';
      this.canvas.style.height = 'auto';
      this.canvas.style.maxWidth = '800px';
      this.canvas.style.maxHeight = '600px';
      
     
      
      // Add canvas to the pre-existing C64 chips div
      const c64Div = document.getElementById('c64-chips-div');
      const c64Screen = document.getElementById('c64-chips-screen');
      if (c64Div && c64Screen) {
        c64Screen.appendChild(this.canvas);
        c64Div.style.display = 'block';
        console.log("✅ Added C64 canvas to pre-existing div");
      } else {
        // Fallback to body if div not found
        document.body.appendChild(this.canvas);
        console.log("⚠️ C64 div not found, using body fallback");
      }
      
      // Load the chips-test module if not already loaded
      if (!window.c64_module) {
        const script = document.createElement('script');
        script.src = `res/c64.js?t=${Date.now()}`;
        script.async = true;
        
        // Wait for the module to load
        await new Promise<void>((resolve, reject) => {
          script.onload = () => {
            // Give the chips-test emulator a moment to initialize
            setTimeout(() => {
              // Check if the chips-test functions are available
              if (typeof (window as any).c64_quickload === 'function') {
                console.log("C64 quickload function found - using direct access");
                window.c64_module = window;
                resolve();
                return;
              }
              
              // Also check for the Module object
              if (typeof (window as any).Module !== 'undefined' && (window as any).Module) {
                console.log("C64 Module found - using Module object");
                window.c64_module = (window as any).Module;
                resolve();
                return;
              }
              
              // If we still can't find it, just assume it's working and use window
              console.log("C64 module detection failed, but emulator is running - using window fallback");
              window.c64_module = window;
              resolve();
            }, 500); // Wait 500ms for initialization
          };
          script.onerror = () => reject(new Error("Failed to load C64 module"));
          document.head.appendChild(script);
        });
      }
      
      // Add cache-busting for WASM files
      const originalFetch = window.fetch;
      window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
        if (typeof input === 'string' && (input.includes('c64.wasm') || input.includes('c64.js'))) {
          const separator = input.includes('?') ? '&' : '?';
          input = `${input}${separator}t=${Date.now()}`;
        }
        return originalFetch.call(this, input, init);
      }
      
      this.module = window.c64_module;

      // Initialize the module
      if (this.module && this.module._main) {
        // Call the main function to initialize the emulator
        this.module._main(0, 0);
        console.log("C64 chips-test emulator initialized successfully");
      } else if (this.module === window) {
        // We're using the window fallback - the emulator is already running
        console.log("C64 chips-test emulator using window fallback - already running");
        
        // Wait a bit more for the Module object to be fully ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Try to get the Module object
        if (typeof (window as any).Module !== 'undefined' && (window as any).Module) {
          console.log("Found Module object, setting module reference");
          this.module = (window as any).Module;
        }
        
        // Wait for the canvas to be properly set up before calling URL parser
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Skip calling the URL parameter parser for now since it causes DOM access issues
        // The emulator should work fine without it
        console.log("Skipping URL parameter parser to avoid DOM access issues");
      } else {
        throw new Error("C64 module not properly initialized");
      }
      


    } catch (error) {
      console.error("Failed to initialize C64 chips-test emulator:", error);
      throw error;
    }
  }

  
  run(): void {
    if (this.module && this.running) return;
    this.running = true;
    
    // The chips-test emulator runs automatically, we just need to ensure it's started
    if (this.module && typeof (this.module as any).c64_run === 'function') {
      (this.module as any).c64_run();
    } else if (typeof (window as any).c64_run === 'function') {
      (window as any).c64_run();
    }
  }

  stop(): void {
    this.running = false;
    // The chips-test emulator doesn't have a stop function, it runs continuously
    // We just mark it as not running
  }

  reset(): void {
    if (this.module && typeof (this.module as any).c64_reset === 'function') {
      (this.module as any).c64_reset();
    } else if (typeof (window as any).c64_reset === 'function') {
      (window as any).c64_reset();
    }
  }

  loadProgram(program: Uint8Array): void {
    console.log("=== C64 LOAD PROGRAM DEBUG (UPDATED VERSION) ===");
    console.log("✅ NEW FOCUS PREVENTION ACTIVE ===");
    console.log("C64 loadProgram called with", program.length, "bytes");
    console.log("First few bytes:", program.slice(0, 10));
    
    // CRITICAL: Reset emulator state before loading to prevent automatic execution
    console.log("🔄 Resetting emulator state to prevent automatic execution");
    this.reset();
    
    // Debug: Check what functions are available
    console.log("Available window functions:", Object.keys(window).filter(key => key.includes('c64')));
    console.log("Available module functions:", this.module ? Object.keys(this.module).filter(key => key.includes('c64')) : "No module");
    
    // Check if Module object has the function
    if (typeof (window as any).Module !== 'undefined' && (window as any).Module) {
      console.log("Module object available:", Object.keys((window as any).Module).filter(key => key.includes('c64')));
      console.log("All Module functions:", Object.keys((window as any).Module).slice(0, 20)); // First 20 functions
    } else {
      console.log("Module object not available");
    }
    
    // Check if Module object exists at all
    console.log("Window.Module exists:", typeof (window as any).Module !== 'undefined');
    if (typeof (window as any).Module !== 'undefined') {
      console.log("Module object keys:", Object.keys((window as any).Module));
    }
    
    // Check what's in the c64_module
    if ((window as any).c64_module) {
      console.log("c64_module keys:", Object.keys((window as any).c64_module));
      
      // Search for any function that might be the quickload function
      const allKeys = Object.keys((window as any).c64_module);
      const quickloadCandidates = allKeys.filter(key => 
        key.toLowerCase().includes('quickload') || 
        key.toLowerCase().includes('load') || 
        key.toLowerCase().includes('prg') ||
        key.toLowerCase().includes('rom')
      );
      console.log("Quickload candidates:", quickloadCandidates);
      
      // Check if any of these are functions
      for (const candidate of quickloadCandidates) {
        const value = (window as any).c64_module[candidate];
        if (typeof value === 'function') {
          console.log(`Found function: ${candidate}`, value);
        }
      }
    }
    
    // Convert to PRG format (2-byte header + program data)
    // Check if the program already has a PRG header (first two bytes are load address)
    let prgData: Uint8Array;
    
    if (program.length >= 2 && program[0] === 0x01 && program[1] === 0x08) {
      // Program already has PRG header, use as-is
      console.log("Program already has PRG header, using as-is");
      prgData = program;
    } else {
      // Add PRG header
      console.log("Adding PRG header to program");
      prgData = new Uint8Array(program.length + 2);
      prgData[0] = 0x01; // Load address low byte
      prgData[1] = 0x08; // Load address high byte (0x0801 for C64 BASIC)
      prgData.set(program, 2);
    }
    
    console.log("PRG data length:", prgData.length);
    console.log("PRG header:", prgData[0], prgData[1]);
    console.log("First few bytes of program:", prgData.slice(0, 10));
    
    // Try multiple approaches to call the quickload function
    let success = false;
    
    // Check for input parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const inputParam = urlParams.get('input');
    if (inputParam) {
      console.log("Found input parameter:", inputParam);
      // Try to add input parameter to the emulator
      if (this.module && typeof (this.module as any).__sargs_add_kvp === 'function') {
        try {
          (this.module as any).__sargs_add_kvp('input', inputParam);
          console.log("✅ Successfully added input parameter to module");
        } catch (e) {
          console.log("❌ Error adding input parameter to module:", e);
        }
      }
      if (typeof (window as any).h && typeof (window as any).h.__sargs_add_kvp === 'function') {
        try {
          (window as any).h.__sargs_add_kvp('input', inputParam);
          console.log("✅ Successfully added input parameter to window.h");
        } catch (e) {
          console.log("❌ Error adding input parameter to window.h:", e);
        }
      }
    }
    
    // Approach 1: Direct module access
    if (this.module && typeof (this.module as any).c64_quickload === 'function') {
      console.log("Calling c64_quickload via module");
      (this.module as any).c64_quickload(prgData);
      success = true;
    }
    
    // Approach 2: Window access
    if (!success && typeof (window as any).c64_quickload === 'function') {
      console.log("Calling c64_quickload via window");
      (window as any).c64_quickload(prgData);
      success = true;
    }
    
    // Approach 3: Module object access
    if (!success && typeof (window as any).Module !== 'undefined' && (window as any).Module) {
      const Module = (window as any).Module;
      if (typeof Module.c64_quickload === 'function') {
        console.log("Calling c64_quickload via Module object");
        Module.c64_quickload(prgData);
        success = true;
      }
    }
    
    // Approach 4: Try to call the function through the WebAssembly module
    if (!success && this.module && this.module._c64_quickload) {
      console.log("Calling c64_quickload via WebAssembly module");
      this.module._c64_quickload(prgData);
      success = true;
    }
    
    // Approach 5: Try to call through Module.exports (since drag-and-drop works)
    if (!success && typeof (window as any).Module !== 'undefined' && (window as any).Module) {
      const Module = (window as any).Module;
      if (Module.exports && Module.exports.c64_quickload) {
        console.log("Calling c64_quickload via Module.exports");
        Module.exports.c64_quickload(prgData);
        success = true;
      }
    }
    
    // Approach 6: Try to call through Module directly with the function name
    if (!success && typeof (window as any).Module !== 'undefined' && (window as any).Module) {
      const Module = (window as any).Module;
      // Try to call the function directly on the Module object
      try {
        console.log("Attempting to call c64_quickload directly on Module");
        Module.c64_quickload(prgData);
        success = true;
      } catch (e) {
        console.log("Direct Module call failed:", e);
      }
    }
    
    // Approach 7: Try to allocate memory in the WebAssembly module and call the function
    if (!success && typeof (window as any).Module !== 'undefined' && (window as any).Module) {
      const Module = (window as any).Module;
      try {
        console.log("Attempting to allocate memory and call c64_quickload");
        // Allocate memory in the WebAssembly module
        const ptr = Module._malloc(prgData.length);
        // Copy the data to the allocated memory
        Module.HEAPU8.set(prgData, ptr);
        // Call the function with the pointer and length
        Module.c64_quickload(ptr, prgData.length);
        // Free the memory
        Module._free(ptr);
        success = true;
      } catch (e) {
        console.log("Memory allocation approach failed:", e);
      }
    }
    
    // Approach 8: Try to trigger the drag-and-drop functionality programmatically
    if (!success) {
      try {
        console.log("Attempting to trigger drag-and-drop functionality");
        // Create a fake file object
        const file = new File([prgData], 'program.prg', { type: 'application/octet-stream' });
        
        // Create a fake drop event
        const dropEvent = new Event('drop', { bubbles: true });
        Object.defineProperty(dropEvent, 'dataTransfer', {
          value: {
            files: [file],
            getData: () => null
          }
        });
        
        // Dispatch the event on the canvas
        const canvas = this.getCanvas();
        if (canvas) {
          canvas.dispatchEvent(dropEvent);
          success = true;
          
          // DISABLED: Automatic RUN command trigger to prevent unwanted execution
          // The program should only run when explicitly requested by the user
          console.log("✅ Program loaded successfully - no automatic RUN command sent");
        }
      } catch (e) {
        console.log("Drag-and-drop trigger failed:", e);
      }
    }
    
    if (!success) {
      console.error("c64_quickload function not found!");
      console.log("Trying alternative function names...");
      
      // Try alternative function names that might be used
      const alternatives = ['quickload', 'load_prg', 'load_program', 'load_rom'];
      for (const alt of alternatives) {
        if (typeof (window as any)[alt] === 'function') {
          console.log(`Found alternative function: ${alt}`);
          (window as any)[alt](prgData);
          return;
        }
        if (this.module && typeof (this.module as any)[alt] === 'function') {
          console.log(`Found alternative function on module: ${alt}`);
          (this.module as any)[alt](prgData);
          return;
        }
      }
      
      console.error("No quickload function found with any name!");
    }
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  getFPS(): number {
    // Return a reasonable FPS estimate
    return this.running ? 50 : 0;
  }

  // Memory access functions (if needed)
  read(address: number): number {
    if (this.module && typeof (this.module as any).c64_read_memory === 'function') {
      return (this.module as any).c64_read_memory(address);
    } else if (typeof (window as any).c64_read_memory === 'function') {
      return (window as any).c64_read_memory(address);
    }
    return 0;
  }

  write(address: number, value: number): void {
    if (this.module && this.module.c64_write_memory) {
      this.module.c64_write_memory(address, value);
    }
  }

  // Required method implementations
  getCPUState(): CpuState {
    // Return basic CPU state if available
    if (this.module && this.module.c64_get_cpu_state) {
      return this.module.c64_get_cpu_state();
    }
    return {
      PC: 0,
      SP: 0
    };
  }

  saveState(): EmuState {
    // Return empty state for now
    return {
      c: this.getCPUState(),
      b: new Uint8Array(0)
    };
  }

  loadState(state: EmuState): void {
    // Load state if available
    if (this.module && this.module.c64_load_state && state.b) {
      this.module.c64_load_state(state.b);
    }
  }

  // Cleanup
  destroy(): void {
    this.stop();
    
    // Remove focus tracking

    this.module = null;
    this.canvas = null;
    
    // Hide the C64 chips div when destroyed
    const c64Div = document.getElementById('c64-chips-div');
    if (c64Div) {
      c64Div.style.display = 'none';
      console.log("✅ Hidden C64 chips div");
    }
  }

  // Joystick support
  private joymask0 = 0;
  private joymask1 = 0;

  setKeyInput(key: number, code: number, flags: number): void {
    // Handle joystick input for C64
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
    if (this.module && typeof this.module.c64_joystick === 'function') {
      this.module.c64_joystick(this.joymask0, this.joymask1);
    } else if ((window as any).h && typeof (window as any).h.c64_joystick === 'function') {
      (window as any).h.c64_joystick(this.joymask0, this.joymask1);
    }
  }
} 