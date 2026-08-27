"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { addHuman, applyAction, publicState, startGame, waitingState, type Card, type ComboKind, type GameState, type PublicGameState, type Suit } from "../lib/game";
import { languages, translations, translateError, translateLog, type Copy, type Language } from "../lib/i18n";
import "./game.css";

type Session = { code: string; playerId: string; token: string; name: string; seat: number };
type Snapshot = { room: { code: string; status: string; version: number }; player: { id: string; name: string; seat: number }; token?: string; game: PublicGameState };
type LobbyMessage = { id: number; name: string; text: string; roomCode?: string | null; createdAt: string };
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
const STORE = "murlan-session-v1";
const LOCAL_STORE = "murlan-pass-play-v1";
const OFFLINE_STORE = "murlan-offline-game-v1";
const rankFile: Record<string, string> = { "3": "3", "4": "4", "5": "5", "6": "6", "7": "7", "8": "8", "9": "9", "10": "10", J: "jack", Q: "queen", K: "king", A: "ace", "2": "2" };
const suitFile: Record<string, string> = { H: "hearts", D: "diamonds", C: "clubs", S: "spades" };
const order = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2", "BJ", "RJ"];
function cardImage(card: Card) { if (card.rank === "BJ") return "/cards/joker_black_v4.webp"; if (card.rank === "RJ") return "/cards/joker_red_v4.webp"; return `/cards/${rankFile[card.rank]}_of_${suitFile[card.suit]}.svg`; }
function CardView({ card, copy, selected, small, onClick }: { card: Card; copy: Copy; selected?: boolean; small?: boolean; onClick?: () => void }) {
  const label = card.suit === "X" ? copy.suits.X : `${card.rank} · ${copy.suits[card.suit]}`;
  const red = card.suit === "H" || card.suit === "D" || card.rank === "RJ"; const symbol = card.suit === "X" ? "✪" : ({ H:"♥", D:"♦", C:"♣", S:"♠" } as Record<string,string>)[card.suit]; const rank = card.rank === "BJ" || card.rank === "RJ" ? "Jolly" : card.rank;
  return <button type="button" className={`playing-card ${red ? "red-card" : "black-card"} ${selected ? "selected" : ""} ${small ? "small" : ""}`} onClick={onClick} disabled={!onClick} aria-label={label}><span className="card-fallback"><b>{rank}</b><em>{symbol}</em><i>{rank}</i></span><img src={cardImage(card)} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} /></button>;
}
function CardToken({ card }: { card: Card }) {
  const joker = card.rank === "BJ" || card.rank === "RJ";
  const red = card.suit === "H" || card.suit === "D" || card.rank === "RJ";
  return <span className={`card-token ${red ? "red" : "black"}`}>{joker ? "✪ Jolly" : `${card.rank}${({ S:"♠", C:"♣", D:"♦", H:"♥" } as Record<string,string>)[card.suit]}`}</span>;
}
function chatSource(text: string): Language { const value = ` ${text.toLowerCase()} `; if (/[ëç]/.test(value) || /\b(dhe|është|jam|nuk|për|luaj|dhomë|dua)\b/.test(value)) return "sq"; if (/[¿¡ñáéíóú]/.test(value) || /\b(quieres|jugar|sala|hola|gracias|entra|estoy)\b/.test(value)) return "es"; if (/\b(the|you|want|play|room|hello|thanks|join|game)\b/.test(value)) return "en"; return "it"; }
async function browserTranslation(text: string, target: Language) { const source = chatSource(text); if (source === target) return text; const url = new URL("https://api.mymemory.translated.net/get"); url.searchParams.set("q", text); url.searchParams.set("langpair", `${source}|${target}`); url.searchParams.set("mt", "1"); const response = await fetch(url); if (!response.ok) throw new Error("Translation failed"); const data = await response.json() as { responseData?: { translatedText?: string } }; if (!data.responseData?.translatedText) throw new Error("Translation failed"); return data.responseData.translatedText; }

export default function Home() {
  const [session, setSession] = useState<Session | null>(null); const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [name, setName] = useState(""); const [code, setCode] = useState(""); const [humans, setHumans] = useState(1); const [selected, setSelected] = useState<string[]>([]);
  const [mode, setMode] = useState<"online" | "pass-play">("online"); const [offlineMode, setOfflineMode] = useState(false); const [offlineGame, setOfflineGame] = useState<GameState | null>(null); const [botNames, setBotNames] = useState(["", "", ""]); const [localNames, setLocalNames] = useState(["", "", "", ""]); const [localHumans, setLocalHumans] = useState(1);
  const [localSessions, setLocalSessions] = useState<Session[]>([]); const [handoff, setHandoff] = useState(false);
  const [pausedSession, setPausedSession] = useState<Session | null>(null);
  const [visiblePileCount, setVisiblePileCount] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [showRules, setShowRules] = useState(false); const [copied, setCopied] = useState(false);
  const [lang, setLang] = useState<Language>("it"); const t = translations[lang];
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const game = snapshot?.game; const pileLength = game?.pile?.length ?? 0; const watchingMoves = visiblePileCount < pileLength; const myTurn = !!game && game.phase === "playing" && game.turn === session?.seat && !watchingMoves; const myExchange = !!game && game.phase === "exchange" && game.turn === session?.seat; const canSelect = myTurn || myExchange; const visiblePile = (game?.pile ?? []).slice(0, visiblePileCount); const lastVisiblePlay = visiblePile.at(-1);
  const sortedHand = useMemo(() => [...(game?.hand ?? [])].sort((a, b) => order.indexOf(a.rank) - order.indexOf(b.rank) || "HDCSX".indexOf(a.suit) - "HDCSX".indexOf(b.suit)), [game?.hand]);
  const saveSession = (next: Session) => { setSession(next); localStorage.setItem(STORE, JSON.stringify(next)); };
  const request = useCallback(async (url: string, init?: RequestInit) => { const res = await fetch(url, init); const data = await res.json(); if (!res.ok) throw new Error(data.error ?? "Errore inatteso."); return data as Snapshot; }, []);
  const refresh = useCallback(async (active: Session) => { try { const data = await request(`/api/rooms?code=${active.code}&playerId=${active.playerId}&token=${active.token}`); setSnapshot(data); } catch { /* session may have expired */ } }, [request]);
  useEffect(() => { const savedLang = localStorage.getItem("murlan-language") as Language | null; if (savedLang && translations[savedLang]) setLang(savedLang); const rawOffline = localStorage.getItem(OFFLINE_STORE); const rawLocal = localStorage.getItem(LOCAL_STORE); const raw = localStorage.getItem(STORE); const query = new URLSearchParams(location.search).get("room"); if (query) setCode(query.toUpperCase()); if (rawOffline) { try { const saved = JSON.parse(rawOffline) as { game: GameState; sessions: Session[]; activeSeat: number }; const active = saved.sessions.find((item) => item.seat === saved.activeSeat) ?? saved.sessions[0]; setOfflineGame(saved.game); setOfflineMode(true); setLocalSessions(saved.sessions); setSession(active); setSnapshot({ room:{ code:"AEREO", status:saved.game.phase, version:saved.game.handNumber }, player:{ id:active.playerId, name:active.name, seat:active.seat }, game:publicState(saved.game, active.seat) }); setHandoff(true); return; } catch { localStorage.removeItem(OFFLINE_STORE); } } if (rawLocal) { try { const sessions = JSON.parse(rawLocal) as Session[]; if (sessions.length > 0) { setLocalSessions(sessions); setSession(sessions[0]); setHandoff(true); refresh(sessions[0]); return; } } catch { localStorage.removeItem(LOCAL_STORE); } } if (raw) { try { const active = JSON.parse(raw) as Session; saveSession(active); refresh(active); } catch { localStorage.removeItem(STORE); } } }, [refresh]);
  useEffect(() => { if (!session || offlineGame) return; const timer = setInterval(() => refresh(session), 1800); return () => clearInterval(timer); }, [session, refresh, offlineGame]);
  useEffect(() => { if (visiblePileCount > pileLength) { setVisiblePileCount(0); return; } if (visiblePileCount < pileLength) { const timer = setTimeout(() => setVisiblePileCount((count) => count + 1), visiblePileCount ? 1500 : 650); return () => clearTimeout(timer); } }, [pileLength, visiblePileCount]);
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    const capture = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", capture);
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, []);

  async function enter(operation: "create" | "join") {
    setBusy(true); setError("");
    try { const data = await request("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operation, name, code, humanCount: humans, botNames: botNames.slice(0, 4 - humans) }) }); const active = { code: data.room.code, playerId: data.player.id, token: data.token!, name: data.player.name, seat: data.player.seat }; saveSession(active); setSnapshot(data); history.replaceState({}, "", `?room=${data.room.code}`); }
    catch (e) { setError(translateError(e instanceof Error ? e.message : "Errore inatteso.", lang)); } finally { setBusy(false); }
  }
  async function startPassPlay() {
    if (localNames.slice(0, localHumans).some((value) => !value.trim())) return;
    if (offlineMode) { startOfflinePassPlay(); return; }
    setBusy(true); setError("");
    try {
      const created = await request("/api/rooms", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ operation:"create", name:localNames[0], humanCount:localHumans, botNames:botNames.slice(0,4-localHumans) }) });
      const sessions: Session[] = [{ code:created.room.code, playerId:created.player.id, token:created.token!, name:created.player.name, seat:created.player.seat }];
      let latest = created;
      for (let index = 1; index < localHumans; index++) { latest = await request("/api/rooms", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ operation:"join", name:localNames[index], code:created.room.code }) }); sessions.push({ code:latest.room.code, playerId:latest.player.id, token:latest.token!, name:latest.player.name, seat:latest.player.seat }); }
      setLocalSessions(sessions); localStorage.removeItem(STORE); localStorage.setItem(LOCAL_STORE, JSON.stringify(sessions));
      const active = sessions.find((item) => item.seat === latest.game.turn) ?? sessions[0]; setSession(active); await refresh(active); setHandoff(true); history.replaceState({}, "", location.pathname);
    } catch (e) { setError(translateError(e instanceof Error ? e.message : "Errore inatteso.", lang)); } finally { setBusy(false); }
  }
  function showOfflineState(nextGame: GameState, sessions: Session[], active: Session, handoffScreen = true) {
    setOfflineGame(nextGame); setLocalSessions(sessions); setSession(active); setHandoff(handoffScreen);
    setSnapshot({ room:{ code:"AEREO", status:nextGame.phase, version:Date.now() }, player:{ id:active.playerId, name:active.name, seat:active.seat }, game:publicState(nextGame, active.seat) });
    localStorage.setItem(OFFLINE_STORE, JSON.stringify({ game:nextGame, sessions, activeSeat:active.seat }));
  }
  function startOfflinePassPlay() {
    const nextGame = waitingState(localHumans, localNames[0], botNames.slice(0, 4-localHumans));
    if (localHumans === 1) startGame(nextGame); else for (let index = 1; index < localHumans; index++) addHuman(nextGame, localNames[index]);
    const sessions = Array.from({ length:localHumans }, (_,seat) => ({ code:"AEREO", playerId:`offline-${seat}`, token:"", name:localNames[seat], seat }));
    const active = sessions.find((item) => item.seat === nextGame.turn) ?? sessions[0];
    localStorage.removeItem(STORE); localStorage.removeItem(LOCAL_STORE); showOfflineState(nextGame, sessions, active);
    history.replaceState({}, "", location.pathname);
  }
  async function action(type: "play" | "pass" | "exchange") {
    if (!session || !snapshot) return; setBusy(true); setError("");
    if (offlineGame) { try { const nextGame = structuredClone(offlineGame); applyAction(nextGame, session.seat, { type, cardIds:type === "play" || type === "exchange" ? selected : undefined }); setSelected([]); const next = localSessions.find((item) => item.seat === nextGame.turn) ?? session; showOfflineState(nextGame, localSessions, next, next.seat !== session.seat); } catch (e) { setError(translateError(e instanceof Error ? e.message : "Errore inatteso.", lang)); } finally { setBusy(false); } return; }
    try { const data = await request("/api/rooms", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: session.code, playerId: session.playerId, token: session.token, version: snapshot.room.version, action: { type, cardIds: type === "play" || type === "exchange" ? selected : undefined } }) }); setSelected([]); if (localSessions.length && (data.game.phase === "playing" || data.game.phase === "exchange")) { const next = localSessions.find((item) => item.seat === data.game.turn); if (next) { setSession(next); await refresh(next); setHandoff(true); } else setSnapshot(data); } else setSnapshot(data); }
    catch (e) { setError(translateError(e instanceof Error ? e.message : "Errore inatteso.", lang)); await refresh(session); } finally { setBusy(false); }
  }
  async function share() { const url = `${location.origin}${location.pathname}?room=${session?.code}`; await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); }
  function goHome() { if (session) setPausedSession(session); setHandoff(false); setSession(null); setSnapshot(null); setSelected([]); history.replaceState({}, "", location.pathname); }
  async function resumeGame() { if (!pausedSession) return; const active = pausedSession; setPausedSession(null); if (offlineGame) { showOfflineState(offlineGame, localSessions, active, true); return; } setSession(active); await refresh(active); if (localSessions.length) setHandoff(true); history.replaceState({}, "", `${location.pathname}?room=${active.code}`); }
  function leave() { localStorage.removeItem(STORE); localStorage.removeItem(LOCAL_STORE); localStorage.removeItem(OFFLINE_STORE); setPausedSession(null); setOfflineGame(null); setLocalSessions([]); setHandoff(false); setSession(null); setSnapshot(null); setSelected([]); history.replaceState({}, "", location.pathname); }
  function changeLanguage(next: Language) { setLang(next); localStorage.setItem("murlan-language", next); document.documentElement.lang = next; }
  async function installApp() { if (!installPrompt) return; await installPrompt.prompt(); await installPrompt.userChoice; setInstallPrompt(null); }
  const languageMenu = <LanguageMenu value={lang} onChange={changeLanguage} />;

  if (!session || !snapshot) return <><main className="landing">
    <nav><span /><div className="nav-actions">{languageMenu}<button className="text-button" onClick={() => setShowRules(true)}>{t.how}</button></div></nav>
    <section className="hero">
      <div className="hero-copy"><img className="hero-logo" src="/murlan-icon-original.png" alt="Murlan Game" /><h1>MURLAN</h1><div className="suits"><span>♠<small>{t.suits.S}</small></span><span>♣<small>{t.suits.C}</small></span><span>♦<small>{t.suits.D}</small></span><span>♥<small>{t.suits.H}</small></span></div></div>
      <div className="entry-card">
        {pausedSession && <button className="resume-game" onClick={resumeGame}>↩ {({it:"Riprendi partita",en:"Resume game",es:"Reanudar partida",sq:"Vazhdo lojën"} as Record<Language,string>)[lang]}<small>{offlineGame ? " · ✈" : ` · ${pausedSession.code}`}</small></button>}
        <div className="mode-tabs"><button className={mode === "online" ? "active" : ""} onClick={() => setMode("online")}>{t.onlineMode}</button><button className={mode === "pass-play" ? "active" : ""} onClick={() => setMode("pass-play")}>{t.passPlayMode}</button></div>
        {mode === "online" ? <>
          <div className="entry-tabs"><span>{t.newGame}</span><span>{t.join}</span></div>
          <label>{t.yourName}<input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder={t.namePh} /></label>
          <label>{t.howMany}<div className="people-picker">{[1,2,3,4].map((n) => <button key={n} type="button" onClick={() => setHumans(n)} className={humans === n ? "active" : ""}><b>{n}</b><small>{n === 1 ? t.youBots : n === 4 ? t.allHuman : `${n} ${t.humans}`}</small></button>)}</div></label>
          {humans < 4 && <fieldset className="name-grid"><legend>{t.botNames}</legend>{Array.from({length:4-humans},(_,index) => <input key={index} value={botNames[index]} onChange={(event) => setBotNames((old) => old.map((value,i) => i === index ? event.target.value : value))} maxLength={24} placeholder={`Bot ${humans + index + 1}`} />)}</fieldset>}
          <button className="primary" disabled={busy || !name.trim()} onClick={() => enter("create")}>{t.create}</button>
          <div className="or"><span>{t.orCode}</span></div><div className="join-row"><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={13} placeholder="MURLAN-XXXXXX" /><button disabled={busy || !name.trim() || code.length < 6} onClick={() => enter("join")}>{t.join}</button></div>
        </> : <>
          <button type="button" className={`airplane-mode ${offlineMode ? "active" : ""}`} onClick={() => setOfflineMode((active) => !active)}><span>✈</span><b>{t.airplaneMode}</b><small>{offlineMode ? t.airplaneOn : t.airplaneOff}</small></button>
          <div className="entry-tabs"><span>{t.passPlayMode}</span><span>{localHumans} + {4-localHumans}</span></div>
          <label>{t.howMany}<div className="people-picker">{[1,2,3,4].map((n) => <button key={n} type="button" onClick={() => setLocalHumans(n)} className={localHumans === n ? "active" : ""}><b>{n}</b><small>{n === 1 ? t.youBots : n === 4 ? t.allHuman : `${n} ${t.humans}`}</small></button>)}</div></label>
          <fieldset className="name-grid local-names"><legend>{t.localPlayers}</legend>{localNames.slice(0,localHumans).map((value,index) => <input key={index} value={value} onChange={(event) => setLocalNames((old) => old.map((name,i) => i === index ? event.target.value : name))} maxLength={24} placeholder={`${t.player} ${index + 1}`} />)}</fieldset>
          {localHumans < 4 && <fieldset className="name-grid"><legend>{t.botNames}</legend>{Array.from({length:4-localHumans},(_,index) => <input key={index} value={botNames[index]} onChange={(event) => setBotNames((old) => old.map((value,i) => i === index ? event.target.value : value))} maxLength={24} placeholder={`Bot ${localHumans + index + 1}`} />)}</fieldset>}
          <button className="primary" disabled={busy || localNames.slice(0,localHumans).some((value) => !value.trim())} onClick={startPassPlay}>{t.startLocal}</button>
        </>}
        {error && <p className="error">{error}</p>}
      </div>
    </section>{installPrompt && <button className="install-app" onClick={installApp}>↓ {t.install}</button>}<footer><span>{t.edition}</span><span>{t.footer}</span></footer>{showRules && <Rules copy={t} onClose={() => setShowRules(false)} />}
  </main><Lobby name={name} copy={t} lang={lang} onJoin={(room) => setCode(room)} /></>;

  if (game?.phase === "waiting") return <><main className="room-wait"><nav><span className="wordmark">murlan-game.dev</span><div className="nav-actions">{languageMenu}<button className="text-button" onClick={leave}>{t.exit}</button></div></nav><section className="waiting-panel"><p className="eyebrow">{t.waiting}</p><h1>{t.gather}</h1><p>{t.stillNeed} {game.humanCount - game.players.length} {game.humanCount - game.players.length === 1 ? t.player : t.players}. {t.botsFill}</p><div className="room-code"><small>{t.roomCode}</small><strong>{session.code}</strong></div><button className="primary" onClick={share}>{copied ? t.copied : t.copyInvite}</button><div className="seat-preview">{Array.from({ length: 4 }, (_, seat) => <div key={seat} className={`seat team-${seat % 2}`}><span>{game.players[seat]?.name ?? (seat < game.humanCount ? t.waitingSeat : `Bot ${seat + 1}`)}</span><small>{t.team} {seat % 2 ? t.jade : t.amber}</small></div>)}</div></section></main><Lobby name={session.name} roomCode={session.code} copy={t} lang={lang} onJoin={() => {}} /></>;

  return <><main className="game-shell">
    {localSessions.length > 0 && handoff && <div className="handoff-screen"><img src="/murlan-icon-192.png" alt="" /><p>{t.passDevice}</p><h2>{session.name}</h2><button className="primary" onClick={() => setHandoff(false)}>{t.revealHand}</button></div>}
    <header className="game-header"><button className="brand-button" onClick={goHome}>M</button><div className="score amber"><small>{t.team} {t.amber}</small><b>{game?.scores[0]}</b></div><div className="target"><small>{t.target}</small><b>{game?.target}</b></div><div className="score jade"><b>{game?.scores[1]}</b><small>{t.team} {t.jade}</small></div><div className="game-tools">{languageMenu}<button className="icon-button" onClick={() => setShowRules(true)}>?</button></div></header>
    <section className="table">
      <button className="history-toggle" onClick={() => setHistoryOpen((open) => !open)}>☰ {t.playHistory}</button>
      {lastVisiblePlay && <div className="last-player"><small>{t.lastPlayBy}</small><b>{game.players[lastVisiblePlay.seat].name}</b></div>}
      {historyOpen && <><button className="history-backdrop" aria-label="Close" onClick={() => setHistoryOpen(false)} /><aside className="play-history"><header><b>{t.playHistory}</b><button onClick={() => setHistoryOpen(false)}>×</button></header>{visiblePile.length ? visiblePile.map((play,index) => <div className="history-row" key={`${play.seat}-${index}-${play.cards[0]?.id}`}><small>{game.players[play.seat].name}</small><div>{play.cards.map((card) => <CardToken card={card} key={card.id} />)}</div></div>) : <p>{t.noPlays}</p>}</aside></>}
      <div className="players-ring">{game?.players.map((player, seat) => { const relativeSeat = (seat - session.seat + 4) % 4; return <div key={seat} className={`player-pill p${relativeSeat} team-${player.team} ${game.turn === seat ? "turn" : ""} ${game.finishOrder.includes(seat) ? "finished" : ""}`}><span className="avatar">{player.bot ? "◆" : player.name.slice(0,1).toUpperCase()}</span><div><b>{player.name}{seat === session.seat ? ` · ${t.you}` : ""}</b><small>{game.finishOrder.includes(seat) ? `${game.finishOrder.indexOf(seat)+1}° ${t.place}` : player.cards === 1 ? t.lastCard : `${player.cards} ${t.cards}`}</small></div></div>; })}</div>
      <div className="table-center"><p className="turn-label">{watchingMoves ? t.watchPlay : game?.phase === "playing" ? myTurn ? t.yourTurn : `${t.turnOf} ${game?.players[game.turn]?.name}` : game?.phase === "exchange" ? myExchange ? t.exchangeYourTurn : `${t.exchangeWaiting} ${game?.players[game.turn]?.name}` : t.matchOver}</p><div className="last-play">{visiblePile.length ? <div className="pile-stack">{visiblePile.slice(-5).map((play,index) => <div className="pile-play" key={`${play.seat}-${index}-${play.cards[0]?.id}`} style={{ transform:`translate(${(index%3-1)*9}px, ${index*3}px) rotate(${(index%5-2)*5}deg)`, zIndex:index+1 }}>{play.cards.map((card) => <CardView card={card} copy={t} small key={card.id} />)}</div>)}</div> : <div className="empty-play"><span>♠</span><p>{t.newRound}<br /><small>{t.freePlay}</small></p></div>}</div>{game?.passes.length && !watchingMoves ? <p className="pass-line">{t.passed}: {game.passes.map((s) => game.players[s].name).join(", ")}</p> : null}</div>
    </section>
    <section className="hand-area"><div className="hand-meta"><span>{t.yourHand} · {sortedHand.length} {t.cards}</span><span>{myExchange ? t.chooseExchange : selected.length ? `${selected.length} ${t.selected}` : t.selectCards}</span></div><div className="hand-scroll">{sortedHand.map((card) => <CardView key={card.id} card={card} copy={t} selected={selected.includes(card.id)} onClick={canSelect ? () => setSelected((old) => myExchange ? old.includes(card.id) ? [] : [card.id] : old.includes(card.id) ? old.filter((id) => id !== card.id) : [...old, card.id]) : undefined} />)}</div><div className="actions">{game?.phase === "playing" ? <><button className="pass" disabled={!myTurn || !game.currentPlay || busy} onClick={() => action("pass")}>{t.pass}</button><button className="primary play" disabled={!myTurn || !selected.length || busy} onClick={() => action("play")}>{t.play} {selected.length || ""}</button></> : game?.phase === "exchange" ? <button className="primary play" disabled={!myExchange || selected.length !== 1 || busy} onClick={() => action("exchange")}>{t.confirmExchange}</button> : <button className="primary play" onClick={leave}>{t.home}</button>}</div>{error && <p className="error action-error">{error}</p>}</section>
    <aside className="activity"><b>{t.tableLog}</b>{game?.log.slice(0,5).map((line, i) => <p key={i}>{translateLog(line, lang)}</p>)}</aside>{showRules && <Rules copy={t} onClose={() => setShowRules(false)} />}
  </main>{localSessions.length === 0 && <Lobby name={session.name} roomCode={session.code} copy={t} lang={lang} onJoin={() => {}} />}</>;
}

function LanguageMenu({ value, onChange }: { value: Language; onChange: (lang: Language) => void }) {
  return <div className="language-menu" aria-label="Language"><button className="language-current" type="button">{languages.find((item) => item.code === value)?.flag}</button><div className="language-options">{languages.map((item) => <button key={item.code} type="button" className={value === item.code ? "active" : ""} onClick={() => onChange(item.code)}><span>{item.flag}</span>{item.label}</button>)}</div></div>;
}

function Rules({ copy, onClose }: { copy: Copy; onClose: () => void }) { return <div className="modal-backdrop" role="dialog" aria-modal="true"><section className="rules"><header><div><p className="eyebrow">{copy.rulesEdition}</p><h2>{copy.rulesTitle}</h2></div><button onClick={onClose}>×</button></header><div className="rules-body"><p>{copy.rulesIntro}</p>{copy.rules.map(([title, body], index) => <details open={index === 0} key={title}><summary>{index + 1}. {title}</summary><p>{body}</p></details>)}</div></section></div>; }

function Lobby({ name, roomCode, copy, lang, onJoin }: { name: string; roomCode?: string; copy: Copy; lang: Language; onJoin: (code: string) => void }) {
  const [open, setOpen] = useState(false); const [messages, setMessages] = useState<LobbyMessage[]>([]); const [text, setText] = useState(""); const [unread, setUnread] = useState(0); const [ready, setReady] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [translated, setTranslated] = useState<Record<number, string>>({}); const [translating, setTranslating] = useState<number | null>(null);
  const latest = messages.at(-1)?.id ?? 0;
  const load = useCallback(async () => { try { const res = await fetch(`/api/lobby${latest ? `?since=${latest}` : ""}`); if (!res.ok) return; const data = await res.json() as { messages: LobbyMessage[] }; if (!data.messages.length) { setReady(true); return; } setMessages((old) => latest ? [...old, ...data.messages].slice(-60) : data.messages); if (ready && !open) { setUnread((n) => n + data.messages.length); const last = data.messages.at(-1)!; if (notificationsEnabled && "Notification" in window && Notification.permission === "granted") new Notification(`${last.name} ${copy.notification}`, { body: last.text, icon: "/murlan-icon-192.png" }); } setReady(true); } catch { /* lobby is optional */ } }, [latest, open, ready, copy.notification, notificationsEnabled]);
  useEffect(() => { load(); const timer = setInterval(load, 4500); return () => clearInterval(timer); }, [load]);
  useEffect(() => { setNotificationsEnabled(localStorage.getItem("murlan-lobby-notifications") === "on" && "Notification" in window && Notification.permission === "granted"); }, []);
  useEffect(() => { if (open) setUnread(0); }, [open]);
  async function enableNotifications() { if (!("Notification" in window)) return; if (notificationsEnabled) { localStorage.removeItem("murlan-lobby-notifications"); setNotificationsEnabled(false); return; } const permission = await Notification.requestPermission(); if (permission === "granted") { localStorage.setItem("murlan-lobby-notifications", "on"); setNotificationsEnabled(true); } }
  async function send(invite = false) { if (!name.trim() || (!text.trim() && !invite)) return; const message = invite ? copy.inviteMessage : text; const res = await fetch("/api/lobby", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, text: message, roomCode: invite ? roomCode : undefined }) }); if (res.ok) { setText(""); await load(); } }
  async function translateMessage(message: LobbyMessage) { setTranslating(message.id); try { const res = await fetch("/api/translate", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ text:message.text, target:lang }) }); const data = await res.json() as { translation?: string }; const translation = data.translation || await browserTranslation(message.text, lang); setTranslated((old) => ({ ...old, [message.id]: translation })); } catch { try { const translation = await browserTranslation(message.text, lang); setTranslated((old) => ({ ...old, [message.id]: translation })); } catch { setTranslated((old) => ({ ...old, [message.id]: copy.translationFailed })); } } finally { setTranslating(null); } }
  return <><button className={`lobby-bell ${unread > 0 ? "has-unread" : ""}`} onClick={() => setOpen((v) => !v)} aria-label={copy.lobby}><span>♟</span> {copy.lobby} {unread > 0 && <b>{unread}</b>}</button>{open && <aside className="lobby-panel"><header><div><strong>{copy.lobbyTitle}</strong><small>{copy.organize}</small></div><div className="lobby-header-actions"><button className={notificationsEnabled ? "active" : ""} title={copy.notify} onClick={enableNotifications}>🔔</button><button onClick={() => setOpen(false)}>×</button></div></header><div className="lobby-feed">{messages.length ? messages.map((m) => <article key={m.id}><div><b>{m.name}</b><time>{new Date(m.createdAt).toLocaleTimeString(lang === "en" ? "en-GB" : lang === "es" ? "es-ES" : lang === "sq" ? "sq-AL" : "it-IT", { hour: "2-digit", minute: "2-digit" })}</time></div><p>{m.text}</p>{translated[m.id] && <p className="translated-message">{translated[m.id]}</p>}<div className="message-actions"><button onClick={() => translateMessage(m)} disabled={translating === m.id}>🌐 {translating === m.id ? "…" : languages.find((item) => item.code === lang)?.flag}</button>{m.roomCode && <button onClick={() => { onJoin(m.roomCode!); setOpen(false); }}>{copy.enterRoom} · {m.roomCode}</button>}</div></article>) : <p className="lobby-empty">{copy.lobbyEmpty}</p>}</div><div className="lobby-compose">{roomCode && <button className="invite" onClick={() => send(true)}>{copy.inviteRoom} {roomCode}</button>}<div><input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} maxLength={240} placeholder={name ? copy.writeLobby : copy.nameFirst} disabled={!name} /><button onClick={() => send()} disabled={!name || !text.trim()}>{copy.send}</button></div></div></aside>}</>;
}
