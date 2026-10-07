const fs = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const code = fs.readFileSync('index.js', 'utf-8');
const ast = parser.parse(code, { sourceType: 'module' });

const prefixes = new Set();
let routeCount = 0;

traverse(ast, {
  CallExpression(path) {
    const callee = path.node.callee;
    if (callee.type === 'MemberExpression' && callee.object.name === 'app' && 
        ['get', 'post', 'put', 'patch', 'delete'].includes(callee.property.name)) {
      
      const arg = path.node.arguments[0];
      if (arg && (arg.type === 'StringLiteral' || arg.type === 'ArrayExpression')) {
        let routePaths = [];
        if (arg.type === 'StringLiteral') {
          routePaths.push(arg.value);
        } else {
          arg.elements.forEach(e => {
            if (e.type === 'StringLiteral') routePaths.push(e.value);
          });
        }

        routePaths.forEach(p => {
          if (p.startsWith('/api/')) {
            const parts = p.split('/');
            if (parts.length > 2) {
              prefixes.add(parts[2]);
            }
          }
        });
        routeCount++;
      }
    }
  }
});

console.log('Total routes:', routeCount);
console.log('Prefixes:', Array.from(prefixes));

