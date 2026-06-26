import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bot, Sparkles, Wand2, TerminalSquare, RotateCcw } from 'lucide-react';
import { WorldData, AppSettings, ChatMessage } from '../../../../types';
import Button from '../../../../ui/Button';
import { getAiClient } from '../../../../services/ai/client';

interface AIAssistantModalProps {
    isOpen: boolean;
    onClose: () => void;
    activeWorld: WorldData;
    onUpdateWorld?: (updates: Partial<WorldData>) => void;
    settings: AppSettings | null;
    history: ChatMessage[];
    onApplyAction?: (action: string, payload: any) => void;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
    isOpen, onClose, activeWorld, onUpdateWorld, settings, history, onApplyAction
}) => {
    const [messages, setMessages] = useState<ChatMessage[]>([{
        role: 'model', text: 'Xin chào! Tôi là AI TRỢ LÝ TOÀN TRI. Tôi đã nắm rõ toàn bộ ngữ cảnh truyện, WorldInfo, luật và trạng thái của ứng dụng. Bạn cần tôi sửa đổi chính văn, tạo entry mới, hay gỡ lỗi gì?'
    }]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        
        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsLoading(true);

        try {
            const ai = getAiClient(settings || undefined);
            
            // Generate System Prompt granting God-Mode access and strict instructions
            const systemPrompt = `Bạn là "AI Trợ Lý Toàn Tri" của ứng dụng viết truyện nhập vai.
Nhiệm vụ của bạn: Giúp người dùng thông thạo app, sửa chính văn, tạo entry WorldInfo, LSR, tạo luật, sửa luật, hướng dẫn debug, can thiệp vào truyện.

Dưới đây là một số thông tin hiện trạng app:
- Tên nhân vật (PC): ${activeWorld.player.name}
- Số lượng Entity (NPC/Location...): ${activeWorld.entities.length}
- Số lượng lượt chat: ${history.length}
- Tin nhắn truyện gần nhất:
${history.slice(-3).map(m => `[${m.role.toUpperCase()}]: ${m.text}`).join('\n')}

Khi người dùng yêu cầu chỉnh sửa, hãy trả lời súc tích và có thể cung cấp đoạn text để người dùng tự áp dụng, hoặc hướng dẫn họ cụ thể từng bước. Bạn KHÔNG PHẢI là nhân vật trong truyện. Bạn là một trợ lý ảo quyền năng đứng ngoài hệ thống.`;

            const modelName = settings?.aiModel || "gemini-3.1-pro-preview";
            const response = await ai.models.generateContent({
                model: modelName,
                contents: messages.concat({ role: 'user', text: userMsg }).map(m => ({
                    role: m.role,
                    parts: [{ text: m.text }]
                })),
                config: {
                    systemInstruction: systemPrompt,
                    temperature: 0.7,
                }
            });

            const replyText = response.text || 'Không có phản hồi.';
            setMessages(prev => [...prev, { role: 'model', text: replyText }]);

        } catch (err: any) {
            console.error('Lỗi Trợ Lý:', err);
            setMessages(prev => [...prev, { role: 'model', text: `[LỖI]: ${err.message}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setMessages([{ role: 'model', text: 'Tôi đã sẵn sàng. Bạn muốn tôi kiểm tra và chỉnh sửa gì hôm nay?' }]);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
            <motion.div 
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full sm:max-w-xl md:max-w-2xl h-[85vh] sm:h-[80vh] bg-stone-100 dark:bg-slate-900 shadow-2xl rounded-t-3xl sm:rounded-2xl border border-stone-300 dark:border-slate-700 flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="px-4 py-3 border-b border-stone-300 dark:border-slate-800 flex items-center justify-between bg-stone-200/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-500 flex items-center justify-center">
                            <Bot size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-stone-800 dark:text-slate-100">AI Trợ Lý System</h2>
                            <p className="text-[10px] text-stone-500 dark:text-slate-400 font-medium">Toàn tri & Quản trị hệ thống (Chính Văn / Dữ liệu)</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleReset} className="p-2 text-stone-500 hover:text-cyan-500 transition-colors" title="Làm mới hội thoại">
                            <RotateCcw size={16} />
                        </button>
                        <button onClick={onClose} className="p-2 text-stone-500 hover:bg-stone-300 dark:hover:bg-slate-700 rounded-xl transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Chat Area */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {messages.map((msg, idx) => (
                        <motion.div 
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[85%] rounded-2xl p-3 text-sm whitespace-pre-wrap leading-relaxed shadow-sm ${
                                msg.role === 'user' 
                                ? 'bg-cyan-600 text-white rounded-br-none' 
                                : 'bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-stone-800 dark:text-slate-300 rounded-bl-none'
                            }`}>
                                {msg.text}
                            </div>
                        </motion.div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="max-w-[80%] rounded-2xl p-3 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-stone-800 dark:text-slate-300 rounded-bl-none">
                                <Sparkles size={16} className="text-cyan-500 animate-pulse" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-3 border-t border-stone-300 dark:border-slate-800 bg-white dark:bg-slate-900 border-none">
                    <div className="flex items-end gap-2 p-2 bg-stone-100 dark:bg-slate-800 rounded-2xl border border-stone-300 dark:border-slate-700 focus-within:border-cyan-500 dark:focus-within:border-cyan-500 transition-colors">
                        <textarea 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Nhập yêu cầu gỡ lỗi, sửa chính văn..."
                            className="flex-1 max-h-32 min-h-[40px] bg-transparent resize-none outline-none text-sm p-2 text-stone-800 dark:text-slate-200 custom-scrollbar"
                            rows={1}
                        />
                        <button 
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            className="p-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl transition-all shadow-md active:scale-95 shrink-0"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                    <div className="px-2 mt-2 text-[10px] text-stone-400 flex items-center gap-1 font-medium">
                        <TerminalSquare size={10} /> Shift+Enter để xuống dòng
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AIAssistantModal;
