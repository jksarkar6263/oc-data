import { chromium } from "playwright";

const url =
"https://smartoptions.trendlyne.com/phoenix/api/fno/option/chain/?expDate=2026-08-04&format=json&stockCode=NIFTY";

const browser = await chromium.launch({
    headless: true
});

const page = await browser.newPage();

const response = await page.goto(url, {
    waitUntil: "domcontentloaded"
});

console.log("Status:", response.status());
console.log("Content-Type:", response.headers()["content-type"]);

const text = await page.textContent("body");

console.log("First 1000 chars:");
console.log(text.substring(0,1000));

await browser.close();
