import puppeteer from "puppeteer";

const symbols = ["nifty", "banknifty", "sensex", "reliance", "tcs"]; // extend to all F&O

async function scrapeAll() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const results = {};

  for (const sym of symbols) {
    const url = `https://www.tick2trade.com/option-chain/${sym}`;
    await page.goto(url, { waitUntil: "networkidle2" });

    const data = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll("table tbody tr"));
      return rows.map(row => {
        const cells = row.querySelectorAll("td");
        return {
          strike: cells[0]?.innerText.trim(),
          callOI: cells[1]?.innerText.trim(),
          putOI: cells[2]?.innerText.trim(),
          // add more columns as needed
        };
      });
    });

    results[sym] = data;
  }

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
}

scrapeAll();
