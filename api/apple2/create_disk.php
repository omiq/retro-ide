<?php
// api/apple2/create_disk.php - Create bootable Apple II DOS 3.3 disk image from binary
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Send CORS headers for preflight
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Max-Age: 3600');
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['error' => 'Method not allowed']));
}

// Read JSON input
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    exit(json_encode(['error' => 'Invalid JSON: ' . json_last_error_msg()]));
}

// Validate required fields
if (!isset($data['binary']) || !isset($data['filename']) || !isset($data['loadAddress']) || !isset($data['runAddress'])) {
    http_response_code(400);
    exit(json_encode(['error' => 'Missing required fields: binary, filename, loadAddress, or runAddress']));
}

// Optional: use DOS master disk as base (creates bootable disk with DOS + program)
$useDosMaster = isset($data['useDosMaster']) ? (bool)$data['useDosMaster'] : true;

$binaryData = $data['binary']; // Base64 encoded binary
$filename = $data['filename']; // e.g., "KEYBOARD"
$loadAddress = $data['loadAddress']; // e.g., 2051 (0x803)
$runAddress = $data['runAddress']; // e.g., 2051 (0x803)
$sessionID = isset($data['sessionID']) ? $data['sessionID'] : uniqid('apple2_', true);

// Security: validate sessionID
if (!preg_match('/^[a-zA-Z0-9_-]+$/', $sessionID)) {
    http_response_code(403);
    exit(json_encode(['error' => 'Invalid sessionID']));
}

// Validate filename (DOS 3.3: max 30 chars, uppercase, no special chars)
$filename = strtoupper(preg_replace('/[^A-Z0-9]/', '', substr($filename, 0, 30)));
if (empty($filename)) {
    $filename = 'PROGRAM';
}

// Decode binary data
$binaryBytes = base64_decode($binaryData);
if ($binaryBytes === false) {
    http_response_code(400);
    exit(json_encode(['error' => 'Invalid base64 binary data']));
}

// Create bootable disk
$result = createBootableDisk($binaryBytes, $filename, $loadAddress, $runAddress, $sessionID);

echo json_encode($result);

/**
 * Ensure there's enough free space on the DOS master disk by deleting non-essential files if needed
 * Returns the modified disk image
 */
function ensureFreeSpace($disk, $requiredSectors) {
    $VTOC_OFFSET = 0; // Track 0, Sector 0
    $BYTES_PER_SECTOR = 256;
    $SECTORS_PER_TRACK = 16;
    $TRACKS = 35;
    
    // Count free sectors by checking VTOC bitmap
    // Bitmap starts at offset 0x04, each bit represents a sector
    $freeSectors = 0;
    for ($track = 0; $track < $TRACKS; $track++) {
        for ($sector = 0; $sector < $SECTORS_PER_TRACK; $sector++) {
            $bitmapByte = 0x04 + (($track * $SECTORS_PER_TRACK + $sector) >> 3);
            $bitmapBit = 7 - (($track * $SECTORS_PER_TRACK + $sector) & 7);
            if ($bitmapByte < 0x27) {
                $bitmapValue = ord($disk[$VTOC_OFFSET + $bitmapByte]);
                if (!($bitmapValue & (1 << $bitmapBit))) {
                    $freeSectors++;
                }
            }
        }
    }
    
    // If we have enough free space, return disk as-is
    if ($freeSectors >= $requiredSectors) {
        return $disk;
    }
    
    // Need to free up space - delete some non-essential files
    // Files to delete (in order of preference - keep DOS system files):
    // - README files
    // - Utility programs that aren't essential for booting
    // - Documentation files
    $filesToDelete = [
        'VIEW.README',
        'README',
        'MAKE.SMALL.P8',
        'MINIBAS',
        'FASTDSK.CONF',
        '*ADTPRO2.0.2',
        '*CAT.DOCTOR',
        '*BLOCKWARDEN',
        '*MR.FIXIT.Y2K',
        '*UNSHRINK',
        '*COPYIIPLUS.8.4'
    ];
    
    $catalogTrack = 17;
    $catalogSector = 15;
    $catalogOffset = ($catalogTrack * $SECTORS_PER_TRACK + $catalogSector) * $BYTES_PER_SECTOR;
    
    // Read file count
    $fileCount = ord($disk[$catalogOffset + 0x03]);
    $fileEntrySize = 35;
    
    $deletedSectors = 0;
    foreach ($filesToDelete as $fileToDelete) {
        if ($freeSectors + $deletedSectors >= $requiredSectors) {
            break; // We have enough space now
        }
        
        // Find and delete this file
        for ($i = 0; $i < $fileCount; $i++) {
            $entryOffset = $catalogOffset + 0x0B + ($i * $fileEntrySize);
            
            // Read filename (30 bytes)
            $entryFilename = '';
            for ($j = 0; $j < 30; $j++) {
                $byte = ord($disk[$entryOffset + $j]);
                if ($byte === 0 || $byte === 0xA0) break; // End of filename or space
                $entryFilename .= chr($byte);
            }
            $entryFilename = trim($entryFilename);
            
            // Check if this is the file we want to delete
            if (stripos($entryFilename, $fileToDelete) === 0 || 
                (strpos($fileToDelete, '*') === 0 && stripos($entryFilename, substr($fileToDelete, 1)) === 0)) {
                
                // Get file size in sectors
                $fileSectors = ord($disk[$entryOffset + 0x21]) | (ord($disk[$entryOffset + 0x22]) << 8);
                
                // Get track and sector where file starts
                $fileTrack = ord($disk[$entryOffset + 0x1E]);
                $fileSector = ord($disk[$entryOffset + 0x1F]);
                
                // Mark file entry as deleted (set track to 0)
                $disk[$entryOffset + 0x1E] = chr(0);
                
                // Free up sectors in VTOC bitmap
                $currentTrack = $fileTrack;
                $currentSector = $fileSector;
                for ($s = 0; $s < $fileSectors; $s++) {
                    $bitmapByte = 0x04 + (($currentTrack * $SECTORS_PER_TRACK + $currentSector) >> 3);
                    $bitmapBit = 7 - (($currentTrack * $SECTORS_PER_TRACK + $currentSector) & 7);
                    if ($bitmapByte < 0x27) {
                        $bitmapValue = ord($disk[$VTOC_OFFSET + $bitmapByte]);
                        $disk[$VTOC_OFFSET + $bitmapByte] = chr($bitmapValue & ~(1 << $bitmapBit));
                    }
                    
                    // Follow sector chain (DOS 3.3 files are linked)
                    $sectorOffset = ($currentTrack * $SECTORS_PER_TRACK + $currentSector) * $BYTES_PER_SECTOR;
                    $nextTrack = ord($disk[$sectorOffset + 0x01]);
                    $nextSector = ord($disk[$sectorOffset + 0x02]);
                    
                    if ($nextTrack === 0 || $nextTrack >= $TRACKS) break;
                    $currentTrack = $nextTrack;
                    $currentSector = $nextSector;
                }
                
                $deletedSectors += $fileSectors;
                break; // Found and deleted this file, move to next
            }
        }
    }
    
    return $disk;
}

/**
 * Create a bootable Apple II DOS 3.3 disk image from binary data
 * Strategy: Copy DOS master disk and add program binary to it
 */
function createBootableDisk($binaryData, $filename, $loadAddress, $runAddress, $sessionID) {
    $sessionDir = "/tmp/apple2-{$sessionID}";
    
    // Create session directory
    if (!is_dir($sessionDir)) {
        if (!mkdir($sessionDir, 0777, true)) {
            return ['error' => "Failed to create session directory: {$sessionDir}"];
        }
    }
    
    // Verify directory is writable
    if (!is_writable($sessionDir)) {
        return ['error' => "Session directory is not writable: {$sessionDir}"];
    }
    
    // Write binary file
    $binFile = "{$sessionDir}/{$filename}.BIN";
    if (file_put_contents($binFile, $binaryData) === false) {
        return ['error' => "Failed to write binary file: {$binFile}"];
    }
    
    // Find Java executable (try specific paths first, then fall back to 'java' in PATH)
    $javaExe = null;
    $javaPaths = [
        '/Library/Java/JavaVirtualMachines/temurin-25.jdk/Contents/Home/bin/java', // Temurin 25 (LTS) - preferred
        '/opt/homebrew/opt/openjdk@17/bin/java',  // Java 17 LTS
        '/opt/homebrew/opt/openjdk@21/bin/java', // Java 21 LTS
        '/opt/homebrew/Cellar/openjdk/24.0.2/bin/java', // Java 24
        '/usr/bin/java', // System Java
        'java' // Fallback to PATH
    ];
    foreach ($javaPaths as $path) {
        if ($path === 'java' || (file_exists($path) && is_executable($path))) {
            $javaExe = $path;
            break;
        }
    }
    if (!$javaExe) {
        $javaExe = 'java'; // Final fallback
    }
    
    // Path to AppleCommander (check for native binary first, then JAR files)
    // Native binary (macOS/Linux) - preferred if available
    $appleCommanderExe = null;
    $possibleNativePaths = [
        '/home/ide/htdocs/ac-linux',  // Server Linux location
        '/Applications/AppleCommander',  // macOS native location
        '/applications/AppleCommander',  // Alternative macOS location
        '/usr/local/bin/AppleCommander',  // Linux/Unix
        '/opt/applecommander/AppleCommander',
        __DIR__ . '/AppleCommander',
        'AppleCommander'  // Fallback to PATH
    ];
    foreach ($possibleNativePaths as $path) {
        if ($path === 'AppleCommander' || (file_exists($path) && is_executable($path))) {
            $appleCommanderExe = $path;
            break;
        }
    }
    
    // Path to AppleCommander JAR (if native binary not found)
    $appleCommanderJar = null;
    if (!$appleCommanderExe) {
        $possibleJarNames = [
            __DIR__ . '/AppleCommander.jar',
            __DIR__ . '/AppleCommander-1.3.5-ac.jar',
            __DIR__ . '/AppleCommander-*.jar' // Will need glob
        ];
        
        // Check exact names first
        foreach (['AppleCommander.jar', 'AppleCommander-1.3.5-ac.jar'] as $name) {
            $path = __DIR__ . '/' . $name;
            if (file_exists($path)) {
                $appleCommanderJar = $path;
                break;
            }
        }
        
        // If not found, try glob pattern
        if (!$appleCommanderJar) {
            $globPattern = __DIR__ . '/AppleCommander-*.jar';
            $matches = glob($globPattern);
            if (!empty($matches)) {
                $appleCommanderJar = $matches[0]; // Use first match
            }
        }
        
        // Try other locations if not found in api/apple2
        if (!$appleCommanderJar) {
            $possiblePaths = [
                '/home/ide/htdocs/AppleCommander.jar',  // Server location
                __DIR__ . '/../../../AppleCommander.jar',
                '/usr/local/bin/AppleCommander.jar',
                '/opt/applecommander/AppleCommander.jar',
                __DIR__ . '/../../tools/AppleCommander.jar'
            ];
            foreach ($possiblePaths as $path) {
                if (file_exists($path)) {
                    $appleCommanderJar = $path;
                    break;
                }
            }
        }
    }
    
    // Path to DOS master disk (check for .dsk file first, then JSON)
    $dosMasterDisk = null;
    // Try DOS3.3.dsk first (as per working shell script), then template.dsk or dos33master.dsk
    $dosMasterDsk = null;
    foreach (['DOS3.3.dsk', 'template.dsk', 'dos33master.dsk'] as $name) {
        $path = __DIR__ . '/' . $name;
        if (file_exists($path)) {
            $dosMasterDsk = $path;
            break;
        }
    }
    
    if ($dosMasterDsk) {
        // Use .dsk file directly (much simpler!)
        $dosMasterDisk = file_get_contents($dosMasterDsk);
        if ($dosMasterDisk === false || strlen($dosMasterDisk) !== 143360) {
            return ['error' => "Failed to read DOS master disk file or invalid size (expected 143360 bytes, got " . strlen($dosMasterDisk) . ")"];
        }
    } else {
        // Try JSON format
        $dosMasterPath = __DIR__ . '/../../../res/apple2js/json/disks/dos33master.json';
        if (!file_exists($dosMasterPath)) {
            // Try alternative locations
            $possibleDosPaths = [
                '/home/ide/htdocs/res/apple2js/json/disks/dos33master.json',
                __DIR__ . '/../../res/apple2js/json/disks/dos33master.json'
            ];
            foreach ($possibleDosPaths as $path) {
                if (file_exists($path)) {
                    $dosMasterPath = $path;
                    break;
                }
            }
        }
        
        if (file_exists($dosMasterPath)) {
            // Load DOS master disk JSON
            $dosMasterJson = json_decode(file_get_contents($dosMasterPath), true);
            if (!$dosMasterJson || !isset($dosMasterJson['data'])) {
                return ['error' => "Failed to parse DOS master disk JSON"];
            }
            
            // Decode DOS master disk from base64
            // The JSON has data as array of arrays, each containing base64-encoded sectors
            $dosMasterDisk = '';
            foreach ($dosMasterJson['data'] as $sectorArray) {
                foreach ($sectorArray as $base64Sector) {
                    $dosMasterDisk .= base64_decode($base64Sector);
                }
            }
        }
    }
    
    if ($dosMasterDisk === null || strlen($dosMasterDisk) !== 143360) {
        // Fallback to manual creation without DOS master
        return createDiskManually($binaryData, $filename, $loadAddress, $runAddress, $sessionDir);
    }
    
    // Copy DOS master to our output file
    $dskFile = "{$sessionDir}/{$filename}.dsk";
    if (file_put_contents($dskFile, $dosMasterDisk) === false) {
        return ['error' => "Failed to write DOS master disk copy to: {$dskFile}"];
    }
    
    // If AppleCommander is available (native binary or JAR), use it to add the binary file
    $appleCommanderAvailable = ($appleCommanderExe && is_executable($appleCommanderExe)) || 
                               ($appleCommanderJar && file_exists($appleCommanderJar));
    if ($appleCommanderAvailable) {
        // First, check if there's free space, and if not, delete some files
        $originalDir = getcwd();
        if (!chdir($sessionDir)) {
            return ['error' => "Failed to change to session directory: {$sessionDir}"];
        }
        
        // List files to check free space
        if ($appleCommanderExe) {
            // Use native binary
            $listCmd = sprintf(
                '%s -l %s 2>&1',
                escapeshellarg($appleCommanderExe),
                escapeshellarg(basename($dskFile))
            );
        } else {
            // Use JAR file
            $listCmd = sprintf(
                '%s -jar %s -l %s 2>&1',
                escapeshellarg($javaExe),
                escapeshellarg($appleCommanderJar),
                escapeshellarg(basename($dskFile))
            );
        }
        exec($listCmd, $listOutput, $listReturnCode);
        $listOutputStr = implode("\n", $listOutput);
        
        // Check if disk is full (look for "BLOCKS FREE: 0" or similar)
        $isFull = (stripos($listOutputStr, 'BLOCKS FREE: 0') !== false) || 
                  (stripos($listOutputStr, 'FREE: 0') !== false) ||
                  (preg_match('/FREE:\s*0\s*BLOCKS?/i', $listOutputStr));
        
        if ($isFull) {
            // Delete some non-essential files to make room
            $filesToDelete = [
                'VIEW.README',
                'README',
                'MAKE.SMALL.P8',
                'MINIBAS',
                'FASTDSK.CONF'
            ];
            
            foreach ($filesToDelete as $fileToDelete) {
                // Try to delete the file
                if ($appleCommanderExe) {
                    $deleteCmd = sprintf(
                        '%s -d %s %s 2>&1',
                        escapeshellarg($appleCommanderExe),
                        escapeshellarg(basename($dskFile)),
                        escapeshellarg($fileToDelete)
                    );
                } else {
                    $deleteCmd = sprintf(
                        '%s -jar %s -d %s %s 2>&1',
                        escapeshellarg($javaExe),
                        escapeshellarg($appleCommanderJar),
                        escapeshellarg(basename($dskFile)),
                        escapeshellarg($fileToDelete)
                    );
                }
                exec($deleteCmd, $deleteOutput, $deleteReturnCode);
                
                // Check if we now have free space
                exec($listCmd, $listOutput2, $listReturnCode2);
                $listOutputStr2 = implode("\n", $listOutput2);
                $stillFull = (stripos($listOutputStr2, 'BLOCKS FREE: 0') !== false) || 
                            (stripos($listOutputStr2, 'FREE: 0') !== false);
                
                if (!$stillFull) {
                    break; // We have free space now
                }
            }
        }
        
        // Use AppleCommander to add binary file to the DOS master disk copy
        // Based on tutorial Makefile technique:
        // 1. Delete file first if it exists: -d <disk> <filename>
        // 2. Add file as BIN type: -as <disk> <filename> BIN < <inputfile>
        
        // First, delete the file if it exists (to avoid conflicts)
        if ($appleCommanderExe) {
            $deleteCmd = sprintf(
                '%s -d %s %s 2>&1',
                escapeshellarg($appleCommanderExe),
                escapeshellarg(basename($dskFile)),
                escapeshellarg($filename)
            );
        } else {
            $deleteCmd = sprintf(
                '%s -jar %s -d %s %s 2>&1',
                escapeshellarg($javaExe),
                escapeshellarg($appleCommanderJar),
                escapeshellarg(basename($dskFile)),
                escapeshellarg($filename)
            );
        }
        exec($deleteCmd, $deleteOutput, $deleteReturnCode);
        // Ignore delete errors - file might not exist, which is fine
        
        // Use the binary file as-is (AppleCommander -as can handle AppleSingle format directly)
        // The shell script uses the binary directly from cl65 output, which is AppleSingle format
        // We should do the same - use the binary as received (it already has the AppleSingle header)
        $binFile = "{$sessionDir}/{$filename}.BIN";
        if (file_put_contents($binFile, $binaryData) === false) {
            return ['error' => "Failed to write binary file: {$binFile}"];
        }
        
        // Use -as flag to add file as BIN type (uppercase, as per tutorial Makefile)
        // Note: AppleCommander -as syntax: -as <disk> <filename> <type> < <inputfile>
        // The filename should NOT include .BIN extension when using -as
        // Use the binary file directly (AppleCommander handles AppleSingle format)
        if ($appleCommanderExe) {
            $cmd = sprintf(
                '%s -as %s %s BIN < %s 2>&1',
                escapeshellarg($appleCommanderExe),
                escapeshellarg(basename($dskFile)),
                escapeshellarg($filename), // No .BIN extension
                escapeshellarg(basename($binFile))
            );
        } else {
            $cmd = sprintf(
                '%s -jar %s -as %s %s BIN < %s 2>&1',
                escapeshellarg($javaExe),
                escapeshellarg($appleCommanderJar),
                escapeshellarg(basename($dskFile)),
                escapeshellarg($filename), // No .BIN extension
                escapeshellarg(basename($binFile))
            );
        }
        
        exec($cmd, $output, $returnCode);
        $errorOutput = implode("\n", $output);
        
        // Restore original directory
        chdir($originalDir);
        
        // Verify the file was added by checking if disk was modified
        if ($returnCode === 0 && file_exists($dskFile) && filesize($dskFile) === 143360) {
            // Success! AppleCommander added the file
            // Verify by trying to list files on the disk
            if ($appleCommanderExe) {
                $verifyCmd = sprintf(
                    '%s -l %s 2>&1',
                    escapeshellarg($appleCommanderExe),
                    escapeshellarg($dskFile)
                );
            } else {
                $verifyCmd = sprintf(
                    '%s -jar %s -l %s 2>&1',
                    escapeshellarg($javaExe),
                    escapeshellarg($appleCommanderJar),
                    escapeshellarg($dskFile)
                );
            }
            exec($verifyCmd, $verifyOutput, $verifyReturnCode);
            $verifyOutputStr = implode("\n", $verifyOutput);
            
            // Check if our filename appears in the catalog (must be exact match, not just return code)
            $filenameUpper = strtoupper($filename);
            $foundInCatalog = stripos($verifyOutputStr, $filenameUpper) !== false;
            
            if ($foundInCatalog && $verifyReturnCode === 0) {
                // Binary file successfully added, now add auto-executing STARTUP.BAS
                // This matches the working shell script approach
                // Make sure we're still in the session directory
                if (!chdir($sessionDir)) {
                    chdir($originalDir);
                    return ['error' => "Failed to change to session directory for STARTUP.BAS: {$sessionDir}"];
                }
                
                $startupBasFile = __DIR__ . '/STARTUP.BAS';
                if (file_exists($startupBasFile)) {
                    // Use the provided STARTUP.BAS file
                    $startupBasContent = file_get_contents($startupBasFile);
                } else {
                    // Create STARTUP.BAS that auto-executes the binary
                    // Format: 10 PRINT CHR$(4);"BRUN <filename>"
                    $startupBasContent = "10 PRINT CHR$(4);\"BRUN " . strtoupper($filename) . "\"\n";
                }
                
                // Write STARTUP.BAS to temp file
                $startupBasTemp = "{$sessionDir}/STARTUP.BAS";
                if (file_put_contents($startupBasTemp, $startupBasContent) === false) {
                    chdir($originalDir);
                    return ['error' => "Failed to write STARTUP.BAS file: {$startupBasTemp}"];
                }
                
                // Delete HELLO if it exists (as per shell script)
                if ($appleCommanderExe) {
                    $deleteHelloCmd = sprintf(
                        '%s -d %s HELLO 2>&1',
                        escapeshellarg($appleCommanderExe),
                        escapeshellarg(basename($dskFile))
                    );
                } else {
                    $deleteHelloCmd = sprintf(
                        '%s -jar %s -d %s HELLO 2>&1',
                        escapeshellarg($javaExe),
                        escapeshellarg($appleCommanderJar),
                        escapeshellarg(basename($dskFile))
                    );
                }
                exec($deleteHelloCmd, $deleteHelloOutput, $deleteHelloReturnCode);
                // Ignore errors - HELLO might not exist
                
                // Add STARTUP.BAS as HELLO (auto-executing BASIC file)
                if ($appleCommanderExe) {
                    $addStartupCmd = sprintf(
                        '%s -bas %s HELLO < %s 2>&1',
                        escapeshellarg($appleCommanderExe),
                        escapeshellarg(basename($dskFile)),
                        escapeshellarg(basename($startupBasTemp))
                    );
                } else {
                    $addStartupCmd = sprintf(
                        '%s -jar %s -bas %s HELLO < %s 2>&1',
                        escapeshellarg($javaExe),
                        escapeshellarg($appleCommanderJar),
                        escapeshellarg(basename($dskFile)),
                        escapeshellarg(basename($startupBasTemp))
                    );
                }
                exec($addStartupCmd, $addStartupOutput, $addStartupReturnCode);
                $addStartupOutputStr = implode("\n", $addStartupOutput);
                
                if ($addStartupReturnCode !== 0) {
                    error_log("AppleCommander: Failed to add STARTUP.BAS. Output: {$addStartupOutputStr}");
                    // Continue anyway - the binary is already on the disk
                }
                
                // Restore original directory before reading disk
                chdir($originalDir);
                
                // File appears to be on disk
                $diskData = file_get_contents($dskFile);
                if ($diskData === false) {
                    return ['error' => "Failed to read created disk image: {$dskFile}"];
                }
                
                // Cleanup
                @unlink($binFile);
                @unlink($startupBasTemp);
                @unlink($dskFile);
                @rmdir($sessionDir);
                
                return [
                    'disk' => base64_encode($diskData),
                    'filename' => "{$filename}.dsk",
                    'debug' => "AppleCommander added file successfully. Catalog listing:\n{$verifyOutputStr}\nSTARTUP.BAS added: " . ($addStartupReturnCode === 0 ? "Yes" : "No ({$addStartupOutputStr})")
                ];
            } else {
                // File not found in catalog, log error and try manual method
                error_log("AppleCommander: File '{$filenameUpper}' not found in disk catalog. Return code: {$verifyReturnCode}, Output: {$verifyOutputStr}");
                return createDiskManually($binaryData, $filename, $loadAddress, $runAddress, $sessionDir, $dosMasterDisk);
            }
        } else {
            // AppleCommander failed, try manual method
            error_log("AppleCommander error (exit code {$returnCode}, disk size: " . (file_exists($dskFile) ? filesize($dskFile) : 'missing') . "): {$errorOutput}");
            return createDiskManually($binaryData, $filename, $loadAddress, $runAddress, $sessionDir, $dosMasterDisk);
        }
    } else {
        // AppleCommander not available, use manual method
        return createDiskManually($binaryData, $filename, $loadAddress, $runAddress, $sessionDir, $dosMasterDisk);
    }
    
    // This code should not be reached if AppleCommander succeeded
    // (it returns early on success)
    // If we get here, something went wrong
    return ['error' => "Unexpected code path - AppleCommander should have handled this"];
}

/**
 * Manually create a DOS 3.3 disk image (fallback if AppleCommander is not available)
 * If $dosMasterDisk is provided, use it as base; otherwise create from scratch
 */
function createDiskManually($binaryData, $filename, $loadAddress, $runAddress, $sessionDir, $dosMasterDisk = null) {
    // DOS 3.3 disk format: 35 tracks * 16 sectors * 256 bytes = 143,360 bytes
    $TRACKS = 35;
    $SECTORS_PER_TRACK = 16;
    $BYTES_PER_SECTOR = 256;
    $DISK_SIZE = $TRACKS * $SECTORS_PER_TRACK * $BYTES_PER_SECTOR;
    
    // If we have DOS master disk, use it as base; otherwise create empty disk
    if ($dosMasterDisk !== null && strlen($dosMasterDisk) === $DISK_SIZE) {
        $disk = $dosMasterDisk;
    } else {
        $disk = str_repeat("\x00", $DISK_SIZE);
        
        // Initialize empty disk structure
        // Track 0, Sector 0: Volume Table of Contents (VTOC)
        $vtocOffset = 0;
        $disk[$vtocOffset + 0x01] = chr(0x11); // First catalog track (17)
        $disk[$vtocOffset + 0x02] = chr(0x0F); // First catalog sector (15)
        $disk[$vtocOffset + 0x03] = chr(0x03); // DOS version 3.3
        $disk[$vtocOffset + 0x27] = chr(0x23); // 35 tracks
        
        // Mark tracks 0-2 as used (DOS system tracks)
        for ($track = 0; $track < 3; $track++) {
            for ($sector = 0; $sector < 16; $sector++) {
                $bitmapByte = 0x04 + (($track * 16 + $sector) >> 3);
                $bitmapBit = 7 - (($track * 16 + $sector) & 7);
                if ($bitmapByte < 0x27) {
                    $current = ord($disk[$vtocOffset + $bitmapByte]);
                    $disk[$vtocOffset + $bitmapByte] = chr($current | (1 << $bitmapBit));
                }
            }
        }
    }
    
    // Helper function to write bytes
    $write = function(&$disk, $offset, $data) use ($DISK_SIZE) {
        if (is_string($data)) {
            $len = min(strlen($data), $DISK_SIZE - $offset);
            for ($i = 0; $i < $len; $i++) {
                $disk[$offset + $i] = $data[$i];
            }
        } elseif (is_int($data)) {
            if ($offset < $DISK_SIZE) {
                $disk[$offset] = chr($data & 0xFF);
            }
        }
    };
    
    // Calculate sectors needed for program
    $programSize = strlen($binaryData);
    $programSectors = (int)ceil(($programSize + 4) / $BYTES_PER_SECTOR); // +4 for load/run addresses
    
    // Find free sectors on the disk (skip DOS system tracks 0-2)
    // For DOS master, we need to find free space after existing files
    $vtocOffset = 0;
    $startTrack = 3;
    $startSector = 0;
    
    // If using DOS master, find first free sector by checking VTOC bitmap
    if ($dosMasterDisk !== null) {
        // Scan VTOC bitmap to find free sectors
        $found = false;
        for ($track = 3; $track < 35 && !$found; $track++) {
            for ($sector = 0; $sector < 16; $sector++) {
                $bitmapByte = 0x04 + (($track * 16 + $sector) >> 3);
                $bitmapBit = 7 - (($track * 16 + $sector) & 7);
                if ($bitmapByte < 0x27) {
                    $bitmapValue = ord($disk[$vtocOffset + $bitmapByte]);
                    if (!($bitmapValue & (1 << $bitmapBit))) {
                        // Found free sector
                        $startTrack = $track;
                        $startSector = $sector;
                        $found = true;
                        break;
                    }
                }
            }
        }
    }
    
    // Mark program sectors as used in VTOC bitmap
    $currentTrack = $startTrack;
    $currentSector = $startSector;
    for ($i = 0; $i < $programSectors; $i++) {
        $bitmapByte = 0x04 + (($currentTrack * 16 + $currentSector) >> 3);
        $bitmapBit = 7 - (($currentTrack * 16 + $currentSector) & 7);
        if ($bitmapByte < 0x27) {
            $current = ord($disk[$vtocOffset + $bitmapByte]);
            $disk[$vtocOffset + $bitmapByte] = chr($current | (1 << $bitmapBit));
        }
        $currentSector++;
        if ($currentSector >= 16) {
            $currentSector = 0;
            $currentTrack++;
        }
    }
    
    // Track 17, Sector 15: Catalog
    $catalogTrack = 17;
    $catalogSector = 15;
    $catalogOffset = ($catalogTrack * $SECTORS_PER_TRACK + $catalogSector) * $BYTES_PER_SECTOR;
    
    // If using DOS master, read existing catalog to preserve DOS files
    // Otherwise create new catalog
    $existingFileCount = 0;
    $fileEntrySize = 35;
    $fileEntryOffset = $catalogOffset + 0x0B; // Start of file entries
    
    if ($dosMasterDisk !== null) {
        // Read existing file count from catalog
        $existingFileCount = ord($disk[$catalogOffset + 0x03]);
        
        // Find first empty file entry slot (look for entries with track=0 or deleted entries)
        // Each entry is 35 bytes: 30 bytes filename + 1 byte track + 1 byte sector + 1 byte type + 2 bytes length
        $foundEmptySlot = false;
        for ($i = 0; $i < $existingFileCount; $i++) {
            $entryOffset = $catalogOffset + 0x0B + ($i * $fileEntrySize);
            $entryTrack = ord($disk[$entryOffset + 0x1E]);
            // If track is 0, this is a deleted/empty entry
            if ($entryTrack === 0) {
                $fileEntryOffset = $entryOffset;
                $foundEmptySlot = true;
                break;
            }
        }
        
        // If no empty slot found, add after existing files
        if (!$foundEmptySlot) {
            $fileEntryOffset = $catalogOffset + 0x0B + ($existingFileCount * $fileEntrySize);
            // Update file count only if we're adding a new entry (not reusing an empty slot)
            $write($disk, $catalogOffset + 0x03, $existingFileCount + 1);
        } else {
            // Reusing an empty slot, but we should still increment the count if it was deleted
            // Actually, if we found an empty slot, the count might already include it, so don't change it
            // But make sure the entry is properly written
        }
    } else {
        // New disk, create catalog entry
        $write($disk, $catalogOffset + 0x00, 0x11); // Next catalog track
        $write($disk, $catalogOffset + 0x01, 0x0E); // Next catalog sector
        $write($disk, $catalogOffset + 0x03, 1); // Number of files
    }
    
    // Make sure we don't overflow the sector
    if ($fileEntryOffset + $fileEntrySize > $catalogOffset + $BYTES_PER_SECTOR) {
        return ['error' => "Catalog sector full - cannot add more files. Try using AppleCommander instead."];
    }
    
    $filenamePadded = str_pad(substr($filename, 0, 30), 30, ' ', STR_PAD_RIGHT);
    for ($i = 0; $i < 30; $i++) {
        $write($disk, $fileEntryOffset + $i, ord($filenamePadded[$i]));
    }
    $write($disk, $fileEntryOffset + 0x1E, $startTrack);
    $write($disk, $fileEntryOffset + 0x1F, $startSector);
    $write($disk, $fileEntryOffset + 0x20, 0x80); // Binary file type + locked
    $write($disk, $fileEntryOffset + 0x21, $programSectors & 0xFF);
    $write($disk, $fileEntryOffset + 0x22, ($programSectors >> 8) & 0xFF);
    
    // Write program data with DOS 3.3 binary file header
    $programOffset = ($startTrack * $SECTORS_PER_TRACK + $startSector) * $BYTES_PER_SECTOR;
    
    // Write load address (2 bytes, little-endian)
    $write($disk, $programOffset + 0, $loadAddress & 0xFF);
    $write($disk, $programOffset + 1, ($loadAddress >> 8) & 0xFF);
    
    // Write program data
    for ($i = 0; $i < $programSize; $i++) {
        if ($programOffset + 2 + $i < $DISK_SIZE) {
            $disk[$programOffset + 2 + $i] = $binaryData[$i];
        }
    }
    
    // Write run address at the end (2 bytes, little-endian)
    $runAddressOffset = $programOffset + 2 + $programSize;
    $write($disk, $runAddressOffset + 0, $runAddress & 0xFF);
    $write($disk, $runAddressOffset + 1, ($runAddress >> 8) & 0xFF);
    
    // Save disk to file for verification
    $dskFile = "{$sessionDir}/{$filename}.dsk";
    if (file_put_contents($dskFile, $disk) === false) {
        return ['error' => "Failed to write disk image: {$dskFile}"];
    }
    
    // Verify disk size
    if (strlen($disk) !== $DISK_SIZE) {
        return ['error' => "Invalid disk size: expected {$DISK_SIZE}, got " . strlen($disk)];
    }
    
    // If we used DOS master as base, the disk is bootable
    // Otherwise, it's just a data disk
    $note = ($dosMasterDisk !== null) 
        ? 'Disk created from DOS master (bootable with DOS 3.3)' 
        : 'Disk created manually (AppleCommander not available). Boot DOS 3.3 first, then load this disk.';
    
    // Read disk data
    $diskData = file_get_contents($dskFile);
    if ($diskData === false) {
        return ['error' => "Failed to read created disk image: {$dskFile}"];
    }
    
    // Cleanup temporary files
    $binFile = "{$sessionDir}/{$filename}.BIN";
    @unlink($binFile);
    @unlink($dskFile);
    @rmdir($sessionDir);
    
    return [
        'disk' => base64_encode($diskData),
        'filename' => "{$filename}.dsk",
        'note' => $note,
        'method' => 'manual',
        'debug' => "Manual disk creation. File entry at offset " . ($fileEntryOffset - $catalogOffset) . 
                   ", Start track: {$startTrack}, Start sector: {$startSector}, " .
                   "Program sectors: {$programSectors}, Existing files: {$existingFileCount}"
    ];
}
?>

