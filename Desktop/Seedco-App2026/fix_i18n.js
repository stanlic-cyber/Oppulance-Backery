import fs from 'fs';

let i18n = fs.readFileSync('src/lib/i18n.ts', 'utf8');
const langs = ["EN", "SW", "HA", "YO", "IG", "AM", "ZU", "SN", "XH", "FR", "PT", "AR", "ND"];

for (const lang of langs) {
  const badStart = new RegExp(`  ${lang}: \\n    authAppTitle`, 'g');
  i18n = i18n.replace(badStart, `  ${lang}: {\n    authAppTitle`);
  
  // now replace the stray `{` that's followed by `tagline:` or whatever the next key is.
  // Actually, the stray `{` is on its own line like this:
  // authBiometric: "Biometric",
  // {
  //     tagline:
  const strayBrace = new RegExp(`    authBiometric: "[^"]*",\\n{`, 'g');
  i18n = i18n.replace(strayBrace, (match) => {
    return match.replace('\n{', '');
  });
}

fs.writeFileSync('src/lib/i18n.ts', i18n);
