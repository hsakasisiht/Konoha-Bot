/**
 * Command to download YouTube shorts and Instagram reels
 */

const fs = require('fs');
const path = require('path');
const ytdl = require('../lib/ytdl2.js');
const { getBuffer } = require('../lib/myfunc');

module.exports = {
    name: "shortsvideo",
    aliases: ["shorts", "reel", "reels"],
    description: "Download YouTube Shorts or Instagram Reels",
    usage: ".shortsvideo <shorts/reels URL>",
    handler: async (sock, m, { text }) => {
        try {
            // Check if URL is provided
            if (!text) {
                return m.reply(`Please provide a YouTube Shorts or Instagram Reels URL.\nExample: .shortsvideo https://youtube.com/shorts/abcd1234`);
            }
            
            // Send initial status message
            const statusMsg = await m.reply(`📥 Processing video link...`);
            
            let videoUrl = text.trim();
            let isYouTube = ytdl.isYouTubeURL(videoUrl);
            let isInstagram = ytdl.isInstagramReel(videoUrl);
            
            if (!isYouTube && !isInstagram) {
                return sock.sendMessage(m.chat, {
                    text: `❌ Invalid link. Only YouTube Shorts and Instagram Reels are supported.`,
                    edit: statusMsg.key
                });
            }
            
            // Update status
            await sock.sendMessage(m.chat, {
                text: `🔍 Valid link detected! Downloading video...`,
                edit: statusMsg.key
            });
            
            const tempDir = path.join(__dirname, '../temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            
            const outputPath = path.join(tempDir, `video_${Date.now()}.mp4`);
            
            let videoInfo = {
                title: "Video"
            };
            
            // Download based on platform
            if (isYouTube) {
                try {
                    // Get video info
                    const info = await ytdl.getInfo(videoUrl);
                    videoInfo.title = info.videoDetails.title;
                    videoInfo.thumbnail = info.videoDetails.thumbnails[0].url;
                    
                    // Download video
                    await ytdl.mp4(videoUrl, outputPath);
                } catch (err) {
                    console.error("YouTube download error:", err);
                    return sock.sendMessage(m.chat, {
                        text: `❌ Failed to download video: ${err.message}`,
                        edit: statusMsg.key
                    });
                }
            } else if (isInstagram) {
                try {
                    await ytdl.downloadInstagramReel(videoUrl, outputPath);
                } catch (err) {
                    console.error("Instagram download error:", err);
                    return sock.sendMessage(m.chat, {
                        text: `❌ Failed to download Instagram reel: ${err.message}`,
                        edit: statusMsg.key
                    });
                }
            }
            
            // Update status before sending
            await sock.sendMessage(m.chat, {
                text: `✅ Download complete! Sending video...`,
                edit: statusMsg.key
            });
            
            // Get thumbnail if available
            let thumbBuffer;
            try {
                if (videoInfo.thumbnail) {
                    thumbBuffer = await getBuffer(videoInfo.thumbnail);
                }
            } catch (err) {
                console.log("Error getting thumbnail:", err);
            }
            
            // Send the video
            await sock.sendMessage(m.chat, {
                video: fs.readFileSync(outputPath),
                caption: `✅ ${videoInfo.title}`,
                mimetype: 'video/mp4',
                fileName: `${videoInfo.title || "video"}.mp4`,
                contextInfo: thumbBuffer ? {
                    externalAdReply: {
                        title: videoInfo.title || "Downloaded Video",
                        body: global.botname || "WhatsApp Bot",
                        thumbnail: thumbBuffer,
                        mediaType: 2,
                        mediaUrl: videoUrl
                    }
                } : undefined
            });
            
            // Final update to the status message
            await sock.sendMessage(m.chat, {
                text: `✅ Video sent successfully!`,
                edit: statusMsg.key
            });
            
            // Clean up the temporary file
            try {
                fs.unlinkSync(outputPath);
            } catch (err) {
                console.log("Error deleting temp file:", err);
            }
            
        } catch (error) {
            console.error("Error in shortsvideo command:", error);
            m.reply(`❌ An error occurred: ${error.message}`);
        }
    }
};