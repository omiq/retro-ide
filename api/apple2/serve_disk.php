<?php
// api/apple2/serve_disk.php - Serve disk image with .dsk extension for doLoadHTTP
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Create disk from POST data
    header('Content-Type: application/json');
    
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
    
    // Create temporary file with .dsk extension
    $tempDir = sys_get_temp_dir();
    $filename = isset($data['filename']) ? $data['filename'] : 'disk.dsk';
    // Ensure .dsk extension
    if (!preg_match('/\.dsk$/i', $filename)) {
        $filename = preg_replace('/\.[^.]+$/', '', $filename) . '.dsk';
    }
    
    // Create unique file ID without dots (to avoid extension detection issues)
    // Use timestamp + random to ensure uniqueness
    $fileId = 'disk_' . time() . '_' . bin2hex(random_bytes(8));
    $tempFile = $tempDir . '/apple2_disk_' . $fileId . '.dsk';
    file_put_contents($tempFile, $diskData);
    
    // Generate URL to serve this file
    // Put .dsk in the path so doLoadHTTP can detect it via split
    // Format: /serve_disk.php/disk_ID.dsk
    $protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    $scriptPath = dirname($_SERVER['SCRIPT_NAME']);
    // Ensure path ends with /api/apple2
    if (!preg_match('/\/api\/apple2$/', $scriptPath)) {
        $scriptPath = '/api/apple2';
    }
    $baseUrl = $protocol . '://' . $host . $scriptPath;
    // Put file ID with .dsk extension in the path for extension detection
    $serveUrl = $baseUrl . '/serve_disk.php/' . $fileId . '.dsk';
    
    // Store file info in session or temp file (simple approach: use file modification time as cleanup signal)
    // For now, files will be cleaned up by the GET handler after 1 hour
    
    exit(json_encode([
        'url' => $serveUrl,
        'filename' => $filename,
        'size' => strlen($diskData)
    ]));
} else if ($_SERVER['REQUEST_METHOD'] === 'GET' || $_SERVER['REQUEST_METHOD'] === 'HEAD') {
    // Serve the disk file
    // URL format: /serve_disk.php/disk_ID.dsk
    // Extract file ID from path (everything before .dsk)
    $requestUri = $_SERVER['REQUEST_URI'];
    $pathInfo = isset($_SERVER['PATH_INFO']) ? $_SERVER['PATH_INFO'] : '';
    
    // Extract file ID from path
    if ($pathInfo) {
        // PATH_INFO format: /disk_ID.dsk
        $fileId = basename($pathInfo, '.dsk');
    } else {
        // Parse from REQUEST_URI: /serve_disk.php/disk_ID.dsk
        if (preg_match('/\/serve_disk\.php\/([^\/]+)\.dsk/', $requestUri, $matches)) {
            $fileId = $matches[1];
        } else {
            http_response_code(400);
            exit('Invalid URL format. Expected: /serve_disk.php/disk_ID.dsk');
        }
    }
    
    // Extract filename for Content-Disposition header
    $serveFilename = isset($_GET['filename']) ? $_GET['filename'] : 'disk.dsk';
    $tempDir = sys_get_temp_dir();
    $tempFile = $tempDir . '/apple2_disk_' . $fileId . '.dsk';
    
    if (!file_exists($tempFile)) {
        http_response_code(404);
        // Log for debugging (remove in production if needed)
        error_log("serve_disk.php: File not found - ID: $fileId, Path: $tempFile");
        exit('File not found');
    }
    
    // Check if file is too old (cleanup after 1 hour)
    if (time() - filemtime($tempFile) > 3600) {
        @unlink($tempFile);
        http_response_code(404);
        exit('File expired');
    }
    
    // Serve the file with proper headers
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="' . $serveFilename . '"');
    header('Content-Length: ' . filesize($tempFile));
    
    // Handle HEAD request (doLoadHTTP may check file first)
    if ($_SERVER['REQUEST_METHOD'] === 'HEAD') {
        exit();
    }
    
    readfile($tempFile);
    
    // Don't delete immediately - doLoadHTTP may make multiple requests
    // File will be cleaned up by expiration check on next request or by cron
    exit();
} else {
    http_response_code(405);
    exit('Method not allowed');
}
?>

