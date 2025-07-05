class ScientificNumber {
    base: number;
    exponent: number;

    constructor(base: number, exponent: number) {
        if (base === 0) {
            this.base = 0;
            this.exponent = 0;
        } else {
            const exp = Math.floor(Math.log10(Math.abs(base)));
            const normalizedBase = base / Math.pow(10, exp);
            this.base = normalizedBase;
            this.exponent = exponent + exp;
        }
    }

    static fromNumber(num: number): ScientificNumber {
        if (num === 0) return new ScientificNumber(0, 0);
        const exp = Math.floor(Math.log10(Math.abs(num)));
        const base = num / Math.pow(10, exp);
        return new ScientificNumber(base, exp);
    }

    toNumber(): number {
        return this.base * Math.pow(10, this.exponent);
    }

    add(other: ScientificNumber): ScientificNumber {
        const a = this.toNumber();
        const b = other.toNumber();
        return ScientificNumber.fromNumber(a + b);
    }

    sub(other: ScientificNumber): ScientificNumber {
        const a = this.toNumber();
        const b = other.toNumber();
        return ScientificNumber.fromNumber(a - b);
    }

    mul(other: ScientificNumber): ScientificNumber {
        const newBase = this.base * other.base;
        const newExp = this.exponent + other.exponent;
        return new ScientificNumber(newBase, newExp);
    }

    div(other: ScientificNumber): ScientificNumber {
        const newBase = this.base / other.base;
        const newExp = this.exponent - other.exponent;
        return new ScientificNumber(newBase, newExp);
    }

    exp(other: ScientificNumber): ScientificNumber {
        const newBase = Math.pow(this.base, other.base * Math.pow(10, other.exponent));
        const newExp = Math.pow(10, this.exponent * other.base * Math.pow(10, other.exponent));
        return new ScientificNumber(newBase, newExp);
    }

    ln(): ScientificNumber {
        const newBase = Math.log(this.base) + this.exponent * Math.log(10);
        return new ScientificNumber(newBase, 0);
    }

    sqrt(): ScientificNumber {
        const newBase = Math.sqrt(this.base);
        const isEven = this.exponent % 2 === 0;
        const halfExp = this.exponent / 2;

        if (isEven) {
            return new ScientificNumber(newBase, halfExp);
        } else {
            // sqrt(10) ≈ 3.1623
            return new ScientificNumber(newBase * Math.sqrt(10), Math.floor(halfExp));
        }
    }

    toString(): string {
        return `${this.base}e${this.exponent}`;
    }

    roundFloat(n: number, max_digits: number): string {
        return n.toFixed(max_digits)
            .toString()
            .replace(/(\.\d*?[1-9])0+$/g, '$1')  // remove trailing zeros
            .replace(/\.0+$/, '');
    }
    toRoundedString(max_digits: number = 6): string {
        if (this.exponent + 1 > max_digits) {
            // const base = this.base.toFixed(max_digits)
            //     .toString()
            //     .replace(/(\.\d*?[1-9])0+$/g, '$1')  // remove trailing zeros
            // .replace(/\.0+$/, '');
            const base = this.roundFloat(this.base, max_digits);
            return `${base}e${this.exponent}`;
        }
        else {
            return this.roundFloat(this.toNumber(), max_digits);
        }
    }
}


export default ScientificNumber;
