import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";

puppeteer.use(StealthPlugin());

async function scrapeTick2Trade(symbols) {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
      "--disable-gpu",
      "--window-size=1920,1080"
    ]
  });
  const page = await browser.newPage();

  const allResults = {};

  for (const sym of symbols) {
    console.log(`Opening ${sym}...`);
    await page.goto(`https://www.tick2trade.com/option-chain/${sym}`, { waitUntil: "domcontentloaded" });

    try {
      await page.waitForSelector('select[data-testid="oc-expiry-select"]', { timeout: 30000 });
    } catch {
      console.error(`Expiry dropdown not found for ${sym}`);
      continue;
    }

    const expiries = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('select[data-testid="oc-expiry-select"] option'))
        .map(opt => ({ value: opt.value, text: opt.innerText.trim() }));
    });

    const results = {};

    for (const exp of expiries) {
      console.log(`Scraping ${sym} / ${exp.text}`);
      await page.select('select[data-testid="oc-expiry-select"]', exp.value);
      await page.waitForSelector('[data-testid="h-spot"] div.mt-1', { timeout: 30000 });

      const summary = await page.evaluate(() => {
        function getText(sel) {
          const el = document.querySelector(sel);
          return el ? el.innerText.trim() : null;
        }
        return {
          spot: getText('[data-testid="h-spot"] div.mt-1'),
          atm: getText('[data-testid="h-atm"] div.mt-1'),
          maxPain: getText('[data-testid="h-max-pain"] div.mt-1'),
          pcrOI: getText('[data-testid="h-pcr"] div.mt-1'),
          highestCallOI: getText('[data-testid="h-hc-oi"] div.mt-1'),
          highestPutOI: getText('[data-testid="h-hp-oi"] div.mt-1'),
          atmStraddle: getText('[data-testid="h-straddle"] div.mt-1'),
          highestCallChangeOI: getText('[data-testid="h-hc-chg"] div.mt-1'),
          highestPutChangeOI: getText('[data-testid="h-hp-chg"] div.mt-1'),
          ivx: getText('[data-testid="h-ivx"] div.mt-1')
        };
      });

      results[exp.text] = summary;
    }

    allResults[sym] = results;
  }

  await browser.close();
  return allResults;
}

async function main() {
  // Provide your full FNO index + stock codes here
  const symbols = ["sensex", "nifty", "banknifty", "reliance-industries"];

  const data = await scrapeTick2Trade(symbols);
  fs.writeFileSync("scraped.json", JSON.stringify(data, null, 2));
  console.log("Scraping complete. Results saved to scraped.json");
}

main();
