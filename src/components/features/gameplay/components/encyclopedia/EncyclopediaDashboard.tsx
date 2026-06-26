import React, { useMemo, useState, useEffect } from "react";
import {
  Compass,
  ChevronRight,
  RefreshCw,
  Globe,
  Info
} from "lucide-react";
import { VectorData } from "../../../../../services/db/indexedDB";
import { GraphRAGService, GraphNode, GraphEdge } from "../../../../../services/ai/graph/GraphRAGService";
import { useNeumorphicTheme } from "../../../../../hooks/useNeumorphicTheme";

interface EncyclopediaDashboardProps {
  entries: VectorData[];
  onSelect: (id: string) => void;
  onAddManualWithTemplate: (template: Partial<VectorData>) => void;
  CATEGORY_MAP: Record<
    string,
    { label: string; color: string; icon: any }
  >;
  onCategoryFilterChange: (cat: string | null) => void;
  onDelete?: (id: string) => void;
  onToggleStatus?: (id: string, enabled: boolean) => void;
  campaignId?: string;
}

export const EncyclopediaDashboard: React.FC<EncyclopediaDashboardProps> = ({
  entries,
  onSelect,
  campaignId,
}) => {
  const [graphViewMode, setGraphViewMode] = useState<'constellation' | 'graphrag'>('constellation');
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [isLoadingGraph, setIsLoadingGraph] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<any | null>(null);
  
  const s = useNeumorphicTheme();

  // Load GraphRAG data from service when selected
  useEffect(() => {
    if (graphViewMode === 'graphrag' && campaignId) {
      setIsLoadingGraph(true);
      Promise.all([
        GraphRAGService.getAllNodes(campaignId),
        GraphRAGService.getAllEdges(campaignId)
      ]).then(([nodes, edges]) => {
        setGraphNodes(nodes || []);
        setGraphEdges(edges || []);
      }).catch(err => {
        console.error("Failed to load GraphRAG nodes/edges:", err);
      }).finally(() => {
        setIsLoadingGraph(false);
      });
    }
  }, [graphViewMode, campaignId]);

  // Compute normal constellation coordinates (circle-clustered stable map)
  const cosmosNodes = useMemo(() => {
    if (entries.length === 0) return [];
    
    // Select up to 18 key entries to avoid visual clutter in the astrolabe
    const visibleEntries = entries.slice(0, 18);
    const n = visibleEntries.length;
    const centerX = 200;
    const centerY = 180;

    return visibleEntries.map((entry, index) => {
      const hashCategory = (entry.category || 'world').charCodeAt(0) % 5;
      const angle = (index * 2 * Math.PI) / n;
      const radius = 95 + (hashCategory * 14) + (index % 2 === 0 ? 12 : -12);

      const cx = centerX + Math.cos(angle) * radius;
      const cy = centerY + Math.sin(angle) * radius;

      return {
        id: entry.id,
        keyword: entry.keyword || entry.title || "Untitled",
        category: entry.category || "world",
        cx,
        cy,
        entry,
        priority: entry.priority || 50,
      };
    });
  }, [entries]);

  // Compute constellation line links
  const cosmosLinks = useMemo(() => {
    const links: { x1: number; y1: number; x2: number; y2: number; id: string; strong: boolean }[] = [];
    if (cosmosNodes.length < 2) return [];

    for (let i = 0; i < cosmosNodes.length; i++) {
      const nodeA = cosmosNodes[i];
      const textA = (nodeA.entry.text || "").toLowerCase();

      for (let j = i + 1; j < cosmosNodes.length; j++) {
        const nodeB = cosmosNodes[j];
        const keywordB = (nodeB.entry.keyword || "").toLowerCase();
        const textB = (nodeB.entry.text || "").toLowerCase();
        const keywordA = (nodeA.entry.keyword || "").toLowerCase();

        const isRelated =
          (keywordB && textA.includes(keywordB)) ||
          (keywordA && textB.includes(keywordA)) ||
          nodeA.entry.relatedEntries?.includes(nodeB.id) ||
          nodeB.entry.relatedEntries?.includes(nodeA.id);

        if (isRelated) {
          const directMatch = (keywordB && textA.includes(keywordB)) || (keywordA && textB.includes(keywordA));
          links.push({
            x1: nodeA.cx,
            y1: nodeA.cy,
            x2: nodeB.cx,
            y2: nodeB.cy,
            id: `${nodeA.id}-${nodeB.id}`,
            strong: directMatch || (nodeA.category === nodeB.category),
          });
        }
      }
    }
    return links.slice(0, 35);
  }, [cosmosNodes]);

  // Compute GraphRAG stable coordinates
  const ragNodes = useMemo(() => {
    if (graphNodes.length === 0) return [];

    const visibleNodes = graphNodes.slice(0, 20);
    const n = visibleNodes.length;
    const centerX = 200;
    const centerY = 180;

    return visibleNodes.map((node, index) => {
      const hashLabel = (node.label || 'Entity').charCodeAt(0) % 5;
      const angle = (index * 2 * Math.PI) / n;
      const radius = 90 + (hashLabel * 15) + (index % 2 === 0 ? 10 : -10);

      const cx = centerX + Math.cos(angle) * radius;
      const cy = centerY + Math.sin(angle) * radius;

      return {
        id: node.id,
        name: node.name,
        label: node.label || "Entity",
        cx,
        cy,
        node,
        description: node.description || ""
      };
    });
  }, [graphNodes]);

  // Compute GraphRAG links
  const ragLinks = useMemo(() => {
    const links: { x1: number; y1: number; x2: number; y2: number; id: string; relationship: string; description: string }[] = [];
    if (ragNodes.length < 2) return [];

    graphEdges.forEach((edge) => {
      const sourceNode = ragNodes.find(n => n.id === edge.source);
      const targetNode = ragNodes.find(n => n.id === edge.target);

      if (sourceNode && targetNode) {
        links.push({
          x1: sourceNode.cx,
          y1: sourceNode.cy,
          x2: targetNode.cx,
          y2: targetNode.cy,
          id: edge.id,
          relationship: edge.relationship || "related_to",
          description: edge.description || ""
        });
      }
    });

    return links.slice(0, 30);
  }, [ragNodes, graphEdges]);

  // Astrolabe starry field background coordinates
  const starsField = useMemo(() => {
    const arr: { cx: number; cy: number; r: number; opacity: number }[] = [];
    let seed = 101;
    const pseudoRandom = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };
    for (let i = 0; i < 24; i++) {
      arr.push({
        cx: Math.floor(pseudoRandom() * 400),
        cy: Math.floor(pseudoRandom() * 360),
        r: pseudoRandom() * 1.3 + 0.4,
        opacity: pseudoRandom() * 0.6 + 0.2
      });
    }
    return arr;
  }, []);

  // Soft vintage pastel categorization colors
  const CATEGORY_COLOR_MAP: Record<string, { label: string; stroke: string; labelBg: string; text: string }> = {
    character: { label: "Nhân vật", stroke: "#1565c0", labelBg: "bg-blue-50/20 border-blue-200/30", text: "text-[#1565c0]" },
    location: { label: "Địa điểm", stroke: "#2e7d32", labelBg: "bg-emerald-50/20 border-emerald-200/30", text: "text-[#2e7d32]" },
    faction: { label: "Thế lực", stroke: "#7b1fa2", labelBg: "bg-purple-50/20 border-purple-200/30", text: "text-[#7b1fa2]" },
    item: { label: "Vật phẩm", stroke: "#b07d12", labelBg: "bg-amber-50/20 border-amber-200/30", text: "text-[#b07d12]" },
    event: { label: "Sự kiện", stroke: "#d32f2f", labelBg: "bg-red-50/20 border-red-200/30", text: "text-[#d32f2f]" },
    relationship: { label: "Mối quan hệ", stroke: "#c2185b", labelBg: "bg-pink-50/20 border-pink-200/30", text: "text-[#c2185b]" },
    rule: { label: "Luật lệ", stroke: "#6b4c35", labelBg: "bg-stone-100/20 border-stone-200/30", text: "text-[#6b4c35]" },
    law: { label: "Luật lệ", stroke: "#6b4c35", labelBg: "bg-stone-100/20 border-stone-200/30", text: "text-[#6b4c35]" },
    world: { label: "Thế giới", stroke: "#4e3d30", labelBg: "", text: "text-[#4e3d30]" },
  };

  const getMatchedColor = (category: string) => {
    const config = CATEGORY_COLOR_MAP[category] || CATEGORY_COLOR_MAP.world;
    // Overlap the border and background using the hook's standard definitions
    return {
      ...config,
      // If we are in another theme, use dynamic values over hardcoded pastel colors for better legibility
      stroke: s.accent,
      labelBg: s.badgeBg,
      text: s.text,
    };
  };

  return (
    <div
      style={{
        color: s.text,
      }}
      className="w-full h-full flex flex-col md:flex-row gap-5 select-none p-1 font-sans transition-all duration-300"
    >
      {/* LEFT COLUMN: The Celestial Astrolabe Graph Arena */}
      <div
        style={{
          background: s.flatBg,
          border: s.border,
          boxShadow: s.shadowOuter,
        }}
        className="flex-1 min-h-[320px] rounded-2xl relative overflow-hidden flex flex-col transition-all duration-300"
      >
        {/* Toggle View Mode Header */}
        <div
          style={{
            background: s.convexBg,
            borderBottom: s.border,
          }}
          className="px-3.5 py-2.5 flex items-center justify-between shrink-0 z-10"
        >
          <div className="flex items-center gap-2">
            <Compass size={13} style={{ color: s.accent }} className="animate-[spin_120s_linear_infinite]" />
            <span style={{ color: s.text }} className="text-[10px] uppercase font-sans font-black tracking-wider leading-none">
              {graphViewMode === 'constellation' ? "MỘT BẢN KHU CHÒM SAO (ASTROLABE)" : "TRUY SƠ ĐỒ THỰC THỂ (GRAPHRAG)"}
            </span>
          </div>

          <div
            style={{
              background: s.bg,
              border: s.border,
              boxShadow: s.shadowInner,
            }}
            className="flex p-0.5 rounded-lg shrink-0"
          >
            <button
              onClick={() => {
                setGraphViewMode('constellation');
                setHoveredNode(null);
              }}
              style={graphViewMode === 'constellation' ? {
                background: s.accent,
                color: '#ffffff',
              } : {
                color: s.textMuted,
              }}
              className="px-2.5 py-1 text-[8px] font-sans font-black uppercase rounded-md transition-all cursor-pointer"
            >
              Cố Định
            </button>
            <button
              onClick={() => {
                setGraphViewMode('graphrag');
                setHoveredNode(null);
              }}
              style={graphViewMode === 'graphrag' ? {
                background: s.accent,
                color: '#ffffff',
              } : {
                color: s.textMuted,
              }}
              className="px-2.5 py-1 text-[8px] font-sans font-black uppercase rounded-md transition-all cursor-pointer"
            >
              GraphRAG
            </button>
          </div>
        </div>

        {/* Constellation Starfield Plotting */}
        {(graphViewMode === 'graphrag' ? graphNodes.length === 0 : entries.length === 0) ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-transparent">
            <Compass size={32} style={{ color: s.accent, opacity: 0.4 }} className="mb-2" />
            <h4 style={{ color: s.text }} className="font-serif font-black text-[10px] uppercase tracking-wider">
              Đất Thiên Hoang Sơ
            </h4>
            <p style={{ color: s.textMuted }} className="text-[9px] max-w-[180px] mt-1.5 leading-relaxed font-serif italic">
              Chưa cảm nhận được hạt bối cảnh tương thích. Hãy gieo mầm hoặc nạp dữ liệu ở tab Duyệt!
            </p>
          </div>
        ) : (
          <div className="flex-1 relative w-full h-[270px] overflow-hidden flex items-center justify-center">
            {isLoadingGraph && (
              <div
                style={{
                  backgroundColor: s.bg,
                  opacity: 0.85,
                }}
                className="absolute inset-0 flex items-center justify-center z-20"
              >
                <RefreshCw className="animate-spin" style={{ color: s.accent }} size={20} />
              </div>
            )}

            <svg className="w-full h-full min-h-[270px]" viewBox="0 0 400 360">
              {/* Concentric planetary background circles */}
              <circle cx="200" cy="180" r="110" fill="none" stroke={s.accent} strokeOpacity="0.1" strokeWidth="1" strokeDasharray="3 5" />
              <circle cx="200" cy="180" r="145" fill="none" stroke={s.accent} strokeOpacity="0.06" strokeWidth="0.5" />
              <circle cx="200" cy="180" r="70" fill="none" stroke={s.accent} strokeOpacity="0.15" strokeWidth="0.5" strokeDasharray="1 3" />

              {/* Background ambient stars */}
              {starsField.map((sField, i) => (
                <circle
                  key={`star_${i}`}
                  cx={sField.cx}
                  cy={sField.cy}
                  r={sField.r}
                  fill={s.accent}
                  opacity={sField.opacity * 0.4}
                />
              ))}

              {/* Draw wires links */}
              {graphViewMode === 'graphrag' ? (
                <g>
                  {ragLinks.map((link) => (
                    <line
                      key={link.id}
                      x1={link.x1}
                      y1={link.y1}
                      x2={link.x2}
                      y2={link.y2}
                      stroke={s.accent}
                      strokeOpacity="0.32"
                      strokeWidth="1.2"
                    />
                  ))}
                </g>
              ) : (
                <g>
                  {cosmosLinks.map((link) => (
                    <line
                      key={link.id}
                      x1={link.x1}
                      y1={link.y1}
                      x2={link.x2}
                      y2={link.y2}
                      stroke={link.strong ? s.accent : s.textMuted}
                      strokeOpacity={link.strong ? "0.38" : "0.18"}
                      strokeWidth={link.strong ? "1.5" : "0.8"}
                      strokeDasharray={link.strong ? "0" : "2 3"}
                    />
                  ))}
                </g>
              )}

              {/* Draw Node components */}
              {graphViewMode === 'graphrag' ? (
                <g>
                  {ragNodes.map((node) => {
                    const isNodeHovered = hoveredNode && hoveredNode.id === node.id;
                    const strokeColor = s.accent;

                    return (
                      <g
                        key={node.id}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredNode(node)}
                        onMouseLeave={() => setHoveredNode(null)}
                      >
                        <circle
                          cx={node.cx}
                          cy={node.cy}
                          r={isNodeHovered ? 12 : 8}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth="1.5"
                          strokeOpacity={isNodeHovered ? "0.85" : "0.4"}
                          className="transition-all duration-200"
                        />
                        <circle
                          cx={node.cx}
                          cy={node.cy}
                          r={5.5}
                          fill={strokeColor}
                          className="transition-all duration-200"
                        />
                        <circle
                          cx={node.cx}
                          cy={node.cy}
                          r="1.5"
                          fill="#ffffff"
                        />
                        <text
                          x={node.cx}
                          y={node.cy + 15}
                          textAnchor="middle"
                          fill={s.text}
                          className="text-[8px] font-sans font-bold pointer-events-none select-none"
                        >
                          {node.name.length > 9 ? `${node.name.slice(0, 8)}…` : node.name}
                        </text>
                      </g>
                    );
                  })}
                </g>
              ) : (
                <g>
                  {cosmosNodes.map((node) => {
                    const isNodeHovered = hoveredNode && hoveredNode.id === node.id;
                    const styleConfig = getMatchedColor(node.category);
                    
                    const sizeMultiplier = node.priority >= 90 ? 7 :
                                            node.priority >= 75 ? 6 :
                                            node.priority >= 50 ? 5 : 4.2;

                    return (
                      <g
                        key={node.id}
                        className="cursor-pointer"
                        onClick={() => onSelect(node.id)}
                        onMouseEnter={() => setHoveredNode(node)}
                        onMouseLeave={() => setHoveredNode(null)}
                      >
                        {/* Outer hover ripple indicator */}
                        <circle
                          cx={node.cx}
                          cy={node.cy}
                          r={isNodeHovered ? sizeMultiplier + 6 : sizeMultiplier + 3}
                          fill="none"
                          stroke={styleConfig.stroke}
                          strokeWidth="1.3"
                          strokeOpacity={isNodeHovered ? "0.85" : "0.3"}
                          className="transition-all duration-200"
                        />
                        {/* Core star center */}
                        <circle
                          cx={node.cx}
                          cy={node.cy}
                          r={sizeMultiplier}
                          fill={styleConfig.stroke}
                          stroke="#ffffff"
                          strokeWidth="0.8"
                          className="transition-all duration-200"
                        />
                        {/* Text label underneath */}
                        <text
                          x={node.cx}
                          y={node.cy + sizeMultiplier + 11}
                          textAnchor="middle"
                          fill={isNodeHovered ? s.text : s.textMuted}
                          className="text-[8px] font-sans font-bold pointer-events-none select-none transition-colors"
                        >
                          {node.keyword.length > 10 ? `${node.keyword.slice(0, 9)}…` : node.keyword}
                        </text>
                      </g>
                    );
                  })}
                </g>
              )}
            </svg>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: The Interactive Floating Details Panel */}
      <div
        style={{
          background: s.card,
          border: s.border,
          boxShadow: s.shadowOuter,
        }}
        className="w-full md:w-[220px] rounded-2xl p-4 flex flex-col justify-between transition-all duration-300"
      >
        {hoveredNode ? (
          <div className="flex-1 flex flex-col justify-start text-left space-y-3 animate-fadeIn">
            <div>
              <span style={{ color: s.textMuted }} className="text-[8px] font-mono font-black uppercase tracking-wider block">Tiêu để hội chẩn</span>
              <h4 style={{ color: s.text }} className="text-sm font-serif font-black leading-tight">
                {graphViewMode === 'graphrag' ? hoveredNode.name : hoveredNode.keyword}
              </h4>
            </div>

            {/* Badge Info */}
            <div className="flex flex-wrap gap-1">
              <span
                style={{
                  background: s.badgeBg,
                  color: s.accent,
                  border: `1px solid ${s.badgeBorder}`,
                }}
                className="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider scale-95"
              >
                {graphViewMode === 'graphrag' ? hoveredNode.label : getMatchedColor(hoveredNode.category).label}
              </span>

              {graphViewMode !== 'graphrag' && (
                <span
                  style={{
                    backgroundColor: s.bg,
                    color: s.textMuted,
                    borderColor: s.borderMuted,
                  }}
                  className="px-1.5 py-0.1 border rounded text-[8px] font-bold"
                >
                  PR: {hoveredNode.priority}
                </span>
              )}
            </div>

            {/* Snippet text */}
            <div
              style={{
                backgroundColor: s.bg,
                border: s.border,
                boxShadow: s.cardInnerShadow,
                color: s.text,
              }}
              className="text-[9px] leading-relaxed line-clamp-6 italic p-2 rounded-xl transition-all select-all font-serif"
            >
              {graphViewMode === 'graphrag'
                ? hoveredNode.description || "Thực thể liên thông thuộc sơ đồ khối RAG của vương triều..."
                : (hoveredNode.entry.text || "Chưa có lời lược kể... Nhấn vào nút xem chi tiết để tu bổ văn sự.")}
            </div>

            {graphViewMode !== 'graphrag' && (
              <span style={{ color: s.accent }} className="text-[8px] font-bold block pt-1 animate-pulse">
                ✦ Nhấp chuột để Xem trực dệt Điển thư
              </span>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-3 opacity-90">
            <Compass size={28} style={{ color: s.accent, opacity: 0.45 }} className="mb-2.5 animate-[spin_50s_linear_infinite]" />
            <span style={{ color: s.text }} className="font-serif font-black text-[10.5px] uppercase tracking-wider block">Giao Cảm Chòm Sao</span>
            <p style={{ color: s.textMuted }} className="text-[9.5px]/relaxed mt-1.5 max-w-[160px] font-serif italic">
              Di chuột (Hover) vòng từ ngữ vào các tinh điểm tinh đồ để thu thập nhanh thông bản ghi tương thuộc thế giới.
            </p>
          </div>
        )}

        {/* Basic Footnotes block */}
        <div style={{ borderTop: s.border }} className="pt-3 mt-3 text-center opacity-80">
          <span style={{ color: s.textMuted }} className="text-[8px] uppercase tracking-widest font-black">- AI Bách Khoa Toàn Thư -</span>
        </div>
      </div>
    </div>
  );
};
