import React, { useState, useEffect, useRef } from "react";

const buildSystemPrompt = (resumeText) => `You are an expert resume writer and ATS optimization specialist. You have been given a person's resume. When given a job description, you:

1. Extract ALL mandatory skills, keywords, and requirements from the JD
2. Rewrite the summary to match the role perfectly using JD language
3. Reorder experience so the most relevant job appears FIRST
4. Rewrite each bullet point using the JD's exact terminology and keywords
5. Restructure the Technical Skills section with JD-priority order (most relevant first)
6. Add bold labels to the most relevant job bullets that mirror the JD's responsibility headings
7. Ensure every mandatory and preferred skill from the JD appears in the resume naturally

Output ONLY complete valid LaTeX code using the Jake Gutierrez template. Start with \\documentclass and end with \\end{document}. No explanation before or after.

TEMPLATE:
\\documentclass[letterpaper,11pt]{article}
\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\input{glyphtounicode}
\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}
\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.15in}
\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}
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

RULES:
- Never invent experience. Only reframe existing experience using JD language.
- Keep all dates and company names accurate.
- Use \\vspace{3pt} between job entries.
- Certifications: \\\\[3pt] between each cert line.
- Skills: most relevant first.
- Output ONLY LaTeX. Nothing else.

RESUME:
${resumeText}`;

export default function App() {
  const [apiKey, setApiKey] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [showKey, setShowKey] = useState(false);
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
  const [loadingDots, setLoadingDots] = useState(0);
  const [heroVisible, setHeroVisible] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => { setTimeout(() => setHeroVisible(true), 100); }, []);

  useEffect(() => {
    if (loading) {
      const t = setInterval(() => setLoadingDots(d => (d + 1) % 4), 400);
      return () => clearInterval(t);
    }
  }, [loading]);

  useEffect(() => {
    if (keywords.length > 0) {
      keywords.forEach((_, i) => {
        setTimeout(() => setVisibleKw(v => [...v, i]), i * 80);
      });
    } else {
      setVisibleKw([]);
    }
  }, [keywords]);

  const saveKey = () => {
    const t = apiKeyInput.trim();
    if (!t.startsWith("sk-ant-")) { setError("Must start with sk-ant-"); return; }
    setApiKey(t); setApiKeySaved(true); setError(""); setApiKeyInput("");
  };

  const processFile = async (file) => {
    if (!file) return;
    setResumeFileName(file.name);
    setExtracting(true);
    setError("");
    try {
      if (file.type === "application/pdf") {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const base64 = ev.target.result.split(",")[1];
          try {
            const res = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
              body: JSON.stringify({
                model: "claude-sonnet-4-20250514", max_tokens: 2000,
                messages: [{ role: "user", content: [
                  { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
                  { type: "text", text: "Extract all text from this resume. Return only raw text preserving structure. No commentary." }
                ]}]
              })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            setResumeText(data.content[0].text);
          } catch (err) { setError("PDF read failed: " + err.message); }
          finally { setExtracting(false); }
        };
        reader.readAsDataURL(file);
      } else if (file.type === "text/plain") {
        setResumeText(await file.text());
        setExtracting(false);
      } else {
        setError("Please upload PDF or TXT"); setExtracting(false);
      }
    } catch (err) { setError(err.message); setExtracting(false); }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const extractKeywords = (text) => {
    const stop = new Set(["and","the","to","of","in","a","an","with","for","is","are","will","be","as","by","on","at","from","that","this","we","you","our","your","have","has","can","must","should","would","which","who","all","any","not","but","or","if","its","they","been","were","was","also","about","more","work","role","team","experience","years","strong","skills","knowledge","using","ensure","provide","support","manage"]);
    const words = text.match(/\b[A-Za-z][A-Za-z0-9+#.\/-]{2,}\b/g) || [];
    const freq = {};
    words.forEach(w => { const l = w.toLowerCase(); if (!stop.has(l)) freq[l] = (freq[l]||0)+1; });
    return Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,20).map(([w])=>w);
  };

  const tailor = async () => {
    if (!jd.trim() || !apiKey || !resumeText) return;
    setLoading(true); setError(""); setOutput(""); setStep("analyzing");
    const kws = extractKeywords(jd);
    setKeywords(kws);
    await new Promise(r => setTimeout(r, 1200));
    setStep("writing");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 4096,
          system: buildSystemPrompt(resumeText),
          messages: [{ role: "user", content: `Tailor this resume for the job description. ONLY LaTeX output:\n\n${jd}` }]
        })
      });
      if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e?.error?.message||`Error ${res.status}`); }
      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      const s = text.indexOf("\\documentclass"), e = text.lastIndexOf("\\end{document}");
      setOutput(s!==-1&&e!==-1 ? text.slice(s, e+14) : text);
      setStep("done");
    } catch(e) {
      setError(e.message||"Something went wrong."); setStep("idle");
    } finally { setLoading(false); }
  };

  const copy = () => { navigator.clipboard.writeText(output).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2500); }); };
  const reset = () => { setJd(""); setOutput(""); setStep("idle"); setKeywords([]); setVisibleKw([]); setError(""); };
  const resetAll = () => { reset(); setResumeText(""); setResumeFileName(""); };

  return (
    <div style={{minHeight:"100vh",background:"#0c0c0e",color:"#f0ece4",fontFamily:"'Cormorant Garamond','Georgia',serif",overflowX:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Instrument+Sans:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.6;transform:scale(0.97)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes borderPulse{0%,100%{border-color:rgba(255,255,255,0.1)}50%{border-color:rgba(255,255,255,0.3)}}
        @keyframes lineGrow{from{transform:scaleY(0)}to{transform:scaleY(1)}}
        @keyframes kwPop{from{opacity:0;transform:scale(0.8) translateY(4px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes loadBar{0%{left:-60%}100%{left:110%}}

        .hero-title{opacity:0;transform:translateY(24px);transition:opacity 0.8s cubic-bezier(0.16,1,0.3,1),transform 0.8s cubic-bezier(0.16,1,0.3,1);}
        .hero-title.visible{opacity:1;transform:translateY(0)}
        .hero-sub{opacity:0;transform:translateY(16px);transition:opacity 0.7s cubic-bezier(0.16,1,0.3,1) 0.2s,transform 0.7s cubic-bezier(0.16,1,0.3,1) 0.2s;}
        .hero-sub.visible{opacity:1;transform:translateY(0)}
        .hero-cards{opacity:0;transform:translateY(16px);transition:opacity 0.7s cubic-bezier(0.16,1,0.3,1) 0.35s,transform 0.7s cubic-bezier(0.16,1,0.3,1) 0.35s;}
        .hero-cards.visible{opacity:1;transform:translateY(0)}

        textarea,input[type=password],input[type=text]{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);color:#f0ece4;padding:14px 18px;font-size:14px;line-height:1.6;width:100%;font-family:'Instrument Sans',sans-serif;outline:none;transition:all 0.3s;border-radius:4px;}
        textarea{resize:vertical;}
        textarea:focus,input:focus{border-color:rgba(255,255,255,0.35);background:rgba(255,255,255,0.07);box-shadow:0 0 0 3px rgba(255,255,255,0.04);}
        textarea::placeholder,input::placeholder{color:rgba(240,236,228,0.25);font-style:italic}

        .btn-main{background:#f0ece4;color:#0c0c0e;border:none;padding:16px 52px;font-family:'Instrument Sans',sans-serif;font-size:13px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;transition:all 0.25s cubic-bezier(0.16,1,0.3,1);border-radius:3px;position:relative;overflow:hidden;}
        .btn-main::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.25) 50%,transparent 100%);transform:translateX(-100%);transition:transform 0.5s;}
        .btn-main:hover:not(:disabled)::after{transform:translateX(100%)}
        .btn-main:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 32px rgba(240,236,228,0.2)}
        .btn-main:active:not(:disabled){transform:translateY(0)}
        .btn-main:disabled{opacity:0.3;cursor:not-allowed}

        .btn-ghost{background:transparent;color:rgba(240,236,228,0.5);border:1px solid rgba(255,255,255,0.12);padding:10px 24px;font-family:'Instrument Sans',sans-serif;font-size:11px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;transition:all 0.2s;border-radius:3px;}
        .btn-ghost:hover{border-color:rgba(255,255,255,0.3);color:#f0ece4;background:rgba(255,255,255,0.05)}

        .btn-copy{background:rgba(255,255,255,0.06);color:#f0ece4;border:1px solid rgba(255,255,255,0.15);padding:12px 32px;font-family:'Instrument Sans',sans-serif;font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;transition:all 0.25s;border-radius:3px;}
        .btn-copy:hover{background:rgba(255,255,255,0.12);border-color:rgba(255,255,255,0.3)}
        .btn-copy.done{background:rgba(80,160,80,0.2);border-color:rgba(80,200,80,0.4);color:#90d090}

        .kw-tag{display:inline-block;border:1px solid rgba(255,255,255,0.15);color:rgba(240,236,228,0.6);padding:5px 14px;font-family:'Instrument Sans',sans-serif;font-size:11px;letter-spacing:0.05em;margin:3px;border-radius:2px;animation:kwPop 0.3s cubic-bezier(0.16,1,0.3,1) both;transition:all 0.2s;}
        .kw-tag:hover{border-color:rgba(255,255,255,0.4);color:#f0ece4;transform:translateY(-1px)}

        .upload-zone{border:1.5px dashed rgba(255,255,255,0.15);padding:56px 40px;text-align:center;cursor:pointer;transition:all 0.35s cubic-bezier(0.16,1,0.3,1);background:rgba(255,255,255,0.02);border-radius:4px;animation:borderPulse 3s ease-in-out infinite;}
        .upload-zone:hover,.upload-zone.drag{border-color:rgba(255,255,255,0.5);background:rgba(255,255,255,0.06);animation:none;transform:scale(1.005);}
        .upload-zone.loaded{border-style:solid;border-color:rgba(100,180,100,0.4);background:rgba(60,120,60,0.08);animation:none;}

        .marquee-track{display:flex;white-space:nowrap;animation:marquee 25s linear infinite}
        .marquee-item{padding:0 48px;font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:300;font-style:italic;color:rgba(240,236,228,0.2);letter-spacing:0.06em;}

        .step-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:4px;padding:28px 24px;transition:all 0.3s cubic-bezier(0.16,1,0.3,1);}
        .step-card:hover{background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.18);transform:translateY(-3px);}

        .code-out{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);color:rgba(200,210,220,0.8);padding:32px;font-family:'Fira Code','Cascadia Code',monospace;font-size:11px;line-height:1.75;white-space:pre-wrap;word-break:break-word;max-height:500px;overflow-y:auto;border-radius:4px;}
        .code-out::-webkit-scrollbar{width:3px}
        .code-out::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1)}

        .shimmer-text{background:linear-gradient(90deg,rgba(240,236,228,0.3) 0%,rgba(240,236,228,0.9) 50%,rgba(240,236,228,0.3) 100%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shimmer 2.5s linear infinite;}

        .loading-bar{height:1px;background:rgba(255,255,255,0.06);position:relative;overflow:hidden;margin:32px 0;}
        .loading-bar::after{content:'';position:absolute;top:0;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.6),transparent);animation:loadBar 1.5s linear infinite;}

        .success-line{width:1px;transform-origin:top;animation:lineGrow 0.6s cubic-bezier(0.16,1,0.3,1) 0.2s both;margin:0 auto 28px;}

        @media(max-width:768px){
          .hero-grid{grid-template-columns:1fr!important}
          .steps-grid{grid-template-columns:1fr 1fr!important}
          nav{padding:16px 24px!important}
          .main-pad{padding:0 24px 80px!important}
          .hero-pad{padding:60px 24px 40px!important}
          .done-grid{grid-template-columns:1fr!important}
        }
      `}</style>

      {/* Ambient orbs */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
        <div style={{position:"absolute",width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,rgba(240,236,228,0.03) 0%,transparent 70%)",top:-200,right:-100,animation:"float 8s ease-in-out infinite"}}/>
        <div style={{position:"absolute",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(180,200,240,0.04) 0%,transparent 70%)",bottom:0,left:-100,animation:"float 10s ease-in-out infinite reverse"}}/>
      </div>

      {/* Nav */}
      <nav style={{padding:"20px 60px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid rgba(255,255,255,0.06)",position:"sticky",top:0,zIndex:100,background:"rgba(12,12,14,0.85)",backdropFilter:"blur(20px)"}}>
        <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
          <div style={{width:28,height:28,border:"1px solid rgba(255,255,255,0.2)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{width:8,height:8,background:"#f0ece4",borderRadius:"50%"}}/>
          </div>
          <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"20px",fontWeight:600,letterSpacing:"0.02em"}}>ResumeAI</span>
          <span style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"10px",color:"rgba(240,236,228,0.25)",marginLeft:"6px",letterSpacing:"0.1em",textTransform:"uppercase",borderLeft:"1px solid rgba(255,255,255,0.1)",paddingLeft:"12px"}}>Free for everyone</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
          {apiKeySaved ? (
            <>
              <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:"#60c060",boxShadow:"0 0 8px rgba(96,192,96,0.6)",animation:"pulse 2s ease-in-out infinite"}}/>
                <span style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"11px",color:"rgba(150,220,150,0.8)",letterSpacing:"0.08em",textTransform:"uppercase"}}>Connected</span>
              </div>
              <button className="btn-ghost" style={{padding:"6px 16px",fontSize:"10px"}} onClick={()=>{setApiKeySaved(false);setApiKey("");}}>Change Key</button>
            </>
          ) : (
            <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:"#c06060",animation:"pulse 1.5s ease-in-out infinite"}}/>
              <span style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"11px",color:"rgba(200,120,120,0.8)",letterSpacing:"0.08em",textTransform:"uppercase"}}>No Key</span>
            </div>
          )}
        </div>
      </nav>

      <div style={{position:"relative",zIndex:1}}>

        {/* API Key Panel */}
        {!apiKeySaved && (
          <div style={{padding:"80px 60px",borderBottom:"1px solid rgba(255,255,255,0.06)",animation:"fadeUp 0.6s ease-out both"}}>
            <div style={{maxWidth:560,margin:"0 auto"}}>
              <div style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"11px",color:"rgba(240,236,228,0.25)",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:"20px"}}>To get started</div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(36px,5vw,60px)",fontWeight:300,lineHeight:1.05,marginBottom:20}}>
                Add your<br/><em style={{color:"rgba(240,236,228,0.5)"}}>API Key</em>
              </div>
              <p style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"13px",color:"rgba(240,236,228,0.35)",lineHeight:1.8,marginBottom:40}}>
                Each user brings their own Claude key. Stays in your browser only — never stored anywhere.<br/>
                Free key at <span style={{color:"rgba(240,236,228,0.65)",borderBottom:"1px solid rgba(255,255,255,0.2)"}}>console.anthropic.com</span> → API Keys → Create Key
              </p>
              <div style={{display:"flex",gap:"12px",alignItems:"stretch"}}>
                <div style={{flex:1,position:"relative"}}>
                  <input
                    type={showKey?"text":"password"}
                    value={apiKeyInput}
                    onChange={e=>setApiKeyInput(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&saveKey()}
                    placeholder="sk-ant-api03-..."
                    style={{paddingRight:"60px"}}
                  />
                  <button onClick={()=>setShowKey(s=>!s)} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"rgba(240,236,228,0.3)",cursor:"pointer",fontFamily:"'Instrument Sans',sans-serif",fontSize:"11px",letterSpacing:"0.04em",transition:"color 0.2s"}}
                    onMouseEnter={e=>e.target.style.color="rgba(240,236,228,0.7)"}
                    onMouseLeave={e=>e.target.style.color="rgba(240,236,228,0.3)"}>
                    {showKey?"hide":"show"}
                  </button>
                </div>
                <button className="btn-main" onClick={saveKey} style={{whiteSpace:"nowrap"}}>Connect →</button>
              </div>
              {error&&<p style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"12px",color:"rgba(220,120,100,0.8)",marginTop:"12px",animation:"fadeIn 0.3s"}}>{error}</p>}
            </div>
          </div>
        )}

        {/* Hero + Input */}
        {apiKeySaved && step==="idle" && (
          <>
            <div className="hero-pad" style={{padding:"80px 60px 60px",maxWidth:1200,margin:"0 auto"}}>
              <div className="hero-grid" style={{display:"grid",gridTemplateColumns:"1.1fr 0.9fr",gap:"80px",alignItems:"center"}}>
                <div>
                  <div style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"10px",color:"rgba(240,236,228,0.25)",letterSpacing:"0.16em",textTransform:"uppercase",marginBottom:"24px",animation:"fadeIn 0.6s 0.1s both"}}>Powered by Claude AI</div>
                  <h1 className={`hero-title ${heroVisible?"visible":""}`} style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(48px,6vw,88px)",fontWeight:300,lineHeight:0.92,letterSpacing:"-0.02em",marginBottom:"28px"}}>
                    Your resume.<br/>Every role.<br/><em style={{fontStyle:"italic",color:"rgba(240,236,228,0.45)"}}>Perfectly matched.</em>
                  </h1>
                  <p className={`hero-sub ${heroVisible?"visible":""}`} style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"14px",color:"rgba(240,236,228,0.4)",lineHeight:1.85,maxWidth:400}}>
                    Upload your resume, paste any job description. Claude rewrites it using the JD's exact language — maximising ATS score and recruiter relevance. Free for everyone.
                  </p>
                </div>
                <div className={`hero-cards steps-grid ${heroVisible?"visible":""}`} style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1px",background:"rgba(255,255,255,0.06)"}}>
                  {[
                    {n:"01",t:"Upload",d:"PDF or TXT resume"},
                    {n:"02",t:"Paste JD",d:"Full job description"},
                    {n:"03",t:"AI Tailors",d:"~20 seconds"},
                    {n:"04",t:"Apply",d:"LaTeX → PDF → Send"},
                  ].map((s,i)=>(
                    <div key={s.n} className="step-card" style={{transitionDelay:`${i*0.05}s`}}>
                      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"48px",fontWeight:300,color:"rgba(240,236,228,0.08)",lineHeight:1,marginBottom:"10px"}}>{s.n}</div>
                      <div style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"12px",fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:"5px",color:"rgba(240,236,228,0.75)"}}>{s.t}</div>
                      <div style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"12px",color:"rgba(240,236,228,0.3)",lineHeight:1.5}}>{s.d}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Marquee */}
            <div style={{overflow:"hidden",borderTop:"1px solid rgba(255,255,255,0.05)",borderBottom:"1px solid rgba(255,255,255,0.05)",padding:"16px 0",marginBottom:"60px"}}>
              <div className="marquee-track">
                {["ATS Optimised","Keyword Matched","Jake Gutierrez Template","Any Industry","Any Role","Free to Use","Powered by Claude","Upload Any Resume","Get LaTeX Output","Tailored in 20s","ATS Optimised","Keyword Matched","Jake Gutierrez Template","Any Industry","Any Role","Free to Use","Powered by Claude","Upload Any Resume","Get LaTeX Output","Tailored in 20s"].map((t,i)=>(
                  <span key={i} className="marquee-item">{t}</span>
                ))}
              </div>
            </div>

            {/* Upload + JD */}
            <div className="main-pad" style={{maxWidth:780,margin:"0 auto",padding:"0 60px 100px"}}>

              {/* Upload */}
              <div style={{marginBottom:"48px",animation:"fadeUp 0.5s 0.1s both"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
                  <label style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"10px",letterSpacing:"0.14em",textTransform:"uppercase",color:"rgba(240,236,228,0.3)"}}>01 — Your Resume</label>
                  {resumeText && <span style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"11px",color:"rgba(100,180,100,0.7)"}}>{resumeText.length.toLocaleString()} chars extracted</span>}
                </div>
                {!resumeText ? (
                  <label className={`upload-zone ${dragOver?"drag":""}`} style={{display:"block"}}
                    onDragOver={e=>{e.preventDefault();setDragOver(true)}}
                    onDragLeave={()=>setDragOver(false)}
                    onDrop={handleDrop}>
                    <input ref={fileInputRef} type="file" accept=".pdf,.txt" onChange={e=>processFile(e.target.files[0])} style={{display:"none"}} />
                    {extracting ? (
                      <div>
                        <div style={{width:28,height:28,border:"1.5px solid rgba(255,255,255,0.1)",borderTop:"1.5px solid rgba(255,255,255,0.7)",borderRadius:"50%",margin:"0 auto 20px",animation:"spin 0.8s linear infinite"}}/>
                        <p className="shimmer-text" style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"13px",letterSpacing:"0.06em"}}>Reading your resume...</p>
                      </div>
                    ) : (
                      <div>
                        <div style={{fontSize:"28px",marginBottom:"14px",opacity:0.35,animation:"float 3s ease-in-out infinite"}}>↑</div>
                        <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"24px",fontWeight:300,marginBottom:"8px",color:"rgba(240,236,228,0.65)"}}>Drop your resume here</p>
                        <p style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"12px",color:"rgba(240,236,228,0.22)",letterSpacing:"0.04em"}}>PDF or TXT · or click to browse</p>
                      </div>
                    )}
                  </label>
                ) : (
                  <div className="upload-zone loaded" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"24px 28px",animation:"fadeIn 0.4s"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"16px"}}>
                      <div style={{width:36,height:36,border:"1px solid rgba(100,180,100,0.3)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(100,200,100,0.8)",fontSize:"16px"}}>✓</div>
                      <div>
                        <p style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"11px",color:"rgba(120,200,120,0.7)",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:"3px"}}>Resume loaded</p>
                        <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"18px",fontWeight:300}}>{resumeFileName}</p>
                      </div>
                    </div>
                    <button className="btn-ghost" style={{fontSize:"10px",padding:"7px 16px"}} onClick={resetAll}>Change</button>
                  </div>
                )}
              </div>

              {/* JD */}
              <div style={{marginBottom:"36px",animation:"fadeUp 0.5s 0.2s both"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
                  <label style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"10px",letterSpacing:"0.14em",textTransform:"uppercase",color:"rgba(240,236,228,0.3)"}}>02 — Job Description</label>
                  <span style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"11px",color:"rgba(240,236,228,0.18)",fontStyle:"italic"}}>{jd.length} chars</span>
                </div>
                <textarea value={jd} onChange={e=>setJd(e.target.value)} rows={12}
                  placeholder="Paste the full job description — title, responsibilities, required skills, mandatory qualifications..."/>
              </div>

              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",animation:"fadeUp 0.5s 0.3s both"}}>
                <div>
                  {!resumeText && <p style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"12px",color:"rgba(200,160,80,0.65)",fontStyle:"italic"}}>↑ Upload resume first</p>}
                  {resumeText&&jd.length>0&&jd.length<80 && <p style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"12px",color:"rgba(200,160,80,0.65)",fontStyle:"italic"}}>Paste the full JD for best results</p>}
                </div>
                <button className="btn-main" onClick={tailor} disabled={!jd.trim()||jd.length<80||!resumeText||extracting}>
                  Tailor Resume →
                </button>
              </div>

              {error&&(
                <div style={{marginTop:"20px",padding:"14px 18px",border:"1px solid rgba(220,80,80,0.2)",borderRadius:"4px",background:"rgba(180,60,60,0.06)",animation:"fadeIn 0.3s"}}>
                  <p style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"13px",color:"rgba(220,120,100,0.9)"}}>{error}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Loading */}
        {(step==="analyzing"||step==="writing") && (
          <div style={{minHeight:"75vh",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",padding:"60px",animation:"fadeIn 0.4s"}}>
            <div style={{textAlign:"center",maxWidth:600}}>
              <div style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"10px",color:"rgba(240,236,228,0.2)",letterSpacing:"0.16em",textTransform:"uppercase",marginBottom:"32px",animation:"pulse 2s infinite"}}>
                {step==="analyzing" ? "Analysing"+".".repeat(loadingDots+1) : "Writing"+".".repeat(loadingDots+1)}
              </div>
              <h2 className="shimmer-text" style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(36px,5vw,64px)",fontWeight:300,lineHeight:1.05,marginBottom:"20px"}}>
                {step==="analyzing" ? <span>Reading the<br/><em>job description...</em></span> : <span>Tailoring your<br/><em>resume...</em></span>}
              </h2>
              <p style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"13px",color:"rgba(240,236,228,0.28)",letterSpacing:"0.03em",marginBottom:"48px"}}>
                {step==="analyzing" ? "Identifying mandatory skills, keywords, requirements" : "Rewriting bullets, injecting keywords, reordering sections"}
              </p>
              <div className="loading-bar"/>
              {keywords.length>0 && (
                <div style={{marginTop:"40px"}}>
                  <p style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"10px",color:"rgba(240,236,228,0.18)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"16px"}}>Keywords detected</p>
                  <div>{keywords.map((k,i) => visibleKw.includes(i) && <span key={i} className="kw-tag" style={{animationDelay:`${i*0.08}s`}}>{k}</span>)}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Done */}
        {step==="done" && output && (
          <div style={{animation:"fadeIn 0.5s"}}>
            <div style={{padding:"80px 60px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
              <div style={{maxWidth:960,margin:"0 auto"}}>
                <div className="success-line" style={{height:60,background:"linear-gradient(to bottom,transparent,rgba(100,200,100,0.5))"}}/>
                <div className="done-grid" style={{display:"grid",gridTemplateColumns:"1fr auto",gap:"48px",alignItems:"end"}}>
                  <div>
                    <p style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"10px",color:"rgba(100,200,100,0.6)",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:"16px",animation:"fadeUp 0.5s 0.3s both"}}>✓ Resume tailored</p>
                    <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(40px,5vw,72px)",fontWeight:300,lineHeight:0.92,marginBottom:"20px",animation:"fadeUp 0.6s 0.35s both"}}>
                      Your resume<br/>is <em style={{color:"rgba(240,236,228,0.4)"}}>ready.</em>
                    </h2>
                    <p style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"13px",color:"rgba(240,236,228,0.3)",lineHeight:1.8,maxWidth:480,animation:"fadeUp 0.5s 0.45s both"}}>
                      Copy LaTeX → overleaf.com → New Project → Blank → paste → Recompile → Download PDF.
                    </p>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:"10px",minWidth:180,animation:"fadeUp 0.5s 0.5s both"}}>
                    <button className={`btn-copy ${copied?"done":""}`} onClick={copy}>{copied?"✓ Copied!":"Copy LaTeX"}</button>
                    <button className="btn-ghost" onClick={reset}>← New JD</button>
                    <button className="btn-ghost" onClick={resetAll}>← New Resume</button>
                  </div>
                </div>
              </div>
            </div>

            <div style={{padding:"40px 60px",borderBottom:"1px solid rgba(255,255,255,0.05)",maxWidth:960,margin:"0 auto",animation:"fadeUp 0.5s 0.6s both"}}>
              <p style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"10px",color:"rgba(240,236,228,0.18)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"14px"}}>JD keywords injected</p>
              {keywords.map((k,i)=><span key={i} className="kw-tag">{k}</span>)}
            </div>

            <div style={{padding:"32px 60px",borderBottom:"1px solid rgba(255,255,255,0.05)",background:"rgba(255,255,255,0.01)",animation:"fadeUp 0.5s 0.65s both"}}>
              <div style={{maxWidth:960,margin:"0 auto",display:"flex",gap:"28px",flexWrap:"wrap",alignItems:"center"}}>
                <span style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"10px",color:"rgba(240,236,228,0.18)",letterSpacing:"0.1em",textTransform:"uppercase"}}>Next steps</span>
                {["Copy LaTeX","overleaf.com","New Project → Blank","Paste → Recompile","Download PDF"].map((s,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:"8px"}}>
                    <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"16px",color:"rgba(240,236,228,0.18)",fontWeight:300}}>{i+1}.</span>
                    <span style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"12px",color:"rgba(240,236,228,0.38)",letterSpacing:"0.03em"}}>{s}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{maxWidth:960,margin:"0 auto",padding:"48px 60px 80px",animation:"fadeUp 0.5s 0.7s both"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
                <p style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"10px",color:"rgba(240,236,228,0.18)",letterSpacing:"0.12em",textTransform:"uppercase"}}>LaTeX Source</p>
                <button className={`btn-copy ${copied?"done":""}`} style={{padding:"8px 20px",fontSize:"10px"}} onClick={copy}>{copied?"✓ Copied":"Copy"}</button>
              </div>
              <div className="code-out">{output}</div>
            </div>
          </div>
        )}

      </div>

      {/* Footer */}
      <div style={{borderTop:"1px solid rgba(255,255,255,0.05)",padding:"28px 60px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"12px",position:"relative",zIndex:1}}>
        <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"15px",fontWeight:300,color:"rgba(240,236,228,0.2)",fontStyle:"italic"}}>ResumeAI — Free Resume Tailor</span>
        <span style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"11px",color:"rgba(240,236,228,0.12)",letterSpacing:"0.05em"}}>Your resume and API key are never stored · Everything runs in your browser</span>
      </div>
    </div>
  );
}
