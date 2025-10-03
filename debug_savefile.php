<?php
// debug_savefile.php - Debug version of savefile.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

$debug = [];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['error' => 'Method not allowed']));
}

$content = $_POST['content'] ?? '';
$session = $_POST['session'] ?? '';
$file = $_POST['file'] ?? '';

$debug['content_length'] = strlen($content);
$debug['session'] = $session;
$debug['file'] = $file;

if (empty($content) || empty($session) || empty($file)) {
    http_response_code(400);
    exit(json_encode(['error' => 'Missing parameters', 'debug' => $debug]));
}

// Security: only allow alphanumeric characters
if (!preg_match('/^[a-zA-Z0-9_-]+$/', $session) || !preg_match('/^[a-zA-Z0-9_.-]+$/', $file)) {
    http_response_code(403);
    exit(json_encode(['error' => 'Invalid characters', 'debug' => $debug]));
}

// Create userfiles directory if it doesn't exist
$userfilesDir = '/tmp/userfiles';
$debug['userfiles_dir_exists'] = is_dir($userfilesDir);
$debug['userfiles_dir_writable'] = is_writable($userfilesDir);

if (!is_dir($userfilesDir)) {
    $debug['mkdir_userfiles'] = mkdir($userfilesDir, 0755, true);
}

$sessionDir = $userfilesDir . '/' . $session;
$debug['session_dir_exists'] = is_dir($sessionDir);
$debug['session_dir_writable'] = is_writable($sessionDir);

if (!is_dir($sessionDir)) {
    $debug['mkdir_session'] = mkdir($sessionDir, 0755, true);
}

$filePath = $sessionDir . '/' . $file;
$debug['file_path'] = $filePath;
$debug['file_path_writable'] = is_writable(dirname($filePath));

// Save the file
$result = file_put_contents($filePath, $content);
$debug['file_put_contents_result'] = $result;
$debug['file_exists_after'] = file_exists($filePath);

if ($result === false) {
    http_response_code(500);
    exit(json_encode(['error' => 'Failed to save file', 'debug' => $debug]));
}

echo json_encode(['success' => true, 'path' => $filePath, 'debug' => $debug]);
?>
