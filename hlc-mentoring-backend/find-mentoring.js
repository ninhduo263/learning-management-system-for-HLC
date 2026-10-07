const fs = require('fs');
const lines = fs.readFileSync('index.js', 'utf8').split('\n');
const result = [];
lines.forEach((l, i) => {
  if (l.match(/app\.(get|post|put|patch|delete)\('/) && 
     (l.includes('/api/mentoring') || l.includes('pairs') || l.includes('schedules') || l.includes('recaps'))) {
    result.push(`${i+1}: ${l}`);
  }
});
fs.writeFileSync('mentoring-routes.txt', result.join('\n'));

