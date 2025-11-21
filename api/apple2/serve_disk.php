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
    
    // Create unique file ID
    $fileId = uniqid('disk_', true);
    $tempFile = $tempDir . '/apple2_disk_' . $fileId . '.dsk';
    file_put_contents($tempFile, $diskData);
    
    // Generate URL to serve this file
    $baseUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . 
               '://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['SCRIPT_NAME']);
    $serveUrl = $baseUrl . '/serve_disk.php?id=' . $fileId . '&filename=' . urlencode($filename);
    
    // Store file info in session or temp file (simple approach: use file modification time as cleanup signal)
    // For now, files will be cleaned up by the GET handler after 1 hour
    
    exit(json_encode([
        'url' => $serveUrl,
        'filename' => $filename,
        'size' => strlen($diskData)
    ]));
} else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Serve the disk file
    if (!isset($_GET['id'])) {
        http_response_code(400);
        exit('Missing file ID');
    }
    
    $fileId = $_GET['id'];
    $tempDir = sys_get_temp_dir();
    $tempFile = $tempDir . '/apple2_disk_' . $fileId . '.dsk';
    
    if (!file_exists($tempFile)) {
        http_response_code(404);
        exit('File not found');
    }
    
    // Check if file is too old (cleanup after 1 hour)
    if (time() - filemtime($tempFile) > 3600) {
        @unlink($tempFile);
        http_response_code(404);
        exit('File expired');
    }
    
    // Serve the file with proper headers
    $serveFilename = isset($_GET['filename']) ? $_GET['filename'] : 'disk.dsk';
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="' . $serveFilename . '"');
    header('Content-Length: ' . filesize($tempFile));
    readfile($tempFile);
    
    // Clean up after serving
    @unlink($tempFile);
    exit();
} else {
    http_response_code(405);
    exit('Method not allowed');
}
?>

