/**
 * Exif functions for sticker metadata
 */
const fs = require('fs')
const { tmpdir } = require('os')
const path = require('path')
const { promisify } = require('util')
const { exec } = require('child_process')
const webp = require('node-webpmux')
const sharp = require('sharp')

// Create temporary directories
const tmpFolder = path.join(tmpdir(), `${process.pid}`, 'tmp')
if (!fs.existsSync(tmpFolder)) fs.mkdirSync(tmpFolder, { recursive: true })

// Default sticker metadata
const defaultExif = {
    packname: 'New WhatsApp Bot',
    author: 'Made with ❤️'
}

// Process image for sticker
const imageToWebp = async (media) => {
    const tmpFileIn = path.join(tmpFolder, `${Date.now()}.jpg`)
    const tmpFileOut = path.join(tmpFolder, `${Date.now()}.webp`)
    
    try {
        fs.writeFileSync(tmpFileIn, media)
        await exec(`ffmpeg -i ${tmpFileIn} -vf scale=512:512 ${tmpFileOut}`)
        const buff = fs.readFileSync(tmpFileOut)
        fs.unlinkSync(tmpFileIn)
        fs.unlinkSync(tmpFileOut)
        return buff
    } catch (e) {
        console.error(e)
        if (fs.existsSync(tmpFileIn)) fs.unlinkSync(tmpFileIn)
        if (fs.existsSync(tmpFileOut)) fs.unlinkSync(tmpFileOut)
        return null
    }
}

// Process video for sticker
const videoToWebp = async (media) => {
    const tmpFileIn = path.join(tmpFolder, `${Date.now()}.mp4`)
    const tmpFileOut = path.join(tmpFolder, `${Date.now()}.webp`)

    try {
        fs.writeFileSync(tmpFileIn, media)
        await exec(`ffmpeg -i ${tmpFileIn} -vf scale=512:512 -t 10 -r 10 ${tmpFileOut}`)
        const buff = fs.readFileSync(tmpFileOut)
        fs.unlinkSync(tmpFileIn)
        fs.unlinkSync(tmpFileOut)
        return buff
    } catch (e) {
        console.error(e)
        if (fs.existsSync(tmpFileIn)) fs.unlinkSync(tmpFileIn)
        if (fs.existsSync(tmpFileOut)) fs.unlinkSync(tmpFileOut)
        return null
    }
}

// Write EXIF data to image sticker
const writeExifImg = async (media, metadata) => {
    const tmpFileIn = path.join(tmpFolder, `${Date.now()}.webp`)
    const tmpFileOut = path.join(tmpFolder, `${Date.now()}.webp`)

    try {
        const exifJSON = { 
            'sticker-pack-id': 'com.bot.stickers', 
            'sticker-pack-name': metadata.packname || defaultExif.packname,
            'sticker-pack-publisher': metadata.author || defaultExif.author
        }
        
        const img = new webp.Image()
        const buffer = await imageToWebp(media)
        await img.load(buffer)
        img.exif = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00])
        img.exif = Buffer.from(JSON.stringify(exifJSON))
        await img.save(tmpFileOut)
        return fs.readFileSync(tmpFileOut)
    } catch (e) {
        console.error(e)
        return null
    } finally {
        if (fs.existsSync(tmpFileOut)) fs.unlinkSync(tmpFileOut)
    }
}

// Write EXIF data to video sticker
const writeExifVid = async (media, metadata) => {
    const tmpFileIn = path.join(tmpFolder, `${Date.now()}.webp`)
    const tmpFileOut = path.join(tmpFolder, `${Date.now()}.webp`)

    try {
        const exifJSON = { 
            'sticker-pack-id': 'com.bot.stickers', 
            'sticker-pack-name': metadata.packname || defaultExif.packname,
            'sticker-pack-publisher': metadata.author || defaultExif.author
        }
        
        const img = new webp.Image()
        const buffer = await videoToWebp(media)
        await img.load(buffer)
        img.exif = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00])
        img.exif = Buffer.from(JSON.stringify(exifJSON))
        await img.save(tmpFileOut)
        return fs.readFileSync(tmpFileOut)
    } catch (e) {
        console.error(e)
        return null
    } finally {
        if (fs.existsSync(tmpFileOut)) fs.unlinkSync(tmpFileOut)
    }
}

module.exports = {
    imageToWebp,
    videoToWebp,
    writeExifImg,
    writeExifVid
}

let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log('Updated exif.js')
    delete require.cache[file]
    require(file)
})