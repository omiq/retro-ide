# Apple2JS Programmatic API Reference

This document describes how to programmatically access the JavaScript features that are normally triggered by UI buttons in the Apple II emulator.

## Quick Reference

```javascript
// Wait for emulator
const apple2 = window.apple2;
await apple2.ready;

// Basic controls
apple2.reset();           // Reset emulator
apple2.run();             // Start/resume
apple2.stop();            // Pause

// Keyboard input
const io = apple2.getIO();
io.setKeyBuffer("TEXT\r"); // Type text
io.keyDown(0x41);         // Press 'A'

// Load disk
const disk2 = io.getSlot(6);
await loadJSON(disk2, 1, 'json/disks/dos33master.json');

// Screen operations
const vm = apple2.getVideoModes();
vm.mono(true);            // Monochrome
vm.scanlines(true);       // Show scanlines
await copyScreenToClipboard(vm); // Copy screen

// Save/Load state
const state = apple2.getState();
apple2.setState(state);
```

## Global Access

The main emulator instance is exposed globally as `window.apple2`:

```javascript
const apple2 = window.apple2;
```

**Note:** Wait for the emulator to be ready before accessing it. The instance is set after initialization completes.

## Core Emulator Control

### Reset
```javascript
apple2.reset();
```

### Run/Stop
```javascript
apple2.run();      // Start/resume emulation
apple2.stop();     // Pause emulation
apple2.isRunning(); // Returns boolean indicating if running
```

### Get State / Set State (Save/Load)
```javascript
// Save state
const state = apple2.getState();
localStorage.setItem('apple2_state', JSON.stringify(state));

// Load state
const savedState = JSON.parse(localStorage.getItem('apple2_state'));
apple2.setState(savedState);
```

## I/O Operations

### Get I/O Interface
```javascript
const io = apple2.getIO();
```

### Keyboard Input
```javascript
// First, get the IO object from the emulator
const apple2 = window.apple2;
const io = apple2.getIO();

// Send a single key press (ASCII code)
io.keyDown(0x41); // Press 'A' (or use decimal: 65)
io.keyDown(27);    // ESC key (0x1B)
io.keyDown(13);    // Return/Enter (0x0D)

// Send text as if typed
io.setKeyBuffer("PRINT \"HELLO\"\r");
```

**Common ASCII Codes:**
- `27` (0x1B) = ESC
- `13` (0x0D) = Return/Enter
- `65` (0x41) = 'A'
- `32` (0x20) = Space
- `8` (0x08) = Backspace

### Button States (Open Apple / Closed Apple)
```javascript
// Open Apple (Command key) - button 0
io.buttonDown(0, true);  // Press
io.buttonDown(0, false); // Release

// Closed Apple (Option key) - button 1
io.buttonDown(1, true);  // Press
io.buttonDown(1, false); // Release
```

## Video/Screen Operations

### Get Video Modes
```javascript
const vm = apple2.getVideoModes();
```

### Copy Screen to Clipboard
```javascript
// Method 1: Use the copyScreenToClipboard function (same as Copy button)
import { copyScreenToClipboard } from 'js/videomodes';

const vm = window.apple2.getVideoModes();
await copyScreenToClipboard(vm);

// Method 2: Get text and copy manually
const text = vm.getText();
await navigator.clipboard.writeText(text);
```

### Get Screen Text
```javascript
const vm = window.apple2.getVideoModes();
const text = vm.getText();
console.log(text); // The current screen text content
```

### Paste from Clipboard
```javascript
// Method 1: Read from clipboard and type (same as Paste button)
async function paste() {
    const io = window.apple2.getIO();
    const text = await navigator.clipboard.readText();
    io.setKeyBuffer(text);
}

await paste();

// Method 2: Direct paste if you have the text
const io = window.apple2.getIO();
io.setKeyBuffer("Text to paste\r");
```

### Screen Options
```javascript
const vm = apple2.getVideoModes();

// Mono screen
vm.mono(true);  // Enable
vm.mono(false); // Disable

// Scanlines
vm.scanlines(true);  // Show
vm.scanlines(false); // Hide
```

### Full Screen
```javascript
// Note: This requires access to the Screen class instance
// The Screen class is created in ControlStrip component
// You may need to access it through the Options system
```

## Audio Control

### Toggle Sound
```javascript
// Access through Options system
// The Audio instance is created in AudioControl component
// You can access options through the OptionsContext

// Option name: 'enable_sound'
// Set via options.setOption('enable_sound', true/false)
```

## Disk Operations

### Access Disk2 (Floppy Drives)
```javascript
const io = apple2.getIO();
const disk2 = io.getSlot(6); // Slot 6 is Disk2

if (disk2) {
    // Load a disk from URL (JSON format)
    import { loadJSON } from 'js/components/util/files';
    await loadJSON(disk2, 1, 'json/disks/dos33master.json'); // Drive 1

    // Load a binary disk file
    import { loadHttpNibbleFile } from 'js/components/util/files';
    await loadHttpNibbleFile(disk2, 1, 'path/to/disk.dsk');

    // Set disk directly (if you have a JSONDisk object)
    disk2.setDisk(1, jsonDiskData);

    // Set binary disk
    await disk2.setBinary(1, 'diskname', 'dsk', arrayBuffer);
}
```

### Access SmartPort (Hard Drives)
```javascript
const io = apple2.getIO();
const smartPort = io.getSlot(7); // Slot 7 is SmartPort

if (smartPort) {
    // Load block disk
    import { loadHttpBlockFile } from 'js/components/util/files';
    await loadHttpBlockFile(smartPort, 1, 'path/to/disk.2mg');
}
```

### Access Other Slots
```javascript
const io = apple2.getIO();

// Get any slot (0-7)
const card = io.getSlot(0); // Language card (slot 0)
const card = io.getSlot(2); // Slinky (slot 2)
const card = io.getSlot(3); // Videoterm (slot 3, Apple II only)
const card = io.getSlot(4); // Mouse (slot 4)
const card = io.getSlot(5); // ThunderClock (slot 5)
const card = io.getSlot(6); // Disk2 (slot 6)
const card = io.getSlot(7); // SmartPort (slot 7)
```

## CPU Operations

### Get CPU
```javascript
const cpu = apple2.getCPU();

// Reset CPU
cpu.reset();

// Get CPU cycles
const cycles = cpu.getCycles();

// Step CPU (for debugging)
cpu.stepCycles(cycles);
```

### Get Debugger
```javascript
const debugger = apple2.getDebugger();
// Use debugger for breakpoints, memory inspection, etc.
```

## Statistics

### Get Stats
```javascript
const stats = apple2.getStats();
// Returns: { cycles, frames, renderedFrames }
```

### Get CPU Speed (kHz)
```javascript
const io = apple2.getIO();
const khz = io.getKHz();
```

## Options System

The options system is managed through React Context, but preferences are stored in localStorage. You can read/write preferences directly, but some options require the OptionHandler to be registered (which happens in the ControlStrip component).

### Direct Preference Access

```javascript
import Prefs from 'js/prefs';

const prefs = new Prefs();

// Read preference (returns string or null)
const value = prefs.readPref('option_name', 'default_value');

// Write preference (stores as string)
prefs.writePref('option_name', 'true');  // boolean as string
prefs.writePref('option_name', 'value'); // string value
```

### Available Options (stored in localStorage)

- `enable_sound` (string: 'true'/'false') - Audio on/off
- `mono_screen` (string: 'true'/'false') - Monochrome screen
- `full_page` (string: 'true'/'false') - Full page mode
- `show_scanlines` (string: 'true'/'false') - Show scanlines
- `gl_canvas` (string: 'true'/'false') - Use WebGL renderer
- `system_type` (string) - System type (e.g., 'apple2enh')
- `keyboard_layout` (string) - Keyboard layout

**Note:** Some options (like audio, screen settings) require the OptionHandler to be active. Setting the preference will take effect when the page reloads or when the handler processes it. For immediate effect, you may need to trigger the handler manually or reload the page.

## Clipboard Operations

### Copy Screen to Clipboard (Same as Copy Button)
```javascript
// This is what the Copy button does
import { copyScreenToClipboard } from 'js/videomodes';

const vm = window.apple2.getVideoModes();
await copyScreenToClipboard(vm);

// In text mode: copies as both HTML and plain text
// In graphics mode: copies as image blob
```

### Get Screen Text (Without Copying)
```javascript
const vm = window.apple2.getVideoModes();
const text = vm.getText();
// Use text however you need (log it, process it, etc.)
console.log(text);
```

### Paste from Clipboard (Same as Paste Button)
```javascript
// This is what the Paste button does
async function paste() {
    const io = window.apple2.getIO();
    const text = await navigator.clipboard.readText();
    io.setKeyBuffer(text);
}

await paste();
```

### Paste Text Directly (Without Clipboard)
```javascript
// If you already have the text, just use setKeyBuffer
const io = window.apple2.getIO();
io.setKeyBuffer("Your text here\r");
```

## Example: Complete Integration

```javascript
// Wait for emulator to be ready
async function initEmulator() {
    // Wait for window.apple2 to be available
    while (!window.apple2) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const apple2 = window.apple2;
    
    // Wait for emulator ready
    await apple2.ready;
    
    // Now you can use the emulator
    apple2.reset();
    apple2.run();
    
    // Load a disk
    const io = apple2.getIO();
    const disk2 = io.getSlot(6);
    await loadJSON(disk2, 1, 'json/disks/dos33master.json');
    
    // Type some text
    io.setKeyBuffer("PRINT \"HELLO WORLD\"\r");
    
    // Toggle sound
    const prefs = new Prefs();
    prefs.writePref('enable_sound', 'false');
}
```

## Helper Functions for Console Use

Here are some convenient helper functions you can use in the browser console:

```javascript
// Quick access to emulator and IO
function getEmulator() {
    if (!window.apple2) {
        throw new Error('Emulator not initialized yet. Wait for it to load.');
    }
    return window.apple2;
}

function getIO() {
    return getEmulator().getIO();
}

// Send a key press (with proper press/release cycle)
function key(keyCode) {
    const io = getIO();
    const apple2 = getEmulator();
    
    // Make sure emulator is running
    if (!apple2.isRunning()) {
        console.warn('Emulator is paused. Starting it...');
        apple2.run();
    }
    
    // Press and release the key
    io.keyDown(keyCode);
    
    // Release after a short delay (Apple II needs time to read the key)
    setTimeout(() => {
        io.keyUp();
    }, 50);
}

// Type text (recommended method - handles everything automatically)
function type(text) {
    const io = getIO();
    const apple2 = getEmulator();
    
    // Make sure emulator is running
    if (!apple2.isRunning()) {
        console.warn('Emulator is paused. Starting it...');
        apple2.run();
    }
    
    io.setKeyBuffer(text);
}

// Copy screen to clipboard (same as Copy button)
async function copy() {
    const apple2 = getEmulator();
    const vm = apple2.getVideoModes();
    
    // Get screen text and copy to clipboard
    const text = vm.getText();
    
    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        console.log('Screen copied to clipboard!');
    } else {
        // Fallback: log the text
        console.log('Clipboard API not available. Screen text:');
        console.log(text);
    }
}

// Paste from clipboard (same as Paste button)
async function paste() {
    const io = getIO();
    const text = await navigator.clipboard.readText();
    io.setKeyBuffer(text);
    console.log('Pasted from clipboard!');
}

// Get screen text without copying
function getScreenText() {
    const apple2 = getEmulator();
    const vm = apple2.getVideoModes();
    return vm.getText();
}

// Reset emulator (direct call - same as clicking the reset button)
function reset() {
    getEmulator().reset();
}

// Or click the reset button programmatically
function clickResetButton() {
    // Find the reset button element
    const resetButton = Array.from(document.querySelectorAll('*')).find(el => 
        el.textContent?.trim() === 'Reset' && el.onclick
    );
    if (resetButton) {
        resetButton.click();
    } else {
        // Fallback to direct call
        reset();
    }
}

// Check emulator status
function status() {
    const apple2 = getEmulator();
    return {
        running: apple2.isRunning(),
        ready: apple2.ready,
        stats: apple2.getStats()
    };
}

// Usage examples:
// key(27);              // Press ESC (with auto-release)
// type("PRINT \"HI\"\r"); // Type text (recommended)
// reset();               // Reset emulator
// clickResetButton();    // Click reset button programmatically
// await copy();          // Copy screen to clipboard
// await paste();         // Paste from clipboard
// getScreenText();       // Get screen text as string
// status();              // Check emulator status
```

## Clicking UI Buttons Programmatically

Even if buttons are hidden with CSS, you can still click them programmatically:

```javascript
// Click reset button
function clickResetButton() {
    const resetButton = Array.from(document.querySelectorAll('*')).find(el => 
        el.textContent?.trim() === 'Reset' && el.onclick
    );
    resetButton?.click();
}

// Click any button by title/aria-label
function clickButtonByTitle(title) {
    const button = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.title === title || btn.getAttribute('aria-label') === title
    );
    button?.click();
}

// Usage:
// clickButtonByTitle('Toggle Sound');
// clickButtonByTitle('Toggle Debugger');
// clickButtonByTitle('Copy');
// clickButtonByTitle('Paste');
// clickButtonByTitle('Options (F4)');
```

**Note:** The reset button calls `apple2.reset()`, so calling `window.apple2.reset()` directly is simpler and more reliable than clicking the button.
```

**Important Notes:**
- Use `type()` for typing text - it's more reliable than individual `key()` calls
- The emulator must be running (`apple2.isRunning() === true`) for keys to be processed
- If nothing happens, check: `status()` to see if emulator is running
- For single key presses, `key()` will automatically release after 50ms

## Component-Specific Features

Some features are managed by React components and may require accessing the component state or using DOM events. For these, you might need to:

1. **Printer**: Access through the Printer component's internal state
2. **Cassette**: Access through the Cassette component
3. **Options Modal**: Trigger through the OptionsContext

## Troubleshooting

### Keys Not Working?

If `keyDown()` or `setKeyBuffer()` doesn't seem to work, check these:

1. **Is the emulator running?**
   ```javascript
   window.apple2.isRunning(); // Should return true
   if (!window.apple2.isRunning()) {
       window.apple2.run(); // Start it
   }
   ```

2. **Is the emulator ready?**
   ```javascript
   await window.apple2.ready; // Wait for initialization
   ```

3. **Use `setKeyBuffer()` instead of `keyDown()`**
   - `setKeyBuffer()` is more reliable for typing text
   - It handles the key press/release cycle automatically
   ```javascript
   // Good - recommended
   io.setKeyBuffer("PRINT \"HELLO\"\r");
   
   // Less reliable - requires timing
   io.keyDown(65); // 'A'
   setTimeout(() => io.keyUp(), 50);
   ```

4. **Focus the screen canvas**
   ```javascript
   const screen = document.getElementById('screen');
   if (screen) screen.focus();
   ```

5. **Test with a simple example**
   ```javascript
   // Complete working example
   async function testKeyboard() {
       // Wait for emulator
       while (!window.apple2) await new Promise(r => setTimeout(r, 100));
       await window.apple2.ready;
       
       // Ensure it's running
       if (!window.apple2.isRunning()) {
           window.apple2.run();
       }
       
       // Type something
       const io = window.apple2.getIO();
       io.setKeyBuffer("PRINT \"IT WORKS!\"\r");
       
       console.log('Key sent!');
   }
   testKeyboard();
   ```

## Notes

- The emulator instance (`window.apple2`) is set in `js/components/Apple2.tsx` at line 137
- Most I/O operations require the emulator to be running
- Disk loading operations are asynchronous and return Promises
- The Options system uses localStorage for persistence
- Some features (like full screen) require direct DOM manipulation or access to component instances
- **Always use `setKeyBuffer()` for typing text** - it's more reliable than individual `keyDown()` calls

