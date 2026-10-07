const fs = require('fs');

const code = fs.readFileSync('index.js', 'utf8');
const lines = code.split('\n');
const result = [];
lines.forEach((l, i) => {
  if (l.includes('/api/users') || l.includes('generateMenteeAccounts') || l.includes('formatBirthDatePassword')) {
    result.push(`${i+1}: ${l}`);
  }
});
fs.writeFileSync('extract-out.txt', result.join('\n'));

