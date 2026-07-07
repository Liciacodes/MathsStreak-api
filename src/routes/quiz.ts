import { Router } from "express";
import { getStreakHistory, getTodayQuiz, submitAnswer } from "../controllers/quizController";
import { requireAuth } from "../middleware/authMiddleware";


const router = Router()


router.get('/today', requireAuth, getTodayQuiz)
router.post('/submit', requireAuth, submitAnswer)
router.get('/streak', requireAuth, getStreakHistory)

export default router