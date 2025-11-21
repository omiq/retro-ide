<?php
// api/apple2/serve_disk.php - Create and serve temporary .dsk files as static files
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
    exit(json_encode(['error' => 'Method not allowed. Use POST to create disk files.']));
}

// Create disk from POST data
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data || !isset($data['disk'])) {
    http_response_code(400);
    exit(json_encode(['error' => 'Missing disk data']));
}

// Decode base64 disk data
$diskData = base64_decode($data['disk']);
if ($diskData === false) {
    http_response_code(400);
    exit(json_encode(['error' => 'Invalid base64 disk data']));
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
        http_response_code(500);
        exit(json_encode(['error' => 'Failed to create disks directory']));
    }
    // Add .htaccess for CORS headers on static files
    $htaccessContent = "# Add CORS headers for .dsk files\n";
    $htaccessContent .= "<IfModule mod_headers.c>\n";
    $htaccessContent .= "    Header set Access-Control-Allow-Origin \"*\"\n";
    $htaccessContent .= "    Header set Access-Control-Allow-Methods \"GET, HEAD, OPTIONS\"\n";
    $htaccessContent .= "    Header set Access-Control-Allow-Headers \"Content-Type\"\n";
    $htaccessContent .= "</IfModule>\n";
    @file_put_contents($disksDir . '/.htaccess', $htaccessContent);
}

// Create unique filename without dots (to avoid extension detection issues)
// Format: disk_TIMESTAMP_HEX.dsk
$fileId = 'disk_' . time() . '_' . bin2hex(random_bytes(8));
$diskFilename = $fileId . '.dsk';
$diskPath = $disksDir . '/' . $diskFilename;

// Write disk file
if (file_put_contents($diskPath, $diskData) === false) {
    http_response_code(500);
    exit(json_encode(['error' => 'Failed to write disk file']));
}

// Generate URL to the static file
$protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'];
$scriptPath = dirname($_SERVER['SCRIPT_NAME']);
// Ensure path ends with /api/apple2
if (!preg_match('/\/api\/apple2$/', $scriptPath)) {
    $scriptPath = '/api/apple2';
}
$baseUrl = $protocol . '://' . $host . $scriptPath;
// URL points directly to the static .dsk file
$serveUrl = $baseUrl . '/disks/' . $diskFilename;

exit(json_encode([
    'url' => $serveUrl,
    'filename' => $filename,
    'size' => strlen($diskData),
    'fileId' => $fileId
]));
?>
