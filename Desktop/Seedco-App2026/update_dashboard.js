import fs from 'fs';

let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

if (!content.includes('import { t, LanguageKey }')) {
    content = content.replace(
        'import { useLocalStorage } from "../hooks/useLocalStorage";',
        'import { useLocalStorage } from "../hooks/useLocalStorage";\nimport { t, LanguageKey } from "../lib/i18n";'
    );
}

content = content.replace(
    'const [language] = useLocalStorage("nc_language", "EN");',
    'const [language] = useLocalStorage("nc_language", "EN") as [LanguageKey, any];\n  const text = t[language];'
);

content = content.replace(/>Home</g, '>{text.dashboardHome}<');
content = content.replace(/>Crop Health</g, '>{text.cropHealth}<');
content = content.replace(/>Market</g, '>{text.market}<');
content = content.replace(/>AI Chat</g, '>{text.aiChat}<');
content = content.replace(/>System Alert</g, '>{text.systemAlert}<');
content = content.replace(/>Edit Profile</g, '>{text.editProfile}<');
content = content.replace(/>Logout</g, '>{text.logout}<');
content = content.replace(/placeholder="Message"/g, 'placeholder={text.message}');
content = content.replace(/>Scan Crop</g, '>{text.scanCrop}<');

fs.writeFileSync('src/components/Dashboard.tsx', content);
console.log('Dashboard strings replaced.');
