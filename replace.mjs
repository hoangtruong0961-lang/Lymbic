import fs from 'fs';

const content = fs.readFileSync('src/components/features/main-menu/MainMenuScreen.tsx', 'utf-8');
const newLayout = fs.readFileSync('new_layout.txt', 'utf-8');

const lines = content.split(/\r?\n/);

const startIndex = lines.findIndex((l) => l.trim() === 'return (');
const endIndex = lines.findIndex((l) => l.includes('{/* LOAD GAME MODAL */}'));

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find start or end bounds in source file", startIndex, endIndex);
  process.exit(1);
}

const before = lines.slice(0, startIndex);
// skip the "{/* LOAD GAME MODAL */}" comment here since new_layout includes it at the end
const after = lines.slice(endIndex + 1);

const finalContent = [...before, newLayout, ...after].join("\n");
fs.writeFileSync('src/components/features/main-menu/MainMenuScreen.tsx', finalContent);
console.log("Replacement successful!");
