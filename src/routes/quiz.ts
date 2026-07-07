import { Router } from "express";
import { getLeaderboard, getStreakHistory, getTodayQuiz, submitAnswer } from "../controllers/quizController";
import { requireAuth } from "../middleware/authMiddleware";


const router = Router()


router.get('/today', requireAuth, getTodayQuiz)
router.post('/submit', requireAuth, submitAnswer)
router.get('/history', requireAuth, getStreakHistory)

router.get('/leaderboard', requireAuth, getLeaderboard)

export default router