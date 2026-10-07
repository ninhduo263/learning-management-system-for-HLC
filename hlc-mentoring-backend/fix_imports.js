const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');
code = code.replace(/require\('\.\/quarterlyRules'\)/g, "require('./utils/quarterlyRules')");
code = code.replace(/require\('\.\/time'\)/g, "require('./utils/time')");
code = code.replace(/require\('\.\/pairingIds'\)/g, "require('./utils/pairingIds')");
code = code.replace(/require\('\.\/pairDeletion'\)/g, "require('./utils/pairDeletion')");
fs.writeFileSync('index.js', code);

