const puppeteer = require('puppeteer');

(async () => {
  process.argv.shift()
  process.argv.shift()
  const [url='http://localhost:3001',destination='./output.pdf'] = process.argv
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(0); 
  await page.setViewport({
    width: 1080,
    height: 2050
  })
  await page.goto(url,
	  {
      //waitUntil: "networkidle2",
      waitUntil: "networkidle0",
      //waitUntil: "domcontentloaded",
      timeout: 0
	  });
  await page.emulateMedia('print');//screen
//  await page.pdf({
//    path: './react.pdf', // path (relative to CWD) to save the PDF to.
//    printBackground: true,// print background colors
//    width: '1080px', // match the css width and height we set for our PDF
//    height: '2050px',
  //  });
  await page.pdf({
	    path: destination,
            format: 'A4',
            printBackground: true,
            margin: {
                left: '0px',
                top: '0px',
                right: '0px',
                bottom: '0px'
            }
  })
  await browser.close();
})()
