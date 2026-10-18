const fs = require("fs");
const lines = fs.readFileSync("src/pages/BusinessInventoryPage.tsx", "utf8").split("\n");
lines.forEach((l, i) => {
  if (l.includes('labels')) {
    console.log(i + 1, l.trim());
  }
});
