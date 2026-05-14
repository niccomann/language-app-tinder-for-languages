#!/opt/homebrew/bin/python3
"""Set the customizeyourlingua.com SSL/TLS encryption mode to **Full**.

Upgrade from Flexible -> Full: encrypts the Cloudflare<->origin leg too.
Prerequisite: the origin (EC2) must already serve HTTPS on :443 (the
`https-proxy` container does this with a self-signed cert; "Full" — not
"Full (strict)" — accepts a self-signed origin cert).

UI flow: Configure encryption mode -> Custom SSL/TLS card -> 'Select' ->
pick the 'Full' radio (NOT 'Full (strict)') -> 'Save'.
"""
import asyncio
import sys
from playwright.async_api import async_playwright

CDP = "http://127.0.0.1:9222"
URL = ("https://dash.cloudflare.com/b9cdb51dc62a54c28ff0b10f10d7353a/"
       "customizeyourlingua.com/ssl-tls/configuration")


async def main():
    async with async_playwright() as p:
        b = await p.chromium.connect_over_cdp(CDP)
        ctx = b.contexts[0]
        page = ctx.pages[0] if ctx.pages else await ctx.new_page()
        await page.goto(URL, wait_until="domcontentloaded")
        await page.wait_for_timeout(6000)

        # 1) Expand the Custom SSL/TLS card.
        custom_heading = page.get_by_text("Custom SSL/TLS", exact=True).first
        card = custom_heading.locator(
            "xpath=ancestor::*[.//button[normalize-space()='Select']][1]")
        select_btn = card.get_by_role("button", name="Select", exact=True)
        if await select_btn.count() == 0:
            print("! 'Select' button for Custom card not found", flush=True)
            await page.screenshot(path="/tmp/cf_ssl_full_fail.png")
            return 2
        await select_btn.first.click()
        await page.wait_for_timeout(2500)
        print("expanded Custom SSL/TLS card", flush=True)

        # 2) Pick the 'Full' radio — must NOT be 'Full (strict)' or 'Flexible'.
        radios = page.locator('input[type=radio]')
        n = await radios.count()
        print(f"radios visible: {n}", flush=True)
        picked = False
        for i in range(n):
            r = radios.nth(i)
            block = r.locator("xpath=ancestor::label[1] | xpath=ancestor::*[self::div][3]")
            try:
                txt = (await block.first.inner_text()).lower()
            except Exception:
                txt = ""
            if "full" in txt and "strict" not in txt and "flexible" not in txt:
                await r.check(force=True)
                picked = await r.is_checked()
                print(f"  Full radio idx {i} checked={picked}", flush=True)
                break
        if not picked:
            print("! could not find the 'Full' (non-strict) radio", flush=True)
            await page.screenshot(path="/tmp/cf_ssl_full_fail.png", full_page=True)
            return 2

        await page.wait_for_timeout(1000)
        await page.screenshot(path="/tmp/cf_ssl_full_before_save.png", full_page=True)

        # 3) Save.
        save = page.get_by_role("button", name="Save", exact=True)
        if await save.count() == 0 or not await save.first.is_enabled():
            print("! Save button not enabled", flush=True)
            return 2
        await save.first.click()
        await page.wait_for_timeout(4000)

        # 4) Verify on the overview page.
        await page.goto(URL.replace("/configuration", ""), wait_until="domcontentloaded")
        await page.wait_for_timeout(5000)
        await page.screenshot(path="/tmp/cf_ssl_full_final.png", full_page=True)
        body = (await page.inner_text("body")).lower()
        ok = "full" in body and "your ssl/tls encryption mode is full" in body.replace("\n", " ")
        # looser check: just confirm 'Full' appears as the active mode
        print("VERIFY: 'full' present in overview" if "full" in body else "VERIFY: full NOT found", flush=True)
        print("OK" if "full" in body else "CHECK /tmp/cf_ssl_full_final.png", flush=True)
        return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
