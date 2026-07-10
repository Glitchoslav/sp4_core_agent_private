// test_google_debug.js - Debug Google API response
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SP4AIOSBridge } from '../SP4AIOS/src/bridge.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔍 Debugging Google Gemini API\n');

(async () => {
    // Load Google API key
    const envPath = path.join(__dirname, '..', 'SP4AIOS', '.env');
    let googleKey = process.env.GOOGLE_API_KEY;

    if (!googleKey && fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        const match = content.match(/GOOGLE_API_KEY=(.+)/);
        googleKey = match ? match[1].trim() : null;
    }

    if (!googleKey) {
        console.error('❌ Missing GOOGLE_API_KEY. Set it in environment or SP4AIOS/.env before running this script.\n');
        process.exit(1);
    }

    console.log('🔑 Google API Key: configured\n');

    const bridge = new SP4AIOSBridge({
        googleApiKey: googleKey
    });

    const prompt = 'Hello, what is 2+2?';
    console.log(`📨 Testing prompt: "${prompt}"\n`);

    try {
        console.log('🌐 Calling Google AI...\n');

        const response = await bridge.ask(prompt, {
            provider: 'google',
            model: 'gemini-2.5-flash',
            temperature: 0.7,
            maxTokens: 100
        });

        console.log('✅ Full Response Object:\n');
        console.log(JSON.stringify(response, null, 2));

        console.log('\n📝 Response Text:');
        console.log(response.text || '(EMPTY)');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    }

})().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
});
