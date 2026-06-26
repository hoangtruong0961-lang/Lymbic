import fs from 'fs';

const path = 'src/components/features/settings/SettingsScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

const newProxyBlock = `
                        {settings.proxies && settings.proxies.length > 0 ? (
                            settings.proxies.map((proxy, index) => (
                                <div key={proxy.id ? \`\${proxy.id}-\${index}\` : index} className={\`p-5 rounded-3xl border transition-all \${settings.activeProxyId === proxy.id ? 'bg-[#cbd2df]/20 dark:bg-slate-950/20 border-[var(--theme-accent)] shadow-[var(--theme-shadow-button)]' : 'bg-[var(--theme-bg)] border-[var(--theme-border-muted)] shadow-[var(--theme-shadow-inner)]'}\`}>
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="flex items-center gap-4">
                                            <button 
                                                onClick={() => handleChange('activeProxyId', proxy.id)}
                                                className={\`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border \${settings.activeProxyId === proxy.id ? 'bg-[var(--theme-accent)] text-slate-950 shadow-[var(--theme-shadow-outer)] border-[var(--theme-accent)]' : 'bg-[var(--theme-bg)] text-[var(--theme-text)] border-[var(--theme-border-muted)] hover:text-slate-800'}\`}
                                            >
                                                {settings.activeProxyId === proxy.id ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                                                {settings.activeProxyId === proxy.id ? 'HOẠT ĐỘNG' : 'CHỌN DÙNG'}
                                            </button>
                                            <h4 className="text-xs font-black text-[var(--theme-text-muted)] tracking-wider flex items-center gap-2">
                                                NODE {index + 1}
                                            </h4>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {/* Toggle switch for proxy.isActive */}
                                            <button
                                                onClick={() => updateProxy(proxy.id, { isActive: proxy.isActive !== false ? false : true })}
                                                className={\`relative shrink-0 w-10 h-5 rounded-full transition-colors duration-300 bg-[var(--theme-bg)] shadow-[var(--theme-shadow-inner)] border border-[var(--theme-border-muted)] cursor-pointer\`}
                                            >
                                                <motion.div 
                                                    layout
                                                    className={\`absolute top-0.5 left-0.5 w-4 h-4 rounded-full shadow-[var(--theme-shadow-button)] transition-colors \${proxy.isActive !== false ? 'bg-[var(--theme-accent)]' : 'bg-slate-400'}\`}
                                                    animate={{ x: proxy.isActive !== false ? 20 : 0 }}
                                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                />
                                            </button>
                                            <button onClick={() => removeProxy(proxy.id)} className="w-8 h-8 rounded-full bg-[var(--theme-bg)] text-red-500 hover:text-red-600 shadow-[var(--theme-shadow-button)] border border-[var(--theme-border-muted)] flex items-center justify-center transition-all cursor-pointer">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-2">
                                        <div className="lg:col-span-12 flex justify-between items-center bg-[var(--theme-bg)] border border-[var(--theme-border-muted)] shadow-[var(--theme-shadow-inner)] rounded-xl p-3">
                                            <span className="text-xs font-bold text-[var(--theme-text-muted)]">Endpoint Protocol</span>
                                            <select 
                                                value={proxy.type || 'google'} 
                                                onChange={(e) => updateProxy(proxy.id, { type: e.target.value as any })}
                                                className="bg-[var(--theme-bg)] text-[var(--theme-text)] border-[var(--theme-border-muted)] border rounded-lg px-2.5 py-1 text-[10px] outline-none font-bold"
                                            >
                                                <option value="google">Google</option>
                                                <option value="openai">OpenAI</option>
                                                <option value="openrouter">OpenRouter</option>
                                                <option value="custom">Custom</option>
                                            </select>
                                        </div>

                                        <div className="lg:col-span-6 space-y-2">
                                            <label className="text-xs font-extrabold text-[var(--theme-text)]">Proxy endpoint url (v1)</label>
                                            <input 
                                                type="text" 
                                                placeholder="https://api.openai.com/v1"
                                                value={proxy.url}
                                                onChange={(e) => updateProxy(proxy.id, { url: e.target.value })}
                                                className="w-full bg-[var(--theme-bg)] text-[var(--theme-text)] border border-[var(--theme-border-muted)] shadow-[var(--theme-shadow-inner)] rounded-xl p-3 text-sm focus:border-[var(--theme-accent)] outline-none font-mono"
                                            />
                                        </div>
                                        
                                        <div className="lg:col-span-6 space-y-2">
                                            <label className="text-xs font-extrabold text-[var(--theme-text)]">Bearer / API Key</label>
                                            <input 
                                                type="password" 
                                                placeholder="sk-..."
                                                value={proxy.key}
                                                onChange={(e) => updateProxy(proxy.id, { key: e.target.value })}
                                                className="w-full bg-[var(--theme-bg)] text-[var(--theme-text)] border border-[var(--theme-border-muted)] shadow-[var(--theme-shadow-inner)] rounded-xl p-3 text-sm focus:border-[var(--theme-accent)] outline-none font-mono"
                                            />
                                        </div>

                                        <div className="lg:col-span-6 space-y-2">
                                            <label className="text-xs font-extrabold text-[var(--theme-text)] flex items-center justify-between">
                                                Target Model
                                                <span className="text-[10px] bg-[var(--theme-convex-bg)] px-2 py-0.5 rounded-md text-[var(--theme-text-muted)] font-extrabold shadow-[var(--theme-shadow-outer)] border border-[var(--theme-border-muted)]">{proxy.models?.length || 0} loaded</span>
                                            </label>
                                            <div className="relative">
                                                <input 
                                                    type="text"
                                                    placeholder="Chỉ định model (VD: gpt-4)"
                                                    value={proxy.model}
                                                    onChange={(e) => updateProxy(proxy.id, { model: e.target.value })}
                                                    className="w-full bg-[var(--theme-bg)] text-[var(--theme-text)] border border-[var(--theme-border-muted)] shadow-[var(--theme-shadow-inner)] rounded-xl p-3 text-sm focus:border-[var(--theme-accent)] outline-none font-mono pr-12"
                                                />
                                                <select 
                                                    value=""
                                                    onChange={(e) => {
                                                      if(e.target.value) updateProxy(proxy.id, { model: e.target.value });
                                                    }}
                                                    className="absolute inset-y-0 right-0 w-10 opacity-0 cursor-pointer"
                                                >
                                                    <option value="">Lựa chọn đã fetch...</option>
                                                    {proxy.models?.map(m => (
                                                        <option key={m} value={m}>{m}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
`;

// use a safe regex that deletes everything from `{settings.proxies && settings.proxies.length > 0 ? (` to `{/* Stats for Proxy Pool */}`
const startToken = "{settings.proxies && settings.proxies.length > 0 ? (";
const endToken = "{/* Stats for Proxy Pool */}";

const startIdx = content.indexOf(startToken);
const endIdx = content.indexOf(endToken);

if (startIdx !== -1 && endIdx !== -1) {
  content = content.substring(0, startIdx) + newProxyBlock + "\n" + content.substring(endIdx);
  fs.writeFileSync(path, content);
  console.log("Successfully replaced the broken proxies mapping block!");
} else {
  console.log("Could not find start/end tokens to replace");
}
