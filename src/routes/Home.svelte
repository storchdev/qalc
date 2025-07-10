<script lang="ts">
    import Evaluator from "../lib/evaluator";
    import { Fa } from "svelte-fa";
    import {
        faChevronDown,
        faChevronRight,
        faTrash,
    } from "@fortawesome/free-solid-svg-icons";
    import StorageState from "../lib/storageState.svelte";
    import CalcState from "../lib/calcState.svelte";
    import type { Template, RawTemplate, Keybinds } from "../lib/interfaces";
    import TemplateState from "../lib/templateState.svelte";
    import ScientificNumber from "../lib/scientificNumber";

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

    //  Main state
    const mainTextArea: HTMLTextAreaElement =
        document.createElement("textarea");
    // dummy element
    const storage: StorageState = new StorageState();
    const mainState: CalcState = new CalcState(mainTextArea, storage);

    // Dropdown state
    let showTemplates = $state(true); // change to false for real
    let showAdd = $state(false); // change to false for real
    let rawTemplate: RawTemplate = $state({
        name: "",
        type: "expression",
        parameters: "",
        content: "",
    });

    // Top bar state
    let showSettings: boolean = $state(false);
    let settingsText = $derived(showSettings ? "Back" : "Settings");
    let keybindsText = $derived(
        mainState.useKeybinds ? "Keybinds: on" : "Keybinds: off",
    );

    let template: Template | undefined = $state();

    function getTemplateState(t: Template | undefined) {
        if (t === undefined) return undefined;
        return new TemplateState(t, storage.keybinds);
    }
    let templateState = $derived(getTemplateState(template));

    // Param textarea
    const paramTextArea: HTMLTextAreaElement =
        document.createElement("textarea");

    let paramAreaState = new CalcState(paramTextArea, storage);

    function handleParamKey(e: KeyboardEvent) {
        let eKey = e.key;
        if (e.key === " ") {
            eKey = "Space";
        } else if (e.key === "`") {
            eKey = "Backtick";
        }

        let key = storage.keybinds[eKey] ?? e.key;

        if (key === "Escape") {
            template = undefined;
            mainState.textarea.focus();
            return;
        }

        if (key === "Tab" && templateState) {
            e.preventDefault();
            const isLast = templateState.pushValue(
                paramAreaState.textarea.value,
            );
            paramAreaState.textarea.value = "";

            if (isLast) {
                const t = templateState.template;
                let insertedText: string;

                if (t.type === "javascript") {
                    let numericArgs: number[] = [];
                    const tempE = new Evaluator(mainState.ans);

                    for (const str of templateState.values) {
                        try {
                            numericArgs.push(tempE.evaluate(str).toNumber());
                        } catch (error: unknown) {
                            alert(`error in evaluating parameter: ${str}`);
                            template = undefined;
                            return;
                        }
                    }

                    let templateAns;
                    try {
                        const f = new Function(...t.parameters, t.content);
                        templateAns = f(...numericArgs);
                    } catch (error: unknown) {
                        alert(`code errored: ${error}`);
                        template = undefined;
                        return;
                    }

                    if (typeof templateAns !== "number") {
                        alert("code did not return a number!");
                        template = undefined;
                        return;
                    }

                    insertedText = ScientificNumber.fromNumber(
                        templateAns,
                    ).toRoundedString(storage.maxDigits);
                } else {
                    let i = 0;
                    let v;
                    insertedText = t.content.replace(/\{[^}]+\}/g, () => {
                        v = templateState.values[i];
                        i++;
                        return v;
                    });
                }
                template = undefined;

                // insert text into main area
                const start = mainState.textarea.selectionStart;
                const end = mainState.textarea.selectionEnd;

                // Text before and after the current selection
                const before = mainState.textarea.value.substring(0, start);
                const after = mainState.textarea.value.substring(end);

                // Insert the text
                mainState.textarea.value = before + insertedText + after;

                // Move the cursor after the inserted text
                const newCursorPos = start + insertedText.length;
                mainState.textarea.selectionStart =
                    mainState.textarea.selectionEnd = newCursorPos;

                mainState.textarea.focus();
            }
        } else {
            paramAreaState.handleKey(e);
        }
    }

    // search state
    let search = $state("");
    let filteredTemplates = $derived(
        storage.templates.filter((t) =>
            t.name.toLowerCase().includes(search.toLowerCase()),
        ),
    );

    // Load keybinds from localStorage on mount
    // onMount(() => {
    //     storage.pullFromStorage();
    // });

    function handleAddTemplateClick() {
        if (rawTemplate.name === "") {
            alert("name cannot be empty!");
            return;
        }

        if (rawTemplate.name.length > 10) {
            alert("name must be 10 characters or under!");
            return;
        }

        for (const t of storage.templates) {
            if (t.name === rawTemplate.name) {
                alert("another template already has this name!");
                return;
            }
        }
        const parameters = rawTemplate.parameters.split(",");

        if (rawTemplate.parameters === "") {
            alert("include at least 1 parameter!");
            return;
        }

        for (const str of parameters) {
            try {
                new Function(`let ${str}`);
            } catch (e) {
                alert(`invalid parameter name: ${str}`);
                return;
            }
        }

        if (rawTemplate.type === "expression") {
            const matches = [
                ...rawTemplate.content.matchAll(/\{([^}]+)\}/g),
            ].map((m) => m[1]);

            if (matches.length === 0) {
                alert(
                    "include at least 1 parameter in this expression! (use {})",
                );
                return;
            }

            for (const match of matches) {
                if (!parameters.includes(match)) {
                    alert(
                        `expression includes unspecified parameter: ${match}`,
                    );
                    return;
                }
            }

            try {
                const testExpr = rawTemplate.content.replace(
                    /\{[^}]+\}/g,
                    () => "1",
                );
                const evaluator = new Evaluator();
                evaluator.evaluate(testExpr);
            } catch (e) {
                alert("expression contains a syntax error!");
                return;
            }
        } else if (rawTemplate.type === "javascript") {
            let testFunc;
            try {
                testFunc = Function(...parameters, rawTemplate.content);
            } catch (e) {
                alert(`code failed to compile: ${e}`);
                return;
            }
            let testReturn;
            try {
                const testArgs = parameters.map((v, i) => i);
                testReturn = testFunc(...testArgs);
            } catch (e) {
                alert(`code failed to run on test arguments: ${e}`);
                return;
            }
            if (typeof testReturn !== "number") {
                alert(`code did not return a number!`);
            }
        } else {
            alert("unknown template type!");
            return;
        }

        showAdd = false;
        const template: Template = {
            name: rawTemplate.name,
            type: rawTemplate.type,
            parameters: parameters,
            content: rawTemplate.content,
        };
        storage.pushTemplate(template);
    }
</script>

<main>
    <div class="absolute top-0 m-2 flex flex-col gap-2 text-[0.5rem]">
        <div class="inline-block font-bold">
            <button
                class="p-2 font-bold border-2 rounded hover:cursor-pointer"
                onclick={() => {
                    showSettings = !showSettings;
                }}
            >
                {settingsText}
            </button>
            <a
                class="p-2 font-bold border-2 rounded hover:cursor-pointer"
                href="https://github.com/storchdev/qalc"
            >
                Info
            </a>
        </div>
        <button
            class="p-2 font-bold border-2 rounded hover:cursor-pointer"
            onclick={() => {
                mainState.useKeybinds = !mainState.useKeybinds;
                paramAreaState.useKeybinds = !paramAreaState.useKeybinds;
            }}
        >
            {keybindsText}
        </button>
    </div>
    <!-- <textarea class="p-2 font-mono border-2 rounded" rows="1"></textarea> -->
    <div class="flex justify-center">
        <div
            class="flex flex-col items-center justify-center gap-4 mt-32 xl:w-[50%] lg:w-[60%] md:w-[75%] w-[90%]"
        >
            {#if !showSettings}
                <div class="flex flex-col items-end gap-4 p-2 w-full">
                    <button
                        class="text-gray-500 hover:cursor-pointer"
                        onclick={mainState.handleExprClick}
                    >
                        {mainState.expr}
                    </button>
                    <button
                        class="font-bold hover:cursor-pointer"
                        onclick={mainState.handleAnsClick}
                    >
                        = {mainState.ans.toRoundedString(storage.maxDigits)}
                    </button>
                </div>
                <textarea
                    bind:this={mainState.textarea}
                    id="textarea"
                    onkeydown={mainState.handleKey}
                    onwheel={mainState.handleScroll}
                    class="w-full h-auto p-2 overflow-hidden font-mono border-2 rounded resize-none whitespace-nowrap"
                    rows="1"
                ></textarea>
                {#if template}
                    <div class="text-[0.5rem] flex gap-2 items-center">
                        <textarea
                            bind:this={paramAreaState.textarea}
                            onkeydown={handleParamKey}
                            class="p-[2px] pl-1 overflow-hidden border-2 rounded resize-none whitespace-nowrap"
                            rows="1"
                            placeholder={templateState?.paramName}
                        ></textarea>
                        {#if !templateState?.isLastParam}
                            <p>
                                Press {templateState?.nextParamKey} to input the
                                next parameter!
                            </p>
                        {:else}
                            <p>
                                Press {templateState?.nextParamKey} to finish!
                            </p>
                        {/if}
                    </div>
                {/if}
                <p class="text-red-700 font-bold text-[0.5rem]">
                    {mainState.errorLine}
                </p>
                <div class="flex flex-col gap-1 w-full text-[0.5rem]">
                    <button
                        class="flex items-center gap-1 font-bold hover:cursor-pointer"
                        onclick={() => {
                            showTemplates = !showTemplates;
                        }}
                    >
                        {#if showTemplates}
                            <Fa icon={faChevronDown} />
                        {:else}
                            <Fa icon={faChevronRight} />
                        {/if}
                        <p>Templates</p>
                    </button>
                    {#if showTemplates}
                        <div class="flex flex-col w-full gap-2 pl-4">
                            <button
                                class="flex items-center gap-1 font-bold hover:cursor-pointer"
                                onclick={() => {
                                    showAdd = !showAdd;
                                }}
                            >
                                {#if showAdd}
                                    <Fa icon={faChevronDown} />
                                {:else}
                                    <Fa icon={faChevronRight} />
                                {/if}
                                <p>Add</p>
                            </button>
                            {#if showAdd}
                                <div class="flex flex-col gap-2 pl-4">
                                    <div>
                                        <p
                                            class="inline-block p-1 font-bold border border-b-0 border-gray-300 rounded-t border-rfont-bold"
                                        >
                                            Name
                                        </p>
                                        <textarea
                                            rows="1"
                                            class="w-full p-1 overflow-hidden border border-gray-300 rounded-b rounded-tr resize-none focus:outline-none focus:ring-2"
                                            placeholder="my cool template"
                                            bind:value={rawTemplate.name}
                                        ></textarea>
                                    </div>
                                    <div>
                                        <p
                                            class="inline-block p-1 font-bold border border-b-0 border-gray-300 rounded-t border-rfont-bold"
                                        >
                                            Type
                                        </p>
                                        <select
                                            class="w-full p-1 border border-gray-300 rounded-b rounded-tr focus:outline-none focus:ring-2"
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
                                            class="inline-block p-1 font-bold border border-b-0 border-gray-300 rounded-t border-rfont-bold"
                                        >
                                            Parameters
                                        </p>
                                        <textarea
                                            rows="1"
                                            class="w-full p-1 overflow-hidden border border-gray-300 rounded-b rounded-tr resize-none focus:outline-none focus:ring-2"
                                            placeholder={rawTemplate.type ===
                                            "javascript"
                                                ? javascriptParameterPlaceholder
                                                : expressionParameterPlaceholder}
                                            bind:value={rawTemplate.parameters}
                                        ></textarea>
                                    </div>
                                    <div>
                                        <p
                                            class="inline-block p-1 font-bold border border-b-0 border-gray-300 rounded-t border-rfont-bold"
                                        >
                                            {rawTemplate.type === "javascript"
                                                ? "Code"
                                                : "Expression"}
                                        </p>
                                        {#if rawTemplate.type === "javascript"}
                                            <textarea
                                                rows="10"
                                                class="w-full p-1 border border-gray-300 rounded-b rounded-tr resize-none focus:outline-none focus:ring-2"
                                                placeholder={javascriptContentPlaceholder}
                                                bind:value={rawTemplate.content}
                                            ></textarea>
                                        {:else}
                                            <textarea
                                                rows="1"
                                                class="w-full p-1 overflow-hidden border border-gray-300 rounded-b rounded-tr resize-none focus:outline-none focus:ring-2"
                                                placeholder={expressionContentPlaceholder}
                                                bind:value={rawTemplate.content}
                                            ></textarea>
                                        {/if}
                                    </div>
                                    <div>
                                        <button
                                            class="inline-block p-1 font-bold bg-gray-300 border-2 rounded hover:cursor-pointer"
                                            onclick={handleAddTemplateClick}
                                            >Add</button
                                        >
                                    </div>
                                </div>
                            {/if}
                            <!-- <div
                            class="grid grid-cols-1 gap-2 p-2 rounded border-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                        > -->
                            <div class="border-gray-300 border-1 rounded p-2">
                                <!-- search box goes here -->
                                <input
                                    type="text"
                                    bind:value={search}
                                    placeholder="Search templates..."
                                    class="w-full p-1 mb-2 border border-gray-400 rounded"
                                />
                                <div
                                    class="grid grid-cols-1 gap-2 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                                >
                                    <!-- <div class="grid grid-cols-1 gap-2"> -->
                                    {#each filteredTemplates as t}
                                        <div
                                            class="p-1 font-bold border-2 bg-gray-200 flex justify-between items-center"
                                        >
                                            <button
                                                class="hover:cursor-pointer"
                                                onclick={() => {
                                                    template = t;
                                                    setTimeout(() => {
                                                        paramAreaState.textarea.focus();
                                                    }, 100); //janky
                                                }}
                                            >
                                                {t.name}
                                            </button>
                                            <button
                                                class="hover:cursor-pointer"
                                                onclick={() => {
                                                    storage.removeTemplate(t);
                                                }}
                                            >
                                                <Fa icon={faTrash} />
                                            </button>
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        </div>
                    {/if}
                </div>
            {:else}
                <div class="flex gap-4">
                    <button
                        class="rounded p-2 border-2 text-[0.5em] hover:cursor-pointer"
                        onclick={storage.setOneHandedKeybinds}
                    >
                        Use one-handed preset
                    </button>
                    <button
                        class="rounded p-2 border-2 text-[0.5em] hover:cursor-pointer"
                        onclick={storage.clearKeybinds}
                    >
                        Clear keybinds
                    </button>
                </div>
                <div class="flex gap-4">
                    <button
                        class="rounded p-2 border-2 text-[0.5em] hover:cursor-pointer"
                        onclick={storage.handleImport}
                    >
                        Import data from file
                    </button>
                    <button
                        class="rounded p-2 border-2 text-[0.5em] hover:cursor-pointer"
                        onclick={storage.handleExport}
                    >
                        Export data to file
                    </button>
                </div>
                <div class="flex gap-4">
                    <button
                        class="rounded p-2 border-2 text-[0.5em] hover:cursor-pointer"
                        onclick={storage.clearHistory}
                    >
                        Clear history
                    </button>
                </div>
            {/if}
        </div>
    </div>
</main>
