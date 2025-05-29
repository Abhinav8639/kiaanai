<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $message = $_POST['message'] ?? '';

    // Generate a custom response based on the message
    $textResponse = 'I’m not sure how to respond to that. Can you tell me more?'; // Default response
    $messageLower = strtolower($message);
    if ($messageLower === 'hello') {
        $textResponse = 'Hi there! How can I assist you today?';
    } elseif ($messageLower === 'hi') {
        $textResponse = 'Hello! What can I help you with?';
    } elseif ($messageLower === 'help') {
        $textResponse = 'Sure, I’m here to help! What do you need assistance with?';
    }

    // Prepare the configuration response expected by App.jsx
    $response = [

        'chatAgentId' => 'agent_01jwc42yt6e6rvb7hqgqyt6gj2',
        'meetingAgentId' => 'agent_01jwc42yt6e6rvb7hqgqyt6gj2',
        'webhookUrl' => 'http://147.93.108.56/task/webhook.php',
        'response' => $textResponse, // Include the chat response for compatibility
    ];

    // Handle file uploads (unchanged)
    if (isset($_FILES['file'])) {
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

    // Store the message and file info in a JSON file (unchanged)
    $storageFile = __DIR__ . '/messages.json';
    $messages = [];
    if (file_exists($storageFile)) {
        $messages = json_decode(file_get_contents($storageFile), true) ?: [];
    }
    $messages[] = [
        'timestamp' => date('c'),
        'message' => $message,
        'file' => isset($file) ? $file['name'] : null,
    ];
    file_put_contents($storageFile, json_encode($messages, JSON_PRETTY_PRINT));

    // Send the response
    echo json_encode($response);
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Invalid request method']);
}
?>