import fs from 'fs';

let kyc = fs.readFileSync('src/components/KYCPortal.tsx', 'utf8');
kyc = kyc.replace(/NeuroSeedcoAPI/g, 'SeedCoAPI');
fs.writeFileSync('src/components/KYCPortal.tsx', kyc);

let dash = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');
dash = dash.replace(/NeuroSeedcoAPI/g, 'SeedCoAPI');
fs.writeFileSync('src/components/Dashboard.tsx', dash);

console.log('Fixed NeuroSeedcoAPI exports.');
