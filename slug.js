import puppeteer from "puppeteer";

(async () => {
  const browser = await puppeteer.launch({
    headless: false, // run with a visible browser so you can see it
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const page = await browser.newPage();

  await page.goto("https://www.tick2trade.com/option-chain", { waitUntil: "domcontentloaded" });

  // Wait for the symbol dropdown
  await page.waitForSelector('select[data-testid="oc-symbol-select"]');

  // Extract all codes and slugs
  const slugs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('select[data-testid="oc-symbol-select"] option'))
      .map(opt => ({
        displayName: opt.innerText.trim(),
        slug: opt.value
      }));
  });

  console.log(JSON.stringify(slugs, null, 2));

  await browser.close();
})();
