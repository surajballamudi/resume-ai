import React, { useState } from "react";

const buildSystemPrompt = (resumeText) => `You are an expert resume writer and ATS optimization specialist. You have been given a person's resume. When given a job description, you:

1. Extract ALL mandatory skills, keywords, and requirements from the JD
2. Rewrite the summary to match the role perfectly using JD language
3. Reorder experience so the most relevant job appears FIRST
4. Rewrite each bullet point using the JD's exact terminology and keywords
5. Restructure the Technical Skills section with JD-priority order (most relevant first)
6. Add bold labels to the most relevant job bullets that mirror the JD's responsibility headings
7. Ensure every mandatory and preferred skill from the JD appears in the resume naturally

Output ONLY complete valid LaTeX code using this exact Jake Gutierrez template. Start with \\documentclass and end with \\end{document}. No explanation before or after.

TEMPLATE TO USE:
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

STRICT RULES:
- Never invent experience the person does not have. Only reframe existing experience using JD language.
- Keep all dates, company names, and education 100% accurate.
- Use \\vspace{3pt} between job entries for clean spacing.
- Certifications: use \\\\[3pt] between each cert line.
- Skills section: order rows by JD relevance, most relevant first.
- Output ONLY the LaTeX code. Nothing before \\documentclass, nothing after \\end{document}.

THE PERSON'S RESUME:
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

  const saveKey = () => {
    const t = apiKeyInput.trim();
    if (!t.startsWith("sk-ant-")) { setError("Invalid key — must start with sk-ant-"); return; }
    setApiKey(t); setApiKeySaved(true); setError(""); setApiKeyInput("");
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
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
              headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
                "anthropic-dangerous-direct-browser-access": "true"
              },
              body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 2000,
                messages: [{
                  role: "user",
                  content: [
                    { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
                    { type: "text", text: "Extract all text content from this resume. Return only the raw text, preserving structure with line breaks. No commentary." }
                  ]
                }]
              })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            setResumeText(data.content[0].text);
          } catch (err) {
            setError("Could not read PDF: " + err.message);
          } finally {
            setExtracting(false);
          }
        };
        reader.readAsDataURL(file);
      } else if (file.type === "text/plain") {
        const text = await file.text();
        setResumeText(text);
        setExtracting(false);
      } else {
        setError("Please upload a PDF or TXT file.");
        setExtracting(false);
      }
    } catch (err) {
      setError("Upload failed: " + err.message);
      setExtracting(false);
    }
  };

  const extractKeywords = (text) => {
    const stop = new Set(["and","the","to","of","in","a","an","with","for","is","are","will","be","as","by","on","at","from","that","this","we","you","our","your","have","has","can","must","should","would","which","who","all","any","not","but","or","if","its","they","them","been","were","was","also","about","more","work","role","team","experience","years","strong","skills","knowledge","using","ensure","provide","support","manage"]);
    const words = text.match(/\b[A-Za-z][A-Za-z0-9+#.\/-]{2,}\b/g) || [];
    const freq = {};
    words.forEach(w => { const l = w.toLowerCase(); if (!stop.has(l)) freq[l] = (freq[l]||0)+1; });
    return Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,20).map(([w])=>w);
  };

  const tailor = async () => {
    if (!jd.trim() || !apiKey || !resumeText) return;
    setLoading(true); setError(""); setOutput(""); setStep("analyzing");
    setKeywords(extractKeywords(jd));
    await new Promise(r => setTimeout(r, 900));
    setStep("writing");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: buildSystemPrompt(resumeText),
          messages: [{ role: "user", content: `Tailor this resume for the following job description. Output ONLY the complete LaTeX code:\n\n${jd}` }]
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
  const reset = () => { setJd(""); setOutput(""); setStep("idle"); setKeywords([]); setError(""); };
  const resetAll = () => { reset(); setResumeText(""); setResumeFileName(""); };

  return (
    <div style={{minHeight:"100vh",background:"#f0ece4",color:"#1a1814",fontFamily:"'Cormorant Garamond','Georgia',serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Instrument+Sans:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .fade{animation:fadeUp 0.5s ease-out}
        .spin{animation:spin 1s linear infinite}
        textarea,input[type=password],input[type=text]{
          background:transparent;border:none;
          border-bottom:1px solid #b5a99a;
          color:#1a1814;padding:12px 0;font-size:15px;
          line-height:1.6;width:100%;
          font-family:'Instrument Sans',sans-serif;
          outline:none;transition:border-color 0.3s;border-radius:0;
        }
        textarea{border:1px solid #c8bfb4;padding:20px;border-radius:2px;background:rgba(255,255,255,0.4);resize:vertical;}
        textarea:focus,input:focus{border-color:#1a1814;background:rgba(255,255,255,0.6)}
        textarea::placeholder,input::placeholder{color:#a09080;font-style:italic}
        .btn-main{background:#1a1814;color:#f0ece4;border:none;padding:16px 48px;font-family:'Instrument Sans',sans-serif;font-size:13px;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer;transition:all 0.3s;}
        .btn-main:hover:not(:disabled){background:#3a3028;transform:translateY(-1px)}
        .btn-main:disabled{opacity:0.4;cursor:not-allowed;transform:none}
        .btn-outline{background:transparent;color:#1a1814;border:1px solid #c8bfb4;padding:12px 32px;font-family:'Instrument Sans',sans-serif;font-size:12px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;transition:all 0.3s;}
        .btn-outline:hover{background:#1a1814;color:#f0ece4;border-color:#1a1814}
        .btn-copy{background:transparent;color:#6b5e50;border:1px solid #c8bfb4;padding:10px 28px;font-family:'Instrument Sans',sans-serif;font-size:11px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;transition:all 0.3s;}
        .btn-copy:hover{background:#1a1814;color:#f0ece4;border-color:#1a1814}
        .btn-copy.done{background:#2d4a2d;color:#a8d4a8;border-color:#2d4a2d}
        .kw-tag{display:inline-block;border:1px solid #b5a99a;color:#6b5e50;padding:4px 14px;font-family:'Instrument Sans',sans-serif;font-size:11px;letter-spacing:0.06em;margin:3px;}
        .code-out{background:#1a1814;color:#c8bfb4;padding:32px;font-family:'Fira Code','Cascadia Code',monospace;font-size:11px;line-height:1.7;white-space:pre-wrap;word-break:break-word;max-height:520px;overflow-y:auto;}
        .code-out::-webkit-scrollbar{width:3px}
        .code-out::-webkit-scrollbar-thumb{background:#3a3028}
        .step-num{font-family:'Cormorant Garamond',serif;font-size:72px;font-weight:300;color:#d4c9bc;line-height:1;display:block;margin-bottom:8px;}
        .marquee-track{display:flex;white-space:nowrap;animation:marquee 22s linear infinite}
        .marquee-item{padding:0 40px;font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:300;font-style:italic;color:#b5a99a;letter-spacing:0.05em;}
        .upload-zone{border:1.5px dashed #c8bfb4;padding:40px;text-align:center;cursor:pointer;transition:all 0.3s;background:rgba(255,255,255,0.3);border-radius:2px;}
        .upload-zone:hover{border-color:#1a1814;background:rgba(255,255,255,0.6)}
        .upload-zone.active{border-color:#1a1814;background:rgba(255,255,255,0.6)}
        .upload-zone.done{border-color:#5a7a5a;border-style:solid;background:rgba(90,122,90,0.05)}
      `}</style>

      {/* Nav */}
      <nav style={{padding:"24px 60px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #c8bfb4",background:"#f0ece4",position:"sticky",top:0,zIndex:100}}>
        <div>
          <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"22px",fontWeight:600,letterSpacing:"0.02em"}}>ResumeAI</span>
          <span style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"11px",color:"#9a8e80",marginLeft:"16px",letterSpacing:"0.08em",textTransform:"uppercase"}}>Free Resume Tailor · Powered by Suraj</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"16px"}}>
          {apiKeySaved ? (
            <>
              <span style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"11px",color:"#5a7a5a",letterSpacing:"0.08em",textTransform:"uppercase"}}>● Connected</span>
              <button className="btn-outline" style={{padding:"8px 20px",fontSize:"10px"}} onClick={()=>{setApiKeySaved(false);setApiKey("");}}>Change Key</button>
            </>
          ) : (
            <span style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"11px",color:"#a06060",letterSpacing:"0.08em",textTransform:"uppercase"}}>● No API Key</span>
          )}
        </div>
      </nav>

      {/* API Key Panel */}
      {!apiKeySaved && (
        <div className="fade" style={{background:"#1a1814",color:"#f0ece4",padding:"80px 60px"}}>
          <div style={{maxWidth:640,margin:"0 auto"}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(40px,6vw,64px)",fontWeight:300,lineHeight:1.05,marginBottom:16}}>
              Connect your<br/><em>API Key</em>
            </div>
            <p style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"13px",color:"#9a8e80",lineHeight:1.8,marginBottom:48,letterSpacing:"0.02em"}}>
              Each user brings their own Claude API key. Keys stay in your browser session only — never stored or shared anywhere.<br/>
              Get yours free at <span style={{color:"#c8bfb4",borderBottom:"1px solid #6b5e50"}}>console.anthropic.com</span> → API Keys → Create Key
            </p>
            <div style={{display:"flex",gap:"16px",alignItems:"flex-end"}}>
              <div style={{flex:1,position:"relative"}}>
                <label style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"10px",letterSpacing:"0.12em",textTransform:"uppercase",color:"#6b5e50",display:"block",marginBottom:"8px"}}>Claude API Key</label>
                <input
                  type={showKey?"text":"password"}
                  value={apiKeyInput}
                  onChange={e=>setApiKeyInput(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&saveKey()}
                  placeholder="sk-ant-api03-..."
                  style={{borderBottom:"1px solid #6b5e50",color:"#f0ece4"}}
                />
                <button onClick={()=>setShowKey(s=>!s)} style={{position:"absolute",right:0,bottom:12,background:"none",border:"none",color:"#6b5e50",cursor:"pointer",fontFamily:"'Instrument Sans',sans-serif",fontSize:"11px",letterSpacing:"0.06em"}}>
                  {showKey?"Hide":"Show"}
                </button>
              </div>
              <button className="btn-main" style={{background:"#f0ece4",color:"#1a1814"}} onClick={saveKey}>Connect</button>
            </div>
            {error&&<p style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"12px",color:"#c08080",marginTop:"16px"}}>{error}</p>}
          </div>
        </div>
      )}

      {/* Main App */}
      {apiKeySaved && step==="idle" && (
        <>
          {/* Hero */}
          <div className="fade" style={{padding:"100px 60px 60px",maxWidth:1100,margin:"0 auto"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"80px",alignItems:"end"}}>
              <div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(52px,7vw,96px)",fontWeight:300,lineHeight:0.95,letterSpacing:"-0.02em",marginBottom:"32px"}}>
                  Your resume.<br/>Every role.<br/><em>Perfectly matched.</em>
                </div>
                <p style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"14px",color:"#6b5e50",lineHeight:1.8,maxWidth:380,letterSpacing:"0.02em"}}>
                  Upload your resume, paste any job description. Claude rewrites your resume using the JD's exact language — maximising ATS match score and recruiter relevance. Free for everyone.
                </p>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1px",background:"#c8bfb4"}}>
                {[
                  {n:"01",t:"Upload Resume",d:"PDF or TXT — any resume format"},
                  {n:"02",t:"Paste JD",d:"Full job description, requirements"},
                  {n:"03",t:"AI Tailors",d:"Keywords injected, bullets rewritten"},
                  {n:"04",t:"Copy & Apply",d:"LaTeX → Overleaf → PDF → Send"},
                ].map(s=>(
                  <div key={s.n} style={{background:"#f0ece4",padding:"28px 24px"}}>
                    <span className="step-num">{s.n}</span>
                    <div style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"12px",fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:"6px"}}>{s.t}</div>
                    <div style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"12px",color:"#9a8e80",lineHeight:1.5}}>{s.d}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Marquee */}
          <div style={{overflow:"hidden",borderTop:"1px solid #c8bfb4",borderBottom:"1px solid #c8bfb4",padding:"18px 0",marginBottom:"60px"}}>
            <div className="marquee-track">
              {["ATS Optimised","Keyword Matched","Jake Gutierrez Template","Tailored in 20s","Any Industry","Any Role","Free to Use","Powered by Claude AI","Upload Any Resume","Get LaTeX Output","ATS Optimised","Keyword Matched","Jake Gutierrez Template","Tailored in 20s","Any Industry","Any Role","Free to Use","Powered by Claude AI","Upload Any Resume","Get LaTeX Output"].map((t,i)=>(
                <span key={i} className="marquee-item">{t}</span>
              ))}
            </div>
          </div>

          {/* Upload + JD */}
          <div style={{maxWidth:800,margin:"0 auto",padding:"0 60px 100px"}}>

            {/* Resume Upload */}
            <div style={{marginBottom:"48px"}}>
              <label style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"10px",letterSpacing:"0.14em",textTransform:"uppercase",color:"#9a8e80",display:"block",marginBottom:"16px"}}>
                Your Resume
              </label>
              {!resumeText ? (
                <label className={`upload-zone ${extracting?"active":""}`} style={{display:"block"}}>
                  <input type="file" accept=".pdf,.txt" onChange={handleResumeUpload} style={{display:"none"}} />
                  {extracting ? (
                    <div>
                      <div style={{width:24,height:24,border:"2px solid #c8bfb4",borderTop:"2px solid #1a1814",borderRadius:"50%",margin:"0 auto 16px"}} className="spin"/>
                      <p style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"13px",color:"#9a8e80",fontStyle:"italic"}}>Reading your resume...</p>
                    </div>
                  ) : (
                    <div>
                      <div style={{fontSize:"32px",marginBottom:"12px"}}>↑</div>
                      <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"22px",fontWeight:300,marginBottom:"8px"}}>Upload your resume</p>
                      <p style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"12px",color:"#b5a99a",letterSpacing:"0.04em"}}>PDF or TXT · Click to browse</p>
                    </div>
                  )}
                </label>
              ) : (
                <div className="upload-zone done" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"24px 32px"}}>
                  <div>
                    <p style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"12px",color:"#5a7a5a",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:"4px"}}>✓ Resume Loaded</p>
                    <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"18px",fontWeight:300,color:"#1a1814"}}>{resumeFileName}</p>
                    <p style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"11px",color:"#9a8e80",marginTop:"4px"}}>{resumeText.length} characters extracted</p>
                  </div>
                  <button className="btn-outline" style={{fontSize:"10px",padding:"8px 20px"}} onClick={resetAll}>Change</button>
                </div>
              )}
            </div>

            {/* JD Input */}
            <div style={{marginBottom:"32px"}}>
              <label style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"10px",letterSpacing:"0.14em",textTransform:"uppercase",color:"#9a8e80",display:"block",marginBottom:"16px"}}>
                Job Description
              </label>
              <textarea
                value={jd}
                onChange={e=>setJd(e.target.value)}
                rows={13}
                placeholder="Paste the complete job description here — position title, responsibilities, required skills, mandatory qualifications, preferred experience..."
              />
              <div style={{display:"flex",justifyContent:"space-between",marginTop:"8px"}}>
                <span style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"12px",color:"#b5a99a",fontStyle:"italic"}}>{jd.length} characters</span>
                <span style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"12px",color:"#b5a99a",fontStyle:"italic"}}>More detail = better tailoring</span>
              </div>
            </div>

            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              {!resumeText && <p style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"12px",color:"#a08060",fontStyle:"italic"}}>↑ Upload your resume first</p>}
              {resumeText && jd.length>0&&jd.length<80 && <p style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"12px",color:"#a08060",fontStyle:"italic"}}>Paste the full job description for best results</p>}
              {resumeText && jd.length>=80 && <span/>}
              <button className="btn-main" onClick={tailor} disabled={!jd.trim()||jd.length<80||!resumeText||extracting}>
                Tailor My Resume →
              </button>
            </div>

            {error&&<p style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"13px",color:"#a06060",marginTop:"16px"}}>{error}</p>}
          </div>
        </>
      )}

      {/* Loading */}
      {(step==="analyzing"||step==="writing") && (
        <div className="fade" style={{minHeight:"70vh",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",padding:"60px"}}>
          <div style={{width:1,height:80,background:"linear-gradient(to bottom,transparent,#1a1814)",margin:"0 auto 32px"}}/>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(32px,5vw,56px)",fontWeight:300,lineHeight:1.1,marginBottom:"16px",textAlign:"center"}}>
            {step==="analyzing"?<>Reading the<br/><em>job description...</em></>:<>Writing your<br/><em>tailored resume...</em></>}
          </div>
          <p style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"13px",color:"#9a8e80",letterSpacing:"0.04em",marginBottom:"48px",textAlign:"center"}}>
            {step==="analyzing"?"Identifying keywords, mandatory skills, requirements":"Rewriting bullets, reordering sections, injecting JD language"}
          </p>
          {keywords.length>0&&(
            <div style={{maxWidth:560,textAlign:"center"}}>
              <p style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"10px",color:"#b5a99a",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"16px"}}>Keywords detected</p>
              {keywords.map((k,i)=><span key={i} className="kw-tag">{k}</span>)}
            </div>
          )}
        </div>
      )}

      {/* Done */}
      {step==="done"&&output&&(
        <div className="fade">
          <div style={{background:"#1a1814",color:"#f0ece4",padding:"80px 60px"}}>
            <div style={{maxWidth:900,margin:"0 auto",display:"grid",gridTemplateColumns:"1fr auto",alignItems:"end",gap:"40px"}}>
              <div>
                <p style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"10px",color:"#6b5e50",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:"16px"}}>Resume ready</p>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(40px,5vw,72px)",fontWeight:300,lineHeight:0.95,marginBottom:"24px"}}>
                  Your resume has<br/>been <em>tailored.</em>
                </div>
                <p style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"13px",color:"#9a8e80",lineHeight:1.8,letterSpacing:"0.02em"}}>
                  Copy LaTeX → overleaf.com → New Project → Blank → paste → Recompile → download PDF.
                </p>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"12px",minWidth:180}}>
                <button className={`btn-copy ${copied?"done":""}`} onClick={copy}>{copied?"✓ Copied":"Copy LaTeX"}</button>
                <button className="btn-outline" style={{color:"#9a8e80",borderColor:"#3a3028",fontSize:"10px"}} onClick={reset}>← Tailor Again</button>
                <button className="btn-outline" style={{color:"#9a8e80",borderColor:"#3a3028",fontSize:"10px"}} onClick={resetAll}>← New Resume</button>
              </div>
            </div>
          </div>

          <div style={{padding:"48px 60px",borderBottom:"1px solid #c8bfb4",maxWidth:900,margin:"0 auto"}}>
            <p style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"10px",color:"#9a8e80",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"16px"}}>JD keywords injected</p>
            {keywords.map((k,i)=><span key={i} className="kw-tag">{k}</span>)}
          </div>

          <div style={{padding:"40px 60px",borderBottom:"1px solid #c8bfb4",background:"rgba(255,255,255,0.3)"}}>
            <div style={{maxWidth:900,margin:"0 auto",display:"flex",gap:"32px",flexWrap:"wrap"}}>
              {["Copy LaTeX code","Go to overleaf.com","New Project → Blank","Paste → Recompile","Download PDF"].map((s,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"20px",color:"#c8bfb4",fontWeight:300}}>{i+1}.</span>
                  <span style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"12px",color:"#6b5e50",letterSpacing:"0.04em"}}>{s}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{maxWidth:900,margin:"0 auto",padding:"48px 60px 80px"}}>
            <p style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"10px",color:"#9a8e80",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"16px"}}>LaTeX Source</p>
            <div className="code-out">{output}</div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{borderTop:"1px solid #c8bfb4",padding:"32px 60px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"16px"}}>
        <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"16px",fontWeight:300,color:"#9a8e80",fontStyle:"italic"}}>ResumeAI — Free Resume Tailor</span>
        <span style={{fontFamily:"'Instrument Sans',sans-serif",fontSize:"11px",color:"#b5a99a",letterSpacing:"0.06em"}}>Your resume and API key are never stored · Everything runs in your browser</span>
      </div>
    </div>
  );
}
