from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List
import models
import database

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GameCreate(BaseModel):
    player1: str
    player2: str
    winner: str
    p1_gesture: str
    p2_gesture: str

class LeaderboardEntry(BaseModel):
    name: str
    score: int

@app.post("/record-game")
def record_game(game: GameCreate, db: Session = Depends(database.get_db)):
    try:
        db_game = models.GameResult(
            player1=game.player1,
            player2=game.player2,
            winner=game.winner,
            p1_gesture=game.p1_gesture,
            p2_gesture=game.p2_gesture
        )
        db.add(db_game)
        db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        print(f"Error guardando partida: {e}")
        raise HTTPException(status_code=500, detail="Error interno al guardar")

@app.get("/leaderboard", response_model=List[LeaderboardEntry])
def get_leaderboard(db: Session = Depends(database.get_db)):
    try:
        scores = {}
        # Consultamos todos los resultados para calcular puntos
        games = db.query(models.GameResult).all()
        
        for g in games:
            # Inicializar nombres en el diccionario si no existen
            if g.player1 not in scores: scores[g.player1] = 0
            if g.player2 not in scores: scores[g.player2] = 0
            
            if g.winner == "Tie":
                scores[g.player1] += 1
                scores[g.player2] += 1
            elif g.winner in scores:
                scores[g.winner] += 2
                
        # Formatear, ordenar y limitar a Top 10
        result = [{"name": k, "score": v} for k, v in scores.items()]
        result.sort(key=lambda x: x["score"], reverse=True)
        return result[:10]
    except Exception as e:
        print(f"Error en leaderboard: {e}")
        return []

@app.get("/history")
def get_history(db: Session = Depends(database.get_db)):
    # Limitado a las últimas 25 partidas
    return db.query(models.GameResult).order_by(models.GameResult.id.desc()).limit(25).all()