import { useState, useRef, useCallback } from "react";
import { ChatMessage, WorldData, AppSettings, GameTime, TawaPresetConfig } from "../../../../types";
import { gameplayAiService } from "../../../../services/ai/gameplay/service";
import { storyBibleService } from "../../../../services/ai/storyBibleService";
import { dbService } from "../../../../services/db/indexedDB";
import { Mem0Service } from "../../../../services/ai/memory/Mem0Service";
import { DynamicMemoryService } from "../../../../services/ai/memory/DynamicMemoryService";
import { vectorService } from "../../../../services/ai/vectorService";
import { LsrParser } from "../../../../services/lsr/LsrParser";
import { getRegexedString, extractTagContent, parseChoices, ensureThinkingTagsBalanced, extractThinkingAndContent, isCotModule } from "../../../../utils/regex";
import { advanceTime } from "../../../../utils/timeUtils";

const computeCotUsed = (preset: any): string => {
  if (!preset) return "Không dùng";

  const modules = preset.modules || [];
  
  // Quét động các mô-đun CoT đang kích hoạt
  const enabledCotModules = modules.filter((m: any) => m.enabled && isCotModule(m));
  
  if (enabledCotModules.length > 0) {
    // Trả về tên viết tắt hoặc tên chuẩn của mô-đun để hiển thị đẹp đẽ
    return enabledCotModules.map((m: any) => m.name || m.identifier).join(" & ");
  }
  
  // 1. Check if native thinking is configured in aiConfigOverrides
  const thinkingBudget = preset.aiConfigOverrides?.thinkingBudget ?? 0;
  if (preset.show_thoughts !== false && thinkingBudget > 0) {
    return `Native (Budget: ${thinkingBudget} tokens)`;
  }
  
  // 2. Check assistant_prefill field
  if (preset.assistant_prefill && preset.assistant_prefill.trim()) {
    return `Prefill: ${preset.assistant_prefill}`;
  }
  
  // 3. Check if we have an enabled assistant module with thinking triggers
  const hasPrefillModule = preset.modules?.some(
    (m: any) => m.enabled && m.role === "assistant" && m.content?.includes("<thinking>")
  );
  if (hasPrefillModule) {
    return "XML (Assistant Module)";
  }
  
  return "Không dùng";
};

interface AIGenerationProps {
  activeWorld: WorldData | null;
  activeWorldRef: React.RefObject<WorldData | null>;
  history: ChatMessage[];
  setHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  historyRef: React.RefObject<ChatMessage[]>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  lastActionRef: React.RefObject<string>;
  turnCount: number;
  setTurnCount: React.Dispatch<React.SetStateAction<number>>;
  turnCountRef: React.RefObject<number>;
  gameTime: GameTime;
  setGameTime: React.Dispatch<React.SetStateAction<GameTime>>;
  gameTimeRef: React.RefObject<GameTime>;
  lsrRuntimeData: any;
  setLsrRuntimeData: React.Dispatch<React.SetStateAction<any>>;
  lsrRuntimeDataRef: React.RefObject<any>;
  settings: AppSettings | null;
  dynamicRules: string[];
  dynamicRulesRef: React.RefObject<string[]>;
  tawaPresetConfig: TawaPresetConfig | null;
  tawaPresetConfigRef: React.RefObject<TawaPresetConfig | null>;
  combinedRegexScriptsRef: React.RefObject<any[]>;
  shouldAutoScrollRef: React.RefObject<boolean>;
  updateTokenHistory: (tokens: number, text: string) => void;
  startProcessing: () => void;
  endProcessing: () => void;
  syncWorldState: (
    historyList: ChatMessage[],
    turnCountVal: number,
    timeVal: GameTime,
    lsrData?: any,
    incrementalSummary?: string,
    updatedEntities?: any[],
    updatedPlayer?: any,
  ) => void;
  triggerAutosave: (
    historyList: ChatMessage[],
    turnCountVal: number,
    timeVal: GameTime,
    lsrData?: any,
  ) => void;
  checkDeathStatus: (
    historyList: ChatMessage[],
    lsrData?: Record<string, unknown[]>,
  ) => boolean;
  triggerPermadeath: () => Promise<void>;
}

export function useAIGeneration({
  activeWorld,
  activeWorldRef,
  history,
  setHistory,
  historyRef,
  isLoading,
  setIsLoading,
  lastActionRef,
  turnCount,
  setTurnCount,
  turnCountRef,
  gameTime,
  setGameTime,
  gameTimeRef,
  lsrRuntimeData,
  setLsrRuntimeData,
  lsrRuntimeDataRef,
  settings,
  dynamicRules,
  dynamicRulesRef,
  tawaPresetConfig,
  tawaPresetConfigRef,
  combinedRegexScriptsRef,
  shouldAutoScrollRef,
  updateTokenHistory,
  startProcessing,
  endProcessing,
  syncWorldState,
  triggerAutosave,
  checkDeathStatus,
  triggerPermadeath,
}: AIGenerationProps) {
  const abortControllerRef = useRef<AbortController | null>(null);

  const stopStreamGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, [setIsLoading]);

  const processAIResponse = useCallback(
    async (
      responseText: string,
      initial = false,
      time?: GameTime,
      alternateGreetings?: string[],
      groundingSources?: { title: string; uri: string }[],
      deepLogicResult?: any,
      regenerateIndex?: number,
      isRegenerating?: boolean,
    ) => {
      const branchesContent =
        extractTagContent(responseText, "branches") ||
        extractTagContent(responseText, "choices") ||
        extractTagContent(responseText, "actions");
      const choicesList = parseChoices(branchesContent);

      const setTimeStr = extractTagContent(responseText, "set_time");
      let updatedTime = time || gameTimeRef.current;

      if (setTimeStr) {
        const parts = setTimeStr.split("|").map((p) => parseInt(p.trim(), 10));
        if (parts.length === 5 && !parts.some(isNaN)) {
          updatedTime = {
            year: parts[0],
            month: parts[1],
            day: parts[2],
            hour: parts[3],
            minute: parts[4],
          };
        }
      } else {
        const timeCostStr = extractTagContent(responseText, "time_cost");
        let timeCost = parseInt(timeCostStr || (initial ? "0" : "1"), 10);
        if (!initial && (isNaN(timeCost) || timeCost < 1)) timeCost = 1;

        if (timeCost > 0 || initial) {
          updatedTime = advanceTime(updatedTime, timeCost);
        }
      }

      setGameTime(updatedTime);

      const incrementalSummary = extractTagContent(
        responseText,
        "incrementalSummary",
      );

      let finalResponseText = responseText;
      const isDebugAI =
        typeof window !== "undefined" &&
        (window as any).__TAWA_REGEX_DEBUG__ === true;
      const playerNameToUse = activeWorldRef.current?.player?.name || "User";

      const applyRegex = (text: string) => {
        let result = text;
        if (combinedRegexScriptsRef.current) {
          result = getRegexedString(
            result,
            3,
            combinedRegexScriptsRef.current,
            {
              userName: playerNameToUse,
              charName: "Character",
              depth: 0,
              isDebug: isDebugAI,
              isPrompt: false,
              isMarkdown: false,
            },
          );
          result = getRegexedString(
            result,
            2,
            combinedRegexScriptsRef.current,
            {
              userName: playerNameToUse,
              charName: "Character",
              depth: 0,
              isDebug: isDebugAI,
              isPrompt: false,
              isMarkdown: false,
            },
          );
        }
        return result;
      };

      finalResponseText = applyRegex(finalResponseText);

      let finalSwipes = [finalResponseText];
      if (alternateGreetings && alternateGreetings.length > 0) {
        finalSwipes = [finalResponseText, ...alternateGreetings.map(applyRegex)];
      }

      let presetName = "Mặc định";
      try {
        const activeId =
          dbService.getKeyValueSync("tawa_active_preset_id_v4") || "default";
        const presetsRaw = dbService.getKeyValueSync("tawa_presets_list_v4");
        if (presetsRaw) {
          const presets =
            typeof presetsRaw === "string" ? JSON.parse(presetsRaw) : presetsRaw;
          const active = presets.find((p: any) => p.id === activeId);
          if (active) presetName = active.name;
        }
      } catch (e: any) {
        console.warn("processAIResponse: Failed to parse presets:", e);
      }

      const currentPresetForMeta = tawaPresetConfigRef.current;
      const cotUsedValue = computeCotUsed(currentPresetForMeta);

      const metadata = {
        presetUsed: presetName,
        cotUsed: cotUsedValue,
        worldInfoConfig: `${activeWorldRef.current?.entities?.length || 0} Entities`,
      };

      // Get correct base LSR state from history prior to this turn
      let baseLsrData: Record<string, unknown[]> = {};
      const targetHistoryRef = historyRef.current || [];
      const prevMsgIndex = regenerateIndex !== undefined ? regenerateIndex - 1 : targetHistoryRef.length - 1;
      if (prevMsgIndex >= 0) {
        for (let i = prevMsgIndex; i >= 0; i--) {
          const m = targetHistoryRef[i];
          if (m && m.lsrData) {
            baseLsrData = m.lsrData;
            break;
          }
        }
      } else {
        baseLsrData = activeWorldRef.current?.lsrData || {};
      }

      const tableStored = extractTagContent(responseText, "table_stored");
      let nextLsrData = { ...baseLsrData };
      if (tableStored) {
        const parsedData = LsrParser.parseLsrString(tableStored);
        if (Object.keys(parsedData).length > 0) {
          nextLsrData = LsrParser.mergeLsrData(baseLsrData, parsedData);
        }
      } else {
        const tableEdit = extractTagContent(responseText, "tableEdit");
        if (tableEdit) {
          const parsedEdits = LsrParser.parseLsrString(tableEdit);
          if (Object.keys(parsedEdits).length > 0) {
            nextLsrData = LsrParser.mergeLsrData(
              baseLsrData,
              parsedEdits,
            );
          }
        }
      }

      if (!initial && settings) {
        try {
          const auditedLsr = await gameplayAiService.auditLsrUpdates(
            lastActionRef.current || "",
            responseText,
            nextLsrData,
            settings,
            historyRef.current?.length || 0,
          );
          nextLsrData = auditedLsr;
        } catch (auditErr) {
          console.warn("Failed to audit LSR:", auditErr);
        }
      }

      setLsrRuntimeData(nextLsrData);

      // Map swipes to their respective LSR states to allow correct swiping back-and-forth
      const swipesLsrData: Record<string, unknown[]>[] = [];
      for (const swipeText of finalSwipes) {
        const sTableStored = extractTagContent(swipeText, "table_stored");
        let sLsr = { ...baseLsrData };
        if (sTableStored) {
          const parsedData = LsrParser.parseLsrString(sTableStored);
          if (Object.keys(parsedData).length > 0) {
            sLsr = LsrParser.mergeLsrData(baseLsrData, parsedData);
          }
        } else {
          const sTableEdit = extractTagContent(swipeText, "tableEdit");
          if (sTableEdit) {
            const parsedEdits = LsrParser.parseLsrString(sTableEdit);
            if (Object.keys(parsedEdits).length > 0) {
              sLsr = LsrParser.mergeLsrData(baseLsrData, parsedEdits);
            }
          }
        }
        swipesLsrData.push(sLsr);
      }

      // Parse swipes into clean text and isolated thinking
      const swipesParsed = finalSwipes.map(s => extractThinkingAndContent(s));
      const swipesClean = swipesParsed.map(p => p.text);
      const swipesThinking = swipesParsed.map(p => p.thinking);

      const modelMsg: ChatMessage = {
        role: "model",
        text: swipesClean[0],
        thinking: swipesThinking[0],
        timestamp: Date.now(),
        gameTime: updatedTime,
        choices: choicesList,
        swipes: swipesClean,
        swipesThinking: swipesThinking,
        swipeIndex: 0,
        turnNumber: initial ? 0 : turnCountRef.current + 1,
        userAction: initial ? undefined : lastActionRef.current,
        incrementalSummary: incrementalSummary,
        metadata: metadata,
        groundingSources: undefined,
        deepLogicResult: deepLogicResult,
        lsrData: nextLsrData,
        swipesLsrData: swipesLsrData,
      };

      let newHistory = [...targetHistoryRef];
      if (regenerateIndex !== undefined && regenerateIndex < newHistory.length) {
        const existingMsg = { ...newHistory[regenerateIndex] } as ChatMessage;
        const currentSwipeIdx = existingMsg.swipeIndex || 0;
        
        const parsed = extractThinkingAndContent(finalResponseText);
        
        const currentSwipes = [...(existingMsg.swipes || [existingMsg.text || ""])];
        currentSwipes[currentSwipeIdx] = parsed.text;

        const currentSwipesThinking = [...(existingMsg.swipesThinking || [])];
        while (currentSwipesThinking.length < currentSwipes.length) {
          currentSwipesThinking.push("");
        }
        currentSwipesThinking[currentSwipeIdx] = parsed.thinking;

        existingMsg.swipes = currentSwipes;
        existingMsg.swipesThinking = currentSwipesThinking;
        existingMsg.text = parsed.text;
        existingMsg.thinking = parsed.thinking;
        existingMsg.choices = choicesList;
        existingMsg.groundingSources = groundingSources.length > 0 ? groundingSources : undefined;
        existingMsg.deepLogicResult = deepLogicResult;
        existingMsg.incrementalSummary = incrementalSummary;
        existingMsg.gameTime = updatedTime;
        existingMsg.metadata = metadata;
        existingMsg.lsrData = nextLsrData;

        // Sync swipes list data
        const newSwipesLsr = existingMsg.swipesLsrData ? [...existingMsg.swipesLsrData] : [];
        while (newSwipesLsr.length < currentSwipes.length) {
          newSwipesLsr.push(existingMsg.lsrData || baseLsrData);
        }
        newSwipesLsr[currentSwipeIdx] = nextLsrData;
        existingMsg.swipesLsrData = newSwipesLsr;

        newHistory[regenerateIndex] = existingMsg;
      } else {
        newHistory = [...newHistory, modelMsg];
      }

      setHistory(newHistory);

      const win = window as any;
      if (win.eventSource) {
        win.eventSource.emit("generation_ended", responseText);
        win.eventSource.emit("message_received", modelMsg);
        win.eventSource.emit("character_message_rendered", modelMsg);
      }

      const dead = checkDeathStatus(newHistory, nextLsrData);
      if (dead) {
        triggerPermadeath();
      }

      if (!initial) {
        const newTurnCount = isRegenerating ? turnCountRef.current : (turnCountRef.current + 1);
        setTurnCount(newTurnCount);
        syncWorldState(
          newHistory,
          newTurnCount,
          updatedTime,
          nextLsrData,
          incrementalSummary,
        );
        triggerAutosave(newHistory, newTurnCount, updatedTime, nextLsrData);

        // Run Mem0 memory background updater asynchronously
        if (settings && activeWorldRef.current) {
          const campaignId = activeWorldRef.current.id || "default";
          const userInputText = lastActionRef.current || "";
          Mem0Service.updateMemoriesFromTurn(
            userInputText,
            finalResponseText,
            campaignId,
            settings,
            newTurnCount,
            activeWorldRef.current
          ).catch((mErr) => {
            console.error("[Mem0] Background updater failed:", mErr);
          });

          // Run Base Profile (Apperance/Inventory) updater asynchronously
          DynamicMemoryService.autoUpdateBaseProfileData(
            newHistory,
            activeWorldRef.current,
            settings
          ).then((updates) => {
            if (updates) {
              console.log("[BaseProfileUpdater] Cập nhật lại hình thể/trang bị gốc thành công:", updates);
              syncWorldState(
                historyRef.current,
                turnCountRef.current,
                gameTimeRef.current,
                lsrRuntimeDataRef.current,
                activeWorldRef.current?.summary,
                updates.entities,
                updates.player
              );
            }
          }).catch((e) => {
             console.error("[BaseProfileUpdater] Thất bại:", e);
          });

          // BACKGROUND AUTO-SUMMARIZATION LOGIC (Token Conservation)
          // Hide old messages if the visible text length is very large
          const activeContextHistory = newHistory.filter(m => !m.isHidden && !m.text.includes("BÁO CÁO HỆ THỐNG"));
          let visibleChars = 0;
          for (const m of activeContextHistory) {
              if (m.role === 'model') visibleChars += m.swipes?.[m.swipeIndex || 0]?.length || m.text.length;
              else visibleChars += m.text.length;
          }
          
          const maxOutputTokens = settings.maxOutputTokens || 6144; // Estimated context windows
          // ~ 4 chars per token. So maxOutputTokens * 4 is char limit. Trigger sumamrizer at 75% of context window OR 30 active turns
          const thresholdChars = maxOutputTokens * 4 * 0.75;
          const turnCountThreshold = 30;

          if (visibleChars > thresholdChars || activeContextHistory.length > turnCountThreshold) {
            console.log("[AutoSummarization] Approaching token/turn limits. Triggering background contextual shift...");
            DynamicMemoryService.processCoreMemories(activeContextHistory, activeWorldRef.current, settings, campaignId)
              .then((newSummary) => {
                 if (newSummary) {
                    console.log("[AutoSummarization] Successfully updated core memory! Hiding old messages to save context token budget.");
                    setHistory(prev => {
                       const modified = [...prev];
                       
                       // Keep only last N active messages
                       const keepCount = 10;
                       let activeCount = 0;
                       for (let i = modified.length - 1; i >= 0; i--) {
                          if (!modified[i].isHidden && modified[i].role && modified[i].role !== 'system') {
                             activeCount++;
                             if (activeCount > keepCount) {
                                modified[i].isHidden = true;
                             }
                          }
                       }
                       return modified;
                    });
                 }
              })
              .catch(e => console.error("Auto summarization thread failed", e));
          }
        }
      } else {
        syncWorldState(
          newHistory,
          turnCountRef.current,
          updatedTime,
          nextLsrData,
          incrementalSummary,
        );
        triggerAutosave(
          newHistory,
          turnCountRef.current,
          updatedTime,
          nextLsrData,
        );
      }
      endProcessing();
      setIsLoading(false);
    },
    [
      activeWorldRef,
      combinedRegexScriptsRef,
      setGameTime,
      setLsrRuntimeData,
      setHistory,
      setIsLoading,
      setTurnCount,
      syncWorldState,
      triggerAutosave,
      checkDeathStatus,
      triggerPermadeath,
      gameTimeRef,
      lastActionRef,
      turnCountRef,
      lsrRuntimeDataRef,
      tawaPresetConfigRef,
      historyRef,
      settings,
    ],
  );

  const runStreamGeneration = useCallback(
    async (
      userInput: string,
      currentHistory: ChatMessage[],
      currentSettings: AppSettings,
      regenerateIndex?: number,
      world?: WorldData,
      time?: GameTime,
    ) => {
      setIsLoading(true);
      startProcessing();
      abortControllerRef.current = new AbortController();

      const win = window as any;
      if (win.eventSource) {
        win.eventSource.emit("generation_started", {
          userInput,
          turnCount: turnCountRef.current,
        });
      }

      try {
        const targetWorld = world || activeWorldRef.current;
        let currentLsrData = lsrRuntimeDataRef.current;
        if (regenerateIndex !== undefined) {
          let baseLsrData: Record<string, unknown[]> = {};
          const prevIndex = regenerateIndex - 1;
          if (prevIndex >= 0) {
            for (let i = prevIndex; i >= 0; i--) {
              const m = currentHistory[i];
              if (m && m.lsrData) {
                baseLsrData = m.lsrData;
                break;
              }
            }
          } else {
            baseLsrData = targetWorld?.lsrData || {};
          }
          currentLsrData = baseLsrData;
        }

        const effectiveWorldData: WorldData = {
          ...targetWorld!,
          lsrData: currentLsrData,
          gameTime: time || gameTimeRef.current,
          savedState: {
            history: currentHistory,
            turnCount: turnCountRef.current,
            gameTime: time || gameTimeRef.current,
          },
          config: {
            ...targetWorld!.config,
            rules: dynamicRulesRef.current,
            tawaPreset: tawaPresetConfigRef.current || undefined,
            regexScripts: combinedRegexScriptsRef.current || [],
          },
        };

        const workingHistory =
          regenerateIndex !== undefined
            ? [...currentHistory.slice(0, regenerateIndex + 1)]
            : [...currentHistory];
        let targetIndex = regenerateIndex;

        if (regenerateIndex !== undefined && targetWorld?.id) {
          const targetMsg = currentHistory[regenerateIndex];
          if (targetMsg && targetMsg.timestamp) {
            console.log(`[MemoryRollback] Triggering rollback because turn index ${regenerateIndex} is being regenerated`);
            await Promise.all([
              vectorService.rollbackVectors(targetWorld.id, targetMsg.timestamp),
              Mem0Service.rollbackMemories(targetWorld.id, targetMsg.timestamp)
            ]).catch(err => {
              console.error("[MemoryRollback] Failed to rollback memories:", err);
            });
          }
        }

        let presetName = "Mặc định";
        try {
          const activeId =
            dbService.getKeyValueSync("tawa_active_preset_id_v4") || "default";
          const presetsRaw = dbService.getKeyValueSync("tawa_presets_list_v4");
          if (presetsRaw) {
            const presets =
              typeof presetsRaw === "string" ? JSON.parse(presetsRaw) : presetsRaw;
            const active = presets.find((p: any) => p.id === activeId);
            if (active) presetName = active.name;
          }
        } catch {}

        const cotUsedValue = computeCotUsed(tawaPresetConfigRef.current);

        const defaultMetadata = {
          presetUsed: presetName,
          cotUsed: cotUsedValue,
          worldInfoConfig: `${targetWorld?.entities?.length || 0} Entities`,
        };

        if (targetIndex === undefined) {
          const placeholderMsg: ChatMessage = {
            role: "model",
            text: "",
            timestamp: Date.now(),
            gameTime: time || gameTimeRef.current,
            swipes: [""],
            swipeIndex: 0,
            choices: [],
            turnNumber: currentHistory.length === 0 ? 0 : turnCountRef.current + 1,
            userAction: currentHistory.length === 0 ? undefined : userInput,
            metadata: defaultMetadata,
          };
          workingHistory.push(placeholderMsg);
          targetIndex = workingHistory.length - 1;
          setHistory([...workingHistory]);
        } else {
          const msg = { ...(workingHistory[targetIndex] || {}) } as ChatMessage;
          if (!msg.role) msg.role = "model";
          msg.metadata = defaultMetadata;

          const newSwipes = [...(msg.swipes || [msg.text || ""]), ""];
          msg.swipes = newSwipes;
          msg.swipeIndex = newSwipes.length - 1;
          msg.text = "";

          if (msg.turnNumber === undefined) {
            msg.turnNumber = targetIndex === 0 ? 0 : turnCountRef.current;
          }
          if (msg.userAction === undefined && targetIndex > 0) {
            msg.userAction = userInput;
          }

          workingHistory[targetIndex] = msg;
          setHistory([...workingHistory]);
        }

        await new Promise((r) => setTimeout(r, 0));

        const stream = gameplayAiService.generateStoryTurnStream(
          userInput,
          regenerateIndex !== undefined
            ? currentHistory.slice(0, regenerateIndex)
            : currentHistory,
          effectiveWorldData,
          currentSettings,
          tawaPresetConfigRef.current || undefined,
          time || gameTimeRef.current,
          abortControllerRef.current.signal,
        );

        let accumulatedText = "";
        let streamPrefillToStrip = "";
        let lastTokenCount = 0;
        let lastUIUpdateTime = 0;
        const UI_UPDATE_INTERVAL = 150;
        const groundingSources: { title: string; uri: string }[] = [];
        let deepLogicResult: any = null;

        for await (const chunk of stream) {
          if (typeof chunk === "string") {
            accumulatedText += chunk;
          } else {
            if ((chunk as any)._prefill) {
              streamPrefillToStrip = (chunk as any)._prefill;
              continue;
            }
            let safeChunkText = "";
            try {
              if (chunk.candidates && chunk.candidates.length > 0 && chunk.text) {
                safeChunkText = chunk.text;
              } else if (!chunk.candidates && chunk.text) {
                // If it was modified by our Object.defineProperty, it won't throw
                safeChunkText = chunk.text;
              }
            } catch (e) {}
            if (safeChunkText) accumulatedText += safeChunkText;
            if (chunk.usageMetadata?.totalTokenCount) {
              lastTokenCount = chunk.usageMetadata.totalTokenCount;
            }
            if (chunk.deepLogicResult) {
              deepLogicResult = chunk.deepLogicResult;
            }
            const gChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
            if (gChunks && Array.isArray(gChunks)) {
              gChunks.forEach((gChunk: any) => {
                if (gChunk.web && gChunk.web.uri && gChunk.web.title) {
                  if (!groundingSources.some((s) => s.uri === gChunk.web.uri)) {
                    groundingSources.push({
                      title: gChunk.web.title,
                      uri: gChunk.web.uri,
                    });
                  }
                }
              });
            }
          }

          const now = Date.now();
          if (now - lastUIUpdateTime > UI_UPDATE_INTERVAL) {
            if (targetIndex !== undefined && workingHistory[targetIndex]) {
              const msg = { ...workingHistory[targetIndex] };
              const swipes = [...(msg.swipes || [""])];
              const currentSwipeIdx = msg.swipeIndex || 0;

              const parsed = extractThinkingAndContent(accumulatedText);
              let displayContent = parsed.text;
              if (streamPrefillToStrip && displayContent.startsWith(streamPrefillToStrip)) {
                 displayContent = displayContent.substring(streamPrefillToStrip.length).trimStart();
              }

              swipes[currentSwipeIdx] = displayContent;

              const swipesThinking = [...(msg.swipesThinking || [])];
              while (swipesThinking.length < swipes.length) {
                swipesThinking.push("");
              }
              swipesThinking[currentSwipeIdx] = parsed.thinking;

              const branchesContent =
                extractTagContent(accumulatedText, "branches") ||
                extractTagContent(accumulatedText, "choices") ||
                extractTagContent(accumulatedText, "actions");
              const choicesList = parseChoices(branchesContent);

              msg.swipes = swipes;
              msg.swipesThinking = swipesThinking;
              msg.text = displayContent;
              msg.thinking = parsed.thinking;
              msg.choices = choicesList;
              msg.groundingSources =
                groundingSources.length > 0 ? groundingSources : undefined;
              msg.deepLogicResult = deepLogicResult;

              workingHistory[targetIndex] = msg;
              setHistory([...workingHistory]);
              lastUIUpdateTime = now;
            }
          }
        }

        // Final completion logic
        let finalOutputText = accumulatedText;
        const parsedFinal = extractThinkingAndContent(finalOutputText);
        if (streamPrefillToStrip && parsedFinal.text.startsWith(streamPrefillToStrip)) {
           parsedFinal.text = parsedFinal.text.substring(streamPrefillToStrip.length).trimStart();
           finalOutputText = (parsedFinal.thinking ? `<thinking>\n${parsedFinal.thinking}\n</thinking>\n` : "") + parsedFinal.text;
        }

        if (lastTokenCount > 0) {
          updateTokenHistory(lastTokenCount, finalOutputText);
        } else if (finalOutputText.length > 0) {
          const estimatedTokens = Math.ceil(finalOutputText.length / 4);
          updateTokenHistory(estimatedTokens, finalOutputText);
        }

        const alternateGreetings: string[] = [];
        await processAIResponse(
          ensureThinkingTagsBalanced(finalOutputText),
          false,
          time || gameTimeRef.current,
          alternateGreetings,
          groundingSources.length > 0 ? groundingSources : undefined,
          deepLogicResult,
          targetIndex,
          regenerateIndex !== undefined,
        );
      } catch (err: any) {
        if (err.name === "AbortError") {
          console.log("Stream generation aborted cleanly.");
        } else {
          console.error("runStreamGeneration failed:", err?.stack || err);
        }
        setIsLoading(false);
      } finally {
        endProcessing();
        abortControllerRef.current = null;
      }
    },
    [
      activeWorldRef,
      lsrRuntimeDataRef,
      gameTimeRef,
      dynamicRulesRef,
      tawaPresetConfigRef,
      combinedRegexScriptsRef,
      setHistory,
      setIsLoading,
      updateTokenHistory,
      processAIResponse,
      turnCountRef,
    ],
  );

  const updateMessageSwipes = useCallback(
    (index: number, newText: string, overrideTime?: GameTime) => {
      let baseLsrData: Record<string, unknown[]> = {};
      const targetHistoryRef = historyRef.current || [];
      const prevIndex = index - 1;
      if (prevIndex >= 0) {
        for (let i = prevIndex; i >= 0; i--) {
          const msgBefore = targetHistoryRef[i];
          if (msgBefore && msgBefore.lsrData) {
            baseLsrData = msgBefore.lsrData;
            break;
          }
        }
      } else {
        baseLsrData = activeWorldRef.current?.lsrData || {};
      }

      const tableStored = extractTagContent(newText, "table_stored");
      let nextLsrData = { ...baseLsrData };
      if (tableStored) {
        const parsedData = LsrParser.parseLsrString(tableStored);
        if (Object.keys(parsedData).length > 0) {
          nextLsrData = LsrParser.mergeLsrData(baseLsrData, parsedData);
        }
      } else {
        const tableEdit = extractTagContent(newText, "tableEdit");
        if (tableEdit) {
          const parsedEdits = LsrParser.parseLsrString(tableEdit);
          if (Object.keys(parsedEdits).length > 0) {
            nextLsrData = LsrParser.mergeLsrData(
              baseLsrData,
              parsedEdits,
            );
          }
        }
      }

      setLsrRuntimeData(nextLsrData);

      setHistory((prev) => {
        const updated = prev.slice(0, index + 1);
        const msg = { ...(updated[index] || {}) } as ChatMessage;

        if (!msg.role) msg.role = "model";

        const branchesContent =
          extractTagContent(newText, "branches") ||
          extractTagContent(newText, "choices") ||
          extractTagContent(newText, "actions");
        const choicesList = parseChoices(branchesContent);

        const currentSwipes = msg.swipes || [msg.text];
        const newSwipes = [...currentSwipes, newText];

        msg.swipes = newSwipes;
        msg.swipeIndex = newSwipes.length - 1;
        msg.text = newText;
        msg.choices = choicesList;
        msg.lsrData = nextLsrData;

        // Keep swipes list in perfect sync
        const currentSwipesLsr = msg.swipesLsrData || [];
        const newSwipesLsr = [...currentSwipesLsr];
        while (newSwipesLsr.length < currentSwipes.length) {
          newSwipesLsr.push(msg.lsrData || baseLsrData);
        }
        newSwipesLsr.push(nextLsrData);
        msg.swipesLsrData = newSwipesLsr;

        let finalTime = overrideTime || gameTime;
        const setTimeStr = extractTagContent(newText, "set_time");
        if (setTimeStr) {
          const parts = setTimeStr.split("|").map((p) => parseInt(p.trim(), 10));
          if (parts.length === 5 && !parts.some(isNaN)) {
            finalTime = {
              year: parts[0],
              month: parts[1],
              day: parts[2],
              hour: parts[3],
              minute: parts[4],
            };
          }
        } else {
          const timeCostStr = extractTagContent(newText, "time_cost");
          let timeCost = parseInt(timeCostStr || "1", 10);
          if (isNaN(timeCost) || timeCost < 1) timeCost = 1;
          finalTime = advanceTime(finalTime, timeCost);
        }

        msg.gameTime = finalTime;
        setGameTime(finalTime);

        const incrementalSummary = extractTagContent(
          newText,
          "incrementalSummary",
        );
        msg.incrementalSummary = incrementalSummary;

        if (msg.turnNumber === undefined) {
          msg.turnNumber = index === 0 ? 0 : turnCount;
        }
        if (msg.userAction === undefined && index > 0) {
          msg.userAction = updated[index - 1].text;
        }

        updated[index] = msg;

        syncWorldState(
          updated,
          turnCount,
          finalTime,
          nextLsrData,
          incrementalSummary,
        );
        return updated;
      });
    },
    [
      gameTime,
      setGameTime,
      setLsrRuntimeData,
      setHistory,
      syncWorldState,
      turnCount,
      lsrRuntimeDataRef,
    ],
  );

  const handleSendInitial = useCallback(
    async (currentSettings: AppSettings, world: WorldData, time: GameTime) => {
      setIsLoading(true);
      startProcessing();
      if (shouldAutoScrollRef) shouldAutoScrollRef.current = true;

      try {
        const campaignId =
          world.id ||
          `campaign-${world.world?.worldName?.replace(/\s+/g, "")}-${world.player?.name?.replace(/\s+/g, "")}`;
        storyBibleService
          .initialize(world, currentSettings, campaignId)
          .catch((err) => {
            console.error("Background StoryBible init failed", err);
          });
      } catch (e) {
        console.error("Failed to start StoryBible init", e);
      }

      if (
        world.world?.firstMessage &&
        world.world?.firstMessage.trim().length > 0
      ) {
        let rawFirstMsg = world.world?.firstMessage.trim();

        const playerName = world.player?.name || "User";
        const charName = world.entities?.[0]?.name || "Character";

        const replaceMacros = (text: string) => {
          const res = text.replace(/\{\{\s*user\s*\}\}/gi, playerName);
          return res.replace(/\{\{\s*char\s*\}\}/gi, charName);
        };

        rawFirstMsg = replaceMacros(rawFirstMsg);
        const alternateGreetings =
          world.entities?.[0]?.alternate_greetings?.map(replaceMacros) || [];

        processAIResponse(rawFirstMsg, true, time, alternateGreetings);
        return;
      }

      const startingScenario = world.world.startingScenario || "";
      const initialPrompt = startingScenario
        ? `Hãy bắt đầu câu chuyện dựa trên kịch bản khởi đầu này: "${startingScenario}". Hãy viết một mở đầu cực kỳ ấn tượng, sống động và lôi cuốn.`
        : "Hãy bắt đầu câu chuyện một cách tự nhiên và lôi cuốn nhất dựa trên bối cảnh thế giới và nhân vật đã thiết lập. Hãy thiết lập bối cảnh hiện tại một cách sống động.";

      if (currentSettings.streamResponse) {
        await runStreamGeneration(
          initialPrompt,
          [],
          currentSettings,
          undefined,
          world,
          time,
        );
      } else {
        const opening = await gameplayAiService.generateStoryTurn(
          initialPrompt,
          [],
          world,
          currentSettings,
          tawaPresetConfig,
          time,
        );
        if (opening.usage?.totalTokenCount) {
          updateTokenHistory(opening.usage.totalTokenCount, opening.text);
        } else if (opening.text) {
          const estimatedTokens = Math.ceil(opening.text.length / 4);
          updateTokenHistory(estimatedTokens, opening.text);
        }
        processAIResponse(opening.text, true, time);
      }
    },
    [
      runStreamGeneration,
      processAIResponse,
      tawaPresetConfig,
      updateTokenHistory,
      setIsLoading,
      shouldAutoScrollRef,
    ],
  );

  return {
    runStreamGeneration,
    stopStreamGeneration,
    processAIResponse,
    updateMessageSwipes,
    handleSendInitial,
  };
}
