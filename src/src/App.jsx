import React, { useEffect, useState } from "react";

const API = ""; // our /api routes are same-origin on Vercel

export default function App() {
  const [dateISO, setDateISO] = useState(() => new Date().toISOString().slice(0,10));
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState(null);
  const [roster, setRoster] = useState([]);
  const [player, setPlayer] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => { loadGames(); }, [dateISO]);

  async function loadGames() {
    setLoading(true);
    const r = await fetch(`${API}/api/schedule?date=${dateISO}`);
    const j = await r.json();
    const out = [];
    (j.dates||[]).forEach(d => (d.games||[]).forEach(g => {
      out.push({
        id:g.gamePk, time:g.gameDate, venue:g.venue?.name||"TBD",
        home:{ id:g.teams?.home?.team?.id, name:g.teams?.home?.team?.name, abbr:g.teams?.home?.team?.abbreviation, pp:g.teams?.home?.probablePitcher?.fullName||"TBA" },
        away:{ id:g.teams?.away?.team?.id, name:g.teams?.away?.team?.name, abbr:g.teams?.away?.team?.abbreviation, pp:g.teams?.away?.probablePitcher?.fullName||"TBA" },
      });
    }));
    setGames(out);
    setLoading(false);
  }

  async function pickGame(g) {
    setGame(g);
    setPlayer(null); setLogs([]); setRoster([]);
    const [h,a] = await Promise.all([
      fetch(`${API}/api/roster?teamId=${g.home.id}`).then(r=>r.json()),
      fetch(`${API}/api/roster?teamId=${g.away.id}`).then(r=>r.json()),
    ]);
    const hr = (h.roster||[]).map(r=>mapPlayer(r, g.home));
    const ar = (a.roster||[]).map(r=>mapPlayer(r, g.away));
    setRoster([...hr, ...ar]);
  }

  function mapPlayer(r, team){
    return {
      id: r.person?.id, name: r.person?.fullName,
      pos: r.position?.abbreviation, teamAbbr: team.abbr, teamId: team.id
    };
  }

  async function pickPlayer(p){
    setPlayer(p); setLogs([]);
    const j = await fetch(`${API}/api/logs?playerId=${p.id}&season=2025`).then(r=>r.json());
    const rows = j.stats?.[0]?.splits || [];
    setLogs(rows.map(s=>({
      date:s.date, opp:s.opponent?.name||"", ab:+s.stat.atBats||0,
      h:+s.stat.hits||0, hr:+s.stat.homeRuns||0, bb:+s.stat.baseOnBalls||0, tb:+s.stat.totalBases||0
    })));
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.pill}>MLB</div>
        <div style={{fontWeight:900}}>EdgeLab — MLB Predictions</div>
        <div style={{marginLeft:"auto"}} />
      </header>

      {/* GAMES */}
      {!game && (
        <div style={styles.wrap}>
          <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:12}}>
            <input type="date" value={dateISO} onChange={e=>setDateISO(e.target.value)} style={styles.input}/>
            <span style={styles.muted}>Click a matchup to view predictions</span>
          </div>
          <div style={styles.grid}>
            {loading && <div style={styles.card2}>Loading…</div>}
            {!loading && games.length===0 && <div style={styles.card2}>No games.</div>}
            {games.map(g=>(
              <div key={g.id} style={styles.game} onClick={()=>pickGame(g)}>
                <div style={{display:"grid",gridTemplateColumns:"48px 1fr auto",gap:12,alignItems:"center"}}>
                  <div>
                    <div style={styles.badgeTeam}>{g.away.abbr||"AWY"}</div>
                    <div style={{height:6}} />
                    <div style={styles.badgeTeam}>{g.home.abbr||"HME"}</div>
                  </div>
                  <div>
                    <div style={{fontWeight:900}}>{new Date(g.time).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</div>
                    <div style={styles.muted}>{g.away.name} @ {g.home.name}</div>
                    <div style={{...styles.muted,marginTop:4}}>P: {g.away.pp} / {g.home.pp} • {g.venue}</div>
                  </div>
                  <button style={styles.btnGreen}>View</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PLAYERS + PREDICTION */}
      {game && (
        <div style={styles.wrap}>
          <div style={{...styles.card,display:"flex",gap:12,alignItems:"center"}}>
            <div>
              <div style={styles.badgeTeam}>{game.away.abbr}</div>
              <div style={{height:6}} />
              <div style={styles.badgeTeam}>{game.home.abbr}</div>
            </div>
            <div>
              <div style={{fontWeight:900}}>{game.away.name} @ {game.home.name}</div>
              <div style={styles.muted}>{game.venue} • {new Date(game.time).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</div>
            </div>
            <div style={{marginLeft:"auto"}} />
            <button style={styles.btnGhost} onClick={()=>setGame(null)}>Change game</button>
          </div>

          <div style={{display:"grid",gap:12,gridTemplateColumns:"1fr"}}>
            <div style={styles.card}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <div style={{fontWeight:800}}>Roster (this game only)</div>
              </div>
              <div style={{display:"grid",gap:10,gridTemplateColumns:"1fr 1fr"}}>
                {roster.length===0 && <div style={styles.card2}>Loading players…</div>}
                {roster.map(p=>(
                  <div key={p.id} style={styles.player} onClick={()=>pickPlayer(p)}>
                    <img
                      src={`https://img.mlbstatic.com/mlb-photos/image/upload/w_96,q_auto:best/v1/people/${p.id}/headshot/67/current`}
                      onError={(e)=>{e.currentTarget.replaceWith(initialsNode(initials(p.name)));}}
                      alt={p.name} style={styles.avatar}
                    />
                    <div style={{flex:1}}>
                      <div style={{fontWeight:800}}>{p.name}</div>
                      <div style={{display:"flex",gap:8,marginTop:4}}>
                        <span style={styles.pos}>{p.pos||""}</span>
                        <span style={styles.badge}>{p.teamAbbr}</span>
                      </div>
                    </div>
                    <div style={styles.badgeTeamSm}>{p.teamAbbr}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.card}>
              <div style={{fontWeight:800,marginBottom:8}}>Recent Games</div>
              {!player && <div style={styles.card2}>Pick a player from the roster.</div>}
              {player && logs.length===0 && <div style={styles.card2}>Loading…</div>}
              {player && logs.length>0 && (
                <div style={styles.tableWrap}>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead style={{background:styles.colors.surface2}}>
                      <tr>
                        {["Date","Opp","AB","H","HR","BB","TB"].map(h=>(<th key={h} style={styles.th}>{h}</th>))}
                      </tr>
                    </thead>
                    <tbody>
                      {logs.slice(0,12).map((r,i)=>(
                        <tr key={i} style={{borderTop:`1px solid ${styles.colors.border}`}}>
                          <td style={styles.td}>{r.date}</td>
                          <td style={styles.td}>{r.opp}</td>
                          <td style={styles.td}>{r.ab}</td>
                          <td style={styles.td}>{r.h}</td>
                          <td style={styles.td}>{r.hr}</td>
                          <td style={styles.td}>{r.bb}</td>
                          <td style={styles.td}>{r.tb}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----- tiny style system to match your EdgeLab feel ----- */
const styles = {
  colors: {
    bg:"#0b0e12", surface:"#10151b", surface2:"#0f1922", border:"#1d2632",
    text:"#e7f0ff", muted:"#a6b5cc", blue:"#2b8cff", green:"#2fd07a"
  },
  app:{minHeight:"100vh",background:"#0b0e12",color:"#e7f0ff",fontFamily:"system-ui, -apple-system, Segoe UI, Roboto, Arial"},
  header:{position:"sticky",top:0,display:"flex",gap:10,alignItems:"center",padding:"14px 16px",borderBottom:"1px solid #1d2632",background:"#0b0e12",zIndex:10},
  pill:{display:"grid",placeItems:"center",width:32,height:32,borderRadius:8,background:"#1f5fb0",fontWeight:900},
  wrap:{maxWidth:1100,margin:"0 auto",padding:"16px"},
  input:{background:"#0f1922",color:"#e7f0ff",border:"1px solid #1d2632",borderRadius:10,padding:"8px 10px"},
  muted:{color:"#a6b5cc"},
  grid:{display:"grid",gap:12,gridTemplateColumns:"1fr 1fr"},
  game:{background:"linear-gradient(180deg,#0f1720,#0b1118)",border:"1px solid #1d2632",borderRadius:18,padding:14,cursor:"pointer"},
  btnGreen:{background:"#2fd07a",color:"#08110b",border:"none",borderRadius:12,padding:"10px 14px",fontWeight:800},
  btnGhost:{background:"#0f1922",color:"#e7f0ff",border:"1px solid #1d2632",borderRadius:12,padding:"10px 14px",fontWeight:800},
  card:{background:"#10151b",border:"1px solid #1d2632",borderRadius:16,padding:12},
  card2:{background:"#0f1922",border:"1px solid #1d2632",borderRadius:14,padding:12,color:"#a6b5cc"},
  badge:{fontSize:12,padding:"4px 10px",borderRadius:999,background:"#0f1922",border:"1px solid #1d2632",color:"#a6b5cc"},
  badgeTeam:{display:"grid",placeItems:"center",width:36,height:36,borderRadius:10,fontWeight:900,background:"#1d5fb4"},
  badgeTeamSm:{display:"grid",placeItems:"center",width:32,height:32,borderRadius:8,fontWeight:900,background:"#1d5fb4"},
  player:{display:"flex",gap:12,alignItems:"center",background:"#0f1922",border:"1px solid #1d2632",borderRadius:14,padding:10},
  avatar:{width:52,height:52,borderRadius:"50%",objectFit:"cover",background:"#0f1922",border:"1px solid #1d2632"},
  pos:{fontSize:11,padding:"4px 8px",borderRadius:999,background:"#0a2332",border:"1px solid #133349",color:"#a7c5e6"},
  tableWrap:{border:"1px solid #1d2632",borderRadius:14,overflow:"hidden"},
  th:{textAlign:"left",padding:"8px 10px"},
  td:{padding:"8px 10px"},
};

// fallback initials avatar
function initialsNode(txt){
  const d=document.createElement("div");
  d.style.width="52px"; d.style.height="52px"; d.style.borderRadius="50%";
  d.style.display="grid"; d.style.placeItems="center"; d.style.background="#0f1922";
  d.style.color="#a6b5cc"; d.style.fontWeight="900";
  d.textContent = txt; return d;
}
function initials(name){ return (name||"??").split(" ").map(s=>s[0]).slice(0,2).join(""); }
