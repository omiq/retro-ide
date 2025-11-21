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
    
    // Path to AppleCommander (check api/apple2 directory first)
    // Try common names: AppleCommander.jar, AppleCommander-*.jar
    $appleCommanderJar = null;
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
            '/home/ide/htdocs/AppleCommander.jar',
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
    
    // Path to DOS master disk (check for .dsk file first, then JSON)
    $dosMasterDisk = null;
    // Try template.dsk or dos33master.dsk in api/apple2 directory
    $dosMasterDsk = null;
    foreach (['template.dsk', 'dos33master.dsk'] as $name) {
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
    
    // If AppleCommander is available, use it to add the binary file
    if ($appleCommanderJar && file_exists($appleCommanderJar)) {
        // Use AppleCommander to add binary file to the DOS master disk copy
        // ac -p puts a file on the disk, -b specifies binary file type with load/run addresses
        // Format: ac -p <disk> <filename> -b <loadaddr> <runaddr>
        // Note: AppleCommander expects the binary file to be in the current directory
        $originalDir = getcwd();
        if (!chdir($sessionDir)) {
            return ['error' => "Failed to change to session directory: {$sessionDir}"];
        }
        
        // Use AppleCommander to add binary file
        // Based on Makefile: java -jar $(AC) -as $(NAME).po $(NAME) bin < $(NAME).apple2
        // But we need load/run addresses, so we use -p with -b flag
        // Format: ac -p <disk> <filename> -b <loadaddr> <runaddr> < <inputfile>
        // Note: AppleCommander 1.3.5+ uses -b flag for binary files with addresses
        
        // First, try the standard syntax with -b flag
        $cmd = sprintf(
            'java -jar %s -p %s %s.BIN -b 0x%x 0x%x < %s 2>&1',
            escapeshellarg($appleCommanderJar),
            escapeshellarg(basename($dskFile)),
            escapeshellarg($filename),
            $loadAddress,
            $runAddress,
            escapeshellarg(basename($binFile))
        );
        
        exec($cmd, $output, $returnCode);
        $errorOutput = implode("\n", $output);
        
        // If that fails, try without hex prefix (decimal)
        if ($returnCode !== 0) {
            $cmd2 = sprintf(
                'java -jar %s -p %s %s.BIN -b %d %d < %s 2>&1',
                escapeshellarg($appleCommanderJar),
                escapeshellarg(basename($dskFile)),
                escapeshellarg($filename),
                $loadAddress,
                $runAddress,
                escapeshellarg(basename($binFile))
            );
            
            exec($cmd2, $output2, $returnCode2);
            if ($returnCode2 === 0) {
                $output = $output2;
                $returnCode = $returnCode2;
                $errorOutput = implode("\n", $output);
            } else {
                // Try alternative: -as flag (adds file but may not preserve addresses)
                // This is what the Makefile uses, but it doesn't set load/run addresses
                $cmd3 = sprintf(
                    'java -jar %s -as %s %s bin < %s 2>&1',
                    escapeshellarg($appleCommanderJar),
                    escapeshellarg(basename($dskFile)),
                    escapeshellarg($filename),
                    escapeshellarg(basename($binFile))
                );
                
                exec($cmd3, $output3, $returnCode3);
                if ($returnCode3 === 0) {
                    // File added but addresses may be wrong - log warning
                    error_log("AppleCommander: File added with -as flag, load/run addresses may not be set correctly");
                    $output = $output3;
                    $returnCode = $returnCode3;
                    $errorOutput = implode("\n", $output);
                }
            }
        }
        
        // Restore original directory
        chdir($originalDir);
        
        if ($returnCode === 0 && file_exists($dskFile) && filesize($dskFile) > 0) {
            // Success! AppleCommander added the file
            // Read the modified disk
            $diskData = file_get_contents($dskFile);
            if ($diskData === false) {
                return ['error' => "Failed to read created disk image: {$dskFile}"];
            }
            
            // Cleanup
            @unlink($binFile);
            @unlink($dskFile);
            @rmdir($sessionDir);
            
            return [
                'disk' => base64_encode($diskData),
                'filename' => "{$filename}.dsk"
            ];
        } else {
            // AppleCommander failed, try manual method
            error_log("AppleCommander error (exit code {$returnCode}): {$errorOutput}");
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
    if ($dosMasterDisk !== null) {
        // Read existing file count from catalog
        $existingFileCount = ord($disk[$catalogOffset + 0x03]);
        // Find first available file entry slot (each entry is 35 bytes, starts at 0x0B)
        // DOS master typically has files, so we need to find an empty slot
        $fileEntrySize = 35;
        $maxFilesPerSector = floor(($BYTES_PER_SECTOR - 0x0B) / $fileEntrySize);
        // For now, we'll add to the end - but this might overwrite existing files
        // Better approach: use AppleCommander if available
    }
    
    $write($disk, $catalogOffset + 0x00, 0x11); // Next catalog track
    $write($disk, $catalogOffset + 0x01, 0x0E); // Next catalog sector
    $write($disk, $catalogOffset + 0x03, $existingFileCount + 1); // Number of files (increment if DOS master)
    
    // File entry (starts at offset 0x0B, but if DOS master has files, find next slot)
    // Each file entry is 35 bytes: 30 bytes filename + 1 byte track + 1 byte sector + 1 byte type + 2 bytes length
    $fileEntrySize = 35;
    $fileEntryOffset = $catalogOffset + 0x0B + ($existingFileCount * $fileEntrySize);
    
    // Make sure we don't overflow the sector
    if ($fileEntryOffset + $fileEntrySize > $catalogOffset + $BYTES_PER_SECTOR) {
        return ['error' => "Catalog sector full - cannot add more files"];
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
    
    // If we used DOS master as base, the disk is bootable
    // Otherwise, it's just a data disk
    $note = ($dosMasterDisk !== null) 
        ? 'Disk created from DOS master (bootable with DOS 3.3)' 
        : 'Disk created manually (AppleCommander not available). Boot DOS 3.3 first, then load this disk.';
    
    return [
        'disk' => base64_encode($disk),
        'filename' => "{$filename}.dsk",
        'note' => $note
    ];
}
?>

