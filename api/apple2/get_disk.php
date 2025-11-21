<?php
// api/apple2/get_disk.php - Serve disk files with CORS headers
// URL format: /api/apple2/get_disk.php/disk_ID.dsk

// Set CORS headers first
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, HEAD, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get the requested filename from PATH_INFO or REQUEST_URI
$pathInfo = isset($_SERVER['PATH_INFO']) ? $_SERVER['PATH_INFO'] : '';
$requestUri = $_SERVER['REQUEST_URI'];

// Extract filename from path
$filename = null;
if ($pathInfo) {
    // PATH_INFO format: /disk_ID.dsk
    $filename = basename($pathInfo);
} else if ($requestUri) {
    // Parse from REQUEST_URI: /get_disk.php/disk_ID.dsk
    if (preg_match('/\/get_disk\.php\/([^\/\?]+\.dsk)/', $requestUri, $matches)) {
        $filename = $matches[1];
    }
}

if (!$filename) {
    http_response_code(400);
    header('Content-Type: text/plain');
    exit('Invalid URL format. Expected: /get_disk.php/disk_ID.dsk');
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

