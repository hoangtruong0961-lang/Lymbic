import React from 'react';
import { Search, Plus, BrainCircuit, Type, ChevronRight, Pin, Database, RotateCcw } from 'lucide-react';
import { VectorData } from '../../../../../services/db/indexedDB';
import { useNeumorphicTheme } from '../../../../../hooks/useNeumorphicTheme';

export interface EntryListViewProps {
    entries: VectorData[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onAdd: () => void;
    
    searchTerm: string;
    onSearchChange: (val: string) => void;
    
    viewMode: 'keyword' | 'semantic';
    onViewModeChange: (val: 'keyword' | 'semantic') => void;
    
    onSemanticSearch: () => void;
    isSearchingSemantic: boolean;
    
    activeCategoryFilter: string | null;
    onCategoryFilterChange: (cat: string | null) => void;
    
    filteredEntries: VectorData[];
    
    CATEGORY_MAP: any;
    
    renderTool?: () => React.ReactNode;
}

export const EntryListView: React.FC<EntryListViewProps> = ({
    entries, selectedId, onSelect, onAdd,
    searchTerm, onSearchChange,
    viewMode, onViewModeChange,
    onSemanticSearch, isSearchingSemantic,
    activeCategoryFilter, onCategoryFilterChange,
    filteredEntries, CATEGORY_MAP,
    renderTool
}) => {
    const s = useNeumorphicTheme();

    return (
        <div 
            id="entry-list-view-root" 
            style={{ 
                background: s.bg, 
                color: s.text, 
                borderRight: s.border 
            }}
            className="flex flex-col h-full font-sans p-4 rounded-l-2xl select-none relative transition-all duration-300"
        >
            <div className="absolute inset-0 bg-repeat bg-center opacity-[0.035] pointer-events-none mix-blend-multiply" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/handmade-paper.png')" }} />
            
            {/* Top Command Toolbar - Unified with screenshot style */}
            <div 
                style={{ background: s.bg }}
                className="pb-4 shrink-0 space-y-3.5 relative z-10 transition-all duration-300"
            >
                {/* 2-way Custom Search Mode Toggle (Sunken Pill Style) */}
                <div className="flex flex-col gap-1 shrink-0 text-left">
                    <span 
                        style={{ color: s.textMuted }} 
                        className="text-[9px] font-bold uppercase tracking-widest font-mono opacity-80"
                    >
                        Chế độ tra cứu bối cảnh
                    </span>
                    <div 
                        style={{ 
                            background: s.card, 
                            borderColor: s.borderMuted, 
                            boxShadow: s.shadowInner 
                        }}
                        className="flex rounded-xl p-0.5 w-full border"
                    >
                        <button 
                            type="button"
                            onClick={() => onViewModeChange('keyword')} 
                            style={viewMode === 'keyword' ? {
                                background: s.accent,
                                color: '#ffffff',
                            } : {
                                color: s.textMuted
                            }}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[9px] font-mono font-bold uppercase rounded-lg transition-all whitespace-nowrap cursor-pointer`}
                        >
                            <Type size={10} /> Từ khóa tĩnh
                        </button>
                        <button 
                            type="button"
                            onClick={() => onViewModeChange('semantic')} 
                            style={viewMode === 'semantic' ? {
                                background: s.accent,
                                color: '#ffffff',
                            } : {
                                color: s.textMuted
                            }}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[9px] font-mono font-bold uppercase rounded-lg transition-all whitespace-nowrap cursor-pointer`}
                        >
                            <BrainCircuit size={10} /> Vector ý niệm
                        </button>
                    </div>
                </div>

                {/* Sub Search Field */}
                <div className="space-y-3.5 animate-fadeIn">
                    <div className="relative flex gap-2 w-full">
                        <div 
                            style={{ 
                                background: s.card, 
                                borderColor: s.borderMuted, 
                                boxShadow: s.shadowInner 
                            }}
                            className="relative flex-1 rounded-xl flex items-center px-3.5 py-2"
                        >
                            <input 
                                type="text" 
                                placeholder={viewMode === 'semantic' ? "Nhập ý niệm bối cảnh..." : "Tìm trong Bách Khoa..."}
                                style={{ color: s.text }}
                                className="w-full bg-transparent outline-none border-none text-xs placeholder-neutral-400 font-sans transition-all font-medium"
                                value={searchTerm}
                                onChange={e => onSearchChange(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && viewMode === 'semantic') onSemanticSearch();
                                }}
                            />
                            <Search size={13} style={{ color: s.textMuted }} className="shrink-0 opacity-70" />
                        </div>
                        {viewMode === 'semantic' && (
                            <button 
                                onClick={onSemanticSearch}
                                disabled={isSearchingSemantic || !searchTerm.trim()}
                                style={{
                                    background: s.accent,
                                    color: '#ffffff'
                                }}
                                className="px-3.5 py-2 font-sans font-bold rounded-xl text-xs shadow-sm hover:opacity-90 active:scale-95 disabled:opacity-40 transition-all shrink-0 flex items-center justify-center select-none cursor-pointer"
                            >
                                {isSearchingSemantic ? "Quét..." : "Quét"}
                            </button>
                        )}
                    </div>

                    {/* Staggered category filter list (horizontal carousel) */}
                    <div className="flex gap-1.5 pb-1 overflow-x-auto scrollbar-none items-center select-none text-left">
                        <button 
                            type="button"
                            onClick={() => onCategoryFilterChange(null)}
                            style={activeCategoryFilter === null ? {
                                background: s.accent,
                                color: '#ffffff',
                                borderColor: 'transparent',
                            } : {
                                background: s.card,
                                color: s.textMuted,
                                border: s.border,
                                boxShadow: s.shadowButton,
                            }}
                            className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[8px] font-mono font-extrabold uppercase tracking-wider transition-all cursor-pointer`}
                        >
                            Tất cả
                        </button>
                        {Object.entries(CATEGORY_MAP).map(([catValue, catInfo]: any) => {
                            const isSelected = activeCategoryFilter === catValue;
                            return (
                                <button 
                                    key={catValue}
                                    type="button"
                                    onClick={() => onCategoryFilterChange(catValue)}
                                    style={isSelected ? {
                                        background: s.accent,
                                        color: '#ffffff',
                                        borderColor: 'transparent',
                                    } : {
                                        background: s.card,
                                        color: s.textMuted,
                                        border: s.border,
                                        boxShadow: s.shadowButton,
                                    }}
                                    className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[8px] font-mono font-extrabold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer`}
                                >
                                    {React.createElement(catInfo.icon, { size: 9, className: isSelected ? 'text-white' : '' })} 
                                    {catInfo.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Content area */}
            <div 
                style={{ scrollbarWidth: 'thin' }} 
                className="flex-1 overflow-y-auto custom-scrollbar relative z-10 mt-1"
            >
                {(viewMode === 'keyword' || viewMode === 'semantic') ? (
                    <div className="space-y-3">
                        {/* Count bar matches screenshot */}
                        <div className="flex items-center justify-between px-1 py-1 text-left select-none">
                            <span 
                                style={{ color: s.text }} 
                                className="text-[10px] font-sans font-black tracking-wider uppercase flex items-center gap-1.5"
                            >
                                <Database size={11} style={{ color: s.accent }} /> Mục ({filteredEntries.length})
                            </span>
                            {(activeCategoryFilter || searchTerm) && (
                                <button 
                                    onClick={() => {
                                        onCategoryFilterChange(null);
                                        onSearchChange("");
                                    }}
                                    style={{ color: s.accent }}
                                    className="text-[9px] font-sans font-extrabold hover:underline cursor-pointer"
                                >
                                    Bỏ Chọn Tất Cả
                                </button>
                            )}
                        </div>

                        {/* List entries */}
                        {filteredEntries.length === 0 ? (
                            <div className="text-center py-20 text-xs flex flex-col items-center gap-3">
                                <div 
                                    style={{
                                        background: s.card,
                                        border: s.border,
                                        boxShadow: s.shadowButton,
                                    }}
                                    className="p-3.5 rounded-full"
                                >
                                    <RotateCcw size={20} style={{ color: s.accent }} className="opacity-75" />
                                </div>
                                <span style={{ color: s.textMuted }} className="font-serif text-xs italic tracking-wider">
                                    Không tìm thấy mục nào.
                                </span>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {filteredEntries.map(entry => {
                                    const isSelected = selectedId === entry.id;
                                    const isEnabled = entry.isEnabled !== false;
                                    const catInfo = CATEGORY_MAP[entry.category || 'world'];
                                    return (
                                        <button
                                            key={entry.id}
                                            onClick={() => onSelect(entry.id)}
                                            style={isSelected ? {
                                                background: s.card,
                                                borderColor: s.accent,
                                                boxShadow: s.shadowInner,
                                            } : {
                                                background: s.card,
                                                border: s.border,
                                                boxShadow: s.shadowButton,
                                            }}
                                            className={`w-full text-left p-3.5 rounded-xl border transition-all relative overflow-hidden flex flex-col gap-1 cursor-pointer hover:scale-[1.01] ${!isEnabled ? 'opacity-40 grayscale' : ''}`}
                                        >
                                            {/* Edge highlight indicator for selected row */}
                                            {isSelected && (
                                                <div 
                                                    style={{ backgroundColor: s.accent }} 
                                                    className="absolute left-0 top-0 bottom-0 w-[4px] rounded-r"
                                                />
                                            )}
                                            
                                            {/* Entry title and category icon */}
                                            <div className="flex items-center justify-between gap-2 w-full">
                                                <div className="flex items-center gap-1.5 select-none min-w-0 flex-1 flex-row">
                                                    {catInfo && (
                                                        <span style={{ color: s.accent }} className="shrink-0">
                                                            {React.createElement(catInfo.icon, { size: 10 })}
                                                        </span>
                                                    )}
                                                    <h5 style={{ color: s.text }} className={`font-serif text-xs font-black tracking-wide capitalize truncate ${!isEnabled ? 'line-through' : ''}`}>
                                                        {entry.keyword || 'Bài viết mới'}
                                                    </h5>
                                                </div>

                                                <div className="flex gap-0.5 shrink-0">
                                                    {entry.isSticky && (
                                                        <span 
                                                            style={{
                                                                background: s.badgeBg,
                                                                color: s.accent,
                                                            }}
                                                            className="p-1 rounded font-bold text-[7px]" 
                                                            title="Luôn ghim"
                                                        >
                                                            <Pin size={6} />
                                                        </span>
                                                    )}
                                                    {entry.triggerMode === 'always' && (
                                                        <span 
                                                            style={{
                                                                background: s.badgeBg,
                                                                color: s.accent,
                                                            }}
                                                            className="px-1 py-0.5 rounded font-mono font-bold text-[6px] uppercase tracking-wide leading-none flex items-center justify-center border border-dashed"
                                                        >
                                                            Always
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Content snippet wrapper */}
                                            <p style={{ color: s.textMuted }} className="text-[10px] font-sans line-clamp-1 leading-relaxed">
                                                {entry.category === 'character' ? (() => {
                                                    try {
                                                        const cData = JSON.parse(entry.text || "{}");
                                                        return [cData.narrativeRole, cData.personality, cData.appearance].filter(Boolean).join(" • ").replace(/[#*`~>]/g, '');
                                                    } catch {
                                                        return (entry.text || '').replace(/[#*`~>]/g, '');
                                                    }
                                                })() : (entry.text || '').replace(/[#*`~>]/g, '')}
                                            </p>

                                            {/* Footer metadata details */}
                                            <div style={{ borderTopColor: s.borderMuted }} className="flex items-center justify-between border-t pt-1.5 mt-0.5 text-[8px] text-gray-400 font-mono tracking-wider">
                                                <span>{new Date(entry.timestamp).toLocaleDateString("vi-VN")}</span>
                                                <div className="flex items-center gap-1">
                                                    <span>~{Math.round((entry.text?.length || 0)/3.8)} Tokens</span>
                                                    <ChevronRight size={10} style={{ color: s.accent }} className={`transition-all ${isSelected ? 'translate-x-0.5 opacity-100' : 'opacity-0'}`} />
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-full relative animate-fadeIn">
                        {renderTool?.()}
                    </div>
                )}
            </div>
        </div>
    );
};
