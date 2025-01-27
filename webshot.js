const puppeteer = require('puppeteer')
const sharp = require('sharp')
const { exec } = require('child_process')
const fs = require('fs')
require('dotenv').config()

const cooldown = ms => new Promise(resolve => setTimeout(resolve, ms))

const webshot = async () => {
  try {
    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/chromium-browser', //delete for windows user
      args: ['--no-sandbox'],
    })
    const page = await browser.newPage()

    const url = process.env.GRAFANA_URL
    const selector = process.env.SELECTOR

    if (!url || !selector) {
      throw new Error("URL or SELECTOR not found!")
    }

    await page.setViewport({ 
      width: parseInt(process.env.LEBAR), 
      height: parseInt(process.env.TINGGI) 
    })

    const waitTime = parseInt(process.env.WAIT_TIME)
    console.log(`Navigating to URL: ${url}`)
    await page.goto(url, { waitUntil: 'networkidle2', timeout: waitTime })

    console.log(`Waiting element: ${selector}`)
    await page.waitForSelector(selector, { timeout: waitTime })

    const element = await page.$(selector)
    const boundingBox = await element.boundingBox()

    const cropArea = {
      x: boundingBox.x,
      y: boundingBox.y,
      width: boundingBox.width - parseInt(process.env.LEBAR_CROP),
      height: boundingBox.height - parseInt(process.env.TINGGI_CROP),
    }

    console.log('Catching screenshot...')
    const screenshotBuffer = await page.screenshot()

    console.log('Cropping screenshot...')
    const croppedImageBuffer = await sharp(screenshotBuffer)
      .extract({
        left: cropArea.x,
        top: cropArea.y,
        width: cropArea.width,
        height: cropArea.height,
      })
      .toBuffer()
    const path = require('path')
    const outputPath = process.env.OUTPUT_DIR || path.resolve(__dirname, './pic/webshot.png');     
    await sharp(croppedImageBuffer).toFile(outputPath)
    console.log(`Screenshot completely saved in: ${outputPath}`)

    // Mengirim file ke Telegram dan whatsapp
    const chatId = process.env.TELEGRAM_CHAT_ID
    const telegramBotToken = process.env. TELEGRAM_BOT_TOKEN
    const grupID = process.env.WA_GROUP_ID;
    const waApiUrl = process.env.WA_API_URL;
    const title = process.env.TITLE
    
    const timestamp = new Date().toLocaleString();
    
    if (!chatId  || !grupID|| !waApiUrl) {
      throw new Error("Something not found!")
    }

    const caption = `${title} | ${timestamp} (WIB)`

    const telegramCurl = `curl -X POST -F "chat_id=${chatId}" -F "photo=@${outputPath}" -F "caption=${caption} " https://api.telegram.org/bot${telegramBotToken}/sendPhoto`
    const waCurl = `curl -X POST -F "phone=${grupID}" -F "view_once=false" -F "caption=${caption}" -F "image=@${outputPath}" -F "compress=false" ${waApiUrl}`

    const execCurl = `${telegramCurl} && ${waCurl}` 
    console.log(execCurl)
    console.log(`Trying to sending screenshot...`)
    exec(execCurl, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing curl: ${error.message}`)
        return
      }

      fs.unlink(outputPath, (err) => {
        if (err) {
            console.error(`Error deleting file: ${err.message}`);
        } else {
            console.log(`File deleted: ${outputPath}`);
        }
      })
    })

    await browser.close()
  } catch (error) {
    console.error(`Error!: ${error.message}`)
  }
}

//Send Interval
const interval = async () => {
  while (true) {
    await webshot()
    await cooldown(50000)
  }
}
interval()

