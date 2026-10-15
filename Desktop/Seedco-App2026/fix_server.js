const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(/\} else if \(type === "nearby-businesses"\) \{[\s\S]*?\} else \{/g, '} else {');
fs.writeFileSync('server.ts', content);
