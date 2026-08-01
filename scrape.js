import puppeteer from "puppeteer";
import fs from "fs";

async function scrapeTick2Trade(symbol) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const url = `https://www.tick2trade.com/option-chain/${symbol}`;
  await page.goto(url, { waitUntil: "networkidle2" });

  const data = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll("table tbody tr"));
    return rows.map(row => {
      const cells = row.querySelectorAll("td");
      return {
        strike: cells[0]?.innerText.trim(),
        callOI: cells[1]?.innerText.trim(),
        putOI: cells[2]?.innerText.trim()
      };
    });
  });

  await browser.close();

  return data;
}

async function main() {
  const symbols = ["sensex", "nifty"]; // extend this list
  const results = {};

  for (const sym of symbols) {
    results[sym] = await scrapeTick2Trade(sym);
  }

  fs.writeFileSync("scraped.json", JSON.stringify(results, null, 2));
}

main();
