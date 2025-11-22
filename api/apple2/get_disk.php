<?php
// api/apple2/get_disk.php - Serve disk files with CORS headers
// URL formats supported:
//   - /api/apple2/get_disk.php/disk_ID.dsk (PATH_INFO)
//   - /api/apple2/get_disk.php?file=disk_ID.dsk (query parameter)

// Set CORS headers FIRST - before any output or errors
// Use header_remove() to clear any existing headers that might interfere
header_remove('X-Powered-By');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, HEAD, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Expose-Headers: Content-Length, Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get the requested filename from multiple sources (try all methods)
$filename = null;

// Method 1: Query parameter (most reliable with nginx)
if (isset($_GET['file']) && !empty($_GET['file'])) {
    $filename = $_GET['file'];
}

// Method 2: PATH_INFO (if nginx is configured to pass it)
if (!$filename && isset($_SERVER['PATH_INFO']) && !empty($_SERVER['PATH_INFO'])) {
    $filename = basename($_SERVER['PATH_INFO']);
}

// Method 3: Parse from REQUEST_URI
if (!$filename && isset($_SERVER['REQUEST_URI'])) {
    $requestUri = $_SERVER['REQUEST_URI'];
    // Remove query string for parsing
    $requestPath = parse_url($requestUri, PHP_URL_PATH);
    if (preg_match('/\/get_disk\.php\/([^\/\?]+\.dsk)/', $requestPath, $matches)) {
        $filename = $matches[1];
    }
}

if (!$filename) {
    http_response_code(400);
    header('Content-Type: application/json');
    exit(json_encode(['error' => 'Invalid URL format. Expected: /get_disk.php/disk_ID.dsk or /get_disk.php?file=disk_ID.dsk']));
}

// Validate filename (must end in .dsk and match our pattern)
if (!preg_match('/^disk_\d+_[a-f0-9]+\.dsk$/', $filename)) {
    http_response_code(400);
    header('Content-Type: text/plain');
    exit('Invalid filename format');
}

// Get the full path to the file
$scriptDir = __DIR__;
$filePath = $scriptDir . '/disks/' . $filename;

// Check if file exists
if (!file_exists($filePath)) {
    http_response_code(404);
    header('Content-Type: text/plain');
    exit('File not found');
}

// Check if file is too old (cleanup after 1 hour)
if (time() - filemtime($filePath) > 3600) {
    @unlink($filePath);
    http_response_code(404);
    header('Content-Type: text/plain');
    exit('File expired');
}

// Serve the file with proper headers
header('Content-Type: application/octet-stream');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Content-Length: ' . filesize($filePath));

// Handle HEAD request (doLoadHTTP may check file first)
if ($_SERVER['REQUEST_METHOD'] === 'HEAD') {
    exit();
}

readfile($filePath);
exit();
?>

