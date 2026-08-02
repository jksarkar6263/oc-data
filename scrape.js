async function scrapeSymbol(page, code, slug, allResults) {
  const url = `https://www.tick2trade.com/option-chain/${slug}`;
  console.log(`Opening ${code} (${url})...`);

  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
    "AppleWebKit/537.36 (KHTML, like Gecko) " +
    "Chrome/114.0.0.0 Safari/537.36");
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

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

  allResults[code] = results;
}
