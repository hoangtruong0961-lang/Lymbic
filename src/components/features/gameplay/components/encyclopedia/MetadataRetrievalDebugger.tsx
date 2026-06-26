import React, { useState, useEffect, useMemo } from 'react';
import { VectorData } from '../../../../../services/db/indexedDB';
import { BrainCircuit, Search, Loader2, Info, ChevronRight, Star, Heart, Flag, MapPin, User, Package, Scale, Globe, Calendar } from 'lucide-react';
import { useAppStore } from '../../../../../store/appStore';
import { vectorService } from '../../../../../services/ai/vectorService';
import { useNeumorphicTheme } from '../../../../../hooks/useNeumorphicTheme';

interface MetadataRetrievalDebuggerProps {
  entries: VectorData[];
}

const CATEGORY_MAP: Record<
  string,
  { label: string; icon: any }
> = {
  character: {
    label: "Nhân vật",
    icon: User,
  },
  location: {
    label: "Địa điểm",
    icon: MapPin,
  },
  faction: {
    label: "Thế lực",
    icon: Flag,
  },
  item: {
    label: "Vật phẩm",
    icon: Package,
  },
  relationship: {
    label: "Mối quan hệ",
    icon: Heart,
  },
  event: {
    label: "Sự kiện",
    icon: Calendar,
  },
  law: {
    label: "Luật lệ",
    icon: Scale,
  },
  rule: {
    label: "Luật lệ",
    icon: Scale,
  },
  world: {
    label: "Thế giới",
    icon: Globe,
  },
};

export const MetadataRetrievalDebugger: React.FC<MetadataRetrievalDebuggerProps> = ({ entries }) => {
  const [testText, setTestText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [semanticMatches, setSemanticMatches] = useState<{ id: string; score: number }[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { settings } = useAppStore();
  const s = useNeumorphicTheme();

  const activeIntents = useMemo(() => {
    const categories = new Set<string>();
    const lower = testText.toLowerCase();

    if (!testText.trim()) return [];

    if (/ai|nhân vật|người|hắn|nó|cô|anh|ông|bà|npc|tên|gặp|nói|hỏi|chào|player|char|character/i.test(lower)) {
      categories.add('character');
    }
    if (/đến|ở|tại|vào|đi|đâu|nơi|địa điểm|vùng|rừng|thành|phố|quán|vương quốc|đại lục|level|location|map|place|area/i.test(lower)) {
      categories.add('location');
    }
    if (/nhặt|mở|hộp|kiếm|vũ khí|vật phẩm|trang bị|sử dụng|thuốc|bình|đồ|item|weapon|equip|gear/i.test(lower)) {
      categories.add('item');
    }
    if (/phe|đối lập|băng|nhóm|gia tộc|thế lực|liên minh|quân|quốc gia|đảng|faction|guild|clan|nation/i.test(lower)) {
      categories.add('faction');
    }
    if (/yêu|ghét|quen|biết|bạn|thù|quan hệ|tình cảm|vợ|chồng|bố|mẹ|con|relationship|friend|enemy/i.test(lower)) {
      categories.add('relationship');
    }
    if (/khi|lúc|sau khi|trận|cuộc chiến|chiến đấu|lễ hội|sự kiện|biến cố|xảy ra|event|incident|happen/i.test(lower)) {
      categories.add('event');
    }
    if (/luật|lệ|quy tắc|hệ thống|chỉ số|sức mạnh|giới hạn|skill|chiêu|damage|hp|mp|law|rule|system|mechanic/i.test(lower)) {
      categories.add('rule');
    }
    if (/thế giới|vũ trụ|lịch sử|truyền thuyết|thần thoại|bối cảnh|world|universe|history|lore/i.test(lower)) {
      categories.add('world');
    }

    return Array.from(categories);
  }, [testText]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!testText.trim()) {
        setSemanticMatches([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      (async () => {
        try {
          const queryEmbedding = await vectorService.getEmbedding(testText, settings);
          if (queryEmbedding) {
            const matches: { id: string; score: number }[] = [];
            for (const e of entries) {
              if (e.isEnabled === false || !e.embedding) continue;
              if (e.triggerMode === 'semantic' || e.triggerMode === 'hybrid') {
                const similarity = vectorService.cosineSimilarity(queryEmbedding, e.embedding);
                if (similarity > 0.15) {
                  matches.push({ id: e.id, score: similarity });
                }
              }
            }
            setSemanticMatches(matches);
          }
        } catch (err) {
          console.error("Embedding lookup failure in metadata visualizer:", err);
        } finally {
          setIsSearching(false);
        }
      })();
    }, 600);

    return () => clearTimeout(timer);
  }, [testText, entries, settings]);

  const scoredResults = useMemo(() => {
    if (!testText.trim()) return [];

    const lowerScan = testText.toLowerCase();
    const results = [];

    for (const e of entries) {
      if (e.isEnabled === false) continue;

      let isKeywordMatched = false;
      const matchedKwList: string[] = [];
      let semanticScore = 0;
      let isSemanticMatched = false;
      let baseScore = 0;

      // 1. Keyword check
      const kws = e.keywords && e.keywords.length > 0 ? e.keywords : [e.keyword || e.title || ''];
      for (const k of kws) {
        if (k && lowerScan.includes(k.toLowerCase())) {
          isKeywordMatched = true;
          matchedKwList.push(k);
        }
      }

      // 2. Semantic vector similarity check
      const match = semanticMatches.find(m => m.id === e.id);
      if (match) {
        semanticScore = match.score;
        if (semanticScore > 0.35) {
          isSemanticMatched = true;
        }
      }

      // 3. Evaluate criteria based on trigger mode
      let activated = false;
      const tMode = e.triggerMode || 'semantic';
      if (tMode === 'always') {
        activated = true;
        baseScore = 0.82;
      } else if (tMode === 'keyword') {
        activated = isKeywordMatched;
        baseScore = isKeywordMatched ? 0.75 : 0;
      } else if (tMode === 'semantic') {
        activated = isSemanticMatched;
        baseScore = isSemanticMatched ? semanticScore : 0;
      } else if (tMode === 'hybrid') {
        activated = isKeywordMatched || isSemanticMatched;
        baseScore = isKeywordMatched 
          ? Math.max(0.75, semanticScore) 
          : (isSemanticMatched ? semanticScore : 0);
      }

      if (!activated) continue;

      // 4. Metadata-Aware Boosting
      let finalScore = baseScore;
      const boosts: string[] = [];
      let categoryMatched = false;

      // Category match boost
      const itemCat = e.category || 'world';
      if (activeIntents.includes(itemCat)) {
        categoryMatched = true;
        finalScore *= 1.25;
        boosts.push(`Khớp danh mục (${itemCat}): x1.25`);
      }

      // Tag overlap boost
      const matchedTags: string[] = [];
      if (e.tags && e.tags.length > 0) {
        for (const tag of e.tags) {
          if (lowerScan.includes(tag.toLowerCase())) {
            matchedTags.push(tag);
          }
        }
        if (matchedTags.length > 0) {
          finalScore += matchedTags.length * 0.05;
          boosts.push(`Thẻ khớp (${matchedTags.join(', ')}): +${(matchedTags.length * 0.05).toFixed(2)}`);
        }
      }

      // Priority boost
      const priority = e.priority ?? 50;
      const priorityBoost = (priority / 100) * 0.15;
      finalScore += priorityBoost;
      boosts.push(`Ưu tiên (hạng ${priority}): +${priorityBoost.toFixed(2)}`);

      // Cooldown Sticky
      if (e.isSticky) {
        finalScore *= 1.5;
        boosts.push(`Trạng thái Sticky: x1.5`);
      }

      results.push({
        entry: e,
        baseScore: Math.round(baseScore * 1000) / 1000,
        finalScore: Math.round(finalScore * 1000) / 1000,
        boosts,
        categoryMatched,
        matchedTags,
        matchedKwList,
        triggerReason: tMode,
      });
    }

    return results.sort((a, b) => b.finalScore - a.finalScore);
  }, [testText, entries, semanticMatches, activeIntents]);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <div
      style={{
        background: s.flatBg,
        color: s.text,
        border: s.border,
        boxShadow: s.shadowOuter,
      }}
      className="flex flex-col h-full rounded-2xl overflow-hidden transition-all duration-300"
    >
      <div
        style={{
          background: s.convexBg,
          borderBottom: s.border,
        }}
        className="px-3.5 py-3 flex items-center justify-between"
      >
        <h3
          style={{ color: s.text }}
          className="text-[10px] font-sans font-black uppercase flex items-center gap-1.5 tracking-wider leading-none"
        >
          <BrainCircuit size={13} style={{ color: s.accent }} />
          Bộ Trích Xuất Ngữ Cảnh (Metadata-Aware Tracker)
        </h3>
        <span
          style={{
            background: s.card,
            color: s.text,
            border: s.border,
            boxShadow: s.shadowButton,
          }}
          className="text-[8px] px-2 py-1 font-bold uppercase tracking-wider shadow-sm leading-none"
        >
          Hoạt Động
        </span>
      </div>

      <div className="p-3 flex flex-col flex-1 gap-3 overflow-hidden">
        {/* Test Simulator input wrapper */}
        <div className="relative shrink-0">
          <input
            value={testText}
            onChange={e => setTestText(e.target.value)}
            placeholder='Giả lập: "Gặp Aria tại đại lục Eldoria để học Pháp Thuật"'
            style={{
              background: s.card,
              color: s.text,
              border: s.border,
              boxShadow: s.shadowInner,
            }}
            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs outline-none font-medium transition-all"
          />
          {isSearching ? (
            <Loader2 size={15} style={{ color: s.text }} className="absolute left-3 top-1/2 -translate-y-1/2 animate-spin" />
          ) : (
            <Search size={15} style={{ color: s.textMuted }} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-70" />
          )}
        </div>

        {/* Dynamic Category/Intent insights section */}
        {testText.trim().length > 0 && (
          <div
            style={{
              backgroundColor: s.card,
              border: s.border,
              boxShadow: s.cardInnerShadow,
            }}
            className="p-3 rounded-xl text-[10px] space-y-1 shrink-0 selection:bg-indigo-200/30"
          >
            <div style={{ color: s.accent }} className="font-serif font-black uppercase tracking-wider text-[9px]">Phổ Ý định trích xuất từ câu thoại:</div>
            <div className="flex flex-wrap gap-1.5 pt-1.5">
              {activeIntents.length > 0 ? (
                activeIntents.map(intent => {
                  const map = CATEGORY_MAP[intent] || { label: intent, icon: Info };
                  return (
                    <span
                      key={intent}
                      style={{
                        background: s.badgeBg,
                        color: s.accent,
                        borderColor: s.badgeBorder,
                      }}
                      className={`px-2 py-0.5 rounded-lg border flex items-center gap-1 font-bold text-[8.5px] uppercase shadow-sm`}
                    >
                      {React.createElement(map.icon, { size: 10 })}
                      {map.label} (BOOSTED)
                    </span>
                  );
                })
              ) : (
                <span style={{ color: s.textMuted }} className="italic text-[9.5px]">Chưa phát hiện phân cực ý niệm đặc thù. Đang dùng phân giải từ ghép lý tính và Vector tương đồng...</span>
              )}
            </div>
          </div>
        )}

        {/* Results Stream list with beautiful vintage cards */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-0.5">
          {testText.trim().length > 0 ? (
            scoredResults.length > 0 ? (
              scoredResults.map(({ entry, baseScore, finalScore, boosts, categoryMatched }) => {
                const isExpanded = expandedId === entry.id;
                const map = CATEGORY_MAP[entry.category || 'world'] || { label: 'Thế giới', icon: Globe };

                // Percentage calculate for UI visual bar
                const barWidth = Math.min(100, Math.round(finalScore * 100));

                return (
                  <div
                    key={entry.id}
                    style={{
                      background: s.card,
                      borderColor: s.borderMuted,
                      boxShadow: s.shadowButton,
                    }}
                    className="border rounded-xl overflow-hidden transition-all duration-300"
                  >
                    {/* Collapsed view item */}
                    <div
                      onClick={() => toggleExpand(entry.id)}
                      className="p-3 cursor-pointer hover:opacity-90 flex items-center justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span style={{ color: s.text }} className="font-sans font-black text-xs uppercase tracking-wide truncate">
                            {entry.keyword || entry.title}
                          </span>
                          <span
                            style={{
                              background: s.badgeBg,
                              color: s.accent,
                              borderColor: s.badgeBorder,
                            }}
                            className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider scale-90 origin-left border`}
                          >
                            {map.label}
                          </span>
                        </div>
                        {/* Score bar layout */}
                        <div className="flex items-center gap-2">
                          <div
                            style={{
                              backgroundColor: s.bg,
                              borderColor: s.borderMuted,
                            }}
                            className="flex-1 h-2 border rounded-full overflow-hidden p-[1px]"
                          >
                            <div
                              style={{
                                width: `${barWidth}%`,
                                background: `linear-gradient(to right, ${s.textMuted}, ${s.accent})`,
                              }}
                              className="h-full rounded-full transition-all duration-500"
                            />
                          </div>
                          <span style={{ color: s.text }} className="font-mono text-[9.5px] font-extrabold">
                            {(finalScore * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <ChevronRight size={14} style={{ color: s.accent }} className={`shrink-0 transition-transform ${isExpanded ? 'rotate-95' : ''}`} />
                    </div>

                    {/* Expanded audit accordion layout */}
                    {isExpanded && (
                      <div
                        style={{
                          borderTop: s.border,
                          backgroundColor: s.bg,
                          color: s.text,
                        }}
                        className="px-3.5 pb-3.5 pt-1.5 text-[10px] space-y-3 font-sans"
                      >
                        {/* Summary fact scroll card */}
                        <div
                          style={{
                            background: s.card,
                            borderColor: s.borderMuted,
                            color: s.text,
                            boxShadow: s.cardInnerShadow,
                          }}
                          className="p-2.5 rounded-xl border italic text-[9.5px] leading-relaxed max-h-20 overflow-y-auto custom-scrollbar text-left"
                        >
                          "{entry.text}"
                        </div>
                        
                        {/* Mathematics Trace log list */}
                        <div className="text-left">
                          <div style={{ color: s.text }} className="font-serif font-black text-[9px] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Star size={11} style={{ color: s.accent }} />
                            Khảo Thạch Quy Hệ Chấm Điểm:
                          </div>
                          <div style={{ color: s.textMuted }} className="space-y-1 pl-3 font-medium text-[9px]">
                            <div style={{ borderColor: s.borderMuted }} className="flex justify-between border-b border-dashed pb-1">
                              <span>Bộ lọc tương thích (Cột gốc: {entry.triggerMode || 'hybrid'}):</span>
                              <span style={{ color: s.text }} className="font-bold">{(baseScore * 100).toFixed(1)}%</span>
                            </div>
                            {boosts.map((boost, idx) => (
                              <div key={idx} style={{ borderColor: s.borderMuted }} className="flex justify-between border-b border-dashed pb-1">
                                <span style={{ color: s.accent }}>↳ {boost.split(":")[0]}</span>
                                <span style={{ color: s.text }} className="font-bold">{boost.split(":")[1]?.trim()}</span>
                              </div>
                            ))}
                            <div className="flex justify-between pt-1.5 font-bold">
                              <span>Tính hợp điểm (Quy thức):</span>
                              <span style={{ color: s.accent }} className="font-black underline">{(finalScore * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>

                        {/* Trigger properties list */}
                        <div className="grid grid-cols-2 gap-2 pt-1 text-[9px]">
                          <div
                            style={{
                              background: s.card,
                              borderColor: s.borderMuted,
                            }}
                            className="p-2 rounded-lg flex items-center justify-between border"
                          >
                            <span style={{ color: s.textMuted }}>Category Boost:</span>
                            <span style={{ color: categoryMatched ? '#10b981' : s.textMuted }} className="font-bold">
                              {categoryMatched ? 'KHỚP (x1.25)' : 'KHÔNG KHỚP'}
                            </span>
                          </div>
                          <div
                            style={{
                              background: s.card,
                              borderColor: s.borderMuted,
                            }}
                            className="p-2 rounded-lg flex items-center justify-between border"
                          >
                            <span style={{ color: s.textMuted }}>Trigger Mode:</span>
                            <span style={{ color: s.text }} className="font-bold uppercase">{entry.triggerMode || 'hybrid'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div style={{ background: s.card, borderColor: s.border, color: s.textMuted }} className="p-8 rounded-xl border text-center italic font-serif text-xs">
                Không phân hoạt được dữ kiện nào phù hợp qua thuật toán trích xuất hiện thời.
              </div>
            )
          ) : (
            <div style={{ color: s.textMuted }} className="h-full flex flex-col items-center justify-center text-center p-6 opacity-80">
              <BrainCircuit size={40} style={{ color: s.accent }} className="opacity-75 mb-3" />
              <div style={{ color: s.text }} className="font-serif font-black text-xs uppercase tracking-wider">Mô Phỏng Trích Xuất Ý Bản</div>
              <div className="text-[10px] mt-2 max-w-[240px] leading-relaxed font-serif italic">
                Nhập văn bản thoại thoại ở trên để xem trực quan chuỗi hoạt thuật ý niệm (Query Intent Classifier) tự động chấm điểm và nhân hệ số thắp dẫn bối cảnh thông minh.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
