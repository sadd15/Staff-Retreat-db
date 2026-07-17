import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 600 });
  await page.goto('file://' + process.cwd() + '/test_fit.html');
  const cont = await page.$eval('#cont', el => el.getBoundingClientRect());
  const img = await page.$eval('#img', el => el.getBoundingClientRect());
  console.log('Container:', cont.width, cont.height);
  console.log('Image:', img.width, img.height);
  await browser.close();
})();
