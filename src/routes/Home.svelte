<script lang="ts">
    import { onMount } from "svelte";
    import Evaluator from "../lib/Evaluator";
    import { oneHanded } from "../lib/presets";

    interface Keybinds {
        [key: string]: string;
    }

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

    let textarea: HTMLTextAreaElement;

    let keybinds: Keybinds = {};
    let exprHistory: string[] = [];
    let ansHistory: number[] = [];
    let maxHistoryLen: number;

    let index = $state(0);
    let expr = $derived(exprHistory[index]);
    let ans = $derived(ansHistory[index]);

    let numOpenParens: number = 0;
    let numCloseParens: number = 0;
    let molarMassMode: boolean = false;
    let keyStack: string[] = [];

    // Load keybinds from localStorage on mount
    onMount(() => {
        keybinds = JSON.parse(localStorage.getItem("keybinds") ?? "{}");
        exprHistory = JSON.parse(localStorage.getItem("exprHistory") ?? "[]");
        ansHistory = JSON.parse(localStorage.getItem("ansHistory") ?? "[]");
        maxHistoryLen = parseInt(localStorage.getItem("maxHistoryLen") ?? "50");
        index = ansHistory.length - 1;
    });

    function handleScroll(e: WheelEvent) {
        if (e.deltaY < 0 && index > 0) {
            index--;
            textarea.value = exprHistory[index];
        } else if (e.deltaY > 0 && index < ansHistory.length - 1) {
            index++;
            textarea.value = exprHistory[index];
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        console.log(e.key);
        let cleanedKey: string = e.key;
        if (e.key === " ") {
            cleanedKey = "Space";
        } else if (e.key === "`") {
            cleanedKey = "Backtick";
        }
        const maybeKey = keybinds[cleanedKey];
        let key = maybeKey ?? cleanedKey;

        console.log(key);
        if (key === "AC") {
            e.preventDefault();
            textarea.value = "";
            numOpenParens = 0;
            numCloseParens = 0;
            molarMassMode = false;
            keyStack = [];
            return;
        }

        if (key === "DEL") {
            e.preventDefault();
            const pos = textarea.selectionStart;

            if (pos > 0) {
                const value = textarea.value;
                textarea.value = value.slice(0, pos - 1) + value.slice(pos);
                textarea.selectionStart = textarea.selectionEnd = pos - 1;

                let lastKey = keyStack.pop();
                if (lastKey === "(") {
                    numOpenParens--;
                } else if (lastKey === ")") {
                    numCloseParens--;
                }
            }
            return;
        }

        if (key === "()") {
            if (molarMassMode) {
                molarMassMode = false;
                key = ")";
                numCloseParens++;
            } else if (
                openParenFollows.includes(keyStack[keyStack.length - 1])
            ) {
                key = "(";
                numOpenParens++;
            } else {
                if (numOpenParens > numCloseParens) {
                    key = ")";
                    numCloseParens++;
                } else if (numOpenParens === numCloseParens) {
                    key = "(";
                    numOpenParens++;
                } else {
                    key = " ";
                }
            }
        }

        keyStack.push(key);

        if (molarMassMode) {
            return;
        }

        if (key === "M(") {
            molarMassMode = true;
        }

        if (key === "ArrowUp" && index > 0) {
            index--;
            textarea.value = exprHistory[index];
        } else if (key === "ArrowDown" && index < ansHistory.length - 1) {
            index++;
            textarea.value = exprHistory[index];
        } else if (key === "Enter") {
            e.preventDefault();
            try {
                while (numOpenParens > numCloseParens) {
                    textarea.value += ")";
                    numCloseParens++;
                }
                const evaluator = new Evaluator(ans);
                ans = evaluator.evaluate(textarea.value);
                expr = textarea.value;
                textarea.value = "";
                numOpenParens = 0;
                numCloseParens = 0;
                molarMassMode = false;
                keyStack = [];

                ansHistory.push(ans);
                exprHistory.push(expr);

                if (ansHistory.length >= maxHistoryLen) {
                    ansHistory.shift();
                    exprHistory.shift();
                } else {
                    index++;
                }
            } catch (error) {
                alert("syntax error");
                return;
            }
        } else if (maybeKey && textarea) {
            e.preventDefault();

            const { selectionStart, selectionEnd, value } = textarea;

            const before = value.slice(0, selectionStart);
            const after = value.slice(selectionEnd);
            const newCursorPos = before.length + key.length;

            textarea.value = before + key + after;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }
    }

    function handleExprClick(e: MouseEvent) {
        textarea.value = expr;
    }

    function handleAnsClick() {
        textarea.value = (ans ?? "").toString();
    }

    function handleExport() {
        const data: { [key: string]: any } = {};

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                data[key] = localStorage.getItem(key);
            }
        }

        const jsonString = JSON.stringify(data, null, 2); // Pretty print
        const blob = new Blob([jsonString], { type: "application/json" });

        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "qalc_storage.json";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function clearKeybinds() {
        localStorage.setItem("keybinds", "{}");
        keybinds = {};
        alert("Cleared keybinds!");
    }

    function setOneHandedKeybinds() {
        localStorage.setItem("keybinds", JSON.stringify(oneHanded));
        keybinds = oneHanded;
        alert("Set default one-handed keybinds!");
    }
</script>

<main class="flex flex-col justify-center items-center h-screen gap-4">
    <!-- <textarea class="p-2 border-2 rounded font-mono" rows="1"></textarea> -->
    <div class="flex flex-col items-end gap-4 w-1/2 p-2">
        <button
            class="text-gray-500 hover:cursor-pointer"
            onclick={handleExprClick}
        >
            {expr}
        </button>
        <button class="font-bold hover:cursor-pointer" onclick={handleAnsClick}>
            = {ans}
        </button>
    </div>
    <textarea
        bind:this={textarea}
        id="textarea"
        onkeydown={handleKeydown}
        onwheel={handleScroll}
        class="w-1/2 h-auto resize-none overflow-hidden whitespace-nowrap border-2 rounded p-2 font-mono"
        rows="1"
    ></textarea>
    <div class="flex gap-4">
        <button
            class="rounded p-2 border-2 text-[0.5em] hover:cursor-pointer"
            onclick={setOneHandedKeybinds}
        >
            Use one-handed preset
        </button>
        <button
            class="rounded p-2 border-2 text-[0.5em] hover:cursor-pointer"
            onclick={clearKeybinds}
        >
            Clear keybinds
        </button>
    </div>
    <div class="flex gap-4">
        <button
            class="rounded p-2 border-2 text-[0.5em] hover:cursor-pointer"
            onclick={() => {}}
        >
            <!-- TODO -->
            Import localStorage
        </button>
        <button
            class="rounded p-2 border-2 text-[0.5em] hover:cursor-pointer"
            onclick={handleExport}
        >
            Export localStorage
        </button>
    </div>
</main>
