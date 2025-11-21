import { Platform, Preset } from '../common/baseplatform';
import { PLATFORMS } from '../common/emu';

const APPLE2E_PRESETS: Preset[] = [
  { id: 'hello.bas', name: 'Hello World (BASIC)', category: 'BASIC Tutorial' },
  { id: 'colors.bas', name: 'Color Demo (BASIC)' },
  { id: 'graphics.bas', name: 'Graphics Demo (BASIC)' },
  { id: 'keyboard.bas', name: 'Keyboard Demo (BASIC)' },
  { id: 'game.bas', name: 'Simple Game (BASIC)' },
];

export class Apple2EPlatform implements Platform {
  private mainElement: HTMLElement;
  private iframe: HTMLIFrameElement | null = null;
  private emulatorReady = false;
  private lastLoadedProgram: string | null = null;
  private isLoadingProgram = false;
  private currentDiskBlob: Blob | null = null; // Store the disk image for download
  private currentBinaryBlob: Blob | null = null; // Store the compiled binary for download

  constructor(mainElement: HTMLElement) {
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
      } else if (event.data && event.data.type === 'apple2e_error') {
        console.error('Apple2EPlatform: Emulator error:', event.data.error);
        this.emulatorReady = false;
      }
    });
  }

  getName(): string {
    return 'Apple IIe';
  }

  getDescription(): string {
    return 'Apple IIe - 6502-based personal computer';
  }

  async init(): Promise<void> {
    console.log('Apple2EPlatform init() called');
  }

  start(): void {
    console.log('Apple2EPlatform start() called');
    
    // Create iframe for Apple IIe emulator
    this.iframe = document.createElement('iframe');
    this.iframe.id = 'apple2e-iframe';
    this.iframe.style.width = '100%';
    this.iframe.style.height = '600px';
    this.iframe.style.border = '1px solid #ccc';
    this.iframe.style.backgroundColor = '#000';
    this.iframe.setAttribute('tabindex', '0'); // Make iframe focusable
    // Note: 'pointer-events' is not a valid iframe allow attribute, but we handle events in the iframe itself
    
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
    
    // Load iframe with cache busting
    const cacheBuster = `?t=${Date.now()}`;
    this.iframe.src = `apple2e-iframe.html${cacheBuster}`;
    
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

  stop(): void {
    console.log('Apple2EPlatform stop() called');
    if (this.iframe && this.iframe.contentWindow) {
      this.iframe.contentWindow.postMessage({ type: 'stop' }, '*');
    }
  }

  reset(): void {
    console.log('Apple2EPlatform reset() called');
    if (this.iframe && this.iframe.contentWindow) {
      this.iframe.contentWindow.postMessage({ type: 'reset' }, '*');
    }
  }

  isRunning(): boolean {
    return this.emulatorReady;
  }

  getToolForFilename(filename: string): string {
    const lowerFilename = filename.toLowerCase();
    if (lowerFilename.endsWith('.bas')) {
      return 'applesoftbasic'; // Use AppleSoft BASIC compiler
    }
    if (lowerFilename.endsWith('.c') || lowerFilename.endsWith('.h')) {
      return 'cc65'; // Use cc65 for C programs
    }
    return 'applesoftbasic'; // Default to BASIC
  }

  getDefaultExtension(): string {
    return '.bas';
  }

  getPresets(): Preset[] {
    return APPLE2E_PRESETS;
  }
  
  getDownloadFile(): { extension: string, blob: Blob } | undefined {
    // Return the binary file (for "Download Program")
    console.log(`Apple2EPlatform: getDownloadFile() called, currentBinaryBlob:`, this.currentBinaryBlob ? `${this.currentBinaryBlob.size} bytes` : 'null');
    if (this.currentBinaryBlob) {
      return {
        extension: '.bin',
        blob: this.currentBinaryBlob
      };
    }
    console.log('Apple2EPlatform: No binary blob available for download');
    return undefined;
  }

  getDownloadDiskFile(): { extension: string, blob: Blob } | undefined {
    // Return the disk image (for "Download Disk")
    console.log(`Apple2EPlatform: getDownloadDiskFile() called, currentDiskBlob:`, this.currentDiskBlob ? `${this.currentDiskBlob.size} bytes` : 'null');
    if (this.currentDiskBlob) {
      return {
        extension: '.dsk',
        blob: this.currentDiskBlob
      };
    }
    console.log('Apple2EPlatform: No disk blob available for download');
    return undefined;
  }

  pause(): void {
    console.log('Apple2EPlatform pause() called');
    // Don't pause when clicking on the iframe - it handles its own events
    // Only pause if explicitly requested (not from focus/click events)
    if (this.iframe && this.iframe.contentWindow) {
      // Don't send stop message - let iframe handle its own pause/resume
      // this.iframe.contentWindow.postMessage({ type: 'stop' }, '*');
    }
  }
  
  break(): void {
    console.log('Apple2EPlatform break() called (Ctrl+C / BRK)');
    if (this.iframe && this.iframe.contentWindow) {
      this.iframe.contentWindow.postMessage({ type: 'break' }, '*');
    }
  }

  resume(): void {
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
  getApple2API(): any {
    if (!this.iframe || !this.iframe.contentWindow) {
      console.warn('Apple2EPlatform: iframe not available');
      return null;
    }
    
    try {
      // Access the iframe's window object
      const iframeWindow = this.iframe.contentWindow as any;
      
      if (!iframeWindow.apple2 && !iframeWindow.APPLE2_API) {
        console.warn('Apple2EPlatform: apple2 API not available in iframe yet');
        return null;
      }
      
      // Return API wrapper that proxies to iframe
      return {
        // Direct access to apple2 instance
        get apple2() {
          return iframeWindow.apple2 || iframeWindow.APPLE2_API?.apple2;
        },
        
        // Convenience methods
        getIO: () => {
          const apple2 = iframeWindow.apple2 || iframeWindow.APPLE2_API?.apple2;
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
          const apple2 = iframeWindow.apple2 || iframeWindow.APPLE2_API?.apple2;
          return apple2 ? apple2.getCPU() : null;
        },
        
        setAcceleration: (enabled: boolean) => {
          const api = iframeWindow.APPLE2_API;
          if (api && api.setAcceleration) {
            api.setAcceleration(enabled);
          } else {
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
          const apple2 = iframeWindow.apple2 || iframeWindow.APPLE2_API?.apple2;
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
          const apple2 = iframeWindow.apple2 || iframeWindow.APPLE2_API?.apple2;
          if (apple2) apple2.run();
        },
        
        stop: () => {
          const apple2 = iframeWindow.apple2 || iframeWindow.APPLE2_API?.apple2;
          if (apple2) apple2.stop();
        },
        
        isRunning: () => {
          const apple2 = iframeWindow.apple2 || iframeWindow.APPLE2_API?.apple2;
          return apple2 ? apple2.isRunning() : false;
        },
        
        // Type text into emulator
        type: (text: string) => {
          const apple2 = iframeWindow.apple2 || iframeWindow.APPLE2_API?.apple2;
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
          function sendTextToEmulator(io: any, text: string) {
            console.log('Apple2EPlatform: Sending text:', JSON.stringify(text.substring(0, 80)));
            
            // CRITICAL: Focus the canvas in the iframe for keyboard input
            // This is essential for iframe-based emulators - keyboard input requires focus
            try {
              const iframeDoc = iframeWindow.document;
              const canvas = iframeDoc.querySelector('#screen');
              if (canvas && (canvas as HTMLElement).focus) {
                (canvas as HTMLElement).focus();
                console.log('Apple2EPlatform: Focused canvas in iframe for keyboard input');
              }
            } catch (e) {
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
                  const apple2 = iframeWindow.apple2 || iframeWindow.APPLE2_API?.apple2;
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
              } catch (e) {
                console.error('Apple2EPlatform: setKeyBuffer failed:', e);
              }
            }, 100);
          }
          
          
          return true;
        },
        
        // Get video modes
        getVideoModes: () => {
          const apple2 = iframeWindow.apple2 || iframeWindow.APPLE2_API?.apple2;
          return apple2 ? apple2.getVideoModes() : null;
        },
        
        // Get stats
        getStats: () => {
          const apple2 = iframeWindow.apple2 || iframeWindow.APPLE2_API?.apple2;
          return apple2 ? apple2.getStats() : null;
        },
        
        // Break/interrupt a running BASIC program (Ctrl+C / BRK)
        // On Apple II, Ctrl+C sends BRK (0x03) which interrupts running programs
        break: () => {
          const apple2 = iframeWindow.apple2 || iframeWindow.APPLE2_API?.apple2;
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
              if (io.keyUp) io.keyUp();
            }, 50);
            console.log('Apple2EPlatform: ✅ BRK sent');
            return true;
          } catch (e) {
            console.error('Apple2EPlatform: Error sending BRK:', e);
            return false;
          }
        }
      };
    } catch (e) {
      console.error('Apple2EPlatform: Error accessing iframe API:', e);
      return null;
    }
  }

  loadROM(title: string, rom: Uint8Array): void {
    console.log('Apple2EPlatform loadROM() called', { title, romLength: rom?.length });
    if (!rom || rom.length === 0) {
      console.warn('Apple2EPlatform: No ROM data provided');
      return;
    }
    
    // Store the binary blob for download
    // Create a copy of the Uint8Array to ensure it's a proper ArrayBuffer
    const romCopy = new Uint8Array(rom);
    this.currentBinaryBlob = new Blob([romCopy], { type: 'application/octet-stream' });
    console.log(`Apple2EPlatform: Binary blob stored for download: ${this.currentBinaryBlob.size} bytes`);
    
    // Detect if this is a compiled binary (C program) or BASIC text
    // Compiled binaries are typically > 100 bytes and don't decode to valid ASCII BASIC
    const isBinary = this.isCompiledBinary(rom);
    
    if (isBinary) {
      console.log('Apple2EPlatform: Detected compiled binary, creating disk image');
      this.loadCompiledProgram(title, rom);
    } else {
      console.log('Apple2EPlatform: Detected BASIC program, creating disk image');
      // For BASIC programs, create a disk with the BASIC program using AppleCommander
      this.loadBasicProgram(title, rom);
    }
  }
  
  private isCompiledBinary(data: Uint8Array): boolean {
    // Check if data is likely a compiled binary:
    // 1. Size > 100 bytes (BASIC programs are usually smaller when encoded)
    // 2. Contains null bytes or non-printable characters
    // 3. Doesn't start with line numbers (BASIC programs start with "10 ", "20 ", etc.)
    if (data.length < 100) {
      // Small files are likely BASIC
      return false;
    }
    
    // Try to decode as text
    let text: string;
    try {
      text = new TextDecoder('utf-8', { fatal: false }).decode(data);
    } catch (e) {
      // If decoding fails, it's likely binary
      return true;
    }
    
    // Check if it looks like BASIC (starts with line numbers)
    const trimmed = text.trim();
    if (/^\d+\s/.test(trimmed)) {
      // Starts with a line number, likely BASIC
      return false;
    }
    
    // Check for high percentage of non-printable characters
    let nonPrintable = 0;
    for (let i = 0; i < Math.min(data.length, 1000); i++) {
      if (data[i] < 0x20 && data[i] !== 0x0A && data[i] !== 0x0D && data[i] !== 0x09) {
        nonPrintable++;
      }
    }
    
    // If more than 10% are non-printable (excluding common whitespace), it's likely binary
    return nonPrintable > (Math.min(data.length, 1000) * 0.1);
  }
  
  private createAppleIIDiskImage(programData: Uint8Array, filename: string, loadAddress: number, runAddress: number): Uint8Array {
    // Apple II DOS 3.3 disk format:
    // - 35 tracks
    // - 16 sectors per track
    // - 256 bytes per sector
    // - Total: 35 * 16 * 256 = 143,360 bytes
    
    const TRACKS = 35;
    const SECTORS_PER_TRACK = 16;
    const BYTES_PER_SECTOR = 256;
    const DISK_SIZE = TRACKS * SECTORS_PER_TRACK * BYTES_PER_SECTOR;
    
    const disk = new Uint8Array(DISK_SIZE);
    disk.fill(0);
    
    // Helper to write data at a specific address
    const write = (address: number, data: string | number | Uint8Array, length?: number) => {
      if (typeof data === 'string') {
        for (let i = 0; i < data.length && (address + i) < disk.length; i++) {
          disk[address + i] = data.charCodeAt(i) & 0xff;
        }
      } else if (typeof data === 'number') {
        const len = length || 1;
        for (let b = 0; b < len && (address + b) < disk.length; b++) {
          disk[address + b] = (data >> (b * 8)) & 0xff;
        }
      } else if (data instanceof Uint8Array) {
        for (let i = 0; i < data.length && (address + i) < disk.length; i++) {
          disk[address + i] = data[i];
        }
      }
    };
    
    // Track 0, Sector 0: Volume Table of Contents (VTOC)
    // Byte 0x00: Unused
    // Byte 0x01: Track of first catalog sector (usually 0x11 = track 17)
    // Byte 0x02: Sector of first catalog sector (usually 0x0F = sector 15)
    // Byte 0x03: DOS version (0x03 = DOS 3.3)
    // Byte 0x04-0x26: Volume bitmap (tracks 0-34, each bit = 1 sector)
    // Byte 0x27: Number of tracks per disk (0x23 = 35)
    // Byte 0x28-0x2F: Unused
    // Byte 0x30-0x33: Maximum number of tracks (0x23 = 35)
    // Byte 0x34-0x35: Last allocated track/sector
    // Byte 0x36-0x3F: Unused
    
    write(0x0000, 0x00); // Unused
    write(0x0001, 0x11); // First catalog track (17)
    write(0x0002, 0x0F); // First catalog sector (15)
    write(0x0003, 0x03); // DOS version 3.3
    write(0x0027, 0x23); // 35 tracks
    write(0x0030, 0x23); // Max tracks
    write(0x0031, 0x23); // Max tracks (high byte)
    
    // Mark sectors as used in bitmap (tracks 0-2 are used for DOS)
    // Track 0: sectors 0-15 used
    for (let i = 0; i < 16; i++) {
      const byteIndex = 0x04 + Math.floor(i / 8);
      const bitIndex = i % 8;
      disk[byteIndex] |= (1 << (7 - bitIndex));
    }
    
    // Track 1: sectors 0-15 used
    for (let i = 0; i < 16; i++) {
      const byteIndex = 0x06 + Math.floor(i / 8);
      const bitIndex = i % 8;
      disk[byteIndex] |= (1 << (7 - bitIndex));
    }
    
    // Track 2: sectors 0-15 used
    for (let i = 0; i < 16; i++) {
      const byteIndex = 0x08 + Math.floor(i / 8);
      const bitIndex = i % 8;
      disk[byteIndex] |= (1 << (7 - bitIndex));
    }
    
    // Calculate sectors needed for program
    const programSectors = Math.ceil(programData.length / BYTES_PER_SECTOR);
    const startTrack = 3;
    const startSector = 0;
    
    // Mark program sectors as used
    let currentTrack = startTrack;
    let currentSector = startSector;
    for (let i = 0; i < programSectors; i++) {
      const byteIndex = 0x04 + Math.floor((currentTrack * 16 + currentSector) / 8);
      const bitIndex = (currentTrack * 16 + currentSector) % 8;
      disk[byteIndex] |= (1 << (7 - bitIndex));
      
      currentSector++;
      if (currentSector >= 16) {
        currentSector = 0;
        currentTrack++;
      }
    }
    
    // Track 17, Sector 15: Catalog sector
    // Each file entry is 35 bytes
    const CATALOG_TRACK = 17;
    const CATALOG_SECTOR = 15;
    const CATALOG_OFFSET = (CATALOG_TRACK * SECTORS_PER_TRACK + CATALOG_SECTOR) * BYTES_PER_SECTOR;
    
    // Catalog header
    write(CATALOG_OFFSET + 0x00, 0x11); // Next catalog track (17)
    write(CATALOG_OFFSET + 0x01, 0x0E); // Next catalog sector (14)
    write(CATALOG_OFFSET + 0x02, 0x00); // Unused
    write(CATALOG_OFFSET + 0x03, 0x01); // Number of files (1)
    write(CATALOG_OFFSET + 0x04, 0x00); // Unused
    
    // File entry (starts at offset 0x0B)
    // DOS 3.3 catalog entry format:
    // Bytes 0x00-0x1D: Filename (30 chars, space-padded)
    // Byte 0x1E: Track of first sector
    // Byte 0x1F: Sector of first sector
    // Byte 0x20: File type and flags (bit 7 = locked, bits 0-2 = type)
    // Byte 0x21-0x22: Length in sectors (low, high)
    // For binary files, we also need load/run addresses in the file itself
    const FILE_ENTRY_OFFSET = CATALOG_OFFSET + 0x0B;
    const filenamePadded = (filename.substring(0, 30).toUpperCase() + '                    ').substring(0, 30);
    write(FILE_ENTRY_OFFSET + 0x00, filenamePadded.substring(0, 30)); // Filename (30 chars)
    write(FILE_ENTRY_OFFSET + 0x1E, startTrack); // Track of first sector
    write(FILE_ENTRY_OFFSET + 0x1F, startSector); // Sector of first sector
    write(FILE_ENTRY_OFFSET + 0x20, 0x80); // File type: 0x80 = binary (type 0) + locked bit
    write(FILE_ENTRY_OFFSET + 0x21, programSectors & 0xFF); // Length in sectors (low byte)
    write(FILE_ENTRY_OFFSET + 0x22, (programSectors >> 8) & 0xFF); // Length in sectors (high byte)
    
    // Write program data with DOS 3.3 binary file header
    // Binary files on DOS 3.3 have a 2-byte header: load address (low, high)
    // Then the program data, then a 2-byte run address (low, high) at the end
    const programOffset = (startTrack * SECTORS_PER_TRACK + startSector) * BYTES_PER_SECTOR;
    
    // Write load address (2 bytes, little-endian)
    write(programOffset + 0, loadAddress & 0xFF);
    write(programOffset + 1, (loadAddress >> 8) & 0xFF);
    
    // Write program data
    write(programOffset + 2, programData);
    
    // Write run address at the end (2 bytes, little-endian)
    const runAddressOffset = programOffset + 2 + programData.length;
    write(runAddressOffset + 0, runAddress & 0xFF);
    write(runAddressOffset + 1, (runAddress >> 8) & 0xFF);
    
    console.log(`Apple2EPlatform: Created disk image: ${filename}.BIN, ${programSectors} sectors, ${programData.length} bytes, Load: $${loadAddress.toString(16)}, Run: $${runAddress.toString(16)}`);
    
    return disk;
  }
  
  private parseBinaryHeader(data: Uint8Array): { loadAddress: number, runAddress: number, headerSize: number, programData: Uint8Array } {
    // Check for AppleSingle header: https://github.com/cc65/cc65/blob/master/libsrc/apple2/exehdr.s
    // Magic: 0x00, 0x05, 0x16, 0x00
    if (data.length >= 58 && 
        data[0] === 0x00 && data[1] === 0x05 && data[2] === 0x16 && data[3] === 0x00) {
      // AppleSingle format - load address is at offset 0x38-0x39 (big endian)
      const loadAddress = (data[0x38] << 8) | data[0x39];
      // Run address is typically the same as load address for cc65 programs
      const runAddress = loadAddress;
      const headerSize = 58;
      const programData = data.slice(headerSize);
      console.log(`Apple2EPlatform: Detected AppleSingle header - Load: $${loadAddress.toString(16)}, Size: ${programData.length} bytes`);
      return { loadAddress, runAddress, headerSize, programData };
    }
    
    // Check for 4-byte DOS header
    if (data.length >= 4) {
      const origin = data[0] | (data[1] << 8);
      const size = data[2] | (data[3] << 8);
      const isPlausible = origin < 0xc000 && 
                         origin + size < 0x13000 && 
                         (origin === 0x803 || (origin & 0xff) === 0);
      
      if (size === data.length - 4 && isPlausible) {
        const loadAddress = origin;
        const runAddress = origin; // Default run address same as load
        const headerSize = 4;
        const programData = data.slice(headerSize);
        console.log(`Apple2EPlatform: Detected DOS header - Load: $${loadAddress.toString(16)}, Size: ${programData.length} bytes`);
        return { loadAddress, runAddress, headerSize, programData };
      }
    }
    
    // Default: raw binary @ $803 (standard cc65 load address)
    const loadAddress = 0x803;
    const runAddress = 0x803;
    const headerSize = 0;
    const programData = data;
    console.log(`Apple2EPlatform: No header detected, using default - Load: $${loadAddress.toString(16)}, Size: ${programData.length} bytes`);
    return { loadAddress, runAddress, headerSize, programData };
  }
  
  private async loadBasicProgram(title: string, programData: Uint8Array): Promise<void> {
    if (!this.iframe || !this.iframe.contentWindow) {
      console.error('Apple2EPlatform: Cannot load program - iframe not available');
      this.isLoadingProgram = false;
      return;
    }
    
    // Extract filename from title
    const filename = title.replace(/\.[^.]*$/, '').toUpperCase().substring(0, 8) || 'PROGRAM';
    
    // Decode BASIC program text
    const basicText = new TextDecoder().decode(programData);
    
    console.log(`Apple2EPlatform: Creating bootable disk for BASIC program ${filename}, ${basicText.length} bytes`);
    
    try {
      // Call PHP API to create bootable disk with BASIC program
      const API_BASE_URL = 'https://ide.retrogamecoders.com';
      
      const response = await fetch(`${API_BASE_URL}/api/apple2/create_disk.php`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          basic: basicText,
          filename: filename,
          loadAddress: 0,
          runAddress: 0,
          sessionID: `apple2_${Date.now()}`
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Decode disk image
      const diskData = Uint8Array.from(atob(result.disk), c => c.charCodeAt(0));
      
      console.log(`Apple2EPlatform: Bootable disk created: ${result.filename}, ${diskData.length} bytes`);
      
      // Store disk blob for download
      const diskBuffer = new ArrayBuffer(diskData.length);
      new Uint8Array(diskBuffer).set(diskData);
      this.currentDiskBlob = new Blob([diskBuffer], { type: 'application/octet-stream' });
      console.log(`Apple2EPlatform: Disk blob stored for download: ${this.currentDiskBlob.size} bytes`);
      
      // Send disk to iframe - it contains the BASIC program
      this.iframe.contentWindow.postMessage({
        type: 'load_disk',
        data: {
          drive: 1,
          filename: result.filename,
          diskData: Array.from(diskData)
        }
      }, '*');
      
      // Clear loading flag after a delay
      setTimeout(() => {
        this.isLoadingProgram = false;
      }, 5000);
    } catch (error) {
      console.error('Apple2EPlatform: Error creating bootable disk via PHP API:', error);
      this.isLoadingProgram = false;
      throw error;
    }
  }
  
  private async loadCompiledProgram(title: string, programData: Uint8Array): Promise<void> {
    if (!this.iframe || !this.iframe.contentWindow) {
      console.error('Apple2EPlatform: Cannot load program - iframe not available');
      this.isLoadingProgram = false;
      return;
    }
    
    // Parse binary header to get load address (for logging)
    // But send the FULL binary (with AppleSingle header) to PHP, just like the shell script does
    const { loadAddress, runAddress } = this.parseBinaryHeader(programData);
    
    // Extract filename from title
    const filename = title.replace(/\.[^.]*$/, '').toUpperCase().substring(0, 8) || 'PROGRAM';
    
    console.log(`Apple2EPlatform: Creating bootable disk for ${filename} - Load: $${loadAddress.toString(16)}, Run: $${runAddress.toString(16)}, Size: ${programData.length} bytes (full binary with header)`);
    
    try {
      // Call PHP API to create bootable disk
      // Always use production server - local Python server doesn't support PHP/POST
      const API_BASE_URL = 'https://ide.retrogamecoders.com';
      // Send the FULL binary (with AppleSingle header) - AppleCommander can handle it directly
      const binaryBase64 = btoa(String.fromCharCode(...programData));
      
      const response = await fetch(`${API_BASE_URL}/api/apple2/create_disk.php`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          binary: binaryBase64,
          filename: filename,
          loadAddress: loadAddress,
          runAddress: runAddress,
          sessionID: `apple2_${Date.now()}`
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Decode disk image
      const diskData = Uint8Array.from(atob(result.disk), c => c.charCodeAt(0));
      
      console.log(`Apple2EPlatform: Bootable disk created: ${result.filename}, ${diskData.length} bytes`);
      
      // Store disk blob for download
      // Create a new ArrayBuffer to avoid SharedArrayBuffer issues
      const diskBuffer = new ArrayBuffer(diskData.length);
      new Uint8Array(diskBuffer).set(diskData);
      this.currentDiskBlob = new Blob([diskBuffer], { type: 'application/octet-stream' });
      console.log(`Apple2EPlatform: Disk blob stored for download: ${this.currentDiskBlob.size} bytes`);
      
      // Send disk to iframe - it's bootable and will auto-execute STARTUP.BAS (HELLO)
      // STARTUP.BAS contains: 10 PRINT CHR$(4);"BRUN PROG"
      // So we don't need to type anything - just boot and let it auto-execute
      this.iframe.contentWindow.postMessage({
        type: 'load_disk',
        data: {
          drive: 1, // Load bootable disk into drive 1 (it contains DOS + program + auto-executing BASIC)
          filename: result.filename,
          diskData: Array.from(diskData)
          // No runCommand - the disk auto-executes on boot
        }
      }, '*');
      
      // Clear loading flag after a delay
      setTimeout(() => {
        this.isLoadingProgram = false;
      }, 5000);
    } catch (error) {
      console.error('Apple2EPlatform: Error creating bootable disk via PHP API:', error);
      this.isLoadingProgram = false;
      // No fallback - we need the PHP API to work
      throw error;
    }
  }
  
  private sendROMToEmulator(rom: Uint8Array): void {
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

  getROMExtension(rom: Uint8Array): string {
    // For BASIC programs, return .bas
    return '.bas';
  }

  readAddress(addr: number): number {
    // Not implemented for iframe-based emulator
    return 0;
  }

  writeAddress(addr: number, val: number): void {
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

  showHelp(): string {
    return 'https://github.com/whscullin/apple2js#readme';
  }
}

// Register the platform
PLATFORMS['apple2e'] = Apple2EPlatform;

// Export for dynamic loading
export default Apple2EPlatform;

