const puppeteer = require('puppeteer');

(async () => 
{
  var loggedIn = false ;
  var login = '', password = '' ;

  // Launch browser in slow mo, create page with desktop viewport and log console outputs
  const browser = await puppeteer.launch({slowMo: 100});
  const page = await browser.newPage();
  await page.setViewport({width:1920, height:1080}) ;
  page.on('console', msg => console.log('PAGE LOG:', msg.text() ) );
  
  // Go to the website
  try 
  {
    await page.goto('https://moncompte.paris.fr/moncompte/jsp/site/Portal.jsp?page=myluteceusergu&view=createAccountModal') ;
    
    // Create a promise to wait for execution first : if done after the click, the page may already have changed ("navigation" finished) before the promise creation, which means we would wait for another "navigation" that will never occur, since we won't navigate further after login
    var promiseLogin = page.waitForNavigation({timeout: 10000}) ; 
    await page.type('#username-login', login) ;
    await page.type('#password-login', password) ;     
    await page.click('button[name="Submit"]') ; 
    await promiseLogin ; 

    // If it loaded, it means the authentication went well
    loggedIn = true ; 

  } catch ( e )
  {
    console.log("A promise has been rejected. It may mean that the login information are wrong if it has been rejected because of a timeout. See the message below and screenshot of the page in the file promiseRejected.png.\n" + e) ; 
    await page.screenshot({path: 'promiseRejected.png'});
  }

  if ( loggedIn )
  {
    await page.goto('https://teleservices.paris.fr/dansmarue/');
    
    // First step : just continue to next step
    var promiseStep = page.waitForNavigation({timeout: 10000}) ; 
    await page.screenshot({path: 'step1.png'});
    await page.click('button[name="action_validate_declaration"]') ;
    await promiseStep ; 

    
    // Second step : fill the address. Use first recommendation from the interface
    promiseStep = page.waitForNavigation({timeout: 10000}) ;
    await page.focus('#adresse') ; 
    await page.keyboard.type("4 rue Lobau") ;
    // Wait for autocomplete suggestions then click on the first one
    await page.waitForSelector("ul.ui-autocomplete", {visible:true, timeout: 3000}) ;
    await page.click('ul.ui-autocomplete li a') ; 
    await page.screenshot({path: 'step2.png'});
    await page.click('button[name="action_validate_address"]') ; 
    await promiseStep ; 
  }

  // Close everything  
  await browser.close();
})();