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

  const summary = await page.evaluate(() => {
  function getText(selector) {
    const el = document.querySelector(selector);
    return el ? el.innerText.trim() : null;
  }

  return {
    spot: getText("h-spot"),          // adjust selector
    atm: getText("h-atm"),            // adjust selector
    maxPain: getText("h-max-pain"),   // adjust selector
    pcrOI: getText("h-pcr"),          // adjust selector
    highestCallOI: getText("h-hc-oi"),
    highestPutOI: getText("h-hp-oi"),
    atmStraddle: getText("h-straddle"),
    highestCallChangeOI: getText("h-hc-chg"),
    highestPutChangeOI: getText("h-hp-chg"),
    ivx: getText("h-ivx")
  };
});

  });

  await browser.close();
  return data;
}

async function main() {
  const symbols = ["sensex", "nifty"];
  const results = {};

  for (const sym of symbols) {
    results[sym] = await scrapeTick2Trade(sym);
  }

  fs.writeFileSync("scraped.json", JSON.stringify(results, null, 2));
}

main();
