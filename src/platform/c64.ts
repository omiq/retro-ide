import { C64ChipsMachine } from "../machine/c64";
import { Platform, Preset } from "../common/baseplatform";
import { PLATFORMS } from "../common/emu";
import { RasterVideo, AnimationTimer } from "../common/emu";

const C64_PRESETS : Preset[] = [
  {id:'helloc.c', name:'Hello World', category:'C Tutorial'},
  {id:'demo.c', name:'Scrolling Text and Music Demo'},
  {id:'wordy.c', name:'Word Game'},
  {id:'adventure.c', name:'Text Adventure'},
  {id:'hello.bas', name:'Hello World (BASIC)', category:'BASIC Tutorial'},
  {id:'dartmouth.bas', name:'BASIC Tutorial (BASIC)'},
  {id:'colors.bas', name:'Color Demo (BASIC)'},
  {id:'game.bas', name:'Number Game (BASIC)'},
  {id:'labels.bas', name:'Label Demo (BASIC)'},
  {id:'lander.bas', name:'Space Lander Game (BASIC)'},
  {id:'adventure.bas', name:'Adventure Game (BASIC)'},
  {id:'trek64.bas', name:'Star Trek (BASIC)'},
  {id:'controlcodes.bas', name:'Control Codes Demo (BASIC)'},
  {id:'screen_ram.c', name:'Screen RAM', category:'8-bit Workshop Demos'},
  {id:'siegegame.c', name:'Siege Game'},
  {id:'joymove.c', name:'Sprite Movement'},
  {id:'sprite_collision.c', name:'Sprite Collision'},
  {id:'scroll1.c', name:'Scrolling (Single Buffer)'},
  {id:'test_setirq.c', name:'Raster Interrupts'},
  {id:'test_display_list.c', name:'Raster IRQ Library'},
  {id:'scrolling_text.c', name:'Big Scrolling Text'},
  {id:'side_scroller.c', name:'Side-Scrolling Game'},
  {id:'scroll2.c', name:'Scrolling (Double Buffer)'},
  {id:'scroll3.c', name:'Scrolling (Multidirectional)'},
  {id:'scroll4.c', name:'Scrolling (Color RAM Buffering)'},
  {id:'scroll5.c', name:'Scrolling (Camera Following)'},
  {id:'scrollingmap1.c', name:'Scrolling Tile Map'},
  {id:'fullscrollgame.c', name:'Full-Scrolling Game'},
  {id:'test_multiplex.c', name:'Sprite Retriggering'},
  {id:'test_multispritelib.c', name:'Sprite Multiplexing Library'},
  {id:'mcbitmap.c', name:'Multicolor Bitmap Mode'},
  {id:'testlz4.c', name:'LZ4 Bitmap Compression'},
  {id:'mandel.c', name:'Mandelbrot Fractal'},
  {id:'musicplayer.c', name:'Music Player'},
  {id:'sidtune.dasm', name:'Tiny SID Tune (ASM)'},
  {id:'siddemo.c', name:'SID Player Demo'},
  {id:'digisound.c', name:'Digi Sound Player'},
  {id:'climber.c', name:'Climber Game'},
  {id:'test_border_sprites.c', name:'Sprites in the Borders'},
  {id:'sprite_stretch.c', name:'Sprite Stretching'},
  {id:'linecrunch.c', name:'Linecrunch'},
  {id:'fld.c', name:'Flexible Line Distance'},
  {id:'plasma.c', name:'Plasma Demo'},
  {id:'23matches.c', name:'23 Matches'},
  {id:'tgidemo.c', name:'TGI Graphics Demo'},
  {id:'upandaway.c', name:'Up, Up and Away'},

];

const C64_MEMORY_MAP = { main:[
  {name:'6510 Registers',start:0x0,  size:0x2,type:'io'},
  {name:'BIOS Reserved', start:0x200,   size:0xa7},
  {name:'Default Screen RAM', start:0x400,   size:1024,type:'ram'},
  {name:'Cartridge ROM',start:0x8000,size:0x2000,type:'rom'},
  {name:'BASIC ROM',    start:0xa000,size:0x2000,type:'rom'},
  {name:'Upper RAM',    start:0xc000,size:0x1000,type:'ram'},
  {name:'Character ROM',start:0xd000,size:0x1000,type:'rom'},
  {name:'VIC-II I/O',   start:0xd000,size:0x0400,type:'io'},
  {name:'SID',          start:0xd400,size:0x0400,type:'io'},
  {name:'Color RAM',    start:0xd800,size:0x0400,type:'io'},
  {name:'CIA 1',        start:0xdc00,size:0x0100,type:'io'},
  {name:'CIA 2',        start:0xdd00,size:0x0100,type:'io'},
  {name:'I/O 1',        start:0xde00,size:0x0100,type:'io'},
  {name:'I/O 2',        start:0xdf00,size:0x0100,type:'io'},
  {name:'KERNAL ROM',   start:0xe000,size:0x2000,type:'rom'},
] }

// Chips-test C64 platform
class C64ChipsPlatform implements Platform {
  private machine: C64ChipsMachine;
  private mainElement: HTMLElement;
  private timer: AnimationTimer;
  private video: RasterVideo;
  private running = false;
  private pauseResumeSupported = false;

  constructor(mainElement: HTMLElement) {
    this.mainElement = mainElement;
    this.machine = new C64ChipsMachine();
  }

  async start(): Promise<void> {
    console.log("C64ChipsPlatform start() called - EMULATOR DISABLED FOR TESTING");
    
    // Set up message listener for iframe capabilities
    this.setupIframeMessageListener();
    
    // Initially hide pause/resume buttons until we know if they're supported
    this.pauseResumeSupported = false;
    setTimeout(() => this.updateControlButtons(), 100);
    
    // Create iframe for C64 emulator
    const iframe = document.createElement('iframe');
    iframe.id = 'c64-iframe';
    iframe.style.width = '100%';
    iframe.style.height = '600px';
    iframe.style.border = '1px solid #ccc';
    iframe.style.backgroundColor = '#000';
    
    // Add iframe to the main element
    this.mainElement.innerHTML = '';
    this.mainElement.appendChild(iframe);
    console.log("C64ChipsPlatform: iframe created, setting up with auto-compilation");
    
    // Set up iframe with auto-compilation (async)
    this.setupIframeWithAutoCompilation().catch(error => {
      console.error("C64ChipsPlatform: Error in setupIframeWithAutoCompilation:", error);
    });
  }

  private nextFrame(): void {
    if (this.running) {
      // The chips-test emulator handles its own frame updates
      // We just need to keep the timer running
    }
  }

  private setupIframeMessageListener(): void {
    window.addEventListener('message', (event) => {
      // Only accept messages from our iframe
      const iframe = document.getElementById("c64-iframe") as HTMLIFrameElement;
      if (!iframe || event.source !== iframe.contentWindow) {
        return;
      }

      if (event.data && event.data.type === 'emulator_capabilities') {
        console.log("C64ChipsPlatform: Received emulator capabilities:", event.data.capabilities);
        
        if (event.data.capabilities && typeof event.data.capabilities.pauseResume === 'boolean') {
          this.pauseResumeSupported = event.data.capabilities.pauseResume;
          console.log("C64ChipsPlatform: Pause/resume supported:", this.pauseResumeSupported);
          
          // Update the UI to show/hide pause/resume buttons
          this.updateControlButtons();
        }
      }
    });
  }

  private updateControlButtons(): void {
    // Find the control buttons in the UI and show/hide them based on capability
    const pauseButton = document.getElementById('dbg_pause') as HTMLElement;
    const resumeButton = document.getElementById('dbg_go') as HTMLElement;
    
    if (pauseButton) {
      pauseButton.style.display = this.pauseResumeSupported ? 'inline-block' : 'none';
      console.log("C64ChipsPlatform: Pause button visibility:", this.pauseResumeSupported ? 'visible' : 'hidden');
    } else {
      console.log("C64ChipsPlatform: Pause button not found");
    }
    
    if (resumeButton) {
      resumeButton.style.display = this.pauseResumeSupported ? 'inline-block' : 'none';
      console.log("C64ChipsPlatform: Resume button visibility:", this.pauseResumeSupported ? 'visible' : 'hidden');
    } else {
      console.log("C64ChipsPlatform: Resume button not found");
    }
  }

  reset(): void {
    // Send reset command to iframe emulator
    const frame = document.getElementById("c64-iframe") as HTMLIFrameElement;
    if (frame && frame.contentWindow) {
      frame.contentWindow.postMessage({ type: 'reset' }, '*');
      console.log("C64ChipsPlatform: Sent reset command to iframe");
    }
    
    // Also reset the local machine for consistency
    if (this.machine) {
      this.machine.reset();
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  pause(): void {
    if (!this.pauseResumeSupported) {
      console.log("C64ChipsPlatform: Pause not supported by emulator");
      return;
    }
    
    // Send pause command to iframe emulator
    const frame = document.getElementById("c64-iframe") as HTMLIFrameElement;
    if (frame && frame.contentWindow) {
      frame.contentWindow.postMessage({ type: 'pause' }, '*');
      console.log("C64ChipsPlatform: Sent pause command to iframe");
    }
    
    // Also pause the local machine for consistency
    if (this.machine) {
      this.machine.stop();
      this.running = false;
    }
  }

  resume(): void {
    if (!this.pauseResumeSupported) {
      console.log("C64ChipsPlatform: Resume not supported by emulator");
      return;
    }
    
    // Send resume command to iframe emulator
    const frame = document.getElementById("c64-iframe") as HTMLIFrameElement;
    if (frame && frame.contentWindow) {
      frame.contentWindow.postMessage({ type: 'resume' }, '*');
      console.log("C64ChipsPlatform: Sent resume command to iframe");
    }
    
    // Also resume the local machine for consistency
    if (this.machine) {
      this.machine.run();
      this.running = true;
    }
  }

  loadROM(title: string, rom: Uint8Array): void {
    console.log("C64ChipsPlatform loadROM called with title:", title, "and", rom.length, "bytes");
    
    var frame = document.getElementById("c64-iframe") as HTMLIFrameElement;
    if (frame && frame.contentWindow) {
      // Instead of using URL parameters for large programs, use postMessage
      if (rom.length > 1000) { // If program is larger than 1KB, use postMessage
        console.log("C64ChipsPlatform: Large program detected, using postMessage instead of URL");
        
        // Load the iframe with just the base URL
        const baseURL = 'c64-iframe.html?t=' + Date.now();
        frame.src = baseURL;
        
        // Set up a one-time load event listener
        const onLoad = () => {
          console.log("C64ChipsPlatform: iframe loaded, sending program via postMessage");
          // Send the program data via postMessage
          frame.contentWindow!.postMessage({
            type: 'compiled_program',
            program: rom,
            autoLoad: true
          }, '*');
          frame.removeEventListener('load', onLoad);
        };
        frame.addEventListener('load', onLoad);
      } else {
        // For small programs, still use URL parameters
        const c64_debug = (window as any).c64_debug;
        if (c64_debug && c64_debug.openIframeWithCurrentProgram) {
          // Handle async generateIframeURL
          c64_debug.generateIframeURL(rom).then((iframeURL: string) => {
            console.log("C64ChipsPlatform: Generated iframe URL:", iframeURL);
            
            if (iframeURL) {
              const cacheBuster = '&t=' + Date.now();
              const freshURL = iframeURL + cacheBuster;
              console.log("C64ChipsPlatform: Loading fresh URL with cache buster:", freshURL);
              
              // Set up a one-time load event listener
              const onLoad = () => {
                console.log("C64ChipsPlatform: iframe loaded, calling checkForProgramInURL");
                if ((frame.contentWindow as any).checkForProgramInURL) {
                  (frame.contentWindow as any).checkForProgramInURL();
                }
                frame.removeEventListener('load', onLoad);
              };
              frame.addEventListener('load', onLoad);
              
              // Set the location (this triggers the load event)
              frame.contentWindow.location = freshURL;
            } else {
              console.error("C64ChipsPlatform: generateIframeURL returned null");
            }
          }).catch((error: any) => {
            console.error("C64ChipsPlatform: Error generating iframe URL:", error);
          });
        } else {
          console.error("C64ChipsPlatform: c64_debug not available");
        }
      }
    } else {
      console.error("C64ChipsPlatform: iframe not found or contentWindow not available");
    }
    
    if (this.machine) {
      this.machine.loadProgram(rom);
    } else {
      console.error("C64ChipsPlatform: machine is null!");
    }
  }

  // New method to handle initial iframe setup with auto-compilation
  private async setupIframeWithAutoCompilation() {
    console.log("C64ChipsPlatform: Setting up iframe with auto-compilation");
    
    // Check if we have a compiled program
    const output = (window as any).IDE?.getCurrentOutput();
    if (output && output instanceof Uint8Array) {
      console.log("C64ChipsPlatform: Found compiled program, loading iframe");
      
      const c64_debug = (window as any).c64_debug;
      if (c64_debug && c64_debug.generateIframeURL) {
        try {
          // Await the async generateIframeURL function
          const iframeURL = await c64_debug.generateIframeURL(output);
          console.log("C64ChipsPlatform: Generated iframe URL:", iframeURL);
          
          if (iframeURL) {
            await this.loadIframeWithProgram(iframeURL);
          } else {
            console.error("C64ChipsPlatform: generateIframeURL returned null");
          }
        } catch (error) {
          console.error("C64ChipsPlatform: Error generating iframe URL:", error);
        }
      } else {
        console.error("C64ChipsPlatform: c64_debug not available");
      }
    } else {
      console.log("C64ChipsPlatform: No compiled program found, triggering compilation");
      await this.triggerCompilationAndReload();
    }
  }

  private async loadIframeWithProgram(iframeURL: string) {
    console.log("C64ChipsPlatform: Loading iframe with program URL:", iframeURL);
    
    var frame = document.getElementById("c64-iframe") as HTMLIFrameElement;
    if (frame && frame.contentWindow) {
      const cacheBuster = '&t=' + Date.now();
      const freshURL = iframeURL + cacheBuster;
      console.log("C64ChipsPlatform: Loading fresh URL with cache buster:", freshURL);
      
      // Set up a one-time load event listener
      const onLoad = () => {
        console.log("C64ChipsPlatform: iframe loaded, calling checkForProgramInURL");
        if ((frame.contentWindow as any).checkForProgramInURL) {
          (frame.contentWindow as any).checkForProgramInURL();
        }
        frame.removeEventListener('load', onLoad);
      };
      frame.addEventListener('load', onLoad);
      
      // Set the location (this triggers the load event)
      frame.contentWindow.location = freshURL;
    } else {
      console.error("C64ChipsPlatform: iframe not found or contentWindow not available");
    }
  }

  private async triggerCompilationAndReload() {
    console.log("C64ChipsPlatform: Triggering compilation and reload");
    
    // Set up a one-time compilation listener
    this.setupCompilationListener();
    
    // Trigger compilation
    const worker = (window as any).worker;
    if (worker && worker.postMessage) {
      console.log("C64ChipsPlatform: Triggering compilation via worker");
      
      // Get current project files
      const project = (window as any).IDE?.getCurrentProject();
      const files = project?.getFiles() || {};
      
      // Create proper worker message format
      const mainFile = Object.keys(files)[0] || 'program.bas';
      const message = {
        updates: Object.entries(files).map(([path, data]) => ({
          path: path,
          data: typeof data === 'string' ? data : new TextDecoder().decode(data as Uint8Array)
        })),
        buildsteps: [{
          path: mainFile,
          files: [mainFile],
          platform: 'c64',
          tool: 'c64basic',
          mainfile: true
        }]
      };
      
      worker.postMessage(message);
    } else {
      console.error("C64ChipsPlatform: Worker not available for compilation");
    }
  }

  private setupCompilationListener() {
    console.log("C64ChipsPlatform: Setting up compilation listener");
    
    // Hook into the global setCompileOutput function to detect successful compilations
    const originalSetCompileOutput = (window as any).setCompileOutput;
    (window as any).setCompileOutput = (output: any) => {
      // Call the original function
      if (originalSetCompileOutput) {
        originalSetCompileOutput(output);
      }
      
      // If we have output, reload the iframe with the new program
      if (output && output instanceof Uint8Array) {
        console.log("C64ChipsPlatform: Compilation completed, reloading iframe with new program");
        
        // Wait a bit for the compilation output to be processed
        setTimeout(async () => {
          const c64_debug = (window as any).c64_debug;
          if (c64_debug && c64_debug.generateIframeURL) {
            try {
              const newIframeURL = await c64_debug.generateIframeURL(output);
              if (newIframeURL) {
                await this.loadIframeWithProgram(newIframeURL);
              }
            } catch (error) {
              console.error("C64ChipsPlatform: Error generating iframe URL after compilation:", error);
            }
          }
        }, 1000);
      }
    };
  }

  getPresets(): Preset[] {
    return C64_PRESETS;
  }

  getDefaultExtension(): string {
    return ".c";
  }

  getToolForFilename(filename: string): string {
    if (filename.toLowerCase().endsWith(".bas")) return "c64basic";
    if (filename.endsWith(".c")) return "cc65";
    if (filename.endsWith(".dasm")) return "dasm";
    if (filename.endsWith(".acme")) return "acme";
    if (filename.endsWith(".wiz")) return "wiz";
    return "cc65";
  }

  readAddress(addr: number): number {
    if (this.machine) {
      return this.machine.read(addr);
    }
    return 0;
  }

  getMemoryMap() {
    return C64_MEMORY_MAP;
  }

  showHelp(): string {
    return "https://8bitworkshop.com/docs/platforms/c64/";
  }

  getROMExtension(rom: Uint8Array): string {
    if (rom && rom[0] == 0x01 && rom[1] == 0x08) return ".prg";
    else return ".bin";
  }

  // Optional methods with default implementations
  getCPUState() {
    if (this.machine) {
      return this.machine.getCPUState();
    }
    return { PC: 0, SP: 0 };
  }

  saveState() {
    if (this.machine) {
      return this.machine.saveState();
    }
    return { c: { PC: 0, SP: 0 }, b: new Uint8Array(0) };
  }

  loadState(state: any): void {
    if (this.machine) {
      this.machine.loadState(state);
    }
  }

  getPC(): number {
    const cpuState = this.getCPUState();
    return cpuState.PC;
  }

  getSP(): number {
    const cpuState = this.getCPUState();
    return cpuState.SP;
  }

  isStable(): boolean {
    return true; // Assume stable for chips-test emulator
  }

  getExtraCompileFiles(filename: string): string[] {
    // Add binary files needed for specific demos
    if (filename === 'sidplaysfx.s') {
      return ['sidmusic1.bin'];
    }
    return [];
  }
}

PLATFORMS['c64'] = C64ChipsPlatform;

// Export the platform class for dynamic loading
export default C64ChipsPlatform; 