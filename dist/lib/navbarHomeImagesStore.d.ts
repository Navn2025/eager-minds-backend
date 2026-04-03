export interface NavbarMenuSection {
    id: string;
    title: string;
}
export declare const NAVBAR_MENU_SECTIONS: NavbarMenuSection[];
export type NavbarSectionImages = [string | null, string | null];
export interface NavbarMenuImagesState {
    sections: Record<string, NavbarSectionImages>;
    updatedAt: string;
}
export declare function readNavbarMenuImages(): Promise<NavbarMenuImagesState>;
export declare function writeNavbarMenuImages(sections: Record<string, NavbarSectionImages>): Promise<NavbarMenuImagesState>;
