const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 600 });
  await page.setContent(`
    <!DOCTYPE html>
    <style>
      body { margin: 0; }
      .wrapper {
        position: fixed; top:0; left:0; width:100vw; height:100vh;
        background: rgba(0,0,0,0.8);
        display: flex; align-items: center; justify-content: center;
      }
      .map-container {
        position: relative;
        background: red;
        border: 4px solid blue;
        /* width: max-content; */
      }
      .map-img {
        display: block;
        width: auto;
        height: auto;
        max-width: 100%;
        max-height: 85vh;
      }
    </style>
    <div class="wrapper">
      <div class="map-container" id="container">
        <!-- intrinsic size 2000x2000 -->
        <img class="map-img" id="img" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 2000 2000'%3E%3Crect width='2000' height='2000' fill='green'/%3E%3C/svg%3E" />
      </div>
    </div>
  `);
  
  const containerBox = await page.$eval('#container', el => el.getBoundingClientRect());
  const imgBox = await page.$eval('#img', el => el.getBoundingClientRect());
  
  console.log('Container:', containerBox.width, containerBox.height);
  console.log('Image:', imgBox.width, imgBox.height);
  
  await browser.close();
})();
