import fs from 'fs';

const content = fs.readFileSync('src/components/features/main-menu/MainMenuScreen.tsx', 'utf-8');
const lines = content.split(/\r?\n/);

const loadModalIndex = lines.findIndex(l => l.includes('{/* LOAD GAME MODAL */}'));

// Remove the double `return (` at line 408
lines.splice(408, 1);

const finalContent = lines.join('\n');
fs.writeFileSync('src/components/features/main-menu/MainMenuScreen.tsx', finalContent);
console.log("Repair 2 successful!");
