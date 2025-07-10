import ScientificNumber from "./scientificNumber";
import StorageState from "./storageState.svelte";
import Evaluator from "./evaluator";

export default class CalcState {
    textarea: HTMLTextAreaElement;
    numOpenParens = 0;
    numCloseParens = 0;
    ans: ScientificNumber = $state(ScientificNumber.fromNumber(0));
    molarMassMode = false;
    storageState: StorageState;
    expr: string = $state("");
    errorLine = $state("");
    useKeybinds = $state(true);

    constructor(textarea: HTMLTextAreaElement, storageState: StorageState) {
        this.textarea = $state(textarea);
        this.storageState = storageState;
    }

    reset = () => {
        this.textarea.value = "";
        this.numOpenParens = 0;
        this.numCloseParens = 0;
        this.molarMassMode = false;
        this.errorLine = "";
    };

    goUp = () => {
        if (this.storageState.index > 0) {
            this.storageState.index--;
            this.textarea.value =
                this.storageState.exprHistory[this.storageState.index];
            this.numOpenParens = this.textarea.value.split("(").length - 1;
            this.numCloseParens = this.textarea.value.split(")").length - 1;
            this.molarMassMode = false;

            this.ans = ScientificNumber.fromNumber(
                this.storageState.ansHistory[this.storageState.index],
            );
            this.expr = this.storageState.exprHistory[this.storageState.index];
        }
    };

    goDown(): void {
        if (this.storageState.index < this.storageState.ansHistory.length - 1) {
            this.storageState.index++;
            this.textarea.value =
                this.storageState.exprHistory[this.storageState.index];
            this.numOpenParens = this.textarea.value.split("(").length - 1;
            this.numCloseParens = this.textarea.value.split(")").length - 1;
            this.molarMassMode = false;

            this.ans = ScientificNumber.fromNumber(
                this.storageState.ansHistory[this.storageState.index],
            );
            this.expr = this.storageState.exprHistory[this.storageState.index];
        }
    }

    handleKey = (e: KeyboardEvent) => {
        let eKey = e.key;
        if (e.key === " ") {
            eKey = "Space";
        } else if (e.key === "`") {
            eKey = "Backtick";
        }

        const remap = eKey in this.storageState.keybinds;

        let key = this.storageState.keybinds[eKey] ?? e.key;
        // console.log(key);

        if (this.molarMassMode && key === "()") {
            this.useKeybinds = true;
        }
        if (!this.useKeybinds) {
            return;
        }

        // special keys, they dont type

        if (key === "Escape") {
            e.preventDefault();
            this.reset();
            return;
        }

        if (key === "Backspace") {
            e.preventDefault();
            const pos = this.textarea.selectionStart;

            if (pos > 0) {
                const value = this.textarea.value;

                const removedKey = this.textarea.value[pos - 1];
                // console.log(removedKey);

                this.textarea.value =
                    value.slice(0, pos - 1) + value.slice(pos);
                this.textarea.selectionStart = this.textarea.selectionEnd =
                    pos - 1;

                if (removedKey === "(") {
                    this.numOpenParens--;
                } else if (removedKey === ")") {
                    this.numCloseParens--;
                }
            }
            return;
        }

        if (key === "ArrowUp") {
            this.goUp();
            return;
        }
        if (key === "ArrowDown") {
            this.goDown();
            return;
        }
        if (key === "Enter") {
            e.preventDefault();

            if (this.textarea.value === "") {
                return;
            }

            try {
                while (this.numOpenParens > this.numCloseParens) {
                    this.textarea.value += ")";
                    this.numCloseParens++;
                }
                const evaluator = new Evaluator(this.ans);
                this.ans = evaluator.evaluate(this.textarea.value);
                this.expr = this.textarea.value;
                this.reset();
                this.storageState.pushHistory(this.ans.toNumber(), this.expr);
            } catch (error) {
                this.errorLine = "syntax error";
                console.log(`syntax error: ${error}`);
                // errorLine = error.toString();
            }
            return;
        }

        // typeable keys

        if (key === "()") {
            const openParenFollows: string[] = [
                "+",
                "-",
                "*",
                "/",
                "^",
                // "sqrt(",
                // "ln(",
                // "M(",
            ];

            if (this.molarMassMode) {
                this.molarMassMode = false;
                key = ")";
            } else if (
                openParenFollows.includes(
                    this.textarea.value[this.textarea.value.length - 1],
                )
            ) {
                key = "(";
            } else {
                if (this.numOpenParens > this.numCloseParens) {
                    key = ")";
                } else if (this.numOpenParens === this.numCloseParens) {
                    key = "(";
                } else {
                    key = " ";
                }
            }
        }

        // keyStack.push(key);

        if (this.molarMassMode) {
            return;
        }

        this.numOpenParens += key.split("(").length - 1;
        this.numCloseParens += key.split(")").length - 1;

        if (key === "M(") {
            this.molarMassMode = true;
            this.useKeybinds = false;
        }

        if (remap) {
            e.preventDefault();

            const { selectionStart, selectionEnd, value } = this.textarea;

            const before = value.slice(0, selectionStart);
            const after = value.slice(selectionEnd);
            const newCursorPos = before.length + key.length;

            this.textarea.value = before + key + after;
            this.textarea.setSelectionRange(newCursorPos, newCursorPos);
        }
    };

    handleExprClick = () => {
        this.textarea.value = this.expr;
    };

    handleAnsClick = () => {
        this.textarea.value = this.ans.toRoundedString(
            this.storageState.maxDigits,
        );
    };

    handleScroll = (e: WheelEvent) => {
        if (e.deltaY < 0) {
            this.goUp();
        } else if (e.deltaY > 0) {
            this.goDown();
        }
    };
}
