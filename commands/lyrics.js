/**
 * Lyrics command to fetch song lyrics using Genius API
 */

const axios = require('axios');
const Genius = require('genius-lyrics');
const Client = new Genius.Client('KuWYacpf_0YOPwcGVpZ5cIFQJ_UkfHtbJDKrTn4tk3nL0ZfUk_PKhPwf7NIgbJtG');

module.exports = {
    name: "lyrics",
    description: "Fetch lyrics for a song using Genius API",
    usage: ".lyrics [song_name] [artist]",
    handler: async (sock, m, { text }) => {
        const songName = text;
        
        if (!songName) {
            await m.reply('❌ Please provide a song name after the command.');
            return;
        }

        try {
            // Send a loading message
            const loadingMessages = [
                "🎵 Searching for lyrics...",
                "🎧 Looking up that song...",
                "🔍 Finding lyrics for you...",
                "📜 Fetching the lyrics scroll..."
            ];
            const randomLoadingMsg = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
            const reply = await m.reply(randomLoadingMsg);
            
            // Search for the song
            const searches = await Client.songs.search(songName);
            if (searches.length === 0) {
                await sock.sendMessage(m.chat, { 
                    text: '❌ No lyrics found for the song.', 
                    edit: reply.key 
                });
                return;
            }

            const song = searches[0];
            const lyrics = await song.lyrics();

            const formattedLyrics = `🎵 *${song.title}* by *${song.artist.name}* 🎵\n\n${lyrics}`;
            
            // Try to edit the message, or send a new message if editing fails
            try {
                await sock.sendMessage(m.chat, {
                    text: formattedLyrics,
                    edit: reply.key
                });
            } catch (error) {
                // If editing fails, just send a new message
                await m.reply(formattedLyrics);
            }
        } catch (error) {
            console.error(error);
            await m.reply('❌ An error occurred while fetching the lyrics. Please try again later.');
        }
    }
};