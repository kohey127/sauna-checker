"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer_1 = require("puppeteer");
const axios_1 = __importDefault(require("axios"));
function sortSlotsByDateTime(slots) {
    const year = new Date().getFullYear();
    return slots.sort((a, b) => {
        const dateA = new Date(`${year}-${a.date}T${a.time}`);
        const dateB = new Date(`${year}-${b.date}T${b.time}`);
        return dateA.getTime() - dateB.getTime();
    });
}
function searchAvailabilityInfo() {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = yield (0, puppeteer_1.launch)({
            headless: 'new',
            // devtools: true,
            // defaultViewport: null,
        });
        const page = yield browser.newPage();
        yield page.goto('https://select-type.com/rsv/?id=0AEeQuFE0HM');
        yield page.screenshot({ path: 'example.png' });
        // page.setDefaultTimeout(0);
        const availabilityInfo = yield page.evaluate(() => {
            const availableSlots = [];
            // 日付情報を取得
            const dateElements = Array.from(document.querySelectorAll('thead > tr > th > span'));
            const dates = dateElements.map((el) => el.innerText.trim());
            // tbody内のすべてのtr要素を選択
            const trElements = document.querySelectorAll('tbody tr');
            trElements.forEach((tr) => {
                var _a;
                // 時刻情報を取得
                const timeElement = tr.querySelector('td:first-child span');
                const time = timeElement ? ((_a = timeElement.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || '' : '';
                const tdElements = tr.querySelectorAll('td');
                tdElements.forEach((td, colIndex) => {
                    var _a;
                    if (colIndex > 0 && colIndex < 4) {
                        // 最初の3つの列だけを処理
                        const date = dates[colIndex - 1];
                        const availableSeatsElement = td.querySelector('div div a span:nth-child(2)');
                        // debugger;
                        if (availableSeatsElement) {
                            const availableSeats = ((_a = availableSeatsElement.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || '';
                            availableSlots.push({ date, time, availableSeats });
                        }
                    }
                });
            });
            return availableSlots;
        });
        yield browser.close();
        return availabilityInfo;
    });
}
function sendLineNotification() {
    return __awaiter(this, void 0, void 0, function* () {
        const info = yield searchAvailabilityInfo();
        if (info.length) {
            const LINE_NOTIFY_TOKEN = 'bFkbXrYaPksd3kZDWbk3PUalxzBTBkEmD3GDEcEPSxW';
            const LINE_NOTIFY_API = 'https://notify-api.line.me/api/notify';
            const message = sortSlotsByDateTime(info)
                .map((slot) => {
                return `・${slot.date} ${slot.time} ${slot.availableSeats}空き`;
            })
                .join('\n');
            yield axios_1.default.post(LINE_NOTIFY_API, `message=北欧サウナが空いたよ！\n\n${message}`, {
                headers: {
                    Authorization: `Bearer ${LINE_NOTIFY_TOKEN}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
        }
    });
}
sendLineNotification();
// AWS Lambda のエントリーポイントとしてのハンドラー関数
exports.handler = (event) => __awaiter(void 0, void 0, void 0, function* () {
    yield sendLineNotification();
    return {
        statusCode: 200,
        body: JSON.stringify('Notification sent.'),
    };
});
