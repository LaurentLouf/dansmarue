const puppeteer = require('puppeteer');

(async () => 
{
  // Launch browser in slow mo, create page with desktop viewport and log console outputs
  const browser = await puppeteer.launch({slowMo: 1000});
  const page = await browser.newPage();
  await page.setViewport({width:1920, height:1080}) ;
  page.on('console', msg => console.log('PAGE LOG:', msg.text() ) );
  
  // Go to the website
  await page.goto('https://teleservices.paris.fr/dansmarue/');
  await page.screenshot({path: 'example.png'});

  // Close everything  
  await browser.close();
})();