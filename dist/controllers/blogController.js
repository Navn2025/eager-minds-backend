import prisma from "../lib/prisma.js";
import { uploadFileToCloud } from "../middleware/upload.js";
export async function getPosts(req, res) {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
        const search = req.query.search;
        const where = {
            status: "published",
            publishDate: { lte: new Date() },
        };
        if (search) {
            where.OR = [
                { title: { contains: search, mode: "insensitive" } },
                { excerpt: { contains: search, mode: "insensitive" } },
            ];
            delete where.status;
            delete where.publishDate;
            where.AND = [
                { status: "published" },
                { publishDate: { lte: new Date() } },
            ];
        }
        const [posts, total] = await Promise.all([
            prisma.blogPost.findMany({
                where: search
                    ? {
                        AND: [
                            { status: "published" },
                            { publishDate: { lte: new Date() } },
                            {
                                OR: [
                                    { title: { contains: search, mode: "insensitive" } },
                                    { excerpt: { contains: search, mode: "insensitive" } },
                                ],
                            },
                        ],
                    }
                    : { status: "published", publishDate: { lte: new Date() } },
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    image: true,
                    excerpt: true,
                    author: true,
                    publishDate: true,
                },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { publishDate: "desc" },
            }),
            prisma.blogPost.count({
                where: search
                    ? {
                        AND: [
                            { status: "published" },
                            { publishDate: { lte: new Date() } },
                            {
                                OR: [
                                    { title: { contains: search, mode: "insensitive" } },
                                    { excerpt: { contains: search, mode: "insensitive" } },
                                ],
                            },
                        ],
                    }
                    : { status: "published", publishDate: { lte: new Date() } },
            }),
        ]);
        res.json({ posts, total, page, totalPages: Math.ceil(total / limit) });
    }
    catch (error) {
        console.error("GetPosts error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function getPost(req, res) {
    try {
        const post = await prisma.blogPost.findFirst({
            where: {
                OR: [{ id: req.params.id }, { slug: req.params.id }],
            },
        });
        if (!post) {
            res.status(404).json({ message: "Post not found" });
            return;
        }
        res.json(post);
    }
    catch (error) {
        console.error("GetPost error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
// Admin: get all posts including drafts
export async function getAllPosts(req, res) {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const [posts, total] = await Promise.all([
            prisma.blogPost.findMany({
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: "desc" },
            }),
            prisma.blogPost.count(),
        ]);
        res.json({ posts, total, page, totalPages: Math.ceil(total / limit) });
    }
    catch (error) {
        console.error("GetAllPosts error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function createPost(req, res) {
    try {
        const { title, slug, content, excerpt, author, publishDate, status } = req.body;
        const file = req.file;
        let imageUrl = null;
        if (file) {
            const result = await uploadFileToCloud(file, "eager-minds/blog");
            imageUrl = result.secure_url;
        }
        const post = await prisma.blogPost.create({
            data: {
                title,
                slug,
                content,
                excerpt,
                author,
                image: imageUrl,
                publishDate: publishDate ? new Date(publishDate) : null,
                status: status || "draft",
            },
        });
        res.status(201).json(post);
    }
    catch (error) {
        console.error("CreatePost error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function updatePost(req, res) {
    try {
        const { title, slug, content, excerpt, author, publishDate, status } = req.body;
        const file = req.file;
        const data = {};
        if (title)
            data.title = title;
        if (slug)
            data.slug = slug;
        if (content)
            data.content = content;
        if (excerpt)
            data.excerpt = excerpt;
        if (author)
            data.author = author;
        if (publishDate)
            data.publishDate = new Date(publishDate);
        if (status)
            data.status = status;
        if (file) {
            const result = await uploadFileToCloud(file, "eager-minds/blog");
            data.image = result.secure_url;
        }
        const post = await prisma.blogPost.update({
            where: { id: req.params.id },
            data,
        });
        res.json(post);
    }
    catch (error) {
        console.error("UpdatePost error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function deletePost(req, res) {
    try {
        await prisma.blogPost.delete({ where: { id: req.params.id } });
        res.json({ message: "Post deleted" });
    }
    catch (error) {
        console.error("DeletePost error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
