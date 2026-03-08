import prisma from "../lib/prisma.js";
export async function getTestimonials(_req, res) {
    try {
        const testimonials = await prisma.testimonial.findMany({
            orderBy: { createdAt: "desc" },
        });
        res.json(testimonials);
    }
    catch (error) {
        console.error("GetTestimonials error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function createTestimonial(req, res) {
    try {
        const { parentName, content, rating } = req.body;
        const testimonial = await prisma.testimonial.create({
            data: { parentName, content, rating: rating ? parseInt(rating) : null },
        });
        res.status(201).json(testimonial);
    }
    catch (error) {
        console.error("CreateTestimonial error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function updateTestimonial(req, res) {
    try {
        const { approved, parentName, content, rating } = req.body;
        const data = {};
        if (typeof approved === "boolean")
            data.approved = approved;
        if (parentName)
            data.parentName = parentName;
        if (content)
            data.content = content;
        if (rating !== undefined)
            data.rating = rating ? parseInt(rating) : null;
        const testimonial = await prisma.testimonial.update({
            where: { id: req.params.id },
            data,
        });
        res.json(testimonial);
    }
    catch (error) {
        console.error("UpdateTestimonial error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function deleteTestimonial(req, res) {
    try {
        await prisma.testimonial.delete({ where: { id: req.params.id } });
        res.json({ message: "Testimonial deleted" });
    }
    catch (error) {
        console.error("DeleteTestimonial error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
