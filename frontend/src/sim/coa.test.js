import assert from "node:assert/strict";
import {test} from "node:test";
import {
    addBinary,
    amdahl,
    assemble,
    cpuPerformance,
    createCpu,
    fromTwosComplement,
    minimize,
    parseInBase,
    peakFlops,
    pipelineSchedule,
    representations,
    runCpu,
    simulateCache,
    stepCpu,
    toBcd,
    toBase,
    translateAddress,
    truthTable
} from "./coa.js";

test("base conversion", () => {
    assert.equal(parseInBase("FF", 16), 255);
    assert.equal(parseInBase("777", 8), 511);
    assert.equal(parseInBase("101101", 2), 45);
    assert.equal(parseInBase("-42", 10), -42);
    assert.equal(toBase(255, 2), "11111111");
    assert.equal(toBase(511, 8), "777");
    assert.throws(() => parseInBase("102", 2));
    assert.throws(() => parseInBase("G1", 16));
});

test("signed representations of -5 in 8 bits", () => {
    const result=representations(-5, 8);

    assert.equal(result.signMagnitude, "10000101");
    assert.equal(result.onesComplement, "11111010");
    assert.equal(result.twosComplement, "11111011");
    assert.equal(result.unsigned, null);
    assert.equal(fromTwosComplement("11111011"), -5);
});

test("range limits and overflow", () => {
    assert.equal(representations(-128, 8).twosComplement, "10000000");
    assert.equal(representations(-128, 8).signMagnitude, null);
    assert.equal(representations(200, 8).twosComplement, null);
    assert.equal(representations(200, 8).unsigned, "11001000");
    assert.equal(representations(300, 8).overflow, true);
});

test("BCD encodes each decimal digit", () => {
    assert.deepEqual(toBcd(59).map((item) => item.code), ["0101", "1001"]);
});

test("binary addition flags", () => {
    assert.deepEqual(addBinary(100, 50, 8), {result:"10010110",carry:false,overflow:true,signed:-106});
    assert.equal(addBinary(-1, 1, 8).carry, true);
    assert.equal(addBinary(-1, 1, 8).overflow, false);
});

test("truth tables for gates and expressions", () => {
    assert.deepEqual(truthTable("A XOR B").minterms, [1, 2]);
    assert.deepEqual(truthTable("A NAND B").minterms, [0, 1, 2]);
    assert.deepEqual(truthTable("(A + B)'").minterms, [0]);
    assert.deepEqual(truthTable("AB + C").minterms, [1, 3, 5, 6, 7]);
    assert.deepEqual(truthTable("!A & B").minterms, [1]);
    assert.throws(() => truthTable("A + "));
    assert.throws(() => truthTable("(A + B"));
    assert.throws(() => truthTable("A + E"));
});

test("Quine-McCluskey finds minimal sums of products", () => {
    assert.equal(minimize([1, 3, 5, 7], 3).expression, "C");
    assert.equal(minimize([0, 1, 2, 3], 2).expression, "1");
    assert.equal(minimize([], 3).expression, "0");
    assert.equal(minimize([0, 2, 8, 10], 4).expression, "B'D'");

    const majority=minimize([3, 5, 6, 7], 3).expression.split(" + ").sort();
    assert.deepEqual(majority, ["AB", "AC", "BC"]);

    const xor=minimize([1, 2], 2).expression.split(" + ").sort();
    assert.deepEqual(xor, ["A'B", "AB'"]);
});

const SUM_PROGRAM=`
    MOV R1, #5      ; counter
    MOV R2, #0      ; total
loop:
    ADD R2, R2, R1
    SUB R1, R1, #1
    JNZ loop
    STORE R2, 10
    HALT
`;

test("assembler reports useful errors", () => {
    assert.throws(() => assemble("MOV R9, #1"), /R0 to R7/);
    assert.throws(() => assemble("JMP nowhere"), /not defined/);
    assert.throws(() => assemble("FLY R1"), /unknown instruction/);
    assert.throws(() => assemble("ADD R1, R2"), /expects 3 operands/);
    assert.throws(() => assemble("LOAD R1, 99"), /must be 0 to 31/);
    assert.equal(assemble(SUM_PROGRAM).program.length, 7);
});

test("CPU runs a loop through fetch, decode and execute", () => {
    const {program}=assemble(SUM_PROGRAM);
    const first=stepCpu(createCpu(program));

    assert.equal(first.phase, "decode");
    assert.equal(first.pc, 1);
    assert.equal(first.ir.opcode, "MOV");

    const finished=runCpu(createCpu(program));

    assert.equal(finished.halted, true);
    assert.equal(finished.registers[2], 15);
    assert.equal(finished.memory[10], 15);
    assert.equal(finished.flags.zero, true);
    assert.equal(finished.executed, 1+1+5*3+1+1);
});

test("CPU loads, stores, compares and branches", () => {
    const {program}=assemble(`
        LOAD R1, 0
        LOAD R2, 1
        CMP R1, R2
        JN second
        STORE R1, 2
        HALT
second:
        STORE R2, 2
        HALT
    `);

    assert.equal(runCpu(createCpu(program, [3, 9])).memory[2], 9);
    assert.equal(runCpu(createCpu(program, [12, 9])).memory[2], 12);
});

test("CPU errors for bad addresses and endless loops", () => {
    const bad=runCpu(createCpu(assemble("MOV R1, #40\nLOAD R2, [R1]\nHALT").program));
    const endless=runCpu(createCpu(assemble("loop: JMP loop").program));
    const noHalt=runCpu(createCpu(assemble("MOV R1, #1").program));

    assert.match(bad.error, /outside memory/);
    assert.match(endless.error, /loop forever/);
    assert.match(noHalt.error, /outside the program/);
});

test("16-bit arithmetic wraps around", () => {
    const result=runCpu(createCpu(assemble("MOV R1, #32767\nADD R1, R1, #1\nHALT").program));

    assert.equal(result.registers[1], -32768);
    assert.equal(result.flags.negative, true);
});

test("direct-mapped cache hits and conflict misses", () => {
    const result=simulateCache({addresses:[0, 1, 4, 0, 8, 0],lines:4,blockSize:2,associativity:1});

    assert.deepEqual(result.accesses.map((access) => access.hit), [false, true, false, true, false, false]);
    assert.equal(result.hits, 2);
    assert.equal(result.accesses[4].evicted, 0);
});

test("LRU and FIFO replacement differ", () => {
    const addresses=[0, 1, 0, 2, 0];
    const lru=simulateCache({addresses,lines:2,blockSize:1,associativity:2,policy:"LRU"});
    const fifo=simulateCache({addresses,lines:2,blockSize:1,associativity:2,policy:"FIFO"});

    assert.equal(lru.hits, 2);
    assert.equal(fifo.hits, 1);
    assert.throws(() => simulateCache({addresses,lines:3,blockSize:1,associativity:1}));
});

test("virtual address translation and page faults", () => {
    const table={0:5,1:2};

    assert.deepEqual(translateAddress(1030, 1024, table), {page:1,offset:6,frame:2,physical:2054,fault:false,offsetBits:10});
    assert.equal(translateAddress(5000, 1024, table).fault, true);
    assert.throws(() => translateAddress(10, 1000, table));
});

test("pipeline timing and speedup", () => {
    const ideal=pipelineSchedule(5, 5);

    assert.equal(ideal.pipelined, 9);
    assert.equal(ideal.sequential, 25);

    const stalled=pipelineSchedule(5, 5, {2:2});

    assert.equal(stalled.pipelined, 11);
    assert.equal(stalled.rows[2].start, 4);
});

test("performance formulas", () => {
    const result=cpuPerformance({instructions:2e9,cpi:1.5,clockHz:3e9});

    assert.equal(result.seconds, 1);
    assert.equal(result.mips, 2000);
    assert.equal(peakFlops({cores:4,clockHz:3e9,flopsPerCycle:16}), 192e9);
    assert.ok(Math.abs(amdahl(0.9, 10)-1/(0.1+0.09)) < 1e-12);
    assert.equal(amdahl(0, 64), 1);
});
