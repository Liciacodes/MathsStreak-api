import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from './routes/auth'
import quizRoutes from './routes/quiz'

dotenv.config();

const app = express();

app.use(cors({
  origin: [
     "http://localhost:5173",
    "https://quiz-streak.vercel.app"
  ],
  credentials: true,
}));
app.use(express.json());

app.use('/auth', authRoutes)
app.use('/quiz', quizRoutes )

app.get("/", (req, res) => {
  res.json({ message: "QuizStreak Api is running" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});