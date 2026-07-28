import { chromium } from "playwright";
import fs from "fs";


const url =
"https://smartoptions.trendlyne.com/phoenix/api/fno/option/chain/?expDate=2026-08-04&format=json&stockCode=NIFTY";


async function main(){

    const browser = await chromium.launch({

        headless:true

    });


    const page = await browser.newPage();


    let jsonData = null;


    page.on("response", async response => {

        const responseUrl = response.url();

        if(responseUrl.includes("/option/chain/")){

            try{

                jsonData = await response.json();

            }
            catch(e){

                console.log("JSON capture error");

            }

        }

    });


    await page.goto(url,{

        waitUntil:"networkidle"

    });


    await page.waitForTimeout(3000);


    if(!jsonData){

        throw new Error(
            "Option chain JSON not captured"
        );

    }


    fs.writeFileSync(

        "option-chain.json",

        JSON.stringify(
            jsonData,
            null,
            2
        )

    );


    console.log(
        "Option chain saved successfully"
    );


    await browser.close();

}


main();
