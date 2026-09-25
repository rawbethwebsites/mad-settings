"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Award, Check, ChevronLeft, Flame, Footprints, Lock, Map, Settings2, Sparkles, TentTree, Trophy, Users } from "lucide-react";
import { avatarEmoji, quizQuestions, tentMissions, trailSpots } from "@/data/camp";
import { addScore, approveMission, initialCampState, joinCamp, localCampStore, submitMission, toggleGame } from "@/lib/camp/storage";
import type { Avatar, CampState, GameKey, View } from "@/lib/camp/types";
import styles from "./CampApp.module.css";

const gameNames: Record<GameKey, string> = {
  quiz: "Campfire Quiz",
  trail: "Camp Trail",
  fingers: "Fastest Fingers",
  missions: "Tent Missions",
};

function PosterButton({ children, onClick, variant = "purple", type = "button", disabled = false, ariaLabel }: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "purple" | "acid" | "coral" | "cream" | "black";
  type?: "button" | "submit";
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return <button type={type} className={`${styles.button} ${styles[variant]}`} onClick={onClick} disabled={disabled} aria-label={ariaLabel}>{children}</button>;
}

function ClosedCard({ name }: { name: string }) {
  return <div className={styles.closedCard}><Lock size={28} aria-hidden="true" /><h3>{name} is closed</h3><p>The host will open the next round soon. Go collect trail points while you wait.</p></div>;
}

function Onboarding({ state, onJoin }: { state: CampState; onJoin: (name: string, avatar: Avatar) => void }) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<Avatar>("fox");
  const [submitted, setSubmitted] = useState(false);
  const assignedTentId = useMemo(() => state.tents
    .map((tent) => ({ id: tent.id, count: state.campers.filter((camper) => camper.active && camper.tentId === tent.id).length }))
    .sort((a, b) => a.count - b.count)[0].id, [state]);
  const assignedTent = state.tents.find((tent) => tent.id === assignedTentId)!;

  if (submitted) {
    return <main className={styles.onboarding}>
      <div className={styles.ticket}>
        <span className={styles.eyebrow}>Organiser assignment</span>
        <div className={styles.bigAvatar} aria-hidden="true">{avatarEmoji[avatar]}</div>
        <h1>You’re in,<br />{name}.</h1>
        <p>Your balanced tent assignment:</p>
        <div className={styles.assignment} style={{ background: assignedTent.color }}>
          <TentTree aria-hidden="true" /> {assignedTent.name}
        </div>
        <PosterButton variant="acid" onClick={() => onJoin(name, avatar)}>Enter the campsite →</PosterButton>
      </div>
    </main>;
  }

  return <main className={styles.onboarding}>
    <div className={styles.onboardGrid}>
      <section>
        <Image src="/tbn-logo.png" alt="The Boost Nation" width={112} height={48} className={styles.logo} priority />
        <span className={styles.kicker}>MAD SETTINGS / CAMP GAMES</span>
        <h1 className={styles.heroType}>Pick a face.<br /><span>Find your tent.</span><br />Play outside.</h1>
        <p className={styles.intro}>Your phone is the controller. Your tent is your team. The organiser keeps every crew balanced.</p>
      </section>
      <form className={styles.onboardForm} onSubmit={(event) => { event.preventDefault(); if (name.trim()) setSubmitted(true); }}>
        <label htmlFor="camp-name">Camp name</label>
        <input id="camp-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="What should we call you?" maxLength={24} required autoComplete="nickname" />
        <fieldset>
          <legend>Choose your avatar</legend>
          <div className={styles.avatarGrid}>
            {(Object.keys(avatarEmoji) as Avatar[]).map((item) => <button key={item} type="button" className={avatar === item ? styles.avatarSelected : ""} onClick={() => setAvatar(item)} aria-pressed={avatar === item} aria-label={`Choose ${item} avatar`}><span aria-hidden="true">{avatarEmoji[item]}</span><small>{item}</small></button>)}
          </div>
        </fieldset>
        <div className={styles.balanceNote}><Users size={22} aria-hidden="true" /><p><strong>No team picking.</strong><br />The organiser assigns the least-full tent.</p></div>
        <PosterButton type="submit" variant="purple">Get my tent</PosterButton>
      </form>
    </div>
  </main>;
}

function TopBar({ state, view, setView }: { state: CampState; view: View; setView: (view: View) => void }) {
  const player = state.campers.find((camper) => camper.id === state.currentPlayerId)!;
  const tent = state.tents.find((item) => item.id === player.tentId)!;
  const points = state.scores.filter((score) => score.playerId === player.id).reduce((sum, score) => sum + score.points, 0);
  return <header className={styles.topbar}>
    <button className={styles.brand} onClick={() => setView("map")} aria-label="Go to campsite home"><Image src="/tbn-logo.png" alt="The Boost Nation" width={76} height={32} /><span>CAMP<br />GAMES</span></button>
    <button className={styles.playerChip} onClick={() => setView("scores")} aria-label={`${player.name}, ${points} points. Open scoreboard`}>
      <span aria-hidden="true">{avatarEmoji[player.avatar]}</span>
      <span><strong>{player.name}</strong><small style={{ color: tent.color }}>{tent.name} · {points} pts</small></span>
    </button>
    {view !== "map" && <button className={styles.backButton} onClick={() => setView("map")}><ChevronLeft aria-hidden="true" /> Map</button>}
  </header>;
}

function CampMap({ setView }: { setView: (view: View) => void }) {
  return <main className={styles.mapPage}>
    <div className={styles.mapIntro}><div><span className={styles.eyebrow}>Tonight’s playground</span><h1>The camp is<br /><em>alive.</em></h1></div><p>Tap a location. Score points. Carry your tent.</p></div>
    <section className={styles.campsite} aria-label="Interactive campsite map">
      <div className={styles.moon} aria-hidden="true">☾</div>
      <div className={styles.stars} aria-hidden="true">✦　·　✦　　　·　✦</div>
      <button className={`${styles.location} ${styles.tentLocation}`} onClick={() => setView("tent")} aria-label="Open Tent Missions"><span className={styles.locationArt} aria-hidden="true">⛺</span><strong>Tent</strong><small>missions & crew</small></button>
      <button className={`${styles.location} ${styles.fireLocation}`} onClick={() => setView("campfire")} aria-label="Open Campfire games"><span className={styles.locationArt} aria-hidden="true">🔥</span><strong>Campfire</strong><small>quiz & fastest fingers</small></button>
      <button className={`${styles.location} ${styles.trailLocation}`} onClick={() => setView("trail")} aria-label="Open Camp Trail"><span className={styles.locationArt} aria-hidden="true">🌲</span><strong>Trail</strong><small>find the codes</small></button>
      <button className={`${styles.location} ${styles.scoreLocation}`} onClick={() => setView("scores")} aria-label="Open Scoreboard"><span className={styles.locationArt} aria-hidden="true">🏆</span><strong>Scoreboard</strong><small>who’s carrying?</small></button>
      <div className={styles.path} aria-hidden="true" />
      <div className={styles.grass} aria-hidden="true">〽 〰 〽　〰 〽 〰 〽</div>
    </section>
    <aside className={styles.liveStrip}><span><i /> LIVE NOW</span><strong>All four games are ready to play</strong><button onClick={() => setView("host")}>Host controls <Settings2 size={17} aria-hidden="true" /></button></aside>
  </main>;
}

function Quiz({ state, updateState }: { state: CampState; updateState: (next: CampState) => void }) {
  const [index, setIndex] = useState(0);
  const [total, setTotal] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [result, setResult] = useState<{ correct: boolean; earned: number } | null>(null);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);
  const startTime = useRef(0);

  if (!state.gameOpen.quiz) return <ClosedCard name="Campfire Quiz" />;
  if (state.completedQuiz && !done) return <div className={styles.resultCard}><Award size={42} aria-hidden="true" /><span className={styles.eyebrow}>Round recorded</span><h2>You already played this quiz.</h2><p>Your points are safe on the scoreboard. Ask the host to reset the prototype for a fresh run.</p></div>;
  if (done) return <div className={styles.resultCard}><Award size={42} aria-hidden="true" /><span className={styles.eyebrow}>Round complete</span><h2>{correct}/5 correct</h2><div className={styles.scoreBurst}>+{total} pts</div><p>Accuracy earns 100. Speed can add up to 50 on every correct answer.</p></div>;
  if (!started) return <div className={styles.resultCard}><Flame size={42} aria-hidden="true" /><span className={styles.eyebrow}>Five questions</span><h2>Ready for the fire round?</h2><p>Correct answers earn 100 points. Answer quickly for up to 50 bonus points.</p><PosterButton variant="coral" onClick={() => { startTime.current = performance.now(); setStarted(true); }}>Start quiz</PosterButton></div>;

  const question = quizQuestions[index];
  const answer = (answerIndex: number, eventTime: number) => {
    if (result) return;
    const isCorrect = answerIndex === question.correct;
    const elapsed = (eventTime - startTime.current) / 1000;
    const earned = isCorrect ? 100 + Math.max(0, 50 - Math.floor(elapsed * 5)) : 0;
    setTotal((value) => value + earned);
    if (isCorrect) setCorrect((value) => value + 1);
    setResult({ correct: isCorrect, earned });
  };
  const next = (eventTime: number) => {
    if (index === quizQuestions.length - 1) {
      const scored = addScore(state, total, "Campfire Quiz");
      updateState({ ...scored, completedQuiz: true });
      setDone(true);
      return;
    }
    setIndex((value) => value + 1);
    setResult(null);
    startTime.current = eventTime;
  };

  return <section className={styles.gamePanel} aria-live="polite">
    <div className={styles.gameMeta}><span>Question {index + 1}/5</span><span>{total} pts</span></div>
    <div className={styles.progress}><i style={{ width: `${((index + 1) / 5) * 100}%` }} /></div>
    <h2>{question.prompt}</h2>
    <div className={styles.answerGrid}>{question.answers.map((item, answerIndex) => <button key={item} onClick={(event) => answer(answerIndex, event.timeStamp)} disabled={Boolean(result)} className={result && answerIndex === question.correct ? styles.correctAnswer : ""}><span>{String.fromCharCode(65 + answerIndex)}</span>{item}</button>)}</div>
    {result && <div className={result.correct ? styles.goodFeedback : styles.badFeedback}><strong>{result.correct ? `Correct! +${result.earned}` : "Not this time."}</strong><span>{result.correct ? "Fast brain, extra points." : `Answer: ${question.answers[question.correct]}`}</span><button className={`${styles.button} ${result.correct ? styles.acid : styles.cream}`} onClick={(event) => next(event.timeStamp)}>{index === 4 ? "See round results" : "Next question"}</button></div>}
  </section>;
}

function FastestFingers({ state, updateState }: { state: CampState; updateState: (next: CampState) => void }) {
  const [phase, setPhase] = useState<"idle" | "wait" | "go" | "done" | "early">("idle");
  const [earned, setEarned] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const started = useRef(0);
  if (!state.gameOpen.fingers) return <ClosedCard name="Fastest Fingers" />;

  const arm = () => {
    setPhase("wait");
    timer.current = setTimeout(() => { started.current = performance.now(); setPhase("go"); }, 900 + Math.random() * 1600);
  };
  const tap = () => {
    if (phase === "wait") {
      if (timer.current) clearTimeout(timer.current);
      setPhase("early");
      return;
    }
    if (phase !== "go") return;
    const ms = Math.round(performance.now() - started.current);
    const points = Math.max(20, 200 - Math.floor(ms / 4));
    setEarned(points);
    updateState(addScore(state, points, `Fastest Fingers · ${ms}ms`));
    setPhase("done");
  };

  return <section className={styles.fingers}>
    <span className={styles.eyebrow}>Immediate round</span><h2>Tap when the signal flips.</h2><p>Too soon and the round is burned. Your reaction time sets the score.</p>
    <button className={`${styles.reactionPad} ${styles[`reaction_${phase}`]}`} onClick={tap} disabled={phase === "idle" || phase === "done" || phase === "early"}>
      {phase === "idle" && "ARM THE ROUND"}{phase === "wait" && "WAIT…"}{phase === "go" && "TAP!"}{phase === "done" && `+${earned} POINTS`}{phase === "early" && "TOO SOON!"}
    </button>
    {(phase === "idle" || phase === "done" || phase === "early") && <PosterButton variant="coral" onClick={arm}>{phase === "idle" ? "Ready?" : "Try another round"}</PosterButton>}
  </section>;
}

function Campfire({ state, updateState }: { state: CampState; updateState: (next: CampState) => void }) {
  const [tab, setTab] = useState<"quiz" | "fingers">("quiz");
  return <main className={styles.page}><div className={styles.pageHeading}><span aria-hidden="true">🔥</span><div><small>Location 02</small><h1>Campfire</h1><p>Brains first. Reflexes next.</p></div></div><div className={styles.tabs}><button className={tab === "quiz" ? styles.activeTab : ""} onClick={() => setTab("quiz")}>5-question quiz</button><button className={tab === "fingers" ? styles.activeTab : ""} onClick={() => setTab("fingers")}>Fastest fingers</button></div>{tab === "quiz" ? <Quiz state={state} updateState={updateState} /> : <FastestFingers state={state} updateState={updateState} />}</main>;
}

function Trail({ state, updateState }: { state: CampState; updateState: (next: CampState) => void }) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  if (!state.gameOpen.trail) return <main className={styles.page}><ClosedCard name="Camp Trail" /></main>;
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const spot = trailSpots.find((item) => item.code === code.trim().toUpperCase());
    if (!spot) { setMessage("No approved marker matches that code."); return; }
    if (state.completedTrailSpots.includes(spot.id)) { setMessage(`${spot.name} is already collected.`); return; }
    const scored = addScore(state, spot.points, `Trail · ${spot.name}`);
    updateState({ ...scored, completedTrailSpots: [...state.completedTrailSpots, spot.id] });
    setCode(""); setMessage(`${spot.name} verified. +${spot.points} points!`);
  };
  return <main className={styles.page}><div className={styles.pageHeading}><span aria-hidden="true">🌲</span><div><small>Location 03</small><h1>Camp Trail</h1><p>Find an approved spot. Scan—or type—the marker code.</p></div></div><form className={styles.codeForm} onSubmit={submit}><label htmlFor="trail-code">QR marker code</label><div><input id="trail-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="e.g. PINE24" required /><PosterButton type="submit" variant="acid">Verify</PosterButton></div><small>Prototype QR simulation: enter the code printed on a spot card.</small>{message && <p role="status">{message}</p>}</form><section className={styles.spotList}><h2>Approved spots <span>{state.completedTrailSpots.length}/{trailSpots.length}</span></h2>{trailSpots.map((spot, index) => { const done = state.completedTrailSpots.includes(spot.id); return <article key={spot.id} className={done ? styles.spotDone : ""}><b>0{index + 1}</b><div><h3>{spot.name}</h3><p>{spot.clue}</p><small>{spot.points} points · demo code <strong>{spot.code}</strong></small></div><span aria-label={done ? "Collected" : "Not collected"}>{done ? <Check /> : <Footprints />}</span></article>; })}</section></main>;
}

function TentMissions({ state, updateState }: { state: CampState; updateState: (next: CampState) => void }) {
  const [selected, setSelected] = useState(tentMissions[0].id);
  const [evidence, setEvidence] = useState("");
  const player = state.campers.find((camper) => camper.id === state.currentPlayerId)!;
  const tent = state.tents.find((item) => item.id === player.tentId)!;
  const crew = state.campers.filter((camper) => camper.tentId === tent.id && camper.active);
  const mySubmissions = state.missions.filter((mission) => mission.playerId === player.id);
  if (!state.gameOpen.missions) return <main className={styles.page}><ClosedCard name="Tent Missions" /></main>;
  const mission = tentMissions.find((item) => item.id === selected)!;
  const send = (event: React.FormEvent) => { event.preventDefault(); if (!evidence.trim()) return; updateState(submitMission(state, mission.id, evidence.trim(), mission.points)); setEvidence(""); };
  return <main className={styles.page}><div className={styles.pageHeading}><span aria-hidden="true">⛺</span><div><small>Location 01</small><h1>{tent.name}</h1><p>Your crew. Your missions. Your bragging rights.</p></div></div><section className={styles.crewCard} style={{ borderColor: tent.color }}><h2>Active crew · {crew.length}</h2><div>{crew.map((camper) => <span key={camper.id}><i aria-hidden="true">{avatarEmoji[camper.avatar]}</i>{camper.name}{camper.id === player.id && <small>YOU</small>}</span>)}</div></section><section className={styles.missions}><h2>Tent missions</h2>{tentMissions.map((item) => <button key={item.id} onClick={() => setSelected(item.id)} className={selected === item.id ? styles.missionSelected : ""}><span><Sparkles aria-hidden="true" /><b>{item.title}</b></span><small>+{item.points}</small><p>{item.brief}</p></button>)}</section><form className={styles.submitCard} onSubmit={send}><span className={styles.eyebrow}>Submit to host</span><h2>{mission.title}</h2><label htmlFor="mission-evidence">Evidence or story</label><textarea id="mission-evidence" value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="Paste a photo link or tell the host what your tent did…" required /><PosterButton type="submit" variant="purple">Send for approval</PosterButton></form>{mySubmissions.length > 0 && <section className={styles.submissions}><h2>Your submissions</h2>{mySubmissions.map((item) => <p key={item.id}><span>{tentMissions.find((missionItem) => missionItem.id === item.missionId)?.title}</span><b className={styles[item.status]}>{item.status}</b></p>)}</section>}</main>;
}

function Leaderboards({ state }: { state: CampState }) {
  const playerRows = state.campers.filter((camper) => camper.active).map((camper) => ({ ...camper, points: state.scores.filter((score) => score.playerId === camper.id).reduce((sum, score) => sum + score.points, 0) })).sort((a, b) => b.points - a.points);
  const tentRows = state.tents.map((tent) => { const members = state.campers.filter((camper) => camper.active && camper.tentId === tent.id); const total = state.scores.filter((score) => score.tentId === tent.id).reduce((sum, score) => sum + score.points, 0); return { ...tent, members: members.length, average: members.length ? Math.round(total / members.length) : 0 }; }).sort((a, b) => b.average - a.average);
  const [tab, setTab] = useState<"tent" | "individual">("tent");
  return <main className={styles.page}><div className={styles.pageHeading}><span aria-hidden="true">🏆</span><div><small>Live rankings</small><h1>Scoreboard</h1><p>Tent scores use average points per active member. Fair, even when crews differ.</p></div></div><div className={styles.tabs}><button className={tab === "tent" ? styles.activeTab : ""} onClick={() => setTab("tent")}>Tent average</button><button className={tab === "individual" ? styles.activeTab : ""} onClick={() => setTab("individual")}>Individuals</button></div><section className={styles.leaderboard}>{tab === "tent" ? tentRows.map((tent, index) => <article key={tent.id} className={index === 0 ? styles.firstPlace : ""}><strong>{index + 1}</strong><i style={{ background: tent.color }} /><div><h2>{tent.name}</h2><small>{tent.members} active members</small></div><b>{tent.average}<small> avg</small></b></article>) : playerRows.map((camper, index) => <article key={camper.id} className={camper.id === state.currentPlayerId ? styles.currentRow : ""}><strong>{index + 1}</strong><span className={styles.rowAvatar} aria-hidden="true">{avatarEmoji[camper.avatar]}</span><div><h2>{camper.name}</h2><small>{state.tents.find((tent) => tent.id === camper.tentId)?.name}</small></div><b>{camper.points}<small> pts</small></b></article>)}</section></main>;
}

function HostDashboard({ state, updateState, reset }: { state: CampState; updateState: (next: CampState) => void; reset: () => void }) {
  const [playerId, setPlayerId] = useState(state.currentPlayerId ?? state.campers[0].id);
  const [amount, setAmount] = useState("50");
  const pending = state.missions.filter((item) => item.status === "pending");
  const closeAll = () => updateState({ ...state, gameOpen: { quiz: false, trail: false, fingers: false, missions: false } });
  return <main className={styles.page}><div className={styles.hostHeading}><div><span className={styles.eyebrow}>Organiser tools</span><h1>Host mode</h1><p>Local prototype controls. No host authentication is applied in this MVP.</p></div><span>CONTROL<br />DESK</span></div><section className={styles.hostSection}><div className={styles.sectionTitle}><h2>Round control</h2><PosterButton variant="black" onClick={closeAll}>Close ongoing games</PosterButton></div><div className={styles.controlGrid}>{(Object.keys(state.gameOpen) as GameKey[]).map((game) => <article key={game}><div><span className={state.gameOpen[game] ? styles.openDot : styles.closedDot} /><h3>{gameNames[game]}</h3></div><button onClick={() => updateState(toggleGame(state, game))} aria-pressed={state.gameOpen[game]}>{state.gameOpen[game] ? "OPEN · close" : "CLOSED · open"}</button></article>)}</div></section><section className={styles.hostSection}><div className={styles.sectionTitle}><h2>Mission approvals</h2><span>{pending.length} pending</span></div>{pending.length === 0 ? <p className={styles.empty}>Nothing waiting. New tent submissions will appear here.</p> : pending.map((item) => <article className={styles.approval} key={item.id}><div><strong>{state.campers.find((camper) => camper.id === item.playerId)?.name}</strong><small>{tentMissions.find((mission) => mission.id === item.missionId)?.title} · +{item.points}</small><p>“{item.evidence}”</p></div><PosterButton variant="acid" onClick={() => updateState(approveMission(state, item.id))}>Approve</PosterButton></article>)}</section><section className={styles.hostSection}><h2>Score adjustment</h2><form className={styles.adjustForm} onSubmit={(event) => { event.preventDefault(); const points = Number(amount); if (Number.isFinite(points) && points !== 0) updateState(addScore(state, points, "Host adjustment", playerId)); }}><label>Camper<select value={playerId} onChange={(event) => setPlayerId(event.target.value)}>{state.campers.filter((camper) => camper.active).map((camper) => <option value={camper.id} key={camper.id}>{camper.name}</option>)}</select></label><label>Points<input type="number" value={amount} onChange={(event) => setAmount(event.target.value)} min="-1000" max="1000" /></label><PosterButton type="submit" variant="coral">Apply adjustment</PosterButton></form></section><section className={styles.dangerZone}><div><h2>Reset prototype</h2><p>Clear localStorage and return to onboarding.</p></div><button onClick={reset}>Reset local demo</button></section></main>;
}

function BottomNav({ view, setView }: { view: View; setView: (view: View) => void }) {
  const items: { view: View; label: string; icon: React.ReactNode }[] = [{ view: "map", label: "Map", icon: <Map /> }, { view: "tent", label: "Tent", icon: <TentTree /> }, { view: "campfire", label: "Fire", icon: <Flame /> }, { view: "trail", label: "Trail", icon: <Footprints /> }, { view: "scores", label: "Scores", icon: <Trophy /> }];
  return <nav className={styles.bottomNav} aria-label="Camp locations">{items.map((item) => <button key={item.view} className={view === item.view ? styles.navActive : ""} onClick={() => setView(item.view)} aria-current={view === item.view ? "page" : undefined}>{item.icon}<span>{item.label}</span></button>)}</nav>;
}

export default function CampApp() {
  const [state, setState] = useState<CampState>(initialCampState);
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<View>("map");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setState(localCampStore.load());
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const updateState = (next: CampState) => { setState(next); localCampStore.save(next); };
  const reset = () => { localCampStore.clear(); setState(initialCampState); setView("map"); };
  if (!hydrated) return <main className={styles.loading}><TentTree aria-hidden="true" /><span>Pitching camp…</span></main>;
  if (!state.currentPlayerId) return <Onboarding state={state} onJoin={(name, avatar) => updateState(joinCamp(state, name, avatar))} />;
  return <div className={styles.shell}><TopBar state={state} view={view} setView={setView} />{view === "map" && <CampMap setView={setView} />}{view === "tent" && <TentMissions state={state} updateState={updateState} />}{view === "campfire" && <Campfire state={state} updateState={updateState} />}{view === "trail" && <Trail state={state} updateState={updateState} />}{view === "scores" && <Leaderboards state={state} />}{view === "host" && <HostDashboard state={state} updateState={updateState} reset={reset} />}<BottomNav view={view} setView={setView} /></div>;
}
