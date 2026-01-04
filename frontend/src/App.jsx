import React, { useState, useEffect } from "react";
import { useGameLogic } from "./hooks/useGameLogic";
import "./App.css";

const localeFiles = import.meta.glob("./locales/*.json", { eager: true });
const languages = {};
Object.entries(localeFiles).forEach(([path, content]) => {
  const langCode = path.split("/").pop().replace(".json", "");
  languages[langCode] = content.default || content;
});

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [langCode, setLangCode] = useState(() => {
    const saved = localStorage.getItem("rps_lang");
    return languages[saved] ? saved : Object.keys(languages)[0] || "es";
  });

  const {
    videoRef,
    canvasRef,
    devices,
    selectedDevice,
    setSelectedDevice,
    leaderboard,
    history,
    status,
    setStatus,
    countdown,
    t,
    p1Name,
    setP1Name,
    p2Name,
    setP2Name,
    displayGestoP1,
    displayGestoP2,
    startChallenge,
    refreshData
  } = useGameLogic(languages, langCode);

  useEffect(() => {
    refreshData();
    if (t.ready) setStatus(t.ready);
  }, [refreshData, t.ready, setStatus]);

  return (
    <div className="app-container">
      <div className="main-card">
        <button className="gear-btn" onClick={() => setShowSettings(!showSettings)}>⚙️</button>
        
        {showSettings && (
          <div className="dropdown-settings">
            <div className="input-group">
              <label>{t.language}</label>
              <select className="input-style" value={langCode} onChange={(e) => {
                setLangCode(e.target.value);
                localStorage.setItem("rps_lang", e.target.value);
              }}>
                {Object.keys(languages).map((code) => (
                  <option key={code} value={code}>{languages[code].lang_name || code.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label>{t.camera}</label>
              <select className="input-style" value={selectedDevice} onChange={(e) => setSelectedDevice(e.target.value)}>
                {devices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || `Cámara ${d.deviceId.slice(0,5)}`}</option>)}
              </select>
            </div>
          </div>
        )}

        <div className="main-layout">
          {/* BARRA LATERAL (Clasificación e Historial) */}
          <aside className="sidebar">
            <div className="glass-panel" style={{ height: '40%' }}>
              <h3 className="lb-title">🏆 {t.leaderboard}</h3>
              <div className="scroll-area">
                <table className="lb-table">
                  <tbody>
                    {leaderboard.map((user, i) => (
                      <tr key={i}>
                        <td><span className="rank-badge">#{i + 1}</span>{user.name}</td>
                        <td align="right">{user.score} {t.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="glass-panel" style={{ flex: 1 }}>
              <h3 className="lb-title">🕒 {t.lastMatches}</h3>
              <div className="scroll-area">
                {history.length === 0 ? (
                  <p style={{ color: '#555', fontSize: '0.8rem', textAlign: 'center' }}>{t.noMatches}</p>
                ) : (
                  history.map((match, i) => (
                    <div key={i} className="history-card">
                      <div style={{ fontSize: '0.75rem' }}>
                        <strong>{match.player1}</strong> vs <strong>{match.player2}</strong>
                      </div>
                      <span className="winner-tag">
                        {match.winner === "Tie" ? `🤝 ${t.tie}` : `🏆 ${t.winner}: ${match.winner}`}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>

          {/* AREA PRINCIPAL DE JUEGO */}
          <main className="game-area">
            <div className="player-inputs">
              <div className="input-group">
                <label>{t.player1}</label>
                <input className="input-style" value={p1Name} onChange={e => setP1Name(e.target.value)} />
              </div>
              <div className="input-group">
                <label>{t.player2}</label>
                <input className="input-style" value={p2Name} onChange={e => setP2Name(e.target.value)} />
              </div>
            </div>

            <div className="viewport">
              <video ref={videoRef} style={{ display: 'none' }} muted playsInline />
              <canvas ref={canvasRef} width="1280" height="720" className="canvas-stream" />
              
              {countdown && <div className="countdown-overlay">{countdown}</div>}
              
              <div className="player-badge left-badge">
                <small>{p1Name}</small>
                <div className="gesture-display">{displayGestoP1}</div>
              </div>
              
              <div className="player-badge right-badge">
                <small>{p2Name}</small>
                <div className="gesture-display">{displayGestoP2}</div>
              </div>
            </div>

            <div className="footer-status">
              <h2 className="status-msg">{status}</h2>
              <button onClick={startChallenge} disabled={countdown !== null} className="shoot-btn">
                {countdown ? t.prepare : t.shoot}
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}