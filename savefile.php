<?php
// savefile.php - Save user BASIC files
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['error' => 'Method not allowed']));
}

$content = $_POST['content'] ?? '';
$session = $_POST['session'] ?? '';
$file = $_POST['file'] ?? '';

if (empty($content) || empty($session) || empty($file)) {
    http_response_code(400);
    exit(json_encode(['error' => 'Missing parameters']));
}

// Security: only allow alphanumeric characters
if (!preg_match('/^[a-zA-Z0-9_-]+$/', $session) || !preg_match('/^[a-zA-Z0-9_.-]+$/', $file)) {
    http_response_code(403);
    exit(json_encode(['error' => 'Invalid characters']));
}

// Create userfiles directory if it doesn't exist
$userfilesDir = '/tmp/userfiles';
if (!is_dir($userfilesDir)) {
    mkdir($userfilesDir, 0755, true);
}

$sessionDir = $userfilesDir . '/' . $session;
if (!is_dir($sessionDir)) {
    mkdir($sessionDir, 0755, true);
}

$filePath = $sessionDir . '/' . $file;

// Save the file
if (file_put_contents($filePath, $content) === false) {
    http_response_code(500);
    exit(json_encode(['error' => 'Failed to save file']));
}

echo json_encode(['success' => true, 'path' => $filePath]);
?>
