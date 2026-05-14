#!/opt/homebrew/bin/python3
"""Set the customizeyourlingua.com SSL/TLS encryption mode to **Flexible**.

The zone is currently on 'Automatic' (which resolved to Full). With an HTTP-only
origin (EC2 :80, no :443) Full/Automatic make HTTPS fail, so we switch to the
explicit Custom -> Flexible mode.

UI flow: Configure encryption mode -> Custom SSL/TLS card -> 'Select' ->
pick 'Flexible' radio -> 'Save'.
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

        # 1) Expand the Custom SSL/TLS card by clicking its 'Select' button.
        custom_heading = page.get_by_text("Custom SSL/TLS", exact=True).first
        card = custom_heading.locator(
            "xpath=ancestor::*[.//button[normalize-space()='Select']][1]")
        select_btn = card.get_by_role("button", name="Select", exact=True)
        if await select_btn.count() == 0:
            print("! 'Select' button for Custom card not found", flush=True)
            await page.screenshot(path="/tmp/cf_ssl_fail.png")
            return 2
        await select_btn.first.click()
        await page.wait_for_timeout(2500)
        print("expanded Custom SSL/TLS card", flush=True)

        # 2) Pick the Flexible radio.
        radios = page.locator('input[type=radio]')
        n = await radios.count()
        print(f"radios visible: {n}", flush=True)
        picked = False
        for i in range(n):
            r = radios.nth(i)
            block = r.locator("xpath=ancestor::label[1] | xpath=ancestor::*[self::div][3]")
            try:
                txt = await block.first.inner_text()
            except Exception:
                txt = ""
            if "Flexible" in txt and "Full" not in txt.split("Flexible")[0][-20:]:
                await r.check(force=True)
                picked = await r.is_checked()
                print(f"  Flexible radio idx {i} checked={picked}", flush=True)
                break
        if not picked:
            # fallback: click the visible 'Flexible' heading text
            await page.get_by_text("Flexible", exact=True).first.click()
            await page.wait_for_timeout(500)
            print("  picked Flexible via text fallback", flush=True)

        await page.wait_for_timeout(1000)
        await page.screenshot(path="/tmp/cf_ssl_before_save.png", full_page=True)

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
        await page.screenshot(path="/tmp/cf_ssl_final.png", full_page=True)
        body = await page.inner_text("body")
        mode_line = ""
        lines = body.split("\n")
        for i, l in enumerate(lines):
            if "encryption mode" in l.lower():
                mode_line = " ".join(lines[i:i+3]).strip()
                break
        print(f"VERIFY: {mode_line}", flush=True)
        print("OK" if "flexible" in body.lower() else "CHECK /tmp/cf_ssl_final.png", flush=True)
        return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
