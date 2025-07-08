<script lang="ts">
    import { onMount } from "svelte";
    import Evaluator from "../lib/evaluator";
    import { oneHanded } from "../lib/presets";
    import ScientificNumber from "../lib/scientificNumber";
    import Icon from "@iconify/svelte";

    interface Keybinds {
        [key: string]: string;
    }

    interface Template {
        name: string;
        type: "expression" | "javascript";
        parameters: string[];
        content: string;
    }

    interface RawTemplate {
        name: string | null;
        type: "expression" | "javascript";
        parameters: string | null;
        content: string | null;
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
    let maxHistoryLen: number = 50;
    let maxDigits = $state(12);
    let templates: Template[] = $state([]);
    let showTemplates = $state(true); // change to false for real
    let templateText = $derived(
        showTemplates ? "Hide templates" : "Show templates",
    );
    let showAdd = $state(true); // change to false for real

    let rawTemplate: RawTemplate = $state({
        name: null,
        type: "expression",
        parameters: null,
        content: null,
    });
    // let addTypeValue: string = $state("expression");

    const javascriptContentPlaceholder = `// nCr example
// only write the function body
// ALWAYS return a number!

if (r > n) return 0;
if (r === 0 || r === n) return 1;

r = Math.min(r, n - r);
let result = 1;

for (let i = 1; i <= r; i++) {
    result *= (n - i + 1);
    result /= i;
}

return result;
`;
    const javascriptParameterPlaceholder = "n,r";
    const expressionContentPlaceholder = "(-{b}+sqrt({b}^2-4*{a}*{c}))/(2*{a})";
    const expressionParameterPlaceholder = "a,b,c";

    let index = $state(0);
    let expr = $derived(exprHistory[index]);
    let ans = $derived(ScientificNumber.fromNumber(ansHistory[index] ?? 0));

    let numOpenParens: number = $state(0);
    let numCloseParens: number = $state(0);
    let molarMassMode: boolean = false;

    let showSettings: boolean = $state(false);
    let settingsText = $derived(showSettings ? "Back" : "Settings");
    let useKeybinds = $state(true);
    let keybindsText = $derived(useKeybinds ? "Keybinds: on" : "Keybinds: off");
    let errorLine = $state("");

    function updateFromStorage() {
        keybinds = JSON.parse(localStorage.getItem("keybinds") ?? "{}");
        exprHistory = JSON.parse(localStorage.getItem("exprHistory") ?? "[]");
        ansHistory = JSON.parse(localStorage.getItem("ansHistory") ?? "[]");
        maxHistoryLen = parseInt(
            localStorage.getItem("maxHistoryLen") ?? maxHistoryLen.toString(),
        );
        maxDigits = parseInt(
            localStorage.getItem("maxDigits") ?? maxDigits.toString(),
        );
        index = ansHistory.length - 1;
        templates = JSON.parse(localStorage.getItem("templates") ?? "[]");
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

    function handleKeydown(e: KeyboardEvent) {
        let eKey = e.key;
        if (e.key === " ") {
            eKey = "Space";
        } else if (e.key === "`") {
            eKey = "Backtick";
        }

        const remap = eKey in keybinds;

        let key = keybinds[eKey] ?? e.key;
        // console.log(key);

        if (molarMassMode && key === "()") {
            useKeybinds = true;
        }
        if (!useKeybinds) {
            return;
        }

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
                // console.log(removedKey);

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

            if (textarea.value === "") {
                return;
            }

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
            } catch (error: any) {
                errorLine = "syntax error";
                // errorLine = error.toString();
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
            useKeybinds = false;
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
        textarea.value = ans ? ans.toRoundedString(maxDigits) : "";
    }

    function handleExport() {
        const data: { [key: string]: any } = {};

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
    <div class="absolute m-2 flex flex-col gap-2 text-[0.5rem]">
        <div class="font-bold inline-block">
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
        <button
            class="border-2 p-2 rounded font-bold hover:cursor-pointer"
            onclick={() => {
                useKeybinds = !useKeybinds;
            }}
        >
            {keybindsText}
        </button>
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
            <p class="text-red-700 font-bold text-[0.5rem]">{errorLine}</p>
            <div class="flex flex-col gap-1 w-1/2 text-[0.5rem]">
                <button
                    class="rounded border-2 p-2 hover:cursor-pointer w-full"
                    onclick={() => {
                        showTemplates = !showTemplates;
                    }}>{templateText}</button
                >
                {#if showTemplates}
                    <div
                        class="flex flex-col gap-2 border-2 rounded p-2 w-full"
                    >
                        <button
                            class="flex gap-1 items-center font-bold hover:cursor-pointer"
                            onclick={() => {
                                showAdd = !showAdd;
                            }}
                        >
                            {#if showAdd}
                                <Icon icon="fa:angle-down" />
                            {:else}
                                <Icon icon="fa:angle-right" />
                            {/if}
                            <p>Add</p>
                        </button>
                        {#if showAdd}
                            <div>
                                <p
                                    class="font-bold border-rfont-bold border border-gray-300 rounded-t p-1 inline-block border-b-0"
                                >
                                    Name
                                </p>
                                <textarea
                                    rows="1"
                                    class="overflow-hidden resize-none border border-gray-300 rounded-b rounded-tr p-1 focus:outline-none focus:ring-2 w-full"
                                    placeholder="my cool template"
                                ></textarea>
                            </div>
                            <div>
                                <p
                                    class="font-bold border-rfont-bold border border-gray-300 rounded-t p-1 inline-block border-b-0"
                                >
                                    Type
                                </p>
                                <select
                                    class="border border-gray-300 rounded-b rounded-tr p-1 focus:outline-none focus:ring-2 w-full"
                                    bind:value={rawTemplate.type}
                                >
                                    <option value="expression"
                                        >Expression</option
                                    >
                                    <option value="javascript"
                                        >JavaScript</option
                                    >
                                </select>
                            </div>
                            <div>
                                <p
                                    class="font-bold border-rfont-bold border border-gray-300 rounded-t p-1 inline-block border-b-0"
                                >
                                    Parameters
                                </p>
                                <textarea
                                    rows="1"
                                    class="w-full overflow-hidden resize-none border border-gray-300 rounded-b rounded-tr p-1 focus:outline-none focus:ring-2"
                                    placeholder={rawTemplate.type ===
                                    "javascript"
                                        ? javascriptParameterPlaceholder
                                        : expressionParameterPlaceholder}
                                ></textarea>
                            </div>
                            <div>
                                <p
                                    class="font-bold border-rfont-bold border border-gray-300 rounded-t p-1 inline-block border-b-0"
                                >
                                    {rawTemplate.type === "javascript"
                                        ? "Code"
                                        : "Expression"}
                                </p>
                                {#if rawTemplate.type === "javascript"}
                                    <textarea
                                        rows="10"
                                        class="resize-none border border-gray-300 rounded-b rounded-tr p-1 focus:outline-none focus:ring-2 w-full"
                                        placeholder={javascriptContentPlaceholder}
                                    ></textarea>
                                {:else}
                                    <textarea
                                        rows="1"
                                        class="overflow-hidden resize-none border border-gray-300 rounded-b rounded-tr p-1 focus:outline-none focus:ring-2 w-full"
                                        placeholder={expressionContentPlaceholder}
                                    ></textarea>
                                {/if}
                            </div>
                        {/if}
                        {#each templates as template}
                            <div class="p-2 border-2">
                                {template.name}
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        {:else}
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
