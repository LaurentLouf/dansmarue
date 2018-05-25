const puppeteer = require('puppeteer');
const path      = require('path') ; 
const fs        = require('fs')
const winston   = require('winston') ;

// Create a custom formatter : add a timestamp and pretty print the data
const MESSAGE = Symbol.for('message');
const jsonFormatter = (logEntry) => 
{
  const base = { timestamp: new Date() };
  const json = Object.assign(base, logEntry)
  logEntry[MESSAGE] = JSON.stringify(json, null, 2);
  return logEntry;
}

// Initialize a logger
const logger = winston.createLogger(
{
  format: winston.format(jsonFormatter)(),
  transports: [
    new winston.transports.File({ filename: '/home/parisenselle/processAdhesion/logs/error.log', level: 'error', eol: "\n\n" }),
    new winston.transports.File({ filename: '/home/parisenselle/processAdhesion/logs/info.log',  level: 'info',  eol: "\n\n" }),
    new winston.transports.File({ filename: '/home/parisenselle/processAdhesion/logs/debug.log', level: 'debug', eol: "\n\n" }),
    new winston.transports.Console()
  ]
});

(async () => 
{
  var loggedIn    = false ;
  var login       = '', password = '' ;
  var timeoutLoad = 20000 ; 

  // Launch browser in slow mo, create page with desktop viewport and log console outputs
  const browser = await puppeteer.launch({slowMo: 100});
  const page = await browser.newPage();
  await page.setViewport({width:1920, height:1080}) ;
  page.on('console', msg => console.log('PAGE LOG:', msg.text() ) );
  
  // Authenticate
  while ( loggedIn == false )
  {
    try 
    {
      await page.goto('https://moncompte.paris.fr/moncompte/jsp/site/Portal.jsp?page=myluteceusergu&view=createAccountModal') ;
      
      // Create a promise to wait for execution first : if done after the click, the page may already have changed ("navigation" finished) before the promise creation, which means we would wait for another "navigation" that will never occur, since we won't navigate further after login 
      await page.type('#username-login', login, {delay: Math.floor( Math.random()*50 + 25 ) } ) ;
      await page.type('#password-login', password, {delay: Math.floor( Math.random()*50 + 25 ) } ) ;     
      await Promise.all([
        page.waitForNavigation({timeout: timeoutLoad}),
        page.click('button[name="Submit"]') 
      ]) ; 

      // If it loaded, it means the authentication went well
      loggedIn = true ; 
      logger.log('info', 'Successfully logged in.' ) ;
    } 
    catch ( e )
    {
      logger.log('error', "A promise has been rejected. It may mean that the login information are wrong if it has been rejected because of a timeout.", {exception: e}) ; 
      await page.screenshot({path: 'login-promiseRejected.png'});
    }
  }


  let files = fs.readdirSync( path.relative ( process.cwd(), path.join(__dirname, '/images' ) ) ) ; 
  let iFile = 0 ; 
  
  while ( iFile != files.length )
  {
    try 
    {
      await page.goto('https://teleservices.paris.fr/dansmarue/');
      
      // First step : just continue to next step
      await page.screenshot({path: 'file' + iFile + '-step1.png'});
      await Promise.all([
        page.waitForNavigation({timeout: timeoutLoad}),
        page.click('button[name="action_validate_declaration"]')
      ]) ; 
      logger.log('info', 'First step (validate declaration) completed.' ) ;

      
      // Second step : fill the address. Use first recommendation from the interface
      await page.focus('#adresse') ; 
      await page.keyboard.type( path.parse(files[iFile]).name, {delay: Math.floor( Math.random()*50 + 25 ) } ) ;
      // Wait for autocomplete suggestions then click on the first one
      await page.waitForSelector("ul.ui-autocomplete", {visible:true, timeout: 3000}) ;
      await page.click('ul.ui-autocomplete li a') ; 
      await page.screenshot({path: 'file' + iFile + '-step2.png'});
      await Promise.all([
        page.waitForNavigation({timeout: timeoutLoad}),
        page.click('button[name="action_validate_address"]')
      ]);
      logger.log('info', 'Second step (validate address) completed.' ) ;

      
      // Third step : just continue to next step
      await page.screenshot({path: 'file' + iFile + '-step3.png'});
      await Promise.all([
        page.waitForNavigation({timeout: timeoutLoad}),
        page.click('button[name="action_validate_doublons"]')
      ]) ;
      logger.log('info', 'Third step (validate duplicates) completed.' ) ;


      // Fourth step : indicate reason
      await page.focus('input[name="typeSignalement"]') ;
      await page.keyboard.type('stationnement gênant', {delay: Math.floor( Math.random()*50 + 25 ) } ) ;
      // Wait for autocomplete suggestions then click on the first one
      await page.waitForSelector("ul.ui-autocomplete", {visible:true, timeout: 3000}) ;
      await page.click('ul.ui-autocomplete li a') ; 
      await page.screenshot({path: 'file' + iFile + '-step4.png'});
      await Promise.all([
        page.waitForNavigation({timeout: timeoutLoad}),
        page.click('button[name="action_validate_categorie"]')
      ]) ;
      logger.log('info', 'Fourth step (validate category) completed.' ) ;


      // Fifth step : upload the photo
      const filePath  = path.relative(process.cwd(), path.join(__dirname, 'images', files[iFile]) ) ;
      const input     = await page.$('#photo_ensemble');
      await page.evaluate( () => { $('#photo_ensemble').click(); } ) ; 
      await input.uploadFile(filePath);
      await page.waitForSelector('#_file_uploaded_photo_ensemble0') ; 
      await page.screenshot({path: 'file' + iFile + '-step5.png'});
      await Promise.all([
        page.waitForNavigation({timeout: timeoutLoad}),
        page.click('button[name="action_validate_finalisation"]')
      ]) ;
      logger.log('info', 'Fifth step (validate picture) completed.', {filepath: filePath} ) ;

      if ( process.argv[2] != "test" )
      {
        // Sixth step : finalize
        await page.screenshot({path: 'file' + iFile + '-step6.png'});
        await Promise.all([
          page.waitForNavigation({timeout: timeoutLoad}),
          page.click('button[name="action_validate_signalement"]')
        ]) ;
        logger.log('info', 'Sixth step (finalize) completed.' ) ;
      }
      
      // Go the next file
      iFile++ ; 
    }
    catch (e)
    {
      logger.log('error', "A promise has been rejected.", {exception: e}) ; 
      await page.screenshot({path: 'file' + iFile + '-promiseRejected.png'});
    }
  }
  

  // Close everything  
  await browser.close();
})();