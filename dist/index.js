import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import authRoutes from "./routes/auth.js";
import prepRoutes from "./routes/prep.js";
import competitionRoutes from "./routes/competitions.js";
import artsCraftRoutes from "./routes/artsCraft.js";
import activityRoutes from "./routes/activities.js";
import eventRoutes from "./routes/events.js";
import blogRoutes from "./routes/blog.js";
import magazineRoutes from "./routes/magazines.js";
import paperRoutes from "./routes/papers.js";
import enquiryRoutes from "./routes/enquiries.js";
import faqRoutes from "./routes/faqs.js";
import testimonialRoutes from "./routes/testimonials.js";
const app = express();
const PORT = process.env.PORT || 5000;
// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use(cors({
    origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
        process.env.FRONTEND_URL,
    ].filter(Boolean),
    credentials: true,
}));
app.use(express.json());
// Serve uploaded files with security headers to prevent download
app.use("/uploads", (req, res, next) => {
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
}, express.static(uploadsDir));
// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/prep", prepRoutes);
app.use("/api/competitions", competitionRoutes);
app.use("/api/arts-craft", artsCraftRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/blog", blogRoutes);
app.use("/api/magazines", magazineRoutes);
app.use("/api/papers", paperRoutes);
app.use("/api/enquiries", enquiryRoutes);
app.use("/api/faqs", faqRoutes);
app.use("/api/testimonials", testimonialRoutes);
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
});
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
