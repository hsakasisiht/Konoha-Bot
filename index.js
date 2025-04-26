/**
 * Konoha Bot v1.2.4
 * WhatsApp Multi-Device Bot
 * 
 * Using the same authentication method as Baileys
 */
require('./settings')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const chalk = require('chalk')
const FileType = require('file-type')
const path = require('path')
const axios = require('axios')
const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main');
const PhoneNumber = require('awesome-phonenumber')
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./lib/exif')
const { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, fetch, sleep, reSize } = require('./lib/myfunc')
const { 
    default: makeWASocket,
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion,
    generateForwardMessageContent,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    generateMessageID,
    downloadContentFromMessage,
    makeInMemoryStore,
    jidDecode,
    proto,
    jidNormalizedUser,
    makeCacheableSignalKeyStore,
    delay
} = require("@whiskeysockets/baileys")
const NodeCache = require("node-cache")
const pino = require("pino")
const readline = require("readline")
const { parsePhoneNumber } = require("libphonenumber-js")
const { PHONENUMBER_MCC } = require('@whiskeysockets/baileys/lib/Utils/generics')
const { rmSync, existsSync } = require('fs')
const { join } = require('path')

// Ensure session directory exists
if (!fs.existsSync('./session')) {
    console.log(chalk.yellow('Creating new session directory...'));
    fs.mkdirSync('./session', { recursive: true });
}

// Add connection state tracking at the top with other global variables
let isReconnecting = false;
let connectionAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 10000; // 10 seconds between reconnection attempts

// Create directory for storing owner information if it doesn't exist
if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data');
}

// Create owner.json if it doesn't exist
if (!fs.existsSync('./data/owner.json')) {
    fs.writeFileSync('./data/owner.json', JSON.stringify([global.ownernumber], null, 2));
}

// Create memory store for caching
const store = makeInMemoryStore({
    logger: pino().child({
        level: 'silent',
        stream: 'store'
    })
})

// Always use pairing code for authentication
const pairingCode = true
const useMobile = process.argv.includes("--mobile")

// Create readline interface for user input
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text) => new Promise((resolve) => rl.question(text, resolve))
         
async function startBot() {
    // Get the latest Baileys version
    let { version, isLatest } = await fetchLatestBaileysVersion()
    
    // Set up authentication state
    const { state, saveCreds } = await useMultiFileAuthState(`./session`)
    const msgRetryCounterCache = new NodeCache()

    // Check if there are existing credentials
    const hasExistingSession = state.creds.registered

    // Create WhatsApp connection
    const bot = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false, // Always use pairing code instead of QR
        browser: ["Ubuntu", "Chrome", "20.0.04"], // Browser identification
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
        },
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        getMessage: async (key) => {
            let jid = jidNormalizedUser(key.remoteJid)
            let msg = await store.loadMessage(jid, key.id)
            return msg?.message || ""
        },
        msgRetryCounterCache,
        defaultQueryTimeoutMs: undefined,
    })

    // Bind memory store to connection events
    store.bind(bot.ev)

    // Message handling
    bot.ev.on('messages.upsert', async chatUpdate => {
        try {
            const mek = chatUpdate.messages[0]
            if (!mek.message) return
            
            mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? 
                mek.message.ephemeralMessage.message : mek.message
                
            if (mek.key && mek.key.remoteJid === 'status@broadcast') {
                await handleStatus(bot, chatUpdate);
                return;
            }
            
            if (!bot.public && !mek.key.fromMe && chatUpdate.type === 'notify') return
            if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return
            
            try {
                await handleMessages(bot, chatUpdate, true)
            } catch (err) {
                console.error("Error in handleMessages:", err)
                if (mek.key && mek.key.remoteJid) {
                    await bot.sendMessage(mek.key.remoteJid, { 
                        text: '❌ *Jutsu Failed!*\n\nEven the greatest ninjas make mistakes. The technique encountered a forbidden barrier. Please try again later! 🍃',
                    }).catch(console.error);
                }
            }
        } catch (err) {
            console.error("Error in messages.upsert:", err)
        }
    })

    // Helper functions
    bot.decodeJid = (jid) => {
        if (!jid) return jid
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {}
            return decode.user && decode.server && decode.user + '@' + decode.server || jid
        } else return jid
    }

    // Contact updates
    bot.ev.on('contacts.update', update => {
        for (let contact of update) {
            let id = bot.decodeJid(contact.id)
            if (store && store.contacts) store.contacts[id] = { id, name: contact.notify }
        }
    })

    // Helper to get name from JID
    bot.getName = (jid, withoutContact = false) => {
        id = bot.decodeJid(jid)
        withoutContact = bot.withoutContact || withoutContact 
        let v
        if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
            v = store.contacts[id] || {}
            if (!(v.name || v.subject)) v = bot.groupMetadata(id) || {}
            resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'))
        })
        else v = id === '0@s.whatsapp.net' ? {
            id,
            name: 'WhatsApp'
        } : id === bot.decodeJid(bot.user.id) ? 
            bot.user :
            (store.contacts[id] || {})
        return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
    }

    // Set public mode
    bot.public = true

    // Message serializer
    bot.serializeM = (m) => smsg(bot, m, store)

    // Handle pairing code for authentication
    if (!hasExistingSession) {
        if (useMobile) throw new Error('Cannot use pairing code with mobile api')
        
        console.log(chalk.cyan('='.repeat(50)))
        console.log(chalk.yellow('🔄 No WhatsApp session found or session expired'))
        console.log(chalk.yellow('📱 Please link your WhatsApp account using a pairing code'))
        console.log(chalk.cyan('='.repeat(50)))

        // Always ask for phone number regardless of settings
        const phoneNumber = await question(chalk.bgBlack(chalk.greenBright(`📱 Please enter your full WhatsApp number:\n(include country code, e.g., +1234567890): `)))
        
        // Clean the phone number (remove non-numeric characters except the + at beginning)
        const cleanedNumber = phoneNumber.startsWith('+') 
            ? phoneNumber.substring(1).replace(/[^0-9]/g, '') 
            : phoneNumber.replace(/[^0-9]/g, '')
        
        if (cleanedNumber.length < 10) {
            console.log(chalk.red('❌ Invalid phone number format. Please restart the bot and try again.'))
            process.exit(1)
        }

        console.log(chalk.yellow(`\n⏳ Generating pairing code for: +${cleanedNumber}\n`))
        
        // Add enhanced error handling for requestPairingCode
        setTimeout(async () => {
            try {
                let code = await bot.requestPairingCode(cleanedNumber)
                code = code?.match(/.{1,4}/g)?.join("-") || code
                
                console.log(chalk.cyan('='.repeat(50)))
                console.log(chalk.greenBright(`✅ YOUR WHATSAPP PAIRING CODE: ${code}`))
                console.log(chalk.yellow(`\n📋 Instructions:
1. Open WhatsApp on your phone
2. Go to Settings > Linked Devices > Link a Device
3. When prompted, enter the code above
4. Keep this window open until connection is established`))
                console.log(chalk.cyan('='.repeat(50)))
                
                // Update owner.json with the new number
                fs.writeFileSync('./data/owner.json', JSON.stringify([cleanedNumber], null, 2))
                
            } catch (error) {
                console.error("Error while requesting pairing code:", error)
                console.log(chalk.red("❌ Failed to generate pairing code. Please check your connection or phone number format."))
                process.exit(1)
            }
        }, 3000)
    } else {
        console.log(chalk.green('✅ Existing session found, reconnecting...'))
    }

    // Connection handling
    bot.ev.on('connection.update', async (s) => {
        const { connection, lastDisconnect } = s
        
        if (connection === "open") {
            // Reset reconnection tracking since connection is successful
            isReconnecting = false;
            connectionAttempts = 0;
            
            console.log(chalk.magenta(` `))
            console.log(chalk.yellow(`🌿Connected to => ` + JSON.stringify(bot.user, null, 2)))
            
            // Send message to bot's own number
            const botNumber = bot.user.id.split(':')[0] + '@s.whatsapp.net'
            
            // Create a Naruto-themed startup message
            const startupMessages = [
                `🍃 *Konoha Bot v${global.botversion} Successfully Awakened!* 🍃\n\n⏰ Time: ${new Date().toLocaleString()}\n\n✨ *"I'm going to be the Hokage of WhatsApp bots!"* ✨\n\nYour loyal ninja assistant is ready to serve. Use *.help* to see available jutsu!`,
                
                `🌀 *Summoning Jutsu: Konoha Bot v${global.botversion}!* 🌀\n\n⏰ Summoned at: ${new Date().toLocaleString()}\n\n🔥 *"That is my ninja way!"* 🔥\n\nThis ninja tool is now at your command. The Will of Fire burns strong!`,
                
                `⚡ *Konoha Bot v${global.botversion} has entered Sage Mode!* ⚡\n\n⏰ Chakra synchronized at: ${new Date().toLocaleString()}\n\n🍜 *"I never go back on my word, that's my nindo!"* 🍜\n\nYour WhatsApp ninja is ready to assist. Believe it!`
            ];
            
            // Select a random message
            const randomStartupMsg = startupMessages[Math.floor(Math.random() * startupMessages.length)];
            
            await bot.sendMessage(botNumber, { 
                text: randomStartupMsg,
            }).catch(e => console.log("Error sending startup message:", e))

            await delay(1999)
            console.log(chalk.yellow(`\n\n                  ${chalk.bold.blue(`[ ${global.botname} v${global.botversion} ]`)}\n\n`))
            console.log(chalk.cyan(`< ================================================== >`))
            console.log(chalk.green(`${global.themeemoji} The Will of Fire Burns Bright! Bot is Ready! ✅`))
            
            // Close readline interface once connected
            if (rl.listening) {
                rl.close();
            }
        } else if (connection === "close") {
            // Handle disconnections properly
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            
            console.log(chalk.yellow('Connection closed due to:', lastDisconnect?.error?.output?.payload?.message || 'Unknown reason'));
            
            // If not already reconnecting and should reconnect
            if (!isReconnecting && shouldReconnect && connectionAttempts < maxReconnectAttempts) {
                isReconnecting = true;
                connectionAttempts += 1;
                
                console.log(chalk.yellow(`Reconnection attempt ${connectionAttempts}/${maxReconnectAttempts} in ${reconnectDelay/1000}s...`));
                
                // Wait before attempting to reconnect
                setTimeout(() => {
                    console.log(chalk.green('Attempting to reconnect...'));
                    isReconnecting = false;
                    startBot();
                }, reconnectDelay);
                
            } else if (connectionAttempts >= maxReconnectAttempts) {
                console.log(chalk.red(`Too many reconnection attempts (${connectionAttempts}). Please restart the bot manually.`));
                process.exit(1);
            } else if (!shouldReconnect) {
                console.log(chalk.red('Connection closed permanently. Please re-authenticate.'));
                // Delete session files if logged out
                if (lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut) {
                    console.log(chalk.yellow('Logged out from WhatsApp, cleaning up session...'));
                    try {
                        // Remove session directory
                        if (fs.existsSync('./session')) {
                            fs.rmSync('./session', { recursive: true, force: true });
                            console.log(chalk.green('Session files removed. Please restart the bot to re-authenticate.'));
                        }
                    } catch (err) {
                        console.error('Failed to clean up session:', err);
                    }
                }
                process.exit(0);
            }
        } else if (connection === "connecting") {
            console.log(chalk.yellow('Connecting to WhatsApp...'));
        }
    })

    // Update credentials when they change
    bot.ev.on('creds.update', saveCreds)
    
    // Group participant update handler
    bot.ev.on('group-participants.update', async (update) => {
        console.log('Group Update Event:', JSON.stringify(update, null, 2));  // Debug
        await handleGroupParticipantUpdate(bot, update);
    });

    // Additional status update handler (without duplicate messages.upsert)
    bot.ev.on('status.update', async (status) => {
        await handleStatus(bot, status);
    });

    return bot
}

// Start the bot with error handling
startBot().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
})

// Better error handling
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err)
    // Don't exit immediately to allow reconnection
})

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err)
    // Don't exit immediately to allow reconnection
})

// Hot reload capability
let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.redBright(`Update ${__filename}`))
    delete require.cache[file]
    require(file)
})