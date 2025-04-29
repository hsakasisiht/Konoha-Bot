/**
 * Text-to-Speech command for WhatsApp Bot
 * Converts text to speech audio and sends it as a voice note
 * Uses Google's Text-to-Speech (gTTS) library
 */

const fs = require('fs');
const path = require('path');
const gTTS = require('gtts');
const { promisify } = require('util');

// Create temp folder if it doesn't exist
const tempDir = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

module.exports = {
    name: "say",
    description: "Convert text to speech and send as a voice note",
    usage: ".say <text> [language]",
    handler: async (sock, m, { prefix, args }) => {
        try {
            // Extract language code if provided (last argument starting with lang:)
            let text = '';
            let language = 'en'; // Default to English
            
            for (const arg of args) {
                if (arg.startsWith('lang:')) {
                    language = arg.slice(5).toLowerCase();
                } else {
                    text += arg + ' ';
                }
            }
            
            // Trim the text
            text = text.trim();
            
            // Check if text is provided
            if (!text) {
                return m.reply(`*🔊 Text-to-Speech Command*\n\n❌ Please provide some text to convert to speech.\n\n*Usage:* ${prefix}say <text> [lang:language-code]\n*Example:* ${prefix}say Hello, this is a test message!\n*Example with language:* ${prefix}say Hola, ¿cómo estás? lang:es`);
            }
            
            // Limit text length to prevent abuse
            if (text.length > 200) {
                return m.reply("❌ Text too long! Please limit your text to 200 characters.");
            }
            
            try {
                // Generate unique filename with timestamp
                const outputFile = path.join(tempDir, `speech-${Date.now()}.mp3`);
                
                // Create a new gTTS instance
                const gtts = new gTTS(text, language);
                
                // Convert save function to promise-based
                const savePromise = promisify((filepath, callback) => {
                    gtts.save(filepath, (err) => {
                        callback(err);
                    });
                });
                
                // Save the speech as MP3 - silently
                await savePromise(outputFile);
                
                console.log(`Speech saved to: ${outputFile}`);
                
                // Send the audio using the same method as sing.js - silently
                await sock.sendMessage(m.chat, {
                    audio: fs.readFileSync(outputFile),
                    mimetype: 'audio/mp4', // Using mp4 mimetype like in sing.js
                    fileName: `tts-${Date.now()}.mp3`,
                    ptt: true
                });
                
                console.log("Successfully sent audio as voice note");
                
                // Clean up the temporary file - silently
                fs.unlinkSync(outputFile);
                console.log("Temporary file deleted");
                
            } catch (error) {
                console.error('TTS Error:', error);
                
                // Only send messages in case of errors
                // If the specified language fails, try with English
                if (language !== 'en') {
                    try {
                        // Notify user about the language fallback
                        await m.reply(`⚠️ Failed with language "${language}". Trying with English instead...`);
                        
                        // Try again with English
                        const fallbackOutputFile = path.join(tempDir, `speech-fallback-${Date.now()}.mp3`);
                        const fallbackGtts = new gTTS(text, 'en');
                        
                        // Save with English
                        await promisify((filepath, callback) => {
                            fallbackGtts.save(filepath, (err) => {
                                callback(err);
                            });
                        })(fallbackOutputFile);
                        
                        // Send with English - silently
                        await sock.sendMessage(m.chat, {
                            audio: fs.readFileSync(fallbackOutputFile),
                            mimetype: 'audio/mp4',
                            fileName: `tts-fallback-${Date.now()}.mp3`,
                            ptt: true
                        });
                        
                        // Clean up
                        fs.unlinkSync(fallbackOutputFile);
                        
                    } catch (fallbackError) {
                        // Show error message only if fallback also fails
                        m.reply(`❌ *Error generating speech*\n\nPlease try again with a shorter text or different language.`);
                    }
                } else {
                    // Show error message
                    m.reply(`❌ *Error generating speech*\n\nPlease try again with a shorter text.`);
                }
            }
            
        } catch (e) {
            console.error('General TTS Error:', e);
            m.reply("❌ An error occurred while processing your request.");
        }
    }
};

// Hot reload support
let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(`Updated ${__filename}`);
    delete require.cache[file];
    require(file);
});