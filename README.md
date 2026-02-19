# Rock Paper Scissors AI

This is a modern Rock Paper Scissors game that utilizes computer vision for hand gesture recognition. It detects players' moves (Rock, Paper, or Scissors) using a webcam and determines the winner in real-time.

## 🚀 Live Demo

The application is deployed and available at:
**[https://rps-game-client.onrender.com/](https://rps-game-client.onrender.com/)**

## 🛠️ Tech Stack

### Frontend
- **React** (v19) with **Vite**
- **TailwindCSS** for styling
- **MediaPipe** (@mediapipe/hands) for hand gesture recognition and tracking
- **Framer Motion** for animations (implied from previous context)

### Backend
- **FastAPI** (Python)
- **SQLAlchemy** for ORM
- **SQLite** for database (rps_game.db)

### DevOps
- **Docker** & **Docker Compose** for containerization

## 📦 Installation & Running Locally

You can run the project using Docker Compose or by starting the services individually.

### Option 1: Using Docker Compose (Recommended)

1. Ensure you have Docker and Docker Compose installed.
2. Clone the repository and navigate to the root directory.
3. Run the following command:

```bash
docker-compose up --build
```

The services will be available at:
- Frontend: `http://localhost:80`
- Backend: `http://localhost:8000`

### Option 2: Manual Setup

#### Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   # Windows
   .\venv\Scripts\activate
   # Linux/Mac
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the server:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

#### Frontend

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## 🎮 How to Play

1. Allow camera access when prompted.
2. The game will detect your hand gestures.
3. Make a "Rock", "Paper", or "Scissors" gesture in front of the camera.
4. The AI (or second player logic) will compete against you.
5. Check the leaderboard to see top scores!
