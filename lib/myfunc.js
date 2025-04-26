/**
 * Utility functions for WhatsApp Bot
 */

const { proto, delay, getContentType } = require('@whiskeysockets/baileys')
const chalk = require('chalk')
const fs = require('fs')
const axios = require('axios')
const path = require('path')
const { fileTypeFromBuffer } = require('file-type')

const unixTimestampSeconds = (date = new Date()) => Math.floor(date.getTime() / 1000)

exports.unixTimestampSeconds = unixTimestampSeconds

exports.sleep = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms))
}

exports.getBuffer = async (url, options) => {
    try {
        options = options || {}
        const res = await axios({
            method: "get",
            url,
            headers: {
                'DNT': 1,
                'Upgrade-Insecure-Request': 1
            },
            ...options,
            responseType: 'arraybuffer'
        })
        return res.data
    } catch (err) {
        console.log(`Error getting buffer: ${err}`)
        return null
    }
}

exports.fetchJson = async (url, options) => {
    try {
        options = options || {}
        const res = await axios({
            method: 'GET',
            url: url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
            },
            ...options
        })
        return res.data
    } catch (err) {
        console.log(`Error fetching json: ${err}`)
        return null
    }
}

exports.isUrl = (url) => {
    return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/, 'gi'))
}

exports.getSizeMedia = (path) => {
    return new Promise((resolve, reject) => {
        if (/http/.test(path)) {
            axios.get(path).then((res) => {
                let length = parseInt(res.headers['content-length'])
                let size = exports.bytesToSize(length)
                if (!isNaN(length)) resolve(size)
            })
        } else if (Buffer.isBuffer(path)) {
            let length = Buffer.byteLength(path)
            let size = exports.bytesToSize(length)
            if (!isNaN(length)) resolve(size)
        } else {
            fs.stat(path, function(err, stats) {
                if (err) reject(err)
                const size = exports.bytesToSize(stats.size)
                if (!isNaN(stats.size)) resolve(size)
            })
        }
    })
}

exports.bytesToSize = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

exports.smsg = (conn, m, store) => {
    if (!m) return m
    let M = proto.WebMessageInfo
    if (m.key) {
        m.id = m.key.id
        m.isBaileys = m.id && m.id.length === 16 || m.id.startsWith('BAE5') && m.id.length === 16 || m.id.startsWith('3EB0') && m.id.length === 12
        m.chat = m.key.remoteJid
        m.fromMe = m.key.fromMe
        m.isGroup = m.chat.endsWith('@g.us')
        m.sender = m.fromMe ? conn.user.id : m.isGroup ? m.key.participant : m.chat
    }
    if (m.message) {
        m.mtype = getContentType(m.message)
        m.msg = (m.mtype == 'viewOnceMessage' ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)] : m.message[m.mtype])
        try {
            m.body = (m.mtype === 'conversation') ? m.message.conversation : (m.mtype == 'imageMessage') ? m.message.imageMessage.caption : (m.mtype == 'videoMessage') ? m.message.videoMessage.caption : (m.mtype == 'extendedTextMessage') ? m.message.extendedTextMessage.text : (m.mtype == 'buttonsResponseMessage') ? m.message.buttonsResponseMessage.selectedButtonId : (m.mtype == 'listResponseMessage') ? m.message.listResponseMessage.singleSelectReply.selectedRowId : (m.mtype == 'templateButtonReplyMessage') ? m.message.templateButtonReplyMessage.selectedId : (m.mtype === 'messageContextInfo') ? (m.message.buttonsResponseMessage?.selectedButtonId || m.message.listResponseMessage?.singleSelectReply.selectedRowId || m.text) : ''
        } catch {
            m.body = ''
        }
    }
    
    // Add reply function
    m.reply = (text, chatId = m.chat, options = {}) => {
        return conn.sendMessage(chatId, { text: text, ...options }, { quoted: m })
    }
    
    return m
}

// Add improved audio sending function
exports.sendAudio = async (conn, jid, buffer, caption) => {
    try {
        // Try multiple methods to send audio, starting with the most reliable
        // Method 1: Send as document with audio mimetype
        try {
            await conn.sendMessage(jid, {
                document: buffer,
                mimetype: 'audio/mpeg',
                fileName: `song_${Date.now()}.mp3`,
                caption: caption || ''
            });
            return true;
        } catch (err) {
            console.log("Document method failed, trying audio method:", err);
        }
        
        // Method 2: Send as audio with default options
        try {
            await conn.sendMessage(jid, {
                audio: buffer,
                mimetype: 'audio/mp4',
                ptt: false
            });
            return true;
        } catch (err) {
            console.log("Default audio method failed, trying with different mimetype:", err);
        }
        
        // Method 3: Try with different mimetype
        try {
            await conn.sendMessage(jid, {
                audio: buffer,
                mimetype: 'audio/mpeg',
                ptt: false
            });
            return true;
        } catch (err) {
            console.log("All audio sending methods failed:", err);
            return false;
        }
    } catch (err) {
        console.error("Error in sendAudio:", err);
        return false;
    }
}

let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.greenBright(`Updated ${__filename}`))
    delete require.cache[file]
    require(file)
})