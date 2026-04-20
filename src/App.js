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

const MARQUEE = ["ATS Optimised","Keyword Matched","Jake Gutierrez Template","Any Industry","Any Role","Free to Use","Powered by Claude AI","Upload Any Resume","Tailored in 20 Seconds","Get LaTeX Output"];

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
  const [dots, setDots] = useState(0);
  const [heroIn, setHeroIn] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { setTimeout(() => setHeroIn(true), 100); }, []);
  useEffect(() => {
    if (loading) { const t = setInterval(() => setDots(d => (d+1)%4), 380); return () => clearInterval(t); }
  }, [loading]);
  useEffect(() => {
    if (keywords.length > 0) keywords.forEach((_, i) => setTimeout(() => setVisibleKw(v => [...v, i]), i * 75));
    else setVisibleKw([]);
  }, [keywords]);

  const saveKey = () => {
    const t = apiKeyInput.trim();
    if (!t.startsWith("sk-ant-")) { setError("Must start with sk-ant-"); return; }
    setApiKey(t); setApiKeySaved(true); setError(""); setApiKeyInput("");
  };

  const processFile = async (file) => {
    if (!file) return;
    setResumeFileName(file.name); setExtracting(true); setError("");
    try {
      if (file.type === "application/pdf") {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const base64 = ev.target.result.split(",")[1];
          try {
            const res = await fetch("https://api.anthropic.com/v1/messages", {
              method:"POST",
              headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
              body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:2000,
                messages:[{role:"user",content:[
                  {type:"document",source:{type:"base64",media_type:"application/pdf",data:base64}},
                  {type:"text",text:"Extract all text from this resume. Raw text only, preserve structure. No commentary."}
                ]}]})
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            setResumeText(data.content[0].text);
          } catch(err) { setError("PDF read failed: "+err.message); }
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
    const stop = new Set(["and","the","to","of","in","a","an","with","for","is","are","will","be","as","by","on","at","from","that","this","we","you","our","your","have","has","can","must","should","would","who","all","any","not","but","or","if","its","they","been","were","was","also","about","more","work","role","team","experience","years","strong","skills","knowledge","using","ensure","provide","support","manage"]);
    const words = text.match(/\b[A-Za-z][A-Za-z0-9+#.\/-]{2,}\b/g)||[];
    const freq = {};
    words.forEach(w => { const l=w.toLowerCase(); if(!stop.has(l)) freq[l]=(freq[l]||0)+1; });
    return Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,20).map(([w])=>w);
  };

  const tailor = async () => {
    if (!jd.trim()||!apiKey||!resumeText) return;
    setLoading(true); setError(""); setOutput(""); setStep("analyzing");
    setKeywords(extractKw(jd));
    await new Promise(r=>setTimeout(r,1100));
    setStep("writing");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body: JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:4096,system:buildSystemPrompt(resumeText),
          messages:[{role:"user",content:`Tailor this resume for the JD. ONLY LaTeX:\n\n${jd}`}]})
      });
      if (!res.ok) { const e=await res.json().catch(()=>({})); throw new Error(e?.error?.message||`Error ${res.status}`); }
      const data = await res.json();
      const text = data.content?.[0]?.text||"";
      const s=text.indexOf("\\documentclass"), e=text.lastIndexOf("\\end{document}");
      setOutput(s!==-1&&e!==-1?text.slice(s,e+14):text);
      setStep("done");
    } catch(e) { setError(e.message||"Something went wrong."); setStep("idle"); }
    finally { setLoading(false); }
  };

  const copy = () => { navigator.clipboard.writeText(output).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2500);}); };
  const reset = () => { setJd(""); setOutput(""); setStep("idle"); setKeywords([]); setVisibleKw([]); setError(""); };
  const resetAll = () => { reset(); setResumeText(""); setResumeFileName(""); };

  const F = "'Fraunces', serif";
  const S = "'DM Sans', sans-serif";

  return (
    <div style={{minHeight:"100vh",background:"#000",color:"#fff",fontFamily:S,overflowX:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,100;0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,700;0,9..144,900;1,9..144,100;1,9..144,300;1,9..144,400;1,9..144,700;1,9..144,900&family=DM+Sans:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}

        @keyframes fadeUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes kwPop{from{opacity:0;transform:scale(0.8) translateY(6px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes loadSlide{0%{left:-50%}100%{left:110%}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}
        @keyframes borderGlow{0%,100%{border-color:rgba(255,255,255,0.1)}50%{border-color:rgba(255,220,150,0.4)}}
        @keyframes bgPan{0%{background-position:20% 40%}50%{background-position:80% 60%}100%{background-position:20% 40%}}
        @keyframes titleIn{from{opacity:0;transform:translateY(32px) rotate(-1deg)}to{opacity:1;transform:translateY(0) rotate(0deg)}}

        .bg-hero{
          position:fixed;inset:0;z-index:0;
          background:url('${BG_IMAGE}') center/cover no-repeat;
          filter:brightness(0.28) saturate(1.6) contrast(1.1);
          animation:bgPan 20s ease-in-out infinite;
          background-size:140%;
        }
        .bg-vignette{
          position:fixed;inset:0;z-index:1;
          background:radial-gradient(ellipse at 50% 30%,rgba(0,0,0,0) 0%,rgba(0,0,0,0.5) 50%,rgba(0,0,0,0.9) 100%);
        }
        .bg-gradient{
          position:fixed;inset:0;z-index:2;
          background:linear-gradient(to bottom,rgba(0,0,0,0.1) 0%,rgba(0,0,0,0.6) 55%,rgba(0,0,0,0.97) 90%);
        }

        .pill-nav{
          position:fixed;top:22px;left:50%;transform:translateX(-50%);
          background:rgba(10,8,6,0.75);
          backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);
          border:1px solid rgba(255,230,150,0.18);border-radius:999px;
          display:flex;align-items:center;gap:4px;padding:5px 6px;
          z-index:200;
          box-shadow:0 8px 40px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,230,150,0.1);
        }
        .pill-logo{font-family:'Fraunces',serif;font-size:17px;font-weight:700;color:#fff;padding:6px 16px;letter-spacing:-0.01em;font-style:italic;}
        .pill-cta{
          background:linear-gradient(135deg,#f5c842,#e8934a,#d4637a);
          color:#1a0f00;border:none;padding:8px 22px;border-radius:999px;
          font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;
          cursor:pointer;transition:all 0.25s;letter-spacing:-0.01em;
        }
        .pill-cta:hover{transform:scale(1.04);box-shadow:0 4px 20px rgba(245,200,66,0.4)}
        .pill-ghost{background:transparent;color:rgba(255,255,255,0.5);border:none;padding:8px 14px;border-radius:999px;font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;transition:all 0.2s;}
        .pill-ghost:hover{color:#fff;background:rgba(255,255,255,0.07)}
        .pill-icon{width:34px;height:34px;border:1px solid rgba(255,255,255,0.12);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s;}
        .pill-icon:hover{background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.25)}

        .sdot{width:7px;height:7px;border-radius:50%;display:inline-block;}
        .dgreen{background:#4ade80;box-shadow:0 0 8px rgba(74,222,128,0.8);animation:pulse 2s ease-in-out infinite;}
        .dred{background:#f87171;animation:pulse 1.5s ease-in-out infinite;}
        .dyellow{background:#fbbf24;animation:pulse 1.8s ease-in-out infinite;}

        textarea,input[type=password],input[type=text]{
          background:rgba(255,255,255,0.06);
          border:1px solid rgba(255,230,150,0.18);
          color:#fff;padding:14px 18px;font-size:14px;line-height:1.65;width:100%;
          font-family:'DM Sans',sans-serif;outline:none;transition:all 0.3s;border-radius:14px;
        }
        textarea{resize:vertical;}
        textarea:focus,input:focus{
          border-color:rgba(245,200,66,0.5);
          background:rgba(255,230,150,0.06);
          box-shadow:0 0 0 3px rgba(245,200,66,0.08);
        }
        textarea::placeholder,input::placeholder{color:rgba(255,255,255,0.2);font-style:italic}

        .btn-gold{
          background:linear-gradient(135deg,#f5c842 0%,#e8934a 60%,#d4637a 100%);
          color:#1a0a00;border:none;padding:16px 44px;
          font-family:'DM Sans',sans-serif;font-size:14px;font-weight:700;
          letter-spacing:-0.01em;cursor:pointer;border-radius:999px;
          transition:all 0.3s cubic-bezier(0.16,1,0.3,1);
          display:inline-flex;align-items:center;gap:10px;
          box-shadow:0 4px 30px rgba(245,200,66,0.25);
        }
        .btn-gold:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 10px 40px rgba(245,200,66,0.35)}
        .btn-gold:active:not(:disabled){transform:scale(0.98)}
        .btn-gold:disabled{opacity:0.3;cursor:not-allowed}
        .btn-gold .arr{width:26px;height:26px;background:rgba(0,0,0,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;transition:transform 0.2s;}
        .btn-gold:hover .arr{transform:rotate(45deg)}

        .btn-wire{
          background:transparent;color:rgba(255,255,255,0.65);
          border:1px solid rgba(255,255,255,0.2);
          padding:14px 28px;border-radius:999px;font-family:'DM Sans',sans-serif;
          font-size:13px;font-weight:500;cursor:pointer;transition:all 0.2s;
        }
        .btn-wire:hover{color:#fff;border-color:rgba(255,230,150,0.4);background:rgba(255,230,150,0.05)}

        .btn-cp{
          background:rgba(255,255,255,0.08);color:#fff;
          border:1px solid rgba(255,255,255,0.15);
          padding:12px 28px;border-radius:999px;font-family:'DM Sans',sans-serif;
          font-size:13px;font-weight:600;cursor:pointer;transition:all 0.25s;
        }
        .btn-cp:hover{background:rgba(255,230,150,0.12);border-color:rgba(245,200,66,0.4)}
        .btn-cp.done{background:rgba(74,222,128,0.15);border-color:rgba(74,222,128,0.4);color:#4ade80}

        .upload-zone{
          border:1.5px dashed rgba(255,230,150,0.2);border-radius:20px;
          padding:64px 40px;text-align:center;cursor:pointer;
          background:rgba(255,255,255,0.03);
          transition:all 0.35s cubic-bezier(0.16,1,0.3,1);
          animation:borderGlow 3.5s ease-in-out infinite;
        }
        .upload-zone:hover,.upload-zone.drag{
          border-color:rgba(245,200,66,0.6);background:rgba(245,200,66,0.05);
          animation:none;transform:scale(1.006);
          box-shadow:0 0 40px rgba(245,200,66,0.1);
        }
        .upload-zone.loaded{border-style:solid;border-color:rgba(74,222,128,0.4);background:rgba(74,222,128,0.05);animation:none;}

        .step-card{
          background:rgba(255,255,255,0.04);
          border:1px solid rgba(255,230,150,0.1);
          border-radius:18px;padding:28px;
          transition:all 0.3s cubic-bezier(0.16,1,0.3,1);
          backdrop-filter:blur(10px);
        }
        .step-card:hover{
          background:rgba(255,230,150,0.06);
          border-color:rgba(245,200,66,0.3);
          transform:translateY(-4px);
          box-shadow:0 20px 50px rgba(0,0,0,0.4),0 0 30px rgba(245,200,66,0.08);
        }

        .kw-chip{
          display:inline-block;
          background:rgba(245,200,66,0.08);
          border:1px solid rgba(245,200,66,0.2);
          color:rgba(255,230,150,0.8);padding:5px 15px;border-radius:999px;
          font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;
          margin:3px;animation:kwPop 0.35s cubic-bezier(0.16,1,0.3,1) both;
          transition:all 0.2s;
        }
        .kw-chip:hover{background:rgba(245,200,66,0.15);border-color:rgba(245,200,66,0.5);color:#f5c842;transform:translateY(-1px)}

        .marquee-wrap{overflow:hidden;border-top:1px solid rgba(255,230,150,0.08);border-bottom:1px solid rgba(255,230,150,0.08);padding:13px 0;}
        .marquee-track{display:flex;white-space:nowrap;animation:marquee 22s linear infinite}
        .marquee-item{padding:0 28px;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;color:rgba(255,255,255,0.25);letter-spacing:0.07em;text-transform:uppercase;}
        .marquee-sep{color:rgba(245,200,66,0.35);padding:0 4px;}

        .shimmer-gold{
          background:linear-gradient(90deg,rgba(245,200,66,0.6) 0%,#fff 40%,rgba(245,200,66,1) 60%,rgba(232,147,74,0.8) 80%,rgba(245,200,66,0.6) 100%);
          background-size:300% auto;
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
          animation:shimmer 3s linear infinite;
        }

        .load-bar{height:1px;background:rgba(255,255,255,0.06);border-radius:999px;overflow:hidden;position:relative;margin:28px 0;}
        .load-fill{position:absolute;top:0;height:100%;width:45%;border-radius:999px;background:linear-gradient(90deg,transparent,#f5c842,#e8934a,transparent);animation:loadSlide 1.5s ease-in-out infinite;}

        .code-out{
          background:rgba(0,0,0,0.75);
          border:1px solid rgba(255,230,150,0.1);
          color:#94a3b8;padding:28px;border-radius:16px;
          font-family:'Fira Code','Cascadia Code',monospace;
          font-size:11px;line-height:1.75;white-space:pre-wrap;
          word-break:break-word;max-height:480px;overflow-y:auto;
          backdrop-filter:blur(10px);
        }
        .code-out::-webkit-scrollbar{width:3px}
        .code-out::-webkit-scrollbar-thumb{background:rgba(245,200,66,0.25);border-radius:2px}

        .slabel{
          font-family:'DM Sans',sans-serif;font-size:11px;font-weight:600;
          color:rgba(255,230,150,0.4);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:18px;
        }

        .score-float{
          background:rgba(8,6,4,0.75);
          backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
          border:1px solid rgba(255,230,150,0.15);border-radius:18px;
          padding:20px 24px;
          animation:float 5s ease-in-out infinite;
          box-shadow:0 20px 60px rgba(0,0,0,0.5);
        }

        @media(max-width:768px){
          .hgrid{grid-template-columns:1fr!important}
          .sgrid{grid-template-columns:1fr 1fr!important}
          .pill-nav{width:calc(100% - 32px)}
          .main-pad{padding:0 24px 80px!important}
          .hero-pad{padding:110px 24px 60px!important}
          .dgrid{grid-template-columns:1fr!important}
        }
      `}</style>

      <div className="bg-hero"/>
      <div className="bg-vignette"/>
      <div className="bg-gradient"/>

      {/* Pill Nav */}
      <div className="pill-nav">
        <span className="pill-logo">ResumeAI</span>
        {apiKeySaved ? (
          <>
            <button className="pill-cta">Try Free</button>
            <div className="pill-icon"><span className="sdot dgreen"/></div>
            <div className="pill-icon" onClick={()=>{setApiKeySaved(false);setApiKey("");}}>
              <span style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>✕</span>
            </div>
          </>
        ) : (
          <>
            <button className="pill-cta">Get Started</button>
            <div className="pill-icon"><span className="sdot dred"/></div>
          </>
        )}
      </div>

      <div style={{position:"relative",zIndex:10}}>

        {/* API Key */}
        {!apiKeySaved && (
          <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:24,animation:"fadeIn 0.6s"}}>
            <div style={{maxWidth:520,width:"100%"}}>
              <div style={{display:"inline-flex",alignItems:"center",gap:8,border:"1px solid rgba(255,230,150,0.2)",borderRadius:999,padding:"7px 16px",marginBottom:32,background:"rgba(255,230,150,0.05)"}}>
                <span className="sdot dyellow" style={{animation:"none"}}/>
                <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:"11px",fontWeight:600,color:"rgba(255,230,150,0.5)",letterSpacing:"0.1em",textTransform:"uppercase"}}>Setup Required</span>
              </div>

              <h1 style={{fontFamily:"'Fraunces',serif",fontSize:"clamp(48px,8vw,88px)",lineHeight:0.88,marginBottom:24,fontWeight:900}}>
                Connect<br/>your key<span style={{color:"transparent",WebkitTextStroke:"1px rgba(245,200,66,0.5)"}}>.</span>
              </h1>

              <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:"15px",color:"rgba(255,255,255,0.38)",lineHeight:1.8,marginBottom:44,fontWeight:400}}>
                Your key stays in your browser only — never stored.<br/>
                Free at{" "}
                <span style={{color:"#f5c842",borderBottom:"1px solid rgba(245,200,66,0.3)"}}>console.anthropic.com</span>
                {" "}→ API Keys → Create Key.
              </p>

              <div style={{display:"flex",gap:10,marginBottom:16}}>
                <div style={{flex:1,position:"relative"}}>
                  <input type={showKey?"text":"password"} value={apiKeyInput}
                    onChange={e=>setApiKeyInput(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&saveKey()}
                    placeholder="sk-ant-api03-..." style={{paddingRight:64}}/>
                  <button onClick={()=>setShowKey(s=>!s)}
                    style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"rgba(255,255,255,0.25)",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:"11px",fontWeight:600,transition:"color 0.2s"}}
                    onMouseEnter={e=>e.target.style.color="#f5c842"} onMouseLeave={e=>e.target.style.color="rgba(255,255,255,0.25)"}>
                    {showKey?"hide":"show"}
                  </button>
                </div>
                <button className="btn-gold" onClick={saveKey} style={{padding:"14px 28px",fontSize:"13px",whiteSpace:"nowrap"}}>
                  Connect <div className="arr">↗</div>
                </button>
              </div>
              {error && <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:"13px",color:"#f87171",fontWeight:500,animation:"fadeIn 0.3s"}}>{error}</p>}
            </div>
          </div>
        )}

        {/* Hero + App */}
        {apiKeySaved && step==="idle" && (
          <>
            <section className="hero-pad" style={{padding:"140px 64px 80px",maxWidth:1200,margin:"0 auto"}}>
              <div className="hgrid" style={{display:"grid",gridTemplateColumns:"1.2fr 0.8fr",gap:64,alignItems:"center",minHeight:"62vh"}}>

                {/* Left */}
                <div>
                  <div style={{display:"inline-flex",alignItems:"center",gap:8,border:"1px solid rgba(255,230,150,0.2)",borderRadius:999,padding:"7px 16px",marginBottom:32,background:"rgba(255,230,150,0.05)",animation:"fadeIn 0.5s 0.1s both"}}>
                    <span className="sdot dgreen"/>
                    <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:"11px",fontWeight:600,color:"rgba(255,230,150,0.5)",letterSpacing:"0.1em",textTransform:"uppercase"}}>Powered by Claude AI</span>
                  </div>

                  <h1 style={{
                    fontFamily:"'Fraunces',serif",
                    fontSize:"clamp(52px,7.5vw,104px)",
                    lineHeight:0.88,letterSpacing:"-0.02em",
                    marginBottom:28,fontWeight:900,
                    opacity:heroIn?1:0,transform:heroIn?"none":"translateY(32px)",
                    transition:"all 0.9s cubic-bezier(0.16,1,0.3,1)"
                  }}>
                    A tailored<br/>resume for<br/><em style={{fontStyle:"italic"}}>every role.</em>
                  </h1>

                  <p style={{
                    fontFamily:"'DM Sans',sans-serif",fontSize:"16px",
                    color:"rgba(255,255,255,0.42)",lineHeight:1.8,maxWidth:380,
                    marginBottom:44,fontWeight:400,
                    opacity:heroIn?1:0,transform:heroIn?"none":"translateY(16px)",
                    transition:"all 0.7s cubic-bezier(0.16,1,0.3,1) 0.2s"
                  }}>
                    Upload your resume, paste any job description. Claude rewrites it using the JD's exact language — maximising ATS score in seconds. Free for everyone.
                  </p>

                  <div style={{
                    display:"flex",gap:12,flexWrap:"wrap",alignItems:"center",
                    opacity:heroIn?1:0,transform:heroIn?"none":"translateY(12px)",
                    transition:"all 0.6s cubic-bezier(0.16,1,0.3,1) 0.35s"
                  }}>
                    <button className="btn-gold" style={{fontSize:"15px",padding:"18px 44px"}}
                      onClick={()=>document.getElementById("form-section").scrollIntoView({behavior:"smooth"})}>
                      Get Started <div className="arr">↗</div>
                    </button>
                    <button className="btn-wire">How it works ↓</button>
                  </div>
                </div>

                {/* Right */}
                <div style={{
                  display:"flex",flexDirection:"column",gap:14,alignItems:"flex-end",
                  opacity:heroIn?1:0,transform:heroIn?"none":"translateY(20px)",
                  transition:"all 0.8s cubic-bezier(0.16,1,0.3,1) 0.3s"
                }}>
                  <div className="score-float">
                    <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"10px",fontWeight:600,color:"rgba(255,230,150,0.4)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>ATS Match Score</div>
                    <div className="shimmer-gold" style={{fontFamily:"'Fraunces',serif",fontSize:"52px",fontWeight:900,lineHeight:1}}>97%</div>
                    <div style={{height:3,background:"rgba(255,255,255,0.08)",borderRadius:999,marginTop:12,overflow:"hidden"}}>
                      <div style={{height:"100%",width:"97%",background:"linear-gradient(90deg,#f5c842,#e8934a)",borderRadius:999}}/>
                    </div>
                  </div>

                  <div style={{background:"rgba(8,6,4,0.7)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,230,150,0.12)",borderRadius:16,padding:"18px 22px",width:220,boxShadow:"0 20px 60px rgba(0,0,0,0.5)"}}>
                    <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"10px",fontWeight:600,color:"rgba(255,230,150,0.4)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>Keywords Injected</div>
                    {["SAP MM","P2P Cycle","S/4HANA","MM-FI"].map((k,i)=>(
                      <div key={i} style={{display:"inline-block",background:"rgba(245,200,66,0.1)",border:"1px solid rgba(245,200,66,0.2)",borderRadius:999,padding:"3px 10px",margin:"2px",fontFamily:"'DM Sans',sans-serif",fontSize:"11px",color:"rgba(245,200,66,0.8)",fontWeight:500}}>{k}</div>
                    ))}
                  </div>

                  <div style={{background:"rgba(74,222,128,0.08)",border:"1px solid rgba(74,222,128,0.25)",borderRadius:16,padding:"14px 20px",width:180,boxShadow:"0 20px 60px rgba(0,0,0,0.4)"}}>
                    <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"10px",fontWeight:600,color:"rgba(74,222,128,0.5)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>✓ Tailored in</div>
                    <div style={{fontFamily:"'Fraunces',serif",fontSize:"36px",fontWeight:900,color:"#4ade80",lineHeight:1}}>18 sec</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Marquee */}
            <div className="marquee-wrap">
              <div className="marquee-track">
                {[...MARQUEE,...MARQUEE].map((t,i)=>(
                  <span key={i}><span className="marquee-item">{t}</span><span className="marquee-sep">·</span></span>
                ))}
              </div>
            </div>

            {/* Steps */}
            <section style={{padding:"80px 64px",maxWidth:1200,margin:"0 auto"}}>
              <div className="slabel">How it works</div>
              <div className="sgrid" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                {[
                  {n:"01",t:"Upload Resume",d:"Drop any PDF or TXT file",e:"📎"},
                  {n:"02",t:"Paste JD",d:"Full job description text",e:"📋"},
                  {n:"03",t:"AI Tailors",d:"Keywords injected in ~20s",e:"✨"},
                  {n:"04",t:"Apply",d:"LaTeX → Overleaf → PDF",e:"🚀"},
                ].map((s,i)=>(
                  <div key={i} className="step-card">
                    <div style={{fontSize:26,marginBottom:14}}>{s.e}</div>
                    <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"11px",fontWeight:600,color:"rgba(245,200,66,0.5)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>{s.n}</div>
                    <div style={{fontFamily:"'Fraunces',serif",fontSize:"18px",fontWeight:700,color:"#fff",marginBottom:6}}>{s.t}</div>
                    <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:"13px",color:"rgba(255,255,255,0.3)",lineHeight:1.5,fontWeight:400}}>{s.d}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Form */}
            <section id="form-section" className="main-pad" style={{maxWidth:860,margin:"0 auto",padding:"20px 64px 100px"}}>

              {/* Upload */}
              <div style={{marginBottom:40}}>
                <div className="slabel">01 — Your Resume</div>
                {!resumeText ? (
                  <label className={`upload-zone ${dragOver?"drag":""}`} style={{display:"block"}}
                    onDragOver={e=>{e.preventDefault();setDragOver(true)}}
                    onDragLeave={()=>setDragOver(false)} onDrop={handleDrop}>
                    <input ref={fileRef} type="file" accept=".pdf,.txt" onChange={e=>processFile(e.target.files[0])} style={{display:"none"}}/>
                    {extracting ? (
                      <div>
                        <div style={{width:32,height:32,border:"2px solid rgba(255,255,255,0.08)",borderTop:"2px solid #f5c842",borderRadius:"50%",margin:"0 auto 16px",animation:"spin 0.8s linear infinite"}}/>
                        <p className="shimmer-gold" style={{fontFamily:"'Fraunces',serif",fontSize:"20px",fontWeight:700}}>Reading your resume...</p>
                      </div>
                    ) : (
                      <div>
                        <div style={{fontSize:36,marginBottom:14}}>📎</div>
                        <p style={{fontFamily:"'Fraunces',serif",fontSize:"26px",fontWeight:700,marginBottom:8,color:"rgba(255,255,255,0.8)"}}>Drop your resume here</p>
                        <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:"13px",color:"rgba(255,255,255,0.25)",fontWeight:500}}>PDF or TXT · or click to browse</p>
                      </div>
                    )}
                  </label>
                ) : (
                  <div className="upload-zone loaded" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"22px 28px",animation:"fadeIn 0.4s"}}>
                    <div style={{display:"flex",alignItems:"center",gap:16}}>
                      <div style={{width:38,height:38,background:"rgba(74,222,128,0.12)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,border:"1px solid rgba(74,222,128,0.3)"}}>✓</div>
                      <div>
                        <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:"11px",fontWeight:600,color:"#4ade80",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:3}}>Resume loaded</p>
                        <p style={{fontFamily:"'Fraunces',serif",fontSize:"20px",fontWeight:700,color:"#fff"}}>{resumeFileName}</p>
                      </div>
                    </div>
                    <button className="btn-wire" style={{fontSize:"12px",padding:"8px 18px"}} onClick={resetAll}>Change</button>
                  </div>
                )}
              </div>

              {/* JD */}
              <div style={{marginBottom:32}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                  <div className="slabel" style={{marginBottom:0}}>02 — Job Description</div>
                  <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:"12px",color:"rgba(255,255,255,0.18)",fontWeight:500}}>{jd.length} chars</span>
                </div>
                <textarea value={jd} onChange={e=>setJd(e.target.value)} rows={12}
                  placeholder="Paste the full job description — title, responsibilities, required skills, mandatory qualifications..."/>
              </div>

              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
                <div>
                  {!resumeText && <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:"13px",color:"#fbbf24",fontWeight:600}}>↑ Upload your resume first</p>}
                  {resumeText&&jd.length>0&&jd.length<80 && <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:"13px",color:"#fbbf24",fontWeight:600}}>Paste the full JD for best results</p>}
                </div>
                <button className="btn-gold" onClick={tailor} disabled={!jd.trim()||jd.length<80||!resumeText||extracting} style={{fontSize:"15px",padding:"18px 44px"}}>
                  Tailor My Resume <div className="arr">↗</div>
                </button>
              </div>

              {error && (
                <div style={{marginTop:20,padding:"14px 18px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:12,animation:"fadeIn 0.3s"}}>
                  <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:"13px",color:"#f87171",fontWeight:500}}>{error}</p>
                </div>
              )}
            </section>
          </>
        )}

        {/* Loading */}
        {(step==="analyzing"||step==="writing") && (
          <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",padding:60,animation:"fadeIn 0.4s"}}>
            <div style={{textAlign:"center",maxWidth:560}}>
              <div style={{width:50,height:50,border:"2px solid rgba(255,255,255,0.06)",borderTop:"2px solid #f5c842",borderRadius:"50%",margin:"0 auto 36px",animation:"spin 0.9s linear infinite"}}/>
              <div className="slabel" style={{textAlign:"center"}}>
                {step==="analyzing" ? "Analysing"+".".repeat(dots+1) : "Tailoring"+".".repeat(dots+1)}
              </div>
              <h2 className="shimmer-gold" style={{fontFamily:"'Fraunces',serif",fontSize:"clamp(38px,6vw,68px)",fontWeight:900,lineHeight:0.92,marginBottom:16}}>
                {step==="analyzing" ? <span>Reading the<br/>job description.</span> : <span>Writing your<br/>tailored resume.</span>}
              </h2>
              <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:"14px",color:"rgba(255,255,255,0.3)",marginBottom:40,fontWeight:400}}>
                {step==="analyzing" ? "Identifying mandatory skills, keywords, requirements" : "Rewriting bullets, injecting keywords, reordering sections"}
              </p>
              <div className="load-bar"><div className="load-fill"/></div>
              {keywords.length>0&&(
                <div style={{marginTop:36}}>
                  <div className="slabel" style={{textAlign:"center"}}>Keywords detected</div>
                  <div>{keywords.map((k,i)=>visibleKw.includes(i)&&<span key={i} className="kw-chip" style={{animationDelay:`${i*0.07}s`}}>{k}</span>)}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Done */}
        {step==="done"&&output&&(
          <div style={{animation:"fadeIn 0.5s",paddingTop:80}}>
            <section style={{padding:"80px 64px",maxWidth:1100,margin:"0 auto"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:24}}>
                <div style={{width:30,height:30,background:"rgba(74,222,128,0.12)",border:"1px solid rgba(74,222,128,0.35)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>✓</div>
                <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:"12px",fontWeight:600,color:"#4ade80",letterSpacing:"0.08em",textTransform:"uppercase"}}>Resume tailored successfully</span>
              </div>
              <div className="dgrid" style={{display:"grid",gridTemplateColumns:"1fr auto",gap:48,alignItems:"end",marginBottom:48}}>
                <div>
                  <h2 style={{fontFamily:"'Fraunces',serif",fontSize:"clamp(48px,6.5vw,84px)",fontWeight:900,lineHeight:0.88,marginBottom:20}}>
                    Your resume<br/>is <span className="shimmer-gold"><em>ready.</em></span>
                  </h2>
                  <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:"15px",color:"rgba(255,255,255,0.38)",lineHeight:1.8,maxWidth:480,fontWeight:400}}>
                    Copy the LaTeX → overleaf.com → New Project → Blank → Paste → Recompile → Download PDF → Apply.
                  </p>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:10,minWidth:200}}>
                  <button className={`btn-cp ${copied?"done":""}`} style={{padding:"14px 28px",fontSize:"14px"}} onClick={copy}>{copied?"✓ Copied!":"Copy LaTeX Code"}</button>
                  <button className="btn-wire" onClick={reset} style={{fontSize:"13px",padding:"11px 20px"}}>← New job description</button>
                  <button className="btn-wire" onClick={resetAll} style={{fontSize:"13px",padding:"11px 20px"}}>← Upload new resume</button>
                </div>
              </div>
            </section>

            <div style={{borderTop:"1px solid rgba(255,230,150,0.08)",borderBottom:"1px solid rgba(255,230,150,0.08)",padding:"32px 64px",maxWidth:1100,margin:"0 auto"}}>
              <div className="slabel">JD keywords injected</div>
              {keywords.map((k,i)=><span key={i} className="kw-chip">{k}</span>)}
            </div>

            <div style={{padding:"28px 64px",background:"rgba(255,230,150,0.02)",borderBottom:"1px solid rgba(255,230,150,0.06)"}}>
              <div style={{maxWidth:1100,margin:"0 auto",display:"flex",gap:24,flexWrap:"wrap",alignItems:"center"}}>
                <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:"11px",fontWeight:600,color:"rgba(255,230,150,0.25)",letterSpacing:"0.1em",textTransform:"uppercase"}}>Next</span>
                {["Copy LaTeX","overleaf.com","New Project → Blank","Paste → Recompile","Download PDF","Apply!"].map((s,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontFamily:"'Fraunces',serif",fontSize:"16px",color:"rgba(245,200,66,0.35)",fontWeight:700}}>{i+1}.</span>
                    <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:"13px",fontWeight:500,color:"rgba(255,255,255,0.35)"}}>{s}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{maxWidth:1100,margin:"0 auto",padding:"48px 64px 80px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <div className="slabel" style={{marginBottom:0}}>LaTeX Source</div>
                <button className={`btn-cp ${copied?"done":""}`} style={{padding:"8px 20px",fontSize:"12px"}} onClick={copy}>{copied?"✓ Copied":"Copy"}</button>
              </div>
              <div className="code-out">{output}</div>
            </div>
          </div>
        )}
      </div>

      <footer style={{borderTop:"1px solid rgba(255,230,150,0.07)",padding:"28px 64px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12,position:"relative",zIndex:10}}>
        <span style={{fontFamily:"'Fraunces',serif",fontSize:"18px",fontWeight:700,color:"rgba(255,255,255,0.25)",fontStyle:"italic"}}>ResumeAI</span>
        <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:"11px",color:"rgba(255,255,255,0.18)",fontWeight:500}}>Your resume and key are never stored · Runs entirely in your browser</span>
      </footer>
    </div>
  );
}
