import { Platform, Preset, getToolForFilename_z80 } from '../common/baseplatform';
import { PLATFORMS } from '../common/emu';

const ZXSPECTRUM_PRESETS: Preset[] = [
  { id: 'hello.bas', name: 'Hello World (BASIC)', category: 'BASIC' },
];

export class ZXSpectrumPlatform implements Platform {
  private mainElement: HTMLElement;
  private iframe: HTMLIFrameElement | null = null;
  private currentModel: '48k' | '128k' = '48k';
  private pauseResumeSupported = true; // qaop supports pause/resume
  sourceFileFetch?: (path: string) => any; // Set by IDE to fetch source files
  private blobUrls: string[] = []; // Keep blob URLs alive
  private originalBinary: Uint8Array | null = null; // Store original compiled binary for download
  private originalFilename: string | null = null; // Store original filename for download

  constructor(mainElement: HTMLElement) {
    this.mainElement = mainElement;
    
    // Listen for messages from the iframe
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'emulator_capabilities') {
        console.log("ZXSpectrumPlatform: Received emulator capabilities:", event.data.capabilities);
        
        if (event.data.capabilities && typeof event.data.capabilities.pause === 'boolean') {
          this.pauseResumeSupported = event.data.capabilities.pause;
        }
        
        this.updateControlButtons();
      }
    });
  }

  async start(): Promise<void> {
    console.log("ZXSpectrumPlatform start() called");
    
    // Create iframe for ZX Spectrum emulator (qaop)
    this.iframe = document.createElement('iframe');
    this.iframe.id = 'zxspectrum-iframe';
    this.iframe.style.width = '100%';
    this.iframe.style.height = '600px';
    this.iframe.style.border = '1px solid #ccc';
    this.iframe.style.backgroundColor = '#000';
    this.iframe.setAttribute('tabindex', '-1');
    
    // Prevent the IDE from pausing when clicking on the iframe
    this.iframe.addEventListener('focus', (e) => {
      e.stopPropagation();
    }, true);
    
    this.iframe.addEventListener('click', (e) => {
      e.stopPropagation();
    }, true);
    
    // Add iframe to the main element
    this.mainElement.innerHTML = '';
    this.mainElement.appendChild(this.iframe);
    
    // Load qaop emulator
    // Get model parameter from URL (default to 48k)
    const urlParams = new URLSearchParams(window.location.search);
    const modelParam = urlParams.get('model') || '48k';
    this.currentModel = (modelParam === '128k') ? '128k' : '48k';
    
    const cacheBuster = `?t=${Date.now()}`;
    const modelQuery = `&model=${encodeURIComponent(this.currentModel)}`;
    this.iframe.src = `zxspectrum-iframe.html${cacheBuster}${modelQuery}`;
    
    console.log("ZXSpectrumPlatform: iframe created and qaop loading, model:", this.currentModel);
    
    // Set up compilation listener
    this.setupCompilationListener();
    
    // Update control buttons
    this.updateControlButtons();
  }

  stop(): void {
    console.log("ZXSpectrumPlatform stop() called");
    // qaop doesn't need explicit stop
  }

  reset(): void {
    console.log("ZXSpectrumPlatform reset() called");
    
    if (this.iframe && this.iframe.contentWindow) {
      // Send reset command via postMessage to iframe wrapper
      this.iframe.contentWindow.postMessage({ cmd: 'reset' }, '*');
      console.log("ZXSpectrumPlatform: Sent reset command to iframe");
    }
  }

  isRunning(): boolean {
    // qaop is always "running" when loaded
    return this.iframe !== null;
  }

  getToolForFilename(filename: string): string {
    const lowerFilename = filename.toLowerCase();
    if (lowerFilename.endsWith('.bas')) return 'zxbasic'; // Use ZX Spectrum BASIC compiler
    // For C files, use z88dk (which can create .tap files directly)
    if (lowerFilename.endsWith('.c') || lowerFilename.endsWith('.h')) {
      return 'z88dk'; // Use z88dk PHP API
    }
    // For Z80 assembly, use the standard Z80 toolchain
    return getToolForFilename_z80(filename);
  }

  getDefaultExtension(): string {
    return '.bas';
  }

  getPresets(): Preset[] {
    return ZXSPECTRUM_PRESETS;
  }

  pause(): void {
    if (!this.pauseResumeSupported) {
      console.log("ZXSpectrumPlatform: Pause not supported");
      return;
    }
    
    console.log("ZXSpectrumPlatform pause() called");
    
    if (this.iframe && this.iframe.contentWindow) {
      // qaop uses keyboard for pause, but we can try postMessage
      this.iframe.contentWindow.postMessage({ cmd: 'pause', pause: true }, '*');
      console.log("ZXSpectrumPlatform: Sent pause command to iframe");
    }
  }

  resume(): void {
    if (!this.pauseResumeSupported) {
      console.log("ZXSpectrumPlatform: Resume not supported");
      return;
    }
    
    console.log("ZXSpectrumPlatform resume() called");
    
    if (this.iframe && this.iframe.contentWindow) {
      this.iframe.contentWindow.postMessage({ cmd: 'pause', pause: false }, '*');
      console.log("ZXSpectrumPlatform: Sent resume command to iframe");
    }
  }

  loadROM(title: string, rom: Uint8Array | any): void {
    console.log("ZXSpectrumPlatform loadROM called with title:", title, "rom type:", typeof rom, "rom length:", rom instanceof Uint8Array ? rom.length : 'N/A');
    
    if (!this.iframe) {
      console.error("ZXSpectrumPlatform: iframe not ready");
      return;
    }
    
    // Store original binary for download (before any transformations)
    if (rom instanceof Uint8Array) {
      // Trim trailing zeros to get actual code size
      let actualSize = rom.length;
      for (let i = rom.length - 1; i >= 0; i--) {
        if (rom[i] !== 0) {
          actualSize = i + 1;
          break;
        }
      }
      
      if (actualSize < rom.length) {
        console.log(`ZXSpectrumPlatform: Trimming binary from ${rom.length} to ${actualSize} bytes (removed ${rom.length - actualSize} trailing zeros)`);
        this.originalBinary = rom.slice(0, actualSize);
      } else {
        this.originalBinary = new Uint8Array(rom); // Make a copy
      }
      console.log("ZXSpectrumPlatform: Stored original binary for download:", this.originalBinary.length, "bytes");
    } else {
      this.originalBinary = null;
    }
    
    // Get filename for download
    const getCurrentMainFilename = (window as any).IDE?.getCurrentMainFilename;
    if (getCurrentMainFilename) {
      this.originalFilename = getCurrentMainFilename();
    } else {
      const currentProject = (window as any).IDE?.current_project;
      if (currentProject && currentProject.mainPath) {
        this.originalFilename = currentProject.mainPath;
      } else {
        this.originalFilename = title;
      }
    }
    
    // Handle BASIC AST output - convert back to plain text
    let dataToLoad: Uint8Array;
    if (rom && typeof rom === 'object' && !(rom instanceof Uint8Array)) {
      // This is likely a BASIC AST - get the original source file
      console.log("ZXSpectrumPlatform: Detected BASIC AST, getting source file");
      
      // Get the actual filename using multiple methods
      let filename: string | null = null;
      
      // Method 1: Try getCurrentMainFilename function (reuse the one above)
      if (getCurrentMainFilename) {
        filename = getCurrentMainFilename();
      }
      
      // Method 2: Try current_project.mainPath directly
      if (!filename) {
        const currentProject = (window as any).IDE?.current_project;
        if (currentProject && currentProject.mainPath) {
          filename = currentProject.mainPath;
        }
      }
      
      // Method 3: Try getCurrentProject().mainPath
      if (!filename) {
        const getCurrentProject = (window as any).IDE?.getCurrentProject;
        if (getCurrentProject) {
          const project = getCurrentProject();
          if (project && project.mainPath) {
            filename = project.mainPath;
          }
        }
      }
      
      // Method 4: Extract from title if it looks like a filename
      if (!filename && title && (title.includes('.') || title.length < 50)) {
        // If title looks like a filename, use it
        filename = title;
      }
      
      if (!filename) {
        console.warn("ZXSpectrumPlatform: Could not get current filename. Title was:", title);
        // Try to use title as filename if it looks valid
        filename = title;
      }
      
      // Try to get source file using sourceFileFetch (set by IDE) or project data
      let sourceText: string | null = null;
      
      if (this.sourceFileFetch && filename) {
        const fileData = this.sourceFileFetch(filename);
        if (fileData && typeof fileData === 'string') {
          sourceText = fileData;
        }
      }
      
      // Fallback: try IDE current_project directly
      if (!sourceText) {
        const currentProject = (window as any).IDE?.current_project;
        if (currentProject && currentProject.filedata && filename) {
          sourceText = currentProject.filedata[filename];
        }
      }
      
      // Fallback: try getCurrentProject
      if (!sourceText) {
        const getCurrentProject = (window as any).IDE?.getCurrentProject;
        if (getCurrentProject) {
          const project = getCurrentProject();
          if (project && project.filedata && filename) {
            sourceText = project.filedata[filename];
          }
        }
      }
      
      if (sourceText && typeof sourceText === 'string') {
        // Convert plain text BASIC to bytes
        dataToLoad = new TextEncoder().encode(sourceText);
        console.log("ZXSpectrumPlatform: Using source file text from", filename + ",", dataToLoad.length, "bytes");
      } else {
        console.error("ZXSpectrumPlatform: Could not find source file for", filename, "- tried sourceFileFetch and project.filedata");
        return;
      }
    } else if (rom instanceof Uint8Array) {
      // Use the trimmed version if we have it, otherwise trim now
      if (this.originalBinary && this.originalBinary.length < rom.length) {
        dataToLoad = this.originalBinary;
        console.log("ZXSpectrumPlatform: Using trimmed binary data,", dataToLoad.length, "bytes (original was", rom.length, "bytes)");
      } else {
        dataToLoad = rom;
        console.log("ZXSpectrumPlatform: Using binary data,", dataToLoad.length, "bytes");
      }
    } else {
      console.error("ZXSpectrumPlatform: Unexpected rom type:", typeof rom);
      return;
    }
    
    // Create a blob URL for the data with proper content type
    // qaop recognizes these content types:
    // - application/x.zx.tap for TAP files
    // - application/x.zx.rom for ROM images
    // - application/x.zx.sna for SNA snapshots
    // - application/x.zx.z80 for Z80 snapshots
    // - image/x.zx.scr for screens
    
    // Detect file type from data or filename
    // Get filename to help with detection (reuse getCurrentMainFilename from above)
    let filename: string | null = null;
    if (getCurrentMainFilename) {
      filename = getCurrentMainFilename();
    }
    if (!filename) {
      const currentProject = (window as any).IDE?.current_project;
      if (currentProject && currentProject.mainPath) {
        filename = currentProject.mainPath;
      }
    }
    
    let contentType = 'application/x.zx.tap'; // Default to TAP
    if (dataToLoad.length > 0) {
      // Check for TAP file (starts with 0x13 for header block)
      // z88dk outputs .tap files directly, so if it's already a TAP file, use it as-is
      if (dataToLoad[0] === 0x13) {
        contentType = 'application/x.zx.tap';
        console.log("ZXSpectrumPlatform: TAP file detected (likely from z88dk), using as-is");
      }
      // Check for Z80 snapshot (starts with 0x03 0x00)
      else if (dataToLoad.length > 30 && dataToLoad[0] === 0x03 && dataToLoad[1] === 0x00) {
        contentType = 'application/x.zx.z80';
      }
      // Check for SNA snapshot (starts with specific header)
      else if (dataToLoad.length > 27 && dataToLoad[0] === 0x3F) {
        contentType = 'application/x.zx.sna';
      }
      // If it's not a recognized format and it's a C file, z88dk should have output a TAP file
      // But if we get here, it might be a raw binary - check if we should wrap it
      else if (filename && (filename.endsWith('.c') || filename.endsWith('.C'))) {
        // z88dk should output .tap files, but if we get a raw binary, wrap it in TAP CODE block
        console.log("ZXSpectrumPlatform: C program binary detected (not TAP), wrapping in CODE block");
        const baseFilename = filename.split('/').pop()?.replace(/\.[^.]*$/, '') || 'PROGRAM';
        dataToLoad = this.createCodeTAPFile(dataToLoad, baseFilename, 0x8000);
        contentType = 'application/x.zx.tap';
      }
      // If it's a large binary file (> 1KB) and doesn't match other formats, wrap as CODE
      else if (dataToLoad.length > 1024) {
        // Assume it's a compiled binary, wrap in TAP with CODE block
        const baseFilename = filename ? filename.split('/').pop()?.replace(/\.[^.]*$/, '') || 'PROGRAM' : 'PROGRAM';
        dataToLoad = this.createCodeTAPFile(dataToLoad, baseFilename, 0x8000);
        contentType = 'application/x.zx.tap';
      }
    }
    
    // Use data URL instead of blob URL to avoid cross-origin issues with nested iframes
    // Convert binary data to base64 using chunked approach for large arrays
    let base64Data: string;
    if (dataToLoad.length > 65536) {
      // For very large arrays, convert in chunks to avoid stack overflow
      const chunks: string[] = [];
      for (let i = 0; i < dataToLoad.length; i += 8192) {
        const chunk = dataToLoad.slice(i, Math.min(i + 8192, dataToLoad.length));
        chunks.push(String.fromCharCode(...chunk));
      }
      base64Data = btoa(chunks.join(''));
    } else {
      base64Data = btoa(String.fromCharCode(...dataToLoad));
    }
    const dataUrl = `data:${contentType};base64,${base64Data}`;
    
    console.log("ZXSpectrumPlatform: Created data URL with content type:", contentType);
    console.log("ZXSpectrumPlatform: Data URL length:", dataUrl.length, "bytes (original:", dataToLoad.length, "bytes)");
    
    // Send load command via postMessage to iframe wrapper
    // The iframe wrapper will handle loading into qaop via URL hash
    // We need to wait a bit for the iframe to be ready
    const sendLoad = () => {
      if (this.iframe && this.iframe.contentWindow) {
        // Get filename for CODE block detection (reuse filename from above)
        let detectedFilename: string | null = filename;
        if (!detectedFilename && getCurrentMainFilename) {
          detectedFilename = getCurrentMainFilename();
        }
        if (!detectedFilename) {
          const currentProject = (window as any).IDE?.current_project;
          if (currentProject && currentProject.mainPath) {
            detectedFilename = currentProject.mainPath;
          }
        }
        
        console.log("ZXSpectrumPlatform: Sending load command, filename:", detectedFilename, "contentType:", contentType);
        this.iframe.contentWindow.postMessage({ 
          cmd: 'load',
          url: dataUrl,
          contentType: contentType, // Pass content type to iframe
          data: Array.from(dataToLoad), // Also send data directly in case qaop supports it
          filename: detectedFilename // Pass filename to help detect CODE blocks
        }, '*');
        console.log("ZXSpectrumPlatform: Sent load command to iframe with data URL and content type:", contentType);
      } else {
        console.warn("ZXSpectrumPlatform: Iframe not ready, retrying...");
        setTimeout(sendLoad, 100);
      }
    };
    
    // Wait a bit for iframe to be ready, then send
    setTimeout(sendLoad, 100);
  }

  getROMExtension(rom?: Uint8Array): string {
    // Check if it's a TAP file (starts with header block flag 0x13)
    if (rom && rom.length > 0 && rom[0] === 0x13) {
      return '.tap';
    }
    // Check if it's a Z80 snapshot (starts with specific header)
    if (rom && rom.length > 30 && rom[0] === 0x03 && rom[1] === 0x00) {
      return '.z80';
    }
    // For compiled C binaries, return .bin (they are raw binaries)
    // Check filename to determine if it's a C file
    let filename: string | null = null;
    const getCurrentMainFilenameFn = (window as any).IDE?.getCurrentMainFilename;
    if (getCurrentMainFilenameFn) {
      filename = getCurrentMainFilenameFn();
    }
    if (!filename) {
      const currentProject = (window as any).IDE?.current_project;
      if (currentProject && currentProject.mainPath) {
        filename = currentProject.mainPath;
      }
    }
    if (filename && (filename.endsWith('.c') || filename.endsWith('.C'))) {
      return '.z80'; // C files are wrapped in Z80 snapshot format, so use .z80 extension
    }
    // Default to .tap for ZX Spectrum
    return '.tap';
  }

  /**
   * Create a TAP file with a CODE block for machine code programs
   * TAP format for CODE blocks:
   * - Header block: flag (0x13) + length (2 bytes) + header data (17 bytes) + checksum
   *   - Header data: type (0x03 = code), filename (10 bytes), data length (2 bytes),
   *     parameter 1 (start address, 2 bytes), parameter 2 (unused, 2 bytes)
   * - Data block: flag (0xFF) + length (2 bytes) + code data + checksum
   */
  private createCodeTAPFile(code: Uint8Array, filename: string, startAddress: number): Uint8Array {
    const baseFilename = filename.split('/').pop()?.replace(/\.[^.]*$/, '') || 'PROGRAM';
    const filenameBytes = new Uint8Array(10);
    filenameBytes.fill(0x20); // Fill with spaces
    for (let i = 0; i < Math.min(baseFilename.length, 10); i++) {
      filenameBytes[i] = baseFilename.toUpperCase().charCodeAt(i);
    }

    const codeLength = code.length;

    // Header data block (17 bytes)
    const headerData = new Uint8Array(17);
    headerData[0] = 0x03; // Type: code (0x03 = code block)
    headerData.set(filenameBytes, 1); // Filename (10 bytes)
    headerData[11] = codeLength & 0xFF; // Data length low
    headerData[12] = (codeLength >> 8) & 0xFF; // Data length high
    headerData[13] = startAddress & 0xFF; // Parameter 1 (start address) low
    headerData[14] = (startAddress >> 8) & 0xFF; // Parameter 1 (start address) high
    headerData[15] = 0x80; // Parameter 2 low (unused, often 0x80)
    headerData[16] = 0x00; // Parameter 2 high (unused)

    // Calculate header checksum (XOR of all 17 header data bytes)
    let headerChecksum = 0;
    for (let i = 0; i < 17; i++) {
      headerChecksum ^= headerData[i];
    }

    // Create header block: flag (1) + length (2) + data (17) + checksum (1) = 21 bytes
    // For CODE blocks, the length should be 0x11 (17 bytes) - different from BASIC which uses 0x00 0x00
    const headerBlock = new Uint8Array(1 + 2 + 17 + 1);
    headerBlock[0] = 0x13; // Flag byte for header block
    headerBlock[1] = 0x11; // Length low (17 bytes = 0x11)
    headerBlock[2] = 0x00; // Length high (0x00)
    headerBlock.set(headerData, 3); // Data (17 bytes)
    headerBlock[3 + 17] = headerChecksum; // Checksum

    // Create data block: flag + length + data + checksum
    const dataBlock = new Uint8Array(1 + 2 + codeLength + 1);
    dataBlock[0] = 0xFF; // Flag byte for data
    dataBlock[1] = codeLength & 0xFF; // Length low
    dataBlock[2] = (codeLength >> 8) & 0xFF; // Length high
    dataBlock.set(code, 3); // Code data

    // Calculate data block checksum (XOR of flag, length bytes, and all data bytes)
    let dataChecksum = 0xFF; // Start with flag byte
    dataChecksum ^= (codeLength & 0xFF);
    dataChecksum ^= ((codeLength >> 8) & 0xFF);
    for (let i = 0; i < codeLength; i++) {
      dataChecksum ^= code[i];
    }
    dataBlock[3 + codeLength] = dataChecksum;

    // Combine header and data block
    const tapFile = new Uint8Array(headerBlock.length + dataBlock.length);
    tapFile.set(headerBlock, 0);
    tapFile.set(dataBlock, headerBlock.length);

    return tapFile;
  }

  private getFileType(filename: string): string {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.tap')) return 'tap';
    if (lower.endsWith('.z80')) return 'z80';
    if (lower.endsWith('.sna')) return 'sna';
    if (lower.endsWith('.rom')) return 'rom';
    if (lower.endsWith('.scr')) return 'scr';
    return 'tap'; // default
  }

  private setupCompilationListener(): void {
    // Listen for compilation events from the IDE
    const originalSetCompileOutput = (window as any).setCompileOutput;
    if (originalSetCompileOutput) {
      (window as any).setCompileOutput = (data: any) => {
        // Call the original function
        originalSetCompileOutput(data);
        
        // If compilation was successful, reload the program
        if (data && data.output && !data.errors) {
          console.log("ZXSpectrumPlatform: Compilation detected, reloading program");
          // The compiled output should be available in data.output
          // We'll need to handle this based on the compilation tool used
        }
      };
    }
  }

  private updateControlButtons(): void {
    // Update UI control buttons visibility based on capabilities
    // This would typically update buttons in the IDE UI
    const pauseButton = document.querySelector('[data-action="pause"]') as HTMLElement;
    const resumeButton = document.querySelector('[data-action="resume"]') as HTMLElement;
    
    if (pauseButton) {
      pauseButton.style.display = this.pauseResumeSupported ? '' : 'none';
    }
    if (resumeButton) {
      resumeButton.style.display = this.pauseResumeSupported ? '' : 'none';
    }
  }

  getDownloadFile(): { extension: string, blob: Blob } | undefined {
    // Return the original compiled binary (not the Z80 snapshot)
    if (this.originalBinary) {
      console.log("ZXSpectrumPlatform: getDownloadFile() called, returning original binary:", this.originalBinary.length, "bytes");
      
      // Determine extension based on filename
      let extension = '.bin'; // Default
      if (this.originalFilename) {
        const lowerFilename = this.originalFilename.toLowerCase();
        if (lowerFilename.endsWith('.bas')) {
          extension = '.tap'; // BASIC programs are tokenized to TAP
        } else if (lowerFilename.endsWith('.c')) {
          extension = '.bin'; // C programs are raw binaries
        } else {
          // Use getROMExtension to determine based on content
          extension = this.getROMExtension(this.originalBinary);
        }
      } else {
        // Fallback: check content
        extension = this.getROMExtension(this.originalBinary);
      }
      
      const blob = new Blob([this.originalBinary], { type: "application/octet-stream" });
      return {
        extension: extension,
        blob: blob
      };
    }
    
    console.log("ZXSpectrumPlatform: getDownloadFile() called, but no original binary available");
    return undefined;
  }

  // Optional methods that may be called by the IDE
  loadState?(state: any): void {
    // qaop supports state saving/loading but we'd need to implement this
    console.log("ZXSpectrumPlatform: loadState not yet implemented");
  }

  saveState?(): any {
    // qaop supports state saving/loading but we'd need to implement this
    console.log("ZXSpectrumPlatform: saveState not yet implemented");
    return null;
  }

  /**
   * Create a Z80 snapshot file from compiled binary code
   * Z80 format v1 (48k): 30-byte header + compressed RAM blocks
   * This creates a snapshot with the program loaded at startAddress and PC set to startAddress
   */
  private createZ80Snapshot(code: Uint8Array, startAddress: number): Uint8Array {
    // Z80 v2/v3 format with extended header (PC=0 in main header, PC in extended header)
    // This matches the format that qaop uses when saving snapshots
    const header = new Uint8Array(30);
    
    // Registers
    header[0] = 0x00; // A
    header[1] = 0x00; // F (flags)
    header[2] = 0x00; // BC low
    header[3] = 0x00; // BC high
    header[4] = 0x00; // HL low
    header[5] = 0x00; // HL high
    header[6] = 0x00; // PC low (0 = extended header format)
    header[7] = 0x00; // PC high (0 = extended header format)
    // Stack pointer: ZX Spectrum typically uses 0xFF58 or higher
    // But we'll use 0xFF00 which should be safe
    header[8] = 0x00; // SP low (stack pointer at 0xFF00)
    header[9] = 0xFF; // SP high
    header[10] = 0x00; // I (interrupt register)
    header[11] = 0x00; // R (refresh register)
    
    // Flags byte (byte 12)
    // Bit 0: R bit 7
    // Bit 1-3: Border color (0-7)
    // Bit 4: SamRom
    // Bit 5: Compressed (1 = compressed, 0 = uncompressed)
    // Try uncompressed first to avoid compression bugs
    header[12] = 0x00; // Uncompressed data (bit 5 = 0)
    
    // DE register
    header[13] = 0x00; // DE low
    header[14] = 0x00; // DE high
    
    // Alternate registers
    header[15] = 0x00; // BC' low
    header[16] = 0x00; // BC' high
    header[17] = 0x00; // DE' low
    header[18] = 0x00; // DE' high
    header[19] = 0x00; // HL' low
    header[20] = 0x00; // HL' high
    header[21] = 0x00; // A'
    header[22] = 0x00; // F'
    
    // IY and IX
    // IY must point to system variables area (0x5C3A) for ZX Spectrum BASIC system calls
    header[23] = 0x3A; // IY low (0x5C3A = system variables)
    header[24] = 0x5C; // IY high
    header[25] = 0x00; // IX low
    header[26] = 0x00; // IX high
    
    // Interrupt flags
    header[27] = 0x00; // IFF1 (0 = DI, 1 = EI)
    header[28] = 0x00; // IFF2
    header[29] = 0x00; // IM (interrupt mode: 0, 1, or 2)
    
    // Set up basic state for program execution
    header[27] = 0x01; // IFF1 = 1 (EI)
    header[28] = 0x01; // IFF2 = 1
    header[29] = 0x01; // IM = 1
    
    // Extended header - required when PC=0 in main header
    // Format: [length_low] [length_high] [23 bytes of data]
    // The extended header data starts with PC, then other registers/state
    const extendedHeaderData = new Uint8Array(23);
    extendedHeaderData[0] = startAddress & 0xFF; // PC low
    extendedHeaderData[1] = (startAddress >> 8) & 0xFF; // PC high
    // Rest is zeros (reserved/padding)
    
    // Extended header with length prefix (2 bytes + 23 bytes = 25 bytes total)
    const extendedHeader = new Uint8Array(25);
    extendedHeader[0] = 23 & 0xFF; // Length low (23 bytes)
    extendedHeader[1] = (23 >> 8) & 0xFF; // Length high (0)
    extendedHeader.set(extendedHeaderData, 2);
    
    // Create RAM image (48k = 49152 bytes)
    // Memory map:
    // 0x0000-0x3FFF: ROM (not included in snapshot)
    // 0x4000-0x5AFF: Screen RAM (0x1B00 bytes)
    // 0x5B00-0x5BFF: Color RAM (0x100 bytes)
    // 0x5C00-0x5CFF: System variables (0x100 bytes)
    // 0x5D00-0xFF57: User RAM
    // 0xFF58-0xFFFF: System stack
    
    const ram = new Uint8Array(49152);
    
    // Initialize screen RAM with default values (black border, white paper)
    for (let i = 0; i < 0x1B00; i++) {
      ram[i] = 0x00; // Screen RAM (0x4000-0x5AFF)
    }
    
    // Initialize color RAM (0x5B00-0x5BFF)
    for (let i = 0x1B00; i < 0x1C00; i++) {
      ram[i] = 0x47; // White paper, black ink, bright
    }
    
    // Initialize system variables area (0x5C00-0x5CFF)
    for (let i = 0x1C00; i < 0x1D00; i++) {
      ram[i] = 0x00;
    }
    
    // Load the compiled code at startAddress (0x8000 = offset 0x4000 in RAM)
    const codeOffset = startAddress - 0x4000;
    if (codeOffset >= 0 && codeOffset + code.length <= ram.length) {
      ram.set(code, codeOffset);
    } else {
      console.warn(`ZXSpectrumPlatform: Code doesn't fit in RAM at address 0x${startAddress.toString(16)}`);
    }
    
    // Z80 v2/v3 format (48k): After the 30-byte header and extended header, RAM is saved in 3 blocks
    // Each block is 16384 bytes, compressed, and prefixed with a 2-byte length
    // Block 0: 0x4000-0x7FFF (offset 0-16383 in ram array)
    // Block 1: 0x8000-0xBFFF (offset 16384-32767 in ram array)
    // Block 2: 0xC000-0xFFFF (offset 32768-49151 in ram array)
    
    // Compression flag is already set in header[12] above (bit 5 = 0x20)
    
    const blocks: Uint8Array[] = [];
    
    // Save each RAM block (uncompressed for now to avoid compression bugs)
    for (let blockNum = 0; blockNum < 3; blockNum++) {
      const blockStart = blockNum * 16384;
      const blockEnd = blockStart + 16384;
      const blockData = ram.slice(blockStart, blockEnd);
      
      // For uncompressed format, the block length is 0xFFFF (65535) followed by the data
      // But actually, uncompressed blocks are just the raw data prefixed with length
      // Length should be 0x4000 (16384) for uncompressed blocks
      const blockLength = blockData.length; // 16384
      const blockWithLength = new Uint8Array(2 + blockLength);
      blockWithLength[0] = blockLength & 0xFF;
      blockWithLength[1] = (blockLength >> 8) & 0xFF;
      blockWithLength.set(blockData, 2);
      
      blocks.push(blockWithLength);
    }
    
    // Calculate total size: header (30) + extended header length prefix (2) + extended header data (23) + RAM blocks
    let totalSize = header.length + extendedHeader.length;
    for (const block of blocks) {
      totalSize += block.length;
    }
    
    // Combine header, extended header (with length prefix), and RAM blocks
    const snapshot = new Uint8Array(totalSize);
    snapshot.set(header, 0);
    snapshot.set(extendedHeader, header.length);
    let offset = header.length + extendedHeader.length;
    for (const block of blocks) {
      snapshot.set(block, offset);
      offset += block.length;
    }
    
    console.log(`ZXSpectrumPlatform: Created Z80 snapshot: ${snapshot.length} bytes (header: ${header.length}, blocks: ${blocks.map(b => b.length).join(', ')})`);
    
    return snapshot;
  }

  /**
   * Compress RAM data for Z80 snapshot format
   * Compression algorithm:
   * - If byte is 0xED, escape as 0xED 0xED 0x00
   * - If 4+ consecutive identical bytes, compress as 0xED 0xED count byte
   * - Otherwise output byte as-is
   */
  private compressZ80RAM(ram: Uint8Array): Uint8Array {
    const output: number[] = [];
    let i = 0;
    
    while (i < ram.length) {
      const byte = ram[i];
      
      // Special case: 0xED must be escaped first
      if (byte === 0xED) {
        // Check if next byte is also 0xED (compression marker)
        if (i + 1 < ram.length && ram[i + 1] === 0xED) {
          // This is a compression marker, escape it
          output.push(0xED, 0xED, 0x00);
          i++;
        } else {
          // Single 0xED byte, escape it
          output.push(0xED, 0xED, 0x00);
        }
        i++;
        continue;
      }
      
      // Count consecutive identical bytes
      let count = 1;
      while (i + count < ram.length && ram[i + count] === byte && count < 255) {
        count++;
      }
      
      if (count >= 4) {
        // Compress: ED ED count byte
        output.push(0xED, 0xED, count, byte);
        i += count;
      } else {
        // No compression: just output the bytes
        for (let j = 0; j < count; j++) {
          output.push(ram[i + j]);
        }
        i += count;
      }
    }
    
    return new Uint8Array(output);
  }
}

// Register the platform
PLATFORMS['zxspectrum'] = ZXSpectrumPlatform;

// Export for dynamic loading
export default ZXSpectrumPlatform;

