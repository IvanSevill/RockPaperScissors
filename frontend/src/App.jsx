import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Hands } from "@mediapipe/hands";
import * as cam from "@mediapipe/camera_utils";
import * as draw from "@mediapipe/drawing_utils";
import "./App.css";

const localeFiles = import.meta.glob("./locales/*.json", { eager: true });
const languages = {};

Object.entries(localeFiles).forEach(([path, content]) => {
  const langCode = path.split("/").pop().replace(".json", "");
  languages[langCode] = content.default || content;
});

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const gesturesRef = useRef({ p1: "WAITING", p2: "WAITING" });
  const cameraRef = useRef(null);

  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [history, setHistory] = useState([]);

  const [langCode, setLangCode] = useState(() => {
    const saved = localStorage.getItem("rps_lang");
    return languages[saved] ? saved : Object.keys(languages)[0] || "es";
  });

  // SOLUCIÓN AL ERROR DE ESLINT: Memorizar 't'
  const t = useMemo(() => languages[langCode] || {}, [langCode]);

  const [p1Name, setP1Name] = useState("Ivan");
  const [p2Name, setP2Name] = useState("Antonio");
  const [displayGestoP1, setDisplayGestoP1] = useState("");
  const [displayGestoP2, setDisplayGestoP2] = useState("");
  const [status, setStatus] = useState("");
  const [countdown, setCountdown] = useState(null);

  const refreshData = useCallback(async () => {
    try {
      const [lbRes, histRes] = await Promise.all([
        fetch(`${API_URL}/leaderboard`),
        fetch(`${API_URL}/history`)
      ]);
      if (lbRes.ok) setLeaderboard(await lbRes.json());
      if (histRes.ok) setHistory(await histRes.json());
    } catch (error) {
      console.error("Backend error:", error);
    }
  }, []);

  // Resetear textos cuando cambia el idioma o t
  const resetGameMessages = useCallback(() => {
    setStatus(t.ready);
    setDisplayGestoP1(t.waiting);
    setDisplayGestoP2(t.waiting);
  }, [t]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);




  useEffect(() => {
    resetGameMessages();
  }, [resetGameMessages]);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(items => {
      const v = items.filter(i => i.kind === "videoinput");
      setDevices(v);
      if (v.length > 0) setSelectedDevice(v[0].deviceId);
    });
  }, []);

  const evaluateWinner = async () => {
    const g1 = gesturesRef.current.p1;
    const g2 = gesturesRef.current.p2;
    setDisplayGestoP1(g1 === "WAITING" ? t.waiting : g1);
    setDisplayGestoP2(g2 === "WAITING" ? t.waiting : g2);

    if (g1 === "WAITING" || g2 === "WAITING") {
      setStatus(t.errorHands);
      return;
    }



    let result = "Tie";
    if (g1 !== g2) {
      if ((g1 === "ROCK" && g2 === "SCISSORS") || (g1 === "PAPER" && g2 === "ROCK") || (g1 === "SCISSORS" && g2 === "PAPER")) {
        result = p1Name;


      } else {
        result = p2Name;

      }
    }
    setStatus(result === "Tie" ? t.tie : `${result} ${t.wins}`);

    try {
      await fetch(`${API_URL}/record-game`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player1: p1Name, player2: p2Name, winner: result, p1_gesture: g1, p2_gesture: g2 }),


      });
      refreshData();
    } catch (err) { console.error(err); }
  };

  const startChallenge = () => {
    let count = 3;
    setCountdown(count);
    setStatus(t.getReady);
    const timer = setInterval(() => {
      count--;
      if (count > 0) setCountdown(count);
      else { clearInterval(timer); setCountdown(null); evaluateWinner(); }
    }, 1000);
  };

  useEffect(() => {
    if (!selectedDevice) return;
    const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
    hands.setOptions({ maxNumHands: 2, modelComplexity: 0, minDetectionConfidence: 0.6 });
    hands.onResults((results) => {
      if (!canvasRef.current) return;
      const ctx = canvasRef.current.getContext("2d");
      ctx.save();
      ctx.clearRect(0, 0, 1280, 720); ctx.translate(1280, 0); ctx.scale(-1, 1);
      ctx.drawImage(results.image, 0, 0, 1280, 720);
      if (results.multiHandLandmarks) {
        results.multiHandLandmarks.forEach((landmarks) => {
          draw.drawConnectors(ctx, landmarks, [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]], { color: '#00d8ff', lineWidth: 3 });
          const up = [8, 12, 16, 20].map(id => landmarks[id].y < landmarks[id - 2].y);
          const countF = up.filter(Boolean).length;
          let gesture = countF >= 4 ? "PAPER" : countF >= 2 ? "SCISSORS" : "ROCK";
          if (landmarks[0].x > 0.5) gesturesRef.current.p1 = gesture; else gesturesRef.current.p2 = gesture;
        });
      }
      ctx.restore();
    });
    cameraRef.current = new cam.Camera(videoRef.current, { onFrame: async () => { await hands.send({ image: videoRef.current }); }, width: 1280, height: 720 });
    cameraRef.current.start();
    return () => { if (cameraRef.current) cameraRef.current.stop(); };
  }, [selectedDevice]);

  return (
    <div className="app-container">
      <div className="main-card">
        <button className="gear-btn" onClick={() => setShowSettings(!showSettings)}>⚙️</button>
        {showSettings && (
          <div className="dropdown-settings">
            <div className="input-group">
              <label>{t.language}</label>
              <select
                className="input-style"
                value={langCode}
                onChange={(e) => {
                  setLangCode(e.target.value);
                  localStorage.setItem("rps_lang", e.target.value);
                }}
              >
                {Object.keys(languages).map((code) => (
                  <option key={code} value={code}>
                    {/* Aquí buscamos la propiedad lang_name. 
         Si por error un JSON no la tiene, mostramos el código en mayúsculas como respaldo.
      */}
                    {languages[code].lang_name || code.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label>{t.camera}</label>
              <select className="input-style" value={selectedDevice} onChange={(e) => setSelectedDevice(e.target.value)}>
                {devices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || t.camera}</option>)}
              </select>
            </div>
          </div>
        )}
        <div className="main-layout">
          <aside className="sidebar">
            <div className="glass-panel" style={{ height: '40%' }}>
              <h3 className="lb-title">🏆 {t.leaderboard}</h3>
              <div className="scroll-area">
                <table className="lb-table">
                  <tbody>
                    {leaderboard.map((user, i) => (
                      <tr key={i}><td><span className="rank-badge">#{i + 1}</span>{user.name}</td><td align="right">{user.score} {t.points}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="glass-panel" style={{ flex: 1 }}>
              <h3 className="lb-title">🕒 {t.lastMatches}</h3>
              <div className="scroll-area">
                {history.length === 0 ? <p style={{ color: '#555', fontSize: '0.8rem', textAlign: 'center' }}>{t.noMatches}</p> :
                  history.map((match, i) => (
                    <div key={i} className="history-card">
                      <div style={{ fontSize: '0.75rem' }}><strong>{match.player1}</strong> vs <strong>{match.player2}</strong></div>
                      <span className="winner-tag">{match.winner === "Tie" ? `🤝 ${t.tie}` : `🏆 ${t.winner}: ${match.winner}`}</span>
                    </div>
                  ))}
              </div>
            </div>
          </aside>
          <main className="game-area">
            <div className="player-inputs">
              <div className="input-group"><label>{t.player1}</label><input className="input-style" value={p1Name} onChange={e => setP1Name(e.target.value)} /></div>
              <div className="input-group"><label>{t.player2}</label><input className="input-style" value={p2Name} onChange={e => setP2Name(e.target.value)} /></div>
            </div>
            <div className="viewport">
              <video ref={videoRef} style={{ display: 'none' }} muted playsInline />
              <canvas ref={canvasRef} width="1280" height="720" className="canvas-stream" />
              {countdown && <div className="countdown-overlay">{countdown}</div>}
              <div className="player-badge left-badge"><small>{p1Name}</small><div className="gesture-display">{displayGestoP1}</div></div>
              <div className="player-badge right-badge"><small>{p2Name}</small><div className="gesture-display">{displayGestoP2}</div></div>
            </div>
            <div className="footer-status">
              <h2 className="status-msg">{status}</h2>
              <button onClick={startChallenge} disabled={countdown !== null} className="shoot-btn">{countdown ? t.prepare : t.shoot}</button>
            </div>
          </main>
        </div>
      </div>


















    </div>
  );
}