import { Machine, CpuState, EmuState } from '../common/baseplatform';

// Add global BBC debug functions that are available even when machine isn't initialized
(function() {
  // Add global functions for BBC iframe URL generation
  (window as any).bbc_debug = {
    // Generate iframe URL with program data (with gzip compression for large programs)
    generateIframeURL: async (programData: Uint8Array, useBase64: boolean = true) => {
      const baseURL = 'bbc-iframe.html';
      
      // For large programs, use gzip compression
      if (programData.length > 1000) {
        try {
          // Dynamically import pako for gzip compression
          const pako = await import('pako');
          
          // Compress the data with gzip
          const compressed = pako.gzip(programData);
          
          // Convert to hex string (more compact than base64)
          const hexString = Array.from(compressed).map(b => b.toString(16).padStart(2, '0')).join('');
          
          console.log(`BBC debug: Original size: ${programData.length} bytes, Compressed: ${compressed.length} bytes (${Math.round((1 - compressed.length / programData.length) * 100)}% reduction)`);
          
          return `${baseURL}?gzip=${encodeURIComponent(hexString)}`;
        } catch (e) {
          console.error('BBC debug: Gzip compression failed, falling back to base64:', e);
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
        const url = (window as any).bbc_debug.generateIframeURL(output);
        console.log('Opened BBC iframe with current program:', url);
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
              const urlLength = `bbc-iframe.html?gzip=${encodeURIComponent(hexString)}`.length;
              
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
  
  console.log("✅ BBC debug functions added to window.bbc_debug");
  console.log("Available functions:");
  console.log("  - bbc_debug.generateIframeURL(programData, useBase64)");
  console.log("  - bbc_debug.openIframeWithCurrentProgram()");
  console.log("  - bbc_debug.getCurrentProgramHex()");
  console.log("  - bbc_debug.getCurrentProgramInfo()");
})();

interface Window {
  bbc_module?: any;
  Module?: any;
}

export class BBCMicroMachine implements Machine {
  private module: any = null;
  private canvas: HTMLCanvasElement | null = null;
  public running = false;
  private name: string;
  private description: string;
  
  // Machine interface properties
  public cpu: any = null; // CPU instance
  public advanceFrame: (trap: () => boolean) => number;
  public loadROM: (data: Uint8Array, title?: string) => void;
  public loadControlsState: (state: any) => void;
  public saveControlsState: () => any;

  constructor() {
    this.name = 'BBC Micro';
    this.description = 'BBC Micro (Model B) - 6502-based home computer from Acorn';
    
    // Initialize interface methods
    this.advanceFrame = (trap: () => boolean) => {
      console.log("BBCMicroMachine advanceFrame called");
      return 0;
    };
    
    this.loadROM = (data: Uint8Array, title?: string) => {
      console.log("BBCMicroMachine loadROM called with", data.length, "bytes");
    };
    
    this.loadControlsState = (state: any) => {
      console.log("BBCMicroMachine loadControlsState called");
    };
    
    this.saveControlsState = () => {
      console.log("BBCMicroMachine saveControlsState called");
      return {};
    };
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }

  async init(): Promise<void> {
    console.log("BBCMicroMachine init() called");
    
    // For now, we'll use the iframe approach instead of direct module loading
    // The actual BBC emulator will be loaded in the iframe
    console.log("BBCMicroMachine: Using iframe approach - no direct module initialization needed");
  }

  run(): void {
    console.log("BBCMicroMachine run() called");
    this.running = true;
  }

  stop(): void {
    console.log("BBCMicroMachine stop() called");
    this.running = false;
  }

  reset(): void {
    console.log("BBCMicroMachine reset() called");
    // Reset logic would go here if using direct module
  }

  loadProgram(program: Uint8Array): void {
    console.log("BBCMicroMachine loadProgram called with", program.length, "bytes");
    
    // For now, the actual program loading is handled by the iframe
    // This method is kept for interface compatibility
    console.log("BBCMicroMachine: Program loading handled by iframe");
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  getFPS(): number {
    return 50; // BBC Micro runs at 50Hz (PAL)
  }

  read(address: number): number {
    // This would be implemented if using direct module
    return 0;
  }

  write(address: number, value: number): void {
    // This would be implemented if using direct module
  }

  getCPUState(): CpuState {
    // This would be implemented if using direct module
    return {
      PC: 0,
      SP: 0
    };
  }

  saveState(): EmuState {
    // This would be implemented if using direct module
    return {
      c: this.getCPUState(),
      ram: new Uint8Array(0)
    };
  }

  loadState(state: EmuState): void {
    // This would be implemented if using direct module
  }

  destroy(): void {
    console.log("BBCMicroMachine destroy() called");
    this.stop();
    this.module = null;
    this.canvas = null;
  }

  // BBC-specific methods
  setKeyInput(key: number, code: number, flags: number): void {
    // BBC Micro keyboard handling
    console.log("BBCMicroMachine setKeyInput:", key, code, flags);
  }
} 