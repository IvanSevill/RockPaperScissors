import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import './App.css';

// Usamos la variable de entorno que configuraste en Render
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [playerGesture, setPlayerGesture] = useState('None');
  const [status, setStatus] = useState('Waiting for camera...');
  const [leaderboard, setLeaderboard] = useState([]);
  const [playerName, setPlayerName] = useState('Player 1');

  // Función para obtener el ranking del backend
  const fetchLeaderboard = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/leaderboard`);
      const data = await response.json();
      setLeaderboard(data);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    }
  }, []);

  // Función para enviar puntuación
  const updateScore = async (points) => {
    try {
      await fetch(`${API_URL}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: playerName, points: points }),
      });
      fetchLeaderboard();
    } catch (error) {
      console.error("Error updating score:", error);
    }
  }, [playerName, fetchLeaderboard]);

  useEffect(() => {
    fetchLeaderboard();

    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults((results) => {
      // Lógica simplificada de detección de gestos
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        setStatus("Hand Detected!");
        // Aquí iría tu lógica de contar dedos para Rock/Paper/Scissors
        // Ejemplo simple: setPlayerGesture("Rock");
      } else {
        setStatus("Show your hand to the camera");
        setPlayerGesture("None");
      }
    });

    if (videoRef.current) {
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          await hands.send({ image: videoRef.current });
        },
        width: 640,
        height: 480,
      });

      camera.start()
        .then(() => setStatus("Camera Active"))
        .catch((err) => setStatus("Camera Error: Please allow access"));
    }
  }, [fetchLeaderboard]);

  return (
    <div className="app-container">
      <header className="glass-header">
        <h1>AI Rock Paper Scissors</h1>
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Enter Name"
        />
      </header>

      <main className="game-area">
        <div className="video-wrapper">
          <video ref={videoRef} playsInline muted autoPlay style={{ display: 'none' }} />
          <canvas ref={canvasRef} className="game-canvas" />
          <div className="gesture-badge">{playerGesture}</div>
          <div className="status-indicator">{status}</div>
        </div>

        <aside className="leaderboard-panel glass">
          <h2>Top Players</h2>
          <ul>
            {leaderboard.map((entry, index) => (
              <li key={index}>
                <span>{entry.name}</span>
                <span>{entry.points} pts</span>
              </li>
            ))}
          </ul>
        </aside>
      </main>

      <footer className="controls">
        <button className="shoot-btn" onClick={() => updateScore(2)}>
          SHOOT!
        </button>
      </footer>
    </div>
  );
}

export default App;