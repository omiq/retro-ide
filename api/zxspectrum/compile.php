<?php
// api/zxspectrum/compile.php - ZX Spectrum C compilation API endpoint using z88dk
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
if (!isset($data['source']) || !isset($data['sessionID'])) {
    http_response_code(400);
    exit(json_encode(['error' => 'Missing required fields: source or sessionID']));
}

$source = $data['source'];
$sessionID = $data['sessionID'];

// Security: validate sessionID
if (!preg_match('/^[a-zA-Z0-9_-]+$/', $sessionID)) {
    http_response_code(403);
    exit(json_encode(['error' => 'Invalid sessionID']));
}

// Compile C source using z88dk
$result = compileC($source, $sessionID);

echo json_encode($result);

/**
 * Compile ZX Spectrum C code using z88dk
 */
function compileC($source, $sessionID) {
    // Create temp file paths
    $tempC = "/tmp/zxspectrum-{$sessionID}.c";
    $tempOut = "/tmp/zxspectrum-{$sessionID}";
    $tempTap = "/tmp/zxspectrum-{$sessionID}.tap";
        
    // Write C source to temporary file
    if (file_put_contents($tempC, $source) === false) {
        return ['errors' => [['line' => 0, 'msg' => "Failed to write temporary file: {$tempC}", 'path' => '']]];
    }
    
    // Find zcc executable (z88dk compiler) and its base directory
    // We need to find both the binary and set ZCCCFG to point to the config directory
    $zccPath = null;
    $zccBaseDir = null;
    
    // Method 1: Try to find the actual binary in snap directory
    // Snaps are installed in /snap/[package]/current/ or /snap/[package]/[revision]/
    $snapDirs = [
        '/snap/z88dk/current',
    ];
    
    // Check common snap revision directories
    if (is_dir('/snap/z88dk')) {
        $revisions = scandir('/snap/z88dk');
        foreach ($revisions as $rev) {
            if ($rev !== '.' && $rev !== '..' && is_numeric($rev)) {
                $snapDirs[] = "/snap/z88dk/$rev";
            }
        }
    }
    
    // Find the binary and base directory
    foreach ($snapDirs as $baseDir) {
        $possiblePaths = [
            "$baseDir/bin/zcc",
            "$baseDir/usr/bin/zcc",
        ];
        foreach ($possiblePaths as $path) {
            if (file_exists($path) && is_executable($path)) {
                $zccPath = $path;
                $zccBaseDir = $baseDir;
                break 2; // Break out of both loops
            }
        }
    }
    
    // Method 2: Try snap run (may work in some configurations)
    if (!$zccPath && file_exists('/usr/bin/snap')) {
        // Check if z88dk snap is installed
        exec('/usr/bin/snap list z88dk 2>&1', $snapListOutput, $snapListCode);
        if ($snapListCode === 0) {
            // Try snap run - but this may still fail with cgroup error
            $zccPath = '/usr/bin/snap run z88dk.zcc';
            // For snap run, we don't need to set ZCCCFG as snap handles it
        }
    }
    
    // Fallback: try direct snap binary path (likely to fail with cgroup error)
    if (!$zccPath && file_exists('/snap/bin/zcc')) {
        $zccPath = '/snap/bin/zcc';
    }
    
    // Fallback: try system installation
    if (!$zccPath && file_exists('/usr/bin/zcc')) {
        $zccPath = '/usr/bin/zcc';
    }
    
    // Final fallback: try in PATH
    if (!$zccPath) {
        $zccPath = 'zcc';
    }
    
    // Run zcc: zcc +zx -startup=1 -clib=sdcc_iy -O3 -create-app -o output input.c
    // +zx = ZX Spectrum target
    // -startup=1 = use startup code
    // -clib=sdcc_iy = use SDCC library with IY register
    // -O3 = optimize level 3
    // -create-app = create a TAP file directly
    
    // Set environment variables for snap to work with www-data user
    // SNAP_USER_DATA tells snap where to store user data
    // ZCCCFG tells z88dk where to find its configuration files
    $env = [
        'SNAP_USER_DATA' => '/tmp/snap-www-data',
        'HOME' => '/tmp/snap-www-data',
        'PATH' => '/snap/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
    ];
    
    // If we found the snap base directory, set ZCCCFG to point to the config directory
    if ($zccBaseDir) {
        $configDirs = [
            "$zccBaseDir/lib/config",
            "$zccBaseDir/usr/lib/z88dk/lib/config",
            "$zccBaseDir/lib/z88dk/lib/config",
        ];
        foreach ($configDirs as $configDir) {
            if (is_dir($configDir)) {
                $env['ZCCCFG'] = $configDir;
                break;
            }
        }
    }
    
    // Build environment string for exec
    $envString = '';
    foreach ($env as $key => $value) {
        $envString .= sprintf('%s=%s ', $key, escapeshellarg($value));
    }
    
    // Change to the snap directory if we found it, so relative paths work
    $cmd = '';
    if ($zccBaseDir) {
        $cmd = sprintf('cd %s && ', escapeshellarg($zccBaseDir));
    }
    
    $cmd .= sprintf(
        '%s%s +zx -startup=1 -clib=sdcc_iy -O3 -create-app -o %s %s 2>&1',
        $envString,
        escapeshellarg($zccPath),
        escapeshellarg($tempOut),
        escapeshellarg($tempC)
    );
    
    exec($cmd, $output, $returnCode);
    $errorOutput = implode("\n", $output);
    
    // Clean up temp C file
    if (file_exists($tempC)) {
        unlink($tempC);
    }
    
    // Clean up any other temp files z88dk might create (except .tap)
    $tempDir = dirname($tempOut);
    $baseName = basename($tempOut);
    if ($handle = opendir($tempDir)) {
        while (false !== ($file = readdir($handle))) {
            if (strpos($file, $baseName) === 0 && $file !== $baseName . '.tap') {
                $filePath = $tempDir . '/' . $file;
                if (is_file($filePath)) {
                    unlink($filePath);
                }
            }
        }
        closedir($handle);
    }
    
    if ($returnCode === 0 && file_exists($tempTap)) {
        // Success - read TAP file
        $tapData = file_get_contents($tempTap);
        if ($tapData === false) {
            // Clean up temp TAP file
            if (file_exists($tempTap)) {
                unlink($tempTap);
            }
            return ['errors' => [['line' => 0, 'msg' => "Failed to read output file: {$tempTap}", 'path' => '']]];
        }
        
        // Convert to base64
        $outputBase64 = base64_encode($tapData);
        
        // Clean up temp TAP file
        if (file_exists($tempTap)) {
            unlink($tempTap);
        }
        
        return [
            'output' => $outputBase64
        ];
    } else {
        // Error - parse error messages
        $errors = parseZccErrors($errorOutput);
        return ['errors' => $errors];
    }
}

/**
 * Parse zcc error output into structured error array
 */
function parseZccErrors($errorOutput) {
    $errors = [];
    $lines = explode("\n", $errorOutput);
    
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line)) {
            continue;
        }
        
        // Try to parse line number from error messages
        // zcc/SDCC error format: filename:line:error message
        // Example: main.c:5:2: error: syntax error
        if (preg_match('/^([^:]+):(\d+):(\d+)?:\s*(.+)$/', $line, $matches)) {
            $errors[] = [
                'line' => (int)$matches[2],
                'msg' => trim($matches[4]),
                'path' => basename($matches[1])
            ];
        } elseif (preg_match('/^([^:]+):(\d+):\s*(.+)$/', $line, $matches)) {
            // Alternative format: filename:line: error message
            $errors[] = [
                'line' => (int)$matches[2],
                'msg' => trim($matches[3]),
                'path' => basename($matches[1])
            ];
        } elseif (preg_match('/error|warning|fatal/i', $line)) {
            // Generic error/warning line
            $errors[] = [
                'line' => 0,
                'msg' => $line,
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
?>

