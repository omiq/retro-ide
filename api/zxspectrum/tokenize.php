<?php
// api/zxspectrum/tokenize.php - ZX Spectrum BASIC tokenization API endpoint
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
if (!isset($data['basic']) || !isset($data['sessionID'])) {
    http_response_code(400);
    exit(json_encode(['error' => 'Missing required fields: basic or sessionID']));
}

$basic = $data['basic'];
$sessionID = $data['sessionID'];

// Security: validate sessionID
if (!preg_match('/^[a-zA-Z0-9_-]+$/', $sessionID)) {
    http_response_code(403);
    exit(json_encode(['error' => 'Invalid sessionID']));
}

// Tokenize BASIC using borial basic (zxbc.py)
$result = tokenizeBasic($basic, $sessionID);

echo json_encode($result);

/**
 * Tokenize ZX Spectrum BASIC code using borial basic (zxbc.py)
 * This is faster than zmakebas as it compiles rather than just tokenizing
 */
function tokenizeBasic($basic, $sessionID) {
    // Create temp file paths
    $tempBas = "/tmp/zxspectrum-{$sessionID}.bas";
    $tempTap = "/tmp/zxspectrum-{$sessionID}.tap";
        
    // Write BASIC program to temporary file
    if (file_put_contents($tempBas, $basic) === false) {
        return ['errors' => [['line' => 0, 'msg' => "Failed to write temporary file: {$tempBas}", 'path' => '']]];
    }
    
    // Use borial basic (zxbc.py) from /home/ide/zxbasic
    $zxbcDir = '/home/ide/zxbasic';
    $zxbcPath = $zxbcDir . '/zxbc.py';
    
    // Check if Python is available
    $pythonPath = '/usr/bin/python3';
    if (!file_exists($pythonPath)) {
        $pythonPath = '/usr/bin/python';
        if (!file_exists($pythonPath)) {
            $pythonPath = 'python3';
        }
    }
    
    // Run zxbc.py from its directory with PYTHONPATH set so imports work correctly
    // The src directory exists in /home/ide/zxbasic/src, so PYTHONPATH should include /home/ide/zxbasic
    // Change to zxbasic directory and run: python3 zxbc.py -o output.tap input.bas -f tap --BASIC --autorun
    // Use absolute paths for input/output files since we're changing directory
    
    // Set PYTHONPATH to include the zxbasic directory so Python can find the 'src' module
    // Also set HOME to avoid issues with user-specific Python paths
    $env = [
        'PYTHONPATH' => $zxbcDir,
        'PATH' => '/usr/local/bin:/usr/bin:/bin',
        'HOME' => '/tmp'
    ];
    
    // Build environment string for exec
    $envString = '';
    foreach ($env as $key => $value) {
        $envString .= sprintf('%s=%s ', $key, escapeshellarg($value));
    }
    
    // Run from zxbasic directory with PYTHONPATH set
    // Use exec with environment array for better environment variable handling
    // Change directory first, then run python with the script
    $cmd = sprintf(
        'cd %s && %s%s zxbc.py -o %s %s -f tap --BASIC --autorun 2>&1',
        escapeshellarg($zxbcDir),
        $envString,
        escapeshellarg($pythonPath),
        escapeshellarg($tempTap),
        escapeshellarg($tempBas)
    );
    
    exec($cmd, $output, $returnCode);
    $errorOutput = implode("\n", $output);
    
    // Clean up temp BASIC file
    if (file_exists($tempBas)) {
        unlink($tempBas);
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
        $errors = parseZxbcErrors($errorOutput);
        // If no errors parsed, include the full error output
        if (empty($errors) && !empty(trim($errorOutput))) {
            $errors[] = [
                'line' => 0,
                'msg' => "zxbc.py error: " . trim($errorOutput),
                'path' => ''
            ];
        }
        return ['errors' => $errors];
    }
}

/**
 * Legacy function: Tokenize ZX Spectrum BASIC code using zmakebas
 * Kept as backup in case zxbc.py is not available
 */
function tokenizeBasicZmakebas($basic, $sessionID) {
    // Create temp file paths
    $tempBas = "/tmp/zxspectrum-{$sessionID}.bas";
    $tempTap = "/tmp/zxspectrum-{$sessionID}.tap";
        
    // Write BASIC program to temporary file
    if (file_put_contents($tempBas, $basic) === false) {
        return ['errors' => [['line' => 0, 'msg' => "Failed to write temporary file: {$tempBas}", 'path' => '']]];
    }
    
    // Find zmakebas executable
    $zmakebasPath = '/home/ide/htdocs/zmakebas/zmakebas';
    if (!file_exists($zmakebasPath)) {
        // Try alternative locations
        $zmakebasPath = __DIR__ . '/../../../zmakebas/zmakebas';
        if (!file_exists($zmakebasPath)) {
            // Try in PATH
            $zmakebasPath = 'zmakebas';
        }
    }
    
    // Run zmakebas: zmakebas -o output.tap input.bas
    $cmd = sprintf(
        '%s -o %s %s 2>&1',
        escapeshellarg($zmakebasPath),
        escapeshellarg($tempTap),
        escapeshellarg($tempBas)
    );
    
    exec($cmd, $output, $returnCode);
    $errorOutput = implode("\n", $output);
    
    // Clean up temp BASIC file
    if (file_exists($tempBas)) {
        unlink($tempBas);
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
        $errors = parseZmakebasErrors($errorOutput);
        return ['errors' => $errors];
    }
}

/**
 * Parse zxbc.py error output into structured error array
 */
function parseZxbcErrors($errorOutput) {
    $errors = [];
    $lines = explode("\n", $errorOutput);
    
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line)) {
            continue;
        }
        
        // Try to parse line number from error messages
        // zxbc.py error format may vary, but often includes line numbers
        if (preg_match('/line\s+(\d+)/i', $line, $matches)) {
            $errors[] = [
                'line' => (int)$matches[1],
                'msg' => $line,
                'path' => ''
            ];
        } elseif (preg_match('/error|warning|fatal|syntax/i', $line)) {
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

/**
 * Parse zmakebas error output into structured error array
 * Kept for legacy support
 */
function parseZmakebasErrors($errorOutput) {
    $errors = [];
    $lines = explode("\n", $errorOutput);
    
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line)) {
            continue;
        }
        
        // Try to parse line number from error messages
        // zmakebas error format varies, but often includes line numbers
        if (preg_match('/line\s+(\d+)/i', $line, $matches)) {
            $errors[] = [
                'line' => (int)$matches[1],
                'msg' => $line,
                'path' => ''
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
