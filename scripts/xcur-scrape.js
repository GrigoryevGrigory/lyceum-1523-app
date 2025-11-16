const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const XCUR_LOGIN = process.env.XCUR_LOGIN;
const XCUR_PASSWORD = process.env.XCUR_PASSWORD;

if (!XCUR_LOGIN || !XCUR_PASSWORD) {
  console.error('Missing XCUR_LOGIN or XCUR_PASSWORD env vars');
  process.exit(1);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  try {
    await page.goto('https://xcur.l1523.ru', { waitUntil: 'networkidle2' });
    await page.type('input[type="email"], input[name="email"], input[name="login"]', XCUR_LOGIN);
    await page.type('input[type="password"]', XCUR_PASSWORD);
    await Promise.all([
      page.click('button[type="submit"], button.btn-primary'),
      page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);

    const homeworks = await scrapeHomeworks(page);
    const marks = await scrapeMarks(page);
    const syncedAt = new Date().toISOString();

    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(dataDir, 'homeworks.json'),
      JSON.stringify({ syncedat: syncedAt, homeworks }, null, 2)
    );
    fs.writeFileSync(
      path.join(dataDir, 'marks.json'),
      JSON.stringify({ syncedat: syncedAt, marks }, null, 2)
    );

    console.log(`Saved ${homeworks.length} homeworks and ${marks.length} marks`);
  } catch (e) {
    console.error('XCUR scrape failed:', e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();

async function scrapeHomeworks(page) {
  await page.goto('https://xcur.l1523.ru/homeworks', { waitUntil: 'networkidle2' });
  await page.waitForTimeout(1000);

  return page.evaluate(() => {
    const selectors = ['[data-homework-item]', '.homework-item', '.homework-row', '.task-card'];
    let cards = [];
    for (const sel of selectors) {
      cards = Array.from(document.querySelectorAll(sel));
      if (cards.length) break;
    }

    return cards.map((el, idx) => {
      const text = el.querySelector('.homework-text, .description')?.innerText?.trim() || el.innerText.trim();
      const subject = el.querySelector('.homework-subject, .subject')?.innerText?.trim() || null;
      const deadline = el.querySelector('.homework-deadline, .deadline, .date')?.innerText?.trim() || null;

      return {
        id: el.getAttribute('data-id') || `hw_auto_${idx}`,
        subject,
        text,
        dateissued: null,
        deadline,
        status: 'notstarted',
        grade: null,
        teachercomment: null,
        files: [],
        type: null
      };
    });
  });
}

async function scrapeMarks(page) {
  const urls = ['https://xcur.l1523.ru/marks', 'https://xcur.l1523.ru/grades'];
  for (const url of urls) {
    try {
      await page.goto(url, { waitUntil: 'networkidle2' });
      break;
    } catch { continue; }
  }
  await page.waitForTimeout(1000);

  return page.evaluate(() => {
    const rowsSelectors = ['table tbody tr', '.mark-row', '.mark-item'];
    let rows = [];
    for (const sel of rowsSelectors) {
      rows = Array.from(document.querySelectorAll(sel));
      if (rows.length) break;
    }

    return rows.map((tr, idx) => {
      const tds = tr.querySelectorAll('td');
      const subject = (tr.querySelector('.mark-subject') || tds[0])?.innerText?.trim() || null;
      const date = (tr.querySelector('.mark-date') || tds[1])?.innerText?.trim() || null;
      const workType = (tr.querySelector('.mark-type') || tds[2])?.innerText?.trim() || null;
      const gradeStr = (tr.querySelector('.mark-grade') || tds[3])?.innerText?.trim();
      const grade = gradeStr ? parseInt(gradeStr, 10) : null;

      return {
        id: tr.getAttribute('data-id') || `mark_auto_${idx}`,
        subject,
        worktype: workType,
        date,
        grade,
        weight: null,
        teacher: null,
        comment: null
      };
    });
  });
}
