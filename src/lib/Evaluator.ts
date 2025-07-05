// import ScientificNumber from "./ScientificNumber.ts";
// import calculateMolarMass from "./MolarMass.ts";
import ScientificNumber from "./ScientificNumber";
import calculateMolarMass from "./MolarMass";

type Token = string;

class Evaluator {
    functions: Record<string, (args: ScientificNumber[]) => ScientificNumber> = {};
    ans: ScientificNumber | null;

    constructor(ans: ScientificNumber | null = null) {
        this.functions["sqrt"] = ([x]) => x.sqrt();
        this.functions["ln"] = ([x]) => x.ln();

        this.ans = ans;
    }

    // private replaceMolarMass(expr: string): string {
    //     return expr.replace(/M\(([A-Za-z0-9()]+)\)/g, (_, formula) => {
    //         const mass = calculateMolarMass(formula);
    //         return mass.toString();
    //     });
    // }

    // private replaceAnswer(expr: string): string {
    //     return expr.replace("Ans", (this.ans ?? 0).toString());
    // }

    evaluate(expr: string): ScientificNumber {
        // const replacedExpr = this.replaceAnswer(this.replaceMolarMass(expr));
        const tokens = this.tokenize(expr);
        const rpn = this.toRPN(tokens);
        return this.evalRPN(rpn);
    }

    tokenize(expr: string): Token[] {
        const tokenRegex = /M\([^()]*\)|\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?|Ans|[()+\-*/^]|\w+/g;
        return expr.match(tokenRegex) ?? [];
    }

    toRPN(tokens: Token[]): Token[] {
        const precedence: Record<string, number> = {
            '+': 1,
            '-': 1,
            '*': 2,
            '/': 2,
            '^': 3,
        };

        const output: Token[] = [];
        const operators: Token[] = [];

        for (const token of tokens) {
            if (!isNaN(Number(token))) {
                output.push(token);
            } else if (this.functions[token]) {
                operators.push(token);
            } else if (token === '(') {
                operators.push(token);
            } else if (token === ')') {
                while (operators.length && operators[operators.length - 1] !== '(') {
                    output.push(operators.pop()!);
                }
                operators.pop(); // Remove '('
                if (operators.length && this.functions[operators[operators.length - 1]]) {
                    output.push(operators.pop()!);
                }
            } else if (['+', '-', '*', '/', '^'].includes(token)) {
                while (
                    operators.length &&
                    precedence[operators[operators.length - 1]] >= precedence[token]
                ) {
                    output.push(operators.pop()!);
                }
                operators.push(token);
            } else if (token.startsWith('M(') && token.endsWith(')')) {
                const match = token.match(/^M\(([^()]*)\)$/);
                if (match) {
                    const innerPart = match[1];
                    output.push(calculateMolarMass(innerPart).toString());
                } else {
                    throw new Error(`Invalid M(...) expression: ${token}`);
                }
            } else if (token === "Ans") {
                output.push((this.ans ?? 0).toString());
            }
        }

        while (operators.length) {
            output.push(operators.pop()!);
        }

        return output;
    }

    evalRPN(tokens: Token[]): ScientificNumber {
        const stack: ScientificNumber[] = [];

        for (const token of tokens) {
            if (!isNaN(Number(token))) {
                stack.push(ScientificNumber.fromNumber(Number(token)));
            } else if (['+', '-', '*', '/', '^'].includes(token)) {
                const b = stack.pop()!;
                const a = stack.pop()!;
                switch (token) {
                    case '+': stack.push(a.add(b)); break;
                    case '-': stack.push(a.sub(b)); break;
                    case '*': stack.push(a.mul(b)); break;
                    case '/': stack.push(a.div(b)); break;
                    case '^': stack.push(a.exp(b)); break;
                }
            } else if (this.functions[token]) {
                const args = [stack.pop()!];
                stack.push(this.functions[token](args));
            } else {
                throw new Error(`Unknown token: ${token}`);
            }
        }

        return stack[0];
    }
}

export default Evaluator;
