import puppeteer from 'puppeteer';
import axios from 'axios';
import dotenv from 'dotenv';

interface AvailableSlot {
  date: string;
  time: string;
  availableSeats: string;
}

function sortSlotsByDateTime(slots: AvailableSlot[]): AvailableSlot[] {
  const year = new Date().getFullYear();
  return slots.sort((a, b) => {
    const dateA = new Date(`${year}-${a.date}T${a.time}`);
    const dateB = new Date(`${year}-${b.date}T${b.time}`);

    return dateA.getTime() - dateB.getTime();
  });
}

async function searchAvailabilityInfo(): Promise<AvailableSlot[]> {
  dotenv.config({ path: '.env.local' });
  const browser = await puppeteer.launch({
    headless: true,
    // devtools: true,
    // defaultViewport: null,
  });
  const page = await browser.newPage();
  const url = process.env.PAGE_URL;
  if (!url) {
    throw new Error('URL is not defined.');
  }
  await page.goto(url);
  // await page.screenshot({ path: 'example.png' });

  // page.setDefaultTimeout(0);

  const availabilityInfo = await page.evaluate(() => {
    const availableSlots: AvailableSlot[] = [];

    // 日付情報を取得
    const dateElements = Array.from(
      document.querySelectorAll('thead > tr > th > span')
    );
    const dates = dateElements.map((el) =>
      (el as HTMLElement).innerText.trim()
    );

    // tbody内のすべてのtr要素を選択
    const trElements = document.querySelectorAll('tbody tr');

    trElements.forEach((tr) => {
      // 時刻情報を取得
      const timeElement = tr.querySelector('td:first-child span');
      const time = timeElement ? timeElement.textContent?.trim() : '';
      if (!time) {
        throw new Error('Time is not defined.');
      }

      const tdElements = tr.querySelectorAll('td');

      tdElements.forEach((td, colIndex) => {
        if (colIndex > 0 && colIndex < 4) {
          // 最初の3つの列だけを処理
          const date = dates[colIndex - 1];
          if (!date) {
            throw new Error('Date is not defined.');
          }

          const availableSeatsElement = td.querySelector(
            'div div a span:nth-child(2)'
          );

          // debugger;
          if (availableSeatsElement) {
            const availableSeats =
              availableSeatsElement.textContent?.trim() || '';
            availableSlots.push({ date, time, availableSeats });
          }
        }
      });
    });

    return availableSlots;
  });

  await browser.close();
  return availabilityInfo;
}

async function sendLineNotification(): Promise<void> {
  const info = await searchAvailabilityInfo();
  if (info.length) {
    const LINE_NOTIFY_API = process.env.LINE_NOTIFY_API || '';
    const LINE_NOTIFY_TOKEN = process.env.LINE_NOTIFY_TOKEN || '';

    const message = sortSlotsByDateTime(info)
      .map((slot) => {
        return `・${slot.date} ${slot.time} ${slot.availableSeats}空き`;
      })
      .join('\n');

    await axios.post(
      LINE_NOTIFY_API,
      `message=北欧サウナが空いたよ！\n\n${message}`,
      {
        headers: {
          Authorization: `Bearer ${LINE_NOTIFY_TOKEN}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
  }
}

sendLineNotification();

// // AWS Lambda のエントリーポイントとしてのハンドラー関数
// exports.handler = async (event: any) => {
//   await sendLineNotification();
//   return {
//     statusCode: 200,
//     body: JSON.stringify('Notification sent.'),
//   };
// };
