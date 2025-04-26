/**
 * Command to search and download YouTube songs
 */

const fs = require('fs');
const path = require('path');
const yts = require('youtube-yts');
const axios = require('axios');
const ytdl = require('../lib/ytdl2.js');

module.exports = {
    name: "sing",
    aliases: ["song"],
    description: "Search and play a song from YouTube",
    usage: ".sing <song name>",
    handler: async (sock, m, { text }) => {
        try {
            // Check if search text is provided
            if (!text) {
                return m.reply(`Please provide a song name to search.\nExample: .sing Naruto Blue Bird`);
            }
            
            // Send initial status message that we'll update throughout the process
            const statusMsg = await m.reply(`🔍 Searching for "${text}"...`);
            
            // Search for the song
            const search = await yts(text);
            
            // Check if there are results
            if (!search.videos || search.videos.length === 0) {
                return sock.sendMessage(m.chat, {
                    text: `❌ No results found for "${text}". Please try a different search.`,
                    edit: statusMsg.key
                });
            }
            
            // Get the first video from results
            const video = search.videos[0];
            
            // Update message with found status
            await sock.sendMessage(m.chat, {
                text: `🎧 Found: *${video.title}*\n\n⏳ Downloading and processing audio...`,
                edit: statusMsg.key
            });
            
            // Create temp directory if it doesn't exist
            const tempDir = path.join(__dirname, '../temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            
            // Set output path for the audio file
            const outputPath = path.join(tempDir, `${Date.now()}.mp3`);
            
            // Download the audio
            await ytdl.mp3(video.url, outputPath);
            
            // Update message to indicate audio is downloaded
            await sock.sendMessage(m.chat, {
                text: `✅ Downloaded: *${video.title}*\n\n📥 Fetching thumbnail...`,
                edit: statusMsg.key
            });
            
            // Fetch thumbnail
            const thumbResponse = await axios.get(video.thumbnail, { responseType: 'arraybuffer' });
            const thumbBuffer = Buffer.from(thumbResponse.data);
            
            // Update message to final status before sending
            await sock.sendMessage(m.chat, {
                text: `🎵 Preparing to send: *${video.title}*`,
                edit: statusMsg.key
            });
            
            // Send the audio
            await sock.sendMessage(m.chat, {
                audio: fs.readFileSync(outputPath),
                mimetype: 'audio/mp4',
                fileName: `${video.title}.mp3`,
                contextInfo: {
                    externalAdReply: {
                        title: video.title,
                        body: global.botname || "Konoha Bot",
                        thumbnail: thumbBuffer,
                        mediaType: 2,
                        mediaUrl: video.url,
                    }
                }
            });
            
            // Final update to the status message
            await sock.sendMessage(m.chat, {
                text: `✅ Successfully sent: *${video.title}*\nEnjoy your music! 🎵`,
                edit: statusMsg.key
            });
            
            // Clean up the temporary file
            fs.unlinkSync(outputPath);
            
        } catch (error) {
            console.error("Error in sing command:", error);
            await m.reply(`❌ An error occurred: ${error.message}\n\nPlease try again later.`);
        }
    }
};