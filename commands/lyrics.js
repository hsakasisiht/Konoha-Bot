/**
 * Command to fetch and display song lyrics using Genius API
 * Enhanced version with better formatting and user experience
 */

const GeniusClient = require('../lib/genius');

// Initialize the Genius client
const genius = new GeniusClient();

module.exports = {
    name: "lyrics",
    description: "Get lyrics for a song using Genius API",
    usage: ".lyrics <song name>",
    handler: async (sock, m, { prefix, args }) => {
        try {
            // Get song name from arguments
            const text = args.join(" ");
            
            // Check if user wants to test the Genius API connectivity
            if (text === "test-api") {
                await m.reply("🧪 *Testing Genius API connection...*");
                try {
                    const testResponse = await genius.testApiConnection();
                    return m.reply(`✅ *Genius API Test Results:*\n\n${testResponse}`);
                } catch (error) {
                    return m.reply(`❌ *Genius API Test Failed:*\n\n${error.message}`);
                }
            }
            
            // Check if song name is provided
            if (!text) {
                return m.reply(`*🎵 Lyrics Command*\n\n❌ Please provide a song name.\n\n*Usage:* ${prefix}lyrics <song name>\n*Example:* ${prefix}lyrics Shape of You\n\n💡 *Tip:* For better results, include both artist and song title: "${prefix}lyrics Ed Sheeran - Shape of You"\n\n🧪 *Debug:* Use "${prefix}lyrics test-api" to check API connectivity`);
            }

            // Show searching status with a more engaging message
            const statusMsg = await m.reply(`*🔍 Lyric Search Initiated*\n\n_Searching for lyrics of_ "*${text}*"...\n\n_Please wait a moment while I find the perfect lyrics for you_ 🎵`);
            
            try {
                // Update status message with a more engaging searching animation
                await sock.sendMessage(m.chat, {
                    text: `*🔍 Searching Music Database*\n\n_Looking for_ "*${text}*" _in the music archives..._\n\n⏳ Please wait a moment...`,
                    edit: statusMsg.key
                }).catch(() => {});
                
                // Get song lyrics using the Genius library
                const songData = await genius.getSongLyrics(text);
                
                // Update status with song found
                await sock.sendMessage(m.chat, {
                    text: `*🎵 Song Found!*\n\n📝 Title: *${songData.title}*\n👤 Artist: *${songData.primary_artist.name}*\n\n_Preparing lyrics..._`,
                    edit: statusMsg.key
                }).catch(() => {});
                
                // Format lyrics with better styling
                const formattedLyrics = genius.formatLyrics(songData, text);
                
                // Split long lyrics into chunks if needed (WhatsApp may have message size limits)
                const maxMessageLength = 4000;
                if (formattedLyrics.length <= maxMessageLength) {
                    // Send full lyrics in one message
                    await sock.sendMessage(m.chat, {
                        text: formattedLyrics,
                        edit: statusMsg.key
                    });
                } else {
                    // Send the first part, editing the status message
                    await sock.sendMessage(m.chat, {
                        text: formattedLyrics.substring(0, maxMessageLength) + 
                              "\n\n───────────────\n*(Lyrics continued in next message...)*",
                        edit: statusMsg.key
                    });
                    
                    // Send the rest in new message(s)
                    let position = maxMessageLength;
                    while (position < formattedLyrics.length) {
                        const chunk = formattedLyrics.substring(
                            position, 
                            Math.min(position + maxMessageLength, formattedLyrics.length)
                        );
                        
                        await sock.sendMessage(m.chat, {
                            text: chunk + (position + maxMessageLength < formattedLyrics.length ? 
                                  "\n\n───────────────\n*(Continued in next message...)*" : "\n\n───────────────\n*End of lyrics* 🎵")
                        });
                        
                        position += maxMessageLength;
                    }
                }
            } catch (error) {
                console.error("Error fetching lyrics:", error);
                await sock.sendMessage(m.chat, {
                    text: `*❌ Lyrics Not Found*\n\nCouldn't find lyrics for "${text}".\n\n*Tips to improve your search:*\n• Try providing both artist and title: _"Artist - Song Title"_\n• Check spelling of artist and song names\n• Try using more popular song titles`,
                    edit: statusMsg.key
                });
            }
            
        } catch (error) {
            console.error("Error in lyrics command:", error);
            await m.reply(`*❌ Lyrics Error*\n\nSorry! I couldn't find lyrics because: ${error.message}\n\nPlease try again with a different search term.`);
        }
    }
};