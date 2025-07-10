export interface Keybinds {
    [key: string]: string;
}

export interface Template {
    name: string;
    type: "expression" | "javascript";
    parameters: string[];
    content: string;
}

export interface RawTemplate {
    name: string;
    type: "expression" | "javascript";
    parameters: string;
    content: string;
}
