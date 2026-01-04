import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Hands } from "@mediapipe/hands";
import * as draw from "@mediapipe/drawing_utils";

// Dirección de localhost desde .env
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function useGameLogic(languages, langCode) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const gesturesRef = useRef({ p1: "WAITING", p2: "WAITING" });
  const requestRef = useRef(null);

  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState("");
  const [countdown, setCountdown] = useState(null);
  const [p1Name, setP1Name] = useState("Ivan");
  const [p2Name, setP2Name] = useState("Antonio");
  const [displayGestoP1, setDisplayGestoP1] = useState("");
  const [displayGestoP2, setDisplayGestoP2] = useState("");

  const t = useMemo(() => languages[langCode] || {}, [languages, langCode]);

  const refreshData = useCallback(async () => {
    try {
      const [lbRes, histRes] = await Promise.all([
        fetch(`${API_URL}/leaderboard`),
        fetch(`${API_URL}/history`)
      ]);
      if (lbRes.ok) setLeaderboard(await lbRes.json());
      if (histRes.ok) setHistory(await histRes.json());
    } catch (error) { console.error(error); }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(t => t.stop());
        const items = await navigator.mediaDevices.enumerateDevices();
        const v = items.filter(i => i.kind === "videoinput");
        setDevices(v);
        if (v.length > 0) setSelectedDevice(v[0].deviceId);
      } catch (e) { console.error(e); }
    };
    init();
  }, []);

  useEffect(() => {
    if (!selectedDevice || !videoRef.current) return;

    // CAPTURA LOCAL DE REFS (Solución al error de ESLINT)
    const currentVideo = videoRef.current; 
    let activeStream = null;
    let isMounted = true;

    const hands = new Hands({ 
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` 
    });
    
    hands.setOptions({ maxNumHands: 2, modelComplexity: 0, minDetectionConfidence: 0.6 });

    hands.onResults((results) => {
      if (!canvasRef.current || !isMounted) return;
      const ctx = canvasRef.current.getContext("2d");
      ctx.save();
      ctx.clearRect(0, 0, 1280, 720);
      ctx.translate(1280, 0);
      ctx.scale(-1, 1);
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

    const startVideo = async () => {
      try {
        activeStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: selectedDevice }, width: 1280, height: 720 }
        });
        
        // Usamos la variable local currentVideo en lugar de videoRef.current
        if (currentVideo && isMounted) {
          currentVideo.srcObject = activeStream;
          await currentVideo.play();
          
          const processFrame = async () => {
            if (currentVideo && currentVideo.readyState >= 2 && isMounted) {
              await hands.send({ image: currentVideo });
            }
            requestRef.current = requestAnimationFrame(processFrame);
          };
          processFrame();
        }
      } catch (err) {
        console.error("Error al iniciar stream:", err);
      }
    };

    startVideo();

    return () => {
      isMounted = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
      // Usamos la variable local para limpiar de forma segura
      if (currentVideo) {
        currentVideo.pause();
        currentVideo.srcObject = null;
      }
    };
  }, [selectedDevice]);

  const evaluateWinner = async () => {
    const g1 = gesturesRef.current.p1;
    const g2 = gesturesRef.current.p2;
    setDisplayGestoP1(g1 === "WAITING" ? t.waiting : g1);
    setDisplayGestoP2(g2 === "WAITING" ? t.waiting : g2);
    if (g1 === "WAITING" || g2 === "WAITING") { setStatus(t.errorHands); return; }
    let result = "Tie";
    if (g1 !== g2) {
      if ((g1 === "ROCK" && g2 === "SCISSORS") || (g1 === "PAPER" && g2 === "ROCK") || (g1 === "SCISSORS" && g2 === "PAPER")) result = p1Name;
      else result = p2Name;
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

  // RETORNO: Los refs se pasan sin acceder a .current
  return {
    videoRef, canvasRef, devices, selectedDevice, setSelectedDevice,
    leaderboard, history, status, setStatus, countdown, t,
    p1Name, setP1Name, p2Name, setP2Name,
    displayGestoP1, displayGestoP2, startChallenge, refreshData
  };
}