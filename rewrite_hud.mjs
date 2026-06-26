import fs from 'fs';

const PATH = 'src/components/features/gameplay/components/DynamicHUD.tsx';
const content = fs.readFileSync(PATH, 'utf-8');

// The render part starts around line 469:
//     return (
//         <div 
//             className={`relative w-full z-20 transition-all duration-700 border-b shadow-md ${expanded ? '' : 'neu-flat'}`} 
//             style={{ backgroundColor: s.bg, borderColor: s.borderMuted }}
//             id="dynamic_hud_container"
//         >

const returnIdx = content.indexOf('    return (\n        <div \n            className={`relative w-full z-20');

if (returnIdx === -1) {
    console.error("Could not find the return block.");
    process.exit(1);
}

const beforeReturn = content.substring(0, returnIdx);

const newReturn = `    const [openedCard, setOpenedCard] = useState<string | null>(null);

    if (!worldData) return null;

    // ----- CẤU TRÚC LƯỚI & CỬA SỔ NỔI (GRID + FLOATING WIDGETS) -----
    return (
        <div className="relative w-full z-20 p-2 md:p-3 pointer-events-none" id="dynamic_hud_container">
            {/* GRID OF TILES */}
            <div className="flex flex-wrap gap-2 pointer-events-auto">
                {/* 1. Môi trường */}
                <button 
                    onClick={() => setOpenedCard(openedCard === 'env' ? null : 'env')} 
                    className="p-2 rounded-xl flex items-center gap-2 transition-all hover:scale-105 shadow-sm border border-white/5 active:scale-95"
                    style={{ backgroundColor: s.badgeBg, color: s.text }}
                >
                    {environmentTheme.timeIcon}
                    <div className="flex flex-col items-start leading-none pointer-events-none">
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider" style={{ color: s.textMuted }}>Môi Trường</span>
                        <span className="text-[10px] font-black">{locationString.substring(0, 15)}...</span>
                    </div>
                </button>

                {/* 2. Chỉ số */}
                {healthStat && (
                    <button 
                         onClick={() => setOpenedCard(openedCard === 'status' ? null : 'status')} 
                         className="p-2 rounded-xl flex items-center gap-2 transition-all hover:scale-105 shadow-sm border border-white/5 active:scale-95"
                         style={{ backgroundColor: s.badgeBg, color: s.text }}
                    >
                         <Heart size={14} className="text-rose-500" />
                         <div className="flex flex-col items-start leading-none pointer-events-none">
                             <span className="text-[9px] font-mono font-bold uppercase tracking-wider" style={{ color: s.textMuted }}>Thân Thể</span>
                             <span className="text-[10px] font-black">{healthStat.value}</span>
                         </div>
                    </button>
                )}

                {/* 3. Truyền thuyết / Quests */}
                {(activeQuest || currentObjective) && (
                    <button 
                         onClick={() => setOpenedCard(openedCard === 'quest' ? null : 'quest')} 
                         className="p-2 rounded-xl flex items-center gap-2 transition-all hover:scale-105 shadow-sm border border-white/5 active:scale-95"
                         style={{ backgroundColor: s.badgeBg, color: s.text }}
                    >
                         <Target size={14} className="text-amber-500" />
                         <div className="flex flex-col items-start leading-none pointer-events-none">
                             <span className="text-[9px] font-mono font-bold uppercase tracking-wider" style={{ color: s.textMuted }}>Thiên Mệnh</span>
                             <span className="text-[10px] font-black truncate max-w-[80px]">{(activeQuest ? activeQuest.name : currentObjective)?.substring(0,10)}...</span>
                         </div>
                    </button>
                )}

                {/* 4. Thêm nút Cấu Hình HUD */}
                <button 
                     onClick={() => setOpenedCard(openedCard === 'config' ? null : 'config')} 
                     className="p-2 rounded-xl flex items-center justify-center transition-all hover:scale-105 shadow-sm border border-white/5 active:scale-95 ml-auto"
                     style={{ backgroundColor: s.badgeBg, color: s.text }}
                >
                     <Settings size={14} />
                </button>
            </div>

            {/* EXPANDING FLOATING CARDS */}
            <AnimatePresence>
                {openedCard && (
                    <motion.div 
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-14 left-2 right-2 md:left-4 md:w-[400px] max-h-[60vh] overflow-y-auto no-scrollbar pointer-events-auto rounded-2xl border shadow-2xl p-4"
                        style={{ backgroundColor: s.card, borderColor: s.borderMuted }}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-black uppercase tracking-widest font-mono flex items-center gap-2" style={{ color: s.text }}>
                                {openedCard === 'status' && <><Activity size={16} className="text-rose-500"/> Chỉ Số Bản Thể</>}
                                {openedCard === 'env' && <><MapPin size={16} className="text-sky-500"/> Môi Trường & Địa Danh</>}
                                {openedCard === 'quest' && <><Target size={16} className="text-amber-500"/> Thiên Mệnh Nhân Quả</>}
                                {openedCard === 'config' && <><Settings size={16} /> Cấu Hình Grid Layout</>}
                            </h3>
                            <button onClick={() => setOpenedCard(null)} className="p-1 rounded-lg hover:bg-white/10 transition-colors" style={{ color: s.textMuted }}>
                                ✕
                            </button>
                        </div>
                        
                        {/* Dynamic Card Content */}
                        <div className="space-y-3">
                            {openedCard === 'status' && playerStats.map((stat, i) => (
                                <div key={i} className="flex flex-col gap-1 border-b border-white/5 pb-2 last:border-0 font-mono">
                                    <div className="flex justify-between"><span className="text-[11px] font-bold text-slate-300">{stat.name}</span><span className="text-[11px] font-bold text-white bg-black/40 px-1.5 py-0.5 rounded">{stat.value}</span></div>
                                    {stat.desc && <span className="text-[10px] text-slate-500 font-sans">{stat.desc}</span>}
                                </div>
                            ))}

                            {openedCard === 'env' && (
                                <div className="space-y-2">
                                    <div className="p-3 bg-black/20 rounded-xl border border-white/5">
                                        <div className="text-[10px] uppercase font-bold text-sky-400 font-mono mb-1">Thời Gian</div>
                                        <div className="text-xs text-slate-300">{formatGameTime(gameTime)}</div>
                                    </div>
                                    <div className="p-3 bg-black/20 rounded-xl border border-white/5">
                                        <div className="text-[10px] uppercase font-bold text-emerald-400 font-mono mb-1">Địa Điểm</div>
                                        <div className="text-xs text-slate-300">{locationString}</div>
                                    </div>
                                    <div className="p-3 bg-black/20 rounded-xl border border-white/5">
                                        <div className="text-[10px] uppercase font-bold text-amber-400 font-mono mb-1">Sự Kiện Hiện Tại</div>
                                        <div className="text-xs text-slate-300">{currentEvent || 'Không có sự kiện đặc thù'}</div>
                                    </div>
                                </div>
                            )}

                            {openedCard === 'quest' && quests.map((q, i) => (
                                <div key={i} className="p-3 bg-black/20 rounded-xl border border-white/5 mb-2">
                                    <div className="text-[10px] uppercase font-bold text-amber-500 font-mono mb-1">{q.status}</div>
                                    <div className="text-sm font-bold text-slate-200">{q.name}</div>
                                    <div className="text-[11px] text-slate-400 mt-1">Tiến trình: {q.progress}</div>
                                    {q.time && <div className="text-[10px] text-slate-500 mt-2 font-mono">Cập nhật: {q.time}</div>}
                                </div>
                            ))}

                            {openedCard === 'config' && (
                                <div className="text-xs text-slate-400">
                                    Cơ chế Grid & Card Windows được mô phỏng theo UI Floating Layers.
                                    Thông tin chỉ hiển thị chi tiết (Card) khi click vào các ô thông tin nhanh (Tile).
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
`;

const finalContent = beforeReturn + newReturn;
fs.writeFileSync(PATH, finalContent);
console.log("HUD grid replacement done.");
