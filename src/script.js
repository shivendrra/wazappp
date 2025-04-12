const puppeteer = require('puppeteer');
const fs = require('fs');
const csv = require('csv-parser');

// Config
const message = "Hello, this is an automated message sent from my script 😎";
const csvPath = 'phone_numbers.csv';

const readCSV = (path) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(path)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
};

(async () => {
  const phoneList = await readCSV(csvPath);

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const page = await browser.newPage();
  await page.goto('https://web.whatsapp.com');

  console.log("🔒 Scan the QR code to login to WhatsApp Web...");
  await page.waitForSelector('canvas[aria-label="Scan me!"]', { timeout: 0 }); // wait for QR
  await page.waitForSelector('._2UwZ_'); // wait until logged in

  for (let contact of phoneList) {
    const phoneNumber = contact.CountryCode + contact.Phone;
    const url = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    
    console.log(`📨 Sending message to ${phoneNumber}...`);
    await page.goto(url);
    
    // Wait for chat to load
    try {
      await page.waitForSelector('div[contenteditable="true"]', { timeout: 15000 });
      await page.keyboard.press('Enter');
      console.log(`✅ Message sent to ${phoneNumber}`);
    } catch (err) {
      console.log(`❌ Failed to send message to ${phoneNumber}`);
    }

    // Random delay between 7 to 20 seconds
    const delay = Math.floor(Math.random() * (20000 - 7000 + 1)) + 7000;
    console.log(`⏳ Waiting ${delay / 1000}s before next message...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  console.log("✅ All messages sent!");
  await browser.close();
})();