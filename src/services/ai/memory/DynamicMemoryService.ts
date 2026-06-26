import { ChatMessage, AppSettings, WorldData } from "../../../types";
import { getAiClient } from "../client";
import { vectorService } from "../vectorService";
import { storyBibleService } from "../storyBibleService";
import { GraphRAGService } from "../graph/GraphRAGService";

export const DynamicMemoryService = {
  /**
   * Memory Consolidation Engine (MCE): Layer 4 cross-layer memories reconciler
   */
  async consolidateAllMemoryLayers(
    worldData: WorldData,
    settings: AppSettings,
    campaignId: string
  ): Promise<string | null> {
    if (!settings.enableVectorMemory) return null;
    console.log("[MemoryConsolidationEngine] Starting cross-layer coherence consolidation...");

    try {
      const aiClient = getAiClient(settings);
      
      // 1. Fetch current World Summary / Core Memory
      const currentSummary = worldData.summary || "";

      // 2. Fetch all StoryBible entries (Cap to most active/recent or sticky to save tokens)
      const sbEntries = await storyBibleService.getAllEntries(campaignId);
      // Sort to prioritize sticky memory and recently updated ones
      const prioritizedSbEntries = sbEntries
        .sort((a, b) => {
           if (a.sticky !== b.sticky) return a.sticky ? -1 : 1;
           return b.updatedAt - a.updatedAt;
        })
        .slice(0, 50); // Hard limit to top 50 active items
      const sbContext = prioritizedSbEntries.map(e => `[Bản ghi: ${e.title}] (${e.category})\n${e.content}`).join("\n\n");

      // 3. Fetch all GraphRAG Nodes and Edges (Cap to prevent token bloat)
      const graphNodes = await GraphRAGService.getAllNodes(campaignId);
      const graphEdges = await GraphRAGService.getAllEdges(campaignId);
      
      const prioritizedNodes = [...graphNodes].slice(-100); // Last 100 nodes added or modified
      const prioritizedEdges = [...graphEdges].slice(-100);

      const graphContext = `
Nodes:
${prioritizedNodes.map(n => `- ${n.name} (${n.label}): ${n.description}`).join("\n")}

Edges:
${prioritizedEdges.map(e => `- ${e.source} --(${e.relationship})--> ${e.target}: ${e.description}`).join("\n")}
      `.trim();

      // Assemble all sources into a prompt for the AI to analyze, find conflicts, and output a canonical ground-truth state!
      const prompt = `Bạn là Memory Consolidation Engine (MCE) - Hệ thống đồng bộ hóa ký ức bậc 4 cao cấp nhất của lõi ARK.
Nhiệm vụ của bạn là đọc tất cả các nguồn dữ liệu bộ nhớ khác nhau (hiện đang được lưu trữ trong Vector RAG, StoryBible, và GraphRAG) dưới đây để phân tích, đối chiếu, giải quyết mọi mâu thuẫn (như thay đổi địa điểm, nhân vật bị chết nhưng vẫn được ghi âm sinh tồn, chỉ số sức mạnh mâu thuẫn...) và hợp nhất thành một BẢN ĐỒ KÝ ỨC CHUẨN HOÁ (Canonical World State).

Các dữ liệu nguồn ký ức:

--------------------
[1. TÓM TẮT CỐT TRUYỆN HIỆN TẠI]
${currentSummary || "Chưa có"}

--------------------
[2. CÁC BẢN GHI TRONG STORYBIBLE (SỰ KIỆN & NHÂN VẬT)]
${sbContext || "Chưa có bản ghi"}

--------------------
[3. MẠNG QUAN HỆ CẤU TRÚC GRAPHRAG (THỰC THỂ & LIÊN KẾT)]
${graphContext || "Chưa có đồ thị"}

--------------------

Yêu cầu đầu ra:
1. Phân tích đối soát xem có mâu thuẫn hay không. Nếu có, hãy dùng dữ liệu gần đây nhất làm chuẩn (ground truth).
2. Viết lại một "Hồ sơ thế giới chuẩn hóa" (Canonical World State / Core Memory Ground Truth), bao gồm phân đoạn:
   - TIẾN TRÌNH CỐT TRUYỆN CANON CHUẨN (Tóm tắt chuỗi sự kiện chính không mâu thuẫn).
   - TRẠNG THÁI HIỆN TẠI CỦA THẾ GIỚI & NHÂN VẬT CHÍNH (Vị trí hiện tại, đồng hành, mục tiêu hành động).
   - MẠNG QUAN HỆ & THÀNH TỰU (Ai còn sống, ai đã chết, quan hệ thù địch hay đồng minh).
3. Hợp nhất thành bản đồ ký ức cực kỳ chi tiết, không giới hạn độ dài, giữ lại mọi tình tiết quan trọng.
4. Ngôn ngữ: Tiếng Việt. Chỉ trả về bản ký ức canonic, không thêm lời chào, hướng dẫn hay markdown rườm rà ngoài nội dung chính.`;

      const response = await aiClient.models.generateContent({
        model: settings.aiModel || "gemini-3.1-pro-preview",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          temperature: 0.35,
          maxOutputTokens: 8192,
        },
      });

      const canonicalStateText = response.text?.trim() || "";
      if (!canonicalStateText) return null;

      console.log("[MemoryConsolidationEngine] Consolidated Canonical State Generated:", canonicalStateText);

      // Save this canonical memory state as a sticky canonical ground truth in StoryBible
      await storyBibleService.saveEntry({
        id: "canonical-ground-truth",
        title: "Ký ức Canonic Chuẩn hóa (Canonical Ground Truth)",
        category: "world",
        content: canonicalStateText,
        keywords: ["ground truth", "canonical state", "ký ức chuẩn hóa", "summary"],
        tags: ["canonical_state"],
        triggerMode: "always",
        priority: 500, // Highest priority
        weight: 2.0,
        sticky: true,
        stickyTurns: 5, // Active for 5 turns explicitly then refreshed or queried
        position: "system_top",
        depth: 0,
        timesTriggered: 0,
        confidence: 1.0,
        source: "auto",
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        changelog: ["Reconciled & Refined by Memory Consolidation Engine"]
      }, campaignId, settings, true);

      // Save to vector directly as well so RAG catches it immediately
      await vectorService.saveVector(
        `canonical-vector-${Date.now()}`,
        canonicalStateText,
        "model",
        settings
      );

      return canonicalStateText;
    } catch (err) {
      console.error("[MemoryConsolidationEngine] Consolidation failed:", err);
      return null;
    }
  },

  /**
   * Run background summarization: Nạp "Ký ức cốt lõi" vào VectorDB và tóm tắt cốt truyện.
   */
  async processCoreMemories(
    recentHistory: ChatMessage[],
    worldData: WorldData,
    settings: AppSettings,
    campaignId: string
  ): Promise<string | null> {
    if (!settings.enableVectorMemory) return null;
    
    // We only summarize if we have enough recent history (e.g., 10 turns = 20 messages)
    if (recentHistory.length < 10) return null;

    console.log("[DynamicMemoryService] Starts summarizing core memories in background...");

    try {
      const aiClient = getAiClient(settings);
      
      const historyText = recentHistory
        .map(m => `[${m.role === 'user' ? 'Người chơi' : 'Hệ thống'}]: ${m.text.replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, "").trim()}`)
        .join("\n\n");

      // Prompt for Core Memory summarization
      const prompt = `Phân tích lịch sử diễn biến trong các lượt vừa qua cùng tóm tắt cốt truyện cũ (nếu có).
Hãy tóm tắt ngắn gọn các "Ký ức cốt lõi" (Core Memories), bao gồm:
1. [TIẾN TRÌNH CỐT TRUYỆN]: Những sự kiện chính đã xảy ra một cách trọn vẹn.
2. [THAY ĐỔI TRẠNG THÁI/QUAN HỆ]: Các thay đổi về nhân vật, vật phẩm, thù hận, liên minh.
3. [MỤC TIÊU & XUNG ĐỘT ĐANG MỞ (OPEN THREADS)]: Các nhiệm vụ chưa hoàn thành, các bí ẩn chưa có lời giải, các mối đe dọa đang lơ lửng. (Phần này RẤT QUAN TRỌNG để AI tiếp theo biết cần phải điều hướng câu chuyện đi đâu).

Viết dưới dạng báo cáo chi tiết, đầy đủ mọi sự kiện, tình tiết nhỏ trọn vẹn nhất có thể, nhớ thật dai và đầy đủ.

Tóm tắt cũ (nếu có):
${worldData.summary || "Chưa có"}

Lịch sử giao tiếp gần đây:
${historyText}

Chỉ trả về phần chữ tóm tắt chia làm 3 mục rõ ràng như yêu cầu, không thêm lời chào, bình luận hay mô tả dư thừa.`;

      let activeProxy = settings.proxies?.find(
        (p) => p.id === settings.activeProxyId,
      );
      if (!activeProxy && (settings.proxyEnabled || settings.proxyUrl)) {
        activeProxy = {
          model: settings.proxyModel || "",
        } as any;
      }

      const modelToUseBg = (settings.aiMode === "hybrid" && settings.backgroundAiModel && !activeProxy?.model)
        ? settings.backgroundAiModel
        : (activeProxy?.model || settings.aiModel || "gemini-3.1-pro-preview");

      const response = await aiClient.models.generateContent({
        model: modelToUseBg,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          temperature: 0.3,
          maxOutputTokens: 8192,
        },
      });

      let coreMemoryText = response.text?.trim() || "";
      if (!coreMemoryText) return null;

      // Xóa markdown, thẻ kỹ thuật nếu có
      coreMemoryText = coreMemoryText.replace(/```(json|txt)?\n?|```/g, "").trim();

      console.log("[DynamicMemoryService] Core Memory Generated: ", coreMemoryText);

      // Save into VectorDB as Core Memory (StoryBible Fact)
      await storyBibleService.saveEntry({
        id: `core-mem-${Date.now()}`,
        title: `Ký ức cốt lõi (Lượt ${Math.floor(recentHistory.length / 2)})`,
        category: "event",
        content: coreMemoryText,
        keywords: ["trí nhớ", "core memory", "tóm tắt", "sự kiện chính"],
        tags: ["core_memory"],
        triggerMode: "semantic",
        priority: 100, // Very important
        weight: 1.5,
        sticky: false,
        stickyTurns: 0,
        position: "before_history",
        depth: 0,
        timesTriggered: 0,
        confidence: 1.0,
        source: "auto",
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        changelog: ["Generated by DynamicMemoryService"]
      }, campaignId, settings, true);

      // Save to vector directly as well so RAG catches it immediately
      await vectorService.saveVector(
        `core-vector-${Date.now()}`,
        coreMemoryText,
        "model",
        settings
      );

      // Return the new summary
      return coreMemoryText;

    } catch (e) {
      console.error("[DynamicMemoryService] Core memory summarization failed:", e);
      return null;
    }
  },

  /**
   * Evaluate Persona Drift using StoryBible and recent history
   */
  async checkPersonaDrift(
    recentHistory: ChatMessage[],
    worldData: WorldData,
    settings: AppSettings,
    campaignId: string
  ): Promise<{ hasDrift: boolean; reason: string } | null> {
    if (!settings.enableVectorMemory) return null;
    if (recentHistory.length < 5) return null; // Need some context

    console.log("[DynamicMemoryService] Starts Persona Drift Check...");

    try {
      const aiClient = getAiClient(settings);
      
      const historyText = recentHistory
        .map(m => `[${m.role === 'user' ? 'Người chơi' : 'Hệ thống'}]: ${m.text.replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, "").trim()}`)
        .join("\n\n");

      // Dynamic sorting of characters by occurrence counts in recent text (expanding coverage to 5 most active NPCs)
      const recentTextForScoring = recentHistory.map((m) => m.text).join(" ").toLowerCase();
      const sortedEntities = [...(worldData.entities || [])]
        .filter(e => e.type === 'NPC')
        .sort((a, b) => {
          let countA = 0;
          let countB = 0;
          try {
            const escapedA = a.name.toLowerCase().replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
            const escapedB = b.name.toLowerCase().replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
            countA = (recentTextForScoring.match(new RegExp(escapedA, "g")) || []).length;
            countB = (recentTextForScoring.match(new RegExp(escapedB, "g")) || []).length;
          } catch (_) {}
          return countB - countA;
        });

      // Select active characters or fall back to first few
      const activeEntities = sortedEntities.filter(e => {
        try {
          const escaped = e.name.toLowerCase().replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
          return (recentTextForScoring.match(new RegExp(escaped, "g")) || []).length > 0;
        } catch (_) {
          return false;
        }
      });

      const entitiesToCheck = activeEntities.length > 0 
        ? activeEntities.slice(0, 5) 
        : sortedEntities.slice(0, 3);

      // Extract Persona context
      const entitiesContext = entitiesToCheck.map(e => `Nhân vật: ${e.name}\nTính cách/Đặc điểm: ${e.personality || e.description}`).join("\n\n");

      const prompt = `Bạn là Persona Consistency Checker.
Hãy so sánh những hành động/lời thoại của các nhân vật chính trong lịch sử gần đây với hồ sơ tính cách (Persona) gốc rễ của họ.
Hồ sơ tính cách gốc:
${entitiesContext}

Lịch sử giao tiếp gần đây:
${historyText}

Nhiệm vụ: Phân tích xem có dấu hiệu "OOC" (Out Of Character - Đi lạc khỏi tính cách gốc) ở phần người kể chuyện/Hệ thống ảo không. Đặc biệt chú ý nhân vật chính.
Nếu CÓ: Trả về JSON { "hasDrift": true, "reason": "(giải thích ngắn gọn 1-2 câu về sự sai lệch)" }
Nếu KHÔNG: Trả về JSON { "hasDrift": false, "reason": "" }
Chỉ trả về JSON hợp lệ.`;

      let activeProxy = settings.proxies?.find(
        (p) => p.id === settings.activeProxyId,
      );
      if (!activeProxy && (settings.proxyEnabled || settings.proxyUrl)) {
        activeProxy = {
          model: settings.proxyModel || "",
        } as any;
      }

      const modelToUseBg = (settings.aiMode === "hybrid" && settings.backgroundAiModel && !activeProxy?.model)
        ? settings.backgroundAiModel
        : (activeProxy?.model || settings.aiModel || "gemini-2.5-flash");

      const response = await aiClient.models.generateContent({
        model: modelToUseBg,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          temperature: 0.1,
          responseMimeType: "application/json"
        },
      });

      const text = response.text?.trim() || "";
      if (!text) return null;
      const parsed = JSON.parse(text);
      
      if (parsed.hasDrift) {
         // Log to StoryBible as an anomaly to self-correct
         await storyBibleService.saveEntry({
            id: `drift-${Date.now()}`,
            title: `Cảnh báo OOC (Lượt ${Math.floor(recentHistory.length / 2)})`,
            category: "rule",
            content: `Hệ thống phát hiện dấu hiệu Out Of Character: ${parsed.reason}. HÃY TỰ ĐIỀU CHỈNH LẠI HÀNH VI VÀ LỜI NÓI CHO ĐÚNG VỚI TÍNH CÁCH GỐC.`,
            keywords: ["ooc", "cảnh báo", "nhân vật", "drift"],
            tags: ["system_alert"],
            triggerMode: "always",
            priority: 200, 
            weight: 2.0,
            sticky: true,
            stickyTurns: 3, 
            position: "system_top",
            depth: 0,
            timesTriggered: 0,
            confidence: 1.0,
            source: "auto",
            version: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            changelog: ["Generated by Persona Drift Checker"]
          }, campaignId, settings, true);
      }

      return parsed;
    } catch (e) {
      console.error("[DynamicMemoryService] Persona drift check failed:", e);
      return null;
    }
  },

  /**
   * Exponential backoff retry handler for resilient background tasks
   */
  async retryTask<T>(taskName: string, fn: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (retries <= 0) {
        console.error(`[DynamicMemoryService] Task "${taskName}" failed after all retries. Logging failure flags for future healing.`);
        try {
          const queueKey = "ark_failed_memory_tasks";
          const currentQueue = JSON.parse(localStorage.getItem(queueKey) || "[]");
          currentQueue.push({ taskName, timestamp: Date.now() });
          if (currentQueue.length > 20) {
            currentQueue.shift();
          }
          localStorage.setItem(queueKey, JSON.stringify(currentQueue));
        } catch (_) {}
        throw err;
      }
      console.warn(`[DynamicMemoryService] Task "${taskName}" failed: ${err instanceof Error ? err.message : String(err)}. Retrying in ${delay}ms... (Remaining retries: ${retries})`);
      await new Promise(r => setTimeout(r, delay));
      return this.retryTask(taskName, fn, retries - 1, delay * 2);
    }
  },

  async autoUpdateBaseProfileData(
    history: ChatMessage[],
    activeWorld: WorldData,
    settings: AppSettings,
  ): Promise<{ entities?: Entity[], player?: Partial<CharacterSheet> } | null> {
    try {
      const recentHistory = history.slice(-4).map(m => `[${m.role}] ${m.text}`).join("\n");
      const playerApp = activeWorld.player?.appearance || "";
      const entityApps = (activeWorld.entities || []).map(e => ({ id: e.id, name: e.name, description: e.description || "" }));

      const prompt = `Phân tích đoạn chat gần đây và cập nhật ngoại hình/trang bị của nhân vật nếu có thay đổi (chẳng hạn như thay quần áo, bị thương nặng, nhận trang bị mới).
Thay đổi chỉ tính nếu đó là sự kiện hiển nhiên, có giá trị lâu dài.
Nội dung chat gần đây:
${recentHistory}

Tình trạng ngoại hình/trang phục HIỆN TẠI:
- User (Người chơi): ${playerApp}
${entityApps.map(e => `- [${e.name}] (${e.id}): ${e.description}`).join("\n")}

Nếu phát hiện có sự thay đổi ngoại hình, quần áo hoặc trang bị CỐT LÕI đang mặc/mang, hãy trả về JSON:
{
  "hasChanges": true,
  "playerUpdate": "Cập nhật lại câu mô tả ngoại hình/trang phục người chơi...", // Hoặc null nếu không đổi
  "entitiesUpdate": [
    { "id": "...", "description": "Cập nhật lại câu mô tả ngoại hình/trang phục của NPC này..." }
  ]
}

- KHÔNG tự bịa ra nếu chat không đề cập. Nếu không có ai thay quần áo hoặc thay đổi hình thể, trả về { "hasChanges": false }.
- Chỉ trả về chuỗi JSON hợp lệ.`;

      let activeProxy = settings.proxies?.find(
        (p) => p.id === settings.activeProxyId,
      );
      if (!activeProxy && (settings.proxyEnabled || settings.proxyUrl)) {
        activeProxy = {
          model: settings.proxyModel || "",
        } as any;
      }
      const modelToUseBg = (settings.aiMode === "hybrid" && settings.backgroundAiModel && !activeProxy?.model)
        ? settings.backgroundAiModel
        : (activeProxy?.model || settings.aiModel || "gemini-3.5-flash");

      const aiClient = getAiClient(settings);
      const response = await aiClient.models.generateContent({
        model: modelToUseBg,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      });

      const text = response.text?.trim() || "";
      if (!text) return null;
      
      const parsed = JSON.parse(text);
      if (!parsed.hasChanges) return null;

      const result: { entities?: Entity[], player?: Partial<CharacterSheet> } = {};

      if (parsed.playerUpdate) {
        result.player = {
          ...activeWorld.player,
          appearance: parsed.playerUpdate
        };
      }

      if (parsed.entitiesUpdate && Array.isArray(parsed.entitiesUpdate)) {
        const newEntities = [...activeWorld.entities];
        let entityChanged = false;
        for (const update of parsed.entitiesUpdate) {
          const idx = newEntities.findIndex(e => e.id === update.id);
          if (idx !== -1 && update.description) {
            newEntities[idx] = { ...newEntities[idx], description: update.description };
            entityChanged = true;
          }
        }
        if (entityChanged) {
          result.entities = newEntities;
        }
      }

      return result;
    } catch (e) {
      console.warn("[DynamicMemoryService] autoUpdateBaseProfileData failed:", e);
      return null;
    }
  },

  /**
   * Analyzes state health and optionally runs a healing MCE cycle if background steps had failed
   */
  async runFailedTasksQueue(settings: AppSettings, campaignId: string, worldData?: WorldData): Promise<void> {
    const queueKey = "ark_failed_memory_tasks";
    try {
      const queue = JSON.parse(localStorage.getItem(queueKey) || "[]");
      if (queue.length === 0) return;
      console.log(`[DynamicMemoryService] Found ${queue.length} failed past tasks. Triggering automated reconciliation run...`);
      localStorage.removeItem(queueKey);
      
      if (settings.enableVectorMemory && worldData) {
        console.log("[DynamicMemoryService] Self-healing consistent canonical state reconstruction via Memory Consolidation Engine.");
        await this.consolidateAllMemoryLayers(worldData, settings, campaignId);
      }
    } catch (e) {
      console.error("[DynamicMemoryService] Automated reconciliation queue failed:", e);
    }
  }
};
