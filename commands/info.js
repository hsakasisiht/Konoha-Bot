/**
 * Info command for WhatsApp Bot
 * Shows provider information, version, and credits to dependencies
 */

const fs = require('fs');
const path = require('path');

module.exports = {
    name: "info",
    description: "Show bot information and credits",
    usage: ".info",
    handler: async (sock, m, { prefix }) => {
        try {
            // Read package.json to get dependencies
            const packageJsonPath = path.join(__dirname, '..', 'package.json');
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const dependencies = packageJson.dependencies || {};
            
            // Prepare the info message
            let infoMessage = `*🤖 KONOHA BOT INFO 🤖*\n\n`;
            
            // Provider information (reversed as requested)
            infoMessage += `*Provider:* ${reverseText("This Is Akash")}\n`;
            
            // Version information
            infoMessage += `*Version:* 1.2.4\n\n`;
            
            // Credits section
            infoMessage += `*📚 CREDITS & DEPENDENCIES 📚*\n`;
            infoMessage += `_This bot wouldn't be possible without these amazing projects:_\n\n`;
            
            // List major dependencies with descriptions
            const majorDependencies = [
                { name: '@whiskeysockets/baileys', desc: 'WhatsApp Web API' },
                { name: '@distube/ytdl-core', desc: 'YouTube downloading' },
                { name: 'gtts', desc: 'Google Text-to-Speech' },
                { name: 'axios', desc: 'HTTP client' },
                { name: 'youtube-yts', desc: 'YouTube search' },
                { name: 'fluent-ffmpeg', desc: 'Media processing' },
                { name: 'chalk', desc: 'Terminal styling' },
                { name: 'pino', desc: 'Logging library' },
                { name: 'sharp', desc: 'Image processing' }
            ];
            
            // Set of major dependency names for quick lookup
            const majorDependencyNames = new Set(majorDependencies.map(dep => dep.name));
            
            // Add major dependencies first
            majorDependencies.forEach(dep => {
                const version = dependencies[dep.name] || '';
                infoMessage += `• *${dep.name}* ${version} - _${dep.desc}_\n`;
            });
            
            // Add a separator between major and other dependencies
            infoMessage += `\n*Additional Dependencies:*\n`;
            
            // Add all remaining dependencies
            Object.keys(dependencies)
                .filter(depName => !majorDependencyNames.has(depName))
                .sort()
                .forEach(depName => {
                    infoMessage += `• *${depName}* ${dependencies[depName]}\n`;
                });
            
            // Footer
            infoMessage += `\n*💻 USAGE INFO 💻*\n`;
            infoMessage += `Type *${prefix}help* to see available commands\n\n`;
            infoMessage += `Thanks for using Konoha Bot! 🍃`;
            
            // Send the info message
            await m.reply(infoMessage);
            
        } catch (error) {
            console.error('Error in info command:', error);
            m.reply("❌ An error occurred while fetching bot information.");
        }
    }
};

/**
 * Helper function to reverse text
 * @param {string} text - Text to reverse
 * @returns {string} - Reversed text
 */
function reverseText(text) {
    return text.split('').reverse().join('');
}

// Hot reload support
let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(`Updated ${__filename}`);
    delete require.cache[file];
    require(file);
});