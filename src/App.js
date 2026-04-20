import React, { useState, useEffect, useRef } from "react";

const BG_IMAGE = "/faded_gallery-GuB2CI8-8JM-unsplash.jpg";

const buildSystemPrompt = (resumeText) => `You are an expert resume writer and ATS optimization specialist. You have been given a person's resume. When given a job description, you:
1. Extract ALL mandatory skills, keywords, and requirements from the JD
2. Rewrite the summary to match the role perfectly using JD language
3. Reorder experience so the most relevant job appears FIRST
4. Rewrite each bullet point using the JD's exact terminology and keywords
5. Restructure the Technical Skills section with JD-priority order
6. Add bold labels to the most relevant job bullets mirroring JD responsibility headings
7. Ensure every mandatory and preferred skill appears naturally

Output ONLY complete valid LaTeX using the Jake Gutierrez template. Start with \\documentclass, end with \\end{document}. No explanation.

TEMPLATE:
\\documentclass[letterpaper,11pt]{article}
\\usepackage{latexsym}\\usepackage[empty]{fullpage}\\usepackage{titlesec}\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}\\usepackage{verbatim}\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}\\usepackage{fancyhdr}\\usepackage[english]{babel}\\usepackage{tabularx}
\\input{glyphtounicode}\\pagestyle{fancy}\\fancyhf{}\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}\\renewcommand{\\footrulewidth}{0pt}
\\addtolength{\\oddsidemargin}{-0.5in}\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}\\addtolength{\\topmargin}{-.5in}\\addtolength{\\textheight}{1.15in}
\\urlstyle{same}\\raggedbottom\\raggedright\\setlength{\\tabcolsep}{0in}
\\titleformat{\\section}{\\vspace{-4pt}\\scshape\\raggedright\\large}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]
\\pdfgentounicode=1
\\newcommand{\\resumeItem}[1]{\\item\\small{{#1 \\vspace{-2pt}}}}
\\newcommand{\\resumeSubheading}[4]{\\vspace{-2pt}\\item\\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}\\textbf{#1} & #2 \\\\\\textit{\\small#3} & \\textit{\\small #4} \\\\\\end{tabular*}\\vspace{-7pt}}
\\newcommand{\\resumeSubItem}[1]{\\resumeItem{#1}\\vspace{-4pt}}
\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}
\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}

RULES: Never invent experience. Reframe only. Keep dates/companies accurate. \\vspace{3pt} between entries. Certs: \\\\[3pt] between lines. Output ONLY LaTeX.

RESUME: ${resumeText}`;

const MARQUEE = ["ATS Optimised","Keyword Matched","Any Industry","Any Role","Free","Powered by Claude AI","Upload Any Resume","Tailored in 20 Seconds","Jake Gutierrez Template","LaTeX Output"];

export default function App() {
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [jd, setJd] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState("idle");
  const [keywords, setKeywords] = useState([]);
  const [extracting, setExtracting] = useState(false);
  const [visibleKw, setVisibleKw] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [dots, setDots] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [sectionsVisible, setSectionsVisible] = useState({});
  const [processingPhase, setProcessingPhase] = useState("analyzing");
  const fileRef = useRef(null);

  useEffect(() => {
    // Staggered hero entrance
    setTimeout(() => setHeroLoaded(true), 100);
  }, []);

  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) setSectionsVisible(v => ({ ...v, [e.target.dataset.id]: true }));
      });
    }, { threshold: 0.12 });
    setTimeout(() => {
      document.querySelectorAll("[data-id]").forEach(el => obs.observe(el));
    }, 100);
    return () => obs.disconnect();
  }, [step]);

  useEffect(() => {
    if (loading) {
      const t = setInterval(() => setDots(d => (d + 1) % 4), 400);
      return () => clearInterval(t);
    }
  }, [loading]);

  useEffect(() => {
    if (keywords.length > 0) {
      keywords.forEach((_, i) => setTimeout(() => setVisibleKw(v => [...v, i]), i * 60));
    } else {
      setVisibleKw([]);
    }
  }, [keywords]);

  const processFile = async (file) => {
    if (!file) return;
    setResumeFileName(file.name); setExtracting(true); setError("");
    try {
      if (file.type === "application/pdf") {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const base64 = ev.target.result.split(",")[1];
          try {
            const res = await fetch("/api/tailor", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "claude-sonnet-4-20250514", max_tokens: 2000,
                messages: [{ role: "user", content: [
                  { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
                  { type: "text", text: "Extract all text from this resume. Raw text only, preserve structure. No commentary." }
                ]}]
              })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            setResumeText(data.content[0].text);
          } catch(err) { setError("PDF read failed: " + err.message); }
          finally { setExtracting(false); }
        };
        reader.readAsDataURL(file);
      } else if (file.type === "text/plain") {
        setResumeText(await file.text()); setExtracting(false);
      } else { setError("Upload PDF or TXT"); setExtracting(false); }
    } catch(err) { setError(err.message); setExtracting(false); }
  };

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files[0]); };

  const extractKw = (text) => {
    const stop = new Set(["and","the","to","of","in","a","an","with","for","is","are","will","be","as","by","on","at","from","that","this","we","you","our","your","have","has","can","must","should","would","who","all","any","not","but","or","if","its","they","been","were","was","also","about","more","work","role","team","experience","years","strong","skills","knowledge","using","ensure","provide","support","manage","ability","good","well","working","highly","new","including","such","other","within","across","between","through","during","before","after","over","under","both","each","few","more","most","some","such","no","nor","not","only","same","so","than","too","very","just","because","while","although","however","therefore","thus","hence","moreover","furthermore","additionally","consequently"]);
    const words = text.match(/\b[A-Za-z][A-Za-z0-9+#.\/-]{2,}\b/g) || [];
    const freq = {};
    words.forEach(w => { const l = w.toLowerCase(); if (!stop.has(l) && l.length > 2) freq[l] = (freq[l] || 0) + 1; });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 28).map(([w]) => w);
  };

  const tailor = async () => {
    if (!jd.trim() || !resumeText) return;
    setLoading(true); setError(""); setOutput(""); setStep("processing");
    setProcessingPhase("analyzing");
    const kws = extractKw(jd);
    setKeywords(kws);
    await new Promise(r => setTimeout(r, 1400));
    setProcessingPhase("writing");
    try {
      const res = await fetch("/api/tailor", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 4096,
          system: buildSystemPrompt(resumeText),
          messages: [{ role: "user", content: `Tailor this resume for the JD. ONLY LaTeX:\n\n${jd}` }]
        })
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `Error ${res.status}`); }
      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      const s = text.indexOf("\\documentclass"), e = text.lastIndexOf("\\end{document}");
      setOutput(s !== -1 && e !== -1 ? text.slice(s, e + 14) : text);
      setStep("done");
    } catch(e) { setError(e.message || "Something went wrong."); setStep("idle"); }
    finally { setLoading(false); }
  };

  const copy = () => {
    navigator.clipboard.writeText(output).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  };
  const reset = () => { setJd(""); setOutput(""); setStep("idle"); setKeywords([]); setVisibleKw([]); setError(""); };
  const resetAll = () => { reset(); setResumeText(""); setResumeFileName(""); };
  const vis = (id) => sectionsVisible[id] ? "v" : "";

  return (
    <div style={{ minHeight: "100vh", background: "#020202", color: "#fff", fontFamily: "'Cormorant Garamond', serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=Jost:wght@200;300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: #020202; }

        @keyframes fadeIn   { from { opacity:0 } to { opacity:1 } }
        @keyframes riseUp   { from { opacity:0; transform:translateY(48px) } to { opacity:1; transform:translateY(0) } }
        @keyframes riseUpSm { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
        @keyframes slideRight { from { transform:scaleX(0) } to { transform:scaleX(1) } }
        @keyframes marquee  { from { transform:translateX(0) } to { transform:translateX(-50%) } }
        @keyframes kenBurns { 0% { transform:scale(1) translate(0,0) } 100% { transform:scale(1.1) translate(-3%,-2%) } }
        @keyframes loadBar  { 0% { left:-45% } 100% { left:110% } }
        @keyframes kwIn     { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse    { 0%,100% { opacity:1 } 50% { opacity:0.25 } }
        @keyframes lineGrow { from { height:0 } to { height:56px } }
        @keyframes curtainDown { from { transform:scaleY(1) } to { transform:scaleY(0) } }

        /* Scroll-reveal */
        [data-id] { opacity:0; transform:translateY(32px); transition: opacity 1s cubic-bezier(0.16,1,0.3,1), transform 1s cubic-bezier(0.16,1,0.3,1); }
        [data-id].v { opacity:1; transform:translateY(0); }

        /* Nav */
        .nav {
          position:fixed; top:0; left:0; right:0; z-index:200;
          display:flex; justify-content:space-between; align-items:center;
          padding:32px 56px;
          transition: padding 0.5s cubic-bezier(0.16,1,0.3,1), background 0.5s, border-color 0.5s;
          border-bottom: 1px solid transparent;
        }
        .nav.s {
          padding:18px 56px;
          background: rgba(2,2,2,0.94);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom-color: rgba(255,255,255,0.05);
        }
        .nav-logo {
          font-family: 'Cormorant Garamond', serif;
          font-size: 16px; font-weight: 300; letter-spacing: 0.35em;
          text-transform: uppercase; color: #fff; cursor: pointer;
          font-style: italic;
        }
        .nav-r { display:flex; align-items:center; gap:36px; }
        .nl {
          font-family: 'Jost', sans-serif; font-size: 10px; font-weight: 300;
          letter-spacing: 0.22em; text-transform: uppercase;
          color: rgba(255,255,255,0.38); cursor: pointer; background: none;
          border: none; padding: 4px 0; position: relative;
          transition: color 0.3s;
        }
        .nl::after {
          content: ''; position:absolute; bottom:-2px; left:0; right:0;
          height:1px; background:#fff; transform:scaleX(0); transform-origin:left;
          transition:transform 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        .nl:hover { color:#fff; }
        .nl:hover::after { transform:scaleX(1); }
        .n-cta {
          font-family: 'Jost', sans-serif; font-size: 10px; font-weight: 400;
          letter-spacing: 0.22em; text-transform: uppercase; color:#fff;
          border: 1px solid rgba(255,255,255,0.3); padding: 11px 28px;
          cursor:pointer; background:transparent;
          transition: background 0.25s, color 0.25s, border-color 0.25s, transform 0.2s;
        }
        .n-cta:hover { background:#fff; color:#000; border-color:#fff; transform: translateY(-1px); }
        .n-cta:active { transform: translateY(0) scale(0.98); }

        /* Hero */
        .hero {
          position:relative; height:100vh; min-height:640px;
          display:flex; flex-direction:column; justify-content:flex-end;
          padding:0 56px 80px;
          overflow:hidden;
        }
        .hero-img {
          position:absolute; inset:0; z-index:0;
          background: url('${BG_IMAGE}') center/cover no-repeat;
          filter: brightness(0.2) saturate(1.8) contrast(1.1);
          animation: kenBurns 24s ease-in-out infinite alternate;
          transform-origin: center;
        }
        .hero-ov {
          position:absolute; inset:0; z-index:1;
          background: linear-gradient(to top, rgba(2,2,2,1) 0%, rgba(2,2,2,0.55) 35%, rgba(2,2,2,0.1) 70%, transparent 100%);
        }
        .hero-body { position:relative; z-index:2; }

        .h-eye {
          font-family: 'Jost', sans-serif; font-size:10px; font-weight:300;
          letter-spacing:0.32em; text-transform:uppercase;
          color:rgba(255,255,255,0.3); margin-bottom:22px;
          opacity:0; animation:fadeIn 1s 0.6s both;
        }
        .h-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(60px,9vw,128px); font-weight:300;
          line-height:0.87; letter-spacing:-0.015em; color:#fff;
          margin-bottom:44px;
          opacity:0; animation:riseUp 1.3s 0.8s cubic-bezier(0.16,1,0.3,1) both;
        }
        .h-title em { font-style:italic; }
        .h-foot {
          display:flex; justify-content:space-between; align-items:flex-end;
          opacity:0; animation:fadeIn 1s 1.4s both;
        }
        .h-desc {
          font-family:'Jost',sans-serif; font-size:13px; font-weight:300;
          letter-spacing:0.05em; color:rgba(255,255,255,0.38);
          line-height:1.9; max-width:380px;
        }
        .h-scroll {
          display:flex; flex-direction:column; align-items:center; gap:14px;
          font-family:'Jost',sans-serif; font-size:9px; font-weight:300;
          letter-spacing:0.28em; text-transform:uppercase;
          color:rgba(255,255,255,0.22);
        }
        .scroll-l { width:1px; transform-origin:top; animation:lineGrow 1.2s 1.8s cubic-bezier(0.16,1,0.3,1) both; background:rgba(255,255,255,0.18); }

        /* Divider */
        .div { width:100%; height:1px; background:rgba(255,255,255,0.06); }

        /* Marquee */
        .mq { overflow:hidden; border-top:1px solid rgba(255,255,255,0.05); border-bottom:1px solid rgba(255,255,255,0.05); padding:14px 0; }
        .mq-track { display:flex; white-space:nowrap; animation:marquee 30s linear infinite; }
        .mq-item { padding:0 44px; font-family:'Jost',sans-serif; font-size:9px; font-weight:300; letter-spacing:0.26em; text-transform:uppercase; color:rgba(255,255,255,0.16); }
        .mq-sep { color:rgba(255,255,255,0.1); padding:0 4px; font-size:5px; }

        /* Section labels */
        .lbl {
          font-family:'Jost',sans-serif; font-size:9px; font-weight:300;
          letter-spacing:0.3em; text-transform:uppercase; color:rgba(255,255,255,0.22);
          display:flex; align-items:center; gap:18px; margin-bottom:28px;
        }
        .lbl::before { content:''; display:block; width:28px; height:1px; background:rgba(255,255,255,0.18); flex-shrink:0; }

        /* Display type */
        .dt {
          font-family:'Cormorant Garamond',serif;
          font-size:clamp(36px,4.5vw,68px);
          font-weight:300; line-height:0.95; letter-spacing:-0.01em; color:#fff;
        }
        .dt em { font-style:italic; }
        .bt {
          font-family:'Jost',sans-serif; font-size:13px; font-weight:300;
          letter-spacing:0.04em; color:rgba(255,255,255,0.35); line-height:1.9;
        }

        /* Buttons */
        .bp {
          font-family:'Jost',sans-serif; font-size:10px; font-weight:400;
          letter-spacing:0.22em; text-transform:uppercase;
          color:#000; background:#fff; border:none;
          padding:15px 48px; cursor:pointer;
          display:inline-flex; align-items:center; gap:18px;
          transition: background 0.25s, transform 0.2s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s;
          position:relative; overflow:hidden;
        }
        .bp::after {
          content:''; position:absolute; inset:0;
          background:rgba(0,0,0,0.08);
          transform:translateX(-100%); transition:transform 0.3s;
        }
        .bp:hover::after { transform:translateX(0); }
        .bp:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 12px 40px rgba(255,255,255,0.12); }
        .bp:active:not(:disabled) { transform:translateY(0) scale(0.99); }
        .bp:disabled { opacity:0.2; cursor:not-allowed; }
        .bp-ln { width:22px; height:1px; background:#000; transition:width 0.3s; flex-shrink:0; }
        .bp:hover:not(:disabled) .bp-ln { width:38px; }

        .bs {
          font-family:'Jost',sans-serif; font-size:10px; font-weight:300;
          letter-spacing:0.2em; text-transform:uppercase;
          color:rgba(255,255,255,0.45); background:transparent;
          border:1px solid rgba(255,255,255,0.15); padding:13px 32px;
          cursor:pointer;
          transition:color 0.25s, border-color 0.25s, background 0.25s, transform 0.2s;
        }
        .bs:hover { color:#fff; border-color:rgba(255,255,255,0.45); background:rgba(255,255,255,0.04); transform:translateY(-1px); }
        .bs:active { transform:translateY(0) scale(0.98); }

        .bcp {
          font-family:'Jost',sans-serif; font-size:10px; font-weight:300;
          letter-spacing:0.2em; text-transform:uppercase;
          color:rgba(255,255,255,0.45); background:transparent;
          border:1px solid rgba(255,255,255,0.15); padding:13px 36px;
          cursor:pointer;
          transition:all 0.25s; 
        }
        .bcp:hover { color:#fff; border-color:rgba(255,255,255,0.45); transform:translateY(-1px); }
        .bcp:active { transform:scale(0.98); }
        .bcp.ok { color:#4ade80; border-color:rgba(74,222,128,0.35); }

        /* Upload */
        .uz {
          border:1px solid rgba(255,255,255,0.1);
          padding:88px 40px; text-align:center; cursor:pointer;
          transition:all 0.4s cubic-bezier(0.16,1,0.3,1);
          background:transparent; position:relative;
        }
        .uz::before {
          content:''; position:absolute; inset:0;
          background:radial-gradient(ellipse at 50% 60%,rgba(255,255,255,0.025) 0%,transparent 70%);
          opacity:0; transition:opacity 0.4s;
        }
        .uz:hover::before,.uz.dg::before { opacity:1; }
        .uz:hover,.uz.dg { border-color:rgba(255,255,255,0.3); }
        .uz.ld { border-color:rgba(74,222,128,0.3); background:rgba(74,222,128,0.02); }

        /* Process grid */
        .pg { display:grid; grid-template-columns:repeat(4,1fr); gap:1px; background:rgba(255,255,255,0.05); }
        .pi {
          background:#020202; padding:44px 32px 40px;
          transition:background 0.3s;
          cursor:default;
        }
        .pi:hover { background:#0c0c0c; }
        .pi-n {
          font-family:'Cormorant Garamond',serif; font-size:clamp(88px,9vw,130px);
          font-weight:300; font-style:italic; color:rgba(255,255,255,0.03);
          line-height:1; margin-bottom:-16px; user-select:none;
        }
        .pi-label { font-family:'Jost',sans-serif; font-size:9px; font-weight:300; letter-spacing:0.28em; text-transform:uppercase; color:rgba(255,255,255,0.2); margin-bottom:14px; }
        .pi-title { font-family:'Cormorant Garamond',serif; font-size:22px; font-weight:300; color:#fff; margin-bottom:14px; letter-spacing:0.02em; }
        .pi-body { font-family:'Jost',sans-serif; font-size:12px; font-weight:300; letter-spacing:0.03em; color:rgba(255,255,255,0.3); line-height:1.85; }

        /* Keywords — VAST display */
        .kw-flow {
          display:flex; flex-wrap:wrap; gap:10px 12px;
        }
        .kw-t {
          font-family:'Jost',sans-serif; font-size:10px; font-weight:300;
          letter-spacing:0.18em; text-transform:uppercase;
          color:rgba(255,255,255,0.3);
          border:1px solid rgba(255,255,255,0.1);
          padding:8px 20px;
          transition:color 0.25s, border-color 0.25s, transform 0.2s;
          animation:kwIn 0.5s cubic-bezier(0.16,1,0.3,1) both;
          cursor:default;
        }
        .kw-t:hover { color:rgba(255,255,255,0.7); border-color:rgba(255,255,255,0.3); transform:translateY(-1px); }

        /* Loading bar */
        .lb { height:1px; background:rgba(255,255,255,0.05); position:relative; overflow:hidden; margin:44px 0; }
        .lf { position:absolute; top:0; height:100%; width:40%; background:rgba(255,255,255,0.35); animation:loadBar 1.8s ease-in-out infinite; }

        /* Code */
        .cb {
          background:#060606; border:1px solid rgba(255,255,255,0.06);
          color:#3d4a5c; padding:32px;
          font-family:'Fira Code','Cascadia Code',monospace;
          font-size:11px; line-height:1.8; white-space:pre-wrap;
          word-break:break-word; max-height:520px; overflow-y:auto;
        }
        .cb::-webkit-scrollbar { width:2px; }
        .cb::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.07); }

        textarea, input[type=text] {
          background:transparent;
          border:none; border-bottom:1px solid rgba(255,255,255,0.12);
          color:#fff; padding:16px 0; font-size:14px; line-height:1.65;
          width:100%; font-family:'Jost',sans-serif; font-weight:300;
          letter-spacing:0.04em; outline:none; border-radius:0;
          transition:border-color 0.3s;
        }
        textarea {
          border:1px solid rgba(255,255,255,0.1);
          padding:22px 26px; resize:vertical;
          transition:border-color 0.3s, background 0.3s;
        }
        textarea:focus, input:focus { border-color:rgba(255,255,255,0.35); }
        textarea:focus { background:rgba(255,255,255,0.02); }
        textarea::placeholder, input::placeholder {
          color:rgba(255,255,255,0.14); font-style:italic;
          font-family:'Cormorant Garamond',serif; font-size:17px;
        }

        @media(max-width:768px){
          .nav,.nav.s{padding:20px 24px}
          .hero{padding:0 24px 56px}
          .h-title{font-size:54px}
          .h-foot{flex-direction:column;gap:28px;align-items:flex-start}
          .pg{grid-template-columns:1fr 1fr}
          .pi-n{font-size:80px}
          .s-pad{padding:80px 24px!important}
          .footer{flex-direction:column;gap:16px;text-align:center;padding:40px 24px!important}
        }
      `}</style>

      {/* ── NAV ── */}
      <nav className={`nav${scrollY > 30 ? " s" : ""}`}>
        <span className="nav-logo" onClick={() => { resetAll(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
          Resume AI
        </span>
        <div className="nav-r">
          <button className="nl" onClick={() => document.getElementById("process")?.scrollIntoView({ behavior: "smooth" })}>Process</button>
          <button className="nl" onClick={() => document.getElementById("form")?.scrollIntoView({ behavior: "smooth" })}>Begin</button>
          <button className="n-cta" onClick={() => document.getElementById("form")?.scrollIntoView({ behavior: "smooth" })}>
            Start Now
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div className="hero">
        <div className="hero-img" />
        <div className="hero-ov" />
        <div className="hero-body">
          <p className="h-eye">Precision Resume Engineering — Claude AI</p>
          <h1 className="h-title">
            A tailored<br />resume for<br /><em>every role.</em>
          </h1>
          <div className="h-foot">
            <p className="h-desc">
              Upload your resume. Paste any job description.<br />
              Receive a precisely tailored LaTeX resume in seconds.<br />
              Free. No account required.
            </p>
            <div className="h-scroll">
              <span>Scroll</span>
              <div className="scroll-l" />
            </div>
          </div>
        </div>
      </div>

      {/* ── MARQUEE ── */}
      <div className="mq">
        <div className="mq-track">
          {[...MARQUEE, ...MARQUEE].map((t, i) => (
            <span key={i}><span className="mq-item">{t}</span><span className="mq-sep">◆</span></span>
          ))}
        </div>
      </div>

      {/* ── INTRO ── */}
      <div className="s-pad" style={{ padding: "130px 56px", maxWidth: 1200, margin: "0 auto" }}>
        <div data-id="intro" className={vis("intro")} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 96, alignItems: "end" }}>
          <div>
            <div className="lbl">The Method</div>
            <h2 className="dt">
              Keyword precision.<br /><em>Human clarity.</em><br />Every time.
            </h2>
          </div>
          <div>
            <p className="bt" style={{ marginBottom: 24 }}>
              Most resumes fail not because of experience, but because they don't speak the language of the role. Our system reads the job description, extracts every requirement, and rewrites your resume to match — precisely and intelligently.
            </p>
            <p className="bt">
              The output is a clean LaTeX document built on the industry-standard Jake Gutierrez template. Paste it into Overleaf, compile, and apply.
            </p>
          </div>
        </div>
      </div>

      <div className="div" />

      {/* ── PROCESS ── */}
      <div id="process" style={{ paddingTop: 120, paddingBottom: 0 }}>
        <div className="s-pad" style={{ padding: "0 56px 60px", maxWidth: 1200, margin: "0 auto" }}>
          <div data-id="pl" className={vis("pl")}>
            <div className="lbl">How It Works</div>
            <h2 className="dt"><em>Four steps.</em><br />One perfect resume.</h2>
          </div>
        </div>
        <div
          className="pg"
          data-id="pg"
          style={{
            opacity: sectionsVisible["pg"] ? 1 : 0,
            transform: sectionsVisible["pg"] ? "none" : "translateY(28px)",
            transition: "opacity 1s cubic-bezier(0.16,1,0.3,1) 0.15s, transform 1s cubic-bezier(0.16,1,0.3,1) 0.15s"
          }}
        >
          {[
            { n: "I",   num: "01", t: "Upload",   d: "Drop your current resume — PDF or plain text. Any format, any industry, any career stage." },
            { n: "II",  num: "02", t: "Describe", d: "Paste the complete job description. Every word matters. The more detail you provide, the more precise the output." },
            { n: "III", num: "03", t: "Tailored", d: "Claude analyses both documents simultaneously. Keywords extracted, bullets rewritten, sections reordered for maximum relevance." },
            { n: "IV",  num: "04", t: "Apply",    d: "Copy the LaTeX source. Open Overleaf. Paste and recompile. Download your PDF. Send. Done in under two minutes." },
          ].map((s, i) => (
            <div key={i} className="pi">
              <div className="pi-n">{s.n}</div>
              <div className="pi-label">{s.num}</div>
              <div className="pi-title">{s.t}</div>
              <p className="pi-body">{s.d}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="div" style={{ marginTop: 0 }} />

      {/* ── FORM ── */}
      {step === "idle" && (
        <div id="form" className="s-pad" style={{ padding: "130px 56px", maxWidth: 960, margin: "0 auto" }}>

          {/* Resume upload */}
          <div data-id="f1" className={vis("f1")} style={{ marginBottom: 88 }}>
            <div className="lbl" style={{ marginBottom: 36 }}>01 — Resume</div>
            {!resumeText ? (
              <label
                className={`uz${dragOver ? " dg" : ""}`}
                style={{ display: "block" }}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <input ref={fileRef} type="file" accept=".pdf,.txt" onChange={e => processFile(e.target.files[0])} style={{ display: "none" }} />
                {extracting ? (
                  <div>
                    <div style={{ width: 1, height: 44, background: "rgba(255,255,255,0.12)", margin: "0 auto 28px" }} />
                    <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "22px", fontWeight: 300, fontStyle: "italic", color: "rgba(255,255,255,0.4)" }}>
                      Reading document...
                    </p>
                  </div>
                ) : (
                  <div>
                    <div style={{ width: 1, height: 44, background: "rgba(255,255,255,0.12)", margin: "0 auto 28px" }} />
                    <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "30px", fontWeight: 300, color: "rgba(255,255,255,0.55)", marginBottom: 14, letterSpacing: "0.01em" }}>
                      Place your resume here
                    </p>
                    <p style={{ fontFamily: "'Jost',sans-serif", fontSize: "10px", fontWeight: 300, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)" }}>
                      PDF or TXT · Click or drag to upload
                    </p>
                  </div>
                )}
              </label>
            ) : (
              <div style={{ border: "1px solid rgba(74,222,128,0.25)", padding: "32px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", animation: "fadeIn 0.5s", background: "rgba(74,222,128,0.02)" }}>
                <div>
                  <div className="lbl" style={{ color: "rgba(74,222,128,0.5)", marginBottom: 10 }}>Document Loaded</div>
                  <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "24px", fontWeight: 300, color: "#fff" }}>{resumeFileName}</p>
                  <p style={{ fontFamily: "'Jost',sans-serif", fontSize: "10px", color: "rgba(255,255,255,0.18)", marginTop: 8, letterSpacing: "0.08em" }}>
                    {resumeText.length.toLocaleString()} characters extracted
                  </p>
                </div>
                <button className="bs" onClick={resetAll}>Replace</button>
              </div>
            )}
          </div>

          {/* JD */}
          <div data-id="f2" className={vis("f2")} style={{ marginBottom: 56 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36 }}>
              <div className="lbl" style={{ marginBottom: 0 }}>02 — Position</div>
              <span style={{ fontFamily: "'Jost',sans-serif", fontSize: "10px", color: "rgba(255,255,255,0.14)", letterSpacing: "0.08em" }}>
                {jd.length} characters
              </span>
            </div>
            <textarea
              value={jd}
              onChange={e => setJd(e.target.value)}
              rows={13}
              placeholder="Paste the complete job description — role, responsibilities, requirements, qualifications..."
            />
          </div>

          {/* Submit */}
          <div data-id="f3" className={vis("f3")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
            <div>
              {!resumeText && (
                <p style={{ fontFamily: "'Jost',sans-serif", fontSize: "10px", color: "rgba(255,255,255,0.22)", letterSpacing: "0.18em", textTransform: "uppercase" }}>
                  Upload your resume to proceed
                </p>
              )}
              {resumeText && jd.length > 0 && jd.length < 80 && (
                <p style={{ fontFamily: "'Jost',sans-serif", fontSize: "10px", color: "rgba(255,255,255,0.22)", letterSpacing: "0.18em", textTransform: "uppercase" }}>
                  Paste the complete job description
                </p>
              )}
            </div>
            <button className="bp" onClick={tailor} disabled={!jd.trim() || jd.length < 80 || !resumeText || extracting}>
              Tailor Resume <div className="bp-ln" />
            </button>
          </div>

          {error && (
            <div style={{ marginTop: 36, borderLeft: "1px solid rgba(239,68,68,0.35)", paddingLeft: 20, animation: "fadeIn 0.3s" }}>
              <p style={{ fontFamily: "'Jost',sans-serif", fontSize: "11px", color: "rgba(239,68,68,0.6)", letterSpacing: "0.06em" }}>{error}</p>
            </div>
          )}
        </div>
      )}

      {/* ── PROCESSING ── */}
      {step === "processing" && (
        <div style={{ minHeight: "80vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "120px 56px", maxWidth: 960, margin: "0 auto", animation: "fadeIn 0.5s" }}>
          <div className="lbl" style={{ marginBottom: 36 }}>
            {processingPhase === "analyzing" ? "Analysing" : "Writing"}{".".repeat(dots + 1)}
          </div>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(44px,6vw,88px)", fontWeight: 300, lineHeight: 0.9, marginBottom: 0, letterSpacing: "-0.01em" }}>
            {processingPhase === "analyzing" ? <><em>Analysing</em><br />the role.</> : <><em>Writing</em><br />your resume.</>}
          </h2>
          <div className="lb"><div className="lf" /></div>
          {keywords.length > 0 && (
            <div>
              <div className="lbl" style={{ marginBottom: 28 }}>Terminology Extracted</div>
              <div className="kw-flow">
                {keywords.map((k, i) => visibleKw.includes(i) && (
                  <span key={i} className="kw-t" style={{ animationDelay: `${i * 0.06}s` }}>{k}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DONE ── */}
      {step === "done" && output && (
        <div style={{ animation: "fadeIn 0.6s" }}>

          <div className="s-pad" style={{ padding: "130px 56px", maxWidth: 1200, margin: "0 auto" }}>
            <div data-id="d1" className={vis("d1")}>
              <div className="lbl" style={{ marginBottom: 36 }}>Resume Complete</div>
              <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(52px,8vw,104px)", fontWeight: 300, lineHeight: 0.88, letterSpacing: "-0.015em", marginBottom: 64 }}>
                Your resume<br />is <em>ready.</em>
              </h2>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <button className={`bcp${copied ? " ok" : ""}`} onClick={copy}>
                  {copied ? "Copied to Clipboard" : "Copy LaTeX Source"}
                </button>
                <button className="bs" onClick={reset}>New Position</button>
                <button className="bs" onClick={resetAll}>New Resume</button>
              </div>
            </div>
          </div>

          <div className="div" />

          {/* Keywords — VAST, no box */}
          <div className="s-pad" style={{ padding: "96px 56px", maxWidth: 1200, margin: "0 auto" }} data-id="d2" className={vis("d2")}>
            <div className="lbl" style={{ marginBottom: 36 }}>Keywords Injected into Your Resume</div>
            <div className="kw-flow">
              {keywords.map((k, i) => (
                <span key={i} className="kw-t">{k}</span>
              ))}
            </div>
          </div>

          <div className="div" />

          {/* Steps */}
          <div className="s-pad" style={{ padding: "80px 56px", maxWidth: 1200, margin: "0 auto" }} data-id="d3" className={vis("d3")}>
            <div className="lbl" style={{ marginBottom: 36 }}>To Compile Your PDF</div>
            <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
              {["Copy the LaTeX source", "Open overleaf.com", "New Project — Blank", "Paste entire source", "Click Recompile", "Download your PDF"].map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                  <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "14px", color: "rgba(255,255,255,0.14)", fontStyle: "italic", flexShrink: 0 }}>{i + 1}.</span>
                  <span style={{ fontFamily: "'Jost',sans-serif", fontSize: "12px", fontWeight: 300, color: "rgba(255,255,255,0.32)", letterSpacing: "0.06em" }}>{s}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="div" />

          {/* Code */}
          <div className="s-pad" style={{ padding: "80px 56px 120px", maxWidth: 1200, margin: "0 auto" }} data-id="d4" className={vis("d4")}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div className="lbl" style={{ marginBottom: 0 }}>LaTeX Source</div>
              <button className={`bcp${copied ? " ok" : ""}`} style={{ padding: "10px 24px" }} onClick={copy}>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="cb">{output}</div>
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <div className="div" />
      <footer style={{ padding: "56px 56px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }} className="footer">
        <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "17px", fontWeight: 300, color: "rgba(255,255,255,0.18)", letterSpacing: "0.25em", textTransform: "uppercase", fontStyle: "italic" }}>
          Resume AI
        </span>
        <span style={{ fontFamily: "'Jost',sans-serif", fontSize: "9px", fontWeight: 300, color: "rgba(255,255,255,0.12)", letterSpacing: "0.22em", textTransform: "uppercase" }}>
          Designed &amp; Built by Suraj Ballamudi
        </span>
        <span style={{ fontFamily: "'Jost',sans-serif", fontSize: "9px", fontWeight: 300, color: "rgba(255,255,255,0.1)", letterSpacing: "0.18em", textTransform: "uppercase" }}>
          Free · Secure · No Account Required
        </span>
      </footer>
    </div>
  );
}
