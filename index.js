const fastcsv = require('fast-csv');
const fs = require('fs');
const ws = fs.createWriteStream("out.csv");
const puppeteer = require('puppeteer');

(async() => {
    const browser = await puppeteer.launch({
        headless: false
    });

    //Enter site provided in Question 5
    const page = await browser.newPage();
    await page.goto(' http://www.cool-proxy.net/proxies/http_proxy_list/sort:score/direction:desc');
    await page.setViewport({ width: 1366, height: 768});

    await page.waitFor('td[class="ng-binding"]');
    await page.waitFor(3000);

    //Find total number of pages needed to scrape through
    const totalPages = await page.evaluate(() => {
        const pg = document.querySelector('#main > table > tbody > tr:nth-child(23) > th > dir-pagination-controls > ul > li:nth-child(11) > a');
        return Number(pg.innerHTML);
    });

    let pageCount = 0;
    let ipAddresses = [];
    let ports = [];
    
    //-------------> START scrapePage function <------------
    let scrapePage = async() =>{

        // IP CHECK
        // check if it is an IP based on amount of periods in string
        // return true if there are 3
        let periodCheck = function(string){
            let count = 0;
            let chars = string.split('');

            chars.forEach(char =>{
                if (char === "."){
                    count += 1;
                }
            })

            if (count === 3){
                return true;
            } else {
                return false;
            }
        }

        // PORT CHECK
        // check if the port length is either 2 or 4
        // check if string does not equal 'No'
        let lengthCheck = function(string){
            if (string === "No" ){
                return false;
            }

            let count = 0;
            let chars = string.split('');

            chars.forEach(char =>{
                if (char === ":" || char === "a" || char === "i" || char === "y" || char === "e"){
                    count += 10;
                } else {
                    count += 1;
                }
            })

            if (count === 2 || count === 3 || count === 4 || count === 5){
                return true;
            } else {
                return false;
            }
        }

        // get strings of info from the table
        const data = await page.evaluate(() => {
            const tds = Array.from(document.querySelectorAll('table tr td'))
            return tds.map(td => td.innerHTML)
        });
        
        // go through each td and do the necessary checks
        data.forEach(el =>{
            
            if (periodCheck(el) === true){
                ipAddresses.push(el);
            }

            if (lengthCheck(el) === true){
                ports.push(el);
            }
        })
    }
    //-------------> END scrapePage function <------------

    // Go through all of the pages, scrape, and click next
    while(pageCount < totalPages - 1){
        scrapePage();
        await page.waitFor(5);
        pageCount += 1;
        await page.click('#main > table > tbody > tr:nth-child(23) > th > dir-pagination-controls > ul > li:nth-child(12)');
    }

    scrapePage();

    await page.waitFor(3000);

    // Group the ipAddresses and Ports together, since they are in order and the same length it can be done in O(n) time
    let grouped = [];
    
    for (let i = 0; i < ipAddresses.length; i ++){
        grouped.push([ipAddresses[i], ports[i]]);
    }

    fastcsv
        .write(grouped, { headers: true })
        .pipe(ws);

    await browser.close();
})();