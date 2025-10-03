"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const msx_1 = require("../machine/msx");
const baseplatform_1 = require("../common/baseplatform");
const emu_1 = require("../common/emu");
// https://github.com/Konamiman/MSX2-Technical-Handbook
// https://www.msx.org/wiki/MSX_Cartridge_slot
// http://map.grauw.nl/resources/msx_io_ports.php
// https://openmsx.org/manual/setup.html
// https://www.msx.org/wiki/Slots
// https://www.msx.org/wiki/SDCC
// https://github.com/gseidler/The-MSX-Red-Book/blob/master/the_msx_red_book.md
var MSX_BIOS_PRESETS = [
    { id: 'helloworld.asm', name: 'Hello World (ASM)' },
    { id: 'redbook_kbd.asm', name: 'Redbook Keyboard Scanner (ASM)' },
    { id: 'siegegame.c', name: 'Siege Game' },
    { id: 'eliza.c', name: 'Eliza' },
    { id: 'hello.wiz', name: 'Hello (Wiz)' },
];
// TODO: share with coleco, sms
var LIBCV_PRESETS = [
    { id: 'text.c', name: 'Text Mode' },
    { id: 'hello.c', name: 'Scrolling Text' },
    { id: 'text32.c', name: '32-Column Color Text' },
    { id: 'stars.c', name: 'Scrolling Starfield' },
    { id: 'cursorsmooth.c', name: 'Moving Cursor' },
    { id: 'simplemusic.c', name: 'Simple Music' },
    { id: 'musicplayer.c', name: 'Multivoice Music' },
    { id: 'mode2bitmap.c', name: 'Mode 2 Bitmap' },
    { id: 'mode2compressed.c', name: 'Mode 2 Bitmap (LZG)' },
    { id: 'lines.c', name: 'Mode 2 Lines' },
    { id: 'multicolor.c', name: 'Multicolor Mode' },
    { id: 'siegegame.c', name: 'Siege Game' },
    { id: 'shoot.c', name: 'Solarian Game' },
    { id: 'climber.c', name: 'Climber Game' },
];
class MSXPlatform extends baseplatform_1.BaseZ80MachinePlatform {
    constructor() {
        super(...arguments);
        this.getMemoryMap = function () {
            return { main: [
                    { name: 'BIOS', start: 0x0, size: 0x4000, type: 'rom' },
                    //{name:'Cartridge',start:0x4000,size:0x4000,type:'rom'},
                    { name: 'RAM', start: 0xc000, size: 0x3200, type: 'ram' },
                    { name: 'Stack', start: 0xf000, size: 0x300, type: 'ram' },
                    { name: 'BIOS Work RAM', start: 0xf300, size: 0xd00 },
                ] };
        };
    }
    newMachine() { return new msx_1.MSX1(); }
    getPresets() { return MSX_BIOS_PRESETS; }
    getDefaultExtension() { return ".c"; }
    ;
    readAddress(a) { return this.machine.read(a); }
    readVRAMAddress(a) { return this.machine.readVRAMAddress(a); }
}
class MSXLibCVPlatform extends MSXPlatform {
    getPresets() { return LIBCV_PRESETS; }
}
emu_1.PLATFORMS['msx'] = MSXPlatform;
emu_1.PLATFORMS['msx-libcv'] = MSXLibCVPlatform;
//# sourceMappingURL=msx.js.map