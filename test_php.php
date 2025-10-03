<?php
// test_php.php - Simple test to debug PHP issues
header('Content-Type: text/plain');
header('Access-Control-Allow-Origin: *');

echo "PHP is working!\n";
echo "Current directory: " . getcwd() . "\n";
echo "PHP version: " . phpversion() . "\n";

// Test directory creation
$testDir = '/tmp/userfiles';
echo "Testing directory: $testDir\n";

if (!is_dir($testDir)) {
    echo "Directory does not exist, creating...\n";
    if (mkdir($testDir, 0755, true)) {
        echo "Directory created successfully\n";
    } else {
        echo "Failed to create directory\n";
    }
} else {
    echo "Directory exists\n";
}

// Test write permissions
$testFile = $testDir . '/test.txt';
echo "Testing write to: $testFile\n";

if (file_put_contents($testFile, 'test content') !== false) {
    echo "Write successful\n";
    unlink($testFile); // Clean up
} else {
    echo "Write failed\n";
}

// Test POST data
echo "\nPOST data:\n";
var_dump($_POST);

echo "\nGET data:\n";
var_dump($_GET);
?>
