import fs from 'fs';

const path = 'src/components/features/settings/SettingsScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('import { useNeumorphicTheme }')) {
  content = "import { useNeumorphicTheme } from '../../../hooks/useNeumorphicTheme';\n" + content;
}

if (!content.includes('const s = useNeumorphicTheme();')) {
  content = content.replace("const [activeTab, setActiveTab] =", "const s = useNeumorphicTheme();\n  const [activeTab, setActiveTab] =");
}

// Remove DeepSeek and GCLI
content = content.replace(/const nonGGChanProxies = settings\.proxies\.filter\(p => !p\.url \|\| !p\.url\.includes\('gcli\.ggchan\.dev'\)\);/g, "const nonGGChanProxies = settings.proxies;");
content = content.replace(/\{proxy\.url && proxy\.url\.includes\('gcli\.ggchan\.dev'\) && \([\s\S]*?\}\)/g, "");
content = content.replace(/<button[^>]*?onClick=\{handleLoadDeepSeekPreset\}[^>]*?>[\s\S]*?<\/button>/g, "");


// Instead of parsing perfectly, we can inject CSS variables matching `s.*` into the wrapper div!
const wrapperPattern = /className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-6 lg:p-10 overflow-hidden"/;
const wrapperReplacement = `className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-6 lg:p-10 overflow-hidden"
     style={{
        '--theme-bg': s.bg,
        '--theme-card': s.card,
        '--theme-text': s.text,
        '--theme-text-muted': s.textMuted,
        '--theme-accent': s.accent,
        '--theme-border': s.border,
        '--theme-shadow-outer': s.shadowOuter,
        '--theme-shadow-inner': s.shadowInner,
        '--theme-shadow-button': s.shadowButton,
        '--theme-flat-bg': s.flatBg,
        '--theme-convex-bg': s.convexBg,
        '--theme-concave-bg': s.concaveBg,
        '--theme-border-muted': s.borderMuted
     } as React.CSSProperties}`;

content = content.replace(wrapperPattern, wrapperReplacement);

// Now replace all the hardcoded colors to use CSS variables
// bg-[#e6ebf4] dark:bg-[#0b1329] -> bg-[var(--theme-bg)]
content = content.replace(/bg-\[\#e6ebf4\] dark:bg-\[\#0b1329\]/g, "bg-[var(--theme-bg)] text-[var(--theme-text)] border-[var(--theme-border-muted)]");
content = content.replace(/border-\[\#cbd2df\]\/30 dark:border-\[\#142042\]\/20/g, "border-[var(--theme-border)]");
content = content.replace(/border-\[\#cbd2df\]\/20 dark:border-\[\#142042\]\/10/g, "border-[var(--theme-border-muted)]");
content = content.replace(/border-\[\#cbd2df\]\/10 dark:border-\[\#142042\]\/5/g, "border-[var(--theme-border-muted)]");
content = content.replace(/border-\[\#cbd2df\]\/15 dark:border-\[\#142042\]\/5/g, "border-[var(--theme-border-muted)]");
content = content.replace(/border-\[\#cbd2df\]\/25 dark:border-\[\#142042\]\/15/g, "border-[var(--theme-border-muted)]");

content = content.replace(/shadow-\[12px_12px_24px_\#cbd2df,-12px_-12px_24px_\#ffffff\] dark:shadow-\[12px_12px_24px_\#030610,-12px_-12px_24px_\#142042\]/g, "shadow-[var(--theme-shadow-outer)]");
content = content.replace(/shadow-\[6px_6px_12px_\#cbd2df,-6px_-6px_12px_\#ffffff\] dark:shadow-\[6px_6px_12px_\#030610,-6px_-6px_12px_\#142042\]/g, "shadow-[var(--theme-shadow-outer)]");
content = content.replace(/shadow-\[3px_3px_6px_\#cbd2df,-3px_-3px_6px_\#ffffff\] dark:shadow-\[3px_3px_6px_\#030610,-3px_-3px_6px_\#142042\]/g, "shadow-[var(--theme-shadow-button)]");
content = content.replace(/shadow-\[2px_2px_4px_\#cbd2df,-2px_-2px_4px_\#ffffff\] dark:shadow-\[2px_2px_4px_\#030610,-2px_-2px_4px_\#142042\]/g, "shadow-[var(--theme-shadow-button)]");

content = content.replace(/shadow-\[inset_2\.5px_2\.5px_5px_\#cbd2df,inset_-2\.5px_-2\.5px_5px_\#ffffff\] dark:shadow-\[inset_2\.5px_2\.5px_5px_\#030610,inset_-2\.5px_-2\.5px_5px_\#142042\]/g, "shadow-[var(--theme-shadow-inner)]");
content = content.replace(/shadow-\[inset_2px_2px_4px_\#cbd2df,inset_-2px_-2px_4px_\#ffffff\] dark:shadow-\[inset_2px_2px_4px_\#030610,inset_-2px_-2px_4px_\#142042\]/g, "shadow-[var(--theme-shadow-inner)]");
content = content.replace(/shadow-\[inset_3px_3px_6px_\#cbd2df,inset_-3px_-3px_6px_\#ffffff\] dark:shadow-\[inset_3px_3px_6px_\#030610,inset_-3px_-3px_6px_\#142042\]/g, "shadow-[var(--theme-shadow-inner)]");

content = content.replace(/active:shadow-\[inset_2px_2px_4px_\#cbd2df,inset_-2px_-2px_4px_\#ffffff\] dark:active:shadow-\[inset_2px_2px_4px_\#030610,inset_-2px_-2px_4px_\#142042\]/g, "active:shadow-[var(--theme-shadow-inner)]");
content = content.replace(/active:shadow-\[inset_4px_4px_8px_\#cbd2df,inset_-4px_-4px_8px_\#ffffff\] dark:active:shadow-\[inset_4px_4px_8px_\#030610,inset_-4px_-4px_8px_\#142042\]/g, "active:shadow-[var(--theme-shadow-inner)]");


content = content.replace(/text-slate-800 dark:text-slate-100/g, "text-[var(--theme-text)]");
content = content.replace(/text-slate-800 dark:text-slate-200/g, "text-[var(--theme-text)]");
content = content.replace(/text-slate-700 dark:text-slate-300/g, "text-[var(--theme-text)]");
content = content.replace(/text-slate-600 dark:text-slate-400/g, "text-[var(--theme-text-muted)]");
content = content.replace(/text-slate-500 dark:text-slate-400/g, "text-[var(--theme-text-muted)]");
content = content.replace(/text-slate-500 dark:text-slate-500/g, "text-[var(--theme-text-muted)]");
content = content.replace(/text-slate-400 dark:text-slate-500/g, "text-[var(--theme-text-muted)]");
content = content.replace(/text-slate-400 dark:text-slate-600/g, "text-[var(--theme-text-muted)]");

content = content.replace(/text-mystic-accent/g, "text-[var(--theme-accent)]");
content = content.replace(/bg-mystic-accent/g, "bg-[var(--theme-accent)]");
content = content.replace(/border-mystic-accent/g, "border-[var(--theme-accent)]");
content = content.replace(/ring-mystic-accent/g, "ring-[var(--theme-accent)]");


content = content.replace(/bg-\[\#cbd2df\]\/15 dark:bg-\[\#142042\]\/10/g, "bg-[var(--theme-convex-bg)] shadow-[var(--theme-shadow-outer)]");

// For select
content = content.replace(/bg-[#e6ebf4]/g, "bg-[var(--theme-bg)]");

fs.writeFileSync(path, content);
console.log("Settings proxy stuff cleaned and neumorphism applied");
