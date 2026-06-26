import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  RotateCcw, 
  Upload,
  X,
  Clock,
  FileText,
  Trash2,
  CheckCircle,
  DownloadCloud,
  Database,
  Settings,
  Users,
  Info,
  MessageCircle,
  Heart,
  Tags,
  HardDrive,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  ShoppingBag,
  Award,
  BookOpen,
  Image as ImageIcon
} from 'lucide-react';
import { useDatabaseStatus } from '../../../hooks/useDatabaseStatus';
import { NavigationProps, GameState, SaveFile, WorldData, AppSettings } from '../../../types';
import { dbService, DEFAULT_SETTINGS } from '../../../services/db/indexedDB';
import { CharacterLibraryScreen } from './CharacterLibraryScreen';
import { ArkLogo } from '../../ui/ArkLogo';
import { CHANGELOG_DATA } from '../../../data/changelog';
import { AnimatedBackground } from './AnimatedBackground';
import { useNeumorphicTheme } from '../../../hooks/useNeumorphicTheme';

export const MainMenuScreen: React.FC<NavigationProps> = ({ onNavigate, onGameStart }) => {
  const [isIntroing, setIsIntroing] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsIntroing(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const { hasSaves: dbHasSaves } = useDatabaseStatus();
  const [menuHasSaves, setMenuHasSaves] = useState(false);
  const [saveList, setSaveList] = useState<SaveFile[]>([]);
  const manualSaves = saveList.filter(s => !s.id.startsWith('autosave-'));
  const autoSaves = saveList.filter(s => s.id.startsWith('autosave-'));

  useEffect(() => {
    setMenuHasSaves(dbHasSaves);
  }, [dbHasSaves]);

  useEffect(() => {
    const updateHasSaves = async () => {
      const exists = await dbService.hasSaves();
      setMenuHasSaves(exists);
    };
    updateHasSaves();
  }, [saveList]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showCharacterLibrary, setShowCharacterLibrary] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoActiveTab, setInfoActiveTab] = useState<'info' | 'changelog'>('info');
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [showToolsSubmenu, setShowToolsSubmenu] = useState(false);
  const [activeSaveTab, setActiveSaveTab] = useState<'manual' | 'autosave'>('manual');
  
  const [toast, setToast] = useState<{show: boolean, message: string}>({show: false, message: ''});
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const s = useNeumorphicTheme();

  const [storageUsage, setStorageUsage] = useState<string>('Đang tính...');
  const [apiStatus, setApiStatus] = useState<{text: string; isActive: boolean; type: 'proxy' | 'key' | 'none'}>({ text: 'Đang kiểm tra...', isActive: false, type: 'none' });

  useEffect(() => {
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(estimate => {
        const usageMB = ((estimate.usage || 0) / (1024 * 1024)).toFixed(2);
        const quotaMB = ((estimate.quota || 0) / (1024 * 1024 * 1024)).toFixed(1);
        setStorageUsage(`${usageMB} MB / ${quotaMB} GB`);
      }).catch(() => {
        setStorageUsage('Chưa xác định');
      });
    }
  }, []);

  useEffect(() => {
    if (!settings) return;
    let isProxyActive = false;
    let proxyName = '';
    const activeProxy = settings.proxies?.find(p => p.id === settings.activeProxyId);
    if (activeProxy && activeProxy.url && activeProxy.key) {
      isProxyActive = true;
      proxyName = activeProxy.name || 'Custom Proxy';
    } else if (settings.proxyEnabled && settings.proxyUrl && settings.proxyKey) {
      isProxyActive = true;
      proxyName = settings.proxyName || 'Legacy Proxy';
    }
    
    if (isProxyActive) {
      setApiStatus({ text: `Proxy hoạt động: ${proxyName}`, isActive: true, type: 'proxy' });
      return;
    }
    
    if (settings.useGeminiApi !== false && settings.geminiApiKey && Array.isArray(settings.geminiApiKey)) {
      const keys = settings.geminiApiKey.filter(k => k && k.trim() !== "" && k !== "YOUR_API_KEY");
      if (keys.length > 0) {
        setApiStatus({ text: `Gemini API sẵn sàng (${keys.length} Key)`, isActive: true, type: 'key' });
        return;
      }
    }
    
    const safeEnv = (typeof process !== "undefined" && process?.env) ? process.env : {};
    if (!!(safeEnv?.API_KEY || safeEnv?.GEMINI_API_KEY)) {
      setApiStatus({ text: 'Sử dụng hệ thống tự động (Server ENV Key)', isActive: true, type: 'key' });
      return;
    }
    
    setApiStatus({ text: 'Chưa cài đặt API Key hoặc Proxy', isActive: false, type: 'none' });
  }, [settings]);

  useEffect(() => {
    const loadData = async () => {
      const savedBg = await dbService.getAsset('ark_v2_custom_bg');
      if (savedBg) setBgImage(savedBg);
      const savedSettings = await dbService.getSettings();
      if (savedSettings) setSettings(savedSettings);

      // Load initial saves list on mount to sync "Continue" button status and have modal cache ready
      try {
        const saves = await dbService.getAllSaves();
        saves.sort((a, b) => b.updatedAt - a.updatedAt);
        setSaveList(saves);
      } catch (err) {
        console.error("Error loading initial saves:", err);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (toast.show) {
        const timer = setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
        return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    let successCount = 0;
    for (let i = 0; i < files.length; i++) {
        try {
            const file = files[i];
            const reader = new FileReader();
            const fileContent = await new Promise<string>((resolve) => {
              reader.onload = (e) => resolve(e.target?.result as string);
              reader.readAsText(file);
            });
            const parsedData = JSON.parse(fileContent);
            if (parsedData.savedState || parsedData.history || parsedData.world) {
                const saveId = `manual-import-${Date.now()}-${i}`;
                await dbService.saveGameState({
                    id: saveId,
                    name: `[Nhập] ${file.name.replace('.json', '')}`,
                    updatedAt: Date.now(),
                    data: parsedData
                });
                successCount++;
            }
        } catch(e){}
    }
    const saves = await dbService.getAllSaves();
    saves.sort((a, b) => b.updatedAt - a.updatedAt);
    setSaveList(saves);
    if (successCount > 0) setToast({ show: true, message: `Đã nhập thành công ${successCount} tệp lưu!` });
    event.target.value = '';
  };

  const handleOpenLoadGame = async () => {
      const saves = await dbService.getAllSaves();
      saves.sort((a, b) => b.updatedAt - a.updatedAt);
      setSaveList(saves);
      setShowLoadModal(true);
  };

  const handleDeleteClick = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      await dbService.deleteSave(id);
      const newSaves = await dbService.getAllSaves();
      newSaves.sort((a, b) => b.updatedAt - a.updatedAt);
      setSaveList(newSaves);
      setToast({ show: true, message: "Đã xóa file save thành công!" });
  };

  const handleDownloadSave = (save: SaveFile) => {
    try {
        const fileData = JSON.stringify(save, null, 2);
        const blob = new Blob([fileData], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        
        const safeName = (save.name || 'save').toLowerCase().replace(/[^a-z0-9]/gi, '_');
        const dateStr = new Date(save.updatedAt).toISOString().split('T')[0];
        link.download = `save_${safeName}_${dateStr}.json`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setToast({ show: true, message: "Đã tải file save về máy!" });
    } catch (e) {
        console.error("Failed to download save:", e);
    }
  };

  const handleContinue = async () => {
      const saves = await dbService.getAllSaves();
      if (saves.length > 0) {
          saves.sort((a, b) => b.updatedAt - a.updatedAt);
          handleLoadSave(saves[0]);
      }
  };

  const handleLoadSave = (save: SaveFile) => {
      if (!onGameStart) return;
      const worldData = save.data as WorldData;
      if (!worldData.savedState) return;
      worldData.activeSaveId = save.id;
      onGameStart(worldData);
  };

  return (
    <div className="flex relative h-full w-full overflow-hidden" style={{ backgroundColor: s.bg, color: s.text }}>
      {/* Menu Background */}
      {bgImage && (
        <div 
          className="absolute inset-0 z-0 pointer-events-none"
          style={{ 
            backgroundImage: `url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.35)'
          }}
        />
      )}

      {/* Intro Overlay */}
      <AnimatePresence>
        {isIntroing && (
           <motion.div 
             className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black transition-colors duration-500"
             initial={{ opacity: 1 }}
             exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
           >
             <motion.div 
               initial={{ scale: 0.85, opacity: 0, y: 15 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 1.05, opacity: 0, y: -15 }}
               transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
               className="flex flex-col items-center justify-center gap-7"
             >
               <motion.div 
                 layoutId="ark-main-logo" 
                 className="text-white"
                 animate={{ y: [0, -4, 0] }}
                 transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
               >
                 <ArkLogo size={140} />
               </motion.div>
               <h2 className="font-serif text-sm font-extrabold text-white/80 tracking-[0.4em] select-none uppercase">
                 LOADING...
               </h2>
             </motion.div>
           </motion.div>
        )}
      </AnimatePresence>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".json" 
        multiple
        className="hidden" 
      />

      {/* Main Layout Area */}
      <div className={`relative z-10 w-full md:w-[420px] h-full flex flex-col p-6 md:p-8 transition-opacity duration-1000 ${isIntroing ? 'opacity-0' : 'opacity-100'} overflow-y-auto no-scrollbar md:mr-auto justify-start items-center md:items-start`} style={{ backgroundColor: s.bg }}>
        
        {/* Top Header */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left mt-4 w-full">
            <div className="flex items-center gap-3">
              <ArkLogo size={42} style={{ color: s.text }} />
              <h1 className="font-serif text-3xl sm:text-4xl font-black tracking-[0.2em]" style={{ color: s.text }}>
                ARK Rebuild
              </h1>
            </div>
            <div className="mt-2 font-bold uppercase tracking-widest text-sm" style={{ color: s.text }}>ARK Rebuild React 19</div>
            <div className="text-[10px] tracking-wider font-mono mt-1" style={{ color: s.textMuted }}>ARK Rebuild Version 8.0.0</div>
        </div>

        <div className="w-full h-px my-8" style={{ backgroundColor: s.borderMuted }} />

        {/* Menu Items */}
        <div className="flex flex-col gap-2 w-full flex-1">
          {(() => {
            const menuItems = [
              { id: 'start', title: 'Khởi Tạo', icon: Play, onClick: () => onNavigate(GameState.WORLD_CREATION) },
              { id: 'continue', title: 'Tiếp Tục', icon: Clock, disabled: !menuHasSaves, onClick: handleContinue },
              { id: 'data', title: 'Dữ Liệu', icon: Database, onClick: handleOpenLoadGame },
              { id: 'fanfic', title: 'Đồng Nhân', icon: FileText, onClick: () => onNavigate(GameState.FANFIC) },
              { id: 'train', title: 'Train Data', icon: Upload, onClick: () => onNavigate(GameState.KNOWLEDGE_TRAIN) },
              { id: 'sillytavern', title: 'Thư Viện ST', icon: Users, onClick: () => setShowCharacterLibrary(true) },
              { id: 'schema', title: 'Bản Sơ Đồ', icon: Tags, onClick: () => onNavigate(GameState.SCHEMA_DESIGNER) },
              { id: 'settings', title: 'Cấu Hình', icon: Settings, onClick: () => onNavigate(GameState.SETTINGS) },
              { id: 'info', title: 'Thông Tin', icon: Info, onClick: () => setShowInfoModal(true) },
              { id: 'discord', title: 'Discord', icon: MessageCircle, isLink: true, href: 'https://discord.gg/sPq3Y37eR7' },
              { id: 'donate', title: 'Ủng Hộ (Donate)', icon: Heart, onClick: () => setShowDonateModal(true), isFeatured: true }
            ];

            return menuItems.map(item => {
              const IconComponent = item.icon;
              
              if (item.id === 'continue' && !menuHasSaves) {
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
                    whileHover={{ scale: 1.02 }}
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
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  className="group flex items-center p-3 flex-1 rounded-2xl transition-all duration-200 cursor-pointer w-full text-left mb-3 flex-row"
                  style={{ background: s.convexBg, color: s.text, boxShadow: s.shadowOuter, border: s.border }}
                >
                  <IconComponent size={20} className="mr-4" style={{ color: s.text }} />
                  <span className="font-bold text-sm uppercase tracking-widest" style={{ color: s.text }}>{item.title}</span>
                </motion.button>
              );
            });
          })()}
        </div>

        {/* Footer info stats */}
        <div className="mt-8 pt-4 w-full flex flex-col gap-2 opacity-60" style={{ borderTop: `1px solid ${s.borderMuted}` }}>
           <div className="flex items-center gap-3">
             <ShieldCheck size={16} style={{ color: s.text }} />
             <span className="text-[10px] uppercase font-bold tracking-widest break-all" style={{ color: s.text }}>{apiStatus.text}</span>
           </div>
           <div className="flex items-center gap-3">
             <HardDrive size={16} style={{ color: s.text }} />
             <span className="text-[10px] uppercase font-bold tracking-widest" style={{ color: s.text }}>{storageUsage}</span>
           </div>
           <div className="flex items-center gap-3">
             <Database size={16} style={{ color: s.text }} />
             <span className="text-[10px] uppercase font-bold tracking-widest" style={{ color: s.text }}>IndexedDB {menuHasSaves ? '(Active)' : ''}</span>
           </div>
        </div>

      </div>

      {/* LOAD GAME MODAL */}
      <AnimatePresence>
          {showLoadModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-md p-3 md:p-8">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="w-[95vw] max-w-4xl h-[90vh] rounded-2xl flex flex-col overflow-hidden"
                    style={{ backgroundColor: s.card, border: s.border, boxShadow: s.shadowOuter }}
                  >
                      {/* Header */}
                      <div className="p-5 flex justify-between items-center" style={{ borderBottom: `1px solid ${s.borderMuted}` }}>
                          <div className="flex items-center gap-4">
                              <button onClick={() => setShowLoadModal(false)} className="w-10 h-10 flex items-center justify-center rounded-xl transition-colors" style={{ background: s.convexBg, color: s.text, boxShadow: s.shadowButton }}>
                                  <ArrowLeft size={20} />
                              </button>
                              <h2 className="text-xl font-bold uppercase tracking-widest" style={{ color: s.text }}>
                                  Dữ liệu hệ thống
                              </h2>
                          </div>
                          
                          <div className="flex items-center gap-2">
                              <button onClick={handleImportClick} className="px-4 py-2 rounded-xl h-10 flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors" style={{ color: '#fff', backgroundColor: s.accent, boxShadow: s.shadowButton }}>
                                  <Upload size={14} /> Nhập Save
                              </button>
                          </div>
                      </div>

                      {/* Tab Navigation */}
                      <div className="flex p-2 gap-2" style={{ backgroundColor: s.bg, borderBottom: `1px solid ${s.borderMuted}` }}>
                          <button
                              onClick={() => setActiveSaveTab('manual')}
                              className="flex-1 py-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest rounded-xl transition-colors"
                              style={activeSaveTab === 'manual' ? { background: s.convexBg, color: s.text, boxShadow: s.shadowInner } : { color: s.textMuted, background: 'transparent' }}
                          >
                              <FileText size={14} /> Lưu thủ công ({manualSaves.length})
                          </button>
                          <button
                              onClick={() => setActiveSaveTab('autosave')}
                              className="flex-1 py-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest rounded-xl transition-colors"
                              style={activeSaveTab === 'autosave' ? { background: s.convexBg, color: s.text, boxShadow: s.shadowInner } : { color: s.textMuted, background: 'transparent' }}
                          >
                              <Clock size={14} /> Lưu tự động ({autoSaves.length})
                          </button>
                      </div>

                      {/* Content */}
                      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar" style={{ backgroundColor: s.bg }}>
                           {(activeSaveTab === 'manual' ? manualSaves : autoSaves).length === 0 ? (
                                <div className="text-center py-20 text-sm font-bold uppercase tracking-widest" style={{ color: s.textMuted }}>
                                    Không có dữ liệu.
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                  {(activeSaveTab === 'manual' ? manualSaves : autoSaves).map((save) => (
                                    <div key={save.id} className="p-4 rounded-2xl cursor-pointer flex justify-between items-center group transition-all" style={{ background: s.convexBg, border: s.border, boxShadow: s.shadowButton }} onClick={() => handleLoadSave(save)}>
                                      <div>
                                        <div className="font-bold text-lg" style={{ color: s.text }}>{save.data?.world?.worldName || save.name || 'Unknown'}</div>
                                        <div className="text-xs mt-1 uppercase tracking-widest" style={{ color: s.textMuted }}>
                                            {typeof save.data === 'object' && save.data?.player?.name ? `Player: ${save.data.player.name} | ` : ''}
                                            {new Date(save.updatedAt).toLocaleString()}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                        <button 
                                          onClick={() => handleDownloadSave(save)} 
                                          className="w-10 h-10 flex items-center justify-center rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" 
                                          style={{ color: '#10b981', backgroundColor: s.card, boxShadow: s.shadowInner }}
                                          title="Tải tệp lưu (.json)"
                                        >
                                            <DownloadCloud size={16} />
                                        </button>
                                        <button 
                                          onClick={(e) => handleDeleteClick(e, save.id)} 
                                          className="w-10 h-10 flex items-center justify-center rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" 
                                          style={{ color: '#ef4444', backgroundColor: s.card, boxShadow: s.shadowInner }}
                                          title="Xóa tệp lưu"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                            )}
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>

      <AnimatePresence>
        {showCharacterLibrary && (
            <CharacterLibraryScreen 
                onClose={() => setShowCharacterLibrary(false)}
                onGameStart={onGameStart}
            />
        )}
      </AnimatePresence>

      {/* Info Modal */}
      <AnimatePresence>
          {showInfoModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-lg flex flex-col rounded-2xl overflow-hidden"
                    style={{ backgroundColor: s.card, border: s.border, boxShadow: s.shadowOuter }}
                  >
                      <div className="p-4 flex justify-between items-center" style={{ borderBottom: `1px solid ${s.borderMuted}` }}>
                          <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: s.text }}>Thông tin hệ thống</h2>
                          <button onClick={() => setShowInfoModal(false)} className="hover:scale-105" style={{ color: s.textMuted }}><X size={20} /></button>
                      </div>
                      <div className="p-6 text-sm leading-relaxed" style={{ color: s.text }}>
                          <div className="text-xl font-bold mb-4" style={{ color: s.accent }}>ARK System Rebuild</div>
                          <p>Bản build phục hồi & nâng cấp toàn diện dự án ARK. Áp dụng kiến trúc React + Vite hiện đại, tích hợp IndexedDB tốc độ cao.</p>
                          <div className="mt-6 pt-4 text-xs font-mono" style={{ borderTop: `1px solid ${s.borderMuted}`, color: s.textMuted }}>
                             <div>Phiên bản: 8.0.0 Alpha</div>
                             <div>Phát triển bởi: Bạch Phát Dược Thiên Tôn</div>
                          </div>
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>

      {/* Donate Modal */}
      <AnimatePresence>
          {showDonateModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-sm flex flex-col items-center rounded-2xl overflow-hidden"
                    style={{ backgroundColor: s.card, border: s.border, boxShadow: s.shadowOuter }}
                  >
                      <div className="w-full p-4 flex justify-between items-center" style={{ borderBottom: `1px solid ${s.borderMuted}`, background: s.badgeBg }}>
                          <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: s.accent }}>Ủng hộ dự án</h2>
                          <button onClick={() => setShowDonateModal(false)} className="hover:scale-105" style={{ color: s.textMuted }}><X size={20} /></button>
                      </div>
                      <div className="p-6 flex flex-col items-center text-center">
                          <div className="p-2 rounded-2xl" style={{ backgroundColor: s.bg, boxShadow: s.shadowInner }}>
                             <img src="/zlp-1779461952269.jpg" alt="QR" className="w-48 h-auto rounded-xl" />
                          </div>
                          <p className="mt-6 text-xs font-bold" style={{ color: s.textMuted }}>Cảm ơn bạn đã đồng hành và ủng hộ để nâng cấp máy chủ & API!</p>
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast.show && (
            <motion.div 
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] font-bold uppercase tracking-widest px-6 py-3 flex items-center gap-3 rounded-full"
                style={{ backgroundColor: s.card, color: s.text, boxShadow: s.shadowOuter, border: s.border }}
            >
                <CheckCircle size={18} className="text-emerald-500" />
                <span className="text-xs">{toast.message}</span>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MainMenuScreen;
