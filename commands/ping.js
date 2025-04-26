/**
 * Creative ping command to check if the bot is working
 */

module.exports = {
    name: "ping",
    description: "Check if the bot is online",
    usage: ".ping",
    handler: async (sock, m, { prefix }) => {
        const startTime = new Date();
        
        try {
            // Create an array of fun initial messages
            const pingMessages = [
                "⚡ Testing ninja reflexes...",
                "🍃 Sending chakra pulse...",
                "🔄 Summoning response jutsu...",
                "🌀 Creating Rasengan...",
                "👁️ Activating Sharingan...",
            ];
            
            // Select a random message
            const randomPingMsg = pingMessages[Math.floor(Math.random() * pingMessages.length)];
            
            // Send initial message
            const reply = await m.reply(randomPingMsg);
            const endTime = new Date();
            const responseTime = endTime - startTime;
            
            // Create an array of fun response messages
            const responseMessages = [
                `*⚡ LIGHTNING FAST!*\n\n*Speed:* ${responseTime}ms\n*Status:* Hidden leaf ninjas online and ready! 🍃`,
                `*💨 WHOOSH!*\n\n*Reaction time:* ${responseTime}ms\n*Chakra levels:* Fully charged and operational! ✨`,
                `*🔥 HOT RESPONSE!*\n\n*Jutsu speed:* ${responseTime}ms\n*Konoha Bot:* Ready for your commands, sensei! 🥷`,
                `*🌟 NINJA SPEED!*\n\n*Response time:* ${responseTime}ms\n*Konoha network:* Strong as the will of fire! 🔥`,
                `*🎯 TARGET HIT!*\n\n*Precision:* ${responseTime}ms\n*System:* All systems operational, Hokage-sama! 📶`
            ];
            
            // Select a random response message
            const randomResponseMsg = responseMessages[Math.floor(Math.random() * responseMessages.length)];
            
            // Try to edit the message, or send a new message if editing fails
            try {
                await sock.sendMessage(m.chat, {
                    text: randomResponseMsg,
                    edit: reply.key
                });
            } catch (error) {
                // If editing fails, just send a new message
                await m.reply(randomResponseMsg);
            }
        } catch (error) {
            // Fallback in case of any errors
            console.error("Error in ping command:", error);
            await sock.sendMessage(m.chat, { 
                text: `*🍃 I'm here!*\n\n*Konoha Bot* is online and ready to assist you! 🥷` 
            });
        }
    }
}