
import { lzgmini } from "../common/util";
import { PLATFORMS } from "../common/emu";
import { Platform } from "../common/baseplatform";
import { stringToByteArray, getWithBinary, loadScript, getRootBasePlatform } from "../common/util";
import { StateRecorderImpl } from "../common/recorder";
import { importPlatform } from "../platform/_index";
import { saveAs } from "file-saver";

export var platform_id : string;	// platform ID string
export var platform : Platform;	// platform object
export var stateRecorder : StateRecorderImpl;

// external libs (TODO)
declare var ga, GIF;

var _qs = (function (a) {
    if (!a || a.length == 0)
        return {};
    var b = {};
    for (var i = 0; i < a.length; ++i) {
        var p = a[i].split('=', 2);
        if (p.length == 1)
            b[p[0]] = "";
        else
            b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
    }
    return b;
})(window.location.search.substr(1).split('&'));

// catch errors
function installErrorHandler() {
  if (typeof window.onerror == "object") {
      window.onerror = function (msgevent, url, line, col, error) {
        var msg = msgevent + " " + url + " " + " " + line + ":" + col + ", " + error;
        $.get("/error?msg=" + encodeURIComponent(msg), "text");
      };
  }
}

function uninstallErrorHandler() {
  window.onerror = null;
}

function addPageFocusHandlers() {
  var hidden = false;
  document.addEventListener("visibilitychange", function(e) {
    if (document.visibilityState == 'hidden' && platform.isRunning()) {
      platform.pause();
      hidden = true;
    } else if (document.visibilityState == 'visible' && hidden) {
      platform.resume();
      hidden = false;
    }
  });
  $(window).on("focus", function() {
    if (hidden) {
      platform.resume();
      hidden = false;
    }
  });
  $(window).on("blur", function() {
    if (platform.isRunning()) {
      platform.pause();
      hidden = true;
    }
  });
}

async function startROM(title, rom) {
  if (!rom ) {
    alert("No ROM found.");
    return;
  }
  console.log(rom.length + ' bytes');
  await platform.loadROM(title, rom);
  platform.resume();
}

function enableRecording() {
  stateRecorder = new StateRecorderImpl(platform);
  stateRecorder.reset();
  stateRecorder.checkpointInterval = 60*5; // every 5 sec
  stateRecorder.maxCheckpoints = 360; // 30 minutes
  platform.setRecorder(stateRecorder);
  console.log('start recording');
}

function findPrimaryCanvas() {
  // Try multiple strategies to find the canvas:
  
  // 1. Try to find canvas by ID (C64 chips and VIC20 chips use id='canvas')
  var canvas = document.getElementById('canvas') as HTMLCanvasElement;
  if (canvas) {
    return $(canvas);
  }
  
  // 2. Look in C64 chips emulator div
  var c64Screen = document.getElementById('c64-chips-screen');
  if (c64Screen) {
    var c64Canvas = c64Screen.querySelector('canvas');
    if (c64Canvas) {
      return $(c64Canvas);
    }
  }
  
  // 3. Look in VIC20 chips emulator div
  var vic20Screen = document.getElementById('vic20-chips-screen');
  if (vic20Screen) {
    var vic20Canvas = vic20Screen.querySelector('canvas');
    if (vic20Canvas) {
      return $(vic20Canvas);
    }
  }
  
  // 4. Look in javatari div
  var javatariScreen = document.getElementById('javatari-screen');
  if (javatariScreen) {
    var javatariCanvas = javatariScreen.querySelector('canvas');
    if (javatariCanvas) {
      return $(javatariCanvas);
    }
  }
  
  // 5. Look in emuscreen (for platforms that add canvas directly)
  var emuscreen = document.getElementById('emuscreen');
  if (emuscreen) {
    var emuscreenCanvas = emuscreen.querySelector('canvas');
    if (emuscreenCanvas) {
      return $(emuscreenCanvas);
    }
  }
  
  // 6. Fallback: search anywhere in emulator div
  return $("#emulator").find('canvas');
}

function recordVideo(intervalMsec, maxFrames, callback) {
 loadScript("gif.js/dist/gif.js").then( () => {
  var canvas = findPrimaryCanvas()[0] as HTMLCanvasElement;
  if (!canvas) {
    alert("Could not find canvas element to record video!");
    return;
  }
  var rotate = 0;
  if (canvas.style && canvas.style.transform) {
    if (canvas.style.transform.indexOf("rotate(-90deg)") >= 0)
      rotate = -1;
    else if (canvas.style.transform.indexOf("rotate(90deg)") >= 0)
      rotate = 1;
  }
  var gif = new GIF({
    workerScript: 'gif.js/dist/gif.worker.js',
    workers: 4,
    quality: 10,
    rotate: rotate
  });
  gif.on('finished', function(blob) {
    console.log('finished encoding GIF');
    callback(blob);
  });
  intervalMsec = intervalMsec || (100 + ((Math.random()*256)&3));
  maxFrames = maxFrames || (100 + ((Math.random()*256)&15));
  var nframes = 0;
  console.log("Recording video", canvas);
  var f = () => {
    if (nframes++ > maxFrames) {
      console.log("Rendering video");
      gif.render();
    } else {
      gif.addFrame(canvas, {delay: intervalMsec, copy: true});
      setTimeout(f, intervalMsec);
    }
  };
  f();
 });
}

async function startPlatform(qs) {
  if (!PLATFORMS[platform_id]) throw Error("Invalid platform '" + platform_id + "'.");
  platform = new PLATFORMS[platform_id]($("#emuscreen")[0]);
  await platform.start();
  // start recorder when click on canvas (TODO?)
  if (qs['rec']) {
    findPrimaryCanvas().on('focus', () => {
      //if (!stateRecorder) { enableRecording(); }
      // toggle sound for browser autoplay
      platform.resume();
    });
  }
  var title = qs['n'] || 'Game';
  var rom : Uint8Array;
  var romurl = qs['url'];
  var lzgvar = qs['r'];
  if (romurl) {
    // load rom url remotely
    console.log(romurl);
    getWithBinary(romurl, (data) => {
      startROM(title, data);
    }, 'arraybuffer');
    return true;
  } else if (lzgvar) {
    // decompress from lzg
    var lzgrom = stringToByteArray(atob(lzgvar));
    var decoded = new lzgmini().decode(lzgrom);
    rom = new Uint8Array(decoded);
  }
  addPageFocusHandlers();
  startROM(title, rom);
  return true;
}

// TODO: merge with ui
async function loadPlatform(qs) {
  if (qs.data) qs = qs.data;
  platform_id = qs['p'];
  if (!platform_id) throw new Error('No platform variable!');
  try {
    var module = await importPlatform(getRootBasePlatform(platform_id));
    console.log("starting platform", platform_id); // loaded required <platform_id>.js file
    await startPlatform(qs);
  } catch (e) {
    console.log(e);
    alert('Platform "' + platform_id + '" not supported.');
  }
}

// start
export function startEmbed() {
  installErrorHandler();
  if (_qs['p']) {
    loadPlatform(_qs);
  }
}

// iframe API

window.addEventListener("message", receiveMessage, false);

function receiveMessage(event) {
  if (event.data) {
    var cmd = event.data.cmd;
    if (cmd == 'start' && !platform) {
      loadPlatform(event);
    }
    else if (cmd == 'reset') {
      platform.reset();
      stateRecorder.reset();
    }
    else if (cmd == 'getReplay') {
      var replay = {
        frameCount: stateRecorder.frameCount,
        checkpoints: stateRecorder.checkpoints,
        framerecs: stateRecorder.framerecs,
        checkpointInterval: stateRecorder.checkpointInterval,
        maxCheckpoints: stateRecorder.maxCheckpoints,
      }
      event.source.postMessage({ack:cmd, replay:replay}, event.origin);
    }
    else if (cmd == 'watchState') {
      var watchfn = new Function('platform', 'state', event.data.fn);
      stateRecorder.callbackNewCheckpoint = (state) => {
        event.source.postMessage({ack:cmd, state:watchfn(platform, state)}, event.origin);
      }
    }
    else if (cmd == 'recordVideo') {
      recordVideo(event.data.intervalMsec, event.data.maxFrames, function(blob) {
        if (event.data.filename) {
          saveAs(blob, event.data.filename);
        }
        event.source.postMessage({ack:cmd, gif:blob}, event.origin);
      });
    }
    else {
      console.log("Unknown data.cmd: " + cmd);
    }
  }
}

/////

// are we not in an iframe?
if(self === top) {
  document.body.style.backgroundColor = '#555';
}
startEmbed();
