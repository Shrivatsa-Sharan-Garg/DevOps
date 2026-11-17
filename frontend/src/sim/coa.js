const DIGITS="0123456789ABCDEF";

export function parseInBase(text, base){
    const value=String(text).trim().toUpperCase().replace(/^0X|^0B|^0O/, "");

    if(value === ""){
        throw new Error("Enter a number.");
    }

    const negative=base === 10 && value.startsWith("-");
    const digits=negative ? value.slice(1) : value;

    if(digits === ""){
        throw new Error("Enter a number.");
    }

    let result=0;

    for(const char of digits){
        const digit=DIGITS.indexOf(char);

        if(digit < 0 || digit >= base){
            throw new Error(`"${char}" is not a valid base-${base} digit.`);
        }

        result=result*base+digit;

        if(result > Number.MAX_SAFE_INTEGER){
            throw new Error("That number is too large for this tool.");
        }
    }

    return negative ? -result : result;
}

export function toBase(value, base, width=0){
    if(!Number.isInteger(value) || value < 0){
        throw new Error("Only non-negative whole numbers can be shown in this base.");
    }

    return value.toString(base).toUpperCase().padStart(width, "0");
}

export function signedRange(bits){
    return {min:-(2**(bits-1)),max:2**(bits-1)-1};
}

export function representations(value, bits){
    if(!Number.isInteger(bits) || bits < 2 || bits > 32){
        throw new Error("Choose a width between 2 and 32 bits.");
    }

    const range=signedRange(bits);
    const unsignedMax=2**bits-1;
    const result={bits,range,unsignedMax,value};

    result.unsigned=value >= 0 && value <= unsignedMax ? toBase(value, 2, bits) : null;

    const magnitude=Math.abs(value);
    const fitsSigned=value >= range.min && value <= range.max;

    if(magnitude <= 2**(bits-1)-1){
        result.signMagnitude=(value < 0 ? "1" : "0")+toBase(magnitude, 2, bits-1);
        const positive=toBase(magnitude, 2, bits);
        result.onesComplement=value < 0 ? [...positive].map((bit) => bit === "1" ? "0" : "1").join("") : positive;
    }else{
        result.signMagnitude=null;
        result.onesComplement=null;
    }

    result.twosComplement=fitsSigned ? toBase(value < 0 ? 2**bits+value : value, 2, bits) : null;
    result.overflow=!fitsSigned && result.unsigned === null;

    return result;
}

export function fromTwosComplement(bitString){
    if(!/^[01]+$/.test(bitString)){
        throw new Error("Enter only 0s and 1s.");
    }

    const unsigned=parseInt(bitString, 2);

    return bitString[0] === "1" ? unsigned-2**bitString.length : unsigned;
}

export function toBcd(value){
    if(!Number.isInteger(value) || value < 0){
        throw new Error("BCD here is shown for non-negative whole numbers.");
    }

    return String(value).split("").map((digit) => ({digit,code:Number(digit).toString(2).padStart(4, "0")}));
}

export function addBinary(left, right, bits){
    const mask=2**bits;
    const a=((left%mask)+mask)%mask;
    const b=((right%mask)+mask)%mask;
    const sum=a+b;
    const result=sum%mask;
    const signBit=2**(bits-1);
    const signedOverflow=((a & signBit) === (b & signBit)) && ((result & signBit) !== (a & signBit));

    return {result:toBase(result, 2, bits),carry:sum >= mask,overflow:signedOverflow,signed:fromTwosComplement(toBase(result, 2, bits))};
}

const OPERATORS={"AND":"&","OR":"|","NOT":"!","XOR":"^","NAND":"NAND","NOR":"NOR","XNOR":"XNOR"};

function tokenize(text){
    const tokens=[];
    const source=String(text).toUpperCase();
    let index=0;

    while(index < source.length){
        const char=source[index];

        if(/\s/.test(char)){
            index++;
            continue;
        }

        const word=source.slice(index).match(/^[A-Z]+/);

        if(word){
            const name=word[0];

            if(OPERATORS[name]){
                tokens.push({type:"op",value:OPERATORS[name]});
            }else if(/^[A-D]+$/.test(name)){
                // AB means A AND B, as in written Boolean algebra.
                for(const letter of name){
                    tokens.push({type:"var",value:letter});
                }
            }else{
                throw new Error(`Unknown name "${name}". Use variables A to D.`);
            }

            index+=name.length;
            continue;
        }

        if("·*&".includes(char)){
            tokens.push({type:"op",value:"&"});
        }else if("+|".includes(char)){
            tokens.push({type:"op",value:"|"});
        }else if("!~¬".includes(char)){
            tokens.push({type:"op",value:"!"});
        }else if(char === "^" || char === "⊕"){
            tokens.push({type:"op",value:"^"});
        }else if(char === "'"){
            tokens.push({type:"postnot"});
        }else if(char === "(" || char === ")"){
            tokens.push({type:char});
        }else if(char === "0" || char === "1"){
            tokens.push({type:"const",value:Number(char)});
        }else{
            throw new Error(`Unexpected character "${char}".`);
        }

        index++;
    }

    return tokens;
}

export function parseExpression(text){
    const tokens=tokenize(text);
    let position=0;

    const peek=() => tokens[position];
    const take=() => tokens[position++];

    function primary(){
        const token=take();

        if(!token){
            throw new Error("The expression ends too early.");
        }

        let node;

        if(token.type === "var"){
            node={type:"var",name:token.value};
        }else if(token.type === "const"){
            node={type:"const",value:token.value};
        }else if(token.type === "("){
            node=orLevel();

            if(take()?.type !== ")"){
                throw new Error("A closing bracket is missing.");
            }
        }else if(token.type === "op" && token.value === "!"){
            return {type:"not",child:primary()};
        }else{
            throw new Error("An operand is missing.");
        }

        while(peek()?.type === "postnot"){
            take();
            node={type:"not",child:node};
        }

        return node;
    }

    function andLevel(){
        let node=primary();

        while(true){
            const token=peek();

            if(token?.type === "op" && (token.value === "&" || token.value === "NAND")){
                take();
                node={type:token.value === "&" ? "and" : "nand",left:node,right:primary()};
            }else if(token && (token.type === "var" || token.type === "(" || token.type === "const" || (token.type === "op" && token.value === "!"))){
                node={type:"and",left:node,right:primary()};
            }else{
                return node;
            }
        }
    }

    function xorLevel(){
        let node=andLevel();

        while(peek()?.type === "op" && (peek().value === "^" || peek().value === "XNOR")){
            const operator=take().value;
            node={type:operator === "^" ? "xor" : "xnor",left:node,right:andLevel()};
        }

        return node;
    }

    function orLevel(){
        let node=xorLevel();

        while(peek()?.type === "op" && (peek().value === "|" || peek().value === "NOR")){
            const operator=take().value;
            node={type:operator === "|" ? "or" : "nor",left:node,right:xorLevel()};
        }

        return node;
    }

    if(tokens.length === 0){
        throw new Error("Enter an expression.");
    }

    const tree=orLevel();

    if(position < tokens.length){
        throw new Error("The expression has extra symbols at the end.");
    }

    return tree;
}

export function evaluate(node, values){
    switch(node.type){
        case "var":
            return values[node.name];
        case "const":
            return node.value;
        case "not":
            return evaluate(node.child, values) ? 0 : 1;
        case "and":
            return evaluate(node.left, values) & evaluate(node.right, values);
        case "or":
            return evaluate(node.left, values) | evaluate(node.right, values);
        case "xor":
            return evaluate(node.left, values) ^ evaluate(node.right, values);
        case "nand":
            return 1-(evaluate(node.left, values) & evaluate(node.right, values));
        case "nor":
            return 1-(evaluate(node.left, values) | evaluate(node.right, values));
        default:
            return 1-(evaluate(node.left, values) ^ evaluate(node.right, values));
    }
}

function collectVariables(node, found=new Set()){
    if(node.type === "var"){
        found.add(node.name);
    }

    for(const child of [node.child, node.left, node.right]){
        if(child){
            collectVariables(child, found);
        }
    }

    return found;
}

export function truthTable(text){
    const tree=parseExpression(text);
    const variables=[...collectVariables(tree)].sort();
    const rows=[];

    for(let index=0;index < 2**variables.length;index++){
        const values={};

        variables.forEach((name, position) => {
            values[name]=(index >> (variables.length-1-position)) & 1;
        });

        rows.push({index,values,output:evaluate(tree, values)});
    }

    return {variables,rows,minterms:rows.filter((row) => row.output === 1).map((row) => row.index)};
}

export const GATES={
    AND:(a, b) => a & b,
    OR:(a, b) => a | b,
    NOT:(a) => 1-a,
    NAND:(a, b) => 1-(a & b),
    NOR:(a, b) => 1-(a | b),
    XOR:(a, b) => a ^ b,
    XNOR:(a, b) => 1-(a ^ b)
};

function countOnes(value){
    let count=0;

    for(let rest=value;rest;rest>>=1){
        count+=rest & 1;
    }

    return count;
}

function implicantCovers(implicant, minterm){
    return (minterm & ~implicant.mask) === (implicant.value & ~implicant.mask);
}

export function minimize(minterms, variableCount, dontCares=[]){
    if(variableCount < 1 || variableCount > 4){
        throw new Error("Use between 1 and 4 variables.");
    }

    const all=[...new Set([...minterms, ...dontCares])].sort((a, b) => a-b);

    if(minterms.length === 0){
        return {expression:"0",implicants:[]};
    }

    if(all.length === 2**variableCount){
        return {expression:"1",implicants:[{value:0,mask:2**variableCount-1}]};
    }

    let current=all.map((value) => ({value,mask:0,used:false}));
    const primes=[];

    while(current.length){
        const next=[];
        const seen=new Set();

        for(let first=0;first < current.length;first++){
            for(let second=first+1;second < current.length;second++){
                const left=current[first];
                const right=current[second];
                const difference=left.value ^ right.value;

                if(left.mask === right.mask && countOnes(difference) === 1){
                    left.used=true;
                    right.used=true;
                    const merged={value:left.value & ~difference,mask:left.mask | difference,used:false};
                    const key=`${merged.value}-${merged.mask}`;

                    if(!seen.has(key)){
                        seen.add(key);
                        next.push(merged);
                    }
                }
            }
        }

        for(const item of current){
            if(!item.used && !primes.some((prime) => prime.value === item.value && prime.mask === item.mask)){
                primes.push({value:item.value,mask:item.mask});
            }
        }

        current=next;
    }

    const cover=chooseCover(primes, minterms);

    return {expression:cover.map((implicant) => implicantToTerm(implicant, variableCount)).join(" + "),implicants:cover};
}

function chooseCover(primes, minterms){
    const useful=primes.filter((prime) => minterms.some((minterm) => implicantCovers(prime, minterm)));
    let best=null;

    // Few prime implicants exist for four variables, so every combination can be tried.
    for(let pick=1;pick < 2**useful.length;pick++){
        const chosen=useful.filter((_, index) => (pick >> index) & 1);

        if(!minterms.every((minterm) => chosen.some((prime) => implicantCovers(prime, minterm)))){
            continue;
        }

        const literals=chosen.reduce((total, prime) => total+(4-countOnes(prime.mask)), 0);

        if(!best || chosen.length < best.chosen.length || (chosen.length === best.chosen.length && literals < best.literals)){
            best={chosen,literals};
        }
    }

    return best.chosen;
}

export function implicantToTerm(implicant, variableCount){
    const names="ABCD".slice(0, variableCount);
    let term="";

    for(let position=0;position < variableCount;position++){
        const bit=1 << (variableCount-1-position);

        if(implicant.mask & bit){
            continue;
        }

        term+=names[position]+((implicant.value & bit) ? "" : "'");
    }

    return term || "1";
}

export function implicantCoversCell(implicant, minterm){
    return implicantCovers(implicant, minterm);
}

export const GRAY_CODE={1:[0, 1],2:[0, 1, 3, 2]};

export function kmapLayout(variableCount){
    const rowBits=Math.floor(variableCount/2);
    const columnBits=variableCount-rowBits;
    const rows=rowBits === 0 ? [0] : GRAY_CODE[rowBits];
    const columns=GRAY_CODE[columnBits];

    return {
        rowBits,
        columnBits,
        rows,
        columns,
        cell:(row, column) => (row << columnBits) | column
    };
}

const REGISTER_COUNT=8;
export const MEMORY_SIZE=32;
const WORD_BITS=16;
const MAX_STEPS=2000;

const FORMATS={
    MOV:["reg", "regOrImm"],
    LOAD:["reg", "addr"],
    STORE:["reg", "addr"],
    ADD:["reg", "reg", "regOrImm"],
    SUB:["reg", "reg", "regOrImm"],
    AND:["reg", "reg", "regOrImm"],
    OR:["reg", "reg", "regOrImm"],
    CMP:["reg", "regOrImm"],
    JMP:["label"],
    JZ:["label"],
    JNZ:["label"],
    JN:["label"],
    HALT:[]
};

function parseOperand(text, kind, labels, lineNumber){
    const value=text.trim().toUpperCase();
    const fail=(message) => {
        throw new Error(`Line ${lineNumber}: ${message}`);
    };

    if(kind === "reg"){
        const match=value.match(/^R([0-7])$/);

        if(!match){
            fail(`"${text.trim()}" is not a register. Use R0 to R7.`);
        }

        return {kind:"reg",index:Number(match[1])};
    }

    if(kind === "regOrImm"){
        if(value.startsWith("#")){
            const number=Number(value.slice(1));

            if(!Number.isInteger(number)){
                fail(`"${text.trim()}" is not a whole number.`);
            }

            return {kind:"imm",value:number};
        }

        return parseOperand(text, "reg", labels, lineNumber);
    }

    if(kind === "addr"){
        const indirect=value.match(/^\[(R[0-7])\]$/);

        if(indirect){
            return {kind:"indirect",index:Number(indirect[1].slice(1))};
        }

        const direct=value.replace(/^\[|\]$/g, "");
        const number=Number(direct);

        if(!Number.isInteger(number) || number < 0 || number >= MEMORY_SIZE){
            fail(`Memory address "${text.trim()}" must be 0 to ${MEMORY_SIZE-1}, or [Rn].`);
        }

        return {kind:"addr",value:number};
    }

    if(!labels.has(value)){
        fail(`Label "${text.trim()}" is not defined.`);
    }

    return {kind:"label",target:labels.get(value),name:value};
}

export function assemble(source){
    const lines=String(source).split("\n");
    const labels=new Map();
    const pending=[];

    lines.forEach((raw, index) => {
        let text=raw.replace(/;.*$/, "").trim();

        if(!text){
            return;
        }

        const label=text.match(/^([A-Za-z_]\w*):/);

        if(label){
            const name=label[1].toUpperCase();

            if(labels.has(name)){
                throw new Error(`Line ${index+1}: label "${label[1]}" is defined twice.`);
            }

            labels.set(name, pending.length);
            text=text.slice(label[0].length).trim();
        }

        if(text){
            pending.push({text,lineNumber:index+1});
        }
    });

    if(pending.length === 0){
        throw new Error("The program has no instructions.");
    }

    const program=pending.map(({text, lineNumber}) => {
        const [opcode, ...rest]=text.split(/\s+/);
        const name=opcode.toUpperCase();
        const format=FORMATS[name];

        if(!format){
            throw new Error(`Line ${lineNumber}: unknown instruction "${opcode}".`);
        }

        const operandText=rest.join(" ");
        const operands=operandText ? operandText.split(",") : [];

        if(operands.length !== format.length){
            throw new Error(`Line ${lineNumber}: ${name} expects ${format.length} operand${format.length === 1 ? "" : "s"}.`);
        }

        return {
            opcode:name,
            operands:operands.map((operand, position) => parseOperand(operand, format[position], labels, lineNumber)),
            text:`${name} ${operands.map((item) => item.trim()).join(", ")}`.trim(),
            lineNumber
        };
    });

    return {program,labels:Object.fromEntries(labels)};
}

function wrap(value){
    const range=2**WORD_BITS;
    const wrapped=((value%range)+range)%range;

    return wrapped >= range/2 ? wrapped-range : wrapped;
}

export function createCpu(program, memory=[]){
    const cells=Array(MEMORY_SIZE).fill(0);

    memory.forEach((value, index) => {
        if(index < MEMORY_SIZE){
            cells[index]=wrap(value);
        }
    });

    return {
        program,
        pc:0,
        ir:null,
        registers:Array(REGISTER_COUNT).fill(0),
        memory:cells,
        flags:{zero:false,negative:false},
        phase:"fetch",
        decoded:null,
        alu:null,
        cycle:0,
        executed:0,
        halted:false,
        error:null,
        lastWrite:null,
        trace:[]
    };
}

function read(state, operand){
    return operand.kind === "imm" ? operand.value : state.registers[operand.index];
}

function address(state, operand){
    const target=operand.kind === "indirect" ? state.registers[operand.index] : operand.value;

    if(!Number.isInteger(target) || target < 0 || target >= MEMORY_SIZE){
        throw new Error(`Address ${target} is outside memory (0 to ${MEMORY_SIZE-1}).`);
    }

    return target;
}

function setFlags(state, value){
    state.flags={zero:value === 0,negative:value < 0};
}

const ALU_OPS={
    ADD:{symbol:"+",apply:(a, b) => a+b},
    SUB:{symbol:"-",apply:(a, b) => a-b},
    AND:{symbol:"AND",apply:(a, b) => a & b},
    OR:{symbol:"OR",apply:(a, b) => a | b},
    CMP:{symbol:"-",apply:(a, b) => a-b}
};

function execute(state){
    const {opcode, operands}=state.decoded;
    const [first, second, third]=operands;
    let description="";

    state.alu=null;
    state.lastWrite=null;

    if(opcode === "MOV"){
        state.registers[first.index]=wrap(read(state, second));
        description=`R${first.index} ← ${state.registers[first.index]}`;
    }else if(opcode === "LOAD"){
        const target=address(state, second);
        state.registers[first.index]=state.memory[target];
        description=`R${first.index} ← MEM[${target}] = ${state.memory[target]}`;
    }else if(opcode === "STORE"){
        const target=address(state, second);
        state.memory[target]=state.registers[first.index];
        state.lastWrite=target;
        description=`MEM[${target}] ← R${first.index} = ${state.registers[first.index]}`;
    }else if(ALU_OPS[opcode]){
        const op=ALU_OPS[opcode];
        const left=opcode === "CMP" ? state.registers[first.index] : state.registers[second.index];
        const right=opcode === "CMP" ? read(state, second) : read(state, third);
        const result=wrap(op.apply(left, right));

        state.alu={operation:opcode,left,right,symbol:op.symbol,result};
        setFlags(state, result);

        if(opcode === "CMP"){
            description=`Compare ${left} with ${right}: Z=${state.flags.zero ? 1 : 0}, N=${state.flags.negative ? 1 : 0}`;
        }else{
            state.registers[first.index]=result;
            description=`R${first.index} ← ${left} ${op.symbol} ${right} = ${result}`;
        }
    }else if(opcode === "HALT"){
        state.halted=true;
        description="Program halted.";
    }else{
        const conditions={JMP:true,JZ:state.flags.zero,JNZ:!state.flags.zero,JN:state.flags.negative};
        const taken=conditions[opcode];

        if(taken){
            state.pc=first.target;
        }

        description=taken ? `Jump to ${first.name} (PC ← ${first.target})` : `Condition false, continue at PC ${state.pc}`;
    }

    state.executed++;
    state.trace.push({cycle:state.cycle,pc:state.decoded.address,instruction:state.decoded.text,result:description});

    return description;
}

export function stepCpu(previous){
    if(previous.halted || previous.error){
        return previous;
    }

    const state={
        ...previous,
        registers:[...previous.registers],
        memory:[...previous.memory],
        flags:{...previous.flags},
        trace:[...previous.trace],
        cycle:previous.cycle+1
    };

    try{
        if(state.phase === "fetch"){
            if(state.pc < 0 || state.pc >= state.program.length){
                throw new Error(`PC ${state.pc} points outside the program. Add HALT at the end.`);
            }

            if(state.executed >= MAX_STEPS){
                throw new Error(`Stopped after ${MAX_STEPS} instructions. The program may loop forever.`);
            }

            const instruction=state.program[state.pc];
            state.ir={...instruction,address:state.pc};
            state.message=`Fetch: IR ← MEM[PC=${state.pc}] "${instruction.text}", then PC ← ${state.pc+1}`;
            state.pc++;
            state.alu=null;
            state.phase="decode";
        }else if(state.phase === "decode"){
            state.decoded=state.ir;
            state.message=`Decode: opcode ${state.ir.opcode}, operands ${state.ir.operands.map(describeOperand).join(", ") || "none"}`;
            state.phase="execute";
        }else{
            state.message=`Execute: ${execute(state)}`;
            state.phase="fetch";
        }
    }catch(error){
        state.error=error.message;
        state.message=`Error: ${error.message}`;
    }

    return state;
}

function describeOperand(operand){
    if(operand.kind === "reg"){
        return `R${operand.index}`;
    }

    if(operand.kind === "imm"){
        return `#${operand.value}`;
    }

    if(operand.kind === "addr"){
        return `address ${operand.value}`;
    }

    if(operand.kind === "indirect"){
        return `address in R${operand.index}`;
    }

    return `label ${operand.name}`;
}

export function runCpu(state, limit=MAX_STEPS*3+3){
    let current=state;

    for(let step=0;step < limit && !current.halted && !current.error;step++){
        current=stepCpu(current);
    }

    return current;
}

export function simulateCache({addresses, lines, blockSize, associativity, policy="LRU"}){
    if(![1, 2, 4, 8, 16].includes(lines)){
        throw new Error("Use 1, 2, 4, 8 or 16 cache lines.");
    }

    if(![1, 2, 4, 8].includes(blockSize)){
        throw new Error("Use a block size of 1, 2, 4 or 8 words.");
    }

    if(associativity < 1 || associativity > lines || lines%associativity !== 0){
        throw new Error("Ways must divide the number of lines.");
    }

    const sets=lines/associativity;
    const cache=Array.from({length:sets}, () => []);
    const accesses=[];
    let clock=0;

    for(const address of addresses){
        if(!Number.isInteger(address) || address < 0 || address > 4095){
            throw new Error(`Address "${address}" must be a whole number from 0 to 4095.`);
        }

        clock++;
        const block=Math.floor(address/blockSize);
        const set=block%sets;
        const tag=Math.floor(block/sets);
        const ways=cache[set];
        const hit=ways.find((way) => way.tag === tag);
        let evicted=null;

        if(hit){
            if(policy === "LRU"){
                hit.used=clock;
            }
        }else{
            if(ways.length === associativity){
                const victim=ways.reduce((oldest, way) => (policy === "LRU" ? way.used < oldest.used : way.loaded < oldest.loaded) ? way : oldest);
                evicted=victim.block;
                ways.splice(ways.indexOf(victim), 1);
            }

            ways.push({tag,block,used:clock,loaded:clock});
        }

        accesses.push({address,block,set,tag,hit:Boolean(hit),evicted,snapshot:cache.map((items) => items.map((way) => way.block))});
    }

    const hits=accesses.filter((access) => access.hit).length;

    return {accesses,hits,misses:accesses.length-hits,hitRate:accesses.length ? hits/accesses.length : 0,sets};
}

export function translateAddress(virtualAddress, pageSize, pageTable){
    if(!Number.isInteger(pageSize) || pageSize < 1 || (pageSize & (pageSize-1)) !== 0){
        throw new Error("The page size must be a power of two.");
    }

    if(!Number.isInteger(virtualAddress) || virtualAddress < 0){
        throw new Error("Enter a non-negative virtual address.");
    }

    const page=Math.floor(virtualAddress/pageSize);
    const offset=virtualAddress%pageSize;
    const entry=pageTable[page];

    if(entry === undefined || entry === null){
        return {page,offset,fault:true,offsetBits:Math.log2(pageSize)};
    }

    return {page,offset,frame:entry,physical:entry*pageSize+offset,fault:false,offsetBits:Math.log2(pageSize)};
}

export function pipelineSchedule(instructions, stages, stalls={}){
    if(!Number.isInteger(instructions) || instructions < 1 || instructions > 12){
        throw new Error("Use between 1 and 12 instructions.");
    }

    if(!Number.isInteger(stages) || stages < 2 || stages > 8){
        throw new Error("Use between 2 and 8 stages.");
    }

    const rows=[];
    let start=0;

    for(let index=0;index < instructions;index++){
        start+=stalls[index] || 0;
        rows.push({instruction:index,start,stalls:stalls[index] || 0});
        start++;
    }

    const pipelined=rows[rows.length-1].start+stages;
    const sequential=instructions*stages;

    return {rows,pipelined,sequential,speedup:sequential/pipelined,idealSpeedup:(instructions*stages)/(stages+instructions-1)};
}

export function cpuPerformance({instructions, cpi, clockHz}){
    if(!(instructions > 0) || !(cpi > 0) || !(clockHz > 0)){
        throw new Error("Instruction count, CPI and clock rate must all be greater than zero.");
    }

    const seconds=instructions*cpi/clockHz;

    return {seconds,mips:clockHz/(cpi*1e6),cycles:instructions*cpi};
}

export function peakFlops({cores, clockHz, flopsPerCycle}){
    if(!(cores > 0) || !(clockHz > 0) || !(flopsPerCycle > 0)){
        throw new Error("Cores, clock rate and operations per cycle must be greater than zero.");
    }

    return cores*clockHz*flopsPerCycle;
}

export function amdahl(parallelFraction, processors){
    if(!(parallelFraction >= 0 && parallelFraction <= 1)){
        throw new Error("The parallel fraction must be between 0 and 1.");
    }

    if(!Number.isInteger(processors) || processors < 1){
        throw new Error("Use at least one processor.");
    }

    return 1/((1-parallelFraction)+parallelFraction/processors);
}
