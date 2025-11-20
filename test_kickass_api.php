<?php
// test_kickass_api.php - Test script for KickAss API endpoint
header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
    <title>KickAss API Test</title>
    <style>
        body {
            font-family: monospace;
            max-width: 1200px;
            margin: 20px auto;
            padding: 20px;
            background: #1e1e1e;
            color: #d4d4d4;
        }
        h1 { color: #4ec9b0; }
        h2 { color: #569cd6; margin-top: 30px; }
        .test-section {
            background: #252526;
            padding: 15px;
            margin: 15px 0;
            border-radius: 5px;
            border: 1px solid #3e3e42;
        }
        .success { color: #4ec9b0; }
        .error { color: #f48771; }
        .info { color: #569cd6; }
        pre {
            background: #1e1e1e;
            padding: 10px;
            border-radius: 3px;
            overflow-x: auto;
            border: 1px solid #3e3e42;
        }
        button {
            background: #0e639c;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 14px;
            margin: 5px;
        }
        button:hover {
            background: #1177bb;
        }
        .result {
            margin-top: 10px;
            padding: 10px;
            border-radius: 3px;
        }
        .result.success {
            background: #1e3a1e;
            border: 1px solid #4ec9b0;
        }
        .result.error {
            background: #3a1e1e;
            border: 1px solid #f48771;
        }
    </style>
</head>
<body>
    <h1>🧪 KickAss API Test</h1>
    
    <div class="test-section">
        <h2>Test 1: Simple C64 Program</h2>
        <p class="info">Tests compilation of a basic C64 program that changes border color.</p>
        <button onclick="testSimple()">Run Test</button>
        <div id="result1" class="result" style="display:none;"></div>
    </div>
    
    <div class="test-section">
        <h2>Test 2: Program with Error</h2>
        <p class="info">Tests error handling with invalid assembly code.</p>
        <button onclick="testError()">Run Test</button>
        <div id="result2" class="result" style="display:none;"></div>
    </div>
    
    <div class="test-section">
        <h2>Test 3: Custom Program</h2>
        <p class="info">Test with custom assembly code.</p>
        <textarea id="customCode" style="width:100%;height:150px;background:#1e1e1e;color:#d4d4d4;border:1px solid #3e3e42;padding:10px;font-family:monospace;">
BasicUpstart2(start)
start:
  lda #$01
  sta $d020
  rts</textarea>
        <br>
        <button onclick="testCustom()">Run Test</button>
        <div id="result3" class="result" style="display:none;"></div>
    </div>

    <script>
        const API_URL = 'api/kickass/compile.php';
        
        function showResult(elementId, success, data) {
            const resultDiv = document.getElementById(elementId);
            resultDiv.style.display = 'block';
            resultDiv.className = 'result ' + (success ? 'success' : 'error');
            resultDiv.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
        }
        
        async function testSimple() {
            const testData = {
                buildStep: {
                    path: "hello.asm",
                    files: ["hello.asm"],
                    platform: "c64",
                    tool: "kickass",
                    mainfile: true
                },
                updates: [
                    {
                        path: "hello.asm",
                        data: "BasicUpstart2(start)\nstart:\n  lda #$01\n  sta $d020\n  rts"
                    }
                ],
                sessionID: "test_" + Date.now()
            };
            
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(testData)
                });
                
                const result = await response.json();
                showResult('result1', response.ok && result.output, result);
            } catch (error) {
                showResult('result1', false, { error: error.message });
            }
        }
        
        async function testError() {
            const testData = {
                buildStep: {
                    path: "error.asm",
                    files: ["error.asm"],
                    platform: "c64",
                    tool: "kickass",
                    mainfile: true
                },
                updates: [
                    {
                        path: "error.asm",
                        data: "BasicUpstart2(start)\nstart:\n  invalid_instruction\n  rts"
                    }
                ],
                sessionID: "test_error_" + Date.now()
            };
            
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(testData)
                });
                
                const result = await response.json();
                // Error response is expected, so success = has errors array
                showResult('result2', result.errors && result.errors.length > 0, result);
            } catch (error) {
                showResult('result2', false, { error: error.message });
            }
        }
        
        async function testCustom() {
            const code = document.getElementById('customCode').value;
            const testData = {
                buildStep: {
                    path: "custom.asm",
                    files: ["custom.asm"],
                    platform: "c64",
                    tool: "kickass",
                    mainfile: true
                },
                updates: [
                    {
                        path: "custom.asm",
                        data: code
                    }
                ],
                sessionID: "test_custom_" + Date.now()
            };
            
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(testData)
                });
                
                const result = await response.json();
                showResult('result3', response.ok && result.output, result);
            } catch (error) {
                showResult('result3', false, { error: error.message });
            }
        }
    </script>
</body>
</html>

