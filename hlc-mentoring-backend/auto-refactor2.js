const fs = require('fs');

function extractAndRemove(code, prefix, method) {
  let startIndex = -1;
  const signature = 'app.' + method + "('" + prefix;
  
  const resultBlocks = [];
  
  let i = 0;
  while (i < code.length) {
    const idx = code.indexOf(signature, i);
    if (idx === -1) break;
    
    let braceCount = 0;
    let foundFirstBrace = false;
    let endIndex = -1;
    
    for (let j = idx; j < code.length; j++) {
      if (code[j] === '{') {
        braceCount++;
        foundFirstBrace = true;
      } else if (code[j] === '}') {
        braceCount--;
        if (foundFirstBrace && braceCount === 0) {
          endIndex = j + 1;
          if (code.slice(j + 1, j + 3) === ');') {
            endIndex = j + 3;
          }
          break;
        }
      }
    }
    
    if (endIndex !== -1) {
      resultBlocks.push({ start: idx, end: endIndex });
      i = endIndex;
    } else {
      i = idx + 1;
    }
  }
  
  for (let j = resultBlocks.length - 1; j >= 0; j--) {
    const b = resultBlocks[j];
    code = code.slice(0, b.start) + code.slice(b.end);
  }
  return code;
}

let code = fs.readFileSync('index.js', 'utf8');

const authRoutes = [
  ['/api/auth/login', 'post'],
  ['/api/auth/bootstrap-admin', 'post'],
  ['/api/auth/me', 'get'],
  ['/api/auth/change-password', 'patch']
];

const usersRoutes = [
  ['/api/users/init-data', 'get'],
  ['/api/users/mentors', 'get'],
  ['/api/users/mentees', 'get'],
  ['/api/users/generate-mentee-accounts', 'post'],
  ['/api/users/generate-accounts', 'post'],
  ['/api/users/generate-mentor-accounts', 'post'],
  ['/api/users/import-template.xlsx', 'get'],
  ['/api/users/import', 'post'],
  ['/api/users/import-mentor', 'post'],
  ['/api/users/mentees/:id/assign', 'patch'],
  ['/api/users', 'post'],
  ['/api/users/:id/password', 'patch']
];

const mentoringRoutes = [
  ['/api/mentoring/member-quarterly-report', 'get'],
  ["['/api/mentoring/preferences', '/api/preferences']", 'get'],
  ["['/api/mentoring/preferences', '/api/preferences']", 'post'],
  ['/api/mentoring/timeline', 'get'],
  ['/api/mentoring/preferences/mentors', 'get'],
  ['/api/mentoring/pairs/inherit', 'post'],
  ['/api/mentoring/quarter-lock', 'put'],
  ['/api/mentoring/import-pairs', 'post'],
  ['/api/mentoring/pairs', 'get'],
  ['/api/mentoring/pairs', 'post'],
  ['/api/mentoring/pairs/:monthlyId', 'patch'],
  ['/api/mentoring/pairs/:monthlyId', 'delete'],
  ['/api/mentoring/schedules', 'get'],
  ['/api/mentoring/schedules', 'post'],
  ['/api/mentoring/schedules/:id', 'patch'],
  ['/api/mentoring/schedules/:id/status', 'patch'],
  ['/api/mentoring/schedules/:id/override', 'patch'],
  ['/api/mentoring/recaps', 'get'],
  ['/api/mentoring/recaps', 'post'],
  ['/api/mentoring/recaps/:id/approve', 'patch'],
  ['/api/mentoring/recaps/:id/reject', 'patch'],
  ['/api/mentoring/recaps/:id/status', 'patch'],
  ['/api/mentoring/pairs/status', 'get'],
  ['/api/mentoring/quarterly-report/:year/:quarter/export.xlsx', 'get']
];

authRoutes.forEach(r => code = extractAndRemove(code, r[0], r[1]));
usersRoutes.forEach(r => code = extractAndRemove(code, r[0], r[1]));
mentoringRoutes.forEach(r => code = extractAndRemove(code, r[0], r[1]));

const removeFunction = (funcName) => {
  const sig = "async function " + funcName;
  let idx = code.indexOf(sig);
  if (idx === -1) {
    const sig2 = "function " + funcName;
    idx = code.indexOf(sig2);
  }
  if (idx !== -1) {
    let braceCount = 0;
    let foundFirstBrace = false;
    let endIndex = -1;
    for (let j = idx; j < code.length; j++) {
      if (code[j] === '{') {
        braceCount++;
        foundFirstBrace = true;
      } else if (code[j] === '}') {
        braceCount--;
        if (foundFirstBrace && braceCount === 0) {
          endIndex = j + 1;
          break;
        }
      }
    }
    if (endIndex !== -1) {
      code = code.slice(0, idx) + code.slice(endIndex);
    }
  }
};

removeFunction('generateMenteeAccounts');
removeFunction('reviewMentoringRecap');
removeFunction('formatBirthDatePassword');
removeFunction('lastFiveUserDigits');
removeFunction('formatMentoringPairCode');

const insertPoint = code.indexOf('app.use(express.json());');
if (insertPoint !== -1) {
  const insertEnd = code.indexOf('\n', insertPoint) + 1;
  const routers = "\napp.use('/api/auth', require('./routes/auth.routes'));\napp.use('/api/users', require('./routes/user.routes'));\napp.use('/api/mentoring', require('./routes/mentoring.routes'));\n";
  code = code.slice(0, insertEnd) + routers + code.slice(insertEnd);
}

const replaceString1 = 'const importUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });';
code = code.replace(replaceString1, "const { importUpload } = require('./middlewares/upload.middleware');");

code = code.replace(/const ACTIVE_USER_QUERY[\s\S]*?mentorUserFilter.*?;/, "const { ACTIVE_USER_QUERY, mentorUserFilter } = require('./utils/userConstants');");

fs.writeFileSync('index.js', code);
console.log('Successfully refactored index.js with parser');
