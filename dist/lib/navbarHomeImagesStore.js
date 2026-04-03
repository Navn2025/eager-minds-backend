import fs from "fs/promises";
import path from "path";
export const NAVBAR_MENU_SECTIONS = [
    { id: "home", title: "Home" },
    { id: "about", title: "About Us" },
    { id: "clubs", title: "Our Clubs" },
    { id: "workshops", title: "Workshops" },
    { id: "arts-craft", title: "Arts & Craft" },
    { id: "free-sheets", title: "11+" },
    { id: "gallery", title: "Gallery" },
    { id: "word-of-the-day", title: "Word of the Day" },
    { id: "competitions", title: "Competitions" },
    { id: "magazines", title: "Magazines" },
    { id: "blog", title: "Blog" },
    { id: "contact", title: "Contact Us" },
    { id: "login", title: "Login" },
];
const SETTINGS_DIR = path.join(process.cwd(), "uploads", "site-settings");
const NAVBAR_MENU_FILE = path.join(SETTINGS_DIR, "navbar-menu-featured.json");
const LEGACY_NAVBAR_HOME_FILE = path.join(SETTINGS_DIR, "navbar-home-featured.json");
function normalizeSectionImages(input) {
    if (!Array.isArray(input)) {
        return [null, null];
    }
    const first = typeof input[0] === "string" && input[0].trim() ? input[0] : null;
    const second = typeof input[1] === "string" && input[1].trim() ? input[1] : null;
    return [first, second];
}
function createEmptySections() {
    const sections = {};
    for (const section of NAVBAR_MENU_SECTIONS) {
        sections[section.id] = [null, null];
    }
    return sections;
}
function normalizeSections(input) {
    const sections = createEmptySections();
    if (!input || typeof input !== "object") {
        return sections;
    }
    const rawSections = input;
    for (const section of NAVBAR_MENU_SECTIONS) {
        if (section.id in rawSections) {
            sections[section.id] = normalizeSectionImages(rawSections[section.id]);
        }
    }
    return sections;
}
async function ensureSettingsDir() {
    await fs.mkdir(SETTINGS_DIR, { recursive: true });
}
async function readLegacyHomeFile() {
    try {
        const raw = await fs.readFile(LEGACY_NAVBAR_HOME_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        const sections = createEmptySections();
        sections.home = normalizeSectionImages(parsed.images);
        return {
            sections,
            updatedAt: typeof parsed.updatedAt === "string" && parsed.updatedAt
                ? parsed.updatedAt
                : new Date().toISOString(),
        };
    }
    catch {
        return null;
    }
}
export async function readNavbarMenuImages() {
    await ensureSettingsDir();
    try {
        const raw = await fs.readFile(NAVBAR_MENU_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        return {
            sections: normalizeSections(parsed.sections),
            updatedAt: typeof parsed.updatedAt === "string" && parsed.updatedAt
                ? parsed.updatedAt
                : new Date().toISOString(),
        };
    }
    catch {
        const legacyState = await readLegacyHomeFile();
        if (legacyState) {
            await writeNavbarMenuImages(legacyState.sections);
            return legacyState;
        }
        return {
            sections: createEmptySections(),
            updatedAt: new Date().toISOString(),
        };
    }
}
export async function writeNavbarMenuImages(sections) {
    await ensureSettingsDir();
    const next = {
        sections: normalizeSections(sections),
        updatedAt: new Date().toISOString(),
    };
    await fs.writeFile(NAVBAR_MENU_FILE, JSON.stringify(next, null, 2), "utf-8");
    return next;
}
