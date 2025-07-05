import Evaluator from "./Evaluator.ts";


const evaluator = new Evaluator(10);
// const result = evaluator.evaluate("111111111111111111111111111111111111111+sqrt(25)+3*2");
// const result = evaluator.evaluate("(M(H2O) /2)*1000000")
const result = evaluator.evaluate("Ans + 10")
console.log(result.toRoundedString());  // something like "7e0"
console.log(result.toNumber());  // 11

