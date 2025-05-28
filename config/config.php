<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;

// Load environment variables
$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

// Retrieve environment variables
$chatAgentId = $_ENV['CHAT_AGENT_ID'] ?? 'agent_01jwb83twreb3s2mm92rv4y467';
$meetingAgentId = $_ENV['MEETING_AGENT_ID'] ?? 'agent_01jwb83twreb3s2mm92rv4y467';
$webhookUrl = $_ENV['WEBHOOK_URL'] ?? 'http://147.93.108.56/task/webhook.php';

// Encryption function (for demonstration; use a secure method in production)
function encryptData($data, $key = 'your-encryption-key') {
    $iv = openssl_random_pseudo_bytes(openssl_cipher_iv_length('aes-256-cbc'));
    $encrypted = openssl_encrypt($data, 'aes-256-cbc', $key, 0, $iv);
    return base64_encode($encrypted . '::' . $iv);
}

// Decryption key (in production, this should not be exposed; use a secure method to share with client)
$encryptionKey = 'your-encryption-key';

echo json_encode([
    'chatAgentId' => encryptData($chatAgentId, $encryptionKey),
    'meetingAgentId' => encryptData($meetingAgentId, $encryptionKey),
    'webhookUrl' => encryptData($webhookUrl, $encryptionKey),
    'encryptionKey' => $encryptionKey, // In production, do NOT expose this
]);
?>