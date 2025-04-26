/**
 * Konoha Bot v1.2.4 - Settings
 */

const fs = require('fs')
const chalk = require('chalk')

// Bot settings
global.botname = "Konoha Bot"
global.botversion = "1.2.4"
global.ownername = "Bot Owner"
global.prefix = "."
global.themeemoji = "•"
global.ownernumber = '' // Will be set during pairing process

// Owner information
if (!fs.existsSync('./data/owner.json')) {
    const ownerData = JSON.stringify([], null, 2)
    fs.writeFileSync('./data/owner.json', ownerData)
}

// Auto read status
global.autoReadStatus = true

// Welcome and goodbye messages
global.welcomeMessage = true
global.goodbyeMessage = true

// Group settings
global.autoAddStatus = false

module.exports = {
    botname: global.botname,
    botversion: global.botversion,
    ownername: global.ownername,
    prefix: global.prefix,
    themeemoji: global.themeemoji,
    ownernumber: global.ownernumber,
    autoReadStatus: global.autoReadStatus,
    welcomeMessage: global.welcomeMessage,
    goodbyeMessage: global.goodbyeMessage,
    autoAddStatus: global.autoAddStatus
}

let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.yellowBright(`Updated settings: ${__filename}`))
    delete require.cache[file]
    require(file)
})