import { Response } from "express";
import prisma from "../prisma";
import { generateDailyQuestion } from "../services/aiServices";
import { AuthRequest } from "../middleware/authMiddleware";

const getTodayDateOnly = (): Date => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

const shuffleArray = <T>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};

const resetFreezeIfNewWeek = async (userId: string): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastFreezeReset: true, freezesAvailable: true },
  });

  if (!user) return;

  const now = getTodayDateOnly();
  const dayOfWeek = now.getUTCDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisMonday = new Date(now);
  thisMonday.setUTCDate(now.getUTCDate() - daysSinceMonday);

  const lastReset = user.lastFreezeReset ? new Date(user.lastFreezeReset) : null;
  const alreadyResetThisWeek = lastReset && lastReset.getTime() >= thisMonday.getTime();

  if (!alreadyResetThisWeek) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        freezesAvailable: 1,
        lastFreezeReset: now,
      },
    });
  }
};

const calculateStreak = async (userId: string): Promise<{ streak: number; freezeUsed: boolean }> => {
  await resetFreezeIfNewWeek(userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { freezesAvailable: true },
  });

  const attempts = await prisma.dailyAttempt.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });

  let streak = 0;
  let freezeUsed = false;
  let expectedDate = getTodayDateOnly();
  let freezesLeft = user?.freezesAvailable ?? 0;

  for (const attempt of attempts) {
    const attemptDate = new Date(attempt.date);

    if (attemptDate.getTime() !== expectedDate.getTime()) {
      if (freezesLeft > 0) {
        freezesLeft--;
        freezeUsed = true;
        await prisma.user.update({
          where: { id: userId },
          data: { freezesAvailable: freezesLeft },
        });
        expectedDate.setUTCDate(expectedDate.getUTCDate() - 1);
        if (attemptDate.getTime() !== expectedDate.getTime()) break;
      } else {
        break;
      }
    }

    if (!attempt.isCorrect) break;

    streak++;
    expectedDate.setUTCDate(expectedDate.getUTCDate() - 1);
  }

  return { streak, freezeUsed };
};

export const getTodayQuiz = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId as string;
    const today = getTodayDateOnly();

    const existingAttempt = await prisma.dailyAttempt.findUnique({
      where: {
        userId_date: { userId, date: today },
      },
      include: { question: true },
    });

    if (existingAttempt) {
      const { streak, freezeUsed } = await calculateStreak(userId);
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { freezesAvailable: true },
      });
      return res.json({
        alreadyAnswered: true,
        question: existingAttempt.question.text,
        correctAnswer: existingAttempt.question.correctAnswer,
        options: existingAttempt.question.options,
        isCorrect: existingAttempt.isCorrect,
        streak,
        freezeUsed,
        freezesAvailable: user?.freezesAvailable ?? 0,
      });
    }

    let question = await prisma.question.findUnique({
      where: { date: today },
    });

    if (!question) {
      const generated = await generateDailyQuestion();
      question = await prisma.question.create({
        data: {
          text: generated.question,
          correctAnswer: generated.answer,
          options: shuffleArray(generated.options),
          date: today,
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { freezesAvailable: true },
    });

    return res.json({
      alreadyAnswered: false,
      question: question.text,
      questionId: question.id,
      options: shuffleArray(question.options),
      freezesAvailable: user?.freezesAvailable ?? 0,
    });
  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
  }
};

export const submitAnswer = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId as string;
    const { answer } = req.body;
    const today = getTodayDateOnly();

    if (!answer) {
      return res.status(400).json({ error: "Answer is required" });
    }

    const existingAttempt = await prisma.dailyAttempt.findUnique({
      where: {
        userId_date: { userId, date: today },
      },
    });

    if (existingAttempt) {
      return res.status(409).json({ error: "You already answered today's question" });
    }

    const question = await prisma.question.findUnique({ where: { date: today } });

    if (!question) {
      return res.status(404).json({ error: "Today's question hasn't been generated" });
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
        isCorrect,
      },
    });

    const { streak, freezeUsed } = await calculateStreak(userId);

    return res.json({
      isCorrect,
      correctAnswer: question.correctAnswer,
      streak,
      freezeUsed,
    });
  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
  }
};

export const getStreakHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId as string;
    const history = await prisma.dailyAttempt.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      select: {
        id: true,
        date: true,
        isCorrect: true,
      },
    });
    return res.json({ history });
  } catch (error) {
    res.status(500).json({ error: "Something went wrong fetching history" });
  }
};

export const getLeaderboard = async (req: AuthRequest, res: Response) => {
  try {
    const sevenDaysAgo = getTodayDateOnly();
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);

    const weeklyStandings = await prisma.dailyAttempt.groupBy({
      by: ["userId"],
      where: {
        isCorrect: true,
        date: { gte: sevenDaysAgo },
      },
      _count: { isCorrect: true },
      orderBy: { _count: { isCorrect: "desc" } },
      take: 10,
    });

    const leaderboard = await Promise.all(
      weeklyStandings.map(async (item, index) => {
        const user = await prisma.user.findUnique({
          where: { id: item.userId },
          select: { email: true },
        });
        return {
          rank: index + 1,
          email: user?.email || "Anonymous User",
          score: item._count.isCorrect ?? 0,
        };
      })
    );
    return res.json({ leaderboard });
  } catch (error) {
    res.status(500).json({ error: "Something went wrong fetching leaderboard" });
  }
};