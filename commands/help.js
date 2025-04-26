/**
 * Help command to list all available commands - Konoha style
 * Enhanced with a unique, stylish design and bot image
 * Now with platform-specific responses
 */

const fs = require('fs');
const path = require('path');

module.exports = {
    name: "help",
    description: "Shows a list of all available jutsu (commands)",
    usage: ".help [jutsu name]",
    handler: async (sock, m, { prefix, args }) => {
        const commandsPath = path.join(__dirname);
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        
        // If a specific command is requested
        if (args.length > 0) {
            const commandName = args[0].toLowerCase();
            const commandFile = commandFiles.find(file => file.replace('.js', '') === commandName);
            
            if (commandFile) {
                const command = require(path.join(commandsPath, commandFile));
                
                // Enhanced command details with unique design
                let helpText = `┏━━━⦿ *${prefix}${command.name}* ⦿━━━┓\n\n`;
                helpText += `❖ *Description:*\n`;
                helpText += `   ${command.description || 'Ancient jutsu, details lost in time'}\n\n`;
                helpText += `❖ *Usage:*\n`;
                helpText += `   ${command.usage || prefix + command.name}\n\n`;
                helpText += `┗━━━━━━━━━━━━━━━━┛\n\n`;
                helpText += `💫 *May the Will of Fire guide your path!*`;
                
                return m.reply(helpText);
            } else {
                return m.reply(`*❌ FORBIDDEN JUTSU!*\n\nThe jutsu *${commandName}* is not in our scroll archives. Train with *${prefix}help* to see all available techniques.`);
            }
        }
        
        // Generate random Naruto-themed greeting
        const greetings = [
            "May the Will of Fire burn brightly within you!",
            "Believe it! Here are the jutsu you can use!",
            "A great shinobi masters many techniques!",
            "Your ninja way begins with these commands!",
            "As the Hokage would say: Knowledge is power!"
        ];
        const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
        
        // Path to the bot image
        const botImagePath = path.join(__dirname, '..', 'images', 'bot_image.jpg');
        
        // Categorize commands
        const generalCommands = [];
        const adminCommands = [];
        const mediaCommands = [];
        const gameCommands = [];
        
        // Categorize commands based on naming conventions or internal properties
        commandFiles.forEach(file => {
            const command = require(path.join(commandsPath, file));
            const cmdName = command.name || file.replace('.js', '');
            const cmdDescription = command.description || 'No description available';
            
            if (['tictactoe', 'game', '8ball'].some(g => cmdName.includes(g))) {
                gameCommands.push({ name: cmdName, description: cmdDescription });
            }
            else if (['sticker', 'image', 'meme', 'blur', 'take', 'emoji'].some(m => cmdName.includes(m) || cmdDescription.toLowerCase().includes(m))) {
                mediaCommands.push({ name: cmdName, description: cmdDescription });
            }
            else if (['admin', 'promote', 'demote', 'kick', 'mute', 'unmute', 'warn'].some(a => cmdName.includes(a) || cmdDescription.toLowerCase().includes(a))) {
                adminCommands.push({ name: cmdName, description: cmdDescription });
            }
            else {
                generalCommands.push({ name: cmdName, description: cmdDescription });
            }
        });
        
        // Sort commands in each category alphabetically
        generalCommands.sort((a, b) => a.name.localeCompare(b.name));
        adminCommands.sort((a, b) => a.name.localeCompare(b.name));
        mediaCommands.sort((a, b) => a.name.localeCompare(b.name));
        gameCommands.sort((a, b) => a.name.localeCompare(b.name));

        // Determine if the user is likely on WhatsApp Web or mobile app
        // We can use message metadata to make an educated guess
        const isLikelyWeb = detectWhatsAppWeb(m);
        
        if (isLikelyWeb) {
            // Create help content optimized for WhatsApp Web - more detailed, richer formatting
            await sendWebResponse(sock, m, {
                botImagePath,
                randomGreeting,
                prefix,
                generalCommands,
                adminCommands,
                mediaCommands,
                gameCommands
            });
        } else {
            // Create help content optimized for mobile - more compact, simpler formatting
            await sendMobileResponse(sock, m, {
                botImagePath,
                randomGreeting,
                prefix,
                generalCommands,
                adminCommands,
                mediaCommands,
                gameCommands
            });
        }
    }
};

/**
 * Try to detect if the user is on WhatsApp Web based on message properties
 * @param {Object} m - Message object
 * @returns {boolean} - true if likely from WhatsApp Web
 */
function detectWhatsAppWeb(m) {
    // Device detection logic
    // Check message properties that might indicate desktop usage
    // This is an estimate since WhatsApp doesn't explicitly tell us the client type
    
    // Check for device properties in the message
    if (m.key && m.key.id) {
        // Web client often has longer/different message IDs
        // Also, web often uses different message composition/formatting
        
        // Device type might be inferred from message ID patterns or other properties
        const msgIdLength = m.key.id.length;
        const hasWebPatterns = m.key.id.includes('3EB0');
        
        // FIXED: Logic was reversed - now returning the correct value
        // Mobile clients often have this pattern or longer IDs, not web clients
        return !(hasWebPatterns || msgIdLength > 20);
    }
    
    // Default to mobile if we can't determine
    return false;
}

/**
 * Send a response formatted for WhatsApp Web users
 * Takes advantage of larger screen and better formatting support
 */
async function sendWebResponse(sock, m, options) {
    const {
        botImagePath,
        randomGreeting,
        prefix,
        generalCommands,
        adminCommands,
        mediaCommands,
        gameCommands
    } = options;
    
    // Create Web-optimized rich content with detailed formatting
    let caption = `🌟 *WHATSAPP BOT* 🌟\n\n`;
    caption += `┏━━━✧✧✧✧✧✧━━━━━━━━━━━┓\n`;
    caption += `┃  🍃 *KONOHA BOT* 🍃  ┃\n`;
    caption += `┃  Version: 1.2.4       ┃\n`;
    caption += `┃  Made By Jiraiya 24   ┃\n`;
    caption += `┗━━━✧✧✧✧✧✧━━━━━━━━━━━┛\n\n`;
    
    caption += `${randomGreeting}\n\n`;
    
    caption += `*For command details:* _${prefix}help [command]_\n\n`;
    
    // General Commands - detailed view with descriptions for Web
    caption += `┏━━━❀ *GENERAL COMMANDS* ❀━━━┓\n\n`;
    generalCommands.forEach(cmd => {
        caption += `  ⚡ *${prefix}${cmd.name}*\n`;
        caption += `     _${cmd.description.substring(0, 40)}${cmd.description.length > 40 ? '...' : ''}_\n\n`;
    });
    caption += `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n`;
    

    
    // Special feature highlight - extra details for web users
    caption += `┏━━━✦ *SPECIAL FEATURES* ✦━━━┓\n\n`;
    caption += `  🎬 Auto-download YT Shorts - Just paste any YouTube Shorts link\n`;
    caption += `  📱 Auto-download IG Reels - Simply share Instagram Reel links\n`;
    caption += `  🎵 Lyrics with Genius API - Search for any song lyrics\n`;
    caption += `  💬 Group management tools - Control your groups effectively\n`;
    caption += `\n┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n`;
    
    caption += `✨ *Using WhatsApp Web gives you the best experience with Konoha Bot!* 🍃`;
    
    // Send a single message with both image and caption
    try {
        await sock.sendMessage(m.chat, {
            image: { url: botImagePath },
            caption: caption
        });
    } catch (error) {
        console.error("Error sending help menu with image:", error);
        // Fallback to text-only if image fails
        await m.reply(caption);
    }
}

/**
 * Send a response formatted for mobile app users
 * More compact for smaller screens
 */
async function sendMobileResponse(sock, m, options) {
    const {
        botImagePath,
        randomGreeting,
        prefix,
        generalCommands,
        adminCommands,
        mediaCommands,
        gameCommands
    } = options;
    
    // Create mobile-optimized compact content
    let caption = `🔰 *KONOHA BOT* 🔰\n`;
    caption += `Version: 1.2.4\n\n`;
    
    
    caption += `${randomGreeting}\n\n`;
    
    // General Commands - FIXED: now each command is on its own line
    caption += `🌐 *GENERAL COMMANDS:*\n`;
    generalCommands.forEach(cmd => {
        caption += `➤ ${prefix}${cmd.name}\n`;
    });
    caption += `\n`;
    
    // Special features - simplified for mobile
    caption += `✨ *SPECIAL FEATURES:*\n`;
    caption += `• Auto-download YT Shorts & IG Reels\n`;
    caption += `• Lyrics with Genius API\n`;
    caption += `• Group management tools\n\n`;
    
    caption += `For details: _${prefix}help [command]_\n\n`;
    caption += `💫 *Train hard, grow stronger!* 🍃`;
    
    // Send a single message with both image and caption
    try {
        await sock.sendMessage(m.chat, {
            image: { url: botImagePath },
            caption: caption
        });
    } catch (error) {
        console.error("Error sending help menu with image:", error);
        // Fallback to text-only if image fails
        await m.reply(caption);
    }
}