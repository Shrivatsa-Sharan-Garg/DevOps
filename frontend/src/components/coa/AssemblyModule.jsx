import {Link} from "react-router";
import {ArrowRight} from "lucide-react";
import {CPU_EXAMPLES} from "../../sim/cpuExamples";
import {Explain, SimCard} from "../sim/SimParts";

const INSTRUCTIONS=[
    ["MOV Rd, #n / Rs", "Rd ← n or Rs", "Data transfer"],
    ["LOAD Rd, addr / [Rs]", "Rd ← MEM[addr]", "Memory read"],
    ["STORE Rs, addr / [Rd]", "MEM[addr] ← Rs", "Memory write"],
    ["ADD Rd, Rs, Rt / #n", "Rd ← Rs + Rt", "Arithmetic, sets Z and N"],
    ["SUB Rd, Rs, Rt / #n", "Rd ← Rs - Rt", "Arithmetic, sets Z and N"],
    ["AND Rd, Rs, Rt / #n", "Rd ← Rs AND Rt", "Logic, bitwise"],
    ["OR Rd, Rs, Rt / #n", "Rd ← Rs OR Rt", "Logic, bitwise"],
    ["CMP Rs, Rt / #n", "Flags from Rs - Rt", "Compare only"],
    ["JMP label", "PC ← label", "Unconditional jump"],
    ["JZ / JNZ / JN label", "Jump if Z = 1, Z = 0 or N = 1", "Conditional jump"],
    ["HALT", "Stop", "Control"]
];

const MODES=[
    ["Immediate", "MOV R1, #5", "The value is part of the instruction."],
    ["Register", "ADD R1, R2, R3", "Operands are in registers."],
    ["Direct", "LOAD R1, 10", "The instruction holds the memory address."],
    ["Register indirect", "LOAD R1, [R2]", "A register holds the memory address, useful for arrays."]
];

function AssemblyModule(){
    return (
        <div className="sim-grid">
            <SimCard title="Instruction set" description="The instructions the CPU simulator understands. Values are 16-bit signed integers.">
                <div className="table-wrap">
                    <table className="sim-table">
                        <thead><tr><th scope="col">Instruction</th><th scope="col">Effect</th><th scope="col">Type</th></tr></thead>
                        <tbody>
                            {INSTRUCTIONS.map(([syntax, effect, type]) => (
                                <tr key={syntax}><td className="mono">{syntax}</td><td className="mono">{effect}</td><td>{type}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Explain>Write a label as name: at the start of a line, and comments after a semicolon.</Explain>
            </SimCard>

            <SimCard title="Addressing modes" description="Where an instruction finds its operand.">
                <div className="table-wrap">
                    <table className="sim-table">
                        <thead><tr><th scope="col">Mode</th><th scope="col">Example</th><th scope="col">Meaning</th></tr></thead>
                        <tbody>
                            {MODES.map(([mode, example, meaning]) => (
                                <tr key={mode}><td><strong>{mode}</strong></td><td className="mono">{example}</td><td>{meaning}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </SimCard>

            <SimCard title="Example programs" description="Open a program in the CPU simulator and step through it.">
                <div className="row-list">
                    {Object.entries(CPU_EXAMPLES).map(([key, example]) => (
                        <Link key={key} className="row-link" to={`/coa/cpu?example=${key}`}>
                            <span className="row-main">
                                <strong>{example.title}</strong>
                                <small>{example.source.split("\n")[0].replace(/^;\s*/, "")}</small>
                            </span>
                            <ArrowRight size={16} aria-hidden="true"/>
                        </Link>
                    ))}
                </div>
            </SimCard>

            <SimCard title="From high-level code to assembly" description="How a loop in C maps to the instructions above.">
                <div className="compare-columns">
                    <pre className="code-block">{"int total = 0;\nfor (int i = 5; i != 0; i--) {\n    total += i;\n}\nmemory[10] = total;"}</pre>
                    <pre className="code-block">{"    MOV R1, #5\n    MOV R2, #0\nloop:\n    ADD R2, R2, R1\n    SUB R1, R1, #1\n    JNZ loop\n    STORE R2, 10\n    HALT"}</pre>
                </div>
                <Explain>A compiler turns each loop into a compare or arithmetic step plus a conditional jump back to a label.</Explain>
            </SimCard>
        </div>
    );
}

export default AssemblyModule;
