import fs from 'fs';

const PATH = 'src/components/features/main-menu/MainMenuScreen.tsx';
let content = fs.readFileSync(PATH, 'utf-8');

const importHook = "import { useNeumorphicTheme } from '../../../hooks/useNeumorphicTheme';";

// insert import
content = content.replace("import { AnimatedBackground } from './AnimatedBackground';", "import { AnimatedBackground } from './AnimatedBackground';\n" + importHook);

// insert hook usage
content = content.replace("const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);", "const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);\n  const s = useNeumorphicTheme();");

let containerOld = "`relative z-10 w-full md:w-[420px] bg-black/50 backdrop-blur-xl h-full flex flex-col p-6 md:p-8 transition-opacity duration-1000 ${isIntroing ? 'opacity-0' : 'opacity-100'} overflow-y-auto custom-scrollbar md:mr-auto justify-start items-center md:items-start`";
let containerNew = "`relative z-10 w-full md:w-[420px] h-full flex flex-col p-6 md:p-8 transition-opacity duration-1000 ${isIntroing ? 'opacity-0' : 'opacity-100'} overflow-y-auto no-scrollbar md:mr-auto justify-start items-center md:items-start shadow-2xl`";

content = content.replace(
  `<div className={${containerOld}}>`, 
  `<div className={${containerNew}} style={{ backgroundColor: s.bg, color: s.text }}>`
);

content = content.replace('className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]"', 'style={{ color: s.text }}');
content = content.replace('className="font-serif text-3xl sm:text-4xl font-black tracking-[0.2em] text-white"', 'className="font-serif text-3xl sm:text-4xl font-black tracking-[0.2em]" style={{ color: s.text }}');
content = content.replace('className="mt-2 text-white/90 font-bold uppercase tracking-widest text-sm"', 'className="mt-2 font-bold uppercase tracking-widest text-sm" style={{ color: s.text }}');
content = content.replace('className="text-[10px] text-white/50 tracking-wider font-mono mt-1"', 'className="text-[10px] tracking-wider font-mono mt-1" style={{ color: s.textMuted }}');

content = content.replace('<div className="w-full h-px bg-white/20 my-8 shadow-[0_0_8px_rgba(255,255,255,0.3)]" />', '<div className="w-full h-px my-8" style={{ background: s.borderMuted }} />');

// Now the menu items map block
const newMenuRender = `return menuItems.map(item => {
              const IconComponent = item.icon;
              
              if (item.id === 'continue' && !hasSaves) {
                return (
                  <div key={item.id} className="group flex items-center p-3 rounded-2xl opacity-40 cursor-not-allowed mb-3" style={{ background: s.flatBg, boxShadow: s.shadowInner }}>
                    <IconComponent size={20} className="mr-4" style={{ color: s.textMuted }} />
                    <span className="font-bold text-sm uppercase tracking-widest" style={{ color: s.textMuted }}>{item.title}</span>
                  </div>
                );
              }

              if (item.isLink) {
                return (
                  <motion.a
                    key={item.id}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ x: 5 }}
                    whileTap={{ scale: 0.95 }}
                    className="group flex items-center p-3 rounded-2xl transition-all duration-200 cursor-pointer mb-3"
                    style={{ background: s.convexBg, color: s.text, boxShadow: s.shadowOuter, border: s.border }}
                  >
                    <IconComponent size={20} className="mr-4" style={{ color: item.id === 'donate' ? s.accent : s.text }} />
                    <span className="font-bold text-sm uppercase tracking-widest" style={{ color: s.text }}>{item.title}</span>
                  </motion.a>
                );
              }

              return (
                <motion.button
                  key={item.id}
                  onClick={item.onClick}
                  whileHover={{ x: 5 }}
                  whileTap={{ scale: 0.95 }}
                  className="group flex items-center p-3 flex-1 rounded-2xl transition-all duration-200 cursor-pointer w-full text-left mb-3 flex-row"
                  style={{ background: s.convexBg, color: s.text, boxShadow: s.shadowOuter, border: s.border }}
                >
                  <IconComponent size={20} className="mr-4" style={{ color: s.text }} />
                  <span className="font-bold text-sm uppercase tracking-widest" style={{ color: s.text }}>{item.title}</span>
                </motion.button>
              );
            });`;

content = content.replace(/return menuItems\.map\(item => \{[\s\S]*?\}\);\s*\}\)\(\)\}/g, newMenuRender + "\n          })()}");

// Footer info stats
content = content.replace(/className="mt-8 pt-4 border-t border-white\/20 w-full flex flex-col gap-2 opacity-60"/, 
                          'className="mt-8 pt-4 w-full flex flex-col gap-2 opacity-60" style={{ borderTop: `1px solid ${s.borderMuted}` }}');
content = content.replace(/<ShieldCheck size={16} className="text-white" \/>/g, '<ShieldCheck size={16} style={{ color: s.text }} />');
content = content.replace(/<HardDrive size={16} className="text-white" \/>/g, '<HardDrive size={16} style={{ color: s.text }} />');
content = content.replace(/<Database size={16} className="text-white" \/>/g, '<Database size={16} style={{ color: s.text }} />');
content = content.replace(/text-white break-all/g, 'break-all" style={{ color: s.text }}');
content = content.replace(/text-white/g, '" style={{ color: s.text }}'); // a bit dangerous but let's see

fs.writeFileSync(PATH, content);
console.log("Replaced");
