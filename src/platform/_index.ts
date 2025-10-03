// hard-code platform files for esbuild code-splitting

export function importPlatform(name: string) : Promise<any> {
    switch (name) {
      case "apple2": return import("../platform/apple2");
      case "apple2.mame": return import("../platform/apple2");
      case "arm32": return import("../platform/arm32");
      case "astrocade": return import("../platform/astrocade");
      case "astrocade-bios": return import("../platform/astrocade");
      case "astrocade-arcade": return import("../platform/astrocade");
      case "atari7800": return import("../platform/atari7800");
      case "atari8": return import("../platform/atari8");
      case "atari8-800": return import("../platform/atari8");
      case "atari8-5200": return import("../platform/atari8");
      case "atari8-800.xlmame": return import("../platform/atari8");
      case "atari8-800xl.mame": return import("../platform/atari8");
      case "atari8-5200.mame": return import("../platform/atari8");
      case "basic": return import("../platform/basic");
      case "c64": return import("./c64");
      case "c64.mame": return import("./del_c64");
      case "coleco": return import("../platform/coleco");
      case "coleco.mame": return import("../platform/coleco");
      case "cpc": return import("../platform/cpc");
      case "cpc.6128": return import("../platform/cpc");
      case "cpc.464": return import("../platform/cpc");
      case "cpc.kcc": return import("../platform/cpc");
      case "devel": return import("../platform/devel");
      case "devel-6502": return import("../platform/devel");
      case "exidy": return import("../platform/exidy");
      case "galaxian": return import("../platform/galaxian");
      case "galaxian-scramble": return import("../platform/galaxian");
      case "kim1": return import("../platform/kim1");
      case "markdown": return import("../platform/markdown");
      case "msx": return import("../platform/msx");
      case "msx-libcv": return import("../platform/msx");
      case "msx-cpm": return import("../platform/msx-cpm");
      case "msx-shell": return import("../platform/msx-shell");
      case "mw8080bw": return import("../platform/mw8080bw");
      case "nes": return import("../platform/nes");
      case "nes-asm": return import("../platform/nes");
      case "nes.mame": return import("../platform/nes");
      case "pce": return import("../platform/pce");
      case "sms": return import("../platform/sms");
      case "sms-sg1000-libcv": return import("../platform/sms");
      case "sms-sms-libcv": return import("../platform/sms");
      case "sms-gg-libcv": return import("../platform/sms");
      case "sound_konami": return import("../platform/sound_konami");
      case "sound_williams": return import("../platform/sound_williams");
      case "sound_williams-z80": return import("../platform/sound_williams");
      case "vcs": return import("../platform/vcs");
      case "vcs.mame": return import("../platform/vcs");
      case "vcs.stellerator": return import("../platform/vcs");
      case "vector": return import("../platform/vector");
      case "vector-ataribw": return import("../platform/vector");
      case "vector-ataricolor": return import("../platform/vector");
      case "vector-z80color": return import("../platform/vector");
      case "vectrex": return import("../platform/vectrex");
      case "verilog": return import("../platform/verilog");
      case "verilog-vga": return import("../platform/verilog");
      case "verilog-test": return import("../platform/verilog");
      case "vic20": return import("./vic20");
      case "vicdual": return import("../platform/vicdual");
      case "williams": return import("../platform/williams");
      case "williams.old": return import("../platform/williams");
      case "williams-defender": return import("../platform/williams");
      case "williams-z80": return import("../platform/williams");
      case "x86": return import("../platform/x86");
      case "x86dosbox": 
        console.log("Importing x86dosbox platform...");
        return import("../platform/x86dosbox");
      case "zmachine": return import("../platform/zmachine");
      case "zx": return import("../platform/zx");
      case 'bbc':
      case 'bbc-micro':
      case 'bbc.b':
      case 'bbc.model.b':
        return import('../platform/bbc');
      default: throw new Error(`Platform not recognized: '${name}'`)
    }
  }
  
  