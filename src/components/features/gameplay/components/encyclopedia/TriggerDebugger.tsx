import React, { useState, useMemo, useEffect } from 'react';
import { VectorData } from '../../../../../services/db/indexedDB';
import { ShieldAlert, Search, Loader2, Link2, BrainCircuit, Pin } from 'lucide-react';
import { useAppStore } from '../../../../../store/appStore';
import { vectorService } from '../../../../../services/ai/vectorService';
import { useNeumorphicTheme } from '../../../../../hooks/useNeumorphicTheme';

interface TriggerDebuggerProps {
  entries: VectorData[];
}

export const TriggerDebugger: React.FC<TriggerDebuggerProps> = ({ entries }) => {
  const [testText, setTestText] = useState('');
  const [semanticMatches, setSemanticMatches] = useState<{id: string, score: number}[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { settings } = useAppStore();
  const s = useNeumorphicTheme();

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
            const matches: {id: string, score: number}[] = [];
            for (const e of entries) {
              if (e.isEnabled === false || !e.embedding) continue;
              if (e.triggerMode === 'semantic' || e.triggerMode === 'hybrid') {
                const similarity = vectorService.cosineSimilarity(queryEmbedding, e.embedding);
                // Threshold based on Engine configs (0.35 in vectorService)
                if (similarity > 0.35) {
                  matches.push({ id: e.id, score: similarity });
                }
              }
            }
            setSemanticMatches(matches);
          }
        } catch (err) {
          console.error("Semantic debugger failed", err);
        } finally {
          setIsSearching(false);
        }
      })();
    }, 600); // 600ms debounce
    
    return () => clearTimeout(timer);
  }, [testText, entries, settings]);

  const triggeredEntriesDetails = useMemo(() => {
    if (!testText.trim()) return [];
    
    const results: { entry: VectorData, type: 'always' | 'keyword' | 'semantic' | 'hybrid', reason: string, detail: string }[] = [];
    const lowerText = testText.toLowerCase();

    for (const e of entries) {
      if (e.isEnabled === false) continue;
      
      if (e.triggerMode === 'always' || e.isSticky) {
        results.push({ entry: e, type: 'always', reason: 'Always / Sticky', detail: 'Được ghim thủ công hoặc cài đặt luôn kích hoạt.' });
        continue;
      }
      
      let isKwMatch = false;
      let matchedKw = '';
      if (e.triggerMode === 'keyword' || e.triggerMode === 'hybrid' || !e.triggerMode) {
        const kwToTest = e.keywords && e.keywords.length > 0 ? e.keywords : (e.keyword ? [e.keyword] : []);
        const found = kwToTest.find(k => lowerText.includes(String(k).toLowerCase()));
        if (found) {
          isKwMatch = true;
          matchedKw = found;
        }
      }
      
      let isSemMatch = false;
      let semScore = 0;
      if (e.triggerMode === 'semantic' || e.triggerMode === 'hybrid') {
        const match = semanticMatches.find(m => m.id === e.id);
        if (match) {
          isSemMatch = true;
          semScore = match.score;
        }
      }
      
      if (isKwMatch && isSemMatch) {
        results.push({ entry: e, type: 'hybrid', reason: 'Hybrid', detail: `Từ khóa: "${matchedKw}" | Semantic: ${(semScore * 100).toFixed(1)}%` });
      } else if (isKwMatch) {
        results.push({ entry: e, type: 'keyword', reason: 'Keyword', detail: `Tìm thấy từ khóa: "${matchedKw}"` });
      } else if (isSemMatch) {
        results.push({ entry: e, type: 'semantic', reason: 'Semantic', detail: `Độ tương đồng ngữ nghĩa: ${(semScore * 100).toFixed(1)}%` });
      }
    }
    
    // Sort by Priority (high first), then logic
    return results.sort((a, b) => (b.entry.priority || 0) - (a.entry.priority || 0));
  }, [testText, entries, semanticMatches]);

  const getReasonIcon = (type: string) => {
    switch(type) {
      case 'always': return <Pin size={12} style={{ color: s.accent }} />;
      case 'keyword': return <Link2 size={12} style={{ color: s.text }} />;
      case 'semantic': return <BrainCircuit size={12} className="text-purple-500" />;
      case 'hybrid': return <ShieldAlert size={12} className="text-emerald-500" />;
      default: return <Search size={12} style={{ color: s.textMuted }} />;
    }
  };

  return (
    <div
      style={{
        background: s.flatBg,
        color: s.text,
        border: s.border,
        boxShadow: s.shadowOuter,
      }}
      className="flex flex-col h-full rounded-2xl transition-all duration-300"
    >
      <div className="p-4 flex flex-col h-full gap-4">
        <div className="relative shrink-0">
          <input 
            value={testText}
            onChange={e => setTestText(e.target.value)}
            placeholder='Mô phỏng: "Tôi đến Eldoria gặp Aria"'
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
         
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {testText.length > 0 ? (
            <div className="space-y-4 text-left">
              <div style={{ color: s.text }} className="font-serif font-black flex items-center gap-1.5 text-xs uppercase tracking-wider">
                <ShieldAlert size={14} style={{ color: s.accent }}/> 
                {isSearching ? 'Đang phân giải logic cổ thư...' : `Hạt cảm ứng thức tỉnh (${triggeredEntriesDetails.length})`}
              </div>
              {triggeredEntriesDetails.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {triggeredEntriesDetails.map((item, idx) => (
                    <div 
                      key={item.entry.id + '_' + idx} 
                      style={{
                        background: s.card,
                        border: s.border,
                        boxShadow: s.shadowButton,
                      }}
                      className="rounded-xl p-3 sm:p-4 flex flex-col gap-2 transition-all hover:scale-[1.01]"
                    >
                      <div style={{ borderBottomColor: s.borderMuted }} className="flex justify-between items-start gap-2 border-b pb-2">
                        <span style={{ color: s.text }} className="font-serif font-black uppercase text-xs truncate flex items-center gap-1.5">
                          {getReasonIcon(item.type)} {item.entry.keyword || item.entry.title}
                        </span>
                        <span
                          style={{
                            background: s.bg,
                            color: s.text,
                            border: s.border,
                          }}
                          className="text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded"
                        >
                          Hạng: {item.entry.priority || 50}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[10px]">
                        <span
                          style={{
                            background: item.type === 'always' ? s.accent : 
                                        item.type === 'keyword' ? s.badgeBg : 
                                        item.type === 'semantic' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            color: item.type === 'always' ? '#fff' : 
                                   item.type === 'keyword' ? s.accent : 
                                   item.type === 'semantic' ? '#a855f7' : '#10b981',
                            border: item.type === 'always' ? s.border : 
                                    item.type === 'keyword' ? s.badgeBorder : 
                                    item.type === 'semantic' ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                          }}
                          className="px-2 py-0.5 rounded text-[8px] font-sans font-black uppercase tracking-wider border"
                        >
                          {item.reason}
                        </span>
                        <span style={{ color: s.textMuted }} className="font-serif italic truncate max-w-xs">{item.detail}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !isSearching && (
                <div style={{ background: s.card, border: s.border, color: s.textMuted }} className="text-xs p-6 rounded-xl text-center italic font-serif">
                  Không tìm thấy hạt cảm ứng phù hợp từ đoạn ghi chép trên.
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: s.textMuted }} className="h-full flex flex-col items-center justify-center text-center p-6 opacity-80">
              <ShieldAlert size={36} style={{ color: s.accent }} className="opacity-75 mb-2.5" />
              <div style={{ color: s.text }} className="font-serif font-black text-xs uppercase tracking-wider">Cảm Biến Logic Thư Khố</div>
              <div className="text-[10px] mt-2 max-w-[240px] leading-relaxed font-serif italic">
                Nhập đoạn văn bản dã sử bất kỳ để kiểm thử thuật toán kích thắp bối cảnh (Từ khóa, Ý niệm, Lai tạo).
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
