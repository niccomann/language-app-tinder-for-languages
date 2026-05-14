#!/opt/homebrew/bin/python3
"""Add the two A records (@ and www -> 3.64.236.66, proxied) to the
customizeyourlingua.com zone via the Cloudflare dashboard.

Screenshots the filled form BEFORE saving each record so the values can be
verified. Idempotent-ish: skips a name that already has an A record.
"""
import asyncio
import sys
from playwright.async_api import async_playwright

CDP = "http://127.0.0.1:9222"
ACCT = "b9cdb51dc62a54c28ff0b10f10d7353a"
ZONE = "customizeyourlingua.com"
ORIGIN_IP = "3.64.236.66"
RECORDS = [("@", ZONE), ("www", f"www.{ZONE}")]


async def existing_a_names(page):
    """Return set of names that already have an A record in the table."""
    names = set()
    rows = page.locator("table tbody tr")
    for i in range(await rows.count()):
        try:
            txt = (await rows.nth(i).inner_text()).strip()
        except Exception:
            continue
        if txt.split("\t")[0].strip().upper() == "A" or "\nA\n" in txt:
            for tok in txt.split():
                if ZONE in tok:
                    names.add(tok)
    return names


async def add_record(page, name_input_value, full_name):
    print(f"  + add A {full_name} -> {ORIGIN_IP}", flush=True)
    await page.get_by_role("button", name="Add record").first.click()
    await page.wait_for_timeout(3000)

    # Type defaults to "A" — leave it.
    # Name field: matched reliably by its accessible label (the #id is duplicated
    # in the DOM, so an id selector is not safe here).
    name_field = page.get_by_label("Name (required)")
    await name_field.click()
    await name_field.fill(name_input_value)
    await page.wait_for_timeout(400)

    ip_field = page.locator("#ipv4_address")
    await ip_field.fill(ORIGIN_IP)
    await page.wait_for_timeout(400)

    # Proxy status: #proxied checkbox should already be ON (default). Verify.
    proxied = await page.locator("#proxied").is_checked()
    print(f"    proxied checkbox = {proxied}", flush=True)
    if not proxied:
        await page.locator("#proxied").click()

    shot = f"/tmp/cf_addrec_{name_input_value.replace('@','apex')}.png"
    await page.screenshot(path=shot)
    print(f"    screenshot -> {shot}", flush=True)

    # Save — the form's own Save button.
    save = page.get_by_role("button", name="Save", exact=True)
    if await save.count() == 0 or not await save.last.is_enabled():
        print("    ! Save button not available", flush=True)
        return False
    await save.last.click()
    await page.wait_for_timeout(4500)
    return True


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp(CDP)
        ctx = browser.contexts[0]
        page = ctx.pages[0] if ctx.pages else await ctx.new_page()

        await page.goto(f"https://dash.cloudflare.com/{ACCT}/{ZONE}/dns/records",
                        wait_until="domcontentloaded")
        await page.wait_for_timeout(6000)

        have = await existing_a_names(page)
        print(f"existing A names: {have or '(none)'}", flush=True)

        for name_value, full in RECORDS:
            if full in have:
                print(f"  = {full} already has an A record — skip", flush=True)
                continue
            ok = await add_record(page, name_value, full)
            if not ok:
                print(f"  ! could not save {full} — stopping", flush=True)
                await page.screenshot(path="/tmp/cf_addrec_FAIL.png")
                return 2
            await page.wait_for_timeout(1500)

        await page.wait_for_timeout(2000)
        await page.screenshot(path="/tmp/cf_dns_after.png", full_page=True)
        print("final screenshot -> /tmp/cf_dns_after.png", flush=True)

        # dump table
        rows = page.locator("table tbody tr")
        print("--- DNS table now ---", flush=True)
        for i in range(await rows.count()):
            try:
                print("  " + (await rows.nth(i).inner_text()).replace("\n", " | "), flush=True)
            except Exception:
                pass
        return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
