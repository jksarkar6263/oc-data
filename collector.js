import { chromium } from "playwright";

const url =
"https://smartoptions.trendlyne.com/options/latest/1887/NIFTY/nifty-50/";

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
