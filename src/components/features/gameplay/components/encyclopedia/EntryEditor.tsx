import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { VectorData } from "../../../../../services/db/indexedDB";
import { CharacterSheetEditor } from "../../../world-creation/CharacterSheetEditor";
import { CharacterSheet } from "../../../../../types";
import {
  Sparkles,
  Shrink,
  Maximize2,
  FileCode,
  Tags,
  Link as LinkIcon,
  Plus,
  X,
  User,
  Activity,
  Check,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Filter,
  Sliders,
  Settings,
  Cpu,
  Bookmark,
  Award,
  Pin,
  Eye,
  Globe,
  Compass,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { worldAiService } from "../../../../../services/ai/world-creation/service";
import { useAppStore } from "../../../../../store/appStore";
import { useNeumorphicTheme } from "../../../../../hooks/useNeumorphicTheme";

export interface EntryEditorProps {
  formData: Partial<VectorData>;
  onChange: (field: keyof VectorData, value: any) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  isEditing: boolean;
  entries: VectorData[]; // Existing entries list for links
}

export const EntryEditor: React.FC<EntryEditorProps> = ({
  formData,
  onChange,
  onSave,
  onCancel,
  isSaving,
  isEditing,
  entries = [],
}) => {
  const s = useNeumorphicTheme();
  const [keywordsText, setKeywordsText] = useState("");
  const [newKeywordInput, setNewKeywordInput] = useState("");
  const [isGeneratingTarget, setIsGeneratingTarget] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiIdeaPrompt, setAiIdeaPrompt] = useState("");
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);
  const [showRpgAttrs, setShowRpgAttrs] = useState(true);
  const [showLinksArea, setShowLinksArea] = useState(true);
  const [relatedSearchTerm, setRelatedSearchTerm] = useState("");
  
  // Tab states
  const [activeTab, setActiveTab] = useState<'content' | 'trigger' | 'stats_network'>('content');

  // Wizard states (for adding new entries)
  const [wizardStep, setWizardStep] = useState(1);

  const { settings } = useAppStore();
  const currentModel = settings?.aiModel || "gemini-3.1-pro-preview";

  // Keyboard Shortcuts Listener for editor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        onSave();
      }
      // Escape to cancel edit
      if (e.key === "Escape" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSave, onCancel]);

  // Sync formData.keywords to local tag systems
  useEffect(() => {
    setKeywordsText(formData.keywords?.join(", ") || "");
    setSuggestedKeywords([]);
  }, [formData.keywords, formData.id]);

  const handleKeywordsChange = (val: string) => {
    setKeywordsText(val);
    const parsed = val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    onChange("keywords", parsed);
  };

  const handleAddKeywordBadge = (word: string) => {
    const trimmed = word.trim();
    if (!trimmed) return;
    const currentList = formData.keywords || [];
    if (currentList.some((w) => w.toLowerCase() === trimmed.toLowerCase())) return;

    const newList = [...currentList, trimmed];
    onChange("keywords", newList);
    setKeywordsText(newList.join(", "));
  };

  const handleRemoveKeywordBadge = (idxToRemove: number) => {
    const currentList = formData.keywords || [];
    const newList = currentList.filter((_, idx) => idx !== idxToRemove);
    onChange("keywords", newList);
    setKeywordsText(newList.join(", "));
  };

  const handleAddKeywordFromInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (newKeywordInput.trim()) {
      handleAddKeywordBadge(newKeywordInput.trim());
      setNewKeywordInput("");
    }
  };

  // Character Sheet JSON parse
  const characterData = useMemo(() => {
    if (formData.category !== "character") return null;
    try {
      return JSON.parse(formData.text || "{}") as Partial<CharacterSheet>;
    } catch {
      return { narrativeRole: formData.text } as Partial<CharacterSheet>;
    }
  }, [formData.text, formData.category]);

  const handleCharacterSheetChange = (
    field: keyof CharacterSheet,
    value: string
  ) => {
    const newData = { ...characterData, [field]: value };
    onChange("text", JSON.stringify(newData, null, 2));
  };

  const handleAiGenKnowledge = async () => {
    if (!characterData?.knowledge_train?.trim()) {
      toast.warning("Vui lòng nhập dữ liệu gốc (Knowledge Base) trước.");
      return;
    }

    setIsGeneratingTarget(true);
    try {
      const generatedSheet =
        await worldAiService.generateCharacterSheetFromKnowledge(
          characterData.knowledge_train,
          currentModel
        );

      if (generatedSheet) {
        onChange("text", JSON.stringify(generatedSheet, null, 2));
        toast.success("Đã sinh nhân vật thành công!");
      } else {
        toast.error("Không thể sinh nhân vật tự động.");
      }
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message || err}`);
    } finally {
      setIsGeneratingTarget(false);
    }
  };

  const handleAiDraftFromIdea = async () => {
    if (!formData.keyword?.trim()) {
      toast.warning("Vui lòng nhập từ khóa nhận diện trước dã sử.");
      return;
    }
    setIsAiProcessing(true);
    try {
      const prompt = `Cổ thư: "${formData.keyword}". Ý niệm: "${aiIdeaPrompt}". Vui lòng viết một đoạn dã sử chi tiết, trau chuốt, huyền bí theo văn phong lịch sử cổ xưa chứa đựng các truyền kỳ liên can. Viết khoảng 100-250 từ dạng Markdown hoàn hảo.`;
      const draft = await worldAiService.generateLoreDraft(prompt, currentModel);
      if (draft) {
        onChange("text", draft);
        setAiIdeaPrompt("");
        toast.success("Cổ thư đã được dệt thành công!");
      }
    } catch (err: any) {
      toast.error(`Ai dệt thất bại: ${err.message}`);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleAiRefinement = async (mode: 'condense' | 'expand' | 'format') => {
    if (!formData.text?.trim()) {
      toast.warning("Chưa có chính văn bối cảnh để gọt sấy.");
      return;
    }
    setIsAiProcessing(true);
    try {
      let instruct = "";
      if (mode === "condense") instruct = "Cô đọng và tóm tắt cực ngắn gọn nhưng súc tích nguyên văn sau, giữ lại mọi chi tiết bối cảnh cốt lõi:";
      else if (mode === "expand") instruct = "Làm phong phú, trau chuốt sâu sắc và dệt thêm các điển cố thần diệu cho chính văn cổ sử sau đây:";
      else instruct = "Hãy định dạng lại văn bản sau theo chuẩn Markdown trang nghiêm với các thẻ in đậm, khung trích dẫn cổ xưa thích hợp:";

      const res = await worldAiService.generateLoreDraft(`${instruct}\n\n"${formData.text}"`, currentModel);
      if (res) {
        onChange("text", res);
        toast.success("Đã mài dũa cổ thư bằng AI!");
      }
    } catch (err: any) {
      toast.error(`Gọt sấy lỗi: ${err.message}`);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleAiExtractKeywords = async () => {
    if (!formData.text?.trim()) {
      toast.warning("Hãy biên chép bối cảnh chính văn trước để bóc tách mật tự.");
      return;
    }
    setIsAiProcessing(true);
    try {
      const prompt = `Trích xuất từ 3 đến 6 từ khóa quan trọng nhất (viết dưới dạng từ đơn hoặc cụm từ ngắn không dấu hashtag) đại diện cho các địa điểm, thánh tích, nhân vật hoặc bảo vật trong đoạn văn sau. Trả về dạng JSON mảng chuỗi đơn giản: [\"Keyword1\", \"Keyword2\"]. Đoạn văn: \n\n"${formData.text}"`;
      const draft = await worldAiService.generateLoreDraft(prompt, currentModel);
      // parse keys
      const match = draft.match(/\[.*\]/s);
      if (match) {
        const words = JSON.parse(match[0]) as string[];
        setSuggestedKeywords(words);
        toast.success("Đã tìm ra các hạt cảm cảm cảm cảm nhận!");
      } else {
        toast.warning("AI không thể định dạng danh sách từ khóa hợp lệ.");
      }
    } catch (err: any) {
      toast.error(`Bóc tách lỗi: ${err.message}`);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleToggleLink = (entryId: string) => {
    const current = formData.relatedEntries || [];
    let updated;
    if (current.includes(entryId)) {
      updated = current.filter(id => id !== entryId);
    } else {
      updated = [...current, entryId];
    }
    onChange("relatedEntries", updated);
  };

  const filteredRelationEntries = useMemo(() => {
    return entries.filter(e => {
      if (e.id === formData.id) return false;
      if (!relatedSearchTerm.trim()) return true;
      return (e.keyword || '').toLowerCase().includes(relatedSearchTerm.toLowerCase());
    });
  }, [entries, formData.id, relatedSearchTerm]);

  return (
    <div 
      id="entry-editor-root" 
      style={{ background: s.bg, color: s.text }}
      className="flex flex-col h-full font-sans rounded-r-2xl overflow-hidden relative transition-all duration-300"
    >
      <div className="absolute inset-0 bg-repeat bg-center opacity-[0.03] pointer-events-none mix-blend-multiply" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/handmade-paper.png')" }} />
      
      {/* Editor top taskbar panel styled in soft cream capsules */}
      <div 
        style={{ background: s.convexBg, borderBottom: s.border }}
        className="px-6 py-4 flex items-center justify-between shrink-0 z-10 relative select-none"
      >
        <div className="flex items-center gap-2">
          <div style={{ background: s.accent, color: '#ffffff' }} className="p-1.5 rounded-lg shadow-sm">
            <BookOpen size={14} />
          </div>
          <h3 style={{ color: s.text }} className="font-serif text-sm font-black uppercase tracking-wider">
            {isEditing ? "Hiệu đính cổ thư" : "Kiến thiết mới bách khoa"}
          </h3>
        </div>

        {/* Dynamic Inner Tab Slider */}
        <div 
          style={{ background: s.card, borderColor: s.borderMuted, boxShadow: s.shadowInner }}
          className="flex border p-0.5 rounded-xl shadow-[inset_1px_1px_3px_rgba(94,80,63,0.08)]"
        >
          <button
            type="button"
            onClick={() => setActiveTab('content')}
            style={activeTab === 'content' ? {
              background: s.accent,
              color: '#ffffff',
            } : {
              color: s.textMuted,
            }}
            className="px-3 py-1.5 text-[9px] font-sans font-black uppercase rounded-lg transition-all cursor-pointer"
          >
            Chính văn
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('trigger')}
            style={activeTab === 'trigger' ? {
              background: s.accent,
              color: '#ffffff',
            } : {
              color: s.textMuted,
            }}
            className="px-3 py-1.5 text-[9px] font-sans font-black uppercase rounded-lg transition-all cursor-pointer"
          >
            Cảm ứng (Phép)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stats_network')}
            style={activeTab === 'stats_network' ? {
              background: s.accent,
              color: '#ffffff',
            } : {
              color: s.textMuted,
            }}
            className="px-3 py-1.5 text-[9px] font-sans font-black uppercase rounded-lg transition-all cursor-pointer"
          >
            Khảo tả & Liên can
          </button>
        </div>
      </div>

      {/* Editor Body Area */}
      <div className="flex-1 overflow-y-auto p-6 z-10 relative space-y-6" style={{ scrollbarWidth: 'thin' }}>
        
        {/* TAB 1: STORY CONTENT WRITING FRAME */}
        {activeTab === 'content' && (
          <div className="space-y-6 animate-fadeIn text-left">
            
            {/* Split row: Title and Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 select-none">
              <div className="space-y-1.5">
                <label style={{ color: s.text }} className="text-[10px] font-bold uppercase tracking-wider block font-sans">
                  Tựa đề / Danh mục nhận diện
                </label>
                <div style={{ background: s.card, border: s.border, boxShadow: s.shadowInner }} className="rounded-xl p-2 flex items-center">
                  <input
                    type="text"
                    value={formData.keyword || ""}
                    onChange={(e) => onChange("keyword", e.target.value)}
                    placeholder="Mũi tên ma thuật, Điện kính, Kaelen..."
                    style={{ color: s.text }}
                    className="w-full bg-transparent outline-none border-none text-xs font-serif font-black placeholder-neutral-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label style={{ color: s.text }} className="text-[10px] font-bold uppercase tracking-wider block font-sans">
                  Thể loại điển thế bối cảnh
                </label>
                <div style={{ background: s.card, border: s.border, boxShadow: s.shadowButton }} className="rounded-xl p-1 flex items-center">
                  <select
                    value={formData.category || "world"}
                    onChange={(e) => onChange("category", e.target.value)}
                    style={{ color: s.text, background: s.card }}
                    className="w-full bg-transparent outline-none border-none text-xs font-sans font-extrabold cursor-pointer p-1"
                  >
                    <option value="character">Mẫu Nhân vật dã thế (Character NPC)</option>
                    <option value="location">Cột mốc Địa danh (Location)</option>
                    <option value="faction">Bản đồ Thế lực (Faction)</option>
                    <option value="item">Cổ vật linh khí (Item & Artifact)</option>
                    <option value="relationship">Liên kết Mối quan hệ (Relationship)</option>
                    <option value="event">Lịch sử sự kiện (Event Legend)</option>
                    <option value="law">Quy tắc thế giới (World Law)</option>
                    <option value="world">Lore chung (General Lore)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* AI Scribe Assistive Panel - Overhauled Cream layout */}
            {formData.category !== "character" && (
              <div style={{ background: s.card, border: s.border, boxShadow: s.shadowButton }} className="p-5 rounded-xl space-y-4">
                <div style={{ borderBottomColor: s.borderMuted }} className="flex items-center justify-between pb-2.5 flex-wrap gap-2 border-b">
                  <span style={{ color: s.text }} className="text-[10px] font-sans font-black uppercase flex items-center gap-1.5 tracking-wider">
                    <Sparkles size={12} style={{ color: s.accent }} className="animate-pulse" />
                    AI Scribe Assistant (Dệt văn bia bối cảnh)
                  </span>
                  <span style={{ background: s.bg, color: s.text, border: s.border }} className="text-[8px] font-mono py-0.5 px-2 rounded uppercase shadow-sm">
                    Gemini Hybrid Core
                  </span>
                </div>

                {!(formData.text || "").trim() ? (
                  <div className="space-y-3">
                    <p style={{ color: s.textMuted }} className="text-[10px] font-medium leading-relaxed">
                      Bạn chưa biên soạn dã sử nội dung? Hãy gõ vài ý niệm thô bên dưới, AI Scribe sẽ sinh văn phỏng huyền thoại đầy thu hút!
                    </p>
                    <div className="flex gap-2.5">
                      <div style={{ background: s.bg, border: s.border, boxShadow: s.shadowInner }} className="flex-1 rounded-xl p-2.5 flex items-center">
                        <input
                          type="text"
                          value={aiIdeaPrompt}
                          onChange={(e) => setAiIdeaPrompt(e.target.value)}
                          placeholder="Gõ ý niệm (Vd: Là linh điệp màu lam, chỉ vỗ cánh khi đêm trăng rằm, dẫn đường kẻ lạc)..."
                          style={{ color: s.text }}
                          className="w-full bg-transparent outline-none border-none text-xs font-sans font-medium placeholder-neutral-400"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAiDraftFromIdea}
                        disabled={isAiProcessing || !aiIdeaPrompt.trim() || !formData.keyword?.trim()}
                        className="px-4 py-2.5 bg-[#5e412f] text-white font-sans font-black text-xs rounded-xl shadow-sm hover:bg-[#4d3425] active:scale-95 disabled:opacity-40 transition-all flex items-center gap-1 shrink-0"
                      >
                        <Sparkles size={11} /> Dệt
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-left">
                    <span className="text-[9px] font-bold text-[#7f5539] uppercase block tracking-wider">Phép gọt tinh chỉnh cổ sử:</span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleAiRefinement("condense")}
                        disabled={isAiProcessing}
                        className="px-3 py-1.8 bg-white border border-[#e6ccb2]/40 text-[#5e412f] text-xs rounded-xl shadow-sm hover:bg-[#eddcd2]/55 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Shrink size={11} /> Chưng cất
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAiRefinement("expand")}
                        disabled={isAiProcessing}
                        className="px-3 py-1.8 bg-white border border-[#e6ccb2]/40 text-[#5e412f] text-xs rounded-xl shadow-sm hover:bg-[#eddcd2]/55 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Maximize2 size={11} /> Thổi bùng văn kể
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAiRefinement("format")}
                        disabled={isAiProcessing}
                        className="px-3 py-1.8 bg-white border border-[#e6ccb2]/40 text-[#5e412f] text-xs rounded-xl shadow-sm hover:bg-[#eddcd2]/55 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileCode size={11} /> Gọt sấy Markdown
                      </button>
                      <button
                        type="button"
                        onClick={handleAiExtractKeywords}
                        disabled={isAiProcessing}
                        className="px-3 py-1.8 bg-white border border-[#e6ccb2]/40 text-[#5e412f] text-xs rounded-xl shadow-sm hover:bg-[#eddcd2]/55 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Tags size={11} /> Quét mật tự cảm ứng
                      </button>
                    </div>

                    {suggestedKeywords.length > 0 && (
                      <div className="pt-3 border-t border-[#e6ccb2]/30 mt-1 space-y-2">
                        <span className="text-[9px] font-sans font-black text-[#5e412f] uppercase block tracking-wider">Từ khóa AI bóc tách (Nhấp để găm thành bộ kích hoạt):</span>
                        <div className="flex flex-wrap gap-1.5">
                          {suggestedKeywords.map((word, idx) => {
                            const exists = (formData.keywords || []).some((w) => w.toLowerCase() === word.toLowerCase());
                            return (
                              <button
                                type="button"
                                key={idx}
                                onClick={() => handleAddKeywordBadge(word)}
                                disabled={exists}
                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono border transition-all ${
                                  exists
                                    ? "bg-[#ebdccb] border-transparent text-[#7f5539]/40 cursor-not-allowed"
                                    : "bg-white border-[#e6ccb2]/40 text-[#5e412f] shadow-sm hover:bg-[#eddcd2]/45 cursor-pointer"
                                }`}
                              >
                                #{word} {!exists && "+"}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Main Content Area / Character sheet layout integration */}
            <div className="bg-white p-5 rounded-xl border border-[#e6ccb2]/30 shadow-[0_2px_8px_rgba(94,80,63,0.02)] space-y-3.5">
              <div className="flex justify-between items-center select-none">
                <span className="text-[10px] font-bold uppercase text-[#7f5539] tracking-wider font-sans">
                  Nội dung chính văn bách khoa / Narrative Base Info
                </span>
                <span className="text-[8.5px] font-mono text-[#5e412f] font-extrabold bg-[#f4eae1] px-2 py-0.5 rounded border border-[#e6ccb2]/30">
                  {Math.round((formData.text?.length || 0) / 3.8)} Tokens
                </span>
              </div>

              {formData.category === "character" && characterData ? (
                <div className="bg-[#fcfbf9] border border-[#e6ccb2]/35 rounded-xl p-4 space-y-4 shadow-[inset_1px_1px_3px_rgba(94,80,63,0.03)]">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[#e6ccb2]/30 pb-3">
                    <p className="text-[10px] text-[#5c5043] italic leading-normal max-w-sm">
                      Dán truyện ký gốc ở mục Kiến thức nền nhân vật, ấn kết cấu AI sẽ tự động phân rã thành biểu Character Sheet hoàn mỹ!
                    </p>
                    <button
                      type="button"
                      onClick={handleAiGenKnowledge}
                      disabled={isGeneratingTarget || !characterData.knowledge_train?.trim()}
                      className="py-1.5 px-3 bg-[#5e412f] text-white font-bold font-sans text-[9px] rounded-xl uppercase tracking-wider shadow-sm hover:bg-[#4d3425] active:scale-95 transition-all inline-flex items-center gap-1 shrink-0 disabled:opacity-40"
                    >
                      AI Structurize
                    </button>
                  </div>
                  <CharacterSheetEditor
                    data={characterData}
                    onChange={handleCharacterSheetChange}
                  />
                </div>
              ) : (
                <div className="bg-[#fdfcfb] rounded-xl shadow-[inset_1px_1px_3px_rgba(94,11,11,0.01)] border border-[#e6ccb2]/45 p-4">
                  <textarea
                    value={formData.text || ""}
                    onChange={(e) => onChange("text", e.target.value)}
                    className="w-full h-[330px] bg-transparent outline-none border-none text-xs sm:text-sm text-[#4e3d30] font-sans leading-relaxed resize-y font-medium"
                    placeholder="Viết chép bối cảnh huyền thoại tại đây... Hỗ trợ định dạng văn bản Markdown phong phú..."
                  />
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: TRIGGER SENSORS LOGIC & KEYWORDS CHIPS */}
        {activeTab === 'trigger' && (
          <div className="space-y-6 animate-fadeIn text-left">
            <div className="space-y-3.5 p-5 bg-[#f4eae1] border border-[#e6ccb2]/40 rounded-xl shadow-sm">
              <span className="text-[10px] font-sans font-black uppercase text-[#5e412f] tracking-wider block">
                Pháp thức cảm ứng (Sensory Trigger Logic Engine)
              </span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 select-none">
                {[
                  { mode: "always", label: "Always-On", desc: "Luôn nạp trực tiếp bất kể bối cảnh thoại.", icon: "🔴" },
                  { mode: "keyword", label: "Keyword Match", desc: "Chỉ nạp khi xuất hiện từ khóa đặc thù.", icon: "🟡" },
                  { mode: "semantic", label: "Semantic Smart", desc: "Tự động cảm biến các ý niệm ngữ nghĩa gián tiếp.", icon: "🟣" },
                  { mode: "hybrid", label: "Hybrid Unified", desc: "Gộp cả hai phương diện để tối ưu tối đa.", icon: "🟢" }
                ].map((item) => {
                  const isSelected = (formData.triggerMode || "hybrid") === item.mode;
                  return (
                    <button
                      key={item.mode}
                      type="button"
                      onClick={() => onChange("triggerMode", item.mode)}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-white border-[#5e412f] shadow-sm ring-1 ring-[#5e412f]/10"
                          : "bg-[#fbf7f4]/60 border-[#e6ccb2]/35 hover:bg-white hover:border-[#eddcd2]"
                      }`}
                    >
                      <div className="flex justify-between items-center text-xs font-black text-[#3d2f24] mb-1">
                        <span className={`font-sans ${isSelected ? 'text-[#5e412f]' : 'text-[#7f5539]'}`}>{item.label}</span>
                        <span className="text-[10px]">{item.icon}</span>
                      </div>
                      <p className="text-[10px] text-[#5c5043] leading-relaxed font-normal">{item.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Keyword chips container matching visual screenshots layout */}
            <div className="bg-white p-5 rounded-xl border border-[#e6ccb2]/30 shadow-sm space-y-3.5">
              <span className="text-[10px] font-sans font-black uppercase text-[#5e412f] tracking-wider block">
                Mật tự găm giữ (Phép cảm ứng từ khóa, ghi tách bởi dấu phẩy)
              </span>
              
              <div className="flex flex-wrap gap-2 p-3 bg-[#fcfbf9] border border-[#e6ccb2]/30 rounded-xl min-h-[50px] shadow-[inset_1px_1px_3px_rgba(94,11,11,0.015)] select-none">
                {(!formData.keywords || formData.keywords.length === 0) ? (
                  <span className="text-[10px] text-[#a89582] italic p-1">Chưa găm từ khóa kích hoạt để nạp thư viện.</span>
                ) : (
                  formData.keywords.map((chip, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#eddcd2]/50 text-[#5e412f] rounded-lg text-[10px] font-mono border border-[#e6ccb2]/30 font-bold"
                    >
                      #{chip}
                      <button
                        type="button"
                        onClick={() => handleRemoveKeywordBadge(idx)}
                        className="text-[#7f5539] hover:text-[#5e412f] font-black ml-1 scale-90"
                        title="Hủy găm"
                      >
                        ✕
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Inline input */}
              <form onSubmit={handleAddKeywordFromInput} className="flex gap-2.5">
                <div className="flex-1 bg-[#fcfbf9] rounded-xl border border-[#e6ccb2]/35 p-2 flex items-center shadow-[inset_1px_1px_3px_rgba(94,11,11,0.01)]">
                  <input
                    type="text"
                    value={newKeywordInput}
                    onChange={(e) => setNewKeywordInput(e.target.value)}
                    placeholder="Nhập hạt mật tự và ấn Enter..."
                    className="w-full bg-transparent outline-none border-none text-xs text-[#5e412f] font-sans font-medium placeholder-[#a89582]/45"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#5e412f] text-white font-sans font-black text-xs rounded-xl shadow-sm hover:bg-[#4d3425] active:scale-95 transition-all flex items-center justify-center shrink-0"
                >
                  + Thêm
                </button>
              </form>
            </div>

            {/* Prompt stacks position parameters matching schema designer style */}
            <div className="bg-white p-5 rounded-xl border border-[#e6ccb2]/30 shadow-sm space-y-4">
              <span className="text-[10px] font-sans font-black uppercase text-[#5e412f] tracking-wider block">
                Vĩ lý nạp bối cảnh (Context Insertion Attributes)
              </span>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 select-none">
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-[#7f5539] font-sans">Độ ưu tiên (Priority Index)</span>
                  <div className="flex bg-[#fcfbf9] border border-[#e6ccb2]/35 p-2 rounded-xl items-center shadow-[inset_1px_1px_3px_rgba(0,0,0,0.03)] text-xs">
                    <input 
                      type="number"
                      min="1"
                      max="100"
                      value={formData.priority || 50}
                      onChange={e => onChange("priority", parseInt(e.target.value) || 50)}
                      className="w-full bg-transparent outline-none border-none font-bold text-[#5e412f] tracking-wider font-mono text-center"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-[#7f5539] font-sans">Cấu đồ nạp (Stack Order)</span>
                  <div className="flex bg-white border border-[#e6ccb2]/35 p-1 rounded-xl items-center shadow-[0_1px_3px_rgba(94,80,63,0.02)]">
                    <select
                      value={formData.position || "before_char"}
                      onChange={e => onChange("position", e.target.value)}
                      className="w-full bg-transparent outline-none border-none font-extrabold text-[#5e412f] text-xs font-sans cursor-pointer p-1"
                    >
                      <option value="first">Nạp tiên phong (First Tier)</option>
                      <option value="before_char">Trước bản NPC (Before NPC Sheet)</option>
                      <option value="after_char">Sau bản NPC (After NPC Sheet)</option>
                      <option value="last">Nạp tột hậu (Tail System)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-[#7f5539] font-sans">Trạng thái bảo trì (Status)</span>
                  <div className="flex bg-white border border-[#e6ccb2]/35 p-1 rounded-xl items-center shadow-[0_1px_3px_rgba(94,80,63,0.02)]">
                    <select
                      value={formData.isEnabled !== false ? "on" : "off"}
                      onChange={e => onChange("isEnabled", e.target.value === "on")}
                      className="w-full bg-transparent outline-none border-none font-extrabold text-[#5e412f] text-xs font-sans cursor-pointer p-1"
                    >
                      <option value="on">Kích hoạt thức tỉnh (Active)</option>
                      <option value="off">Tạm tắt bảo tồn (Sealed)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: RPG ATTRIBUTES EDITOR & RELATED LINK ENTRIES */}
        {activeTab === 'stats_network' && (
          <div className="space-y-6 animate-fadeIn text-left">
            {/* RPG Attributes form block */}
            <div className="bg-white p-5 rounded-xl border border-[#e6ccb2]/30 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-[#e6ccb2]/15 pb-2 cursor-pointer select-none" onClick={() => setShowRpgAttrs(!showRpgAttrs)}>
                <span className="text-[10px] font-sans font-black uppercase text-[#5e412f] tracking-wider flex items-center gap-1.5">
                  <Activity size={12} className="text-[#a89582]" />
                  RPG Game Script Parameters (Vĩ chất tương thích game)
                </span>
                <ChevronDown size={14} className={`text-[#7f5539] transition-transform ${showRpgAttrs ? 'rotate-180' : ''}`} />
              </div>

              {showRpgAttrs && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Category-specific attributes template inputs */}
                  {formData.category === "character" && (
                    <>
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-[#7f5539]">Alignment / Tâm cốt</span>
                        <input
                          type="text"
                          value={(formData as any).rpg_attrs?.alignment || ""}
                          onChange={e => {
                            const attrs = (formData as any).rpg_attrs || {};
                            onChange("rpg_attrs", { ...attrs, alignment: e.target.value });
                          }}
                          placeholder="Chính trực, hỗn loạn trung lập..."
                          className="w-full p-2.5 bg-[#fcfbf9] border border-[#e6ccb2]/35 rounded-xl outline-none text-xs text-[#5e412f] font-sans font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-[#7f5539]">Danger Level / Cấp nguy hiểm</span>
                        <input
                          type="text"
                          value={(formData as any).rpg_attrs?.danger_level || ""}
                          onChange={e => {
                            const attrs = (formData as any).rpg_attrs || {};
                            onChange("rpg_attrs", { ...attrs, danger_level: e.target.value });
                          }}
                          placeholder="F - Sss..."
                          className="w-full p-2.5 bg-[#fcfbf9] border border-[#e6ccb2]/35 rounded-xl outline-none text-xs text-[#5e412f] font-sans font-medium"
                        />
                      </div>
                    </>
                  )}

                  {formData.category === "location" && (
                    <>
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-[#7f5539]">Climate & Weather</span>
                        <input
                          type="text"
                          value={(formData as any).rpg_attrs?.climate || ""}
                          onChange={e => {
                            const attrs = (formData as any).rpg_attrs || {};
                            onChange("rpg_attrs", { ...attrs, climate: e.target.value });
                          }}
                          placeholder="Lạnh buốt quanh năm, sương độc..."
                          className="w-full p-2.5 bg-[#fcfbf9] border border-[#e6ccb2]/35 rounded-xl outline-none text-xs text-[#5e412f] font-sans font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-[#7f5539]">Lords / Kẻ cai trị</span>
                        <input
                          type="text"
                          value={(formData as any).rpg_attrs?.ruler || ""}
                          onChange={e => {
                            const attrs = (formData as any).rpg_attrs || {};
                            onChange("rpg_attrs", { ...attrs, ruler: e.target.value });
                          }}
                          placeholder="Galahad vương tước..."
                          className="w-full p-2.5 bg-[#fcfbf9] border border-[#e6ccb2]/35 rounded-xl outline-none text-xs text-[#5e412f] font-sans font-medium"
                        />
                      </div>
                    </>
                  )}

                  {formData.category === "item" && (
                    <>
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-[#7f5539]">Rarity / Phẩm chất bảo khí</span>
                        <input
                          type="text"
                          value={(formData as any).rpg_attrs?.rarity || ""}
                          onChange={e => {
                            const attrs = (formData as any).rpg_attrs || {};
                            onChange("rpg_attrs", { ...attrs, rarity: e.target.value });
                          }}
                          placeholder="Sử thi vĩnh hằng, linh khí..."
                          className="w-full p-2.5 bg-[#fcfbf9] border border-[#e6ccb2]/35 rounded-xl outline-none text-xs text-[#5e412f] font-sans font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-[#7f5539]">Value in cooper / Giá trị thỏi</span>
                        <input
                          type="text"
                          value={(formData as any).rpg_attrs?.value_copper || ""}
                          onChange={e => {
                            const attrs = (formData as any).rpg_attrs || {};
                            onChange("rpg_attrs", { ...attrs, value_copper: e.target.value });
                          }}
                          placeholder="2,500 tinh thể thạch..."
                          className="w-full p-2.5 bg-[#fcfbf9] border border-[#e6ccb2]/35 rounded-xl outline-none text-xs text-[#5e412f] font-sans font-medium"
                        />
                      </div>
                    </>
                  )}

                  {/* General metadata fallback parameter */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-[#7f5539]">Points of Interest / Điểm thần bí mốc</span>
                    <input
                      type="text"
                      value={(formData as any).rpg_attrs?.points_of_interest || ""}
                      onChange={e => {
                        const attrs = (formData as any).rpg_attrs || {};
                        onChange("rpg_attrs", { ...attrs, points_of_interest: e.target.value });
                      }}
                      placeholder="Mộ Tháp hoang sơ, hồ vương, lâu đài rêu phong..."
                      className="w-full p-2.5 bg-[#fcfbf9] border border-[#e6ccb2]/35 rounded-xl outline-none text-xs text-[#5e412f] font-sans font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-[#7f5539]">Notes / Phụ chú dị thiết</span>
                    <input
                      type="text"
                      value={(formData as any).rpg_attrs?.custom_notes || ""}
                      onChange={e => {
                        const attrs = (formData as any).rpg_attrs || {};
                        onChange("rpg_attrs", { ...attrs, custom_notes: e.target.value });
                      }}
                      placeholder="Đeo dính nguyền rủa, kỵ hóa lực..."
                      className="w-full p-2.5 bg-[#fcfbf9] border border-[#e6ccb2]/35 rounded-xl outline-none text-xs text-[#5e412f] font-sans font-medium"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Related connections map block */}
            <div className="bg-white p-5 rounded-xl border border-[#e6ccb2]/30 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-[#e6ccb2]/15 pb-2 cursor-pointer select-none" onClick={() => setShowLinksArea(!showLinksArea)}>
                <span className="text-[10px] font-sans font-black uppercase text-[#5e412f] tracking-wider flex items-center gap-1.5">
                  <LinkIcon size={12} className="text-[#a89582]" />
                  Lực lượng mốc liên đới (Connected Historical Records / Lore Links)
                </span>
                <ChevronDown size={14} className={`text-[#7f5539] transition-transform ${showLinksArea ? 'rotate-180' : ''}`} />
              </div>

              {showLinksArea && (
                <div className="space-y-3.5">
                  <div className="flex bg-[#fcfbf9] border border-[#e6ccb2]/35 rounded-xl px-3 py-1.5 items-center">
                    <input
                      type="text"
                      value={relatedSearchTerm || ""}
                      onChange={e => setRelatedSearchTerm(e.target.value)}
                      placeholder="Gõ từ khóa để lọc mốc liên đới..."
                      className="w-full bg-transparent outline-none border-none text-xs text-[#5e412f] font-sans"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-[160px] overflow-y-auto p-1 custom-scrollbar" style={{ scrollbarWidth: 'thin' }}>
                    {filteredRelationEntries.length === 0 ? (
                      <div className="col-span-full py-4 text-center text-[10px] italic text-[#a89582]">Chưa biên soạn mục dã sử khác khả dụng để liên hợp.</div>
                    ) : (
                      filteredRelationEntries.map(ent => {
                        const linked = (formData.relatedEntries || []).includes(ent.id);
                        return (
                          <button
                            type="button"
                            key={ent.id}
                            onClick={() => handleToggleLink(ent.id)}
                            className={`p-2 rounded-xl text-left border text-[10px] font-sans font-bold transition-all truncate flex items-center justify-between cursor-pointer ${
                              linked
                                ? "bg-[#eddcd2] text-[#5e412f] border-[#5e412f]"
                                : "bg-[#faf5f0] border-[#e6ccb2]/30 text-[#7f5539] hover:bg-[#eddcd2]/55"
                            }`}
                          >
                            <span>{ent.keyword || ent.title || 'Mốc cổ sử'}</span>
                            {linked && <span className="text-[8px] bg-[#5e412f] text-white px-1 rounded-sm scale-90">✓</span>}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* Persistent Save/Exit action drawer bottom styled in deep elegance */}
      <div 
        style={{ background: s.convexBg, borderTop: s.border }}
        className="p-4 shrink-0 z-10 flex items-center justify-end gap-3 select-none"
      >
        <button
          type="button"
          onClick={onCancel}
          style={{ background: s.card, color: s.text, border: s.border, boxShadow: s.shadowButton }}
          className="px-4 py-2.5 transition-colors font-sans font-black text-xs uppercase rounded-xl cursor-pointer"
        >
          Hủy bỏ (Esc)
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving || !formData.keyword?.trim()}
          style={(!isSaving && formData.keyword?.trim()) ? {
            background: s.accent,
            color: '#ffffff',
          } : {}}
          className="px-5 py-2.5 text-[#faf5f0] transition-colors font-sans font-black text-xs uppercase rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
        >
          {isSaving ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
          <span>{isEditing ? "Lưu thần thức" : "Kiến tạo cổ bản"}</span>
        </button>
      </div>

    </div>
  );
};
