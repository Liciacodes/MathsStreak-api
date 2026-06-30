import { Response } from "express";
import prisma from "../prisma";
import { generateDailyQuestion } from "../services/aiServices";
import { AuthRequest } from "../middleware/authMiddleware";


const getTodayDateOnly = (): Date => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  };

export const getTodayQuiz = async (req: AuthRequest, res:Response) => {
    try {
        const userId = req.userId as string;
        const today = getTodayDateOnly();
        
         // 1. Has this user already attempted today's question?
        const existingAttempt = await prisma.dailyAttempt.findUnique({
            where: {
                userId_date: {
                    userId,
                    date: today
                }
            },
            include: {question: true},
        })

        if (existingAttempt) {
            const streak = await calculateStreak(userId)
            return res.json({
                alreadyAnswered: true,
                question: existingAttempt.question.text,
                correctAnswer: existingAttempt.question.correctAnswer,
                isCorrect: existingAttempt.isCorrect,
                streak
            })
        }
        // 2. Does today's question exist yet? (on-demand generation)
        let question = await prisma.question.findUnique({
            where: { date: today}
        })

        if (!question) {
            const generated = await generateDailyQuestion()
            question = await prisma.question.create({
                data: {
                    text: generated.question,
                    correctAnswer: generated.answer,
                    date: today,
                }
            })
        }

        // 3. Return the question WITHOUT the answer
        return res.json({
            alreadyAnswered: false,
            question: question.text,
            questionId: question.id
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Something went wrong'})
    }
}


export const submitAnswer = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId as string;
        const {answer} = req.body;
        const today = getTodayDateOnly();

        if(!answer) {
            return res.status(400).json({error: 'Answer is required'})
        }

        const existingAttempt = await prisma.dailyAttempt.findUnique({
            where: {
                userId_date: {userId, date: today},
            }
        })

        if (existingAttempt) {
            return res.status(409).json({ error: "You already answered today's question"})

        }

        const question = await prisma.question.findUnique({ where: {date: today}})

        if (!question) {
            return res.status(404).json({
                error: "Today's question hasnt been generated"
            })
        }
const normalizedSubmitted = answer.trim().toLowerCase();
const normalizedCorrect = question.correctAnswer.trim().toLowerCase();

const submittedNum = parseFloat(normalizedSubmitted);
const correctNum = parseFloat(normalizedCorrect);

const isCorrect =
  !isNaN(submittedNum) && !isNaN(correctNum)
    ? submittedNum === correctNum
    : normalizedSubmitted === normalizedCorrect;


        await prisma.dailyAttempt.create({
            data: {
                userId,
                questionId: question.id,
                date: today,
                submittedAnswer: answer,
                isCorrect
            }
        })

        const streak = await calculateStreak(userId)

        return res.json({
            isCorrect,
            correctAnswer: question.correctAnswer,
            streak
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({error: 'Something went wrong'})
    }
}

const calculateStreak = async (userId: string): Promise<number> => {
    const attempts = await prisma.dailyAttempt.findMany({
        where: {userId},
        orderBy: { date: 'desc'}
    })

    let streak = 0;
    let expectedDate = getTodayDateOnly();

    for (const attempt of attempts) {
        const attemptDate = new Date(attempt.date)
    
        if (attemptDate.getTime() !== expectedDate.getTime()) break;
        if (!attempt.isCorrect) break;
        streak++;
        expectedDate.setDate(expectedDate.getDate() - 1)
    }
return streak;


}