const express = require("express");
const axios = require("axios");
const cors = require("cors");
const cron = require("node-cron");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const { NAVModel } = require("./db");

const app = express();
app.use(cors());


dayjs.extend(utc);
dayjs.extend(timezone);

const schemesToSearch = [
  "JM Flexicap Fund (Direct) - Growth Option",
  "ICICI Prudential Nifty Next 50 Index Fund - Direct Plan -  Growth",
  "quant Small Cap Fund - Growth Option - Direct Plan",
  "Motilal Oswal Midcap Fund-Direct Plan-Growth Option",
  "Edelweiss US Technology Equity Fund of Fund- Direct Plan",
  "HDFC Balanced Advantage Fund - Growth Plan - Direct Plan",
];

const lastRefreshedMap = {}; 
const formatTime = () => dayjs().tz("Asia/Kolkata").format("DD-MMM-YYYY hh:mm A");

const customRoundNAV = (navStr) => {
  const nav = parseFloat(navStr);
  if (isNaN(nav)) return navStr;

  const [intPart, decimalPart = ""] = navStr.split(".");
  const d = decimalPart.padEnd(4, "0");

  const thirdDigit = parseInt(d[2]);
  const fourthDigit = parseInt(d[3]);

  let result;
  if (thirdDigit < 5) {
    result = Math.floor(nav * 100) / 100;
  } else if (thirdDigit > 5) {
    result = Math.ceil(nav * 100) / 100;
  } else {
    result =
      fourthDigit < 5
        ? Math.floor(nav * 100) / 100
        : Math.ceil(nav * 100) / 100;
  }
  return result.toFixed(2);
};

const updateLastRefreshed = async () => {
  const now = formatTime();
  console.log(`🕒 [Cron] Running NAV check at ${now}`);

  try {
    const { data } = await axios.get(
      "https://www.amfiindia.com/spages/NAVAll.txt"
    );
    const lines = data.split("\n");
    const todayFormatted = dayjs().format("DD-MMM-YYYY");
    for (const schemeName of schemesToSearch) {
      const matchedLine = lines.find((line) =>
        line.toLowerCase().includes(schemeName.toLowerCase())
      );

      if (matchedLine) {
        const parts = matchedLine.split(";");
        const scheme = parts[3]?.trim();
        const nav = customRoundNAV(parts[4]?.trim());
        const date = parts[5]?.trim();

    if (date === todayFormatted) {
  const existing = await NAVModel.findOne({ scheme, date });
  if (!existing) {
    lastRefreshedMap[schemeName] = now;
    await NAVModel.create({
      scheme,
      nav,
      date,
      lastRefreshed: now,
    });
    console.log(`✅ New NAV record inserted at ${now}`);
  } else {
    console.log(`ℹ️ NAV already exists for ${scheme} on ${date}, skipping.`);
  }
    }
      }
    }
  } catch (err) {
    console.error("❌ Error in lastRefreshed cron:", err.message);
  }
};

cron.schedule("* 9,22 * * *", updateLastRefreshed, {
  timezone: "Asia/Kolkata",
});

app.get("/api/nav", async (req, res) => {
  try {
    const { data } = await axios.get(
      "https://www.amfiindia.com/spages/NAVAll.txt"
    );
    const lines = data.split("\n");

    const results = [];

    
    for (const schemeName of schemesToSearch) {
      const matchedLine = lines.find((line) =>
        line.toLowerCase().includes(schemeName.toLowerCase())
      );

      if (matchedLine) {
        const parts = matchedLine.split(";");
        const scheme = parts[3]?.trim();
        const nav = customRoundNAV(parts[4]?.trim());
        const date = parts[5]?.trim();

        results.push({
          scheme,
          nav,
          date,
          lastRefreshed: lastRefreshedMap[schemeName] || null,
        });
      } else {
        results.push({
          scheme: schemeName,
          nav: null,
          date: null,
          lastRefreshed: null,
        });
      }
    }

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to fetch NAV data");
  }
});

app.listen(5000, () => {
  console.log("🚀 Server running on port 5000");
});
