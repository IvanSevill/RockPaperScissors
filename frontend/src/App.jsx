import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import './App.css';

// Variable de entorno para la direccion del backend conforme a las instrucciones guardadas
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function App() {
  const videoRef = useRef(null);
  const handsRef = useRef(null);
  const cameraRef = useRef(null);

  const [playerGesture, setPlayerGesture] = useState('None');
  const [status, setStatus] = useState('Ready for duel');
  const [leaderboard, setLeaderboard] = useState([]);
  const [playerName, setPlayerName] = useState('Ivan');

  // 1. Funcion para obtener el ranking (memorizada para evitar renders infinitos)
  const fetchLeaderboard = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/leaderboard`);
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data);
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    }
  }, []);

  // 2. Carga inicial de datos asincrona para cumplir con las reglas de React
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      await fetchLeaderboard();
      if (!isMounted) return;
    };
    loadData();
    return () => { isMounted = false; };
  }, [fetchLeaderboard]);

  // 3. Inicializacion de MediaPipe y flujo de video
  useEffect(() => {
    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    hands.onResults((results) => {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        const isIndexUp = landmarks[8].y < landmarks[6].y;
        const isMiddleUp = landmarks[12].y < landmarks[10].y;
        const isRingUp = landmarks[16].y < landmarks[14].y;

        let gesture = "Rock";
        if (isIndexUp && isMiddleUp && isRingUp) gesture = "Paper";
        else if (isIndexUp && isMiddleUp) gesture = "Scissors";

        setPlayerGesture(gesture);
      } else {
        setPlayerGesture('None');
      }
    });

    if (videoRef.current) {
      cameraRef.current = new Camera(videoRef.current, {
        onFrame: async () => {
          if (handsRef.current) {
            await handsRef.current.send({ image: videoRef.current });
          }
        },
        width: 1280,
        height: 720,
      });

      cameraRef.current.start()
        .then(() => setStatus("Camera Active"))
        .catch((err) => {
          console.error(err);
          setStatus("Camera Error: Access Denied");
        });
    }

    handsRef.current = hands;

    return () => {
      if (cameraRef.current) cameraRef.current.stop();
      if (handsRef.current) handsRef.current.close();
    };
  }, []);

  // 4. Enviar puntuacion al backend
  const updateScore = async () => {
    try {
      const response = await fetch(`${API_URL}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: playerName, points: 2 }),
      });
      if (response.ok) {
        fetchLeaderboard();
      }
    } catch (error) {
      console.error("Error saving score:", error);
    }
  };

  return (
    <div className="app-container">
      <aside className="leaderboard-panel glass">
        <h2>LEADERBOARD</h2>
        <div className="leaderboard-list">
          {leaderboard.map((entry, index) => (
            <div key={index} className="leaderboard-item">
              <span>{entry.name}</span>
              <span>{entry.points}</span>
            </div>
          ))}
        </div>
      </aside>

      <main className="main-game">
        <div className="players-header">
          <div className="player-box">
            <label>PLAYER 1</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
          </div>
          <div className="player-box">
            <label>PLAYER 2</label>
            <input type="text" value="Antonio" readOnly />
          </div>
        </div>

        <div className="video-wrapper">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="hidden-video"
          />
          <div className="gesture-display-main">{playerGesture}</div>

          <div className="status-overlay-bottom">
            <div className="player-status-card">
              <span className="name-tag">{playerName}</span>
              <span className="status-tag">WAITING</span>
            </div>
            <div className="player-status-card">
              <span className="name-tag">Antonio</span>
              <span className="status-tag">WAITING</span>
            </div>
          </div>
        </div>

        <p className="game-status-text">{status}</p>

        <button className="shoot-btn-main" onClick={updateScore}>
          SHOOT
        </button>
      </main>
    </div>
  );
}

export default App;