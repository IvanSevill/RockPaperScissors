import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import './App.css';

// Variable de entorno para el backend (Render o Localhost)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function App() {
  const videoRef = useRef(null);
  const handsRef = useRef(null);
  const cameraRef = useRef(null);

  const [playerGesture, setPlayerGesture] = useState('None');
  const [status, setStatus] = useState('Initializing...');
  const [leaderboard, setLeaderboard] = useState([]);
  const [playerName, setPlayerName] = useState('Ivan');

  // 1. Memorizamos la función para evitar re-renders innecesarios
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

  // 2. SOLUCIÓN AL ERROR: Llamada asíncrona controlada
  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      await fetchLeaderboard();
      // Solo actualizamos si el componente sigue montado
      if (!isMounted) return;
    };

    loadInitialData();

    return () => { isMounted = false; };
  }, [fetchLeaderboard]);

  // 3. Efecto para MediaPipe y Cámara
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

        // Lógica de detección: Piedra, Papel, Tijera
        const isIndexUp = landmarks[8].y < landmarks[6].y;
        const isMiddleUp = landmarks[12].y < landmarks[10].y;
        const isRingUp = landmarks[16].y < landmarks[14].y;

        let gesture = "Rock";
        if (isIndexUp && isMiddleUp && isRingUp) gesture = "Paper";
        else if (isIndexUp && isMiddleUp) gesture = "Scissors";

        setPlayerGesture((prev) => (prev !== gesture ? gesture : prev));
        setStatus((prev) => (prev !== "Hand Detected" ? "Hand Detected" : prev));
      } else {
        setPlayerGesture((prev) => (prev !== "None" ? "None" : prev));
        setStatus((prev) => (prev !== "Show your hand" ? "Show your hand" : prev));
      }
    });

    if (videoRef.current) {
      cameraRef.current = new Camera(videoRef.current, {
        onFrame: async () => {
          if (handsRef.current) {
            await handsRef.current.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480,
      });

      cameraRef.current.start()
        .then(() => setStatus("Camera Active"))
        .catch(() => setStatus("Error: Camera access denied"));
    }

    handsRef.current = hands;

    return () => {
      if (cameraRef.current) cameraRef.current.stop();
      if (handsRef.current) handsRef.current.close();
    };
  }, []);

  const updateScore = async (points) => {
    try {
      const response = await fetch(`${API_URL}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: playerName, points: points }),
      });
      if (response.ok) fetchLeaderboard();
    } catch (error) {
      console.error("Error updating score:", error);
    }
  };

  return (
    <div className="app-container">
      <div className="glass-card">
        <header>
          <h1>RPS AI</h1>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
        </header>
        <div className="main-content">
          <div className="video-area">
            <video ref={videoRef} playsInline muted autoPlay style={{ display: 'none' }} />
            <div className="display-zone">
              <div className="gesture-text">{playerGesture}</div>
            </div>
            <p className="status-label">{status}</p>
          </div>
          <aside className="ranking">
            <h3>Leaderboard</h3>
            {leaderboard.map((u, i) => (
              <div key={i} className="row">{u.name}: {u.points}</div>
            ))}
          </aside>
        </div>
        <button className="btn-action" onClick={() => updateScore(2)}>SHOOT!</button>
      </div>
    </div>
  );
}

export default App;