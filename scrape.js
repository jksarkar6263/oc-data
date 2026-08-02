import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import symbolMap from "./symbolMap.json" assert { type: "json" };

puppeteer.use(StealthPlugin());

// rotate between multiple user agents
const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36"
];

async function scrapeTick2Trade() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const page = await browser.newPage();

  const allResults = {};

  for (const [code, slug] of Object.entries(symbolMap.indices)) {
    if (!slug) continue;
    await scrapeSymbol(page, code, slug, allResults);
  }

  for (const [code, slug] of Object.entries(symbolMap.stocks)) {
    if (!slug) continue;
    await scrapeSymbol(page, code, slug, allResults);
  }

  await browser.close();
  return allResults;
}

async function scrapeSymbol(page, code, slug, allResults) {
  const url = `https://www.tick2trade.com/option-chain/${slug}`;
  console.log(`Opening ${code} (${url})...`);

  // randomize UA each run
  const ua = userAgents[Math.floor(Math.random() * userAgents.length)];
  await page.setUserAgent(ua);
  await page.setViewport({ width: 1280, height: 800 });

  // retry logic around navigation
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
  } catch (err) {
    console.warn(`First attempt failed for ${code}, retrying...`);
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    } catch (err2) {
      console.error(`Navigation failed for ${code}: ${err2.message}`);
      return;
    }
  }

  // small delay to let scripts settle
  await page.waitForTimeout(1500);

  try {
    await page.waitForSelector('select[data-testid="oc-expiry-select"]', { timeout: 30000 });
  } catch {
    console.error(`Expiry dropdown not found for ${code}`);
    return;
  }

  const expiries = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('select[data-testid="oc-expiry-select"] option'))
      .map(opt => ({ value: opt.value, text: opt.innerText.trim() }));
  });

  const results = {};
  for (const exp of expiries) {
    console.log(`Scraping ${code} / ${exp.text}`);
    await page.select('select[data-testid="oc-expiry-select"]', exp.value);

    // wait a bit after selecting expiry
    await page.waitForTimeout(1000);

    try {
      await page.waitForSelector('[data-testid="h-spot"] div.mt-1', { timeout: 30000 });
    } catch {
      console.error(`Spot data not found for ${code} / ${exp.text}`);
      continue;
    }

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

  allResults[code] = results;
}

async function main() {
  const data = await scrapeTick2Trade();
  fs.writeFileSync("scraped.json", JSON.stringify(data, null, 2));
  console.log("Scraping complete. Results saved to scraped.json");
}

main();
