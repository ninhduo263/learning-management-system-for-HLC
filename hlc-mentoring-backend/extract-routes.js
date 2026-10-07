const fs = require('fs');

const code = fs.readFileSync('index.js', 'utf8');
const lines = code.split('\n');
const result = [];
lines.forEach((l, i) => {
  if (l.match(/app\.(get|post|put|patch|delete)\('/)) {
    result.push(`${i+1}: ${l}`);
  }
});
fs.writeFileSync('routes-out.txt', result.join('\n'));

