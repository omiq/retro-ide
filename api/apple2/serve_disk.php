<?php
// api/apple2/serve_disk.php - Create and serve temporary .dsk files as static files
// Enable error reporting for debugging (remove in production if needed)
error_reporting(E_ALL);
ini_set('display_errors', 0); // Don't display errors, but log them
ini_set('log_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Error handler to return JSON errors
function jsonError($message, $code = 500) {
    http_response_code($code);
    exit(json_encode(['error' => $message]));
}

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed. Use POST to create disk files.', 405);
}

// Create disk from POST data
$input = file_get_contents('php://input');
if ($input === false) {
    jsonError('Failed to read request body');
}

$data = json_decode($input, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    jsonError('Invalid JSON: ' . json_last_error_msg(), 400);
}

if (!$data || !isset($data['disk'])) {
    jsonError('Missing disk data', 400);
}

// Decode base64 disk data
$diskData = base64_decode($data['disk'], true); // strict mode
if ($diskData === false) {
    jsonError('Invalid base64 disk data', 400);
}

// Get filename from request or use default
$filename = isset($data['filename']) ? $data['filename'] : 'disk.dsk';
// Ensure .dsk extension
if (!preg_match('/\.dsk$/i', $filename)) {
    $filename = preg_replace('/\.[^.]+$/', '', $filename) . '.dsk';
}

// Create web-accessible directory for disk files
$scriptDir = __DIR__; // Directory where this PHP file is located
$disksDir = $scriptDir . '/disks';

// Create disks directory if it doesn't exist
if (!is_dir($disksDir)) {
    if (!mkdir($disksDir, 0755, true)) {
        $error = error_get_last();
        jsonError('Failed to create disks directory: ' . ($error ? $error['message'] : 'Unknown error') . ' (Path: ' . $disksDir . ')');
    }
}

// Check if directory is writable
if (!is_writable($disksDir)) {
    jsonError('Disks directory is not writable: ' . $disksDir);
}

// Create unique filename without dots (to avoid extension detection issues)
// Format: disk_TIMESTAMP_HEX.dsk
$fileId = 'disk_' . time() . '_' . bin2hex(random_bytes(8));
$diskFilename = $fileId . '.dsk';
$diskPath = $disksDir . '/' . $diskFilename;

// Write disk file
$bytesWritten = @file_put_contents($diskPath, $diskData);
if ($bytesWritten === false) {
    $error = error_get_last();
    jsonError('Failed to write disk file: ' . ($error ? $error['message'] : 'Unknown error') . ' (Path: ' . $diskPath . ')');
}

if ($bytesWritten !== strlen($diskData)) {
    jsonError('Disk file write incomplete: wrote ' . $bytesWritten . ' of ' . strlen($diskData) . ' bytes');
}

// Generate URL to serve the file through PHP (for CORS headers)
$protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'];
$scriptPath = dirname($_SERVER['SCRIPT_NAME']);
// Ensure path ends with /api/apple2
if (!preg_match('/\/api\/apple2$/', $scriptPath)) {
    $scriptPath = '/api/apple2';
}
$baseUrl = $protocol . '://' . $host . $scriptPath;
// URL points to PHP script that serves the file with CORS headers
// Format: /get_disk.php/disk_ID.dsk (so .dsk is in the path for extension detection)
$serveUrl = $baseUrl . '/get_disk.php/' . $diskFilename;

exit(json_encode([
    'url' => $serveUrl,
    'filename' => $filename,
    'size' => strlen($diskData),
    'fileId' => $fileId
]));
?>
