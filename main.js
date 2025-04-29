/**
 * Main handlers for WhatsApp Bot
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { smsg } = require('./lib/myfunc');
const ytdl = require('./lib/ytdl2.js');

// Command handler
const handleMessages = async (sock, chatUpdate, isNonGroupMessage = false) => {
    try {
        const mek = chatUpdate.messages[0];
        if (!mek.message) return;
        
        // Skip protocol messages which are internal to WhatsApp
        if (mek.message.protocolMessage) return;
        
        // Normalize message
        const m = smsg(sock, mek);
        const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const senderNumber = m.sender.split('@')[0];
        
        // Get text
        const prefix = global.prefix || '.';
        const body = m.body || '';
        const budy = (typeof m.text == 'string' ? m.text : '');
        const command = body.startsWith(prefix) ? body.slice(prefix.length).trim().split(/ +/).shift().toLowerCase() : '';
        const args = body.trim().split(/ +/).slice(1);
        const text = args.join(" ");

        // Auto-detect YouTube shorts or Instagram reels links and download
        if (body && !body.startsWith(prefix)) {
            // Check for YouTube shorts or Instagram reels URLs in the message
            const urlPattern = /(https?:\/\/[^\s]+)/g;
            const urls = body.match(urlPattern);
            
            if (urls && urls.length > 0) {
                for (const url of urls) {
                    const cleanUrl = url.replace(/[^a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=]/g, '');
                    
                    // Check if the URL is a YouTube shorts or Instagram reel
                    if (ytdl.isYouTubeURL(cleanUrl) || ytdl.isInstagramReel(cleanUrl)) {
                        // Load and run the shortsvideo command handler
                        try {
                            const shortsCommand = require('./commands/shortsvideo.js');
                            await shortsCommand.handler(sock, m, { 
                                text: cleanUrl,
                                prefix,
                                command: "shortsvideo",
                                botNumber,
                                isGroup: m.isGroup,
                                isAdmin: false,
                                isBotAdmin: false
                            });
                            
                            // Log the automatic detection
                            console.log(
                                chalk.blue(`[${new Date().toLocaleTimeString()}]`),
                                chalk.green(`Auto-detected:`),
                                chalk.yellow(`Video link from ${m.pushName || senderNumber}`),
                                chalk.cyan(cleanUrl)
                            );
                            
                            break; // Only process the first valid URL to avoid spam
                        } catch (err) {
                            console.error("Error handling auto-detected video URL:", err);
                        }
                    }
                }
            }
        }

        // Only log messages that have actual text content and aren't protocol messages
        // This avoids duplicate logging and unnecessary protocol messages
        if (m.body && chatUpdate.type === 'notify' && command) {
            // Skip logging normal messages that don't start with the prefix
            if (!command && !body.startsWith(prefix)) return;
            
            // Clean, concise log format showing only sender name, command, and chat type
            const chatType = m.isGroup ? `Group (${groupName})` : 'Private Chat';
            const senderName = m.pushName || senderNumber;
            
            console.log(
                chalk.blue(`[${new Date().toLocaleTimeString()}]`),
                chalk.green(`${senderName}:`),
                chalk.yellow(command ? `.${command}` : body),
                chalk.magenta(`in ${chatType}`)
            );
        }

        // Group checks
        const isGroup = m.isGroup;
        const groupMetadata = isGroup ? await sock.groupMetadata(m.chat) : '';
        const groupName = isGroup ? groupMetadata.subject : '';
        const participants = isGroup ? await groupMetadata.participants : '';
        const groupAdmins = isGroup ? participants.filter(p => p.admin !== null).map(p => p.id) : '';
        const isBotAdmin = isGroup ? groupAdmins.includes(botNumber) : false;
        const isAdmin = isGroup ? groupAdmins.includes(m.sender) : false;

        // Command validation
        if (command) {
            try {
                const commandFile = path.join(__dirname, 'commands', `${command}.js`);
                if (fs.existsSync(commandFile)) {
                    const commandObject = require(commandFile);
                    if (commandObject.handler) {
                        // Execute command
                        await commandObject.handler(sock, m, {
                            prefix,
                            command,
                            args, 
                            text,
                            botNumber,
                            isGroup,
                            isAdmin,
                            isBotAdmin,
                            groupMetadata,
                            groupName,
                            participants,
                            groupAdmins
                        });
                    } else {
                        console.warn(`Missing handler in command file: ${commandFile}`);
                    }
                } else if (!isNonGroupMessage) {
                    // Only reply with "command not found" if there's a prefix, avoiding false triggers
                    if (body.startsWith(prefix)) {
                        m.reply(`Command *${command}* not found. Use *${prefix}help* to see available commands.`);
                    }
                }
            } catch (e) {
                console.error(`Error executing command ${command}:`, e);
                m.reply(`Error executing command: ${e.message}`);
            }
        }

        switch (true) {
            // ...existing cases...
        }
    } catch (err) {
        console.error("Error in handleMessages:", err);
    }
}

// Handle group participant updates (joins/leaves)
const handleGroupParticipantUpdate = async (sock, update) => {
    try {
        // Extract update info
        const { id: groupId, participants, action } = update;
        
        if (!global.welcomeMessage && !global.goodbyeMessage) return;
        
        // Get group metadata
        const metadata = await sock.groupMetadata(groupId);
        const groupName = metadata.subject;

        // Handle based on action type
        if (action === 'add' && global.welcomeMessage) {
            // Welcome message for new members with Naruto theme
            const welcomeResponses = [
                `🍃 *Welcome to ${groupName}!* 🍃\n\nGreetings @${participants[0].split('@')[0]}, a new shinobi has joined our ranks! May your time here be filled with friendship and growth. Remember, in the words of Kakashi: "Those who break the rules are scum, but those who abandon their friends are worse than scum." 🥷`,
                
                `✨ *A new ninja arrives at ${groupName}!* ✨\n\nHey @${participants[0].split('@')[0]}, welcome to our village! We're glad to have your talents among us. Remember that true strength comes from protecting what's precious to you! 🌟`,
                
                `🌀 *${groupName} has a new member!* 🌀\n\n@${participants[0].split('@')[0]} has entered the chat! Another brave soul joins our ranks. As Naruto would say, "I'm not gonna run away, I never go back on my word! That's my nindo: my ninja way!" 🔥`
            ];
            
            const randomWelcome = welcomeResponses[Math.floor(Math.random() * welcomeResponses.length)];
            
            await sock.sendMessage(groupId, {
                text: randomWelcome,
                mentions: participants
            });
        } else if (action === 'remove' && global.goodbyeMessage) {
            // Goodbye message for leaving members with Naruto theme
            const goodbyeResponses = [
                `🍃 @${participants[0].split('@')[0]} has left the village. May your journey be safe, and your path lead you back to us someday. 🌙`,
                
                `🌊 @${participants[0].split('@')[0]} has departed on a new mission. Remember that bonds formed here remain even across great distances. Until we meet again! 🥷`,
                
                `🔮 @${participants[0].split('@')[0]} has chosen a different path. As Itachi once said, "Every shinobi's life is different... but there are things we all share." May your way forward be bright! ✨`
            ];
            
            const randomGoodbye = goodbyeResponses[Math.floor(Math.random() * goodbyeResponses.length)];
            
            await sock.sendMessage(groupId, {
                text: randomGoodbye,
                mentions: participants
            });
        }
    } catch (error) {
        console.error("Error handling group participant update:", error);
    }
}

// Status handler
const handleStatus = async (sock, statusUpdate) => {
    // Implement status handling if needed
    return;
}

module.exports = {
    handleMessages,
    handleGroupParticipantUpdate,
    handleStatus
}