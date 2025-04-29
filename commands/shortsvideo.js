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
                    // Update status for YouTube shorts
                    await sock.sendMessage(m.chat, {
                        text: `🔍 YouTube video detected! Fetching info...`,
                        edit: statusMsg.key
                    });
                    
                    // Get video info
                    const info = await ytdl.getInfo(videoUrl);
                    videoInfo.title = info.videoDetails.title;
                    videoInfo.thumbnail = info.videoDetails.thumbnails[0].url;
                    
                    // Update status to show download progress
                    await sock.sendMessage(m.chat, {
                        text: `📥 Downloading "${videoInfo.title}"...`,
                        edit: statusMsg.key
                    });
                    
                    // Check if it's a short
                    const isShort = videoUrl.includes('youtube.com/shorts/') || videoUrl.includes('youtu.be/shorts/');
                    
                    // Download video
                    await ytdl.mp4(videoUrl, outputPath);
                    
                    // Verify the file exists and has content
                    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
                        throw new Error('Video download failed - file is missing or empty');
                    }
                } catch (err) {
                    console.error("YouTube download error:", err);
                    return sock.sendMessage(m.chat, {
                        text: `❌ Failed to download video: ${err.message}\n\nPlease try again later or with a different link.`,
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
                text: `✅ Download complete! Checking video...`,
                edit: statusMsg.key
            });
            
            // Check if the file was actually created and has content
            if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
                return sock.sendMessage(m.chat, {
                    text: `❌ Failed to download video: The file was not created properly.`,
                    edit: statusMsg.key
                });
            }
            
            // Get thumbnail if available
            let thumbBuffer;
            try {
                if (videoInfo.thumbnail) {
                    thumbBuffer = await getBuffer(videoInfo.thumbnail);
                }
            } catch (err) {
                console.log("Error getting thumbnail:", err);
            }
            
            try {
                // Update status before sending
                await sock.sendMessage(m.chat, {
                    text: `✅ Video ready! Sending now...`,
                    edit: statusMsg.key
                });
                
                // Read the file with a try-catch to handle any potential issues
                const videoBuffer = fs.readFileSync(outputPath);
                
                // Send the video
                await sock.sendMessage(m.chat, {
                    video: videoBuffer,
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
            } catch (fileError) {
                console.error("Error sending video file:", fileError);
                await sock.sendMessage(m.chat, {
                    text: `❌ Error sending video: ${fileError.message}`,
                    edit: statusMsg.key
                });
            }
            
            // Clean up the temporary file
            try {
                if (fs.existsSync(outputPath)) {
                    fs.unlinkSync(outputPath);
                }
            } catch (err) {
                console.log("Error deleting temp file:", err);
            }
            
        } catch (error) {
            console.error("Error in shortsvideo command:", error);
            m.reply(`❌ An error occurred: ${error.message}`);
        }
    }
};