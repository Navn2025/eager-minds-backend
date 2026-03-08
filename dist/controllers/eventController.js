import prisma from "../lib/prisma.js";
export async function getEvents(req, res) {
    try {
        const { upcoming } = req.query;
        const where = {};
        if (upcoming === "true")
            where.date = { gte: new Date() };
        const events = await prisma.event.findMany({
            where,
            orderBy: { date: "asc" },
        });
        res.json(events);
    }
    catch (error) {
        console.error("GetEvents error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function getEvent(req, res) {
    try {
        const event = await prisma.event.findUnique({
            where: { id: req.params.id },
        });
        if (!event) {
            res.status(404).json({ message: "Event not found" });
            return;
        }
        res.json(event);
    }
    catch (error) {
        console.error("GetEvent error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function createEvent(req, res) {
    try {
        const { title, description, date, bookingLink } = req.body;
        const event = await prisma.event.create({
            data: { title, description, date: new Date(date), bookingLink },
        });
        res.status(201).json(event);
    }
    catch (error) {
        console.error("CreateEvent error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function updateEvent(req, res) {
    try {
        const { title, description, date, bookingLink } = req.body;
        const data = {};
        if (title)
            data.title = title;
        if (description)
            data.description = description;
        if (date)
            data.date = new Date(date);
        if (bookingLink !== undefined)
            data.bookingLink = bookingLink;
        const event = await prisma.event.update({
            where: { id: req.params.id },
            data,
        });
        res.json(event);
    }
    catch (error) {
        console.error("UpdateEvent error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function deleteEvent(req, res) {
    try {
        await prisma.event.delete({ where: { id: req.params.id } });
        res.json({ message: "Event deleted" });
    }
    catch (error) {
        console.error("DeleteEvent error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
