import puppeteer from "puppeteer";
import fs from "fs";

async function scrapeTick2Trade(symbol) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const page = await browser.newPage();

  const url = `https://www.tick2trade.com/option-chain/${symbol}`;
  await page.goto(url, { waitUntil: "networkidle2" });

  // Extract summary metrics above the table
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

  await browser.close();
  return summary;
}

async function main() {
  // Add all indices and F&O stock codes you want here
  const symbols = ["sensex", "nifty", "banknifty", "reliance", "tcs"];
  const results = {};

  for (const sym of symbols) {
    console.log(`Scraping ${sym}...`);
    results[sym] = await scrapeTick2Trade(sym);
  }

  fs.writeFileSync("scraped.json", JSON.stringify(results, null, 2));
  console.log("Scraping complete. Results saved to scraped.json");
}

main();
