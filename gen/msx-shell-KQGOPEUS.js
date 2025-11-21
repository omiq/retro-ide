import{a as p}from"./chunk-D5GXI4TI.js";import"./chunk-NRZ2XMVD.js";import{I as g}from"./chunk-LJINFNAP.js";import{H as C}from"./chunk-KXQZZRQB.js";import"./chunk-WAARL7ET.js";var S=[{id:"helloworld.asm",name:"Hello World (Z80 ASM)",category:"Assembly Tutorial"},{id:"helloworld.c",name:"Hello World (C)",category:"C Programming"},{id:"console_demo.c",name:"Console I/O Demo (C)",category:"C Programming"},{id:"graphics_demo.c",name:"Graphics Demo (C)",category:"C Programming"},{id:"sound_demo.c",name:"Sound Demo (C)",category:"C Programming"},{id:"game_demo.c",name:"Game Demo (C)",category:"C Programming"}],x=class extends g{constructor(e){super(e);this.commandHistory=[];this.historyIndex=-1;this.currentDirectory="A:";this.files={};this.compiledPrograms={};this.getMemoryMap=function(){return{main:[{name:"BIOS",start:0,size:16384,type:"rom"},{name:"RAM",start:49152,size:12800,type:"ram"},{name:"Stack",start:61440,size:768,type:"ram"},{name:"BIOS Work RAM",start:62208,size:3328}]}};this.setupVirtualFileSystem()}newMachine(){return new p}getPresets(){return S}getDefaultExtension(){return".c"}readAddress(e){return this.machine.read(e)}readVRAMAddress(e){return this.machine.readVRAMAddress(e)}async start(){this.createCommandInterface(),this.initializeMachine(),this.startCommandShell()}initializeMachine(){try{this.machine=this.newMachine(),console.log("MSX machine initialized successfully")}catch(e){console.log("MSX machine initialization failed:",e)}}createCommandInterface(){this.mainElement.innerHTML="",this.mainElement.style.overflowY="auto";let e=document.createElement("div");e.id="msx-shell-terminal",e.style.cssText=`
            background: #000;
            color: #0f0;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            padding: 10px;
            height: 100%;
            overflow-y: auto;
            white-space: pre-wrap;
        `;let i=document.createElement("div");i.style.cssText=`
            display: flex;
            align-items: center;
            margin-top: 5px;
        `;let t=document.createElement("span");t.className="prompt",t.textContent=`${this.currentDirectory}> `,t.style.color="#0f0";let r=document.createElement("input");r.type="text",r.style.cssText=`
            background: transparent;
            border: none;
            color: #0f0;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            outline: none;
            flex: 1;
            margin-left: 5px;
        `,i.appendChild(t),i.appendChild(r),e.appendChild(i),this.mainElement.appendChild(e),this.setupInputHandling(r,e)}setupInputHandling(e,i){let t=(r,n)=>{let s=document.createElement("div");s.textContent=r,n&&(s.style.color=n),i.insertBefore(s,i.lastElementChild),i.scrollTop=i.scrollHeight};e.addEventListener("keydown",r=>{if(r.key==="Enter"){let n=e.value.trim();if(n){this.commandHistory.push(n),this.historyIndex=this.commandHistory.length,e.value="",t(`${this.currentDirectory}> ${n}`);let s=n.trim().split(/\s+/),l=s[0].toLowerCase();switch(l){case"dir":case"ls":this.executeDir(s,t);break;case"type":case"cat":this.executeType(s,t);break;case"del":case"rm":this.executeDel(s,t);break;case"copy":case"cp":this.executeCopy(s,t);break;case"ren":case"mv":this.executeRen(s,t);break;case"cd":this.executeCd(s,t);break;case"cls":case"clear":i.innerHTML="",i.appendChild(e.parentElement);break;case"help":this.executeHelp(t);break;case"asm":this.executeAsm(s,t);break;case"run":this.executeRun(s,t);break;case"mem":this.executeMem(t);break;case"reg":this.executeReg(t);break;case"reset":this.executeReset(t);break;case"load":this.executeLoad(s,t);break;case"exit":case"quit":t("Goodbye!","#ff0");break;case"":break;default:this.isExecutableFile(l,s)?this.executeRun(s,t):(t(`Bad command or file name: ${l}`,"#f00"),t("Type HELP for available commands.","#ff0"))}}}else r.key==="ArrowUp"?(r.preventDefault(),this.historyIndex>0&&(this.historyIndex--,e.value=this.commandHistory[this.historyIndex])):r.key==="ArrowDown"&&(r.preventDefault(),this.historyIndex<this.commandHistory.length-1?(this.historyIndex++,e.value=this.commandHistory[this.historyIndex]):(this.historyIndex=this.commandHistory.length,e.value=""))}),e.focus(),setTimeout(()=>{let r=this.mainElement.querySelector("#msx-shell-terminal");if(r){let n=document.createElement("div");n.innerHTML=`
MSX Development Shell
RetroGameCoders.com 2025
Full MSX Emulation with BIOS Support

Type HELP for available commands.
Type ASM to assemble current editor content.
Type RUN to execute programs.

`,n.style.color="#0f0",r.insertBefore(n,r.lastElementChild)}},100)}setupVirtualFileSystem(){this.files["HELLO.C"]=new TextEncoder().encode(`#include <stdio.h>
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
}`),this.files["CONSOLE.C"]=new TextEncoder().encode(`#include <stdio.h>
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
}`),this.files["MSXBIOS.ASM"]=new TextEncoder().encode(`; MSX BIOS function implementations for C programs
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
        ret`)}async sendBuildStep(e,i){let t=window.worker;if(!t)throw new Error("Global worker not available");let r=[{path:e.path,data:new TextDecoder().decode(i)}];e.path.endsWith(".C")&&this.files["MSXBIOS.ASM"]&&r.push({path:"msxbios.asm",data:new TextDecoder().decode(this.files["MSXBIOS.ASM"])});let n={updates:r,buildsteps:[e]};return new Promise((s,l)=>{let o=t.onmessage,c=!1;t.onmessage=a=>{o&&o.call(t,a),!c&&a.data&&(a.data.output||a.data.errors)&&(c=!0,t.onmessage=o,s(a.data))},t.onerror=a=>{c||(c=!0,t.onmessage=o,l(a))},setTimeout(()=>{c||(c=!0,t.onmessage=o,l(new Error("Assembly timeout")))},1e4),t.postMessage(n)})}startCommandShell(){}executeDir(e,i){let t=Object.keys(this.files);if(t.length===0){i("No files found.");return}i("Directory of A:\\"),i(""),t.forEach(r=>{let n=this.files[r].length;i(`${r.padEnd(12)} ${n.toString().padStart(8)} bytes`)}),i(`${t.length} file(s)`)}executeType(e,i){if(e.length<2){i("Usage: TYPE <filename>");return}let t=e[1].toUpperCase();if(this.files[t]){let r=new TextDecoder().decode(this.files[t]);i(`Contents of ${t}:`),i(""),i(r)}else i(`File not found: ${t}`)}executeDel(e,i){if(e.length<2){i("Usage: DEL <filename>");return}let t=e[1].toUpperCase();this.files[t]?(delete this.files[t],i(`File deleted: ${t}`)):i(`File not found: ${t}`)}executeCopy(e,i){if(e.length<3){i("Usage: COPY <source> <destination>");return}let t=e[1].toUpperCase(),r=e[2].toUpperCase();this.files[t]?(this.files[r]=this.files[t],i(`File copied: ${t} -> ${r}`)):i(`Source file not found: ${t}`)}executeRen(e,i){if(e.length<3){i("Usage: REN <oldname> <newname>");return}let t=e[1].toUpperCase(),r=e[2].toUpperCase();this.files[t]?(this.files[r]=this.files[t],delete this.files[t],i(`File renamed: ${t} -> ${r}`)):i(`File not found: ${t}`)}executeCd(e,i){if(e.length<2){i(`Current directory: ${this.currentDirectory}`);return}let t=e[1].toUpperCase();t==="A:"||t==="B:"||t==="C:"?(this.currentDirectory=t,i(`Current directory is now ${this.currentDirectory}`),this.updatePrompt()):i("Invalid drive. Use A:, B:, or C:")}updatePrompt(){let e=this.mainElement.querySelector(".prompt");e&&(e.textContent=`${this.currentDirectory}> `)}isExecutableFile(e,i){return!!(this.files[e.toUpperCase()+".COM"]||this.compiledPrograms[e.toUpperCase()+".ASM"]||this.compiledPrograms[e.toUpperCase()+".C"]||e.toUpperCase().endsWith(".COM")&&this.files[e.toUpperCase()])}executeHelp(e){e("MSX Development Shell"),e(""),e("File Commands:"),e("  DIR, LS          - List directory"),e("  TYPE <file>      - Display file contents"),e("  DEL <file>       - Delete file"),e("  COPY <src> <dst> - Copy file"),e("  REN <old> <new>  - Rename file"),e("  CD <drive>       - Change drive (A:, B:, C:)"),e("  CLS, CLEAR       - Clear screen"),e("  HELP             - Show this help"),e("  EXIT, QUIT       - Exit interface"),e(""),e("Development Commands:"),e("  ASM              - Assemble current editor content"),e("  ASM <file>       - Assemble specified file"),e("  RUN <file>       - Execute program"),e("  LOAD <file>      - Load compiled program"),e("  MEM              - Show memory map"),e("  REG              - Show CPU registers"),e("  RESET            - Reset CPU"),e(""),e("Examples:"),e("  ASM              - Assemble code in editor"),e("  ASM HELLO.C      - Assemble C file"),e("  RUN HELLO        - Execute program"),e("  HELLO            - Execute program (shortcut)")}async executeAsm(e,i){var n,s;let t,r;if(e.length>=2)if(t=e[1].toUpperCase(),this.files[t])r=this.files[t];else{i(`File not found: ${t}`);return}else{t="CURRENT.C";try{let l=(n=window.IDE)==null?void 0:n.getCurrentProject,o=(s=window.IDE)==null?void 0:s.getCurrentMainFilename;if(l&&o){let c=l(),a=o(),h=c.getFile(a);if(h)r=new TextEncoder().encode(h),t=a.toUpperCase();else{i("No content in current editor");return}}else{i("IDE not available - use ASM <filename>");return}}catch(l){i(`Error getting editor content: ${l.message}`);return}}i(`Compiling ${t}...`);try{let l=t.endsWith(".C")?"sdcc":"zmac",o={path:t,files:[t],platform:"msx-shell",tool:l,mainfile:!0};t.endsWith(".C")&&o.files.push("msxbios.asm");let c=await this.sendBuildStep(o,r);if(c.errors&&c.errors.length>0)i("Compilation failed:","#f00"),c.errors.forEach(a=>{i(`  Line ${a.line}: ${a.msg}`,"#f00")});else if(c.output){i("Compilation completed successfully!","#0f0"),i(`Output: ${c.output.length} bytes`,"#0f0"),this.compiledPrograms[t]=c.output;let a=t.replace(/\.(C|ASM)$/,".COM");this.files[a]=c.output,i(`Saved as: ${a}`,"#0f0"),i("Use RUN command to execute the program.")}else i("Compilation completed but no output generated.")}catch(l){i(`Compilation failed: ${l.message}`,"#f00")}}executeRun(e,i){if(e.length<2){i("Usage: RUN <filename>");return}let t=e[1].toUpperCase();if(!t.includes("."))if(this.files[t+".COM"])t=t+".COM";else if(this.compiledPrograms[t+".C"])t=t+".C";else if(this.compiledPrograms[t+".ASM"])t=t+".ASM";else{i(`Program not found: ${t}`),i("Use ASM command to compile first.");return}let r;if(this.files[t]&&t.endsWith(".COM"))r=this.files[t];else if(this.compiledPrograms[t])r=this.compiledPrograms[t];else{i(`Program not compiled: ${t}`),i("Use ASM command to compile first.");return}if(!this.machine||!this.machine.cpu){i("CPU not initialized. Use RESET command first.");return}i(`Running ${t}...`);try{for(let o=0;o<r.length;o++)this.machine.write(256+o,r[o]);let n=this.machine.cpu.saveState();n.PC=256,this.machine.cpu.loadState(n);let s=0,l=1e4;for(;s<l&&this.machine.cpu.getPC()<256+r.length;){let o=this.machine.cpu.getPC(),c=this.machine.read(o);if(c===205){let a=this.machine.read(o+1),f=this.machine.read(o+2)<<8|a;if(i(`CALL 0x${f.toString(16).padStart(4,"0")}`,"#888"),this.handleMSXBIOSCall(f,i)){let m=this.machine.cpu.saveState();m.PC=o+3,this.machine.cpu.loadState(m),s+=10;continue}}if(c===118)break;if(c===201)break;if(c===195){let a=this.machine.read(o+1),f=this.machine.read(o+2)<<8|a,m=this.machine.cpu.saveState();m.PC=f,this.machine.cpu.loadState(m),s+=10;continue}else{let a=this.machine.cpu.saveState();a.PC=o+1,this.machine.cpu.loadState(a)}s++}s>=l?i("Program execution timed out (infinite loop protection)."):i("Program execution completed.")}catch(n){i(`Execution failed: ${n.message}`,"#f00")}}executeLoad(e,i){if(e.length<2){i("Usage: LOAD <filename>");return}let t=e[1].toUpperCase();this.files[t]?(i(`Loading ${t} into memory...`),i("Program loaded successfully."),i("Use RESET command to initialize CPU, then RUN to execute.")):(i(`File not found: ${t}`),i("Use ASM command to compile source files first."))}executeMem(e){e("MSX Memory Map:"),e("  0000-3FFF: BIOS ROM (16KB)"),e("  4000-7FFF: Cartridge ROM (16KB)"),e("  8000-BFFF: RAM (16KB)"),e("  C000-FFFF: RAM (16KB)"),e(""),e("Total RAM: 32KB")}executeReg(e){if(this.machine&&this.machine.cpu){let t=this.machine.cpu.saveState();e("Z80 CPU Registers:"),e(`  PC: ${t.PC.toString(16).padStart(4,"0").toUpperCase()}H`),e(`  SP: ${t.SP.toString(16).padStart(4,"0").toUpperCase()}H`),e(`  AF: ${t.AF.toString(16).padStart(4,"0").toUpperCase()}H`),e(`  BC: ${t.BC.toString(16).padStart(4,"0").toUpperCase()}H`),e(`  DE: ${t.DE.toString(16).padStart(4,"0").toUpperCase()}H`),e(`  HL: ${t.HL.toString(16).padStart(4,"0").toUpperCase()}H`)}else e("CPU not initialized - use RESET command to initialize")}executeReset(e){try{this.machine||this.initializeMachine(),this.machine?(this.machine.reset(),e("CPU reset completed."),e("Machine ready for program execution.")):e("Failed to initialize machine.")}catch(i){e(`CPU reset failed: ${i.message}`,"#f00")}}handleMSXBIOSCall(e,i){let t=this.machine.cpu.saveState();switch(e){case 195:return i("--- Program Output ---"),!0;case 198:let r=t.A&255,n=t.H&255;return!0;case 162:let s=t.A&255;return s>=32&&s<=126?i(String.fromCharCode(s),"#0f0"):s===13||s===10||i(`[${s.toString(16).padStart(2,"0")}]`,"#888"),!0;case 159:let l=this.machine.cpu.saveState();return l.A=32,this.machine.cpu.loadState(l),!0;default:return!1}}loadROM(e,i){console.log(`MSX-Shell: ROM loaded - ${e}, ${i.length} bytes`)}reset(){if(this.machine)try{this.machine.reset()}catch(e){console.log("MSX machine reset failed:",e)}}pause(){this.timer&&this.timer.stop()}resume(){this.timer&&this.timer.start()}isRunning(){return this.timer?this.timer.running:!1}showHelp(){return"https://retrogamecoders.com/docs/platforms/msx-shell/"}};C["msx-shell"]=x;
//# sourceMappingURL=msx-shell-KQGOPEUS.js.map
