import fs from "fs/promises";
import path from "path";

export interface NavbarMenuSection {
  id: string;
  title: string;
}

export const NAVBAR_MENU_SECTIONS: NavbarMenuSection[] = [
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

export type NavbarSectionImages = [string | null, string | null];

export interface NavbarMenuImagesState {
  sections: Record<string, NavbarSectionImages>;
  updatedAt: string;
}

const SETTINGS_DIR = path.join(process.cwd(), "uploads", "site-settings");
const NAVBAR_MENU_FILE = path.join(SETTINGS_DIR, "navbar-menu-featured.json");
const LEGACY_NAVBAR_HOME_FILE = path.join(
  SETTINGS_DIR,
  "navbar-home-featured.json",
);

function normalizeSectionImages(input: unknown): NavbarSectionImages {
  if (!Array.isArray(input)) {
    return [null, null];
  }

  const first =
    typeof input[0] === "string" && input[0].trim() ? input[0] : null;
  const second =
    typeof input[1] === "string" && input[1].trim() ? input[1] : null;

  return [first, second];
}

function createEmptySections(): Record<string, NavbarSectionImages> {
  const sections: Record<string, NavbarSectionImages> = {};
  for (const section of NAVBAR_MENU_SECTIONS) {
    sections[section.id] = [null, null];
  }
  return sections;
}

function normalizeSections(
  input: unknown,
): Record<string, NavbarSectionImages> {
  const sections = createEmptySections();

  if (!input || typeof input !== "object") {
    return sections;
  }

  const rawSections = input as Record<string, unknown>;
  for (const section of NAVBAR_MENU_SECTIONS) {
    if (section.id in rawSections) {
      sections[section.id] = normalizeSectionImages(rawSections[section.id]);
    }
  }

  return sections;
}

async function ensureSettingsDir(): Promise<void> {
  await fs.mkdir(SETTINGS_DIR, { recursive: true });
}

async function readLegacyHomeFile(): Promise<NavbarMenuImagesState | null> {
  try {
    const raw = await fs.readFile(LEGACY_NAVBAR_HOME_FILE, "utf-8");
    const parsed = JSON.parse(raw) as {
      images?: unknown;
      updatedAt?: string;
    };

    const sections = createEmptySections();
    sections.home = normalizeSectionImages(parsed.images);

    return {
      sections,
      updatedAt:
        typeof parsed.updatedAt === "string" && parsed.updatedAt
          ? parsed.updatedAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function readNavbarMenuImages(): Promise<NavbarMenuImagesState> {
  await ensureSettingsDir();

  try {
    const raw = await fs.readFile(NAVBAR_MENU_FILE, "utf-8");
    const parsed = JSON.parse(raw) as {
      sections?: unknown;
      updatedAt?: string;
    };

    return {
      sections: normalizeSections(parsed.sections),
      updatedAt:
        typeof parsed.updatedAt === "string" && parsed.updatedAt
          ? parsed.updatedAt
          : new Date().toISOString(),
    };
  } catch {
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

export async function writeNavbarMenuImages(
  sections: Record<string, NavbarSectionImages>,
): Promise<NavbarMenuImagesState> {
  await ensureSettingsDir();

  const next: NavbarMenuImagesState = {
    sections: normalizeSections(sections),
    updatedAt: new Date().toISOString(),
  };

  await fs.writeFile(NAVBAR_MENU_FILE, JSON.stringify(next, null, 2), "utf-8");
  return next;
}
