import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";
const SALT_ROUNDS = 12;
export async function register(req, res) {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            res
                .status(400)
                .json({ message: "Name, email and password are required" });
            return;
        }
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            res.status(409).json({ message: "Email already registered" });
            return;
        }
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const user = await prisma.user.create({
            data: { name, email, password: hashedPassword },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                membershipStatus: true,
                createdAt: true,
            },
        });
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
        res.status(201).json({ user, token });
    }
    catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function login(req, res) {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ message: "Email and password are required" });
            return;
        }
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            res.status(401).json({ message: "Invalid credentials" });
            return;
        }
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            res.status(401).json({ message: "Invalid credentials" });
            return;
        }
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                membershipStatus: user.membershipStatus,
                createdAt: user.createdAt,
            },
            token,
        });
    }
    catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function getMe(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ message: "Not authenticated" });
            return;
        }
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                membershipStatus: true,
                createdAt: true,
            },
        });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        res.json(user);
    }
    catch (error) {
        console.error("GetMe error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
// Admin: list all users
export async function listUsers(req, res) {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;
        const [users, total] = await Promise.all([
            prisma.user.findMany({
                skip,
                take: limit,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    membershipStatus: true,
                    createdAt: true,
                },
                orderBy: { createdAt: "desc" },
            }),
            prisma.user.count(),
        ]);
        res.json({ users, total, page, totalPages: Math.ceil(total / limit) });
    }
    catch (error) {
        console.error("ListUsers error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
// Admin: update user role
export async function updateUserRole(req, res) {
    try {
        const { id } = req.params;
        const { role, membershipStatus } = req.body;
        const data = {};
        if (role)
            data.role = role;
        if (membershipStatus)
            data.membershipStatus = membershipStatus;
        const user = await prisma.user.update({
            where: { id },
            data,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                membershipStatus: true,
                createdAt: true,
            },
        });
        res.json(user);
    }
    catch (error) {
        console.error("UpdateUserRole error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
// Admin: delete user
export async function deleteUser(req, res) {
    try {
        const { id } = req.params;
        await prisma.user.delete({ where: { id } });
        res.json({ message: "User deleted" });
    }
    catch (error) {
        console.error("DeleteUser error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
