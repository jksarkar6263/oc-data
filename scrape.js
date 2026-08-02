import puppeteer from "puppeteer";
import fs from "fs";

async function scrapeTick2Trade(symbol) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const page = await browser.newPage();

  await page.goto("https://www.tick2trade.com/option-chain", { waitUntil: "networkidle2" });

  // Select the symbol
  await page.select('select[data-testid="oc-symbol-select"]', symbol);
  await new Promise(r => setTimeout(r, 2000));

  // Get all expiry options (value + text)
  const expiries = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('select[data-testid="oc-expiry-select"] option'))
      .map(opt => ({ value: opt.value, text: opt.innerText.trim() }));
  });

  const results = {};

  for (const exp of expiries) {
    // Select expiry by value
    await page.select('select[data-testid="oc-expiry-select"]', exp.value);
    await new Promise(r => setTimeout(r, 2000));

    const summary = await page.evaluate(() => {
      function getText(selector) {
        const el = document.querySelector(selector);
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

    // Store keyed by expiry text (e.g. "06 Aug", "13 Aug")
    results[exp.text] = summary;
  }

  await browser.close();
  return results;
}

async function main() {
  // Use the option values from the symbol dropdown (like "sensex", "nifty", "reliance")
  const symbols = ["sensex", "nifty", "banknifty", "reliance", "tcs"];
  const allResults = {};

  for (const sym of symbols) {
    console.log(`Scraping ${sym}...`);
    allResults[sym] = await scrapeTick2Trade(sym);
  }

  fs.writeFileSync("scraped.json", JSON.stringify(allResults, null, 2));
  console.log("Scraping complete. Results saved to scraped.json");
}

main();
