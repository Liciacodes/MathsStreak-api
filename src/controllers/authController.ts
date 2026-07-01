import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../prisma";

const JWT_SECRET = process.env.JWT_SECRET as string

export const register = async (req: Request, res: Response) => {
    try {
        const {email, password} = req.body;

       const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  return res.status(400).json({ error: "Please enter a valid email address" });
}

if (password.length < 6) {
  return res.status(400).json({ error: "Password must be at least 6 characters" });
}

        const existingUser = await prisma.user.findUnique({ where: {email}})
        if (existingUser) {
            return res.status(409).json({error: 'User already exists'});
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {email, passwordHash: hashedPassword}
        })

        const token = jwt.sign({userId: user.id}, JWT_SECRET, {expiresIn: '7d'})
        res.status(201).json({token, user: {id: user.id, email:user.email}})
    } catch (error) {
        console.error(error);
        res.status(500).json({error: 'Something went wrong'})
    }
}


export const login = async (req: Request, res: Response) => {
    try {
        const {email, password} = req.body;

        if (!email || !password) {
            return res.status(400).json({error: 'Email and password are required'});
        }

const user = await prisma.user.findUnique({ where: {email}})
if (!user) {
    return res.status(401).json({error: 'Invalid Credentials'})

}

const passwordValid = await bcrypt.compare(password, user.passwordHash);
if (!passwordValid ) {
    return res.status(401).json({error: 'Invalid credentials'})
}

const token = jwt.sign({userId:user.id }, JWT_SECRET, {expiresIn: '7d'})

res.json({token, user: {id: user.id, email: user.email}})
       
    } catch (error) {
        console.error(error) 
        res.status(500).json({error: 'Something went wrong'})
    }
}