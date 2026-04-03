import prisma from "../lib/prisma.js";
import { deleteFromCloudinary } from "../lib/cloudinary.js";
import { uploadFileToCloud } from "../middleware/upload.js";
import { NAVBAR_MENU_SECTIONS, readNavbarMenuImages, writeNavbarMenuImages, } from "../lib/navbarHomeImagesStore.js";
const ENTITY_TYPES = [
    "blog",
    "competition",
    "activity",
    "magazine",
    "artsCraft",
    "navbarMenu",
];
const NAVBAR_MENU_SECTION_IDS = new Set(NAVBAR_MENU_SECTIONS.map((section) => section.id));
function isEntityType(value) {
    return ENTITY_TYPES.includes(value);
}
function isNavbarMenuSectionId(value) {
    return NAVBAR_MENU_SECTION_IDS.has(value);
}
function extractCloudinaryPublicId(imageUrl) {
    try {
        const parsed = new URL(imageUrl);
        if (!parsed.hostname.includes("cloudinary.com"))
            return null;
        const match = parsed.pathname.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/);
        return match?.[1] || null;
    }
    catch {
        return null;
    }
}
async function maybeDeleteCloudinaryAsset(url) {
    if (!url)
        return;
    const publicId = extractCloudinaryPublicId(url);
    if (!publicId)
        return;
    try {
        await deleteFromCloudinary(publicId);
    }
    catch (error) {
        // Keep DB operations resilient even if cloud deletion fails.
        console.warn("Cloudinary delete warning:", error);
    }
}
export async function getSiteImages(_req, res) {
    try {
        const [blog, competitions, activities, magazines, artsCraft, navbarMenu] = await Promise.all([
            prisma.blogPost.findMany({
                select: { id: true, title: true, image: true, updatedAt: true },
                orderBy: { updatedAt: "desc" },
            }),
            prisma.competition.findMany({
                select: { id: true, title: true, image: true, updatedAt: true },
                orderBy: { updatedAt: "desc" },
            }),
            prisma.activity.findMany({
                select: { id: true, title: true, image: true, updatedAt: true },
                orderBy: { updatedAt: "desc" },
            }),
            prisma.magazine.findMany({
                select: { id: true, title: true, coverUrl: true, updatedAt: true },
                orderBy: [{ year: "desc" }, { month: "desc" }],
            }),
            prisma.artsCraftProject.findMany({
                select: { id: true, title: true, images: true, updatedAt: true },
                orderBy: { updatedAt: "desc" },
            }),
            readNavbarMenuImages(),
        ]);
        const navbarMenuRecords = NAVBAR_MENU_SECTIONS.map((section) => ({
            id: section.id,
            title: section.title,
            images: navbarMenu.sections[section.id] || [null, null],
            updatedAt: navbarMenu.updatedAt,
        }));
        res.json({
            blog,
            competitions,
            activities,
            magazines,
            artsCraft,
            navbarMenu: navbarMenuRecords,
        });
    }
    catch (error) {
        console.error("GetSiteImages error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function uploadSiteImage(req, res) {
    try {
        const file = req.file;
        const { entityType, entityId, index, sectionId } = req.body;
        if (!file) {
            res.status(400).json({ message: "Image file is required" });
            return;
        }
        if (!entityType || !entityId || !isEntityType(entityType)) {
            res.status(400).json({ message: "entityType and entityId are required" });
            return;
        }
        if (entityType === "navbarMenu") {
            if (!sectionId || !isNavbarMenuSectionId(sectionId)) {
                res.status(400).json({ message: "Valid sectionId is required" });
                return;
            }
        }
        const upload = await uploadFileToCloud(file, `eager-minds/site-images/${entityType}`);
        const imageUrl = upload.secure_url;
        let record;
        switch (entityType) {
            case "blog": {
                const existing = await prisma.blogPost.findUnique({
                    where: { id: entityId },
                    select: { image: true },
                });
                if (!existing) {
                    res.status(404).json({ message: "Blog post not found" });
                    return;
                }
                await maybeDeleteCloudinaryAsset(existing.image);
                record = await prisma.blogPost.update({
                    where: { id: entityId },
                    data: { image: imageUrl },
                    select: { id: true, title: true, image: true, updatedAt: true },
                });
                break;
            }
            case "competition": {
                const existing = await prisma.competition.findUnique({
                    where: { id: entityId },
                    select: { image: true },
                });
                if (!existing) {
                    res.status(404).json({ message: "Competition not found" });
                    return;
                }
                await maybeDeleteCloudinaryAsset(existing.image);
                record = await prisma.competition.update({
                    where: { id: entityId },
                    data: { image: imageUrl },
                    select: { id: true, title: true, image: true, updatedAt: true },
                });
                break;
            }
            case "activity": {
                const existing = await prisma.activity.findUnique({
                    where: { id: entityId },
                    select: { image: true },
                });
                if (!existing) {
                    res.status(404).json({ message: "Activity not found" });
                    return;
                }
                await maybeDeleteCloudinaryAsset(existing.image);
                record = await prisma.activity.update({
                    where: { id: entityId },
                    data: { image: imageUrl },
                    select: { id: true, title: true, image: true, updatedAt: true },
                });
                break;
            }
            case "magazine": {
                const existing = await prisma.magazine.findUnique({
                    where: { id: entityId },
                    select: { coverUrl: true },
                });
                if (!existing) {
                    res.status(404).json({ message: "Magazine not found" });
                    return;
                }
                await maybeDeleteCloudinaryAsset(existing.coverUrl);
                record = await prisma.magazine.update({
                    where: { id: entityId },
                    data: { coverUrl: imageUrl },
                    select: { id: true, title: true, coverUrl: true, updatedAt: true },
                });
                break;
            }
            case "artsCraft": {
                const existing = await prisma.artsCraftProject.findUnique({
                    where: { id: entityId },
                    select: { images: true },
                });
                if (!existing) {
                    res.status(404).json({ message: "Arts & Craft project not found" });
                    return;
                }
                const parsedIndex = index !== undefined && index !== ""
                    ? Number.parseInt(index, 10)
                    : undefined;
                const images = [...existing.images];
                if (parsedIndex !== undefined &&
                    Number.isInteger(parsedIndex) &&
                    parsedIndex >= 0 &&
                    parsedIndex < images.length) {
                    await maybeDeleteCloudinaryAsset(images[parsedIndex]);
                    images[parsedIndex] = imageUrl;
                }
                else {
                    images.push(imageUrl);
                }
                record = await prisma.artsCraftProject.update({
                    where: { id: entityId },
                    data: { images },
                    select: { id: true, title: true, images: true, updatedAt: true },
                });
                break;
            }
            case "navbarMenu": {
                const resolvedSectionId = sectionId;
                const navbarState = await readNavbarMenuImages();
                const parsedIndex = index !== undefined && index !== ""
                    ? Number.parseInt(index, 10)
                    : undefined;
                const existingImages = navbarState.sections[resolvedSectionId] || [
                    null,
                    null,
                ];
                const targetIndex = parsedIndex !== undefined &&
                    Number.isInteger(parsedIndex) &&
                    parsedIndex >= 0 &&
                    parsedIndex <= 1
                    ? parsedIndex
                    : existingImages[0]
                        ? 1
                        : 0;
                const nextImages = [
                    existingImages[0],
                    existingImages[1],
                ];
                await maybeDeleteCloudinaryAsset(nextImages[targetIndex]);
                nextImages[targetIndex] = imageUrl;
                const saved = await writeNavbarMenuImages({
                    ...navbarState.sections,
                    [resolvedSectionId]: nextImages,
                });
                const section = NAVBAR_MENU_SECTIONS.find((item) => item.id === resolvedSectionId);
                record = {
                    id: resolvedSectionId,
                    title: section?.title || resolvedSectionId,
                    images: saved.sections[resolvedSectionId] || [null, null],
                    updatedAt: saved.updatedAt,
                };
                break;
            }
        }
        res.json({ message: "Image uploaded", imageUrl, record });
    }
    catch (error) {
        console.error("UploadSiteImage error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function removeSiteImage(req, res) {
    try {
        const { entityType, entityId, index, sectionId } = req.body;
        if (!entityType || !entityId || !isEntityType(entityType)) {
            res.status(400).json({ message: "entityType and entityId are required" });
            return;
        }
        if (entityType === "navbarMenu") {
            if (!sectionId || !isNavbarMenuSectionId(sectionId)) {
                res.status(400).json({ message: "Valid sectionId is required" });
                return;
            }
        }
        const parsedIndex = index === undefined || index === null || index === ""
            ? undefined
            : Number(index);
        let record;
        switch (entityType) {
            case "blog": {
                const existing = await prisma.blogPost.findUnique({
                    where: { id: entityId },
                    select: { image: true },
                });
                if (!existing) {
                    res.status(404).json({ message: "Blog post not found" });
                    return;
                }
                await maybeDeleteCloudinaryAsset(existing.image);
                record = await prisma.blogPost.update({
                    where: { id: entityId },
                    data: { image: null },
                    select: { id: true, title: true, image: true, updatedAt: true },
                });
                break;
            }
            case "competition": {
                const existing = await prisma.competition.findUnique({
                    where: { id: entityId },
                    select: { image: true },
                });
                if (!existing) {
                    res.status(404).json({ message: "Competition not found" });
                    return;
                }
                await maybeDeleteCloudinaryAsset(existing.image);
                record = await prisma.competition.update({
                    where: { id: entityId },
                    data: { image: null },
                    select: { id: true, title: true, image: true, updatedAt: true },
                });
                break;
            }
            case "activity": {
                const existing = await prisma.activity.findUnique({
                    where: { id: entityId },
                    select: { image: true },
                });
                if (!existing) {
                    res.status(404).json({ message: "Activity not found" });
                    return;
                }
                await maybeDeleteCloudinaryAsset(existing.image);
                record = await prisma.activity.update({
                    where: { id: entityId },
                    data: { image: null },
                    select: { id: true, title: true, image: true, updatedAt: true },
                });
                break;
            }
            case "magazine": {
                const existing = await prisma.magazine.findUnique({
                    where: { id: entityId },
                    select: { coverUrl: true },
                });
                if (!existing) {
                    res.status(404).json({ message: "Magazine not found" });
                    return;
                }
                await maybeDeleteCloudinaryAsset(existing.coverUrl);
                record = await prisma.magazine.update({
                    where: { id: entityId },
                    data: { coverUrl: null },
                    select: { id: true, title: true, coverUrl: true, updatedAt: true },
                });
                break;
            }
            case "artsCraft": {
                const existing = await prisma.artsCraftProject.findUnique({
                    where: { id: entityId },
                    select: { images: true },
                });
                if (!existing) {
                    res.status(404).json({ message: "Arts & Craft project not found" });
                    return;
                }
                const images = [...existing.images];
                if (parsedIndex === undefined) {
                    await Promise.all(images.map((url) => maybeDeleteCloudinaryAsset(url)));
                    record = await prisma.artsCraftProject.update({
                        where: { id: entityId },
                        data: { images: [] },
                        select: { id: true, title: true, images: true, updatedAt: true },
                    });
                    break;
                }
                if (!Number.isInteger(parsedIndex) ||
                    parsedIndex < 0 ||
                    parsedIndex >= images.length) {
                    res.status(400).json({ message: "Valid image index is required" });
                    return;
                }
                await maybeDeleteCloudinaryAsset(images[parsedIndex]);
                images.splice(parsedIndex, 1);
                record = await prisma.artsCraftProject.update({
                    where: { id: entityId },
                    data: { images },
                    select: { id: true, title: true, images: true, updatedAt: true },
                });
                break;
            }
            case "navbarMenu": {
                const resolvedSectionId = sectionId;
                const navbarState = await readNavbarMenuImages();
                const currentImages = navbarState.sections[resolvedSectionId] || [
                    null,
                    null,
                ];
                const nextImages = [
                    currentImages[0],
                    currentImages[1],
                ];
                if (parsedIndex === undefined) {
                    await Promise.all(nextImages.map((url) => maybeDeleteCloudinaryAsset(url)));
                    const saved = await writeNavbarMenuImages({
                        ...navbarState.sections,
                        [resolvedSectionId]: [null, null],
                    });
                    const section = NAVBAR_MENU_SECTIONS.find((item) => item.id === resolvedSectionId);
                    record = {
                        id: resolvedSectionId,
                        title: section?.title || resolvedSectionId,
                        images: saved.sections[resolvedSectionId] || [null, null],
                        updatedAt: saved.updatedAt,
                    };
                    break;
                }
                if (!Number.isInteger(parsedIndex) ||
                    parsedIndex < 0 ||
                    parsedIndex > 1) {
                    res.status(400).json({ message: "Valid image index is required" });
                    return;
                }
                await maybeDeleteCloudinaryAsset(nextImages[parsedIndex]);
                nextImages[parsedIndex] = null;
                const saved = await writeNavbarMenuImages({
                    ...navbarState.sections,
                    [resolvedSectionId]: nextImages,
                });
                const section = NAVBAR_MENU_SECTIONS.find((item) => item.id === resolvedSectionId);
                record = {
                    id: resolvedSectionId,
                    title: section?.title || resolvedSectionId,
                    images: saved.sections[resolvedSectionId] || [null, null],
                    updatedAt: saved.updatedAt,
                };
                break;
            }
        }
        res.json({ message: "Image removed", record });
    }
    catch (error) {
        console.error("RemoveSiteImage error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
