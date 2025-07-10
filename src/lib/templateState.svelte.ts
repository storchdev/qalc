import type { Template, Keybinds } from "./interfaces";

export default class TemplateState {
    template: Template;
    paramIndex: number;
    paramName: string | undefined;
    paramValue: string;
    nextParamKey: string;
    enterKey: string;
    isLastParam: boolean;
    values: string[];

    constructor(template: Template, keybinds: Keybinds) {
        this.template = template;
        this.paramIndex = $state(0);
        this.paramName = $derived(template?.parameters[this.paramIndex]);
        this.paramValue = $state("");
        this.nextParamKey = $derived(TemplateState.getNextParamKey(keybinds));
        this.enterKey = $derived(TemplateState.getEnterKey(keybinds));
        this.isLastParam = $derived(
            this.paramIndex === (template?.parameters?.length ?? 0) - 1,
        );
        this.values = [];
    }

    pushValue = (value: string): boolean => {
        if (this.paramIndex >= this.template.parameters.length)
            throw new Error("values already full");
        this.values.push(value);
        this.paramIndex++;
        this.paramValue = "";

        if (this.paramIndex === this.template.parameters.length) return true;
        return false;
    };

    static getNextParamKey(keybinds: Keybinds): string {
        for (const k of Object.keys(keybinds)) {
            if (keybinds[k] === "nextParameter") {
                return k;
            }
        }
        return "Tab";
    }

    static getEnterKey(keybinds: Keybinds): string {
        for (const k of Object.keys(keybinds)) {
            if (keybinds[k] === "Enter") {
                return k;
            }
        }
        return "Enter";
    }
}
