const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

function extractBlock(prefix) {
  let idx = code.indexOf(prefix);
  if (idx === -1) return null;
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
        if (code.slice(j + 1, j + 3) === ');') endIndex = j + 3;
        break;
      }
    }
  }
  if (endIndex !== -1) return code.slice(idx, endIndex);
  return null;
}

const routes = [
  { p: "app.get('/api/users/init-data'", n: "getInitData" },
  { p: "app.get('/api/users/mentors'", n: "getMentors" },
  { p: "app.get('/api/users/mentees'", n: "getMentees" },
  { p: "app.post('/api/users/generate-mentor-accounts'", n: "generateMentorAccounts" },
  { p: "app.get('/api/users/import-template.xlsx'", n: "downloadImportTemplate" },
  { p: "app.post('/api/users/import'", n: "importUsers" },
  { p: "app.post('/api/users/import-mentor'", n: "importMentors" },
  { p: "app.patch('/api/users/mentees/:id/assign'", n: "assignTeam" },
  { p: "app.post('/api/users'", n: "createUser" },
  { p: "app.patch('/api/users/:id/password'", n: "changePassword" }
];

let ctrl = `const User = require('../models/User');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const { loadAuthConfig } = require('../services/authConfig');
const authConfig = loadAuthConfig();
const { ACTIVE_USER_QUERY, mentorUserFilter, formatBirthDatePassword } = require('../utils/userConstants');

`;

let names = [];

// generateMenteeAccounts function is separate from routes array in earlier script
let genMenteesBlock = extractBlock('async function generateMenteeAccounts(req, res)');
if (genMenteesBlock) {
  ctrl += genMenteesBlock + '\n\n';
  names.push('generateMenteeAccounts');
}

routes.forEach(r => {
  let block = extractBlock(r.p);
  if (!block) return;
  // Replace the first line to const funcName = async (req, res) => {
  block = block.replace(/app\.(get|post|patch|put|delete)\(.*?,\s*(?:requireRole\([^)]+\),\s*)?(?:importUpload\.single\([^)]+\),\s*)?(?:authenticate,\s*)?(?:async\s*\(req,\s*res\)|\(req,\s*res\))\s*=>\s*\{/, "const " + r.n + " = async (req, res) => {");
  block = block.replace(/^}\);?\s*$/gm, '};');
  ctrl += block + "\n\n";
  names.push(r.n);
});

ctrl += "\nmodule.exports = {\n  " + names.join(',\n  ') + "\n};\n";

fs.writeFileSync('controllers/user.controller.js', ctrl);
console.log('User controller done');

