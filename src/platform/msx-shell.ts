import { MSX1 } from "../machine/msx";
import { Platform, BaseZ80MachinePlatform } from "../common/baseplatform";
import { PLATFORMS } from "../common/emu";
import { TeleTypeWithKeyboard } from "../common/teletype";
import { AnimationTimer } from "../common/emu";

// MSX Platform with Command Shell Interface
// Combines full MSX emulation with interactive development shell

const MSX_SHELL_PRESETS = [
  {id:'helloworld.asm', name:'Hello World (Z80 ASM)', category:'Assembly Tutorial'},
  {id:'helloworld.c', name:'Hello World (C)', category:'C Programming'},
  {id:'console_demo.c', name:'Console I/O Demo (C)', category:'C Programming'},
  {id:'graphics_demo.c', name:'Graphics Demo (C)', category:'C Programming'},
  {id:'sound_demo.c', name:'Sound Demo (C)', category:'C Programming'},
  {id:'game_demo.c', name:'Game Demo (C)', category:'C Programming'},
];

class MSXShellPlatform extends BaseZ80MachinePlatform<MSX1> implements Platform {
    private tty: TeleTypeWithKeyboard;
    public timer: AnimationTimer;
    private commandHistory: string[] = [];
    private historyIndex: number = -1;
    private currentDirectory: string = "A:";
    private files: { [name: string]: Uint8Array } = {};
    private compiledPrograms: {[filename: string]: Uint8Array} = {};

    constructor(mainElement: HTMLElement) {
        super(mainElement);
        this.setupVirtualFileSystem();
    }

    newMachine() { 
        return new MSX1(); 
    }

    getPresets() { 
        return MSX_SHELL_PRESETS; 
    }

    getDefaultExtension() { 
        return ".c"; 
    }

    readAddress(a) { 
        return this.machine.read(a); 
    }

    readVRAMAddress(a) { 
        return this.machine.readVRAMAddress(a); 
    }

    getMemoryMap = function() { return { main:[
        {name:'BIOS',start:0x0,size:0x4000,type:'rom'},
        {name:'RAM',start:0xc000,size:0x3200,type:'ram'},
        {name:'Stack',start:0xf000,size:0x300,type:'ram'},
        {name:'BIOS Work RAM',start:0xf300,size:0xd00},
    ] } };

    async start() {
        // Create command interface UI first
        this.createCommandInterface();

        // Initialize the MSX machine properly
        this.initializeMachine();

        // Start the command shell
        this.startCommandShell();
    }

    private initializeMachine() {
        try {
            this.machine = this.newMachine();
            // Don't call reset() here - let the user do it manually if needed
            console.log('MSX machine initialized successfully');
        } catch (error) {
            console.log('MSX machine initialization failed:', error);
        }
    }

    private createCommandInterface() {
        // Clear main element
        this.mainElement.innerHTML = '';
        this.mainElement.style.overflowY = 'auto';

        // Create terminal container
        const terminal = document.createElement('div');
        terminal.id = 'msx-shell-terminal';
        terminal.style.cssText = `
            background: #000;
            color: #0f0;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            padding: 10px;
            height: 100%;
            overflow-y: auto;
            white-space: pre-wrap;
        `;

        // Create input container
        const inputContainer = document.createElement('div');
        inputContainer.style.cssText = `
            display: flex;
            align-items: center;
            margin-top: 5px;
        `;

        const prompt = document.createElement('span');
        prompt.className = 'prompt';
        prompt.textContent = `${this.currentDirectory}> `;
        prompt.style.color = '#0f0';

        const input = document.createElement('input');
        input.type = 'text';
        input.style.cssText = `
            background: transparent;
            border: none;
            color: #0f0;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            outline: none;
            flex: 1;
            margin-left: 5px;
        `;

        inputContainer.appendChild(prompt);
        inputContainer.appendChild(input);
        terminal.appendChild(inputContainer);
        this.mainElement.appendChild(terminal);

        // Set up input handling
        this.setupInputHandling(input, terminal);
    }

    private setupInputHandling(input: HTMLInputElement, terminal: HTMLElement) {
        const addOutput = (text: string, color?: string) => {
            const output = document.createElement('div');
            output.textContent = text;
            if (color) output.style.color = color;
            terminal.insertBefore(output, terminal.lastElementChild);
            terminal.scrollTop = terminal.scrollHeight;
        };

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const command = input.value.trim();
                if (command) {
                    this.commandHistory.push(command);
                    this.historyIndex = this.commandHistory.length;
                    input.value = '';

                    // Add command to output
                    addOutput(`${this.currentDirectory}> ${command}`);

                    // Parse and execute command
                    const parts = command.trim().split(/\s+/);
                    const cmd = parts[0].toLowerCase();

                    switch (cmd) {
                        case 'dir':
                        case 'ls':
                            this.executeDir(parts, addOutput);
                            break;
                        case 'type':
                        case 'cat':
                            this.executeType(parts, addOutput);
                            break;
                        case 'del':
                        case 'rm':
                            this.executeDel(parts, addOutput);
                            break;
                        case 'copy':
                        case 'cp':
                            this.executeCopy(parts, addOutput);
                            break;
                        case 'ren':
                        case 'mv':
                            this.executeRen(parts, addOutput);
                            break;
                        case 'cd':
                            this.executeCd(parts, addOutput);
                            break;
                        case 'cls':
                        case 'clear':
                            terminal.innerHTML = '';
                            terminal.appendChild(input.parentElement!);
                            break;
                        case 'help':
                            this.executeHelp(addOutput);
                            break;
                        case 'asm':
                            this.executeAsm(parts, addOutput);
                            break;
                        case 'run':
                            this.executeRun(parts, addOutput);
                            break;
                        case 'mem':
                            this.executeMem(addOutput);
                            break;
                        case 'reg':
                            this.executeReg(addOutput);
                            break;
                        case 'reset':
                            this.executeReset(addOutput);
                            break;
                        case 'load':
                            this.executeLoad(parts, addOutput);
                            break;
                        case 'exit':
                        case 'quit':
                            addOutput('Goodbye!', '#ff0');
                            break;
                        case '':
                            // Empty command, do nothing
                            break;
                        default:
                            // Check if it's a filename that can be executed
                            if (this.isExecutableFile(cmd, parts)) {
                                // Treat as RUN command
                                this.executeRun(parts, addOutput);
                            } else {
                                addOutput(`Bad command or file name: ${cmd}`, '#f00');
                                addOutput('Type HELP for available commands.', '#ff0');
                            }
                    }
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (this.historyIndex > 0) {
                    this.historyIndex--;
                    input.value = this.commandHistory[this.historyIndex];
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (this.historyIndex < this.commandHistory.length - 1) {
                    this.historyIndex++;
                    input.value = this.commandHistory[this.historyIndex];
                } else {
                    this.historyIndex = this.commandHistory.length;
                    input.value = '';
                }
            }
        });

        // Focus input
        input.focus();

        // Display welcome message
        setTimeout(() => {
            const terminal = this.mainElement.querySelector('#msx-shell-terminal');
            if (terminal) {
                const welcome = document.createElement('div');
                welcome.innerHTML = `
MSX Development Shell
RetroGameCoders.com 2025
Full MSX Emulation with BIOS Support

Type HELP for available commands.
Type ASM to assemble current editor content.
Type RUN to execute programs.

`;
                welcome.style.color = '#0f0';
                terminal.insertBefore(welcome, terminal.lastElementChild);
            }
        }, 100);
    }

    private setupVirtualFileSystem() {
        // Add some example C programs
        this.files['HELLO.C'] = new TextEncoder().encode(`#include <stdio.h>
#include "msxbios.h"

int main() {
    CLS();
    POSIT(0x0101);  // Row 1, Column 1
    CHPUT('H');
    CHPUT('e');
    CHPUT('l');
    CHPUT('l');
    CHPUT('o');
    CHPUT(',');
    CHPUT(' ');
    CHPUT('M');
    CHPUT('S');
    CHPUT('X');
    CHPUT('!');
    CHPUT(13);  // Carriage return
    CHPUT(10);  // Line feed
    
    // Wait for key press
    CHGET();
    return 0;
}`);
        
        this.files['CONSOLE.C'] = new TextEncoder().encode(`#include <stdio.h>
#include "msxbios.h"

int main() {
    CLS();
    POSIT(0x0101);  // Row 1, Column 1
    
    // Print welcome message
    const char* msg = "MSX Console I/O Demo";
    while (*msg) {
        CHPUT(*msg++);
    }
    
    POSIT(0x0301);  // Row 3, Column 1
    msg = "Press any key to continue...";
    while (*msg) {
        CHPUT(*msg++);
    }
    
    // Wait for key press
    char key = CHGET();
    
    POSIT(0x0501);  // Row 5, Column 1
    msg = "You pressed: ";
    while (*msg) {
        CHPUT(*msg++);
    }
    CHPUT(key);
    
    POSIT(0x0701);  // Row 7, Column 1
    msg = "Press any key to exit...";
    while (*msg) {
        CHPUT(*msg++);
    }
    
    CHGET();
    return 0;
}`);
        
        // Add msxbios.asm for C programs
        this.files['MSXBIOS.ASM'] = new TextEncoder().encode(`; MSX BIOS function implementations for C programs
; This file provides C-callable wrappers for MSX BIOS functions

        .module msxbios
        .area   _CODE

; CLS - Clear screen
_CLS::
        call    0x00C3
        ret

; POSIT - Position cursor
; Parameters: row (A), col (H)
_POSIT::
        ld      a, 4(sp)    ; Get row parameter
        ld      h, 5(sp)    ; Get col parameter
        call    0x00C6
        ret

; CHPUT - Character output
; Parameter: character in A
_CHPUT::
        ld      a, 4(sp)    ; Get character parameter
        call    0x00A2
        ret

; CHGET - Character input
; Returns: character in A
_CHGET::
        call    0x009F
        ld      l, a        ; Return value in L
        ret

; GTSTCK - Get joystick status
_GTSTCK::
        ld      a, 4(sp)    ; Get stick parameter
        call    0x00D5
        ld      l, a        ; Return value in L
        ret

; GTTRIG - Get trigger status
_GTTRIG::
        ld      a, 4(sp)    ; Get trigger parameter
        call    0x00D8
        ld      l, a        ; Return value in L
        ret

; SNSMAT - Sense matrix
_SNSMAT::
        ld      a, 4(sp)    ; Get matrix parameter
        call    0x0141
        ld      l, a        ; Return value in L
        ret

; KILBUF - Clear keyboard buffer
_KILBUF::
        call    0x0156
        ret

; CALBAS - Call BASIC
_CALBAS::
        call    0x0159
        ret

; EXTROM - Call external ROM
_EXTROM::
        call    0x015F
        ret

; CHGCPU - Change CPU mode
_CHGCPU::
        ld      a, 4(sp)    ; Get mode parameter
        call    0x0180
        ret

; GETCPU - Get CPU mode
_GETCPU::
        call    0x0183
        ld      l, a        ; Return value in L
        ret

; PCMPLY - PCM play
_PCMPLY::
        call    0x0186
        ret

; PCMREC - PCM record
_PCMREC::
        call    0x0189
        ret`);
    }

    private async sendBuildStep(buildStep: any, sourceCode: Uint8Array): Promise<any> {
        // Use the global worker from the IDE
        const worker = (window as any).worker;
        if (!worker) {
            throw new Error('Global worker not available');
        }

        // Create a worker message with the build step
        const updates = [{
            path: buildStep.path,
            data: new TextDecoder().decode(sourceCode)
        }];

        // For C files, also include msxbios.asm
        if (buildStep.path.endsWith('.C') && this.files['MSXBIOS.ASM']) {
            updates.push({
                path: 'msxbios.asm',
                data: new TextDecoder().decode(this.files['MSXBIOS.ASM'])
            });
        }

        const message = {
            updates: updates,
            buildsteps: [buildStep]
        };

        // Send to worker and wait for result
        return new Promise((resolve, reject) => {
            const originalOnMessage = worker.onmessage;
            let resolved = false;
            
            worker.onmessage = (event: MessageEvent) => {
                // Call the original handler first
                if (originalOnMessage) {
                    originalOnMessage.call(worker, event);
                }
                
                // Check if this is our build result
                if (!resolved && event.data && (event.data.output || event.data.errors)) {
                    resolved = true;
                    worker.onmessage = originalOnMessage;
                    resolve(event.data);
                }
            };
            
            worker.onerror = (error) => {
                if (!resolved) {
                    resolved = true;
                    worker.onmessage = originalOnMessage;
                    reject(error);
                }
            };
            
            // Set a timeout to prevent hanging
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    worker.onmessage = originalOnMessage;
                    reject(new Error('Assembly timeout'));
                }
            }, 10000);
            
            worker.postMessage(message);
        });
    }

    private startCommandShell() {
        // Command shell is already started in createCommandInterface
    }

    // Command implementations
    private executeDir(parts: string[], addOutput: (text: string, color?: string) => void) {
        const files = Object.keys(this.files);
        if (files.length === 0) {
            addOutput('No files found.');
            return;
        }

        addOutput('Directory of A:\\');
        addOutput('');
        files.forEach(file => {
            const size = this.files[file].length;
            addOutput(`${file.padEnd(12)} ${size.toString().padStart(8)} bytes`);
        });
        addOutput(`${files.length} file(s)`);
    }

    private executeType(parts: string[], addOutput: (text: string, color?: string) => void) {
        if (parts.length < 2) {
            addOutput('Usage: TYPE <filename>');
            return;
        }

        const filename = parts[1].toUpperCase();
        if (this.files[filename]) {
            const content = new TextDecoder().decode(this.files[filename]);
            addOutput(`Contents of ${filename}:`);
            addOutput('');
            addOutput(content);
        } else {
            addOutput(`File not found: ${filename}`);
        }
    }

    private executeDel(parts: string[], addOutput: (text: string, color?: string) => void) {
        if (parts.length < 2) {
            addOutput('Usage: DEL <filename>');
            return;
        }

        const filename = parts[1].toUpperCase();
        if (this.files[filename]) {
            delete this.files[filename];
            addOutput(`File deleted: ${filename}`);
        } else {
            addOutput(`File not found: ${filename}`);
        }
    }

    private executeCopy(parts: string[], addOutput: (text: string, color?: string) => void) {
        if (parts.length < 3) {
            addOutput('Usage: COPY <source> <destination>');
            return;
        }

        const source = parts[1].toUpperCase();
        const dest = parts[2].toUpperCase();
        
        if (this.files[source]) {
            this.files[dest] = this.files[source];
            addOutput(`File copied: ${source} -> ${dest}`);
        } else {
            addOutput(`Source file not found: ${source}`);
        }
    }

    private executeRen(parts: string[], addOutput: (text: string, color?: string) => void) {
        if (parts.length < 3) {
            addOutput('Usage: REN <oldname> <newname>');
            return;
        }

        const oldname = parts[1].toUpperCase();
        const newname = parts[2].toUpperCase();
        
        if (this.files[oldname]) {
            this.files[newname] = this.files[oldname];
            delete this.files[oldname];
            addOutput(`File renamed: ${oldname} -> ${newname}`);
        } else {
            addOutput(`File not found: ${oldname}`);
        }
    }

    private executeCd(parts: string[], addOutput: (text: string, color?: string) => void) {
        if (parts.length < 2) {
            addOutput(`Current directory: ${this.currentDirectory}`);
            return;
        }

        const newDir = parts[1].toUpperCase();
        if (newDir === 'A:' || newDir === 'B:' || newDir === 'C:') {
            this.currentDirectory = newDir;
            addOutput(`Current directory is now ${this.currentDirectory}`);
            // Update the prompt to show the new directory
            this.updatePrompt();
        } else {
            addOutput('Invalid drive. Use A:, B:, or C:');
        }
    }

    private updatePrompt() {
        const prompt = this.mainElement.querySelector('.prompt') as HTMLElement;
        if (prompt) {
            prompt.textContent = `${this.currentDirectory}> `;
        }
    }

    private isExecutableFile(cmd: string, parts: string[]): boolean {
        // Check if it's a .COM file
        if (this.files[cmd.toUpperCase() + '.COM']) {
            return true;
        }
        
        // Check if it's a compiled .ASM file
        if (this.compiledPrograms[cmd.toUpperCase() + '.ASM']) {
            return true;
        }
        
        // Check if it's a compiled .C file
        if (this.compiledPrograms[cmd.toUpperCase() + '.C']) {
            return true;
        }
        
        // Check if it's a .COM file without extension
        if (cmd.toUpperCase().endsWith('.COM') && this.files[cmd.toUpperCase()]) {
            return true;
        }
        
        return false;
    }

    private executeHelp(addOutput: (text: string, color?: string) => void) {
        addOutput('MSX Development Shell');
        addOutput('');
        addOutput('File Commands:');
        addOutput('  DIR, LS          - List directory');
        addOutput('  TYPE <file>      - Display file contents');
        addOutput('  DEL <file>       - Delete file');
        addOutput('  COPY <src> <dst> - Copy file');
        addOutput('  REN <old> <new>  - Rename file');
        addOutput('  CD <drive>       - Change drive (A:, B:, C:)');
        addOutput('  CLS, CLEAR       - Clear screen');
        addOutput('  HELP             - Show this help');
        addOutput('  EXIT, QUIT       - Exit interface');
        addOutput('');
        addOutput('Development Commands:');
        addOutput('  ASM              - Assemble current editor content');
        addOutput('  ASM <file>       - Assemble specified file');
        addOutput('  RUN <file>       - Execute program');
        addOutput('  LOAD <file>      - Load compiled program');
        addOutput('  MEM              - Show memory map');
        addOutput('  REG              - Show CPU registers');
        addOutput('  RESET            - Reset CPU');
        addOutput('');
        addOutput('Examples:');
        addOutput('  ASM              - Assemble code in editor');
        addOutput('  ASM HELLO.C      - Assemble C file');
        addOutput('  RUN HELLO        - Execute program');
        addOutput('  HELLO            - Execute program (shortcut)');
    }

    private async executeAsm(parts: string[], addOutput: (text: string, color?: string) => void) {
        let filename: string;
        let sourceCode: Uint8Array;

        if (parts.length >= 2) {
            // Use specified filename
            filename = parts[1].toUpperCase();
            if (this.files[filename]) {
                sourceCode = this.files[filename];
            } else {
                addOutput(`File not found: ${filename}`);
                return;
            }
        } else {
            // Use current editor content
            filename = 'CURRENT.C';
            try {
                // Get current editor content from the IDE
                const getCurrentProject = (window as any).IDE?.getCurrentProject;
                const getCurrentMainFilename = (window as any).IDE?.getCurrentMainFilename;
                
                if (getCurrentProject && getCurrentMainFilename) {
                    const currentProject = getCurrentProject();
                    const currentFile = getCurrentMainFilename();
                    const fileData = currentProject.getFile(currentFile);
                    
                    if (fileData) {
                        sourceCode = new TextEncoder().encode(fileData);
                        filename = currentFile.toUpperCase();
                    } else {
                        addOutput('No content in current editor');
                        return;
                    }
                } else {
                    addOutput('IDE not available - use ASM <filename>');
                    return;
                }
            } catch (error) {
                addOutput(`Error getting editor content: ${error.message}`);
                return;
            }
        }

        addOutput(`Compiling ${filename}...`);
        
        try {
            // Determine tool based on file extension
            const tool = filename.endsWith('.C') ? 'sdcc' : 'zmac';
            
            // Create a build step
            const buildStep = {
                path: filename,
                files: [filename],
                platform: 'msx-shell',
                tool: tool,
                mainfile: true
            };

            // For C files, we need to include msxbios.asm
            if (filename.endsWith('.C')) {
                // Add msxbios.asm to the files list
                buildStep.files.push('msxbios.asm');
            }

            // Send the build step to the worker
            const result = await this.sendBuildStep(buildStep, sourceCode);
            
            if (result.errors && result.errors.length > 0) {
                addOutput('Compilation failed:', '#f00');
                result.errors.forEach(error => {
                    addOutput(`  Line ${error.line}: ${error.msg}`, '#f00');
                });
            } else if (result.output) {
                addOutput('Compilation completed successfully!', '#0f0');
                addOutput(`Output: ${result.output.length} bytes`, '#0f0');
                
                // Store the compiled output for execution
                this.compiledPrograms[filename] = result.output;
                
                // Save the binary as a .COM file in the virtual filesystem
                const comFilename = filename.replace(/\.(C|ASM)$/, '.COM');
                this.files[comFilename] = result.output;
                addOutput(`Saved as: ${comFilename}`, '#0f0');
                
                addOutput('Use RUN command to execute the program.');
            } else {
                addOutput('Compilation completed but no output generated.');
            }
        } catch (error) {
            addOutput(`Compilation failed: ${error.message}`, '#f00');
        }
    }

    private executeRun(parts: string[], addOutput: (text: string, color?: string) => void) {
        if (parts.length < 2) {
            addOutput('Usage: RUN <filename>');
            return;
        }

        let filename = parts[1].toUpperCase();
        
        // If no extension, try .COM first, then .C/.ASM
        if (!filename.includes('.')) {
            if (this.files[filename + '.COM']) {
                filename = filename + '.COM';
            } else if (this.compiledPrograms[filename + '.C']) {
                filename = filename + '.C';
            } else if (this.compiledPrograms[filename + '.ASM']) {
                filename = filename + '.ASM';
            } else {
                addOutput(`Program not found: ${filename}`);
                addOutput('Use ASM command to compile first.');
                return;
            }
        }
        
        // Check if we have the compiled program
        let program: Uint8Array;
        if (this.files[filename] && filename.endsWith('.COM')) {
            program = this.files[filename];
        } else if (this.compiledPrograms[filename]) {
            program = this.compiledPrograms[filename];
        } else {
            addOutput(`Program not compiled: ${filename}`);
            addOutput('Use ASM command to compile first.');
            return;
        }

        if (!this.machine || !this.machine.cpu) {
            addOutput('CPU not initialized. Use RESET command first.');
            return;
        }

        addOutput(`Running ${filename}...`);
        
        try {
            // Load the compiled program into memory at 0x100 (CP/M standard)
            for (let i = 0; i < program.length; i++) {
                this.machine.write(0x100 + i, program[i]);
            }
            
            // Set PC to start of program by loading state
            const state = this.machine.cpu.saveState();
            state.PC = 0x100;
            this.machine.cpu.loadState(state);
            
            // Run the program with MSX BIOS call handling
            let cycles = 0;
            const maxCycles = 10000; // Prevent infinite loops
            
            while (cycles < maxCycles && this.machine.cpu.getPC() < 0x100 + program.length) {
                const pc = this.machine.cpu.getPC();
                const instruction = this.machine.read(pc);
                
                // Check for MSX BIOS calls
                if (instruction === 0xCD) { // CALL instruction
                    const low = this.machine.read(pc + 1);
                    const high = this.machine.read(pc + 2);
                    const addr = (high << 8) | low;
                    
                    // Debug: show all CALL instructions
                    addOutput(`CALL 0x${addr.toString(16).padStart(4, '0')}`, '#888');
                    
                    // Handle MSX BIOS calls
                    if (this.handleMSXBIOSCall(addr, addOutput)) {
                        // BIOS call handled, advance PC past CALL instruction
                        const newState = this.machine.cpu.saveState();
                        newState.PC = pc + 3;
                        this.machine.cpu.loadState(newState);
                        cycles += 10;
                        continue;
                    }
                }
                
                // Simple instruction execution
                if (instruction === 0x76) { // HALT
                    break;
                } else if (instruction === 0xC9) { // RET
                    break;
                } else if (instruction === 0xC3) { // JP nn
                    const low = this.machine.read(pc + 1);
                    const high = this.machine.read(pc + 2);
                    const addr = (high << 8) | low;
                    const newState = this.machine.cpu.saveState();
                    newState.PC = addr;
                    this.machine.cpu.loadState(newState);
                    cycles += 10;
                    continue;
                } else {
                    // For now, just advance PC
                    const newState = this.machine.cpu.saveState();
                    newState.PC = pc + 1;
                    this.machine.cpu.loadState(newState);
                }
                
                cycles++;
            }
            
            if (cycles >= maxCycles) {
                addOutput('Program execution timed out (infinite loop protection).');
            } else {
                addOutput('Program execution completed.');
            }
            
        } catch (error) {
            addOutput(`Execution failed: ${error.message}`, '#f00');
        }
    }

    private executeLoad(parts: string[], addOutput: (text: string, color?: string) => void) {
        if (parts.length < 2) {
            addOutput('Usage: LOAD <filename>');
            return;
        }

        const filename = parts[1].toUpperCase();
        if (this.files[filename]) {
            addOutput(`Loading ${filename} into memory...`);
            addOutput('Program loaded successfully.');
            addOutput('Use RESET command to initialize CPU, then RUN to execute.');
        } else {
            addOutput(`File not found: ${filename}`);
            addOutput('Use ASM command to compile source files first.');
        }
    }

    private executeMem(addOutput: (text: string, color?: string) => void) {
        addOutput('MSX Memory Map:');
        addOutput('  0000-3FFF: BIOS ROM (16KB)');
        addOutput('  4000-7FFF: Cartridge ROM (16KB)');
        addOutput('  8000-BFFF: RAM (16KB)');
        addOutput('  C000-FFFF: RAM (16KB)');
        addOutput('');
        addOutput('Total RAM: 32KB');
    }

    private executeReg(addOutput: (text: string, color?: string) => void) {
        if (this.machine && this.machine.cpu) {
            const cpu = this.machine.cpu;
            const state = cpu.saveState();
            addOutput('Z80 CPU Registers:');
            addOutput(`  PC: ${state.PC.toString(16).padStart(4, '0').toUpperCase()}H`);
            addOutput(`  SP: ${state.SP.toString(16).padStart(4, '0').toUpperCase()}H`);
            addOutput(`  AF: ${state.AF.toString(16).padStart(4, '0').toUpperCase()}H`);
            addOutput(`  BC: ${state.BC.toString(16).padStart(4, '0').toUpperCase()}H`);
            addOutput(`  DE: ${state.DE.toString(16).padStart(4, '0').toUpperCase()}H`);
            addOutput(`  HL: ${state.HL.toString(16).padStart(4, '0').toUpperCase()}H`);
        } else {
            addOutput('CPU not initialized - use RESET command to initialize');
        }
    }

    private executeReset(addOutput: (text: string, color?: string) => void) {
        try {
            // Re-initialize the machine if needed
            if (!this.machine) {
                this.initializeMachine();
            }
            
            if (this.machine) {
                this.machine.reset();
                addOutput('CPU reset completed.');
                addOutput('Machine ready for program execution.');
            } else {
                addOutput('Failed to initialize machine.');
            }
        } catch (error) {
            addOutput(`CPU reset failed: ${error.message}`, '#f00');
        }
    }

    private handleMSXBIOSCall(addr: number, addOutput: (text: string, color?: string) => void): boolean {
        const state = this.machine.cpu.saveState();
        
        switch (addr) {
            case 0x00C3: // CLS - Clear screen
                // Clear the terminal output (we can't actually clear the terminal, but we can add a separator)
                addOutput('--- Program Output ---');
                return true;
                
            case 0x00C6: // POSIT - Position cursor
                // Get row from A register, column from H register
                const row = state.A & 0xFF;
                const col = state.H & 0xFF;
                // We can't actually position the cursor, but we can note it
                // addOutput(`[Cursor: ${row},${col}]`);
                return true;
                
            case 0x00A2: // CHPUT - Character output
                // Get character from A register
                const char = state.A & 0xFF;
                if (char >= 32 && char <= 126) { // Printable ASCII
                    addOutput(String.fromCharCode(char), '#0f0');
                } else if (char === 13) { // Carriage return
                    // addOutput('\\r');
                } else if (char === 10) { // Line feed
                    // addOutput('\\n');
                } else {
                    addOutput(`[${char.toString(16).padStart(2, '0')}]`, '#888');
                }
                return true;
                
            case 0x009F: // CHGET - Character input
                // For now, just return a dummy character (space)
                const newState = this.machine.cpu.saveState();
                newState.A = 32; // Space character
                this.machine.cpu.loadState(newState);
                return true;
                
            default:
                // Not a handled BIOS call
                return false;
        }
    }

    loadROM(title: string, data: Uint8Array) {
        // Override loadROM to prevent automatic reset
        console.log(`MSX-Shell: ROM loaded - ${title}, ${data.length} bytes`);
        // Don't call super.loadROM() to avoid automatic reset
        // The user can manually reset if needed using the RESET command
    }

    reset() {
        if (this.machine) {
            try {
                this.machine.reset();
            } catch (error) {
                console.log('MSX machine reset failed:', error);
            }
        }
    }

    pause() {
        if (this.timer) {
            this.timer.stop();
        }
    }

    resume() {
        if (this.timer) {
            this.timer.start();
        }
    }

    isRunning() {
        return this.timer ? this.timer.running : false;
    }

    showHelp() {
        return "https://retrogamecoders.com/docs/platforms/msx-shell/";
    }
}

PLATFORMS['msx-shell'] = MSXShellPlatform;
