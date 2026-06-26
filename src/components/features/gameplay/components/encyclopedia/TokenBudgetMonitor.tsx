import React from 'react';
import { VectorData } from '../../../../../services/db/indexedDB';
import { BarChart3 } from 'lucide-react';
import { useAppStore } from '../../../../../store/appStore';
import { useNeumorphicTheme } from '../../../../../hooks/useNeumorphicTheme';

interface TokenBudgetMonitorProps {
  entries: VectorData[];
}

export const TokenBudgetMonitor: React.FC<TokenBudgetMonitorProps> = ({ entries }) => {
  const { activeWorld } = useAppStore();
  const s = useNeumorphicTheme();
  
  // Align with gameplay service (maxContextTokens represents the overall token budget)
  const totalBudget = activeWorld?.config?.contextConfig?.maxContextTokens || 60000;
  
  // Rough token estimation (3.5 chars per token for Latin/Vietnamese to align with service.ts)
  const estimateTokens = (text: string) => Math.ceil((text || '').length / 3.5);

  const characterCardStr = JSON.stringify(activeWorld?.player || {}) + JSON.stringify(activeWorld?.entities || {});
  const characterCard = estimateTokens(characterCardStr);

  const conversationStr = JSON.stringify(activeWorld?.savedState?.history || []);
  const conversation = estimateTokens(conversationStr);

  const alwaysEntries = entries
    .filter(e => e.isEnabled !== false && (e.triggerMode === 'always' || e.isSticky))
    .reduce((acc, e) => acc + estimateTokens(e.text || ''), 0);

  const triggeredPool = entries
    .filter(e => e.isEnabled !== false && e.triggerMode !== 'always' && !e.isSticky)
    .reduce((acc, e) => acc + estimateTokens(e.text || ''), 0);

  // We only count what is currently guaranteed to be injected:
  const totalUsed = characterCard + alwaysEntries + conversation;

  // Percentage widths
  const charWidth = Math.min((characterCard / totalBudget) * 100, 100);
  const alwaysWidth = Math.min((alwaysEntries / totalBudget) * 100, 100);
  const chatWidth = Math.min((conversation / totalBudget) * 100, 100);
  
  return (
    <div
      id="token-budget-monitor-root"
      style={{
        background: s.bg,
        color: s.text,
        border: s.border,
        boxShadow: s.shadowOuter,
      }}
      className="flex flex-col h-full rounded-2xl overflow-hidden font-sans transition-all duration-300"
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
          <BarChart3 size={13} style={{ color: s.accent }} />
          Dung lượng Thư tịch (Tokens)
        </h3>
        <span
          style={{
            background: s.accent,
            color: '#ffffff',
          }}
          className="text-[9px] font-mono font-bold px-2 py-0.8 rounded-lg shadow-sm leading-none"
        >
          {totalUsed.toLocaleString()} / {totalBudget.toLocaleString()}
        </span>
      </div>
      
      <div className="p-4 text-xs flex flex-col justify-center flex-1 gap-4">
        {/* Sunken Neumorphic Progress Bar Well with cozy theme coloring */}
        <div
          style={{
            boxShadow: s.shadowInner,
            border: s.border,
          }}
          className="w-full h-4 rounded-xl overflow-hidden flex p-[1.5px] relative select-none"
        >
          <div
            style={{
              width: `${charWidth}%`,
              backgroundColor: s.accent,
              opacity: 0.9,
            }}
            className="h-full rounded-l-lg border-r border-white/20 transition-all duration-500"
            title="Character & Entities"
          />
          <div
            style={{
              width: `${alwaysWidth}%`,
              backgroundColor: s.text,
              opacity: 0.5,
            }}
            className="h-full border-r border-white/20 transition-all duration-500"
            title="Always Active Entries"
          />
          <div
            style={{
              width: `${chatWidth}%`,
              backgroundColor: s.text,
              opacity: 0.85,
            }}
            className="h-full rounded-r-lg transition-all duration-500"
            title="Chat Logs"
          />
        </div>
 
        {/* Soft embossed neumorphic legend cards */}
        <div className="flex flex-col gap-2 text-[9px] font-mono font-bold overflow-y-auto max-h-[140px] custom-scrollbar pr-1">
          <div
            style={{
              backgroundColor: s.card,
              border: s.border,
              boxShadow: s.shadowButton,
              color: s.text,
            }}
            className="flex justify-between items-center px-3 py-2 rounded-xl transition-all hover:scale-[1.015]"
          >
            <span className="flex items-center gap-1.5">
              <span style={{ backgroundColor: s.accent }} className="w-2.5 h-2.5 rounded opacity-90" />
              Bản thể nhân vật (NPC Sheet)
            </span> 
            <span className="font-extrabold" style={{ color: s.accent }}>{characterCard.toLocaleString()}</span>
          </div>

          <div
            style={{
              backgroundColor: s.card,
              border: s.border,
              boxShadow: s.shadowButton,
              color: s.text,
            }}
            className="flex justify-between items-center px-3 py-2 rounded-xl transition-all hover:scale-[1.015]"
          >
            <span className="flex items-center gap-1.5">
              <span style={{ backgroundColor: s.text }} className="w-2.5 h-2.5 rounded opacity-50" />
              Luôn Kích hoạt (Always Core)
            </span> 
            <span className="font-extrabold">{alwaysEntries.toLocaleString()}</span>
          </div>

          <div
            style={{
              backgroundColor: s.card,
              border: s.border,
              boxShadow: s.shadowButton,
              color: s.text,
            }}
            className="flex justify-between items-center px-3 py-2 rounded-xl transition-all hover:scale-[1.015]"
          >
            <span className="flex items-center gap-1.5">
              <span style={{ backgroundColor: s.text }} className="w-2.5 h-2.5 rounded opacity-85" />
              Nhật ký tấu thoại (Dialogs)
            </span> 
            <span className="font-extrabold">{conversation.toLocaleString()}</span>
          </div>

          <div
            style={{
              backgroundColor: s.card,
              border: s.border,
              opacity: 0.7,
              borderStyle: 'dashed',
              color: s.text,
            }}
            className="flex justify-between items-center px-3 py-2 rounded-xl"
            title="Dữ kiện dã thiết tiềm ẩn, chỉ được thắp sấy khi có tương đồng"
          >
            <span className="flex items-center gap-1.5">
              <span style={{ borderColor: s.text }} className="w-2.5 h-2.5 rounded-full min-w-[10px] bg-transparent border" />
              Cảm biến Chờ kích thắp (Dynamic)
            </span> 
            <span className="font-extrabold opacity-80">{triggeredPool.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
