import { readNavbarMenuImages } from "../lib/navbarHomeImagesStore.js";
export async function getNavbarFeaturedImages(_req, res) {
    try {
        const state = await readNavbarMenuImages();
        res.json({
            sections: state.sections,
            updatedAt: state.updatedAt,
        });
    }
    catch (error) {
        console.error("GetNavbarFeaturedImages error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
