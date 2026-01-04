from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from database import Base 

class GameResult(Base):
    __tablename__ = "results"
    id = Column(Integer, primary_key=True, index=True)
    player1 = Column(String)
    player2 = Column(String)
    winner = Column(String)
    p1_gesture = Column(String)
    p2_gesture = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)