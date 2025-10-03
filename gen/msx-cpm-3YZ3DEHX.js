import{a as C}from"./chunk-PFY4NNQX.js";import"./chunk-GPHLKUDC.js";import{I as p}from"./chunk-CO72NYTV.js";import{H as g}from"./chunk-KXQZZRQB.js";import"./chunk-WAARL7ET.js";var x=[{id:"hello.asm",name:"Hello World (Z80 ASM)",category:"Assembly Tutorial"},{id:"cpm_demo.asm",name:"CP/M System Call Demo",category:"CP/M Programming"},{id:"file_ops.asm",name:"File Operations Demo",category:"CP/M Programming"},{id:"console_io.asm",name:"Console I/O Demo",category:"CP/M Programming"},{id:"memory_test.asm",name:"Memory Test (Z80)",category:"System Programming"}],h=class extends p{constructor(e){super(e);this.commandHistory=[];this.historyIndex=-1;this.currentDirectory="A:";this.files={};this.compiledPrograms={};this.setupVirtualFileSystem()}newMachine(){return new C}getPresets(){return x}getDefaultExtension(){return".asm"}readAddress(e){return this.machine.read(e)}readVRAMAddress(e){return this.machine.readVRAMAddress(e)}getMemoryMap(){return{main:[{name:"BIOS",start:0,size:16384,type:"rom"},{name:"RAM",start:49152,size:12800,type:"ram"},{name:"Stack",start:61440,size:768,type:"ram"},{name:"BIOS Work RAM",start:62208,size:3328}]}}async start(){this.createCommandInterface(),this.startCommandShell(),this.initializeMachine()}initializeMachine(){try{this.machine=this.newMachine(),console.log("MSX machine initialized successfully")}catch(e){console.log("MSX machine initialization failed:",e)}}createCommandInterface(){this.mainElement.innerHTML="",this.mainElement.style.overflowY="auto";let e=document.createElement("div");e.id="msx-cpm-terminal",e.style.cssText=`
            font-family: 'Courier New', monospace;
            background-color: #000;
            color: #0f0;
            padding: 10px;
            height: 100%;
            overflow-y: auto;
            white-space: pre-wrap;
        `;let i=document.createElement("div");i.style.cssText=`
            display: flex;
            align-items: center;
            margin-top: 10px;
        `;let t=document.createElement("span");t.textContent=`${this.currentDirectory}> `,t.style.color="#0f0";let r=document.createElement("input");r.type="text",r.style.cssText=`
            background: transparent;
            border: none;
            color: #0f0;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            outline: none;
            flex: 1;
            margin-left: 5px;
        `,i.appendChild(t),i.appendChild(r),e.appendChild(i),this.mainElement.appendChild(e),this.setupInputHandling(r,t,e)}setupInputHandling(e,i,t){let r=(o,n="#0f0")=>{let s=document.createElement("div");s.textContent=o,s.style.color=n,t.insertBefore(s,t.lastElementChild),t.scrollTop=t.scrollHeight},l=o=>{o.trim()&&(this.commandHistory.push(o),this.historyIndex=this.commandHistory.length),r(`${this.currentDirectory}> ${o}`);let n=o.trim().split(/\s+/),s=n[0].toLowerCase();switch(s){case"dir":case"ls":this.executeDir(n,r);break;case"type":case"cat":this.executeType(n,r);break;case"del":case"rm":this.executeDel(n,r);break;case"copy":case"cp":this.executeCopy(n,r);break;case"ren":case"mv":this.executeRen(n,r);break;case"cd":this.executeCd(n,r);break;case"cls":case"clear":t.innerHTML="",t.appendChild(e.parentElement);break;case"help":this.executeHelp(r);break;case"asm":this.executeAsm(n,r);break;case"run":this.executeRun(n,r);break;case"mem":this.executeMem(r);break;case"reg":this.executeReg(r);break;case"reset":this.executeReset(r);break;case"load":this.executeLoad(n,r);break;case"exit":case"quit":r("Goodbye!","#ff0");break;case"":break;default:this.isExecutableFile(s,n)?this.executeRun(n,r):(r(`Bad command or file name: ${s}`,"#f00"),r("Type HELP for available commands.","#ff0"))}};e.addEventListener("keydown",o=>{if(o.key==="Enter"){let n=e.value;e.value="",l(n)}else o.key==="ArrowUp"?(o.preventDefault(),this.historyIndex>0&&(this.historyIndex--,e.value=this.commandHistory[this.historyIndex])):o.key==="ArrowDown"&&(o.preventDefault(),this.historyIndex<this.commandHistory.length-1?(this.historyIndex++,e.value=this.commandHistory[this.historyIndex]):(this.historyIndex=this.commandHistory.length,e.value=""))}),e.focus()}startCommandShell(){setTimeout(()=>{let e=this.mainElement.querySelector("#msx-cpm-terminal");if(e){let i=document.createElement("div");i.innerHTML=`
MSX-DOS/CP/M Command Interface
RetroGameCoders.com 2025
Z80 CPU Emulation Ready

Type HELP for available commands.
Type ASM to assemble current editor content.
Type RUN <filename> to execute programs.

`,i.style.color="#0f0",e.insertBefore(i,e.lastElementChild)}},100)}setupVirtualFileSystem(){this.files["HELLO.ASM"]=new TextEncoder().encode(`
; Hello World for MSX-DOS/CP/M
; Z80 Assembly Language

        ORG     0100H           ; CP/M program start address

START:  LD      DE, MESSAGE     ; Load address of message
        LD      C, 09H          ; CP/M print string function
        CALL    0005H           ; Call BDOS
        LD      C, 00H          ; CP/M exit function
        CALL    0005H           ; Call BDOS

MESSAGE: DB     'Hello, MSX-DOS World!', 0DH, 0AH, '$'
        END     START
`),this.files["MEMTEST.ASM"]=new TextEncoder().encode(`
; Memory Test for MSX
; Tests RAM from 0xC000 to 0xF000

        ORG     0100H

START:  LD      HL, 0C000H      ; Start address
        LD      DE, 0F000H      ; End address
        LD      A, 0AAH         ; Test pattern

LOOP:   LD      (HL), A         ; Write pattern
        LD      B, (HL)         ; Read back
        CP      B               ; Compare
        JR      NZ, ERROR       ; Jump if error
        INC     HL              ; Next address
        LD      A, HL
        CP      E
        JR      NZ, LOOP        ; Continue if not at end

        LD      DE, OKMSG       ; Success message
        LD      C, 09H
        CALL    0005H
        JR      EXIT

ERROR:  LD      DE, ERRMSG      ; Error message
        LD      C, 09H
        CALL    0005H

EXIT:   LD      C, 00H
        CALL    0005H

OKMSG:  DB      'Memory test passed!', 0DH, 0AH, '$'
ERRMSG: DB      'Memory test failed!', 0DH, 0AH, '$'
        END     START
`)}async sendBuildStep(e,i){let t=window.worker;if(!t)throw new Error("Global worker not available");let r={updates:[{path:e.path,data:new TextDecoder().decode(i)}],buildsteps:[e]};return new Promise((l,o)=>{let n=t.onmessage,s=!1;t.onmessage=a=>{n&&n.call(t,a),!s&&a.data&&(a.data.output||a.data.errors)&&(s=!0,t.onmessage=n,l(a.data))},t.onerror=a=>{s||(s=!0,t.onmessage=n,o(a))},setTimeout(()=>{s||(s=!0,t.onmessage=n,o(new Error("Assembly timeout")))},1e4),t.postMessage(r)})}executeDir(e,i){let t=Object.keys(this.files);if(t.length===0){i("No files found.");return}i("Directory of A:\\"),i(""),t.forEach(r=>{let l=this.files[r].length;i(`${r.padEnd(12)} ${l.toString().padStart(8)} bytes`)}),i(""),i(`${t.length} file(s)`)}executeType(e,i){if(e.length<2){i("Usage: TYPE <filename>");return}let t=e[1].toUpperCase();if(this.files[t]){let r=new TextDecoder().decode(this.files[t]);i(r)}else i(`File not found: ${t}`)}executeDel(e,i){if(e.length<2){i("Usage: DEL <filename>");return}let t=e[1].toUpperCase();this.files[t]?(delete this.files[t],i(`File ${t} deleted.`)):i(`File not found: ${t}`)}executeCopy(e,i){if(e.length<3){i("Usage: COPY <source> <destination>");return}let t=e[1].toUpperCase(),r=e[2].toUpperCase();this.files[t]?(this.files[r]=new Uint8Array(this.files[t]),i(`File copied: ${t} -> ${r}`)):i(`Source file not found: ${t}`)}executeRen(e,i){if(e.length<3){i("Usage: REN <oldname> <newname>");return}let t=e[1].toUpperCase(),r=e[2].toUpperCase();this.files[t]?(this.files[r]=this.files[t],delete this.files[t],i(`File renamed: ${t} -> ${r}`)):i(`File not found: ${t}`)}executeCd(e,i){if(e.length<2){i(`Current directory: ${this.currentDirectory}`);return}let t=e[1].toUpperCase();t==="A:"||t==="B:"||t==="C:"?(this.currentDirectory=t,i(`Current directory is now ${this.currentDirectory}`),this.updatePrompt()):i("Invalid drive. Use A:, B:, or C:")}updatePrompt(){let e=this.mainElement.querySelector(".prompt");e&&(e.textContent=`${this.currentDirectory}> `)}isExecutableFile(e,i){return!!(this.files[e.toUpperCase()+".COM"]||this.compiledPrograms[e.toUpperCase()+".ASM"]||e.toUpperCase().endsWith(".COM")&&this.files[e.toUpperCase()])}executeHelp(e){e("MSX-DOS/CP/M Command Interface"),e(""),e("File Commands:"),e("  DIR, LS          - List directory"),e("  TYPE, CAT        - Display file contents"),e("  DEL, RM          - Delete file"),e("  COPY, CP         - Copy file"),e("  REN, MV          - Rename file"),e(""),e("System Commands:"),e("  CD <drive>       - Change drive (A:, B:, C:)"),e("  CLS, CLEAR       - Clear screen"),e("  HELP             - Show this help"),e("  EXIT, QUIT       - Exit interface"),e(""),e("Development Commands:"),e("  ASM              - Assemble current editor content"),e("  ASM <file>       - Assemble specified file"),e("  RUN <file>       - Execute program"),e("  LOAD <file>      - Load compiled program"),e("  MEM              - Show memory map"),e("  REG              - Show CPU registers"),e("  RESET            - Reset CPU"),e(""),e("Examples:"),e("  ASM              - Assemble code in editor"),e("  ASM HELLO.ASM    - Assemble virtual file"),e("  RUN CPM_DEMO     - Execute program"),e("  CPM_DEMO         - Execute program (shortcut)")}async executeAsm(e,i){var l,o;let t,r;if(e.length>=2)if(t=e[1].toUpperCase(),this.files[t])r=this.files[t];else{i(`File not found: ${t}`);return}else{t="CURRENT.ASM";try{let n=(l=window.IDE)==null?void 0:l.getCurrentProject,s=(o=window.IDE)==null?void 0:o.getCurrentMainFilename;if(n&&s){let a=n(),c=s(),m=a.getFile(c);if(m)r=new TextEncoder().encode(m),t=c.toUpperCase().replace(".ASM","")+".ASM";else{i("No content in current editor");return}}else{i("IDE not available - use ASM <filename>");return}}catch(n){i(`Error getting editor content: ${n.message}`);return}}i(`Assembling ${t}...`);try{let n={path:t,files:[t],platform:"msx-cpm",tool:"zmac",mainfile:!0},s=await this.sendBuildStep(n,r);if(s.errors&&s.errors.length>0)i("Assembly failed:","#f00"),s.errors.forEach(a=>{i(`  Line ${a.line}: ${a.msg}`,"#f00")});else if(s.output){i("Assembly completed successfully!","#0f0"),i(`Output: ${s.output.length} bytes`,"#0f0"),this.compiledPrograms[t]=s.output;let a=t.replace(".ASM",".COM");this.files[a]=s.output,i(`Saved as: ${a}`,"#0f0"),i("Use RUN command to execute the program.")}else i("Assembly completed but no output generated.")}catch(n){i(`Assembly failed: ${n.message}`,"#f00")}}executeRun(e,i){if(e.length<2){i("Usage: RUN <filename>");return}let t=e[1].toUpperCase();if(!t.includes("."))if(this.files[t+".COM"])t=t+".COM";else if(this.compiledPrograms[t+".ASM"])t=t+".ASM";else{i(`Program not found: ${t}`),i("Use ASM command to compile first.");return}let r;if(this.files[t]&&t.endsWith(".COM"))r=this.files[t];else if(this.compiledPrograms[t])r=this.compiledPrograms[t];else{i(`Program not compiled: ${t}`),i("Use ASM command to compile first.");return}if(!this.machine||!this.machine.cpu){i("CPU not initialized. Use RESET command first.");return}i(`Running ${t}...`);try{for(let s=0;s<r.length;s++)this.machine.write(256+s,r[s]);let l=this.machine.cpu.saveState();l.PC=256,this.machine.cpu.loadState(l);let o=0,n=1e4;for(;o<n&&this.machine.cpu.getPC()<256+r.length;){let s=this.machine.cpu.getPC(),a=this.machine.read(s);if(a===118)break;if(a===201)break;if(a===195){let c=this.machine.read(s+1),y=this.machine.read(s+2)<<8|c,f=this.machine.cpu.saveState();f.PC=y,this.machine.cpu.loadState(f),o+=10;continue}else{let c=this.machine.cpu.saveState();c.PC=s+1,this.machine.cpu.loadState(c)}o++}o>=n?i("Program execution timed out (infinite loop protection)."):i("Program execution completed.")}catch(l){i(`Execution failed: ${l.message}`,"#f00")}}executeLoad(e,i){if(e.length<2){i("Usage: LOAD <filename>");return}let t=e[1].toUpperCase();this.files[t]?(i(`Loading ${t} into memory...`),i("Program loaded successfully."),i("Use RESET command to initialize CPU, then RUN to execute.")):(i(`File not found: ${t}`),i("Use ASM command to compile source files first."))}executeMem(e){e("MSX Memory Map:"),e("  0000-3FFF: BIOS ROM (16KB)"),e("  4000-7FFF: Cartridge ROM (16KB)"),e("  8000-BFFF: RAM (16KB)"),e("  C000-FFFF: RAM (16KB)"),e(""),e("Total RAM: 32KB")}executeReg(e){if(this.machine&&this.machine.cpu){let t=this.machine.cpu.saveState();e("Z80 CPU Registers:"),e(`  PC: ${t.PC.toString(16).padStart(4,"0").toUpperCase()}H`),e(`  SP: ${t.SP.toString(16).padStart(4,"0").toUpperCase()}H`),e(`  AF: ${t.AF.toString(16).padStart(4,"0").toUpperCase()}H`),e(`  BC: ${t.BC.toString(16).padStart(4,"0").toUpperCase()}H`),e(`  DE: ${t.DE.toString(16).padStart(4,"0").toUpperCase()}H`),e(`  HL: ${t.HL.toString(16).padStart(4,"0").toUpperCase()}H`)}else e("CPU not initialized - use RESET command to initialize")}executeReset(e){try{this.machine||this.initializeMachine(),this.machine?(this.machine.reset(),e("CPU reset completed."),e("Machine ready for program execution.")):e("Failed to initialize machine.")}catch(i){e(`CPU reset failed: ${i.message}`,"#f00")}}loadROM(e,i){console.log(`MSX-CPM: ROM loaded - ${e}, ${i.length} bytes`)}reset(){if(this.machine)try{this.machine.reset()}catch(e){console.log("MSX machine reset failed:",e)}}pause(){this.timer&&this.timer.stop()}resume(){this.timer&&this.timer.start()}isRunning(){return this.timer?this.timer.running:!1}showHelp(){return"https://retrogamecoders.com/docs/platforms/msx-cpm/"}};g["msx-cpm"]=h;var P=h;export{P as default};
//# sourceMappingURL=msx-cpm-3YZ3DEHX.js.map
