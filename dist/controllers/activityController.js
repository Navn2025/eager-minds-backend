import prisma from "../lib/prisma.js";
import { uploadFileToCloud } from "../middleware/upload.js";
export async function getActivities(req, res) {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const [activities, total] = await Promise.all([
            prisma.activity.findMany({
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: "desc" },
            }),
            prisma.activity.count(),
        ]);
        res.json({ activities, total, page, totalPages: Math.ceil(total / limit) });
    }
    catch (error) {
        console.error("GetActivities error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function getActivity(req, res) {
    try {
        const activity = await prisma.activity.findUnique({
            where: { id: req.params.id },
        });
        if (!activity) {
            res.status(404).json({ message: "Activity not found" });
            return;
        }
        res.json(activity);
    }
    catch (error) {
        console.error("GetActivity error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function createActivity(req, res) {
    try {
        const { title, description, instructions } = req.body;
        const file = req.file;
        let imageUrl = null;
        if (file) {
            const result = await uploadFileToCloud(file, "eager-minds/activities");
            imageUrl = result.secure_url;
        }
        const activity = await prisma.activity.create({
            data: {
                title,
                description,
                instructions,
                image: imageUrl,
            },
        });
        res.status(201).json(activity);
    }
    catch (error) {
        console.error("CreateActivity error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function updateActivity(req, res) {
    try {
        const { title, description, instructions } = req.body;
        const file = req.file;
        const data = {};
        if (title)
            data.title = title;
        if (description)
            data.description = description;
        if (instructions !== undefined)
            data.instructions = instructions;
        if (file) {
            const result = await uploadFileToCloud(file, "eager-minds/activities");
            data.image = result.secure_url;
        }
        const activity = await prisma.activity.update({
            where: { id: req.params.id },
            data,
        });
        res.json(activity);
    }
    catch (error) {
        console.error("UpdateActivity error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function deleteActivity(req, res) {
    try {
        await prisma.activity.delete({ where: { id: req.params.id } });
        res.json({ message: "Activity deleted" });
    }
    catch (error) {
        console.error("DeleteActivity error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
