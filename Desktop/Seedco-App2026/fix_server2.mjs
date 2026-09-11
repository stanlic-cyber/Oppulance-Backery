import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

// Add nearby-businesses ONLY to the correct location
content = content.replace(
  /Return a JSON object with keys: "season" \(string\), "status" \(string, e\.g\., "Planting", "Harvesting"\), "insights" \(array of 2 short strings\)\.`;\} else \{/g,
  'Return a JSON object with keys: "season" (string), "status" (string, e.g., "Planting", "Harvesting"), "insights" (array of 2 short strings).`;\n      } else if (type === "nearby-businesses") {\n        prompt = `Search for nearby agricultural businesses, seed distributors, or farming equipment suppliers in or near ${locationContext}.\\nReturn a JSON array of objects with keys: "name" (string), "type" (string), "location" (string), "contact" (string).`;\n      } else {'
);

// We need to FIX the previous sed replacement that added responseMimeType in weird places.
content = content.replace(/tools: \[\{ googleSearch: \{\} \}\], responseMimeType: "text\/plain"/g, 'tools: [{ googleSearch: {} }]');

fs.writeFileSync('server.ts', content);
