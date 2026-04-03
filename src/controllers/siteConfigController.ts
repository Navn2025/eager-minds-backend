import type { Request, Response } from "express";
import { readNavbarMenuImages } from "../lib/navbarHomeImagesStore.js";

export async function getNavbarFeaturedImages(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const state = await readNavbarMenuImages();
    res.json({
      sections: state.sections,
      updatedAt: state.updatedAt,
    });
  } catch (error) {
    console.error("GetNavbarFeaturedImages error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
