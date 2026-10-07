const fs = require('fs');

function extractAndRemove(code, prefix, method) {
  let startIndex = -1;
  const signature = \`app.\${method}('\${prefix}\`;
  
  const resultBlocks = [];
  
  let i = 0;
  while (i < code.length) {
    const idx = code.indexOf(signature, i);
    if (idx === -1) break;
    
    // Found a route. Now find the end by counting braces.
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
          // Found the end of the block!
          // Include trailing ");" if present
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
  
  // Remove backwards to not mess up indices
  for (let j = resultBlocks.length - 1; j >= 0; j--) {
    const b = resultBlocks[j];
    code = code.slice(0, b.start) + code.slice(b.end);
  }
  return code;
}

let code = fs.readFileSync('index.js', 'utf8');

// Remove Auth Routes
code = extractAndRemove(code, '/api/auth/login', 'post');
code = extractAndRemove(code, '/api/auth/bootstrap-admin', 'post');
code = extractAndRemove(code, '/api/auth/me', 'get');
code = extractAndRemove(code, '/api/auth/change-password', 'patch'); // if any

// Remove Users Routes
code = extractAndRemove(code, '/api/users/init-data', 'get');
code = extractAndRemove(code, '/api/users/mentors', 'get');
code = extractAndRemove(code, '/api/users/mentees', 'get');
code = extractAndRemove(code, '/api/users/generate-mentee-accounts', 'post');
code = extractAndRemove(code, '/api/users/generate-accounts', 'post');
code = extractAndRemove(code, '/api/users/generate-mentor-accounts', 'post');
code = extractAndRemove(code, '/api/users/import-template.xlsx', 'get');
code = extractAndRemove(code, '/api/users/import', 'post');
code = extractAndRemove(code, '/api/users/import-mentor', 'post');
code = extractAndRemove(code, '/api/users/mentees/:id/assign', 'patch');
code = extractAndRemove(code, '/api/users', 'post');
code = extractAndRemove(code, '/api/users/:id/password', 'patch');

// Remove Mentoring Routes
code = extractAndRemove(code, '/api/mentoring/member-quarterly-report', 'get');
code = extractAndRemove(code, '/api/mentoring/timeline', 'get');
code = extractAndRemove(code, '/api/mentoring/preferences/mentors', 'get');
code = extractAndRemove(code, '/api/mentoring/pairs/inherit', 'post');
code = extractAndRemove(code, '/api/mentoring/quarter-lock', 'put');
code = extractAndRemove(code, '/api/mentoring/import-pairs', 'post');
code = extractAndRemove(code, '/api/mentoring/pairs', 'get');
code = extractAndRemove(code, '/api/mentoring/pairs', 'post');
code = extractAndRemove(code, '/api/mentoring/pairs/:monthlyId', 'patch');
code = extractAndRemove(code, '/api/mentoring/pairs/:monthlyId', 'delete');
code = extractAndRemove(code, '/api/mentoring/schedules', 'get');
code = extractAndRemove(code, '/api/mentoring/schedules', 'post');
code = extractAndRemove(code, '/api/mentoring/schedules/:id', 'patch');
code = extractAndRemove(code, '/api/mentoring/schedules/:id/status', 'patch');
code = extractAndRemove(code, '/api/mentoring/schedules/:id/override', 'patch');
code = extractAndRemove(code, '/api/mentoring/recaps', 'get');
code = extractAndRemove(code, '/api/mentoring/recaps', 'post');
code = extractAndRemove(code, '/api/mentoring/recaps/:id/approve', 'patch');
code = extractAndRemove(code, '/api/mentoring/recaps/:id/reject', 'patch');
code = extractAndRemove(code, '/api/mentoring/recaps/:id/status', 'patch');
code = extractAndRemove(code, '/api/mentoring/pairs/status', 'get');
code = extractAndRemove(code, '/api/mentoring/quarterly-report/:year/:quarter/export.xlsx', 'get');

// Also remove standalone helper functions that were moved
const removeFunction = (funcName) => {
  const sig = \`async function \${funcName}\`;
  let idx = code.indexOf(sig);
  if (idx === -1) {
    const sig2 = \`function \${funcName}\`;
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
removeFunction('formatBirthDatePassword'); // This was moved or used in users

// Make sure to add the router imports near the top middleware
const insertPoint = code.indexOf('app.use(express.json());');
if (insertPoint !== -1) {
  const insertEnd = code.indexOf('\\n', insertPoint) + 1;
  const routers = \`
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/mentoring', require('./routes/mentoring.routes'));
\`;
  code = code.slice(0, insertEnd) + routers + code.slice(insertEnd);
}

// Remove importUpload declaration
code = code.replace(/const importUpload = multer\\(\\{ storage: multer\\.memoryStorage\\(\\), limits: \\{ fileSize: 5 \\* 1024 \\* 1024 \\} \\}\\);/, 'const { importUpload } = require(\\'./middlewares/upload.middleware\\');');

// Remove ACTIVE_USER_QUERY and mentorUserFilter
code = code.replace(/const ACTIVE_USER_QUERY = \\{ \\$in: \\[\\/\\^yes\\$\\/i, \\/\\^c\u00f3\\$\\/i, \\/\\^co\\$\\/i, \\/\\^active\\$\\/i, \\/\\^true\\$\\/i\\] \\};\\r?\\nconst mentorUserFilter = \\{ role: 'MENTOR', isActive: ACTIVE_USER_QUERY, userId: \\/\\^HLC-MTO-\\\\d\\+\\$\\/i \\};/, 'const { ACTIVE_USER_QUERY, mentorUserFilter } = require(\\'./utils/userConstants\\');');

fs.writeFileSync('index.js', code);
console.log('Successfully refactored index.js with parser');

