import puppeteer from "puppeteer";
import fs from "fs";

// Convert dd-mm-yyyy into Tick2Trade format (dd mmm or mmm)
function formatExpiryForSite(dateStr) {
  const [dd, mm, yyyy] = dateStr.split("-");
  const months = [
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec"
  ];
  const monthName = months[parseInt(mm, 10) - 1];

  // If day is provided (weekly expiry)
  if (dd && dd.length === 2) {
    return `${dd} ${monthName}`;
  }
  // If only month (monthly expiry)
  return monthName;
}

async function scrapeTick2Trade(symbol, expiries) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const page = await browser.newPage();

  const url = `https://www.tick2trade.com/option-chain/${symbol}`;
  await page.goto(url, { waitUntil: "networkidle2" });

  const results = {};

  for (const exp of expiries) {
    const siteExp = formatExpiryForSite(exp);

    // Select expiry from dropdown
    await page.select("select", siteExp); // adjust selector to actual expiry dropdown
    await page.waitForTimeout(2000);      // wait for refresh

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

    // Store keyed by your original dd-mm-yyyy format
    results[exp] = summary;
  }

  await browser.close();
  return results;
}

async function main() {
  // Define your symbols and expiry dates in dd-mm-yyyy format
  const symbols = ["sensex", "nifty", "banknifty", "reliance", "tcs"];
  const expiriesMap = {
    sensex: ["06-08-2026", "13-08-2026", "20-08-2026", "27-08-2026", "03-09-2026"],
    nifty: ["04-08-2026", "11-08-2026", "18-08-2026", "25-08-2026", "01-09-2026"],
    banknifty: ["25-08-2026", "29-09-2026"],
    reliance: ["25-08-2026", "29-09-2026"], // example
    tcs: ["25-08-2026", "29-09-2026"]       // example
  };

  const allResults = {};
  for (const sym of symbols) {
    console.log(`Scraping ${sym}...`);
    allResults[sym] = await scrapeTick2Trade(sym, expiriesMap[sym]);
  }

  fs.writeFileSync("scraped.json", JSON.stringify(allResults, null, 2));
  console.log("Scraping complete. Results saved to scraped.json");
}

main();
