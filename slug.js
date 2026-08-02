import puppeteer from "puppeteer";
import fs from "fs";

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const page = await browser.newPage();

  await page.goto("https://www.tick2trade.com/option-chain", { waitUntil: "domcontentloaded" });

  // Wait for the symbol dropdown
  await page.waitForSelector('select[data-testid="oc-symbol-select"]');

  // Extract all display names and slugs
  const slugs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('select[data-testid="oc-symbol-select"] option'))
      .map(opt => ({
        code: opt.innerText.trim(),   // display name shown in dropdown
        slug: opt.value               // actual slug used in URL
      }));
  });

  // Build mapping JSON
  const mapping = { indices: {}, stocks: {} };
  slugs.forEach(item => {
    // crude split: indices vs stocks
    if (
      item.code.toUpperCase().includes("NIFTY") ||
      item.code.toUpperCase().includes("SENSEX") ||
      item.code.toUpperCase().includes("BANKEX")
    ) {
      mapping.indices[item.code.toUpperCase()] = item.slug;
    } else {
      // use uppercase code as key
      mapping.stocks[item.code.replace(/\s+/g, "").toUpperCase()] = item.slug;
    }
  });

  fs.writeFileSync("symbolMap.json", JSON.stringify(mapping, null, 2));
  console.log("symbolMap.json updated with slugs");

  await browser.close();
})();
