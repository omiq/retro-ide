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

// Tokenize BASIC using zmakebas
$result = tokenizeBasic($basic, $sessionID);

echo json_encode($result);

/**
 * Tokenize ZX Spectrum BASIC code using zmakebas
 */
function tokenizeBasic($basic, $sessionID) {
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
 * Parse zmakebas error output into structured error array
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
