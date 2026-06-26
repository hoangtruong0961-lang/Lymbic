import fs from 'fs';

const content = fs.readFileSync('src/components/features/main-menu/MainMenuScreen.tsx', 'utf-8');
let lines = content.split(/\r?\n/);

const loadModalIndex = lines.findIndex(l => l.includes('{/* LOAD GAME MODAL */}'));

const before = lines.slice(0, 408); // lines 0 to 407
const after = lines.slice(loadModalIndex); // Includes the LOAD GAME MODAL string.

// reconstructed parts
const newMiddle = `      return (
          <div key={save.id} className="p-4 bg-white/5 border border-white/10 rounded-xl mb-3 flex items-center justify-between hover:bg-white/10 cursor-pointer transition-colors" onClick={() => handleLoadSave(save)}>
              <div className="flex flex-col">
                  <span className="text-white font-bold">{save.data?.world?.worldName || 'Unknown World'}</span>
                  <span className="text-white/50 text-xs">Player: {playerName} | Turns: {turnCount}</span>
                  <span className="text-white/30 text-[10px] mt-1">{new Date(save.updatedAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                  <button onClick={(e) => handleDownloadClick(e, save)} className="p-2 bg-sky-500/20 text-sky-400 rounded-lg"><DownloadCloud size={16} /></button>
                  <button onClick={(e) => handleDeleteClick(e, save.id)} className="p-2 bg-rose-500/20 text-rose-400 rounded-lg"><Trash2 size={16} /></button>
              </div>
          </div>
      );
  };`;

const newLayout = fs.readFileSync('new_layout.txt', 'utf-8');

// The new layout HAS {/* LOAD GAME MODAL */} at the end, so let's strip it from newLayout so we don't duplicate it.
// Actually, I can just slice after(1) or remove it from newLayout.
const newLayoutContent = newLayout.replace('{/* LOAD GAME MODAL */}', '');

const finalContent = [...before, newMiddle, newLayoutContent, ...after].join('\n');
fs.writeFileSync('src/components/features/main-menu/MainMenuScreen.tsx', finalContent);
console.log("Repair successful!");
