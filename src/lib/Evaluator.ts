// import ScientificNumber from "./ScientificNumber.ts";
// import calculateMolarMass from "./MolarMass.ts";
import ScientificNumber from "./ScientificNumber";
import calculateMolarMass from "./MolarMass";

type Token = string;
type Precedence = "left" | "right";

enum TokenType {
    Number,
    Answer,
    OpenParen,
    CloseParen,
    Function,
    Operator,
    MolarMassFunction,
}

class Evaluator {
    functions: Record<string, (args: ScientificNumber[]) => ScientificNumber> = {};
    ans: ScientificNumber | null;

    constructor(ans: ScientificNumber | null = null) {
        this.functions["sqrt"] = ([x]) => x.sqrt();
        this.functions["ln"] = ([x]) => x.ln();

        this.ans = ans;
    }

    static getPrecedence(left: string, right: string): Precedence {
        const precedence: Record<string, number> = {
            '+': 1,
            '-': 1,
            '*': 2,
            '/': 2,
            'u-': 3,
            'i*': 3,
            '^': 4,
        };
        if (left === "^" && ["u-", "i*"].includes(right)) {
            return "right";
        } else if (left === "u-" && right === "u-") {
            return "right";
        } else if (left === "^" && right === "^") {
            return "right";
        } else if (left === right) {
            return "left";
        } else if (precedence[left] >= precedence[right]) {
            return "left";
        } else {
            return "right";
        }
    }

    evaluate(expr: string): ScientificNumber {
        // const replacedExpr = this.replaceAnswer(this.replaceMolarMass(expr));
        const tokens = this.tokenize(expr);
        const rpn = this.toRPN(tokens);
        return this.evalRPN(rpn);
    }

    insertImplicitMul(tokens: Token[]) {
        let left: TokenType;
        let right: TokenType;
        let i = 0;
        while (i < tokens.length - 1) {
            left = this.classifyToken(tokens[i]);
            right = this.classifyToken(tokens[i + 1]);
            if ([TokenType.CloseParen, TokenType.Number, TokenType.Answer].includes(left) && [TokenType.OpenParen, TokenType.Function, TokenType.MolarMassFunction].includes(right)) {
                tokens.splice(i + 1, 0, "i*");
                i += 2;
            }
            else {
                i++;
            }
        }
    }

    classifyToken(token: Token): TokenType {
        if (!isNaN(Number(token))) {
            return TokenType.Number;
        } else if (this.functions[token]) {
            return TokenType.Function;
        } else if (token === '(') {
            return TokenType.OpenParen;
        } else if (token === ')') {
            return TokenType.CloseParen;
        } else if (['+', '-', '*', '/', '^', 'i*'].includes(token)) {
            return TokenType.Operator
        } else if (token.startsWith('M(') && token.endsWith(')')) {
            return TokenType.MolarMassFunction;
        } else if (token === "Ans") {
            return TokenType.Answer;
        } else {
            throw Error("unrecognized token")
        }
    }

    tokenize(expr: string): Token[] {
        const tokenRegex = /M\([^()]*\)|\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?|Ans|[()+\-*/^]|\w+/g;
        const tokens = expr.match(tokenRegex) ?? [];
        this.insertImplicitMul(tokens);
        return tokens;
    }

    toRPN(tokens: Token[]): Token[] {
        const output: Token[] = [];
        const operators: Token[] = [];

        let prev: Token | null = null;
        let isUnary;
        let op;
        let match;

        for (const token of tokens) {
            switch (this.classifyToken(token)) {
                case TokenType.Number:
                    output.push(token);
                    break;
                case TokenType.Answer:
                    output.push((this.ans ?? 0).toString());
                    break;
                case TokenType.OpenParen:
                    operators.push(token);
                    break;
                case TokenType.CloseParen:
                    while (operators.length && operators[operators.length - 1] !== '(') {
                        output.push(operators.pop()!);
                    }
                    operators.pop(); // Remove '('
                    if (operators.length && this.functions[operators[operators.length - 1]]) {
                        output.push(operators.pop()!);
                    }
                    break;
                case TokenType.Function:
                    operators.push(token);
                    break;
                case TokenType.Operator:
                    isUnary = token === '-' && (prev === null || ['+', '-', '*', '/', '^', '('].includes(prev));
                    op = isUnary ? 'u-' : token;

                    while (
                        operators.length &&
                        Evaluator.getPrecedence(operators[operators.length - 1], op) === 'left'
                    ) {
                        output.push(operators.pop()!);
                    }
                    operators.push(op === "i*" ? "*" : op);
                    break;
                case TokenType.MolarMassFunction:
                    match = token.match(/^M\(([^()]*)\)$/);
                    if (match) {
                        const innerPart = match[1];
                        output.push(calculateMolarMass(innerPart).toString());
                    } else {
                        throw new Error(`Invalid M(...) expression: ${token}`);
                    }
                    break;
            }
            prev = token;
        }

        while (operators.length) {
            output.push(operators.pop()!);
        }

        return output;
    }

    evalRPN(tokens: Token[]): ScientificNumber {
        // console.table(tokens);
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
            } else if (token === 'u-') {
                const a = stack.pop()!;
                stack.push(ScientificNumber.fromNumber(-1).mul(a));
            } else {
                throw new Error(`Unknown token: ${token}`);
            }
        }

        return stack[0];
    }
}

export default Evaluator;
