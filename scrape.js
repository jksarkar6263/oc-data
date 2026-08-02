import puppeteer from "puppeteer";
import fs from "fs";

async function scrapeTick2Trade() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const page = await browser.newPage();

  // Go to the generic option-chain page (not /sensex)
  await page.goto("https://www.tick2trade.com/option-chain", { waitUntil: "domcontentloaded" });

  // Wait for the symbol dropdown
  await page.waitForSelector('select[data-testid="oc-symbol-select"]', { timeout: 30000 });

  // Get all symbols
  const symbols = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('select[data-testid="oc-symbol-select"] option'))
      .map(opt => ({ value: opt.value, text: opt.innerText.trim() }));
  });

  const allResults = {};

  for (const sym of symbols.slice(0, 5)) { // limit to first 5 for testing
    console.log(`Selecting symbol: ${sym.text}`);
    await page.select('select[data-testid="oc-symbol-select"]', sym.value);
    await page.waitForSelector('select[data-testid="oc-expiry-select"]', { timeout: 30000 });

    // Get all expiries for this symbol
    const expiries = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('select[data-testid="oc-expiry-select"] option'))
        .map(opt => ({ value: opt.value, text: opt.innerText.trim() }));
    });

    const results = {};

    for (const exp of expiries) {
      console.log(`Scraping ${sym.text} / ${exp.text}`);
      await page.select('select[data-testid="oc-expiry-select"]', exp.value);

      // Wait for summary metrics to appear
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

      console.log(`Got data for ${sym.text} / ${exp.text}:`, summary);
      results[exp.text] = summary;
    }

    allResults[sym.text] = results;
  }

  await browser.close();
  return allResults;
}

async function main() {
  const data = await scrapeTick2Trade();
  fs.writeFileSync("scraped.json", JSON.stringify(data, null, 2));
  console.log("Scraping complete. Results saved to scraped.json");
}

main();
