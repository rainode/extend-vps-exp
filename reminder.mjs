import { rename, rm } from 'node:fs/promises'
import { setTimeout } from 'node:timers/promises'
import { chromium } from 'patchright'

const args = ['--no-sandbox', '--disable-setuid-sandbox']
let proxy
if (process.env.PROXY_SERVER) {
    const proxy_url = new URL(process.env.PROXY_SERVER)
    proxy = {
        server: `${proxy_url.protocol}//${proxy_url.host}`,
        username: proxy_url.username || undefined,
        password: proxy_url.password || undefined,
    }
}

const browser = await chromium.launch({
    args,
    proxy,
})
const context = await browser.newContext({
    viewport: { width: 1080, height: 1024 },
    recordVideo: { dir: '.', size: { width: 1080, height: 1024 } },
})
const page = await context.newPage()
const video = page.video()

try {
    await page.goto('https://secure.xserver.ne.jp/xapanel/login/xvps/', { waitUntil: 'networkidle' })
    await page.locator('#memberid').fill(process.env.EMAIL)
    await page.locator('#user_password').fill(process.env.PASSWORD)
    await page.locator('text=ログインする').click()
    await page.waitForNavigation({ waitUntil: 'networkidle' })
    const expireDate = await page.$eval('tr:has(.freeServerIco) .contract__term', p => p.textContent)
    const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' })
    console.log('expireDate', expireDate, 'tomorrow', tomorrow, expireDate === tomorrow)
    // 如果到期日是明天，则准备续期
    if (expireDate === tomorrow) {
        // TODO: 通过电子邮件、Slack 和 Discord 提醒即将到期的通知
        fetch('https://script.google.com/macros/s/AKfycbzbAcpAe_LGZsXpxjRl9aOV60q-XmuNC_bj62B5G45vR3vB13THNpoqiZr08AjMn_53Ug/exec?recipient=' + process.env.EMAIL)
    }
} catch (e) {
    console.error(e)
} finally {
    await setTimeout(5000)
    await context.close()
    if (video) {
        await rm('recording.webm', { force: true })
        await rename(await video.path(), 'recording.webm')
    }
    await browser.close()
}
