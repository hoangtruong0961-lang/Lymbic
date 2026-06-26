import React from 'react';
import { VectorData } from '../../../../../services/db/indexedDB';
import { Cpu, CheckCircle } from 'lucide-react';
import { useNeumorphicTheme } from '../../../../../hooks/useNeumorphicTheme';

interface ScribeMonitorProps {
  entries: VectorData[];
}

export const ScribeMonitor: React.FC<ScribeMonitorProps> = ({ entries }) => {
  const s = useNeumorphicTheme();
  const histories = entries
    .flatMap(e =>
      (e.updateHistory || [])
        .filter(h => h && h.content && typeof h.content === 'string' && !h.content.startsWith('__METADATA__'))
        .map(h => ({
          ...h,
          keyword: e.keyword,
          category: e.category,
          entryId: e.id,
        }))
    )
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 50); // top 50 recent events

  return (
    <div
      style={{
        background: s.flatBg,
        color: s.text,
        boxShadow: s.shadowOuter,
        border: s.border,
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
          <Cpu size={13} style={{ color: s.accent }} />
          Scribe Monitor
        </h3>
        <div className="flex gap-2">
          <span
            style={{
              background: s.card,
              color: s.text,
              border: s.border,
              boxShadow: s.shadowButton,
            }}
            className="text-[8px] px-2 py-1 font-bold rounded uppercase tracking-wider leading-none transition-all"
          >
            Tu Thư Hoạt Động
          </span>
        </div>
      </div>

      <div
        style={{
          boxShadow: s.shadowInner,
        }}
        className="p-3 text-[10.5px] overflow-y-auto flex-1 font-mono space-y-3 custom-scrollbar"
      >
        {histories.length > 0 ? (
          histories.map((h, i) => (
            <div
              key={i}
              style={{
                background: s.card,
                boxShadow: s.shadowButton,
                border: s.border,
              }}
              className="flex gap-2.5 p-3 rounded-xl transition-all hover:scale-[1.01]"
            >
              <span
                style={{ color: s.textMuted }}
                className="font-mono font-bold whitespace-nowrap mt-0.5"
              >
                [{new Date(h.timestamp).toLocaleTimeString("vi-VN")}]
              </span>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span
                  style={{ color: s.text }}
                  className="font-sans font-black text-xs uppercase tracking-wide truncate"
                >
                  {h.keyword || 'Văn bia khuyết danh'}
                </span>
                <span
                  style={{ color: s.textMuted }}
                  className="font-sans font-normal leading-relaxed line-clamp-2"
                >
                  {h.content}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div
            style={{ color: s.textMuted }}
            className="flex flex-col items-center justify-center h-full opacity-60 py-12 text-center"
          >
            <CheckCircle size={22} className="mb-2 opacity-50" />
            <span className="font-serif italic text-xs">Chưa có ghi chép nào được thực hiện trong phiên này.</span>
          </div>
        )}
      </div>
    </div>
  );
};
