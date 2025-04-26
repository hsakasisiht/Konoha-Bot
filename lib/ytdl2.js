const ytdl = require('@distube/ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');

const ffmpegPath = path.join(__dirname, '../ffmpeg-master-latest-win64-gpl-shared/bin/ffmpeg.exe');
const ffprobePath = path.join(__dirname, '../ffmpeg-master-latest-win64-gpl-shared/bin/ffprobe.exe');
const ytDlpPath = path.join(__dirname, '../bin/yt-dlp.exe');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

// Ensure temp directory exists
const ensureTempDir = (outputPath) => {
    const tempDir = path.dirname(outputPath);
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
};

// Using yt-dlp as the primary method, with ytdl as fallback
module.exports = {
    async mp3(url, outputPath) {
        return new Promise(async (resolve, reject) => {
            try {
                ensureTempDir(outputPath);
                
                try {
                    // First attempt with yt-dlp (primary method)
                    console.log("Attempting download with yt-dlp...");
                    const tempVideoPath = outputPath.replace('.mp3', '_temp.mp4');
                    const command = `"${ytDlpPath}" "${url}" -o "${tempVideoPath}" --no-playlist --no-warnings -f "bestaudio"`;
                    
                    const ytDlpPromise = new Promise((res, rej) => {
                        exec(command, (error, stdout, stderr) => {
                            if (error) {
                                console.error("yt-dlp download failed:", error);
                                return rej(error);
                            }
                            
                            // Convert downloaded video to mp3 using ffmpeg
                            ffmpeg(tempVideoPath)
                                .audioCodec('libmp3lame')
                                .audioBitrate(128)
                                .save(outputPath)
                                .on('end', () => {
                                    // Clean up temp video file
                                    try {
                                        if (fs.existsSync(tempVideoPath)) {
                                            fs.unlinkSync(tempVideoPath);
                                        }
                                        res();
                                    } catch (cleanupErr) {
                                        console.warn("Cleanup error:", cleanupErr);
                                        res(); // Still resolve even if cleanup fails
                                    }
                                })
                                .on('error', (err) => {
                                    console.error("FFmpeg conversion error:", err);
                                    rej(err);
                                });
                        });
                    });
                    
                    // Wait for download with a timeout
                    await Promise.race([
                        ytDlpPromise,
                        new Promise((_, rej) => setTimeout(() => rej(new Error("Download timeout")), 30000))
                    ]);
                    
                    resolve();
                } catch (ytDlpError) {
                    console.log("yt-dlp download failed, falling back to ytdl-core:", ytDlpError.message);
                    
                    // Fallback to ytdl-core
                    try {
                        const stream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });
                        
                        ffmpeg(stream)
                            .audioCodec('libmp3lame')
                            .audioBitrate(128)
                            .save(outputPath)
                            .on('end', () => resolve())
                            .on('error', (err) => reject(err));
                    } catch (ytdlError) {
                        console.error("Both download methods failed:", ytdlError);
                        reject(ytdlError);
                    }
                }
            } catch (error) {
                reject(error);
            }
        });
    },
    
    async mp4(url, outputPath) {
        return new Promise(async (resolve, reject) => {
            try {
                ensureTempDir(outputPath);
                
                try {
                    // First attempt with yt-dlp (primary method)
                    console.log("Attempting video download with yt-dlp...");
                    const command = `"${ytDlpPath}" "${url}" -o "${outputPath}" --no-playlist --no-warnings -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"`;
                    
                    const ytDlpPromise = new Promise((res, rej) => {
                        exec(command, (error, stdout, stderr) => {
                            if (error) {
                                console.error("yt-dlp download failed:", error);
                                return rej(error);
                            }
                            res();
                        });
                    });
                    
                    // Wait for download with a timeout
                    await Promise.race([
                        ytDlpPromise,
                        new Promise((_, rej) => setTimeout(() => rej(new Error("Download timeout")), 60000))
                    ]);
                    
                    resolve();
                } catch (ytDlpError) {
                    console.log("yt-dlp video download failed, falling back to ytdl-core:", ytDlpError.message);
                    
                    // Fallback to ytdl-core
                    try {
                        const stream = ytdl(url, { 
                            quality: 'highest',
                            filter: format => format.container === 'mp4' && format.hasVideo && format.hasAudio
                        });
                        
                        const writer = fs.createWriteStream(outputPath);
                        stream.pipe(writer);
                        
                        await new Promise((res, rej) => {
                            writer.on('finish', res);
                            writer.on('error', rej);
                            // Add timeout safety
                            setTimeout(() => rej(new Error("Download timeout")), 30000);
                        });
                        
                        resolve();
                    } catch (ytdlError) {
                        console.error("Both download methods failed:", ytdlError);
                        reject(ytdlError);
                    }
                }
            } catch (error) {
                reject(error);
            }
        });
    },
    
    async getInfo(url) {
        try {
            // First try with yt-dlp for more reliable info
            return await new Promise((resolve, reject) => {
                const command = `"${ytDlpPath}" "${url}" --dump-json --no-playlist --no-warnings`;
                
                exec(command, (error, stdout, stderr) => {
                    if (error) {
                        return reject(error);
                    }
                    try {
                        const info = JSON.parse(stdout);
                        resolve({
                            videoDetails: {
                                title: info.title,
                                thumbnails: [{ url: info.thumbnail }],
                                lengthSeconds: info.duration,
                                author: { name: info.uploader }
                            }
                        });
                    } catch (parseError) {
                        reject(parseError);
                    }
                });
            });
        } catch (ytDlpError) {
            // Fallback to ytdl-core
            try {
                return await ytdl.getInfo(url);
            } catch (ytdlError) {
                throw new Error(`Failed to get video info: ${ytDlpError.message}. Fallback also failed: ${ytdlError.message}`);
            }
        }
    },
    
    // Check if URL is a YouTube URL (including shorts)
    isYouTubeURL(url) {
        return url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|shorts\/|youtube.com\/shorts\/)([^"&?\/\s]{11})/);
    },
    
    // Check if URL is an Instagram reel
    isInstagramReel(url) {
        return url.match(/(?:www\.|m\.)?instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/);
    },
    
    // Download Instagram reel using yt-dlp.exe
    async downloadInstagramReel(url, outputPath) {
        return new Promise((resolve, reject) => {
            ensureTempDir(outputPath);
            
            const command = `"${ytDlpPath}" "${url}" -o "${outputPath}" --no-playlist --no-warnings`;
            
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(outputPath);
            });
        });
    }
}