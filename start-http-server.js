// start-http-server.js
// LEGACY HTTP launcher for SP4 Core Agent
// Not part of the live default runtime path.

import { startServer } from './server.js';

console.log('⚠️ Launching LEGACY SP4 HTTP server (deprecated, not live default runtime)...');
console.log('📅 Started:', new Date().toISOString());
console.log('');

// Start the server
startServer();

// Keep process alive with heartbeat
let heartbeatCount = 0;
setInterval(() => {
    heartbeatCount++;
    if (heartbeatCount % 60 === 0) {
        // Log every 60 minutes
        console.log(`💓 Server heartbeat: ${heartbeatCount} minutes uptime - ${new Date().toISOString()}`);
    }
}, 60000); // Every minute

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n🛑 SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n🛑 SIGINT received (Ctrl+C), shutting down gracefully...');
    process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('\n❌ Uncaught Exception:', error);
    console.error('Stack:', error.stack);
    // Don't exit - try to keep server alive
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('\n❌ Unhandled Rejection at:', promise);
    console.error('Reason:', reason);
    // Don't exit - try to keep server alive
});

console.log('✅ Legacy server launcher initialized');
console.log('💡 Press Ctrl+C to stop\n');
