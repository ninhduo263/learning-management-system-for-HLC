const fs = require('fs');
let code = fs.readFileSync('auto-refactor2.js', 'utf8');
const idx = code.indexOf('const replaceString1');
code = code.slice(0, idx) + `const replaceString1 = 'const importUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });';
code = code.replace(replaceString1, "const { importUpload } = require('./middlewares/upload.middleware');");

code = code.replace(/const ACTIVE_USER_QUERY[\\s\\S]*?mentorUserFilter.*?;/, "const { ACTIVE_USER_QUERY, mentorUserFilter } = require('./utils/userConstants');");

fs.writeFileSync('index.js', code);
console.log('Successfully refactored index.js with parser');
`;
fs.writeFileSync('auto-refactor2.js', code);

