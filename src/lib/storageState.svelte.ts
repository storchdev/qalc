import type { Keybinds, Template } from "./interfaces";
import { oneHanded, twoHanded } from "./presets";

export default class StorageState {
    keybinds: Keybinds = $state({});
    exprHistory: string[] = [];
    ansHistory: number[] = [];
    maxHistoryLen: number = 50;
    maxDigits: number = 12;
    index: number = this.ansHistory.length - 1;
    templates: Template[] = $state([]);

    constructor() {
        this.pullFromStorage();
    }

    pushHistory = (ans: number, expr: string) => {
        this.ansHistory.push(ans);
        this.exprHistory.push(expr);

        if (this.ansHistory.length >= this.maxHistoryLen) {
            this.ansHistory.shift();
            this.exprHistory.shift();
        } else {
            this.index++;
        }

        localStorage.setItem("exprHistory", JSON.stringify(this.exprHistory));
        localStorage.setItem("ansHistory", JSON.stringify(this.ansHistory));
    };

    pushTemplate = (template: Template) => {
        this.templates.push(template);
        localStorage.setItem("templates", JSON.stringify(this.templates));
    };

    removeTemplate = (template: Template) => {
        const index = this.templates.indexOf(template);
        if (index > -1) {
            this.templates.splice(index, 1);
        }
        localStorage.setItem("templates", JSON.stringify(this.templates));
    };

    pullFromStorage = () => {
        this.keybinds = JSON.parse(localStorage.getItem("keybinds") ?? "{}");
        this.exprHistory = JSON.parse(
            localStorage.getItem("exprHistory") ?? "[]",
        );
        this.ansHistory = JSON.parse(
            localStorage.getItem("ansHistory") ?? "[]",
        );
        this.maxHistoryLen = parseInt(
            localStorage.getItem("maxHistoryLen") ??
                this.maxHistoryLen.toString(),
        );
        this.index = this.ansHistory.length - 1;
        this.maxDigits = parseInt(
            localStorage.getItem("maxDigits") ?? this.maxDigits.toString(),
        );
        this.templates = JSON.parse(localStorage.getItem("templates") ?? "[]");
    };

    handleExport = () => {
        const data: { [key: string]: string } = {};

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                if (
                    [
                        "keybinds",
                        "exprHistory",
                        "ansHistory",
                        "templates",
                    ].includes(key)
                ) {
                    data[key] = JSON.parse(localStorage.getItem(key) ?? "{}");
                } else {
                    data[key] = JSON.parse(localStorage.getItem(key) ?? "{}");
                }
            }
        }

        const jsonString = JSON.stringify(data, null, 2); // Pretty print
        const blob = new Blob([jsonString], { type: "application/json" });

        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "qalc_data.json";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    clearKeybinds = () => {
        localStorage.setItem("keybinds", "{}");
        this.keybinds = {};
        alert("Cleared keybinds!");
    };

    setOneHandedKeybinds = () => {
        localStorage.setItem("keybinds", JSON.stringify(oneHanded));
        this.keybinds = oneHanded;
        alert("Set default one-handed keybinds!");
    };

    setTwoHandedKeybinds = () => {
        localStorage.setItem("keybinds", JSON.stringify(twoHanded));
        this.keybinds = twoHanded;
        alert("Set default two-handed keybinds!");
    };

    handleImport = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";

        input.onchange = () => {
            if (!input.files || input.files.length === 0) {
                return alert("No file selected");
            }

            const file = input.files[0];
            const reader = new FileReader();

            reader.onload = () => {
                try {
                    const data = JSON.parse(reader.result as string);
                    for (const [key, value] of Object.entries(data)) {
                        if (
                            ["keybinds", "exprHistory", "ansHistory"].includes(
                                key,
                            )
                        ) {
                            localStorage.setItem(key, JSON.stringify(value));
                            data[key] = JSON.parse(
                                localStorage.getItem(key) ?? "{}",
                            );
                        } else {
                            localStorage.setItem(key, value as string);
                        }
                    }
                    this.pullFromStorage();

                    alert("Updated your settings!");
                } catch (e) {
                    alert(`Invalid JSON file: ${e}`);
                }
            };

            reader.onerror = () => {
                alert("Failed to read file");
            };

            reader.readAsText(file);
        };

        input.click();
    };

    clearHistory = () => {
        this.ansHistory = [];
        this.exprHistory = [];
        this.index = 0;
        localStorage.setItem("ansHistory", "[]");
        localStorage.setItem("exprHistory", "[]");
        alert("Cleared history!");
    };
}
