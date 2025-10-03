<?php
// userfile.php - Serve user BASIC files for jsbeeb loadBasic parameter
header('Content-Type: text/plain; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-cache, no-store, must-revalidate');

$sessionID = $_GET['session'] ?? '';
$filename = $_GET['file'] ?? '';

if (empty($sessionID) || empty($filename)) {
    http_response_code(400);
    exit('Missing parameters');
}

// Security: only allow alphanumeric characters and common file extensions
if (!preg_match('/^[a-zA-Z0-9_-]+$/', $sessionID) || !preg_match('/^[a-zA-Z0-9_.-]+$/', $filename)) {
    http_response_code(403);
    exit('Invalid characters');
}

// Create userfiles directory if it doesn't exist
$userfilesDir = '/tmp/userfiles';
if (!is_dir($userfilesDir)) {
    mkdir($userfilesDir, 0755, true);
}

$sessionDir = $userfilesDir . '/' . $sessionID;
if (!is_dir($sessionDir)) {
    mkdir($sessionDir, 0755, true);
}

$filePath = $sessionDir . '/' . $filename;

if (!file_exists($filePath)) {
    http_response_code(404);
    exit('File not found');
}

readfile($filePath);
?>
