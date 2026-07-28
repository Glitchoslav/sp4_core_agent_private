/**
 * 🌐 OPEN_URL Action Handler
 * 
 * Opens URL in system default browser.
 * 
 * @module actions/openUrl
 * @author Kefyk (SP4) + GitHub Copilot
 * @date 2025-11-22
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Execute OPEN_URL action
 * 
 * @param {Object} payload - { url: string }
 * @param {Object} context - { persona: string, userMessage: string }
 * @returns {Promise<Object>} { success: boolean, result?: any, error?: string }
 */
export async function executeOpenUrl(payload, context = {}) {
    const { url } = payload;
    const { persona = 'unknown' } = context;

    try {
        if (process.env.SP4_TEST === 'true') {
            return {
                success: false,
                skipped: true,
                reason: 'disabled_in_test_mode',
                error: 'OPEN_URL disabled in SP4 test mode'
            };
        }

        // Platform-specific command
        const platform = process.platform;
        let command;

        if (platform === 'win32') {
            command = `start "" "${url}"`;
        } else if (platform === 'darwin') {
            command = `open "${url}"`;
        } else {
            command = `xdg-open "${url}"`;
        }

        console.log(`🌐 [${persona.toUpperCase()}] Opening URL: ${url}`);

        await execAsync(command);

        return {
            success: true,
            result: {
                url,
                platform,
                timestamp: new Date().toISOString()
            }
        };
    } catch (error) {
        console.error(`❌ [OPEN_URL] Failed to open URL: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

export default executeOpenUrl;
