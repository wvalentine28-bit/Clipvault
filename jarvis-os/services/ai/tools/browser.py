import asyncio
from typing import Optional, Dict, Any, List
import structlog

logger = structlog.get_logger()


class BrowserAutomation:
    """
    Playwright-based browser automation for web scraping and automation tasks.
    """

    def __init__(self):
        self.playwright = None
        self.browser = None
        self.context = None

    async def initialize(self, headless: bool = True):
        from playwright.async_api import async_playwright

        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(
            headless=headless,
            args=["--no-sandbox", "--disable-setuid-sandbox"],
        )
        self.context = await self.browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        )
        logger.info("Browser automation initialized")

    async def close(self):
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()

    async def scrape_url(self, url: str, extract_text: bool = True) -> Dict[str, Any]:
        if not self.browser:
            await self.initialize()

        page = await self.context.new_page()
        try:
            await page.goto(url, wait_until="networkidle", timeout=30000)

            title = await page.title()

            if extract_text:
                text = await page.evaluate("""() => {
                    const scripts = document.querySelectorAll('script, style, nav, footer, header');
                    scripts.forEach(s => s.remove());
                    return document.body?.innerText || '';
                }""")
                # Clean up whitespace
                lines = [l.strip() for l in text.split('\n') if l.strip()]
                content = '\n'.join(lines[:200])  # Limit to 200 lines
            else:
                content = await page.content()

            return {
                "url": url,
                "title": title,
                "content": content,
                "success": True,
            }
        except Exception as e:
            logger.error("Browser scrape failed", url=url, error=str(e))
            return {"url": url, "success": False, "error": str(e)}
        finally:
            await page.close()

    async def execute_actions(
        self, url: str, actions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        if not self.browser:
            await self.initialize()

        page = await self.context.new_page()
        results = []

        try:
            await page.goto(url, wait_until="networkidle", timeout=30000)

            for action in actions:
                action_type = action.get("type")
                result = {"action": action_type, "success": False}

                try:
                    if action_type == "click":
                        await page.click(action["selector"], timeout=5000)
                        result["success"] = True

                    elif action_type == "type":
                        await page.fill(action["selector"], action["value"])
                        result["success"] = True

                    elif action_type == "screenshot":
                        screenshot = await page.screenshot(full_page=True)
                        result["screenshot_base64"] = screenshot.hex()
                        result["success"] = True

                    elif action_type == "extract":
                        selector = action.get("selector", "body")
                        text = await page.inner_text(selector)
                        result["text"] = text
                        result["success"] = True

                    elif action_type == "wait":
                        await asyncio.sleep(action.get("duration", 1))
                        result["success"] = True

                    elif action_type == "navigate":
                        await page.goto(action["url"], wait_until="networkidle")
                        result["success"] = True

                    elif action_type == "submit":
                        await page.press(action.get("selector", "body"), "Enter")
                        result["success"] = True

                except Exception as e:
                    result["error"] = str(e)

                results.append(result)

            return {"results": results, "final_url": page.url, "success": True}

        except Exception as e:
            return {"error": str(e), "success": False}
        finally:
            await page.close()

    async def take_screenshot(self, url: str) -> Optional[bytes]:
        if not self.browser:
            await self.initialize()

        page = await self.context.new_page()
        try:
            await page.goto(url, wait_until="networkidle", timeout=15000)
            screenshot = await page.screenshot(full_page=True)
            return screenshot
        except Exception as e:
            logger.error("Screenshot failed", url=url, error=str(e))
            return None
        finally:
            await page.close()


browser_automation = BrowserAutomation()
