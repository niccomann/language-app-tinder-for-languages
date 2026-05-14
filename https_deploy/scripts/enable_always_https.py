#!/opt/homebrew/bin/python3
"""Enable 'Always Use HTTPS' for the customizeyourlingua.com zone (redirect every
http:// request to https://), via the Cloudflare dashboard.

The toggle is a visually-hidden <input type=checkbox> styled as a switch; a
plain label/parent click does not register, so we force-click the input itself.
"""
import asyncio
import sys
from playwright.async_api import async_playwright

CDP = "http://127.0.0.1:9222"
URL = ("https://dash.cloudflare.com/b9cdb51dc62a54c28ff0b10f10d7353a/"
       "customizeyourlingua.com/ssl-tls/edge-certificates")


async def main():
    async with async_playwright() as p:
        b = await p.chromium.connect_over_cdp(CDP)
        ctx = b.contexts[0]
        page = ctx.pages[0] if ctx.pages else await ctx.new_page()
        await page.goto(URL, wait_until="domcontentloaded")

        # Wait for the actual setting to render rather than a blind sleep.
        heading = page.get_by_text("Always Use HTTPS", exact=True).first
        await heading.wait_for(state="visible", timeout=30000)
        await heading.scroll_into_view_if_needed()
        await page.wait_for_timeout(800)

        # The checkbox nearest (vertically) to the heading is the right one.
        handle = await page.evaluate_handle("""() => {
          let lead = null;
          for (const e of document.querySelectorAll('*')) {
            if (e.children.length === 0 &&
                (e.textContent || '').trim() === 'Always Use HTTPS') { lead = e; break; }
          }
          if (!lead) return null;
          const ly = lead.getBoundingClientRect().top;
          let best = null, bd = 1e9;
          for (const cb of document.querySelectorAll('input[type=checkbox]')) {
            const d = Math.abs(cb.getBoundingClientRect().top - ly);
            if (d < bd && d < 120) { bd = d; best = cb; }
          }
          return best;
        }""")
        cb = handle.as_element()
        if not cb:
            print("! Always Use HTTPS checkbox not found", flush=True)
            return 2

        if await cb.is_checked():
            print("Always Use HTTPS already ON", flush=True)
            return 0
        await cb.click(force=True)
        await page.wait_for_timeout(3000)
        ok = await cb.is_checked()
        print(f"Always Use HTTPS -> {'ON' if ok else 'still OFF (check manually)'}", flush=True)
        return 0 if ok else 2


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
