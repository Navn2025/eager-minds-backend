import prisma from "../lib/prisma.js";
export async function createEnquiry(req, res) {
    try {
        const { parentName, name, email, phone, message } = req.body;
        const actualName = parentName || name;
        if (!actualName || !email || !message) {
            res.status(400).json({ message: "Name, email and message are required" });
            return;
        }
        const enquiry = await prisma.enquiry.create({
            data: { parentName: actualName, email, phone: phone || null, message },
        });
        res
            .status(201)
            .json({ message: "Enquiry submitted successfully", enquiry });
    }
    catch (error) {
        console.error("CreateEnquiry error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function getEnquiries(req, res) {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const [enquiries, total] = await Promise.all([
            prisma.enquiry.findMany({
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: "desc" },
            }),
            prisma.enquiry.count(),
        ]);
        res.json({ enquiries, total, page, totalPages: Math.ceil(total / limit) });
    }
    catch (error) {
        console.error("GetEnquiries error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function deleteEnquiry(req, res) {
    try {
        await prisma.enquiry.delete({ where: { id: req.params.id } });
        res.json({ message: "Enquiry deleted" });
    }
    catch (error) {
        console.error("DeleteEnquiry error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
