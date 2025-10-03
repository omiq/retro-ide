<?php
// test_simple.php - Simple test to see if PHP is working
header('Content-Type: text/plain');
header('Access-Control-Allow-Origin: *');

echo "PHP is working!\n";
echo "Current directory: " . getcwd() . "\n";
echo "PHP version: " . phpversion() . "\n";

// Test if we can write to the userfiles directory
$userfilesDir = '/tmp/userfiles';
echo "Testing userfiles directory: $userfilesDir\n";

if (!is_dir($userfilesDir)) {
    echo "Directory does not exist, creating...\n";
    if (mkdir($userfilesDir, 0755, true)) {
        echo "Directory created successfully\n";
    } else {
        echo "Failed to create directory\n";
    }
} else {
    echo "Directory exists\n";
}

// Test write permissions
$testFile = $userfilesDir . '/test.txt';
echo "Testing write to: $testFile\n";

if (file_put_contents($testFile, 'test content') !== false) {
    echo "Write successful\n";
    unlink($testFile); // Clean up
} else {
    echo "Write failed\n";
}
?>
