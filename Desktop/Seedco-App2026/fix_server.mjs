import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(/\s*\} else if \(type === "nearby-businesses"\) \{[\s\S]*?\} else \{/g, '} else {');
fs.writeFileSync('server.ts', content);
