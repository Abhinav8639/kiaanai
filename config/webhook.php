<?php
// Set headers for CORS and JSON response
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Replace with https://your-app.vercel.app in production
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Handle POST requests
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Get message from POST body
    $message = $_POST['message'] ?? '';

    // Default response
    $textResponse = 'I’m not sure how to respond to that. Can you tell me more?';
    $messageLower = strtolower($message);
    if ($messageLower === 'hello') {
        $textResponse = 'Hi there! How can I assist you today?';
    } elseif ($messageLower === 'hi') {
        $textResponse = 'Hello! What can I help you with?';
    } elseif ($messageLower === 'help') {
        $textResponse = 'Sure, I’m here to help! What do you need assistance with?';
    }

    // Configuration response expected by App.jsx
    $response = [
        'chatAgentId' => 'agent_01jwb83twreb3s2mm92rv4y467', // Replace with your actual agent ID
        'meetingAgentId' => 'agent_01jwb83twreb3s2mm92rv4y467', // Replace with your actual agent ID
        'webhookUrl' => 'http://147.93.108.56/task/webhook.php',
        'response' => $textResponse,
    ];

    // Handle file uploads (if applicable)
    if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
        $file = $_FILES['file'];
        $response['file'] = htmlspecialchars($file['name']);
        $response['response'] .= ' | I also received your file: ' . $response['file'];

        $uploadDir = __DIR__ . '/uploads/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        $uploadPath = $uploadDir . basename($file['name']);
        move_uploaded_file($file['tmp_name'], $uploadPath);
    }

    // Store message and file info
    $storageFile = __DIR__ . '/messages.json';
    $messages = file_exists($storageFile) ? json_decode(file_get_contents($storageFile), true) ?: [] : [];
    $messages[] = [
        'timestamp' => date('c'),
        'message' => $message,
        'file' => isset($file) ? $file['name'] : null,
    ];
    file_put_contents($storageFile, json_encode($messages, JSON_PRETTY_PRINT));

    http_response_code(200);
    echo json_encode($response);
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Invalid request method']);
}
?>