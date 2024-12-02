const puppeteer = require('puppeteer')
const sharp = require('sharp')
const { exec } = require('child_process')
const fs = require('fs')
const { resolve } = require('path')
require('dotenv').config()

const cooldown = ms => new Promise(resolve => setTimeout(resolve, ms))

const webshot = async () => {
  try {
    const browser = await puppeteer.launch({
      //   executablePath: '/usr/bin/chromium-browser',
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

    // if error, will send error
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
    const outputPath = path.resolve(__dirname, './pic/webshot.png');
    await sharp(croppedImageBuffer).toFile(outputPath)
    console.log(`Screenshot completely saved in: ${outputPath}`)

    const waID = process.env.WA_GROUP_ID
    const waApiUrl = process.env.WA_API_URL

    const timestamp = new Date().toLocaleString()

    if (!waID || !waApiUrl) {
      throw new Error("not found!")
    }

    const caption = `${process.env.TITLE} | ${timestamp} (WIB)`

    const waCurlCommand = `curl -X POST -F "phone=${waID}" -F "view_once=false" -F "caption=${caption}" -F "image=@${outputPath}" -F "compress=false" ${waApiUrl}`
    console.log(`Sending screenshot to wangsaff...`)
    exec(waCurlCommand, (error) => {
      if (error) {
        console.error(`Error executing WhatsApp curl: ${error.message}`)
        return
      }

      fs.unlink(outputPath, (err) => {
        if (err) {
          console.error(`Error deleting file: ${err.message}`)
        } else {
          console.log(`File deleted: ${outputPath}`)
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
    await cooldown(300000)
  }
}
interval()

