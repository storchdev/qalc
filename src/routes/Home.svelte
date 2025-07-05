<script lang="ts">
    import { onMount } from "svelte";
    import Evaluator from "../lib/Evaluator";
    import { oneHanded } from "../lib/presets";
    import ScientificNumber from "../lib/ScientificNumber";

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
    let maxDigits = $state(6);

    let index = $state(0);
    let expr = $derived(exprHistory[index]);
    let ans = $derived(ScientificNumber.fromNumber(ansHistory[index] ?? 0));

    let numOpenParens: number = $state(0);
    let numCloseParens: number = $state(0);
    let molarMassMode: boolean = false;
    // let keyStack: string[] = [];

    let showSettings: boolean = $state(false);
    let settingsText = $derived(showSettings ? "Back" : "Settings");
    let errorLine = $state("");

    function updateFromStorage() {
        keybinds = JSON.parse(localStorage.getItem("keybinds") ?? "{}");
        exprHistory = JSON.parse(localStorage.getItem("exprHistory") ?? "[]");
        ansHistory = JSON.parse(localStorage.getItem("ansHistory") ?? "[]");
        maxHistoryLen = parseInt(localStorage.getItem("maxHistoryLen") ?? "50");
        maxDigits = parseInt(localStorage.getItem("maxDigits") ?? "6");
        index = ansHistory.length - 1;
    }

    // Load keybinds from localStorage on mount
    onMount(() => {
        updateFromStorage();
    });

    function resetState() {
        textarea.value = "";
        numOpenParens = 0;
        numCloseParens = 0;
        molarMassMode = false;
        errorLine = "";
        // keyStack = [];
    }

    function handleScroll(e: WheelEvent) {
        if (e.deltaY < 0) {
            scrollUp();
        } else if (e.deltaY > 0) {
            scrollDown();
        }
    }

    function scrollUp() {
        if (index > 0) {
            index--;
            textarea.value = exprHistory[index];
            numOpenParens = textarea.value.split("(").length - 1;
            numCloseParens = textarea.value.split(")").length - 1;
            molarMassMode = false;
        }
    }

    function scrollDown() {
        if (index < ansHistory.length - 1) {
            index++;
            textarea.value = exprHistory[index];
            numOpenParens = textarea.value.split("(").length - 1;
            numCloseParens = textarea.value.split(")").length - 1;
            molarMassMode = false;
        }
    }

    function processRawKey(rawKey: string): string {
        if (rawKey === " ") {
            rawKey = "Space";
        } else if (rawKey === "`") {
            rawKey = "Backtick";
        }

        return keybinds[rawKey] ?? rawKey;
    }

    function handleKeydown(e: KeyboardEvent) {
        let eKey = e.key;
        if (e.key === " ") {
            eKey = "Space";
        } else if (e.key === "`") {
            eKey = "Backtick";
        }

        const remap = eKey in keybinds;

        let key = keybinds[eKey] ?? e.key;
        console.log(key);

        // special keys, they dont type

        if (key === "Escape") {
            e.preventDefault();
            resetState();
            return;
        }

        if (key === "Backspace") {
            e.preventDefault();
            const pos = textarea.selectionStart;

            if (pos > 0) {
                const value = textarea.value;

                const removedKey = textarea.value[pos - 1];
                console.log(removedKey);

                textarea.value = value.slice(0, pos - 1) + value.slice(pos);
                textarea.selectionStart = textarea.selectionEnd = pos - 1;

                if (removedKey === "(") {
                    numOpenParens--;
                } else if (removedKey === ")") {
                    numCloseParens--;
                }
            }
            return;
        }

        if (key === "ArrowUp") {
            scrollUp();
            return;
        }
        if (key === "ArrowDown") {
            scrollDown();
            return;
        }
        if (key === "Enter") {
            e.preventDefault();
            try {
                while (numOpenParens > numCloseParens) {
                    textarea.value += ")";
                    numCloseParens++;
                }
                const evaluator = new Evaluator(ans);
                ans = evaluator.evaluate(textarea.value);
                expr = textarea.value;

                resetState();

                ansHistory.push(ans.toNumber());
                exprHistory.push(expr);

                if (ansHistory.length >= maxHistoryLen) {
                    ansHistory.shift();
                    exprHistory.shift();
                } else {
                    index++;
                }

                localStorage.setItem(
                    "exprHistory",
                    JSON.stringify(exprHistory),
                );
                localStorage.setItem("ansHistory", JSON.stringify(ansHistory));
            } catch (error) {
                errorLine = "syntax error";
            }
            return;
        }

        // typeable keys

        if (key === "()") {
            if (molarMassMode) {
                molarMassMode = false;
                key = ")";
            } else if (
                openParenFollows.includes(
                    textarea.value[textarea.value.length - 1],
                )
            ) {
                key = "(";
            } else {
                if (numOpenParens > numCloseParens) {
                    key = ")";
                } else if (numOpenParens === numCloseParens) {
                    key = "(";
                } else {
                    key = " ";
                }
            }
        }

        // keyStack.push(key);

        if (molarMassMode) {
            return;
        }

        numOpenParens += key.split("(").length - 1;
        numCloseParens += key.split(")").length - 1;

        if (key === "M(") {
            molarMassMode = true;
        }

        if (remap) {
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
        textarea.value = ans ? ans.toRoundedString() : "";
    }

    function handleExport() {
        const data: { [key: string]: any } = {};

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                if (["keybinds", "exprHistory", "ansHistory"].includes(key)) {
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

    function handleImport() {
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
                    updateFromStorage();

                    alert("Updated your settings!");
                } catch (err) {
                    alert("Invalid JSON file");
                }
            };

            reader.onerror = () => {
                alert("Failed to read file");
            };

            reader.readAsText(file);
        };

        input.click();
    }

    function clearHistory() {
        ansHistory = [];
        exprHistory = [];
        index = 0;
        localStorage.setItem("ansHistory", "[]");
        localStorage.setItem("exprHistory", "[]");
        alert("Cleared history!");
    }
</script>

<main>
    <div class="absolute text-[0.5rem] m-2 font-bold inline-block">
        <button
            class="border-2 p-2 rounded font-bold hover:cursor-pointer"
            onclick={() => {
                showSettings = !showSettings;
            }}
        >
            {settingsText}
        </button>
        <a
            class="border-2 p-2 rounded font-bold hover:cursor-pointer"
            href="https://github.com/storchdev/qalc"
        >
            Info
        </a>
    </div>
    <!-- <textarea class="p-2 border-2 rounded font-mono" rows="1"></textarea> -->
    <div class="flex flex-col justify-center items-center h-screen gap-4">
        {#if !showSettings}
            <div class="flex flex-col items-end gap-4 w-1/2 p-2">
                <button
                    class="text-gray-500 hover:cursor-pointer"
                    onclick={handleExprClick}
                >
                    {expr}
                </button>
                <button
                    class="font-bold hover:cursor-pointer"
                    onclick={handleAnsClick}
                >
                    = {ans.toRoundedString(maxDigits)}
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
            <p class="text-red-700 font-bold">{errorLine}</p>
        {/if}
        <!-- <div>opening={numOpenParens}, closing={numCloseParens}</div> -->
        {#if showSettings}
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
                    onclick={handleImport}
                >
                    Import data from file
                </button>
                <button
                    class="rounded p-2 border-2 text-[0.5em] hover:cursor-pointer"
                    onclick={handleExport}
                >
                    Export data to file
                </button>
            </div>
            <div class="flex gap-4">
                <button
                    class="rounded p-2 border-2 text-[0.5em] hover:cursor-pointer"
                    onclick={clearHistory}
                >
                    Clear history
                </button>
            </div>
        {/if}
    </div>
</main>
