import { useState, useEffect, useRef } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────
const READER_OPTIONS = [
  { name: "Dad",    emoji: "😎" },
  { name: "Mom",    emoji: "🌹" },
  { name: "Eowyn",  emoji: "🐱" },
  { name: "Joshua", emoji: "🦕" },
];

const PRIZES = [
  { id:"bedtime", label:"⏰ Late Bedtime",        desc:"+1 hour — show a parent to redeem", threshold:500,  color:"#6C63FF" },
  { id:"treat",   label:"🍦 Ice Cream / Starbucks",desc:"A treat on us",                    threshold:1250, color:"#FF6B9D" },
  { id:"lunch",   label:"🍔 Free Lunch",           desc:"Your pick",                         threshold:2500, color:"#FF9F43" },
  { id:"dream",   label:"🎢 American Dream",       desc:"The whole family goes!",            threshold:5000, color:"#00C9A7", oneTime:true },
];

const BIBLE_STANDALONE_BONUS = 50;
const DATA_KEY   = "collins-reading-data-2026";
const READER_KEY = "collins-reading-myname-2026";
const ADMIN_PIN  = "0629";
const font       = "'Space Grotesk',sans-serif";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function calcPoints(pages, isAudio, bibleBonus) {
  const base = isAudio ? pages * 0.5 : pages;
  return Math.round(bibleBonus ? base * 1.5 : base);
}

function getPrizeEarned(totalPts, prize) {
  if (prize.oneTime) return totalPts >= prize.threshold ? 1 : 0;
  return Math.floor(totalPts / prize.threshold);
}

function getUnredeemed(totalPts, prize, redeemed) {
  return Math.max(0, getPrizeEarned(totalPts, prize) - (redeemed[prize.id] || 0));
}

function daysLeft() {
  return Math.max(0, Math.ceil((new Date("2026-09-01") - new Date()) / 86400000));
}

function emptyReader() {
  return { books:[], bibleDays:[], redeemed:{} };
}

function getTotal(readerData) {
  let pts = 0;
  readerData.books.forEach(b => pts += b.points);
  readerData.bibleDays.forEach(bd => { if (bd.standalone) pts += BIBLE_STANDALONE_BONUS; });
  (readerData.adjustments || []).forEach(a => pts += a.delta);
  return Math.max(0, pts);
}

function buildShareText(name, totalPts, readerData) {
  const booksRead  = readerData.books.length;
  const bibleDays  = readerData.bibleDays.length;
  const pct        = Math.round((totalPts / 5000) * 100);
  const dl         = daysLeft();
  const earnedPrizes = PRIZES.filter(p => getPrizeEarned(totalPts, p) > 0);
  const prizeLines = earnedPrizes.map(p => {
    const used = readerData.redeemed[p.id] || 0;
    return `  ${p.label} — earned ${getPrizeEarned(totalPts, p)}${used ? `, used ${used}` : ""}`;
  }).join("\n");
  return (
    `📚 Collins Summer Reading Update\n` +
    `👤 ${name} · ${totalPts.toLocaleString()} pts (${pct}% to American Dream 🎢)\n` +
    `📖 ${booksRead} book${booksRead!==1?"s":""} finished · ${bibleDays} Bible day${bibleDays!==1?"s":""}\n` +
    `⏳ ${dl} days left` +
    (prizeLines ? `\n\n🏆 Prizes:\n${prizeLines}` : "")
  );
}

// ─── Shared style objects ─────────────────────────────────────────────────────
const labelStyle = {
  display:"block", fontFamily:font, fontSize:"0.78rem", fontWeight:700,
  color:"#555", marginBottom:"0.3rem", letterSpacing:"0.05em", textTransform:"uppercase",
};
const inputStyle = {
  width:"100%", boxSizing:"border-box", border:"1.5px solid #ddd",
  borderRadius:"0.5rem", padding:"0.65rem 0.85rem",
  fontFamily:font, fontSize:"0.95rem", marginBottom:"1rem", outline:"none",
};

// ─── Laser Dance Party ────────────────────────────────────────────────────────
function LaserParty({ prize, name, onClose }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const lasers = Array.from({ length:18 }, () => ({
      x:Math.random()*canvas.width, y:Math.random()*canvas.height,
      vx:(Math.random()-0.5)*6, vy:(Math.random()-0.5)*6,
      color:`hsl(${Math.random()*360},100%,60%)`, len:40+Math.random()*80,
    }));
    const stars = Array.from({ length:60 }, () => ({
      x:Math.random()*canvas.width, y:Math.random()*canvas.height,
      r:Math.random()*3, alpha:Math.random(), speed:0.02+Math.random()*0.04,
    }));

    function draw() {
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      stars.forEach(s => {
        s.alpha += s.speed;
        ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
        ctx.fillStyle = `rgba(255,255,255,${0.4+0.6*Math.abs(Math.sin(s.alpha))})`; ctx.fill();
      });
      lasers.forEach(l => {
        ctx.beginPath(); ctx.moveTo(l.x,l.y); ctx.lineTo(l.x-l.vx*(l.len/6), l.y-l.vy*(l.len/6));
        ctx.strokeStyle=l.color; ctx.lineWidth=2.5; ctx.shadowColor=l.color; ctx.shadowBlur=12;
        ctx.stroke(); ctx.shadowBlur=0;
        l.x+=l.vx; l.y+=l.vy;
        if(l.x<0||l.x>canvas.width)  l.vx*=-1;
        if(l.y<0||l.y>canvas.height) l.vy*=-1;
      });
      animRef.current = requestAnimationFrame(draw);
    }
    draw();

    try {
      const ac = new (window.AudioContext||window.webkitAudioContext)();
      [523,659,784,1047,784,1047,1319].forEach((freq,i) => {
        const osc=ac.createOscillator(), gain=ac.createGain();
        osc.connect(gain); gain.connect(ac.destination);
        osc.type="square"; osc.frequency.value=freq;
        gain.gain.setValueAtTime(0.08, ac.currentTime+i*0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+i*0.12+0.18);
        osc.start(ac.currentTime+i*0.12); osc.stop(ac.currentTime+i*0.12+0.2);
      });
    } catch {}

    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%",background:"#000"}}/>
      <div style={{position:"relative",zIndex:1,textAlign:"center",padding:"2rem 2.5rem",background:"rgba(0,0,0,0.75)",borderRadius:"1.5rem",border:`2px solid ${prize.color}`,boxShadow:`0 0 40px ${prize.color}88`,maxWidth:360}}>
        <div style={{fontSize:"3.5rem",marginBottom:"0.5rem"}}>🎉</div>
        <h2 style={{color:prize.color,fontFamily:font,fontSize:"1.5rem",margin:"0 0 0.25rem"}}>{name} just cashed in!</h2>
        <p style={{color:"#fff",fontSize:"1.1rem",margin:"0 0 0.2rem",fontWeight:700}}>{prize.label}</p>
        <p style={{color:"#ccc",fontSize:"0.85rem",margin:"0 0 1rem"}}>{prize.desc}</p>
        <p style={{color:"#aaa",fontSize:"0.78rem",margin:"0 0 1.5rem"}}>📱 Show this screen to a parent</p>
        <button onClick={onClose} style={{background:prize.color,color:"#fff",border:"none",borderRadius:"2rem",padding:"0.7rem 2rem",fontWeight:700,fontSize:"1rem",cursor:"pointer",fontFamily:font}}>Done!</button>
      </div>
    </div>
  );
}


// ─── Admin Panel ──────────────────────────────────────────────────────────────
function AdminPanel({ data, onAdjust, onClose }) {
  const [pin,       setPin]       = useState("");
  const [unlocked,  setUnlocked]  = useState(false);
  const [target,    setTarget]    = useState(READER_OPTIONS[0].name);
  const [amount,    setAmount]    = useState("");
  const [reason,    setReason]    = useState("");
  const [feedback,  setFeedback]  = useState("");
  const [pinError,  setPinError]  = useState(false);

  function tryPin(digit) {
    const next = pin + digit;
    setPin(next);
    if (next.length === 4) {
      if (next === ADMIN_PIN) {
        setUnlocked(true);
        setPinError(false);
      } else {
        setPinError(true);
        setTimeout(() => { setPin(""); setPinError(false); }, 700);
      }
    }
  }

  function handleAdjust(sign) {
    const pts = parseInt(amount);
    if (isNaN(pts) || pts <= 0) return;
    onAdjust(target, sign * pts, reason.trim() || "Admin adjustment");
    setFeedback(`${sign > 0 ? "+" : "-"}${pts} pts applied to ${target}`);
    setAmount(""); setReason("");
    setTimeout(() => setFeedback(""), 2500);
  }

  return (
    <div style={{position:"fixed",inset:0,zIndex:2000,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
      <div style={{background:"#fff",borderRadius:"1.25rem",padding:"1.5rem",width:"100%",maxWidth:340,boxShadow:"0 8px 32px rgba(0,0,0,0.2)"}}>
        {!unlocked ? (
          <>
            <div style={{textAlign:"center",marginBottom:"1.25rem"}}>
              <div style={{fontSize:"1.5rem",marginBottom:"0.25rem"}}>🔒</div>
              <h2 style={{fontFamily:font,fontSize:"1.1rem",fontWeight:800,margin:0,color:"#222"}}>Parent Access</h2>
              <p style={{fontFamily:font,fontSize:"0.78rem",color:"#999",margin:"0.25rem 0 0"}}>Enter PIN to continue</p>
            </div>
            <div style={{display:"flex",justifyContent:"center",gap:"0.5rem",marginBottom:"1.25rem"}}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{width:14,height:14,borderRadius:"50%",background:pin.length>i?(pinError?"#FF6B6B":"#6C63FF"):"#e0e0e0",transition:"background 0.15s"}}/>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.5rem",marginBottom:"0.5rem"}}>
              {[1,2,3,4,5,6,7,8,9].map(d => (
                <button key={d} onClick={() => tryPin(String(d))} style={{background:"#f5f3ff",border:"none",borderRadius:"0.6rem",padding:"0.9rem",fontFamily:font,fontWeight:700,fontSize:"1.2rem",cursor:"pointer"}}>{d}</button>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.5rem"}}>
              <div/>
              <button onClick={() => tryPin("0")} style={{background:"#f5f3ff",border:"none",borderRadius:"0.6rem",padding:"0.9rem",fontFamily:font,fontWeight:700,fontSize:"1.2rem",cursor:"pointer"}}>0</button>
              <button onClick={() => setPin(p => p.slice(0,-1))} style={{background:"#f5f3ff",border:"none",borderRadius:"0.6rem",padding:"0.9rem",fontFamily:font,fontWeight:700,fontSize:"1rem",cursor:"pointer"}}>⌫</button>
            </div>
            <button onClick={onClose} style={{width:"100%",marginTop:"1rem",background:"none",border:"none",color:"#bbb",fontFamily:font,fontSize:"0.8rem",cursor:"pointer"}}>Cancel</button>
          </>
        ) : (
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem"}}>
              <h2 style={{fontFamily:font,fontSize:"1.1rem",fontWeight:800,margin:0,color:"#222"}}>🔧 Admin Panel</h2>
              <button onClick={onClose} style={{background:"none",border:"none",color:"#bbb",fontSize:"1.2rem",cursor:"pointer"}}>✕</button>
            </div>

            <label style={{...labelStyle,marginBottom:"0.4rem"}}>Reader</label>
            <div style={{display:"flex",gap:"0.4rem",marginBottom:"1rem",flexWrap:"wrap"}}>
              {READER_OPTIONS.map(r => (
                <button key={r.name} onClick={() => setTarget(r.name)} style={{border:"none",borderRadius:"1rem",padding:"0.4rem 0.85rem",fontFamily:font,fontWeight:700,fontSize:"0.82rem",cursor:"pointer",background:target===r.name?"#6C63FF":"#eee",color:target===r.name?"#fff":"#555"}}>
                  {r.emoji} {r.name}
                </button>
              ))}
            </div>

            <label style={{...labelStyle,marginBottom:"0.4rem"}}>Points to adjust</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 200"
              min="1"
              style={{...inputStyle,marginBottom:"0.75rem"}}
            />

            <label style={{...labelStyle,marginBottom:"0.4rem"}}>Reason (optional)</label>
            <input
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Caught cheating on page count"
              style={{...inputStyle,marginBottom:"1rem"}}
            />

            {feedback && (
              <div style={{background:"#e6fff8",border:"1.5px solid #00C9A7",borderRadius:"0.6rem",padding:"0.6rem 0.85rem",marginBottom:"0.75rem",fontFamily:font,fontSize:"0.85rem",color:"#00956e",fontWeight:600}}>{feedback}</div>
            )}

            <div style={{display:"flex",gap:"0.6rem"}}>
              <button onClick={() => handleAdjust(1)} style={{flex:1,background:"#00C9A7",color:"#fff",border:"none",borderRadius:"0.6rem",padding:"0.75rem",fontWeight:700,fontFamily:font,cursor:"pointer",fontSize:"0.9rem"}}>+ Add</button>
              <button onClick={() => handleAdjust(-1)} style={{flex:1,background:"#FF6B9D",color:"#fff",border:"none",borderRadius:"0.6rem",padding:"0.75rem",fontWeight:700,fontFamily:font,cursor:"pointer",fontSize:"0.9rem"}}>− Subtract</button>
            </div>

            <div style={{marginTop:"1.25rem",borderTop:"1px solid #eee",paddingTop:"1rem"}}>
              <h3 style={{fontFamily:font,fontSize:"0.75rem",color:"#aaa",textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 0.5rem"}}>Current Standings</h3>
              {READER_OPTIONS.map(r => {
                const rd = data[r.name] || {books:[],bibleDays:[],redeemed:{}};
                const pts = getTotal(rd);
                return (
                  <div key={r.name} style={{display:"flex",justifyContent:"space-between",fontFamily:font,fontSize:"0.85rem",padding:"0.2rem 0"}}>
                    <span>{r.emoji} {r.name}</span>
                    <span style={{fontWeight:700,color:"#6C63FF"}}>{pts.toLocaleString()} pts</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Name Setup Screen ────────────────────────────────────────────────────────
function NameSetup({ onSelect }) {
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#f0edff 0%,#e6fff8 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"1.5rem"}}>
      <div style={{width:"100%",maxWidth:340,textAlign:"center"}}>
        <div style={{fontSize:"3rem",marginBottom:"0.5rem"}}>📚</div>
        <h1 style={{fontFamily:font,fontSize:"1.8rem",fontWeight:800,color:"#222",margin:"0 0 0.5rem"}}>Collins Summer Reading</h1>
        <p style={{fontFamily:font,color:"#888",fontSize:"0.9rem",margin:"0 0 2rem"}}>July – August 2026 · Who's using this device?</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem"}}>
          {READER_OPTIONS.map(r => (
            <button key={r.name} onClick={() => onSelect(r.name)} style={{
              background:"#fff",border:"2px solid #e0daff",borderRadius:"1rem",
              padding:"1.5rem 0.5rem",fontFamily:font,fontWeight:700,fontSize:"1.05rem",
              cursor:"pointer",boxShadow:"0 2px 8px rgba(108,99,255,0.07)",
            }}>
              <div style={{fontSize:"2rem",marginBottom:"0.35rem"}}>{r.emoji}</div>
              {r.name}
            </button>
          ))}
        </div>
        <p style={{fontFamily:font,color:"#bbb",fontSize:"0.75rem",marginTop:"1.5rem"}}>This device will remember your choice.</p>
      </div>
    </div>
  );
}

// ─── Log Book View (top-level component — fixes input focus bug) ──────────────
function LogView({ myName, hasBibleToday, onSubmit, onBack }) {
  const [title,      setTitle]      = useState("");
  const [pages,      setPages]      = useState("");
  const [isAudio,    setIsAudio]    = useState(false);
  const [bibleToday, setBibleToday] = useState(false);

  const bibleAlready  = hasBibleToday;
  const pagesNum      = parseInt(pages);
  const previewPoints = pages && !isNaN(pagesNum) && pagesNum > 0
    ? calcPoints(pagesNum, isAudio, bibleToday && !bibleAlready)
    : null;

  function handleSubmit() {
    if (!title.trim() || isNaN(pagesNum) || pagesNum <= 0) return;
    onSubmit({ title: title.trim(), pages: pagesNum, isAudio, bibleToday: bibleToday && !bibleAlready });
  }

  return (
    <div>
      <button onClick={onBack} style={{background:"none",border:"none",color:"#6C63FF",fontWeight:700,fontSize:"0.9rem",cursor:"pointer",fontFamily:font,marginBottom:"1rem",padding:0}}>← Back</button>
      <h2 style={{fontFamily:font,margin:"0 0 1.25rem",color:"#222"}}>Log a Finished Book</h2>

      <label style={labelStyle}>Book title</label>
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="e.g. The Lion, the Witch and the Wardrobe"
        style={inputStyle}
      />

      <label style={labelStyle}>Total pages</label>
      <input
        type="number"
        value={pages}
        onChange={e => setPages(e.target.value)}
        placeholder="e.g. 224"
        style={inputStyle}
        min="1"
      />

      <div style={{display:"flex",gap:"0.75rem",marginBottom:"1rem"}}>
        {[{label:"📚 Print / Ebook",audio:false},{label:"🎧 Audiobook (½ pts)",audio:true}].map(opt => (
          <button key={String(opt.audio)} onClick={() => setIsAudio(opt.audio)} style={{
            flex:1,border:"none",borderRadius:"0.5rem",padding:"0.6rem 0.4rem",
            fontWeight:600,fontSize:"0.78rem",cursor:"pointer",fontFamily:font,
            background:isAudio===opt.audio?"#6C63FF":"#eee",
            color:isAudio===opt.audio?"#fff":"#555",
          }}>{opt.label}</button>
        ))}
      </div>

      {bibleAlready
        ? <div style={{background:"#e6fff8",border:"1.5px solid #00C9A7",borderRadius:"0.75rem",padding:"0.6rem 1rem",marginBottom:"1rem"}}>
            <span style={{fontFamily:font,fontSize:"0.85rem",color:"#00956e"}}>✅ Bible bonus already applied today</span>
          </div>
        : <div style={{background:"#fffbeb",border:"1.5px solid #f5c842",borderRadius:"0.75rem",padding:"0.75rem 1rem",marginBottom:"1rem"}}>
            <label style={{display:"flex",alignItems:"center",gap:"0.6rem",cursor:"pointer"}}>
              <input type="checkbox" checked={bibleToday} onChange={e => setBibleToday(e.target.checked)} style={{width:18,height:18}}/>
              <span style={{fontFamily:font,fontSize:"0.9rem",fontWeight:600}}>📖 I read a Bible chapter today (+50%!)</span>
            </label>
          </div>
      }

      {previewPoints !== null && (
        <div style={{background:"#f0edff",borderRadius:"0.75rem",padding:"0.75rem 1rem",marginBottom:"1rem",fontFamily:font}}>
          <span style={{fontWeight:700,color:"#6C63FF",fontSize:"1.1rem"}}>= {previewPoints} points</span>
          <span style={{fontSize:"0.78rem",color:"#888",marginLeft:"0.5rem"}}>
            {isAudio ? `${pagesNum}p × 0.5` : `${pagesNum}p`}
            {(bibleToday && !bibleAlready) ? " × 1.5 Bible bonus" : ""}
          </span>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!title.trim() || !pages || isNaN(pagesNum) || pagesNum <= 0}
        style={{width:"100%",background:"#6C63FF",color:"#fff",border:"none",borderRadius:"0.75rem",padding:"0.9rem",fontWeight:700,fontSize:"1rem",cursor:"pointer",fontFamily:font,opacity:(!title.trim()||!pages)?0.4:1}}
      >Log Book</button>
    </div>
  );
}

// ─── Home View (top-level component) ─────────────────────────────────────────
function HomeView({ myName, readerData, totalPts, onLogBook, onShare, onRedeemPrize, onBibleOnly, onResetName, copied }) {
  const bibleAlready = readerData.bibleDays.some(bd => bd.date === todayStr());
  const dl           = daysLeft();
  const emoji        = READER_OPTIONS.find(r => r.name === myName)?.emoji || "📚";

  return (
    <div>
      {/* Hero */}
      <div style={{background:"linear-gradient(135deg,#6C63FF 0%,#00C9A7 100%)",borderRadius:"1.25rem",padding:"1.5rem",marginBottom:"1.25rem",color:"#fff",textAlign:"center"}}>
        <div style={{fontFamily:font,fontSize:"0.85rem",opacity:0.8,marginBottom:"0.25rem"}}>{emoji} {myName}'s Points</div>
        <div style={{fontFamily:font,fontSize:"3rem",fontWeight:800,lineHeight:1}}>{totalPts.toLocaleString()}</div>
        <div style={{fontFamily:font,fontSize:"0.8rem",opacity:0.8,marginTop:"0.25rem"}}>{dl} days left</div>
        <div style={{marginTop:"1rem",background:"rgba(255,255,255,0.25)",borderRadius:"1rem",height:10}}>
          <div style={{background:"#fff",width:`${Math.min(100,(totalPts/5000)*100)}%`,height:"100%",borderRadius:"1rem",transition:"width 0.5s"}}/>
        </div>
        <div style={{fontFamily:font,fontSize:"0.72rem",opacity:0.8,marginTop:"0.3rem"}}>{Math.round((totalPts/5000)*100)}% to American Dream 🎢</div>
      </div>

      {/* Bible banner */}
      <div style={{background:bibleAlready?"#e6fff8":"#fffbeb",border:`1.5px solid ${bibleAlready?"#00C9A7":"#f5c842"}`,borderRadius:"0.75rem",padding:"0.75rem 1rem",marginBottom:"1rem",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontFamily:font,fontSize:"0.9rem",color:bibleAlready?"#00956e":"#9a7500"}}>
          {bibleAlready ? "✅ Bible chapter done today!" : "📖 Bible chapter today?"}
        </span>
        {!bibleAlready && (
          <button onClick={onBibleOnly} style={{background:"#f5c842",border:"none",borderRadius:"1rem",padding:"0.35rem 0.9rem",fontWeight:700,fontSize:"0.8rem",cursor:"pointer",fontFamily:font}}>+{BIBLE_STANDALONE_BONUS} pts</button>
        )}
      </div>

      {/* Action row */}
      <div style={{display:"flex",gap:"0.6rem",marginBottom:"1.25rem"}}>
        <button onClick={onLogBook} style={{flex:2,background:"#6C63FF",color:"#fff",border:"none",borderRadius:"0.75rem",padding:"0.85rem",fontWeight:700,fontSize:"0.95rem",cursor:"pointer",fontFamily:font}}>+ Log a Book</button>
        <button onClick={onShare} style={{flex:1,background:"#fff",color:"#6C63FF",border:"2px solid #6C63FF",borderRadius:"0.75rem",padding:"0.85rem",fontWeight:700,fontSize:"0.85rem",cursor:"pointer",fontFamily:font}}>
          {copied ? "Copied! ✓" : "📤 Share"}
        </button>
      </div>

      {/* Prizes */}
      <h3 style={{fontFamily:font,color:"#444",margin:"0 0 0.75rem",fontSize:"0.78rem",letterSpacing:"0.08em",textTransform:"uppercase"}}>Your Prizes</h3>
      {PRIZES.map(prize => {
        const earned     = getPrizeEarned(totalPts, prize);
        const used       = readerData.redeemed[prize.id] || 0;
        const unredeemed = getUnredeemed(totalPts, prize, readerData.redeemed);
        const toNext     = prize.oneTime ? prize.threshold : prize.threshold - (totalPts % prize.threshold);
        const pct        = prize.oneTime
          ? Math.min(100,(totalPts/prize.threshold)*100)
          : Math.min(100,((prize.threshold-toNext)/prize.threshold)*100);
        return (
          <div key={prize.id} style={{background:"#fafafa",border:`1.5px solid ${unredeemed>0?prize.color:"#e0e0e0"}`,borderRadius:"0.75rem",padding:"0.9rem 1rem",marginBottom:"0.7rem",boxShadow:unredeemed>0?`0 0 12px ${prize.color}44`:"none"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontFamily:font,fontWeight:700,fontSize:"0.95rem"}}>{prize.label}</div>
                <div style={{fontFamily:font,fontSize:"0.72rem",color:"#888",marginTop:"0.1rem"}}>{prize.desc}</div>
              </div>
              {unredeemed > 0 && (
                <button onClick={() => onRedeemPrize(prize)} style={{background:prize.color,color:"#fff",border:"none",borderRadius:"1rem",padding:"0.4rem 0.9rem",fontWeight:700,fontSize:"0.78rem",cursor:"pointer",whiteSpace:"nowrap",marginLeft:"0.5rem",fontFamily:font}}>
                  Cash In{unredeemed>1?` (${unredeemed})`:""}
                </button>
              )}
            </div>
            <div style={{marginTop:"0.6rem",background:"#e9e4ff",borderRadius:"1rem",height:6}}>
              <div style={{background:prize.color,width:`${pct}%`,height:"100%",borderRadius:"1rem"}}/>
            </div>
            <div style={{fontFamily:font,fontSize:"0.7rem",color:"#999",marginTop:"0.25rem"}}>
              {prize.oneTime
                ? (earned?"🏆 Earned!":`${(prize.threshold-totalPts).toLocaleString()} pts to go`)
                : `Earned ${earned} · Used ${used} · ${toNext.toLocaleString()} pts to next`}
            </div>
          </div>
        );
      })}

      {/* Books list */}
      {readerData.books.length > 0 && (
        <div style={{marginTop:"0.5rem"}}>
          <h3 style={{fontFamily:font,color:"#444",margin:"0 0 0.75rem",fontSize:"0.78rem",letterSpacing:"0.08em",textTransform:"uppercase"}}>Books Finished</h3>
          {[...readerData.books].reverse().map(b => (
            <div key={b.id} style={{display:"flex",justifyContent:"space-between",padding:"0.5rem 0",borderBottom:"1px solid #eee"}}>
              <div>
                <div style={{fontFamily:font,fontSize:"0.9rem",fontWeight:600}}>{b.title}</div>
                <div style={{fontFamily:font,fontSize:"0.7rem",color:"#999"}}>
                  {b.pages}p {b.isAudio?"🎧":"📚"}{b.bibleBonus?" · 📖 +50%":""} · {b.date}
                </div>
              </div>
              <div style={{fontFamily:font,fontWeight:700,color:"#6C63FF",fontSize:"0.95rem"}}>+{b.points}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{textAlign:"center",marginTop:"2rem"}}>
        <button onClick={onResetName} style={{background:"none",border:"none",color:"#ccc",fontSize:"0.75rem",cursor:"pointer",fontFamily:font}}>Not {myName}? Switch reader</button>
      </div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [myName, setMyName] = useState(() => {
    try { return localStorage.getItem(READER_KEY) || null; } catch { return null; }
  });

  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(DATA_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    const init = {};
    READER_OPTIONS.forEach(r => { init[r.name] = emptyReader(); });
    return init;
  });

  const [view,   setView]   = useState("home");
  const [party,  setParty]  = useState(null);
  const [copied, setCopied] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const tapCount = useRef(0);
  const tapTimer = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(DATA_KEY, JSON.stringify(data)); } catch {}
  }, [data]);

  function chooseName(name) {
    try { localStorage.setItem(READER_KEY, name); } catch {}
    setMyName(name);
  }

  function resetName() {
    try { localStorage.removeItem(READER_KEY); } catch {}
    setMyName(null);
    setView("home");
  }

  if (!myName) {
    return (
      <>
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;800&display=swap" rel="stylesheet"/>
        <NameSetup onSelect={chooseName}/>
      </>
    );
  }

  const readerData = data[myName] || emptyReader();
  const totalPts   = getTotal(readerData);
  const hasBibleToday = readerData.bibleDays.some(bd => bd.date === todayStr());

  function submitBook({ title, pages, isAudio, bibleToday }) {
    const pts      = calcPoints(pages, isAudio, bibleToday);
    const today    = todayStr();
    const newBook  = { id:Date.now(), title, pages, isAudio, bibleBonus:bibleToday, points:pts, date:today };
    const newBible = [...readerData.bibleDays];
    if (bibleToday) newBible.push({ date:today, standalone:false });
    setData(prev => ({ ...prev, [myName]: { ...prev[myName], books:[...prev[myName].books, newBook], bibleDays:newBible } }));
    setView("home");
  }

  function submitBibleOnly() {
    if (hasBibleToday) return;
    setData(prev => ({ ...prev, [myName]: { ...prev[myName], bibleDays:[...prev[myName].bibleDays, { date:todayStr(), standalone:true }] } }));
  }

  function redeemPrize(prize) {
    if (getUnredeemed(totalPts, prize, readerData.redeemed) <= 0) return;
    setData(prev => ({
      ...prev,
      [myName]: { ...prev[myName], redeemed:{ ...prev[myName].redeemed, [prize.id]:(prev[myName].redeemed[prize.id]||0)+1 } }
    }));
    setParty({ prize });
  }

  function handleShare() {
    const text = buildShareText(myName, totalPts, readerData);
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  }

  function adjustPoints(name, delta, reason) {
    const adj = { id: Date.now(), delta, reason, date: todayStr() };
    setData(prev => ({
      ...prev,
      [name]: { ...prev[name], adjustments: [...(prev[name].adjustments || []), adj] }
    }));
  }

  function handleEmojiTap() {
    tapCount.current += 1;
    clearTimeout(tapTimer.current);
    if (tapCount.current >= 5) {
      tapCount.current = 0;
      setShowAdmin(true);
    } else {
      tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 1500);
    }
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;800&display=swap" rel="stylesheet"/>
      <div style={{minHeight:"100vh",background:"#f7f5ff"}}>
        {party && <LaserParty prize={party.prize} name={myName} onClose={() => setParty(null)}/> }
        {showAdmin && <AdminPanel data={data} onAdjust={adjustPoints} onClose={() => setShowAdmin(false)}/>}

        {/* Header */}
        <div style={{background:"#fff",borderBottom:"1px solid #ede9ff",padding:"0.85rem 1.25rem",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:10}}>
          <span onClick={handleEmojiTap} style={{fontFamily:font,fontWeight:800,color:"#222",fontSize:"1rem",cursor:"default",userSelect:"none"}}>
            {READER_OPTIONS.find(r=>r.name===myName)?.emoji} {myName}
          </span>
          <span style={{fontFamily:font,color:"#6C63FF",fontWeight:700,fontSize:"0.9rem"}}>{totalPts.toLocaleString()} pts</span>
        </div>

        <div style={{padding:"1.25rem",maxWidth:500,margin:"0 auto"}}>
          {view === "log"
            ? <LogView
                myName={myName}
                hasBibleToday={hasBibleToday}
                onSubmit={submitBook}
                onBack={() => setView("home")}
              />
            : <HomeView
                myName={myName}
                readerData={readerData}
                totalPts={totalPts}
                onLogBook={() => setView("log")}
                onShare={handleShare}
                onRedeemPrize={redeemPrize}
                onBibleOnly={submitBibleOnly}
                onResetName={resetName}
                copied={copied}
              />
          }
        </div>
      </div>
    </>
  );
}
