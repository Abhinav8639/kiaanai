<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $message = $_POST['message'] ?? '';
    $file = $_FILES['file'] ?? null;

    // Generate a custom response based on the message
    $response = 'I’m not sure how to respond to that. Can you tell me more?'; // Default response
    $messageLower = strtolower($message);
    if ($messageLower === 'hello') {
        $response = 'Hi there! How can I assist you today?';
    } elseif ($messageLower === 'hi') {
        $response = 'Hello! What can I help you with?';
    } elseif ($messageLower === 'help') {
        $response = 'Sure, I’m here to help! What do you need assistance with?';
    }

    if ($file) {
        $response .= ' | I also received your file: ' . htmlspecialchars($file['name']);
    }

    // Store the message and file info in a JSON file
    $storageFile = __DIR__ . '/messages.json';
    $messages = [];

    // Load existing messages if the file exists
    if (file_exists($storageFile)) {
        $messages = json_decode(file_get_contents($storageFile), true) ?: [];
    }

    // Add the new message
    $newMessage = [
        'timestamp' => date('c'),
        'message' => $message,
        'file' => $file ? $file['name'] : null,
    ];
    $messages[] = $newMessage;

    // Save the updated messages back to the file
    file_put_contents($storageFile, json_encode($messages, JSON_PRETTY_PRINT));

    // If a file was uploaded, save it to the server
    if ($file) {
        $uploadDir = __DIR__ . '/uploads/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        $uploadPath = $uploadDir . basename($file['name']);
        move_uploaded_file($file['tmp_name'], $uploadPath);
    }

    // Send the response back to the client
    echo json_encode(['response' => $response]);
} else {
    echo json_encode(['error' => 'Invalid request method']);
}
?>