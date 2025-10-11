
import { Platform, BreakpointCallback, DebugCondition, DebugEvalCondition } from "../common/baseplatform";
import { PLATFORMS, AnimationTimer, EmuHalt } from "../common/emu";
import * as editors from "../ide/views/editors";
import { BASICRuntime } from "../common/basic/runtime";
import { BASICProgram } from "../common/basic/compiler";
import { TeleTypeWithKeyboard } from "../common/teletype";
import { lpad } from "../common/util";
import { FileData } from "../common/workertypes";
import { haltEmulation } from "../ide/ui"; // TODO: make this a callback

const BASIC_PRESETS = [
    { id: '23match.bas', name: '23match' },
    { id: '3dplot.bas', name: '3dplot' },
    { id: 'aceyducey.bas', name: 'aceyducey' },
    { id: 'amazing.bas', name: 'amazing' },
    { id: 'animal.bas', name: 'animal' },
    { id: 'awari.bas', name: 'awari' },
    { id: 'bagels.bas', name: 'bagels' },
    { id: 'banner.bas', name: 'banner' },
    { id: 'basketball.bas', name: 'basketball' },
    { id: 'batnum.bas', name: 'batnum' },
    { id: 'battle.bas', name: 'battle' },
    { id: 'blackjack.bas', name: 'blackjack' },
    { id: 'bombardment.bas', name: 'bombardment' },
    { id: 'bombsaway.bas', name: 'bombsaway' },
    { id: 'bounce.bas', name: 'bounce' },
    { id: 'bowling.bas', name: 'bowling' },
    { id: 'boxing.bas', name: 'boxing' },
    { id: 'bug.bas', name: 'bug' },
    { id: 'bullfight.bas', name: 'bullfight' },
    { id: 'bullseye.bas', name: 'bullseye' },
    { id: 'bunny.bas', name: 'bunny' },
    { id: 'buzzword.bas', name: 'buzzword' },
    { id: 'calendar.bas', name: 'calendar' },
    { id: 'change.bas', name: 'change' },
    { id: 'checkers.bas', name: 'checkers' },
    { id: 'chemist.bas', name: 'chemist' },
    { id: 'chomp.bas', name: 'chomp' },
    { id: 'civilwar.bas', name: 'civilwar' },
    { id: 'combat.bas', name: 'combat' },
    { id: 'craps.bas', name: 'craps' },
    { id: 'cube.bas', name: 'cube' },
    { id: 'depthcharge.bas', name: 'depthcharge' },
    { id: 'diamond.bas', name: 'diamond' },
    { id: 'dice.bas', name: 'dice' },
    { id: 'digits.bas', name: 'digits' },
    { id: 'evenwins.bas', name: 'evenwins' },
    { id: 'flipflop.bas', name: 'flipflop' },
    { id: 'football.bas', name: 'football' },
    { id: 'ftball.bas', name: 'ftball' },
    { id: 'furtrader.bas', name: 'furtrader' },
    { id: 'gameofevenwins.bas', name: 'gameofevenwins' },
    { id: 'golf.bas', name: 'golf' },
    { id: 'gomoko.bas', name: 'gomoko' },
    { id: 'guess.bas', name: 'guess' },
    { id: 'gunner.bas', name: 'gunner' },
    { id: 'hammurabi.bas', name: 'hammurabi' },
    { id: 'hangman.bas', name: 'hangman' },
    { id: 'haunted.bas', name: 'haunted' },
    { id: 'hello.bas', name: 'hello' },
    { id: 'hexapawn.bas', name: 'hexapawn' },
    { id: 'hi-lo.bas', name: 'hi-lo' },
    { id: 'highiq.bas', name: 'highiq' },
    { id: 'hockey.bas', name: 'hockey' },
    { id: 'horserace.bas', name: 'horserace' },
    { id: 'hurkle.bas', name: 'hurkle' },
    { id: 'kinema.bas', name: 'kinema' },
    { id: 'king.bas', name: 'king' },
    { id: 'lander.bas', name: 'lander' },
    { id: 'lem.bas', name: 'lem' },
    { id: 'letter.bas', name: 'letter' },
    { id: 'life.bas', name: 'life' },
    { id: 'litquiz.bas', name: 'litquiz' },
    { id: 'love.bas', name: 'love' },
    { id: 'lunar.bas', name: 'lunar' },
    { id: 'mastermind.bas', name: 'mastermind' },
    { id: 'mathdice.bas', name: 'mathdice' },
    { id: 'mortgage.bas', name: 'mortgage' },
    { id: 'mugwump.bas', name: 'mugwump' },
    { id: 'name.bas', name: 'name' },
    { id: 'nicomachus.bas', name: 'nicomachus' },
    { id: 'nim.bas', name: 'nim' },
    { id: 'number.bas', name: 'number' },
    { id: 'onecheck.bas', name: 'onecheck' },
    { id: 'orbit.bas', name: 'orbit' },
    { id: 'pizza.bas', name: 'pizza' },
    { id: 'poetry.bas', name: 'poetry' },
    { id: 'poker.bas', name: 'poker' },
    { id: 'qubit.bas', name: 'qubit' },
    { id: 'queen.bas', name: 'queen' },
    { id: 'reverse.bas', name: 'reverse' },
    { id: 'rocket.bas', name: 'rocket' },
    { id: 'rockscissors.bas', name: 'rockscissors' },
    { id: 'roulette.bas', name: 'roulette' },
    { id: 'russianroulette.bas', name: 'russianroulette' },
    { id: 'salvo.bas', name: 'salvo' },
    { id: 'sieve.bas', name: 'sieve' },
    { id: 'sinewave.bas', name: 'sinewave' },
    { id: 'slalom.bas', name: 'slalom' },
    { id: 'slots.bas', name: 'slots' },
    { id: 'splat.bas', name: 'splat' },
    { id: 'stars.bas', name: 'stars' },
    { id: 'startrader.bas', name: 'startrader' },
    { id: 'startrek.bas', name: 'startrek' },
    { id: 'startrekins.bas', name: 'startrekins' },
    { id: 'stockmarket.bas', name: 'stockmarket' },
    { id: 'suite.bas', name: 'suite' },
    { id: 'synonym.bas', name: 'synonym' },
    { id: 'target.bas', name: 'target' },
    { id: 'tictactoe.bas', name: 'tictactoe' },
    { id: 'tower.bas', name: 'tower' },
    { id: 'train.bas', name: 'train' },
    { id: 'trap.bas', name: 'trap' },
    { id: 'tutorial.bas', name: 'tutorial' },
    { id: 'war.bas', name: 'war' },
    { id: 'weekday.bas', name: 'weekday' },
    { id: 'word.bas', name: 'word' },
    { id: 'wumpus.bas', name: 'wumpus' },
];

class BASICPlatform implements Platform {
    mainElement: HTMLElement;
    program: BASICProgram;
    runtime: BASICRuntime;
    clock: number = 0;
    timer: AnimationTimer;
    tty: TeleTypeWithKeyboard;
    hotReload: boolean = true;
    animcount: number = 0;
    internalFiles : {[path:string] : FileData} = {};
    transcript: string[];

    constructor(mainElement: HTMLElement) {
        //super();
        this.mainElement = mainElement;
        mainElement.style.overflowY = 'auto';
    }

    async start() {
        // create runtime
        this.runtime = new BASICRuntime();
        this.runtime.reset();
        // create divs
        var parent = this.mainElement;
        // TODO: input line should be always flush left
        var gameport = $('<div id="gameport" style="margin-top:calc(100vh - 8em)"/>').appendTo(parent);
        var windowport = $('<div id="windowport" class="transcript transcript-style-2"/>').appendTo(gameport);
        var inputport = $('<div id="inputport" class="transcript-bottom"/>').appendTo(gameport);
        var inputline = $('<input class="transcript-input transcript-style-2" type="text" style="max-width:95%"/>').appendTo(inputport);
        //var printhead = $('<div id="printhead" class="transcript-print-head"/>').appendTo(parent);
        //var printshield = $('<div id="printhead" class="transcript-print-shield"/>').appendTo(parent);
        this.tty = new TeleTypeWithKeyboard(windowport[0], true, inputline[0] as HTMLInputElement);
        this.tty.keepinput = true; // input stays @ bottom
        this.tty.splitInput = true; // split into arguments
        this.tty.keephandler = false; // set handler each input
        this.tty.hideinput();
        this.tty.scrolldiv = parent;
        this.tty.bell = new Audio('res/ttybell.mp3');
        this.runtime.input = async (prompt:string, nargs:number) => {
            return new Promise( (resolve, reject) => {
                if (prompt != null) {
                    this.tty.addtext(prompt, 0);
                    this.tty.addtext('? ', 0);
                    this.tty.waitingfor = 'line';
                } else {
                    this.tty.waitingfor = 'char';
                }
                this.tty.focusinput();
                this.tty.resolveInput = resolve;
            });
        }
        this.timer = new AnimationTimer(60, this.animate.bind(this));
        this.resize = () => {
            this.tty.resize(80);
        }
        this.resize();
        this.runtime.print = (s:string) => {
            // TODO: why null sometimes?
            this.animcount = 0; // exit advance loop when printing
            this.tty.print(s);
            this.transcript.push(s);
        }
        this.runtime.resume = this.resume.bind(this);
    }

    animate() {
        if (this.tty.isBusy()) return;
        var ips = this.program.opts.commandsPerSec || 1000;
        this.animcount += ips / 60;
        while (this.runtime.running && this.animcount-- > 0) {
            if (!this.advance())
                break;
        }
    }

    // should not depend on tty state
    advance(novideo?: boolean) : number {
        if (this.runtime.running) {
            if (this.checkDebugTrap())
                return 0;
            var more = this.runtime.step();
            if (!more) {
                this.pause();
                if (this.runtime.exited) {
                    this.exitmsg();
                    this.didExit();
                }
            }
            this.clock++;
            return 1;
        } else {
            return 0;
        }
    }
    
    exitmsg() {
        this.tty.print("\n\n");
        this.tty.addtext("*** END OF PROGRAM ***", 1);
        this.tty.showPrintHead(false);
    }

    resize: () => void;

    loadROM(title, data) {
        // TODO: disable hot reload if error
        // TODO: only hot reload when we hit a label?
        var didExit = this.runtime.exited;
        this.program = data;
        var resumePC = this.runtime.load(data);
        this.tty.uppercaseOnly = true; // this.program.opts.uppercaseOnly; //TODO?
        // map editor to uppercase-only if need be
        editors.textMapFunctions.input = this.program.opts.uppercaseOnly ? (s) => s.toUpperCase() : null;
        // only reset if we exited, or couldn't restart at label (PC reset to 0)
        if (!this.hotReload || didExit || !resumePC)
            this.reset();
    }

    getROMExtension() {
        return ".json";
    }

    reset(): void {
        this.tty.clear();
        this.runtime.reset();
        this.clock = 0;
        this.transcript = [];
    }

    pause(): void {
        this.timer.stop();
    }

    resume(): void {
        if (this.isBlocked()) return;
        this.animcount = 0;
        this.timer.start();
    }

    isBlocked() { return this.tty.waitingfor != null || this.runtime.exited; } // is blocked for input?
    isRunning() { return this.timer.isRunning(); }
    getDefaultExtension() { return ".bas"; }
    getToolForFilename() { return "basic"; }
    getPresets() { return BASIC_PRESETS; }

    getPC() {
        return this.runtime.curpc;
    }
    getSP() {
        return 0x1000 - this.runtime.returnStack.length;
    }
    isStable() {
        return true;
    }    
    getCPUState() {
        return { PC: this.getPC(), SP: this.getSP() }
    }
    saveState() {
        return {
            c: this.getCPUState(),
            rt: this.runtime.saveState(),
        }
    }
    loadState(state) {
        this.runtime.loadState(state);
    }
    getDebugTree() {
        return {
            CurrentLine: this.runtime.getCurrentLabel(),
            Variables: this.runtime.vars,
            Arrays: this.runtime.arrays,
            Functions: this.runtime.defs,
            ForLoops: this.runtime.forLoops,
            WhileLoops: this.runtime.whileLoops,
            ReturnStack: this.runtime.returnStack,
            NextDatum: this.runtime.datums[this.runtime.dataptr],
            Clock: this.clock,
            Options: this.runtime.opts,
            Internals: this.runtime,
        }
    }
    inspect(sym: string) {
        let o = this.runtime.vars[sym];
        if (o != null) return `${sym} = ${o}`;
    }
    showHelp() {
        return "https://8bitworkshop.com/docs/platforms/basic/";
    }

    getDebugCategories() {
        return ['Variables'];
    }
    getDebugInfo(category:string, state) : string {
        switch (category) {
            case 'Variables': return this.varsToLongString();
        }
    }
    varsToLongString() : string {
        var s = '';
        var vars = Object.keys(this.runtime.vars);
        vars.sort();
        for (var name of vars) {
            var value = this.runtime.vars[name];
            var valstr = JSON.stringify(value);
            if (valstr.length > 24) valstr = `${valstr.substr(0,24)}...(${valstr.length})`;
            s += lpad(name,3) + " = " + valstr + "\n";
        }
        return s;
    }
    
    // TODO: debugging (get running state, etc)

    onBreakpointHit : BreakpointCallback;
    debugTrap : DebugCondition;

    setupDebug(callback : BreakpointCallback) : void {
        this.onBreakpointHit = callback;
    }
    clearDebug() {
        this.onBreakpointHit = null;
        this.debugTrap = null;
    }
    checkDebugTrap() : boolean {
        if (this.debugTrap && this.debugTrap()) {
            this.pause();
            this.break();
            return true;
        }
        return false;
    }
    break() {
        // TODO: why doesn't highlight go away on resume?
        if (this.onBreakpointHit) {
            this.onBreakpointHit(this.saveState());
        }
    }
    step() {
        var prevClock = this.clock;
        this.debugTrap = () => {
            return this.clock > prevClock;
        };
        this.resume();
    }
    stepOver() {
        var stmt = this.runtime.getStatement();
        if (stmt && (stmt.command == 'GOSUB' || stmt.command == 'ONGOSUB')) {
            var nextPC = this.getPC() + 1;
            this.runEval(() => this.getPC() == nextPC);
        } else {
            this.step();
        }
    }
    runUntilReturn() {
        var prevSP = this.getSP();
        this.runEval(() => this.getSP() > prevSP);
    }
    runEval(evalfunc : DebugEvalCondition) {
        this.debugTrap = () => evalfunc(this.getCPUState());
        this.resume();
    }
    restartAtPC?(pc:number) : boolean {
        pc = Math.round(pc);
        if (pc >= 0 && pc < this.runtime.allstmts.length) {
            this.runtime.curpc = pc;
            this.tty.cancelinput();
            this.clock = 0;
            return true;
        } else {
            return false;
        }
    }
    readFile(path: string) : FileData {
        return this.internalFiles[path];
    }
    writeFile(path: string, data: FileData) : boolean {
        this.internalFiles[path] = data;
        return true;
    }
    didExit() {
        this.internalFiles['stdout.txt'] = this.transcript.join("");
        haltEmulation();
    }
}

//

PLATFORMS['basic'] = BASICPlatform;
