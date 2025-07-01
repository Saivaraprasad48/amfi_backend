// const express = require("express");
// const axios = require("axios");
// const cors = require("cors");

// const app = express();
// app.use(cors());

// const schemesToSearch = [
//   "JM Flexicap Fund (Direct) - Growth Option",
//   "ICICI Prudential Nifty Next 50 Index Fund - Direct Plan -  Growth",
//   "quant Small Cap Fund - Growth Option - Direct Plan",
//   "Motilal Oswal Midcap Fund-Direct Plan-Growth Option",
//   "Nippon India Large Cap Fund - Direct Plan Growth Plan - Growth Option",
//   "SBI PSU Fund - DIRECT PLAN - GROWTH",
//   "Franklin U.S. Opportunities Equity Active Fund of Funds - Direct - Growth",
//   "HDFC Balanced Advantage Fund - Growth Plan - Direct Plan",
//   "ICICI Prudential All Seasons Bond Fund - Direct Plan - Growth",
// ];

// const customRoundNAV = (navStr) => {
//   const nav = parseFloat(navStr);
//   if (isNaN(nav)) return navStr;

//   const [intPart, decimalPart = ""] = navStr.split(".");
//   const d = decimalPart.padEnd(4, "0");

//   const thirdDigit = parseInt(d[2]);
//   const fourthDigit = parseInt(d[3]);

//   let result;
//   if (thirdDigit < 5) {
//     result = Math.floor(nav * 100) / 100;
//   } else if (thirdDigit > 5) {
//     result = Math.ceil(nav * 100) / 100;
//   } else {
//     result =
//       fourthDigit < 5
//         ? Math.floor(nav * 100) / 100
//         : Math.ceil(nav * 100) / 100;
//   }

//   return result.toFixed(2);
// };

// app.get("/api/nav", async (req, res) => {
//   try {
//     const { data } = await axios.get(
//       "https://www.amfiindia.com/spages/NAVAll.txt"
//     );
//     const lines = data.split("\n");

//     const results = [];

//     for (const schemeName of schemesToSearch) {
//       const matchedLine = lines.find((line) => line.includes(schemeName));
//       if (matchedLine) {
//         const parts = matchedLine.split(";");
//         const scheme = parts[3]?.trim();
//         const nav = customRoundNAV(parts[4]?.trim());
//         const date = parts[5]?.trim();
//         results.push({ scheme, nav, date });
//       } else {
//         results.push({ scheme: schemeName, error: "Not found" });
//       }
//     }

//     res.json(results);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Failed to fetch NAV data");
//   }
// });

// app.listen(5000, () => console.log("Server running on port 5000"));
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const cron = require("node-cron");
const dayjs = require("dayjs");

const app = express();
app.use(cors());

const schemesToSearch = [
  "JM Flexicap Fund (Direct) - Growth Option",
  "ICICI Prudential Nifty Next 50 Index Fund - Direct Plan -  Growth",
  "quant Small Cap Fund - Growth Option - Direct Plan",
  "Motilal Oswal Midcap Fund-Direct Plan-Growth Option",
  "Nippon India Large Cap Fund - Direct Plan Growth Plan - Growth Option",
  "SBI PSU Fund - DIRECT PLAN - GROWTH",
  "Franklin U.S. Opportunities Equity Active Fund of Funds - Direct - Growth",
  "HDFC Balanced Advantage Fund - Growth Plan - Direct Plan",
  "ICICI Prudential All Seasons Bond Fund - Direct Plan - Growth",
];

const lastRefreshedMap = {}; 

const formatTime = () => dayjs().format("DD-MMM-YYYY hh:mm A");

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

const previousNAVMap = {};

const updateLastRefreshed = async () => {
  console.log(`🕒 [Cron] Running NAV check at ${formatTime()}`);

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
        const nav = customRoundNAV(parts[4]?.trim());
        const date = parts[5]?.trim();

        if (date === todayFormatted) {
          const prevNAV = previousNAVMap[schemeName];

          if (prevNAV !== nav) {
            previousNAVMap[schemeName] = nav; 
            lastRefreshedMap[schemeName] = formatTime();
            console.log(`🔄 NAV changed for ${schemeName} → ${nav}`);
          }
        }
      }
    }

    console.log(`✅ Finished NAV change check at ${formatTime()}`);
  } catch (err) {
    console.error("❌ Error in lastRefreshed cron:", err.message);
  }
};


cron.schedule("* 21-23 * * *", updateLastRefreshed, {
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

