
import { getRootBasePlatform } from "../../common/util";
import { CodeListingMap, WorkerError } from "../../common/workertypes";
import { BuildStep, BuildStepResult, gatherFiles, staleFiles, populateFiles, fixParamsWithDefines, putWorkFile, populateExtraFiles, store, populateEntry, anyTargetChanged, processEmbedDirective } from "../builder";
import { re_crlf, makeErrorMatcher } from "../listingutils";
import { loadNative, moduleInstFn, print_fn, setupFS, execMain, emglobal, EmscriptenModule } from "../wasmutils";
import { TOOL_PRELOADFS } from "../workertools";


/*
000000r 1               .segment        "CODE"
000000r 1               .proc	_rasterWait: near
000000r 1               ; int main() { return mul2(2); }
000000r 1                       .dbg    line, "main.c", 3
000014r 1                      	.dbg	  func, "main", "00", extern, "_main"
000000r 1  A2 00                ldx     #$00
00B700  1               BOOT2:
00B700  1  A2 01         ldx #1 ;track
00B725  1  00           IBLASTDRVN: .byte 0
00B726  1  xx xx        IBSECSZ: .res 2
00BA2F  1  2A 2B E8 2C   HEX "2A2BE82C2D2E2F303132F0F133343536"
*/
function parseCA65Listing(asmfn: string, code: string, symbols, segments, params, dbg: boolean, listings?: CodeListingMap) {
    var segofs = 0;
    var offset = 0;
    var dbgLineMatch = /^([0-9A-F]+)([r]?)\s+(\d+)\s+[.]dbg\s+(\w+), "([^"]+)", (.+)/;
    var funcLineMatch = /"(\w+)", (\w+), "(\w+)"/;
    var insnLineMatch = /^([0-9A-F]+)([r]?)\s{1,2}(\d+)\s{1,2}([0-9A-Frx ]{11})\s+(.*)/;
    var segMatch = /[.]segment\s+"(\w+)"/i;
    var origlines = [];
    var lines = origlines;
    var linenum = 0;
    let curpath = asmfn || '';
    // TODO: only does .c functions, not all .s files
    for (var line of code.split(re_crlf)) {
        var dbgm = dbgLineMatch.exec(line);
        if (dbgm && dbgm[1]) {
            var dbgtype = dbgm[4];
            offset = parseInt(dbgm[1], 16);
            curpath = dbgm[5];
            // new file?
            if (curpath && listings) {
                let l = listings[curpath];
                if (!l) l = listings[curpath] = {lines:[]};
                lines = l.lines;
            }
            if (dbgtype == 'func') {
                var funcm = funcLineMatch.exec(dbgm[6]);
                if (funcm) {
                    var funcofs = symbols[funcm[3]];
                    if (typeof funcofs === 'number') {
                        segofs = funcofs - offset;
                        //console.log(funcm[3], funcofs, '-', offset);
                    }
                }
            }
        }
        if (dbg && dbgm && dbgtype == 'line') {
            //console.log(dbgm[5], dbgm[6], offset, segofs);
            lines.push({
                path: dbgm[5],
                line: parseInt(dbgm[6]),
                offset: offset + segofs,
                insns: null
            });
        }
        let linem = insnLineMatch.exec(line);
        let topfile = linem && linem[3] == '1';
        if (topfile) {
            let insns = linem[4]?.trim() || '';
            // skip extra insns for macro expansions
            if (!(insns != '' && linem[5] == '')) {
                linenum++;
            }
            if (linem[1]) {
                var offset = parseInt(linem[1], 16);
                if (insns.length) {
                    //console.log(dbg, curpath, linenum, offset, segofs, insns);
                    if (!dbg) {
                        lines.push({
                            path: curpath,
                            line: linenum,
                            offset: offset + segofs,
                            insns: insns,
                            iscode: true // TODO: can't really tell unless we parse it
                        });
                    }
                } else {
                    var sym = null;
                    var label = linem[5];
                    if (label?.endsWith(':')) {
                        sym = label.substring(0, label.length-1);
                    } else if (label?.toLowerCase().startsWith('.proc')) {
                        sym = label.split(' ')[1];
                    }
                    if (sym && !sym.startsWith('@')) {
                        var symofs = symbols[sym];
                        if (typeof symofs === 'number') {
                            segofs = symofs - offset;
                            //console.log(sym, segofs, symofs, '-', offset);
                        }
                    }
                }
            }
        }
    }
    return origlines;
}

export function assembleCA65(step: BuildStep): BuildStepResult {
    // Load the appropriate module for the platform
    var moduleName = step.platform === 'bbc' ? 'ca65-bbc' : 'ca65';
    loadNative(moduleName);
    
    // For BBC platform, also try to load the standard module as fallback
    if (step.platform === 'bbc') {
        loadNative('ca65');
    }
    var errors = [];
    
    // Check ca65 version first
    console.log("=== CA65 VERSION CHECK ===");
    var CA65_VERSION: EmscriptenModule = emglobal.ca65({
        instantiateWasm: moduleInstFn('ca65'),
        noInitialRun: true,
        print: (s) => console.log("ca65 version:", s),
        printErr: (s) => console.log("ca65 version error:", s),
    });
    var FS_VERSION = CA65_VERSION.FS;
    setupFS(FS_VERSION, '65-' + getRootBasePlatform(step.platform));
    
    // Create a simple version check step
    var versionStep = {
        path: 'version_check',
        mainfile: false,
        platform: step.platform,
        tool: 'ca65',
        args: [],
        input: '',
        output: '',
        defines: [],
        includes: [],
        extraFiles: [],
        params: {},
        prefix: 'version_check'
    };
    
    execMain(versionStep, CA65_VERSION, ['--version']);
    console.log("=== END CA65 VERSION CHECK ===");
    
    gatherFiles(step, { mainFilePath: "main.s" });
    var objpath = step.prefix + ".o";
    var lstpath = step.prefix + ".lst";
    if (staleFiles(step, [objpath, lstpath])) {
        var objout, lstout;
        // Use BBC-specific WASM modules for BBC platform
        var moduleName = step.platform === 'bbc' ? 'ca65-bbc' : 'ca65';
        
        // Try to use the specific module, fallback to standard if not available
        var moduleFunc = emglobal[moduleName];
        if (!moduleFunc) {
            console.log("BBC-specific module not available, falling back to standard ca65");
            moduleName = 'ca65';
            moduleFunc = emglobal.ca65;
        }
        
        var CA65: EmscriptenModule = moduleFunc({
            instantiateWasm: moduleInstFn(moduleName),
            noInitialRun: true,
            //logReadFiles:true,
            print: print_fn,
            printErr: function(s) {
                // Filter out warnings about deprecated symbols
                if (s.includes("Warning:") && s.includes("deprecated")) {
                    return; // Ignore deprecation warnings
                }
                // Use the normal error matcher for everything else
                var matches = /(.+?):(\d+): (.+)/.exec(s);
                if (matches) {
                    errors.push({
                        line: parseInt(matches[2]) || 1,
                        msg: matches[3],
                        path: matches[1]
                    });
                } else {
                    console.log("??? " + s);
                }
            },
        });
        var FS = CA65.FS;
        // Use TOOL_PRELOADFS mapping to determine filesystem
        var fsName = TOOL_PRELOADFS['ca65-' + getRootBasePlatform(step.platform)];
        if (!fsName) {
            fsName = TOOL_PRELOADFS['65-' + getRootBasePlatform(step.platform)];
        }
        if (!fsName) {
            fsName = '65-' + getRootBasePlatform(step.platform); // fallback
        }
        setupFS(FS, fsName);
        populateFiles(step, FS);
        populateExtraFiles(step, FS, step.params.extra_compile_files);
        fixParamsWithDefines(step.path, step.params);
        var args = ['-v', '-g', '-I', '/share/asminc', '-o', objpath, '-l', lstpath, step.path];
        args.unshift.apply(args, ["-D", "__8BITWORKSHOP__=1"]);
        if (step.mainfile) {
            args.unshift.apply(args, ["-D", "__MAIN__=1"]);
        }
        execMain(step, CA65, args);
        if (errors.length) {
            let listings : CodeListingMap = {};
            // TODO? change extension to .lst
            //listings[step.path] = { lines:[], text:getWorkFileAsString(step.path) };
            return { errors, listings };
        }
        objout = FS.readFile(objpath, { encoding: 'binary' });
        lstout = FS.readFile(lstpath, { encoding: 'utf8' });
        putWorkFile(objpath, objout);
        putWorkFile(lstpath, lstout);
    }
    return {
        linktool: "ld65",
        files: [objpath, lstpath],
        args: [objpath]
    };
}

export function linkLD65(step: BuildStep): BuildStepResult {
    // Load the appropriate module for the platform
    var moduleName = step.platform === 'bbc' ? 'ld65-bbc' : 'ld65';
    loadNative(moduleName);
    
    // For BBC platform, also try to load the standard module as fallback
    if (step.platform === 'bbc') {
        loadNative('ld65');
    }
    var params = step.params;
    gatherFiles(step);
    var binpath = "main";
    if (staleFiles(step, [binpath])) {
        var errors = [];
        // Use BBC-specific WASM modules for BBC platform
        var moduleName = step.platform === 'bbc' ? 'ld65-bbc' : 'ld65';
        
        // Try to use the specific module, fallback to standard if not available
        var moduleFunc = emglobal[moduleName];
        if (!moduleFunc) {
            console.log("BBC-specific module not available, falling back to standard ld65");
            moduleName = 'ld65';
            moduleFunc = emglobal.ld65;
        }
        
        var LD65: EmscriptenModule = moduleFunc({
            instantiateWasm: moduleInstFn(moduleName),
            noInitialRun: true,
            //logReadFiles:true,
            print: print_fn,
            printErr: function (s) { 
                // Filter out warnings about deprecated symbols
                if (s.includes("Warning:") && s.includes("deprecated")) {
                    return; // Ignore deprecation warnings
                }
                errors.push({ msg: s, line: 0 }); 
            }
        });
        var FS = LD65.FS;
        // Use TOOL_PRELOADFS mapping to determine filesystem
        var fsName = TOOL_PRELOADFS['ld65-' + getRootBasePlatform(step.platform)];
        if (!fsName) {
            fsName = TOOL_PRELOADFS['65-' + getRootBasePlatform(step.platform)];
        }
        if (!fsName) {
            fsName = '65-' + getRootBasePlatform(step.platform); // fallback
        }
        setupFS(FS, fsName);
        populateFiles(step, FS);
        populateExtraFiles(step, FS, params.extra_link_files);
        // populate .cfg file, if it is a custom one
        if (store.hasFile(params.cfgfile)) {
            populateEntry(FS, params.cfgfile, store.getFileEntry(params.cfgfile), null);
        }
        var libargs = params.libargs || [];
        var cfgfile = params.cfgfile;
        var args = ['--cfg-path', '/share/cfg',
            '--lib-path', '/share/lib',
            '-C', cfgfile,
            '-Ln', 'main.vice',
            //'--dbgfile', 'main.dbg', // TODO: get proper line numbers
            '-o', 'main',
            '-m', 'main.map'].concat(step.args, libargs);
        
        // Add extra_link_args if specified
        if (params.extra_link_args) {
            args = args.concat(params.extra_link_args);
        }
        execMain(step, LD65, args);
        if (errors.length)
            return { errors: errors };
        var aout = FS.readFile("main", { encoding: 'binary' });
        var mapout = FS.readFile("main.map", { encoding: 'utf8' });
        var viceout = FS.readFile("main.vice", { encoding: 'utf8' });
        // correct binary for PCEngine
        if (step.platform == 'pce' && aout.length > 0x2000) {
            // move 8 KB from end to front
            let newrom = new Uint8Array(aout.length);
            newrom.set(aout.slice(aout.length - 0x2000), 0);
            newrom.set(aout.slice(0, aout.length - 0x2000), 0x2000);
            aout = newrom;
        }
        //var dbgout = FS.readFile("main.dbg", {encoding:'utf8'});
        putWorkFile("main", aout);
        putWorkFile("main.map", mapout);
        putWorkFile("main.vice", viceout);
        // return unchanged if no files changed
        if (!anyTargetChanged(step, ["main", "main.map", "main.vice"]))
            return;
        // parse symbol map (TODO: omit segments, constants)
        var symbolmap = {};
        for (var s of viceout.split("\n")) {
            var toks = s.split(" ");
            if (toks[0] == 'al') {
                let ident = toks[2].substr(1);
                if (ident.length != 5 || !ident.startsWith('L')) { // no line numbers
                    let ofs = parseInt(toks[1], 16);
                    symbolmap[ident] = ofs;
                }
            }
        }
        var segments = [];
        // TODO: CHR, banks, etc
        let re_seglist = /(\w+)\s+([0-9A-F]+)\s+([0-9A-F]+)\s+([0-9A-F]+)\s+([0-9A-F]+)/;
        let parseseglist = false;
        let m;
        for (let s of mapout.split('\n')) {
            if (parseseglist && (m = re_seglist.exec(s))) {
                let seg = m[1];
                let start = parseInt(m[2], 16);
                let size = parseInt(m[4], 16);
                let type = '';
                // TODO: better id of ram/rom
                if (seg.startsWith('CODE') || seg == 'STARTUP' || seg == 'RODATA' || seg.endsWith('ROM')) type = 'rom';
                else if (seg == 'ZP' || seg == 'DATA' || seg == 'BSS' || seg.endsWith('RAM')) type = 'ram';
                segments.push({ name: seg, start, size, type });
            }
            if (s == 'Segment list:') parseseglist = true;
            if (s == '') parseseglist = false;
        }
        // build listings
        var listings: CodeListingMap = {};
        for (var fn of step.files) {
            if (fn.endsWith('.lst')) {
                var lstout = FS.readFile(fn, { encoding: 'utf8' });
                lstout = lstout.split('\n\n')[1] || lstout; // remove header
                putWorkFile(fn, lstout);
                //const asmpath = fn.replace(/\.lst$/, '.ca65'); // TODO! could be .s
                let isECS = step.debuginfo?.systems?.Init != null; // TODO
                if (isECS) {
                    var asmlines = [];
                    var srclines = parseCA65Listing(fn, lstout, symbolmap, segments, params, true, listings);
                    listings[fn] = {
                        lines: [],
                        text: lstout
                    }
                } else {
                    var asmlines = parseCA65Listing(fn, lstout, symbolmap, segments, params, false);
                    var srclines = parseCA65Listing('', lstout, symbolmap, segments, params, true);
                    listings[fn] = {
                        asmlines: srclines.length ? asmlines : null,
                        lines: srclines.length ? srclines : asmlines,
                        text: lstout
                    }
                }
            }
        }
        return {
            output: aout, //.slice(0),
            listings: listings,
            errors: errors,
            symbolmap: symbolmap,
            segments: segments
        };
    }
}

export function compileCC65(step: BuildStep): BuildStepResult {
    // Load the appropriate module for the platform
    var moduleName = step.platform === 'bbc' ? 'cc65-bbc' : 'cc65';
    loadNative(moduleName);
    
    // For BBC platform, also try to load the standard module as fallback
    if (step.platform === 'bbc') {
        loadNative('cc65');
    }
    var params = step.params;
    // stderr
    var re_err1 = /(.*?):(\d+): (.+)/;
    var errors: WorkerError[] = [];
    var errline = 0;
    function match_fn(s) {
        console.log(s);
        var matches = re_err1.exec(s);
        if (matches) {
            errline = parseInt(matches[2]);
            var message = matches[3];
            
            // Check if this is a warning (starts with "Warning:")
            if (message.startsWith("Warning:")) {
                // Log warnings but don't treat them as errors that stop compilation
                console.log("CC65 Warning:", matches[1] + ":" + matches[2] + ":", message);
                return;
            }
            
            // Only add actual errors to the errors array
            errors.push({
                line: errline,
                msg: message,
                path: matches[1]
            });
        }
    }
    
    // Check cc65 version first
    console.log("=== CC65 VERSION CHECK ===");
    // Use BBC-specific WASM modules for BBC platform
    var moduleName = step.platform === 'bbc' ? 'cc65-bbc' : 'cc65';
    console.log("Using module:", moduleName, "Available modules:", Object.keys(emglobal));
    console.log("emglobal contents:", emglobal);
    
    // Try to use the specific module, fallback to standard if not available
    var moduleFunc = emglobal[moduleName];
    console.log("moduleFunc for", moduleName, ":", moduleFunc);
    if (!moduleFunc) {
        console.log("BBC-specific module not available, falling back to standard cc65");
        moduleName = 'cc65';
        moduleFunc = emglobal.cc65;
        console.log("Fallback moduleFunc:", moduleFunc);
    }
    
    var CC65_VERSION: EmscriptenModule = moduleFunc({
        instantiateWasm: moduleInstFn(moduleName),
        noInitialRun: true,
        print: (s) => console.log("cc65 version:", s),
        printErr: (s) => console.log("cc65 version error:", s),
    });
    var FS_VERSION = CC65_VERSION.FS;
    setupFS(FS_VERSION, '65-' + getRootBasePlatform(step.platform));
    
    // Create a simple version check step
    var versionStep = {
        path: 'version_check',
        mainfile: false,
        platform: step.platform,
        tool: 'cc65',
        args: [],
        input: '',
        output: '',
        defines: [],
        includes: [],
        extraFiles: [],
        params: {},
        prefix: 'version_check'
    };
    
    execMain(versionStep, CC65_VERSION, ['--version']);
    console.log("=== END CC65 VERSION CHECK ===");
    gatherFiles(step, { mainFilePath: "main.c" });
    var destpath = step.prefix + '.s';
    if (staleFiles(step, [destpath])) {
        // Use BBC-specific WASM modules for BBC platform
        var moduleName = step.platform === 'bbc' ? 'cc65-bbc' : 'cc65';
        
        // Try to use the specific module, fallback to standard if not available
        var moduleFunc = emglobal[moduleName];
        if (!moduleFunc) {
            console.log("BBC-specific module not available, falling back to standard cc65");
            moduleName = 'cc65';
            moduleFunc = emglobal.cc65;
        }
        
        var CC65: EmscriptenModule = moduleFunc({
            instantiateWasm: moduleInstFn(moduleName),
            noInitialRun: true,
            //logReadFiles:true,
            print: print_fn,
            printErr: match_fn,
        });
        var FS = CC65.FS;
        // Use TOOL_PRELOADFS mapping to determine filesystem
        var fsName = TOOL_PRELOADFS['cc65-' + getRootBasePlatform(step.platform)];
        if (!fsName) {
            fsName = TOOL_PRELOADFS['65-' + getRootBasePlatform(step.platform)];
        }
        if (!fsName) {
            fsName = '65-' + getRootBasePlatform(step.platform); // fallback
        }
        setupFS(FS, fsName);
        populateFiles(step, FS, {
            mainFilePath: step.path,
            processFn: (path, code) => {
                if (typeof code === 'string') {
                    code = processEmbedDirective(code);
                }
                return code;
            }
        });
        fixParamsWithDefines(step.path, params);
        var args = [
            '-I', '/share/include',
            '-I', '.',
            "-D", "__8BITWORKSHOP__",
        ];
        if (params.define) {
            params.define.forEach((x) => args.push('-D' + x));
        }
        if (step.mainfile) {
            args.unshift.apply(args, ["-D", "__MAIN__"]);
        }
        var customArgs = params.extra_compiler_args || ['-T', '-g', '-Oirs', '-Cl'];
        args = args.concat(customArgs);
        args.push(step.path);
        execMain(step, CC65, args);
        if (errors.length)
            return { errors: errors };
        var asmout = FS.readFile(destpath, { encoding: 'utf8' });
        putWorkFile(destpath, asmout);
    }
    return {
        nexttool: "ca65",
        path: destpath,
        args: [destpath],
        files: [destpath],
    };
}

