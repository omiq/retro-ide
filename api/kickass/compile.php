<?php
// api/kickass/compile.php - KickAss Assembler compilation API endpoint
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
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
if (!isset($data['buildStep']) || !isset($data['updates']) || !isset($data['sessionID'])) {
    http_response_code(400);
    exit(json_encode(['error' => 'Missing required fields: buildStep, updates, or sessionID']));
}

$buildStep = $data['buildStep'];
$updates = $data['updates'];
$sessionID = $data['sessionID'];

// Security: validate sessionID
if (!preg_match('/^[a-zA-Z0-9_-]+$/', $sessionID)) {
    http_response_code(403);
    exit(json_encode(['error' => 'Invalid sessionID']));
}

// Validate buildStep
if (!isset($buildStep['path']) || !isset($buildStep['files']) || !isset($buildStep['platform']) || !isset($buildStep['tool'])) {
    http_response_code(400);
    exit(json_encode(['error' => 'Invalid buildStep structure']));
}

// Validate updates array
if (!is_array($updates) || empty($updates)) {
    http_response_code(400);
    exit(json_encode(['error' => 'updates must be a non-empty array']));
}

// Compile using KickAss
$result = compileKickAss($buildStep, $updates, $sessionID);

echo json_encode($result);

/**
 * Compile assembly code using KickAss assembler
 */
function compileKickAss($buildStep, $updates, $sessionID) {
    $sessionDir = "/tmp/kickass-{$sessionID}";
    
    // Create session directory
    if (!is_dir($sessionDir)) {
        if (!mkdir($sessionDir, 0777, true)) {
            return ['errors' => [['line' => 0, 'msg' => "Failed to create session directory: {$sessionDir}", 'path' => '']]];
        }
    }
    
    // Verify directory is writable
    if (!is_writable($sessionDir)) {
        return ['errors' => [['line' => 0, 'msg' => "Session directory is not writable: {$sessionDir}", 'path' => '']]];
    }
    
    // Write source files
    foreach ($updates as $update) {
        if (!isset($update['path']) || !isset($update['data'])) {
            return ['errors' => [['line' => 0, 'msg' => 'Invalid update structure', 'path' => '']]];
        }
        
        // Security: validate file path
        $path = $update['path'];
        if (preg_match('/[\/\\\\]/', $path) || preg_match('/\.\./', $path)) {
            return ['errors' => [['line' => 0, 'msg' => 'Invalid file path', 'path' => $path]]];
        }
        
        $data = $update['data'];
        
        // Handle base64-encoded binary data
        if (strpos($data, 'data:base64,') === 0) {
            $data = base64_decode(substr($data, 12));
            if ($data === false) {
                return ['errors' => [['line' => 0, 'msg' => 'Invalid base64 data', 'path' => $path]]];
            }
        }
        
        $filePath = "{$sessionDir}/{$path}";
        if (file_put_contents($filePath, $data) === false) {
            return ['errors' => [['line' => 0, 'msg' => "Failed to write file: {$path}", 'path' => $path]]];
        }
    }
    
    // Run KickAss from the session directory with relative paths
    $outputFile = "output.prg";
    $listFile = "output.lst";
    $symFile = "output.sym";
    $mainFile = $buildStep['path'];
    
    // Full paths for reading results later
    $outputFileFull = "{$sessionDir}/{$outputFile}";
    $listFileFull = "{$sessionDir}/{$listFile}";
    $symFileFull = "{$sessionDir}/{$symFile}";
    
    // KickAss.jar path (adjust if needed)
    $kickAssJar = '/home/ide/htdocs/KickAss.jar';
    if (!file_exists($kickAssJar)) {
        // Try alternative location
        $kickAssJar = __DIR__ . '/../../../KickAss.jar';
    }
    
    if (!file_exists($kickAssJar)) {
        return ['errors' => [['line' => 0, 'msg' => 'KickAss.jar not found', 'path' => '']]];
    }
    
    // Change to session directory and run KickAss with relative paths
    $originalDir = getcwd();
    if (!chdir($sessionDir)) {
        return ['errors' => [['line' => 0, 'msg' => "Failed to change to session directory: {$sessionDir}", 'path' => '']]];
    }
    
    // Verify main file exists
    if (!file_exists($mainFile)) {
        chdir($originalDir);
        return ['errors' => [['line' => 0, 'msg' => "Main file not found: {$mainFile}", 'path' => $mainFile]]];
    }
    
    $cmd = sprintf(
        'java -jar %s -o %s -vicesymbols -symbolfile %s -listfile %s %s 2>&1',
        escapeshellarg($kickAssJar),
        escapeshellarg($outputFile),
        escapeshellarg($symFile),
        escapeshellarg($listFile),
        escapeshellarg($mainFile)
    );
    
    exec($cmd, $output, $returnCode);
    $errorOutput = implode("\n", $output);
    
    // Restore original directory
    chdir($originalDir);
    
    if ($returnCode === 0 && file_exists($outputFileFull)) {
        // Success - read output
        $outputData = file_get_contents($outputFileFull);
        $outputBase64 = base64_encode($outputData);
        
        // Parse listings and symbols (optional)
        $listings = [];
        if (file_exists($listFileFull)) {
            $listings = parseListingFile($listFileFull);
        }
        
        $symbolmap = [];
        if (file_exists($symFileFull)) {
            $symbolmap = parseSymbolFile($symFileFull);
        }
        
        // Cleanup (optional - can be done later)
        // cleanupSessionDir($sessionDir);
        
        return [
            'output' => $outputBase64,
            'listings' => $listings,
            'symbolmap' => $symbolmap
        ];
    } else {
        // Error - parse error messages
        $errors = parseKickAssErrors($errorOutput);
        return ['errors' => $errors, 'listings' => []];
    }
}

/**
 * Parse KickAss error output into structured error array
 */
function parseKickAssErrors($errorOutput) {
    $errors = [];
    $lines = explode("\n", $errorOutput);
    
    foreach ($lines as $line) {
        // KickAss error format: "Error: File main.asm, line 5, column 10: Unknown instruction 'invalid'"
        if (preg_match('/Error:\s*File\s+([^,]+),\s*line\s+(\d+)(?:,\s*column\s+\d+)?:\s*(.+)/i', $line, $matches)) {
            $errors[] = [
                'line' => (int)$matches[2],
                'msg' => trim($matches[3]),
                'path' => basename($matches[1])
            ];
        } elseif (preg_match('/Error:\s*(.+)/i', $line, $matches)) {
            // Generic error without file/line info
            $errors[] = [
                'line' => 0,
                'msg' => trim($matches[1]),
                'path' => ''
            ];
        }
    }
    
    // If no structured errors found, return the whole output as one error
    if (empty($errors) && !empty(trim($errorOutput))) {
        $errors[] = [
            'line' => 0,
            'msg' => trim($errorOutput),
            'path' => ''
        ];
    }
    
    return $errors;
}

/**
 * Parse KickAss listing file
 * Returns map of listing file paths to listing objects
 */
function parseListingFile($listFile) {
    $listings = [];
    $content = file_get_contents($listFile);
    
    if ($content === false) {
        return $listings;
    }
    
    // For now, return basic structure
    // Full parsing can be implemented later
    $listings[basename($listFile)] = [
        'lines' => [],
        'text' => $content
    ];
    
    // TODO: Parse listing file to extract line mappings
    // Format: address | bytes | source line
    
    return $listings;
}

/**
 * Parse KickAss symbol file (VICE format)
 * Returns map of symbol names to addresses
 */
function parseSymbolFile($symFile) {
    $symbolmap = [];
    $content = file_get_contents($symFile);
    
    if ($content === false) {
        return $symbolmap;
    }
    
    // VICE symbol file format: "al 0000 label_name"
    // Format: <type> <address> <label>
    $lines = explode("\n", $content);
    
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || $line[0] === ';') {
            continue; // Skip comments and empty lines
        }
        
        // Parse: "al 0000 label_name" or "al $0000 label_name"
        if (preg_match('/^\w+\s+\$?([0-9a-fA-F]+)\s+(\w+)/', $line, $matches)) {
            $address = hexdec($matches[1]);
            $label = $matches[2];
            $symbolmap[$label] = $address;
        }
    }
    
    return $symbolmap;
}

/**
 * Cleanup session directory (optional)
 */
function cleanupSessionDir($sessionDir) {
    if (is_dir($sessionDir)) {
        $files = glob("{$sessionDir}/*");
        foreach ($files as $file) {
            if (is_file($file)) {
                unlink($file);
            }
        }
        rmdir($sessionDir);
    }
}
?>

