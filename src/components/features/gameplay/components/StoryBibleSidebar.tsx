import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Library,
  Search,
  X,
  Trash2,
  RefreshCw,
  Edit3,
  Plus,
  Save,
  Type,
  BrainCircuit,
  Download,
  Upload,
  User,
  MapPin,
  Flag,
  Package,
  Heart,
  Calendar,
  Globe,
  Filter,
  BookOpen,
  Star,
  Activity,
  PanelRight,
  Maximize2,
  Minimize2,
  Database,
  BarChart3,
  Flame,
  FileCode,
  Tags,
  ChevronRight,
  Scale
} from "lucide-react";
import { dbService, VectorData } from "../../../../services/db/indexedDB";
import { vectorService } from "../../../../services/ai/vectorService";
import { storyBibleService } from "../../../../services/ai/storyBibleService";
import { WorldData, AppSettings } from "../../../../types";
import { useTheme } from "../../../../context/ThemeContext";
import { useNeumorphicTheme } from "../../../../hooks/useNeumorphicTheme";
import MarkdownRenderer from "../../../common/MarkdownRenderer";
import { ScribeMonitor } from "./encyclopedia/ScribeMonitor";
import { TokenBudgetMonitor } from "./encyclopedia/TokenBudgetMonitor";
import { TriggerDebugger } from "./encyclopedia/TriggerDebugger";
import { EntryEditor } from "./encyclopedia/EntryEditor";
import { EntryListView } from "./encyclopedia/EntryListView";
import { MetadataRetrievalDebugger } from "./encyclopedia/MetadataRetrievalDebugger";
import { EncyclopediaDashboard } from "./encyclopedia/EncyclopediaDashboard";

const CATEGORY_MAP: Record<
  string,
  { label: string; color: string; icon: any }
> = {
  character: {
    label: "Nhân vật",
    color: "text-blue-700 bg-blue-105/50 border-blue-200",
    icon: User,
  },
  location: {
    label: "Địa điểm",
    color: "text-emerald-700 bg-emerald-105/50 border-emerald-200",
    icon: MapPin,
  },
  faction: {
    label: "Thế lực",
    color: "text-purple-700 bg-purple-105/50 border-purple-200",
    icon: Flag,
  },
  item: {
    label: "Vật phẩm",
    color: "text-amber-700 bg-amber-105/50 border-amber-200",
    icon: Package,
  },
  relationship: {
    label: "Mối quan hệ",
    color: "text-pink-700 bg-pink-105/50 border-pink-200",
    icon: Heart,
  },
  event: {
    label: "Sự kiện",
    color: "text-red-700 bg-red-105/50 border-red-200",
    icon: Calendar,
  },
  law: {
    label: "Luật lệ",
    color: "text-indigo-700 bg-indigo-105/50 border-indigo-200",
    icon: Scale,
  },
  world: {
    label: "Thế giới",
    color: "text-stone-700 bg-stone-105/50 border-stone-300",
    icon: Globe,
  },
};

interface StoryBibleSidebarProps {
  worldData: WorldData;
  onUpdateWorld?: (updates: Partial<WorldData>) => void;
}

const StoryBibleSidebar: React.FC<StoryBibleSidebarProps> = ({ worldData, onUpdateWorld }) => {
  const s = useNeumorphicTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [entries, setEntries] = useState<VectorData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  
  // Custom theme-friendly structure: 'duyet' (Browse), 'phantich' (Analyze), 'quanly' (Manage)
  const [activeMainTab, setActiveMainTab] = useState<'duyet' | 'phantich' | 'quanly'>('duyet');
  const [viewMode, setViewMode] = useState<'keyword' | 'semantic'>('keyword');
  const isAiSearch = viewMode === 'semantic';
  const [isSearchingSemantic, setIsSearchingSemantic] = useState(false);
  const [semanticResults, setSemanticResults] = useState<VectorData[] | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);

  // Diagnostics panel inside 'phantich' tab
  const [activeAnalyzeSubTab, setActiveAnalyzeSubTab] = useState<'constellation' | 'triggers' | 'budget' | 'scribe_recalls'>('constellation');

  // Edit & Add State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<VectorData>>({});

  const [isAdding, setIsAdding] = useState(false);
  const [addData, setAddData] = useState<Partial<VectorData>>({ 
      category: 'world', 
      triggerMode: 'hybrid', 
      priority: 50, 
      isEnabled: true, 
      position: 'before_char' 
  });

  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  const campaignId =
    worldData.id ||
    `campaign-${worldData.world?.worldName?.replace(/\s+/g, "")}-${worldData.player?.name?.replace(/\s+/g, "")}`;

  const loadEntries = async (isSilent = false) => {
    if (!isSilent) {
      setIsLoading(true);
    }
    try {
      const allVectors = await dbService.getAllVectors();
      const storyBibleVectors = allVectors.filter(
        (v) => v.role === "story_bible" && v.saveId === campaignId,
      );
      storyBibleVectors.sort((a, b) => b.timestamp - a.timestamp);
      setEntries(storyBibleVectors);

      const loadedSettings = (await dbService.getSettings()) as AppSettings;
      setSettings(loadedSettings);
    } catch (e) {
      console.error("Failed to load StoryBible entries", e);
    } finally {
      if (!isSilent) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    if (isOpen) {
      loadEntries(false);
      intervalId = setInterval(() => {
        loadEntries(true);
      }, 5000);
    }
    return () => clearInterval(intervalId);
  }, [isOpen, campaignId]);

  const filteredEntries = useMemo(() => {
    let currentList = entries;

    if (isAiSearch && semanticResults !== null) {
      currentList = semanticResults;
    }

    if (activeCategoryFilter) {
      currentList = currentList.filter(
        (e) => (e.category || "world") === activeCategoryFilter,
      );
    }

    if (!searchTerm) return currentList;

    const lowerSearch = searchTerm.toLowerCase();
    return currentList.filter(
      (entry) =>
        (entry.keyword && entry.keyword.toLowerCase().includes(lowerSearch)) ||
        (entry.text && entry.text.toLowerCase().includes(lowerSearch)),
    );
  }, [entries, searchTerm, isAiSearch, semanticResults, activeCategoryFilter]);

  useEffect(() => {
    if (!isAiSearch || !searchTerm) {
      setSemanticResults(null);
    }
  }, [isAiSearch, searchTerm]);

  const handleSemanticSearch = async () => {
    if (!searchTerm.trim() || !settings) return;
    setIsSearchingSemantic(true);
    try {
      const tempSettings = { ...settings, enableVectorMemory: true };
      const entriesData = await storyBibleService.queryContext(
        searchTerm,
        [],
        campaignId,
        tempSettings,
      );
      const results = entriesData.map(
        (e) =>
          ({
            id: e.id,
            keyword: e.title,
            text: e.content,
            category: e.category,
            timestamp: e.updatedAt,
            role: "story_bible",
            saveId: campaignId,
            score: e.confidence,
          }) as VectorData,
      );
      setSemanticResults(results);
    } catch (e: any) {
      console.error("Semantic search error", e);
      toast.error(`Lỗi khi tìm kiếm ngữ nghĩa: ${e.message || e}`);
    } finally {
      setIsSearchingSemantic(false);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(entries, null, 2);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", `Bách_Khoa_${campaignId}.json`);
    linkElement.click();
    toast.success("Đã xuất file lưu trữ bách khoa thư!");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content) as VectorData[];
        if (!Array.isArray(parsed)) throw new Error("Thư mục lỗi cấu trúc.");

        if (
          window.confirm(
            `Bạn có muốn nạp ${parsed.length} dữ kiện? Bột ký tự trùng sẽ bị đè.`
          )
        ) {
          setIsLoading(true);
          for (const entry of parsed) {
            if (entry.id && entry.text) {
              entry.role = "story_bible";
              entry.saveId = campaignId;
              if (!entry.embedding) {
                const embeddingStr = `${entry.keyword}: ${entry.text}`;
                entry.embedding = await vectorService.getEmbedding(embeddingStr) || [];
              }
              await dbService.saveVector(entry);
            }
          }
          await loadEntries();
          toast.success(`Nạp thành công ${parsed.length} điển lục vào bách khoa!`);
        }
      } catch (err: any) {
        toast.error(`Lỗi nạp văn bản: ${err.message || err}`);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleDeleteAll = async () => {
    if (
      window.confirm(
        "CẢNH BÁO: Bách khoa toàn thư sẽ bị hỏa thiêu sạch hoàn toàn. Không thể phục hồi. AI Scribe sẽ quên sạch bối cảnh. Tiếp tục?"
      )
    ) {
      setIsLoading(true);
      try {
        for (const e of entries) {
          await dbService.deleteVector(e.id);
        }
        setEntries([]);
        setSelectedEntryId(null);
        toast.success("Dã thiết bách khoa thư đã rỗng không!");
      } catch (err: any) {
        toast.error(`Thiết lập xóa lỗi: ${err.message || err}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (
      window.confirm(
        "Gạt bỏ điển lục này khỏi dã sử? AI sẽ quên và không nạp vào bối cảnh truyện."
      )
    ) {
      await dbService.deleteVector(id);
      setEntries(entries.filter((e) => e.id !== id));
      if (selectedEntryId === id) setSelectedEntryId(null);
      toast.success("Đã thiêu hủy thành công.");
    }
  };

  const handleToggleStatus = async (id: string, enabled: boolean) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    const updatedEntry = { ...entry, isEnabled: enabled };
    await dbService.saveVector(updatedEntry);
    setEntries(entries.map((e) => (e.id === id ? updatedEntry : e)));
    toast.success(`Đã thay đổi trạng thái hoạt động.`);
  };

  const startEdit = (entry: VectorData) => {
    setEditingId(entry.id);
    setEditData({ ...entry });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async (entry: VectorData) => {
    if (!editData.keyword?.trim() || !editData.text?.trim()) return;
    setIsLoading(true);
    try {
      let newEmbedding = entry.embedding;
      if (entry.keyword !== editData.keyword || entry.text !== editData.text) {
        const embeddingStr = `${editData.keyword}: ${editData.text}`;
        const calcEmbedding = await vectorService.getEmbedding(embeddingStr);
        if (calcEmbedding) newEmbedding = calcEmbedding;
      }

      const currentTimestamp = Date.now();
      let newHistory = entry.updateHistory || [];
      if (entry.text !== editData.text) {
        newHistory = [...newHistory, { timestamp: currentTimestamp, content: editData.text || '' }];
      }

      const updatedEntry: VectorData = {
        ...entry,
        ...editData,
        embedding: newEmbedding,
        updateHistory: newHistory,
        timestamp: currentTimestamp,
      };

      await dbService.saveVector(updatedEntry);

      if (onUpdateWorld && worldData?.entities) {
        const entityIndex = worldData.entities.findIndex(e => e.id === entry.id || e.name === entry.keyword || e.name === updatedEntry.keyword);
        if (entityIndex !== -1) {
          const updatedEntities = [...worldData.entities];
          let mergedEntity = {
            ...updatedEntities[entityIndex],
            name: updatedEntry.keyword || updatedEntities[entityIndex].name,
            description: updatedEntry.text || "",
          };
          
          if (updatedEntry.category === "character" && updatedEntry.text?.startsWith("{")) {
            try {
              const parsed = JSON.parse(updatedEntry.text);
              mergedEntity = { ...mergedEntity, ...parsed };
            } catch (err) {}
          }
          
          updatedEntities[entityIndex] = mergedEntity;
          onUpdateWorld({ entities: updatedEntities });
        }
      }

      setEntries((prev) =>
        prev
          .map((e) => (e.id === entry.id ? updatedEntry : e))
          .sort((a, b) => b.timestamp - a.timestamp)
      );
      setEditingId(null);
      toast.success("Cập nhật điển lục thành công!");
    } catch (e: any) {
      console.error("Failed to save edit", e);
      toast.error(`Ghi đè gặp lỗi: ${e.message || e}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddManual = async () => {
    if (!addData.keyword?.trim() || !addData.text?.trim()) {
      toast.warning("Vui lòng nhập cả Tiêu đề và Nội dung điển lục.");
      return;
    }
    setIsLoading(true);
    try {
      const docId = `sb-${campaignId}-manual-${Date.now()}`;
      const embeddingStr = `${addData.keyword}: ${addData.text}`;
      const embedding = await vectorService.getEmbedding(embeddingStr) || [];

      const newEntry: VectorData = {
        ...addData,
        id: docId,
        text: addData.text || '',
        embedding,
        timestamp: Date.now(),
        role: "story_bible",
        saveId: campaignId,
        keyword: addData.keyword || '',
        updateHistory: [
          { timestamp: Date.now(), content: `[Khởi kiến thủ công]:\n${addData.text}` },
        ],
      } as VectorData;

      await dbService.saveVector(newEntry);
      setEntries((prev) => [newEntry, ...prev]);
      setIsAdding(false);
      setSelectedEntryId(newEntry.id);
      setAddData({ 
        category: 'world', 
        triggerMode: 'hybrid', 
        priority: 50, 
        isEnabled: true, 
        position: 'before_char' 
      });
      toast.success("Đã chép thêm một cổ bản thần bối bách khoa!");
    } catch (e: any) {
      console.error(e);
      toast.error(`Thêm dã bối bách khoa thất bại: ${e.message || e}`);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedEntry = entries.find((e) => e.id === selectedEntryId);

  // --- PREMIUM CUSTOM RENDERERS FOR PREVIEW SIGHT ---
  const renderCharacterDataInPreview = (text: string) => {
    try {
      const data = JSON.parse(text) as any;
      return (
        <div style={{ color: s.text }} className="space-y-5 text-left font-sans">
          {/* Core Profile info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div 
              style={{
                backgroundColor: s.convexBg || s.bg,
                borderColor: s.borderMuted,
                color: s.text,
              }}
              className="p-4 border rounded-xl space-y-1 text-xs"
            >
              <span style={{ color: s.accent }} className="text-[10px] uppercase font-black tracking-wider block mb-1">RPG Bio</span>
              <p><strong style={{ color: s.text }} className="font-bold">Giới tính:</strong> {data.gender || "Chưa rõ"}</p>
              <p><strong style={{ color: s.text }} className="font-bold">Tuổi tác:</strong> {data.age || "Chưa rõ"}</p>
              <p><strong style={{ color: s.text }} className="font-bold">Vai trò cốt truyện:</strong> {data.narrativeRole || "NPC"}</p>
              <p><strong style={{ color: s.text }} className="font-bold">Nhân cách cốt tủy:</strong> {data.currentMood || "An định"}</p>
            </div>
            <div 
              style={{
                backgroundColor: s.convexBg || s.bg,
                borderColor: s.borderMuted,
                color: s.text,
              }}
              className="p-4 border rounded-xl space-y-1 text-xs italic"
            >
              <span style={{ color: s.accent }} className="text-[10px] uppercase font-black tracking-wider block mb-1 not-italic">Khảo điệu & Giọng thoại</span>
              <p style={{ color: s.textMuted }} className="leading-relaxed font-serif">"{data.voiceAndTone || "Chưa có khẩu mẫu dữ kiện."}"</p>
            </div>
          </div>

          {/* Detailed Text Block */}
          {data.appearance && (
            <div 
              style={{
                backgroundColor: s.convexBg || s.bg,
                borderColor: s.borderMuted,
              }}
              className="p-4.5 rounded-xl border"
            >
              <h4 style={{ color: s.text, borderBottomColor: s.borderMuted }} className="text-[10px] font-sans font-black uppercase tracking-wider mb-2 border-b pb-1.5 flex items-center gap-1.5">
                ✦ Dáng vẻ hình dung (Appearance)
              </h4>
              <p style={{ color: s.textMuted }} className="text-xs leading-relaxed whitespace-pre-wrap">{data.appearance}</p>
            </div>
          )}

          {data.personality && (
            <div 
              style={{
                backgroundColor: s.convexBg || s.bg,
                borderColor: s.borderMuted,
              }}
              className="p-4.5 rounded-xl border"
            >
              <h4 style={{ color: s.text, borderBottomColor: s.borderMuted }} className="text-[10px] font-sans font-black uppercase tracking-wider mb-2 border-b pb-1.5 flex items-center gap-1.5">
                ✦ Tính mài cốt tâm (Personality)
              </h4>
              <p style={{ color: s.textMuted }} className="text-xs leading-relaxed whitespace-pre-wrap">{data.personality}</p>
              {data.coreValues && (
                <div style={{ borderTopColor: s.borderMuted, color: s.text }} className="mt-2 pt-2 border-t border-dashed text-[11px]">
                  <strong>Cốt lõi tôn chỉ:</strong> {data.coreValues}
                </div>
              )}
            </div>
          )}

          {data.background && (
            <div 
              style={{
                backgroundColor: s.convexBg || s.bg,
                borderColor: s.borderMuted,
              }}
              className="p-4.5 rounded-xl border"
            >
              <h4 style={{ color: s.text, borderBottomColor: s.borderMuted }} className="text-[10px] font-sans font-black uppercase tracking-wider mb-2 border-b pb-1.5 flex items-center gap-1.5">
                ✦ Truyện kỷ dã sử (History & Legend)
              </h4>
              <p style={{ color: s.textMuted }} className="text-xs leading-relaxed whitespace-pre-wrap">{data.background}</p>
            </div>
          )}

          {/* Dialogues */}
          {data.exampleMessages && (
            <div 
              style={{
                backgroundColor: s.card,
                borderColor: s.border,
                color: s.text,
                boxShadow: s.shadowInner,
              }}
              className="p-4.5 rounded-xl border select-none"
            >
              <span style={{ color: s.textMuted }} className="text-[9px] font-serif uppercase tracking-widest font-black block mb-2">Hội thoại mô phỏng mẫu (Dialogue)</span>
              <pre style={{ color: s.textMuted }} className="text-xs font-mono whitespace-pre-wrap leading-relaxed select-all">
                {data.exampleMessages}
              </pre>
            </div>
          )}
        </div>
      );
    } catch {
      return (
        <div style={{ color: s.text }} className="text-xs leading-relaxed opacity-90 markdown-prose text-left">
          <MarkdownRenderer content={text} />
        </div>
      );
    }
  };

  const renderRpgAttrsInPreview = (entry: VectorData) => {
    const attrs = (entry as any).rpg_attrs;
    if (!attrs || Object.keys(attrs).length === 0) return null;

    return (
      <div style={{ borderTopColor: s.borderMuted }} className="mt-6 pt-5 border-t text-left">
        <h4 style={{ color: s.text }} className="text-[10px] font-sans font-black uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Activity size={12} style={{ color: s.accent }} />
          Khảo tả biến lượng chơi (RPG Parameters)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(attrs).map(([key, val]) => {
            if (!val) return null;
            const label = key.toUpperCase().replace(/_/g, " ");
            return (
              <div 
                key={key} 
                style={{
                  backgroundColor: s.convexBg || s.bg,
                  borderColor: s.borderMuted,
                  color: s.text,
                }}
                className="p-3 flex flex-col justify-center border rounded-xl animate-fadeIn"
              >
                <span style={{ color: s.textMuted }} className="block text-[8px] font-black tracking-widest uppercase font-mono mb-1">{label}</span>
                <span style={{ color: s.text }} className="text-xs font-black capitalize">{val as string}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderIntelConnectionsInPreview = (entry: VectorData) => {
    const currentLinks = entry.relatedEntries || [];
    if (currentLinks.length === 0) return null;

    return (
      <div style={{ borderTopColor: s.borderMuted }} className="mt-6 pt-5 border-t text-left">
        <h4 style={{ color: s.text }} className="text-[10px] font-sans font-black uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <ChevronRight size={13} style={{ color: s.accent }} />
          Thần hệ liên can (Cognitive Relations)
        </h4>
        <div className="flex flex-wrap gap-2">
          {currentLinks.map((linkId) => {
            const target = entries.find((e) => e.id === linkId);
            if (!target) return null;
            return (
              <button
                key={linkId}
                onClick={() => setSelectedEntryId(linkId)}
                style={{
                  backgroundColor: s.card,
                  borderColor: s.border,
                  color: s.accent,
                  boxShadow: s.shadowButton,
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono uppercase text-[9px] transition-all cursor-pointer font-bold border"
              >
                {target.keyword || target.title}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Stats calculate
  const totalEntries = entries.length;
  const avgLength = totalEntries > 0
    ? Math.round(entries.reduce((acc, e) => acc + (e.text?.length || 0), 0) / totalEntries)
    : 0;

  return (
    <>
      <button
        id="open-story-bible-sidebar"
        onClick={() => setIsOpen(true)}
        style={{
          background: s.card,
          borderColor: s.border,
          color: s.text,
          boxShadow: s.shadowButton,
        }}
        className="w-full p-3.5 flex items-center justify-between text-left transition-all group rounded-xl border mb-3 cursor-pointer select-none"
      >
        <div style={{ color: s.text }} className="flex items-center gap-2 text-xs font-sans font-black uppercase tracking-wider">
          <Library size={14} style={{ color: s.accent }} />
          Bách khoa dã điển
        </div>
        <div style={{ background: s.accent, color: '#ffffff' }} className="text-[8px] px-2 py-0.5 rounded-lg font-mono font-bold uppercase tracking-wider shadow-sm">
          V-DB CORE v5
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center bg-stone-900/60 backdrop-blur-[3px] p-4"
            style={{ zIndex: 1000 }}
          >
            <motion.div
              initial={{ scale: 0.98, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              style={{ background: s.bg, color: s.text, borderColor: s.borderMuted, boxShadow: s.shadowOuter }}
              className={`flex flex-col overflow-hidden duration-300 relative ${
                isMaximized 
                  ? "fixed inset-0 w-full h-full rounded-none border-0 z-[1001]" 
                  : "w-[96%] max-w-[1440px] h-[94%] md:h-[88%] rounded-3xl border"
              }`}
            >
              <div className="absolute inset-0 bg-repeat bg-center opacity-[0.03] pointer-events-none mix-blend-multiply" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/handmade-paper.png')" }} />

              {/* Master Top Portal Header */}
              <div 
                style={{ background: s.convexBg, borderBottom: s.border }}
                className="px-6 py-4 shrink-0 shadow-sm flex items-center justify-between z-10 relative select-none"
              >
                <div className="flex items-center gap-3">
                  <div style={{ background: s.accent, color: '#ffffff' }} className="p-2 rounded-xl shadow-sm">
                    <BookOpen size={16} />
                  </div>
                  <div className="flex flex-col text-left">
                    <h2 style={{ color: s.text }} className="text-base font-serif tracking-wide uppercase font-black">
                      Bách Khoa Điện Bản
                    </h2>
                    <span style={{ color: s.textMuted }} className="text-[8.5px] font-sans font-black uppercase tracking-widest mt-0.5 animate-pulse">
                      Thư khố dã sử • Campaign ID: {campaignId}
                    </span>
                  </div>
                </div>

                {/* Primary Global Action Controllers */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveMainTab("duyet");
                      setIsAdding(!isAdding);
                    }}
                    style={isAdding ? {
                      backgroundColor: 'rgb(225, 29, 72)',
                      color: '#ffffff',
                    } : {
                      backgroundColor: s.accent,
                      color: '#ffffff',
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-sans font-black uppercase tracking-wider border border-transparent transition-all shadow-sm cursor-pointer"
                  >
                    {isAdding ? <X size={12} /> : <Plus size={12} />}
                    <span>{isAdding ? "Hủy" : "Khai bổ sung"}</span>
                  </button>

                  <div style={{ borderColor: s.borderMuted }} className="h-6 w-px border-r mx-1" />

                  <button
                    onClick={() => setIsMaximized(!isMaximized)}
                    style={{
                      color: s.text,
                      backgroundColor: s.card,
                      borderColor: s.borderMuted,
                      boxShadow: s.shadowButton,
                    }}
                    className="hover:opacity-85 p-2 rounded-xl transition-all border cursor-pointer"
                    title={isMaximized ? "Thu nhỏ" : "Phóng to toàn tập"}
                  >
                    {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                  </button>

                  <button
                    onClick={() => setIsOpen(false)}
                    style={{
                      color: s.text,
                      backgroundColor: s.card,
                      borderColor: s.borderMuted,
                      boxShadow: s.shadowButton,
                    }}
                    className="hover:opacity-85 p-2 rounded-xl transition-all border cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>

              {/* Central Layout Column containing: Category side bars & render workspace */}
              <div className="flex flex-1 flex-col md:flex-row overflow-hidden relative z-10 w-full h-full">
                
                {/* Vintage Left Category Switcher Navigation Menu */}
                <div 
                  style={{ background: s.card, borderRight: s.border }}
                  className="border-b md:border-b-0 shrink-0 flex flex-row md:flex-col gap-1 md:gap-1.5 p-2 w-full md:w-20 lg:w-48 select-none justify-center md:justify-start"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMainTab("duyet");
                      setViewMode("keyword");
                    }}
                    style={activeMainTab === "duyet" ? {
                      backgroundColor: s.accent,
                      color: "#ffffff",
                    } : {
                      color: s.textMuted,
                      borderColor: 'transparent',
                    }}
                    className="flex-1 md:flex-none px-3 py-2.5 rounded-xl transition-all uppercase tracking-wider flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1.5 md:gap-2 whitespace-nowrap text-[10px] md:text-xs font-sans font-black border cursor-pointer"
                  >
                    <BookOpen size={13} />
                    <span className="hidden lg:inline">Tra Cứu</span>
                    <span className="inline lg:hidden text-[9px]">Duyệt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveMainTab("phantich");
                      setActiveAnalyzeSubTab("constellation");
                    }}
                    style={activeMainTab === "phantich" ? {
                      backgroundColor: s.accent,
                      color: "#ffffff",
                    } : {
                      color: s.textMuted,
                      borderColor: 'transparent',
                    }}
                    className="flex-1 md:flex-none px-3 py-2.5 rounded-xl transition-all uppercase tracking-wider flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1.5 md:gap-2 whitespace-nowrap text-[10px] md:text-xs font-sans font-black border cursor-pointer"
                  >
                    <Activity size={13} />
                    <span className="hidden lg:inline">Phân Tích AI</span>
                    <span className="inline lg:hidden text-[9px]">Pháp đồ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveMainTab("quanly")}
                    style={activeMainTab === "quanly" ? {
                      backgroundColor: s.accent,
                      color: "#ffffff",
                    } : {
                      color: s.textMuted,
                      borderColor: 'transparent',
                    }}
                    className="flex-1 md:flex-none px-3 py-2.5 rounded-xl transition-all uppercase tracking-wider flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1.5 md:gap-2 whitespace-nowrap text-[10px] md:text-xs font-sans font-black border cursor-pointer"
                  >
                    <Database size={13} />
                    <span className="hidden lg:inline">Quản Trị</span>
                    <span className="inline lg:hidden text-[9px]">Kho</span>
                  </button>

                  <div style={{ borderColor: s.borderMuted }} className="hidden md:block flex-1 border-t mt-1 select-none" />

                  {/* Brand signature */}
                  <div 
                    style={{ background: s.bg, borderColor: s.borderMuted }}
                    className="hidden lg:flex flex-col gap-1 p-2.5 border rounded-xl mt-auto text-[9.5px] font-mono leading-relaxed select-none text-left"
                  >
                    <span className="text-[#5e412f]/85 font-black uppercase tracking-wider">Mô hình nạp</span>
                    <span>AI hỗ trợ tối ưu bối cảnh truyện tự động thông minh.</span>
                  </div>
                </div>

                {/* Primary workspace layout viewport */}
                <div className="flex-1 min-w-0 flex flex-col overflow-hidden h-full relative">
                  {isLoading && (
                    <div style={{ backgroundColor: `${s.bg}cc` }} className="absolute inset-0 z-50 backdrop-blur-[1px] flex justify-center items-center">
                      <div 
                        style={{
                          backgroundColor: s.card,
                          borderColor: s.border,
                          color: s.text,
                          boxShadow: s.shadowOuter,
                        }}
                        className="border p-5 rounded-2xl shadow-xl flex items-center gap-3"
                      >
                        <RefreshCw
                          size={18}
                          style={{ color: s.accent }}
                          className="animate-spin"
                        />
                        <span style={{ color: s.text }} className="font-sans text-xs font-black tracking-wider uppercase">
                          Đang tra bối cảnh...
                        </span>
                      </div>
                    </div>
                  )}

                  {/* TAB 1: DUYỆT (BROWSE SPLIT VIEW) */}
                  {activeMainTab === 'duyet' && (
                    <div className="flex-1 flex overflow-hidden h-full">
                      {/* Left: list viewport (responsively hidden if an item is active on small screen) */}
                      <div className={`shrink-0 flex-col bg-[#f4ebe1] ${
                        (selectedEntryId || isAdding)
                          ? "hidden md:flex md:w-[35%] lg:w-[33%] xl:w-[30%] h-full"
                          : "flex w-full md:w-[35%] lg:w-[33%] xl:w-[30%] h-full"
                      }`}>
                        <EntryListView
                          entries={entries}
                          selectedId={selectedEntryId}
                          onSelect={(id) => {
                            setSelectedEntryId(id);
                            setEditingId(null);
                            setIsAdding(false);
                          }}
                          onAdd={() => {
                            setIsAdding(true);
                            setSelectedEntryId(null);
                          }}
                          searchTerm={searchTerm}
                          onSearchChange={setSearchTerm}
                          viewMode={viewMode}
                          onViewModeChange={setViewMode}
                          onSemanticSearch={handleSemanticSearch}
                          isSearchingSemantic={isSearchingSemantic}
                          activeCategoryFilter={activeCategoryFilter}
                          onCategoryFilterChange={setActiveCategoryFilter}
                          filteredEntries={filteredEntries}
                          CATEGORY_MAP={CATEGORY_MAP}
                        />
                      </div>

                      {/* Right: details, editor, or classic empty cover */}
                      <div 
                        style={{ background: s.bg, color: s.text }}
                        className={`flex-1 min-w-0 relative flex flex-col overflow-hidden h-full ${
                          !(selectedEntryId || isAdding) ? "hidden md:flex" : "flex"
                        }`}
                      >
                        {isAdding ? (
                          <div className="flex-1 overflow-hidden h-full">
                            <EntryEditor
                              formData={addData}
                              onChange={(field, value) => setAddData(prev => ({...prev, [field]: value}))}
                              onSave={handleAddManual}
                              onCancel={() => setIsAdding(false)}
                              isSaving={isLoading}
                              isEditing={false}
                              entries={entries}
                            />
                          </div>
                        ) : selectedEntry && editingId === selectedEntry.id ? (
                          <div className="flex-1 overflow-hidden h-full">
                            <EntryEditor
                              formData={editData}
                              onChange={(field, value) => setEditData(prev => ({...prev, [field]: value}))}
                              onSave={() => saveEdit(selectedEntry)}
                              onCancel={cancelEdit}
                              isSaving={isLoading}
                              isEditing={true}
                              entries={entries}
                            />
                          </div>
                        ) : selectedEntry ? (
                          <div style={{ background: s.bg, color: s.text }} className="flex flex-col h-full font-sans relative">
                            {/* Preview detail Header */}
                            <div 
                              style={{ background: s.convexBg, borderBottom: s.border }}
                              className="px-6 py-4 shrink-0 flex items-start justify-between gap-4 relative"
                            >
                              <div className="flex-1 flex flex-col gap-1.5 text-left select-none">
                                <div className="flex items-center gap-1.5 md:hidden mb-1">
                                  <button 
                                    onClick={() => setSelectedEntryId(null)} 
                                    style={{
                                      backgroundColor: s.card,
                                      borderColor: s.border,
                                      color: s.text,
                                      boxShadow: s.shadowButton,
                                    }}
                                    className="flex items-center gap-1 text-[10px] font-sans font-extrabold px-3 py-1.5 border rounded-lg"
                                  >
                                    ← Thư mục
                                  </button>
                                </div>

                                <h2 style={{ color: s.text }} className="text-xl lg:text-2xl font-serif tracking-wide uppercase font-black flex items-center gap-2">
                                  <BookOpen size={16} style={{ color: s.accent }} />
                                  {selectedEntry.keyword || "Không tên cổ thư"}
                                </h2>

                                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                  {selectedEntry.category && CATEGORY_MAP[selectedEntry.category] && (
                                    <div 
                                      style={{
                                        backgroundColor: s.card,
                                        borderColor: s.border,
                                        color: s.text,
                                        boxShadow: s.shadowButton,
                                      }}
                                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-sans font-extrabold uppercase border"
                                    >
                                      {React.createElement(CATEGORY_MAP[selectedEntry.category].icon, { size: 10, style: { color: s.accent } })}
                                      {CATEGORY_MAP[selectedEntry.category].label}
                                    </div>
                                  )}
                                  {selectedEntry.triggerMode && (
                                    <div 
                                      style={{
                                        backgroundColor: s.card,
                                        borderColor: s.border,
                                        color: s.text,
                                        boxShadow: s.shadowButton,
                                      }}
                                      className="px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold uppercase border"
                                    >
                                      Cảm ứng: {selectedEntry.triggerMode}
                                    </div>
                                  )}
                                  {selectedEntry.keywords && selectedEntry.keywords.length > 0 && (
                                    <div className="flex gap-1.5 flex-wrap">
                                      {selectedEntry.keywords.map((kw, idx) => (
                                        <span 
                                          key={idx} 
                                          style={{
                                            backgroundColor: s.badgeBg || s.card,
                                            borderColor: s.borderMuted,
                                            color: s.accent,
                                          }}
                                          className="px-2.5 py-1 text-[9px] font-mono font-bold border rounded-lg"
                                        >
                                          #{kw}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Actions on this entry card */}
                              <div 
                                style={{
                                  backgroundColor: s.card,
                                  borderColor: s.border,
                                  boxShadow: s.shadowButton,
                                }}
                                className="flex items-center gap-1.5 border p-1 rounded-xl shadow-sm"
                              >
                                <button
                                  type="button"
                                  onClick={() => startEdit(selectedEntry)}
                                  style={{ color: s.textMuted }}
                                  className="p-2 hover:opacity-85 rounded-lg transition-all cursor-pointer"
                                  title="Chỉnh sửa bổ bọc"
                                >
                                  <Edit3 size={15} />
                                </button>
                                <div style={{ backgroundColor: s.borderMuted }} className="w-px h-5 mx-0.5" />
                                <button
                                  type="button"
                                  onClick={() => handleDelete(selectedEntry.id)}
                                  className="p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                  title="Gỡ bỏ vĩnh viễn"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>

                            {/* Detailed description panel view */}
                            <div style={{ background: s.bg, color: s.text }} className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                              <div className="max-w-4xl space-y-5 text-left">
                                <div 
                                  style={{
                                    backgroundColor: s.card,
                                    borderColor: s.border,
                                    color: s.text,
                                    boxShadow: s.shadowButton,
                                  }}
                                  className="p-6 rounded-2xl border relative text-left"
                                >
                                  {selectedEntry.category === "character" ? (
                                    renderCharacterDataInPreview(selectedEntry.text)
                                  ) : (
                                    <div style={{ color: s.text }} className="text-xs sm:text-sm leading-relaxed opacity-90 markdown-prose text-left">
                                      <MarkdownRenderer content={selectedEntry.text} />
                                    </div>
                                  )}
                                </div>

                                {renderRpgAttrsInPreview(selectedEntry)}
                                {renderIntelConnectionsInPreview(selectedEntry)}

                                {/* Revision logs list */}
                                {selectedEntry.updateHistory && selectedEntry.updateHistory.length > 0 && (
                                  <div style={{ borderTopColor: s.borderMuted }} className="mt-6 pt-5 border-t">
                                    <span style={{ color: s.text }} className="text-[10px] font-sans font-black uppercase tracking-wider mb-2.5 block">Lịch sử tu thư</span>
                                    <div className="space-y-3">
                                      {selectedEntry.updateHistory.slice().reverse().slice(0, 3).map((hist, idx) => (
                                        <div key={idx} style={{ borderColor: s.accent }} className="text-[10px] border-l-2 pl-3 leading-relaxed">
                                          <span style={{ color: s.text }} className="font-extrabold">
                                            [{new Date(hist.timestamp).toLocaleString("vi-VN")}]
                                          </span>
                                          <p style={{ color: s.textMuted }} className="mt-1 font-medium">{hist.content}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Timeless Empty State Book Cover Layout directly matching screenshot intent */
                          <div style={{ background: s.bg, color: s.text }} className="flex-1 flex flex-col justify-center items-center p-8 relative select-none">
                            <div 
                              style={{
                                background: s.card,
                                borderColor: s.border,
                                color: s.text,
                                boxShadow: s.shadowOuter,
                              }}
                              className="max-w-md w-full border border-2 p-8 rounded-3xl text-center relative overflow-hidden flex flex-col justify-between h-[500px]"
                            >
                              {/* Classic frames ornament decoration */}
                              <div style={{ borderColor: s.borderMuted }} className="absolute top-3 left-3 w-4 h-4 border-t border-l rounded-tl opacity-70" />
                              <div style={{ borderColor: s.borderMuted }} className="absolute top-3 right-3 w-4 h-4 border-t border-r rounded-tr opacity-70" />
                              <div style={{ borderColor: s.borderMuted }} className="absolute bottom-3 left-3 w-4 h-4 border-b border-l rounded-bl opacity-70" />
                              <div style={{ borderColor: s.borderMuted }} className="absolute bottom-3 right-3 w-4 h-4 border-b border-r rounded-br opacity-70" />

                              <div className="space-y-4 my-auto">
                                <span style={{ color: s.textMuted }} className="text-[9px] font-mono tracking-widest uppercase font-black opacity-80">Lịch sử thiết bản • Scribe Core</span>
                                <h1 style={{ color: s.text }} className="text-3xl font-serif font-black tracking-wide uppercase">Bách Khoa Điển Quy</h1>
                                
                                <div style={{ backgroundColor: s.borderMuted }} className="w-16 h-[1.5px] mx-auto opacity-70" />

                                <p style={{ color: s.textMuted }} className="text-xs font-serif italic leading-relaxed">
                                  "Linh hoa dệt sử, cổ pháp ghi lòng. Mỗi người, mỗi bảo khí trong thư khố này đều là các sợi chỉ bối cảnh giữ cột thời gian."
                                </p>
                              </div>

                              {/* Grid metrics in warm beige box slots */}
                              <div style={{ borderColor: s.borderMuted }} className="grid grid-cols-2 gap-3.5 border-t border-b py-5 my-auto">
                                <div className="text-center font-sans space-y-1">
                                  <span style={{ color: s.textMuted }} className="block text-[8px] tracking-wider uppercase font-black">Tổng số hồ sơ</span>
                                  <span style={{ color: s.text }} className="text-lg font-black tracking-wide">{totalEntries} Điển lục</span>
                                </div>
                                <div className="text-center font-sans space-y-1">
                                  <span style={{ color: s.textMuted }} className="block text-[8px] tracking-wider uppercase font-black">Trung bình ký văn</span>
                                  <span style={{ color: s.text }} className="text-lg font-black tracking-wide">{avgLength} ký tự</span>
                                </div>
                              </div>

                              <div className="space-y-3 my-auto">
                                <button
                                  type="button"
                                  onClick={() => setIsAdding(true)}
                                  style={{
                                    backgroundColor: s.accent,
                                    color: '#ffffff',
                                  }}
                                  className="px-5 py-2.5 hover:opacity-90 font-sans font-black text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all cursor-pointer"
                                >
                                  Khởi Tạo Điển Lục Mới
                                </button>
                                <span style={{ color: s.textMuted }} className="block text-[9px] font-semibold opacity-75">Chọn một hạng mục từ cột bên trái để bắt đầu tra khảo</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: PHÂN TÍCH AI (ANALYSIS TERMINALS) */}
                  {activeMainTab === 'phantich' && (
                    <div style={{ background: s.bg, color: s.text }} className="flex-1 flex flex-col overflow-hidden h-full">
                      {/* Sub analysis switcher tabs bar */}
                      <div 
                        style={{ background: s.convexBg, borderBottom: s.border }}
                        className="flex p-2 gap-1.5 overflow-x-auto shrink-0 select-none animate-fadeIn"
                      >
                        {[
                          { id: 'constellation', label: 'Bản Đồ Chòm Sao AI', icon: Globe },
                          { id: 'triggers', label: 'Hạt Kích Hoạt (Regex)', icon: Filter },
                          { id: 'budget', label: 'Ngân Sách Tokens', icon: Star },
                          { id: 'scribe_recalls', label: 'Scribe & Truy Thu', icon: Activity }
                        ].map((subTab) => (
                          <button
                            key={subTab.id}
                            type="button"
                            onClick={() => setActiveAnalyzeSubTab(subTab.id as any)}
                            style={activeAnalyzeSubTab === subTab.id ? {
                              backgroundColor: s.accent,
                              color: '#ffffff',
                              borderColor: 'transparent',
                            } : {
                              color: s.textMuted,
                              borderColor: 'transparent',
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-sans font-black uppercase tracking-wider border whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            {React.createElement(subTab.icon, { size: 12 })}
                            {subTab.label}
                          </button>
                        ))}
                      </div>

                      {/* Workspace analyzer viewer */}
                      <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                        <div className="max-w-6xl mx-auto space-y-6">
                          
                          {activeAnalyzeSubTab === 'constellation' && (
                            <div className="space-y-4 animate-fadeIn text-left">
                              <div className="font-sans">
                                <h3 style={{ color: s.text }} className="text-base font-serif font-black uppercase tracking-wide">
                                  Bản Đồ Quỹ Đạo Bối Cảnh (Orbits & GraphRAG Visualization)
                                </h3>
                                <p style={{ color: s.textMuted }} className="text-xs mt-1 leading-normal font-medium">
                                  Nhận diện trực quan cấu đồ liên kết hạt ý niệm bối bách khoa toàn thư. Hover các mốc hạt để ghim thông tin tóm lược từ dã thế.
                                </p>
                              </div>
                              <div 
                                style={{
                                  backgroundColor: s.card,
                                  borderColor: s.border,
                                  color: s.text,
                                  boxShadow: s.shadowButton,
                                }} 
                                className="p-5 rounded-3xl border overflow-hidden h-[450px]"
                              >
                                <EncyclopediaDashboard
                                  entries={entries}
                                  onSelect={(id) => {
                                    setSelectedEntryId(id);
                                    setActiveMainTab("duyet");
                                  }}
                                  onAddManualWithTemplate={(template) => {
                                    setAddData({
                                      category: "world",
                                      triggerMode: "hybrid",
                                      priority: 50,
                                      isEnabled: true,
                                      position: "before_char",
                                      ...template,
                                    });
                                    setIsAdding(true);
                                    setActiveMainTab("duyet");
                                  }}
                                  CATEGORY_MAP={CATEGORY_MAP}
                                  onCategoryFilterChange={() => {}}
                                  campaignId={campaignId}
                                  onDelete={handleDelete}
                                  onToggleStatus={handleToggleStatus}
                                />
                              </div>
                            </div>
                          )}

                          {activeAnalyzeSubTab === 'triggers' && (
                            <div className="space-y-4 animate-fadeIn text-left font-sans">
                              <div>
                                <h3 style={{ color: s.text }} className="text-base font-serif font-black uppercase tracking-wide flex items-center gap-2">
                                  Điều hợp quy cách dã sử (Insert Sensors Debugger)
                                </h3>
                                <p style={{ color: s.textMuted }} className="text-xs mt-1 leading-normal">
                                  Cảm biến Scribe lắng nghe văn cảnh để khớpRegex tự động kéo nạp dã sử bách khoa.
                                </p>
                              </div>
                              <div 
                                style={{
                                  backgroundColor: s.card,
                                  borderColor: s.border,
                                  color: s.text,
                                  boxShadow: s.shadowButton,
                                }}
                                className="p-6 rounded-2xl border"
                              >
                                <TriggerDebugger entries={entries} />
                              </div>
                            </div>
                          )}

                          {activeAnalyzeSubTab === 'budget' && (
                            <div className="space-y-4 animate-fadeIn text-left font-sans">
                              <div>
                                <h3 style={{ color: s.text }} className="text-base font-serif font-black uppercase tracking-wide">
                                  Ước lượng Hạn mức nạp (Token Space Limit Allocation)
                                </h3>
                                <p style={{ color: s.textMuted }} className="text-xs mt-1 leading-normal">
                                  Quản lý khoảng cách dã bản kỷ và phân chia bối cảnh chèn vào bộ nhớ AI.
                                </p>
                              </div>
                              <div 
                                style={{
                                  backgroundColor: s.card,
                                  borderColor: s.border,
                                  color: s.text,
                                  boxShadow: s.shadowButton,
                                }}
                                className="p-6 rounded-2xl border col-span-full"
                              >
                                <TokenBudgetMonitor entries={entries} />
                              </div>
                            </div>
                          )}

                          {activeAnalyzeSubTab === 'scribe_recalls' && (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch font-sans">
                              <div 
                                style={{
                                  backgroundColor: s.card,
                                  borderColor: s.border,
                                  color: s.text,
                                  boxShadow: s.shadowButton,
                                }}
                                className="p-5 rounded-2xl border flex flex-col h-[520px] text-left"
                              >
                                <span style={{ color: s.text }} className="text-xs font-serif font-black uppercase mb-3 block">📜 Monitor hành trình Scribe (Scribe Live Logs)</span>
                                <div className="flex-1 overflow-hidden">
                                  <ScribeMonitor entries={entries} />
                                </div>
                              </div>

                              <div 
                                style={{
                                  backgroundColor: s.card,
                                  borderColor: s.border,
                                  color: s.text,
                                  boxShadow: s.shadowButton,
                                }}
                                className="p-5 rounded-2xl border flex flex-col h-[520px] text-left"
                              >
                                <span style={{ color: s.text }} className="text-xs font-serif font-black uppercase mb-3 block">🛰️ Phòng thí nghiệm Vector (Similarity Recalls Check)</span>
                                <div className="flex-1 overflow-hidden">
                                  <MetadataRetrievalDebugger entries={entries} />
                                </div>
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: QUẢN TRỊ (MANAGEMENT OPERATIONS) */}
                  {activeMainTab === 'quanly' && (
                    <div style={{ background: s.bg, color: s.text }} className="flex-1 overflow-y-auto p-6 md:p-8 font-sans">
                      <div className="max-w-4xl mx-auto space-y-6 text-left animate-fadeIn">
                        
                        <div>
                          <h3 style={{ color: s.text }} className="text-base font-serif font-black uppercase tracking-wide">
                            Phòng quản trị Bách khoa toàn thư
                          </h3>
                          <p style={{ color: s.textMuted }} className="text-xs mt-1">
                            Bảo dưỡng, sao lưu, nạp dữ liệu thủ công dã bản kỷ hoặc reset toàn bộ hệ thống nhớ.
                          </p>
                        </div>

                        {/* Management operations grid of cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 py-2">
                          {/* Export */}
                          <div 
                            style={{
                              backgroundColor: s.card,
                              borderColor: s.border,
                              color: s.text,
                              boxShadow: s.shadowButton,
                            }}
                            className="p-5 rounded-2xl border flex flex-col justify-between space-y-4"
                          >
                            <div className="space-y-1.5">
                              <span style={{ color: s.text }} className="text-xs font-black uppercase block">Dã Sử Xuất Khẩu (Backup Copy)</span>
                              <p style={{ color: s.textMuted }} className="text-[11px] leading-relaxed">
                                Đóng cuốn bách khoa thư hiện tại xuất ra cấu trúc tệp JSON để cất giữ phòng ngừa rò rỉ hoặc sao lưu.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={handleExport}
                              style={{
                                backgroundColor: s.bg,
                                borderColor: s.border,
                                color: s.text,
                              }}
                              className="px-4 py-2.5 font-sans font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 w-full self-start"
                            >
                              <Download size={13} style={{ color: s.accent }} /> Sao lưu Bách Khoa
                            </button>
                          </div>

                          {/* Import */}
                          <div 
                            style={{
                              backgroundColor: s.card,
                              borderColor: s.border,
                              color: s.text,
                              boxShadow: s.shadowButton,
                            }}
                            className="p-5 rounded-2xl border flex flex-col justify-between space-y-4"
                          >
                            <div className="space-y-1.5">
                              <span style={{ color: s.text }} className="text-xs font-black uppercase block">Nhập Khẩu Tàng Thư (Load Storage)</span>
                              <p style={{ color: s.textMuted }} className="text-[11px] leading-relaxed">
                                Chọn một tập tin sao lưu JSON bách khoa từ thiết bị nội địa để tích hợp hoặc khôi phục nhanh.
                              </p>
                            </div>
                            <div className="relative w-full">
                              <input
                                type="file"
                                accept=".json"
                                onChange={handleImport}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full z-10"
                              />
                              <button
                                type="button"
                                style={{
                                  backgroundColor: s.bg,
                                  borderColor: s.border,
                                  color: s.text,
                                }}
                                className="px-4 py-2.5 font-sans font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 w-full cursor-pointer"
                              >
                                <Upload size={13} style={{ color: s.accent }} /> Nạp Tàng Thư
                              </button>
                            </div>
                          </div>

                          {/* Maintenance tools */}
                          <div 
                            style={{
                              backgroundColor: s.card,
                              borderColor: s.border,
                              color: s.text,
                              boxShadow: s.shadowButton,
                            }}
                            className="p-5 rounded-2xl border flex flex-col justify-between space-y-4"
                          >
                            <div className="space-y-1.5">
                              <span style={{ color: s.text }} className="text-xs font-black uppercase block">Định kỳ Kiểm tu (Synchronous Health)</span>
                              <p style={{ color: s.textMuted }} className="text-[11px] leading-relaxed">
                                Đồng bộ lại các mốc bách khoa, dệt lại index khoảng phủ vector đảm bảo AI hiểu sâu sắc và nhất quán không lệch sụp đổ.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                loadEntries();
                                toast.success("Đồng bộ tối ưu hóa cấu phủ vector bách khoa hoàn hảo!");
                              }}
                              style={{
                                backgroundColor: s.bg,
                                borderColor: s.border,
                                color: s.text,
                              }}
                              className="px-4 py-2.5 font-sans font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                              <RefreshCw size={13} style={{ color: s.accent }} /> Kiểm tu toàn kho
                            </button>
                          </div>

                          {/* Wipe Out */}
                          <div 
                            style={{
                              backgroundColor: s.theme === 'dark' || s.theme === 'cosmic' ? 'rgba(244, 63, 94, 0.08)' : '#fef2f2',
                              borderColor: s.theme === 'dark' || s.theme === 'cosmic' ? 'rgba(244, 63, 94, 0.4)' : '#fecaca',
                              color: s.theme === 'dark' || s.theme === 'cosmic' ? '#fda4af' : '#991b1b',
                            }}
                            className="border p-5 rounded-2xl shadow-sm flex flex-col justify-between space-y-4 col-span-1"
                          >
                            <div className="space-y-1.5">
                              <span className="text-xs font-black uppercase block">Hỏa táng tàng thư (Database Reset)</span>
                              <p className="text-[11px] leading-relaxed opacity-90">
                                Xóa sạch hoàn toàn mọi tàng thư điển tích, đưa khu nhớ về rỗng không. Hành động này không thể vãn hồi.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={handleDeleteAll}
                              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white border-transparent text-xs font-sans font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Trash2 size={13} /> Hỏa táng toàn thư
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
  .markdown-prose p { margin-bottom: 0.85em; }
  .markdown-prose p:last-child { margin-bottom: 0; }
  .markdown-prose blockquote { border-left: 3px solid #5e412f; padding-left: 1em; font-style: italic; opacity: 0.85; }
  .markdown-prose ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 0.85em; }
  .markdown-prose ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 0.85em; }
  .markdown-prose li { margin-bottom: 0.25em; }
  .markdown-prose h1, .markdown-prose h2, .markdown-prose h3 { font-family: serif; font-weight: 900; margin-top: 1.4em; margin-bottom: 0.45em; color: #5e412f; letter-spacing: -0.02em; }
  .markdown-prose strong { font-weight: 900; color: #3d2f24; }
  .markdown-prose em { font-style: italic; opacity: 0.95; }
`}</style>
    </>
  );
};

export default StoryBibleSidebar;
