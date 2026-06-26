import React, { useMemo, useState } from 'react';
import { WorldData, GameTime } from '../../../../types';
import { 
    MapPin, Heart, User, Sun, Moon, Backpack, Shirt, 
    ChevronDown, ChevronUp, Wind, Target, Users, BookOpen, 
    Shield, Coins, Swords, Zap, Activity, Clock, Sparkles, Flame, Compass, Scroll, FileText, Settings, Plus, Trash2
} from 'lucide-react';
import { formatGameTime } from '../../../../utils/timeUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { dbService } from '../../../../services/db/indexedDB';
import { useNeumorphicTheme } from '../../../../hooks/useNeumorphicTheme';

interface DynamicHUDProps {
    worldData?: WorldData | null;
    gameTime?: GameTime;
    turnCount: number;
}

interface CustomWidget {
    id: string;
    label: string;
    tableId: string; // e.g. "2"
    rowIdx: number;  // index of row
    colIdx: number;  // index of column
    iconEmoji: string; // emoji icon
}

export const DynamicHUD: React.FC<DynamicHUDProps> = ({ worldData, gameTime, turnCount }) => {
    const s = useNeumorphicTheme();
    const [expanded, setExpanded] = useState(true);
    const [activeTab, setActiveTab] = useState<'status' | 'inventory' | 'quests' | 'relations' | 'chronicles' | 'config'>('status');
    const [selectedItem, setSelectedItem] = useState<{name: string, quantity?: string, desc: string} | null>(null);
    const [searchItemText, setSearchItemText] = useState('');
    const [activeLsrBrowserTable, setActiveLsrBrowserTable] = useState<string>('2');

    // --- State For Custom/Toggled Widgets (With Unified IndexedDB Key-Value Persistence) ---
    const [visibleWidgets, setVisibleWidgets] = useState<string[]>(() => {
        try {
            const saved = dbService.getKeyValueSync('ark_hud_visible_widgets');
            return saved ? saved : ['env', 'stats', 'relations', 'quest', 'economy', 'effects'];
        } catch {
            return ['env', 'stats', 'relations', 'quest', 'economy', 'effects'];
        }
    });

    const [customWidgets, setCustomWidgets] = useState<CustomWidget[]>(() => {
        try {
            const saved = dbService.getKeyValueSync('ark_hud_custom_widgets');
            return saved ? saved : [];
        } catch {
            return [];
        }
    });

    // Custom HUD theme overrides
    const [hudThemeSkin, setHudThemeSkin] = useState<'default' | 'mystic' | 'rose' | 'emerald'>(() => {
        return (dbService.getKeyValueSync('ark_hud_skin_theme')) || 'default';
    });

    // Custom Widget form variables
    const [newWidgetLabel, setNewWidgetLabel] = useState('');
    const [newWidgetTable, setNewWidgetTable] = useState('2');
    const [newWidgetRow, setNewWidgetRow] = useState(0);
    const [newWidgetCol, setNewWidgetCol] = useState(1);
    const [newWidgetEmoji, setNewWidgetEmoji] = useState('🔮');

    const [openedCard, setOpenedCard] = useState<string | null>(null);

    const lsr = worldData?.lsrData || {};

    // Helper to get element values safely (supports objects with numeric keys from LsrParser and fallback arrays)
    const getRowValue = (row: any, idx: number | string, fallback: string = ''): string => {
        if (!row) return fallback;
        const val = row[idx] !== undefined ? row[idx] : row[String(idx)];
        return val !== undefined ? String(val).trim() : fallback;
    };

    // Helper to estimate progress percentages from formatted/descriptive text
    const getProgressRatio = (valStr: string): number => {
        if (!valStr) return -1;
        const cleanVal = valStr.trim().toLowerCase();

        // 1. Check numeric fraction percentages e.g. "80/100" or "75%"
        const pctMatch = valStr.match(/(\d+)%/);
        if (pctMatch) return parseInt(pctMatch[1]);

        const fracMatch = valStr.match(/(\d+)\s*[/|]\s*(\d+)/);
        if (fracMatch) {
            const cur = parseInt(fracMatch[1]);
            const max = parseInt(fracMatch[2]);
            return max > 0 ? Math.min((cur / max) * 100, 100) : 0;
        }

        const numMatch = valStr.match(/^(\d+)$/);
        if (numMatch) {
            const v = parseInt(numMatch[1]);
            return v <= 100 ? v : 100;
        }

        // 2. High-accuracy description mappings (Vietnamese roleplay terms fallback)
        if (cleanVal.includes('sung mãn') || cleanVal.includes('tối đa') || cleanVal.includes('hoàn hảo') || cleanVal.includes('vô địch') || cleanVal.includes('tốt') || cleanVal.includes('cực khỏe') || cleanVal.includes('khỏe mạnh')) {
            return 100;
        }
        if (cleanVal.includes('bình thường') || cleanVal.includes('ổn định') || cleanVal.includes('khá') || cleanVal.includes('đang hồi phục') || cleanVal.includes('hồi phục')) {
            return 80;
        }
        if (cleanVal.includes('mệt mỏi') || cleanVal.includes('suy yếu nhẹ') || cleanVal.includes('chấn thương nhẹ') || cleanVal.includes('suy sụp nhẹ') || cleanVal.includes('trầy xước')) {
            return 60;
        }
        if (cleanVal.includes('suy yếu') || cleanVal.includes('thấp') || cleanVal.includes('kiệt sức') || cleanVal.includes('thương tổn nặng') || cleanVal.includes('bị thương')) {
            return 40;
        }
        if (cleanVal.includes('nguy kịch') || cleanVal.includes('hấp hối') || cleanVal.includes('nguyên thần tổn hao') || cleanVal.includes('sắp chết') || cleanVal.includes('hôn mê')) {
            return 15;
        }
        return -1;
    };
    
    // --- Parse LSR Tables ---
    // #0 Thông tin Hiện tại: ["Thời gian", "Địa điểm", "Sự kiện", "Mục tiêu"]
    const t0 = (lsr['0'] || []) as any[];
    const currentInfo = t0[t0.length - 1] || null;
    const locationString = getRowValue(currentInfo, 1, 'Chưa xác định');
    const currentEvent = getRowValue(currentInfo, 2, '');
    const currentObjective = getRowValue(currentInfo, 3, '');

    // #1 Nhân vật Gần đây: ["Tên Nhân vật", "Thái độ/Trạng thái", "Hành động"]
    const recentNpcs = (lsr['1'] || []).map(row => ({
        name: getRowValue(row, 0),
        status: getRowValue(row, 1),
        action: getRowValue(row, 2)
    })).filter(n => n.name);

    // #2 Trạng thái Bản thân: ["Chỉ số/Tên", "Giá trị", "Mô tả"]
    const playerStats = (lsr['2'] || []).map(row => ({
        name: getRowValue(row, 0),
        value: getRowValue(row, 1),
        desc: getRowValue(row, 2)
    })).filter(s => s.name);
    
    // Find primary health and mana stats to draw beautiful gauge bars in the core panel
    const healthStat = playerStats.find(s => 
        s.name.toLowerCase().includes('máu') || 
        s.name.toLowerCase().includes('hp') || 
        s.name.toLowerCase().includes('sinh lực') || 
        s.name.toLowerCase().includes('the luc') || 
        s.name.toLowerCase().includes('thể lực')
    );
    const manaStat = playerStats.find(s => 
        s.name.toLowerCase().includes('mana') || 
        s.name.toLowerCase().includes('năng lượng') || 
        s.name.toLowerCase().includes('ki') || 
        s.name.toLowerCase().includes('mp') || 
        s.name.toLowerCase().includes('pháp lực')
    );

    const quickStatus = healthStat ? `${healthStat.value} - ${healthStat.desc || ''}` : 'Bình thường';
    
    // #3 Quan hệ: ["Tên Nhân vật", "Độ thân thiết", "Chi tiết/Đánh giá"]
    const relations = (lsr['3'] || []).map(row => ({
        name: getRowValue(row, 0),
        affinity: getRowValue(row, 1),
        desc: getRowValue(row, 2)
    })).filter(r => r.name);
    
    // #4 Nhiệm vụ / Quest: ["Thời gian", "Trạng thái", "Tên Quest", "Tiến độ"]
    const quests = (lsr['4'] || []).map(row => ({
        time: getRowValue(row, 0),
        status: getRowValue(row, 1),
        name: getRowValue(row, 2),
        progress: getRowValue(row, 3)
    })).filter(q => q.name);
    const activeQuest = quests.find(q => 
        q.status.toLowerCase().includes('đang') || 
        q.status.toLowerCase().includes('active') || 
        q.status.toLowerCase().includes('chưa')
    );

    // #5 Kỹ năng / Phép thuật: ["Tên kỹ năng", "Cấp độ", "Sức mạnh / Mô tả"]
    const skills = (lsr['5'] || []).map(row => ({
        name: getRowValue(row, 0),
        level: getRowValue(row, 1),
        desc: getRowValue(row, 2)
    })).filter(s => s.name);

    // #6 Túi đồ: ["Tên vật phẩm", "Số lượng", "Trạng thái/Tác dụng"]
    const items = (lsr['6'] || []).map(row => ({
        name: getRowValue(row, 0),
        quantity: getRowValue(row, 1),
        desc: getRowValue(row, 2)
    })).filter(i => i.name);

    const filteredItems = useMemo(() => {
        if (!searchItemText.trim()) return items;
        return items.filter(i => 
            i.name.toLowerCase().includes(searchItemText.toLowerCase()) || 
            (i.desc && i.desc.toLowerCase().includes(searchItemText.toLowerCase()))
        );
    }, [items, searchItemText]);

    // #7 Trang bị đang mặc: ["Vị trí", "Tên trang bị", "Hiệu ứng/Độ bền"]
    const equipment = (lsr['7'] || []).map(row => ({
        slot: getRowValue(row, 0),
        name: getRowValue(row, 1),
        desc: getRowValue(row, 2)
    })).filter(e => e.name);

    // #8 Địa điểm đã biết
    const places = (lsr['8'] || []).map(row => ({
        name: getRowValue(row, 0),
        description: getRowValue(row, 1)
    })).filter(p => p.name);

    // #9 Phe phái / Thế lực
    const factions = (lsr['9'] || []).map(row => ({
        name: getRowValue(row, 0),
        reputation: getRowValue(row, 1),
        diplomacy: getRowValue(row, 2)
    })).filter(f => f.name);

    // #10 Timeline Sự kiện Thế giới
    const worldTimeline = (lsr['10'] || []).map(row => ({
        time: getRowValue(row, 0),
        significance: getRowValue(row, 1),
        name: getRowValue(row, 2),
        detail: getRowValue(row, 3)
    })).filter(t => t.name || t.detail);

    // #11 Tin đồn / Nhật ký
    const rumors = (lsr['11'] || []).map(row => ({
        source: getRowValue(row, 0),
        content: getRowValue(row, 1),
        reliability: getRowValue(row, 2)
    })).filter(r => r.content);

    // #12 Hiệu ứng (Buff/Debuff): ["Tên hiệu ứng", "Thời gian còn lại", "Tác dụng"]
    const activeEffects = (lsr['12'] || []).map(row => ({
        name: getRowValue(row, 0),
        duration: getRowValue(row, 1),
        effect: getRowValue(row, 2)
    })).filter(e => e.name);

    // #13 Kinh tế / Tiền tệ: ["Loại tài sản", "Số lượng", "Ghi chú"]
    const economy = (lsr['13'] || []).map(row => ({
        type: getRowValue(row, 0),
        amount: getRowValue(row, 1),
        note: getRowValue(row, 2)
    })).filter(eco => eco.type);

    // #14 Pet / Đồng hành
    const companions = (lsr['14'] || []).map(row => ({
        name: getRowValue(row, 0),
        status: getRowValue(row, 1),
        loyalty: getRowValue(row, 2)
    })).filter(c => c.name);

    // #15 Timeline Nhân Vật Chính
    const playerTimeline = (lsr['15'] || []).map(row => ({
        arc: getRowValue(row, 0),
        date: getRowValue(row, 1),
        character: getRowValue(row, 2),
        event: getRowValue(row, 3)
    })).filter(t => t.event);

    // Format final time string
    const timeString = gameTime ? formatGameTime(gameTime) : (getRowValue(currentInfo, 0) || '12:00');
    
    // --- Dynamic Environmental Color Themes & Icons --
    const environmentTheme = useMemo(() => {
        const lcTime = timeString.toLowerCase();
        const locStr = locationString.toLowerCase();
        
        let accentColor = "text-sky-400";
        let accentBg = "bg-sky-500/10";
        let accentBorder = "border-sky-500/30";
        let hoverBorder = "hover:border-sky-500/50";
        let glowShadow = "shadow-[0_0_15px_rgba(56,189,248,0.25)]";
        let bgGradient = "from-slate-900 via-slate-950 to-zinc-950";
        let headerGradient = "from-slate-950/70 to-slate-950/80";
        let headingText = "text-sky-200";
        let timeIcon = <Sun size={14} className="text-amber-400" />;
        
        // Manual Skin Overrides
        if (hudThemeSkin === 'mystic') {
            accentColor = "text-indigo-400";
            accentBg = "bg-indigo-500/10";
            accentBorder = "border-indigo-500/30";
            hoverBorder = "hover:border-indigo-500/50";
            glowShadow = "shadow-[0_0_15px_rgba(99,102,241,0.25)]";
            bgGradient = "from-indigo-950/50 via-slate-950 to-neutral-950";
            headerGradient = "from-indigo-950/80 to-indigo-950/90";
            headingText = "text-indigo-200";
            timeIcon = <Moon size={14} className="text-violet-300 animate-pulse" />;
        } else if (hudThemeSkin === 'rose') {
            accentColor = "text-rose-400";
            accentBg = "bg-rose-500/10";
            accentBorder = "border-rose-500/30";
            hoverBorder = "hover:border-rose-500/50";
            glowShadow = "shadow-[0_0_15px_rgba(244,63,94,0.25)]";
            bgGradient = "from-rose-950/40 via-slate-950 to-zinc-950";
            headerGradient = "from-rose-950/70 to-slate-950/85";
            headingText = "text-rose-200";
            timeIcon = <Sun size={14} className="text-rose-400 animate-spin-slow" />;
        } else if (hudThemeSkin === 'emerald') {
            accentColor = "text-emerald-400";
            accentBg = "bg-emerald-500/10";
            accentBorder = "border-emerald-500/30";
            hoverBorder = "hover:border-emerald-500/50";
            glowShadow = "shadow-[0_0_15px_rgba(16,185,129,0.25)]";
            bgGradient = "from-emerald-950/30 via-slate-950 to-slate-950";
            headerGradient = "from-emerald-950/60 to-slate-950/75";
            headingText = "text-emerald-200";
            timeIcon = <Sun size={14} className="text-yellow-300" />;
        } else {
            // Environment adaptive default
            if (lcTime.includes('đêm') || lcTime.includes('tối') || lcTime.includes('khuya') || lcTime.includes('21:') || lcTime.includes('22:') || lcTime.includes('23:') || lcTime.includes('00:') || lcTime.includes('01:') || lcTime.includes('02:') || lcTime.includes('03:') || lcTime.includes('04:')) {
                accentColor = "text-indigo-400";
                accentBg = "bg-indigo-500/10";
                accentBorder = "border-indigo-500/30";
                hoverBorder = "hover:border-indigo-500/50";
                glowShadow = "shadow-[0_0_15px_rgba(99,102,241,0.2)]";
                bgGradient = "from-indigo-950/40 via-slate-950 to-neutral-950";
                headerGradient = "from-indigo-950/85 to-indigo-950/95";
                headingText = "text-indigo-200";
                timeIcon = <Moon size={14} className="text-violet-300 animate-pulse" />;
            } else if (lcTime.includes('chiều') || lcTime.includes('hoàng hôn') || lcTime.includes('chạng vạng') || lcTime.includes('17:') || lcTime.includes('18:') || lcTime.includes('19:')) {
                accentColor = "text-rose-400";
                accentBg = "bg-rose-500/10";
                accentBorder = "border-rose-500/30";
                hoverBorder = "hover:border-rose-500/50";
                glowShadow = "shadow-[0_0_15px_rgba(244,63,94,0.25)]";
                bgGradient = "from-rose-950/30 via-slate-950 to-zinc-950";
                headerGradient = "from-rose-950/70 to-slate-950/85";
                headingText = "text-rose-200";
                timeIcon = <Sun size={14} className="text-rose-400" />;
            } else if (lcTime.includes('sáng') || lcTime.includes('bình minh') || lcTime.includes('05:') || lcTime.includes('06:') || lcTime.includes('07:') || lcTime.includes('08:') || lcTime.includes('09:')) {
                accentColor = "text-emerald-400";
                accentBg = "bg-emerald-500/10";
                accentBorder = "border-emerald-500/30";
                hoverBorder = "hover:border-emerald-500/50";
                glowShadow = "shadow-[0_0_15px_rgba(16,185,129,0.22)]";
                bgGradient = "from-emerald-950/30 via-slate-950 to-slate-950";
                headerGradient = "from-emerald-950/60 to-slate-950/75";
                headingText = "text-emerald-200";
                timeIcon = <Sun size={14} className="text-yellow-300 animate-pulse" />;
            }
        }
        
        let sceneryIcon = <MapPin size={12} className={accentColor} />;
        if (locStr.includes('rừng') || locStr.includes('cây') || locStr.includes('thảo nguyên') || locStr.includes('núi') || locStr.includes('nguyên')) {
            sceneryIcon = <MapPin size={12} className="text-emerald-400" />;
        } else if (locStr.includes('hang') || locStr.includes('hầm') || locStr.includes('ngục') || locStr.includes('đá') || locStr.includes('tối')) {
            sceneryIcon = <MapPin size={12} className="text-neutral-400" />;
        } else if (locStr.includes('biển') || locStr.includes('sông') || locStr.includes('hồ') || locStr.includes('nước') || locStr.includes('đại dương')) {
            sceneryIcon = <MapPin size={12} className="text-cyan-400 animate-pulse" />;
        } else if (locStr.includes('hỏa') || locStr.includes('lửa') || locStr.includes('vực') || locStr.includes('lab')) {
            sceneryIcon = <MapPin size={12} className="text-rose-500" />;
        } else if (locStr.includes('phố') || locStr.includes('thành') || locStr.includes('chợ') || locStr.includes('quán') || locStr.includes('lâu đài')) {
            sceneryIcon = <MapPin size={12} className="text-amber-400" />;
        }
        
        return {
            accentColor,
            accentBg,
            accentBorder,
            hoverBorder,
            glowShadow,
            bgGradient,
            headerGradient,
            headingText,
            timeIcon,
            sceneryIcon,
            timeStr: timeString // Fixes original undefined rendering bug
        };
    }, [timeString, locationString, hudThemeSkin]);

    // --- Dynamic Health Glow aura around character photo ---
    const characterAura = useMemo(() => {
        const effectsStr = JSON.stringify(activeEffects).toLowerCase();
        
        const isPoisoned = effectsStr.includes('độc') || effectsStr.includes('yếu') || effectsStr.includes('nguyền') || effectsStr.includes('dược');
        const isWounded = healthStat && (
            healthStat.value.toLowerCase().includes('yếu') || 
            healthStat.value.toLowerCase().includes('thấp') || 
            healthStat.value.toLowerCase().includes('nguy kịch') ||
            (getProgressRatio(healthStat.value) !== -1 && getProgressRatio(healthStat.value) < 30)
        );
        const isBuffed = effectsStr.includes('phúc lành') || effectsStr.includes('vệ') || effectsStr.includes('tăng') || effectsStr.includes('pháp') || effectsStr.includes('quang');

        if (isWounded) {
            return {
                pulseClass: "animate-ping bg-rose-500/20 ring-2 ring-rose-500/50",
                borderClass: "border-rose-500/90 shadow-[0_0_15px_rgba(244,63,94,0.73)]"
            };
        } else if (isPoisoned) {
            return {
                pulseClass: "animate-pulse bg-purple-500/20 ring-2 ring-purple-400/50",
                borderClass: "border-purple-500/90 shadow-[0_0_15px_rgba(168,85,247,0.73)]"
            };
        } else if (isBuffed) {
            return {
                pulseClass: "animate-pulse bg-amber-400/20 ring-2 ring-amber-400/50",
                borderClass: "border-amber-400/80 shadow-[0_0_12px_rgba(251,191,36,0.61)]"
            };
        }
        
        return {
            pulseClass: "animate-pulse bg-sky-500/10 ring-1 ring-sky-500/30",
            borderClass: "border-sky-500/60 shadow-[0_0_8px_rgba(56,189,248,0.36)]"
        };
    }, [activeEffects, healthStat]);

    // --- Widget Action handlers ---
    const toggleWidget = (widgetId: string) => {
        const updated = visibleWidgets.includes(widgetId)
            ? visibleWidgets.filter(w => w !== widgetId)
            : [...visibleWidgets, widgetId];
        setVisibleWidgets(updated);
        dbService.setKeyValue('ark_hud_visible_widgets', updated);
    };

    const addCustomWidget = () => {
        if (!newWidgetLabel.trim()) return;
        const newWidget: CustomWidget = {
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7),
            label: newWidgetLabel.trim(),
            tableId: newWidgetTable,
            rowIdx: newWidgetRow,
            colIdx: newWidgetCol,
            iconEmoji: newWidgetEmoji
        };
        const updated = [...customWidgets, newWidget];
        setCustomWidgets(updated);
        dbService.setKeyValue('ark_hud_custom_widgets', updated);
        setNewWidgetLabel('');
    };

    const removeCustomWidget = (id: string) => {
        const updated = customWidgets.filter(w => w.id !== id);
        setCustomWidgets(updated);
        dbService.setKeyValue('ark_hud_custom_widgets', updated);
    };

    const changeSkin = (skin: 'default' | 'mystic' | 'rose' | 'emerald') => {
        setHudThemeSkin(skin);
        dbService.setKeyValue('ark_hud_skin_theme', skin);
    };

    const silhouetteSlots = [
        { key: 'đầu', label: 'Mũ/Đầu', icon: <Shirt size={14} className="opacity-25" /> },
        { key: 'áo', label: 'Cơ thể/Áo', icon: <Shirt size={14} className="opacity-25" /> },
        { key: 'vũ khí', label: 'Vũ khí chính', icon: <Swords size={14} className="opacity-25" /> },
        { key: 'tay', label: 'Tay/Shield', icon: <Shield size={14} className="opacity-25" /> },
        { key: 'nhẫn', label: 'Nhẫn/Bùa', icon: <Coins size={14} className="opacity-25" /> },
        { key: 'chân', label: 'Giày/Chân', icon: <Backpack size={14} className="opacity-25" /> }
    ];

    const subCardStyle = {
        backgroundColor: s.card,
        borderColor: s.borderMuted,
    };
    
    const inputStyle = {
        backgroundColor: s.card,
        borderColor: s.borderMuted,
        color: s.text,
    };

    if (!worldData) return null;

    // ----- CẤU TRÚC LƯỚI & CỬA SỔ NỔI (GRID + FLOATING WIDGETS) -----
    return (
        <div className="relative w-full z-20 pointer-events-none" id="dynamic_hud_container">
            <div className="flex justify-between items-center px-4 py-1.5 cursor-pointer pointer-events-auto border-b bg-black/5 dark:bg-white/5 backdrop-blur-sm" onClick={() => setExpanded(!expanded)} style={{ borderColor: s.borderMuted }}>
                <h3 className="text-xs font-black uppercase tracking-widest font-mono flex items-center gap-2" style={{ color: s.text }}>
                    <Compass size={14} className="text-amber-500" />
                    DYNAMIC HUD
                </h3>
                <div className="flex items-center gap-2">
                    <button className="text-[10px] font-bold opacity-50 hover:opacity-100 transition-opacity" style={{ color: s.text }}>
                        {expanded ? 'THU GỌN' : 'MỞ RỘNG'}
                    </button>
                    {expanded ? <ChevronUp size={14} style={{ color: s.textMuted }} /> : <ChevronDown size={14} style={{ color: s.textMuted }} />}
                </div>
            </div>

            <AnimatePresence>
                {expanded && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-visible w-full pointer-events-auto p-2"
                    >
                        {/* GRID OF TILES */}
                        <div className="flex flex-wrap gap-2">
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
            {/* END GRID OF TILES */}
        </motion.div>
        )}
    </AnimatePresence>

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
