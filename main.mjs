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
    await page.locator('a[href^="/xapanel/xvps/server/detail?id="]').click()
    await page.locator('text=更新する').click()
    await page.locator('text=引き続き無料VPSの利用を継続する').click()
    await page.waitForNavigation({ waitUntil: 'networkidle' })
    const body = await page.$eval('img[src^="data:"]', img => img.src)
    const code = await fetch('https://captcha-120546510085.asia-northeast1.run.app', { method: 'POST', body }).then(r => r.text())
    await page.locator('[placeholder="上の画像の数字を入力"]').fill(code)
    await page.locator('text=無料VPSの利用を継続する').click()
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
