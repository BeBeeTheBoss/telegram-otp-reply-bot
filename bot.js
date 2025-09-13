import axios from "axios";
import * as cheerio from "cheerio";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";

dotenv.config();

// put your bot token from BotFather
const token = process.env.BOT_TOKEN;

const bot = new TelegramBot(token, { polling: true });

bot.on("photo", async (msg) => {
  const chatId = msg.chat.id;
  const caption = msg.caption;

  if (caption) {
    const otpRegex = /otp\s+(\d+)/i;

    const match = caption.match(otpRegex);

    if (match) {
      let text = match[1];

      if (!text || text.startsWith("/")) return;

      const phoneRegex = /^09\d{7,15}$/;

      if (phoneRegex.test(text)) {
        bot.sendMessage(chatId, `ရှာပေးနေပါတယ် ခဏစောင့်ပေးပါနော်`);
        searchOtp(chatId, text);
      } else {
        bot.sendMessage(
          chatId,
          "ဖုန်းနံပါတ်ကိုမှန်မမှန် 09 နဲ့စပြီး ရိုက်ထည့်ပေးပါနော် ဥပမာ 09xxxxxxxx"
        );
      }
    }
  }

  // Regex: match "otp <digits>" (case-insensitive)
});

// ===== Scrape SMS logs =====
async function searchOtp(chatId, requested_phone) {
  try {
    // Step 2: Get SMS logs
    const requested_phone_fixed = "+959" + requested_phone.slice(2);

    const { data } = await axios.get("https://smspoh.com/portal/sms-log", {
      headers: {
        Cookie: process.env.COOKIE,
      },
    });

    const $ = cheerio.load(data);

    let otp_message = "";
    let found = false;

    $("table tbody tr").each((_, element) => {
      const phone = $(element).find(".strong").eq(0).text().trim();
      const message = $(element).find(".text-message").eq(0).text().trim();

      if (phone === requested_phone_fixed && !found) {
        otp_message = message;
        found = true;
      }
    });

    if (!otp_message) {
      bot.sendMessage(
        chatId,
        `${requested_phone} အတွက် OTP ရှာလို့မတွေ့ဘူးနော်`
      );
    } else {
      bot.sendMessage(
        chatId,
        `OTP message လေးရပါပြီနော် 😎 :\n\n${otp_message}`
      );
    }
  } catch (err) {
    console.error("Error fetching OTP:", err.message);
    bot.sendMessage(
      chatId,
      "OTP ထုတ်ယူရာတွင် Error ဖြစ်နေပါတယ် 😩 @BeBee2x ကိုလာပြောပေးပါနော်"
    );
  }
}

async function refreshSession() {
  try {
    const res = await axios.get("https://smspoh.com/portal/sms-log", {
      headers: {
        Cookie: process.env.COOKIE,
      },
    });

    const now = new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "long",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(new Date());

    console.log("Page refreshed at", now);
  } catch (err) {
    console.error("Failed to refresh:", err.message);
  }
}

setInterval(refreshSession, 30 * 60 * 1000);

console.log("Bot is listening for messages...");
// Optionally call immediately
refreshSession();
