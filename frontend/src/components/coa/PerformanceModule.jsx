import {useState} from "react";
import {amdahl, cpuPerformance, peakFlops, pipelineSchedule} from "../../sim/coa";
import {TextField} from "../ui/Field";
import {Explain, SimCard, SimError} from "../sim/SimParts";

const STAGES=["IF", "ID", "EX", "MEM", "WB"];

function safely(compute){
    try{
        return {value:compute(),error:""};
    }catch(error){
        return {value:null,error:error.message};
    }
}

function numberInput(setter){
    return (event) => setter(Number(event.target.value));
}

function PipelineDiagram(){
    const [instructions, setInstructions]=useState(5);
    const [stallAt, setStallAt]=useState(3);
    const [stallCycles, setStallCycles]=useState(1);
    const stages=STAGES.length;
    const stalls=stallCycles > 0 && stallAt >= 1 && stallAt <= instructions ? {[stallAt-1]:stallCycles} : {};
    const result=safely(() => pipelineSchedule(instructions, stages, stalls));

    return (
        <SimCard title="Instruction pipelining" description="A five-stage pipeline overlaps instructions. A data hazard can force stall cycles.">
            <div className="sim-inputs">
                <TextField label="Instructions" type="number" min="1" max="12" value={instructions} onChange={numberInput(setInstructions)}/>
                <TextField label="Stall before instruction" type="number" min="1" value={stallAt} onChange={numberInput(setStallAt)}/>
                <TextField label="Stall cycles" type="number" min="0" max="3" value={stallCycles} onChange={(event) => setStallCycles(Math.min(3, Math.max(0, Number(event.target.value) || 0)))}/>
            </div>

            <SimError message={result.error}/>

            {result.value && (
                <>
                    <div className="table-wrap">
                        <table className="pipeline">
                            <thead>
                                <tr>
                                    <th scope="col">Instr</th>
                                    {Array.from({length:result.value.pipelined}, (_, cycle) => <th key={cycle} scope="col">{cycle+1}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {result.value.rows.map((row) => (
                                    <tr key={row.instruction}>
                                        <th scope="row">I{row.instruction+1}</th>
                                        {Array.from({length:result.value.pipelined}, (_, cycle) => {
                                            const stage=cycle-row.start;
                                            const stalled=row.stalls > 0 && cycle >= row.start-row.stalls && cycle < row.start;

                                            return (
                                                <td key={cycle} className={stage >= 0 && stage < stages ? `stage stage-${stage}` : stalled ? "stage stall" : ""}>
                                                    {stage >= 0 && stage < stages ? STAGES[stage] : stalled ? "stall" : ""}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="stat-row">
                        <div><strong>{result.value.sequential}</strong><span>Cycles without pipelining</span></div>
                        <div><strong>{result.value.pipelined}</strong><span>Cycles with pipelining</span></div>
                        <div><strong>{result.value.speedup.toFixed(2)}x</strong><span>Speedup</span></div>
                    </div>

                    <Explain>Ideal pipelined time is k + n - 1 cycles for n instructions and k stages. Latency per instruction is still {stages} cycles, but throughput approaches one instruction per cycle.</Explain>
                </>
            )}
        </SimCard>
    );
}

function PerformanceCalculator(){
    const [instructions, setInstructions]=useState(2000000000);
    const [cpi, setCpi]=useState(1.5);
    const [clockGhz, setClockGhz]=useState(3);
    const result=safely(() => cpuPerformance({instructions,cpi,clockHz:clockGhz*1e9}));

    return (
        <SimCard title="CPU time and MIPS" description="CPU time = instructions x CPI ÷ clock rate. MIPS = clock rate ÷ (CPI x 10^6).">
            <div className="sim-inputs">
                <TextField label="Instruction count" type="number" min="1" value={instructions} onChange={numberInput(setInstructions)}/>
                <TextField label="Average CPI" type="number" step="0.1" min="0.1" value={cpi} onChange={numberInput(setCpi)}/>
                <TextField label="Clock (GHz)" type="number" step="0.1" min="0.1" value={clockGhz} onChange={numberInput(setClockGhz)}/>
            </div>

            <SimError message={result.error}/>

            {result.value && (
                <div className="stat-row">
                    <div><strong>{result.value.seconds.toPrecision(3)} s</strong><span>CPU time</span></div>
                    <div><strong>{Math.round(result.value.mips).toLocaleString("en-IN")}</strong><span>MIPS</span></div>
                    <div><strong>{(1/result.value.seconds).toPrecision(3)}</strong><span>Throughput (runs per second)</span></div>
                </div>
            )}

            <Explain>MIPS can mislead: a program compiled for a RISC machine may run more, simpler instructions than the same program on a CISC machine, so compare CPU time, not MIPS.</Explain>
        </SimCard>
    );
}

function ParallelCalculator(){
    const [fraction, setFraction]=useState(0.9);
    const [cores, setCores]=useState(8);
    const [clockGhz, setClockGhz]=useState(3);
    const [flopsPerCycle, setFlopsPerCycle]=useState(16);
    const speedup=safely(() => amdahl(fraction, cores));
    const flops=safely(() => peakFlops({cores,clockHz:clockGhz*1e9,flopsPerCycle}));

    return (
        <SimCard title="Multicore speedup and FLOPS" description="Amdahl's law limits speedup by the part of a program that stays serial.">
            <label className="range-field">
                <span>Parallel fraction of the program: {Math.round(fraction*100)}%</span>
                <input type="range" min="0" max="1" step="0.05" value={fraction} onChange={numberInput(setFraction)}/>
            </label>

            <div className="sim-inputs">
                <TextField label="Cores" type="number" min="1" max="1024" value={cores} onChange={(event) => setCores(Math.max(1, Math.round(Number(event.target.value)) || 1))}/>
                <TextField label="Clock (GHz)" type="number" step="0.1" value={clockGhz} onChange={numberInput(setClockGhz)}/>
                <TextField label="FLOPs per cycle per core" type="number" min="1" value={flopsPerCycle} onChange={numberInput(setFlopsPerCycle)}/>
            </div>

            <SimError message={speedup.error || flops.error}/>

            <div className="stat-row">
                <div><strong>{speedup.value ? `${speedup.value.toFixed(2)}x` : "-"}</strong><span>Speedup on {cores} cores</span></div>
                <div><strong>{fraction < 1 ? `${(1/(1-fraction)).toFixed(1)}x` : "No limit"}</strong><span>Upper limit with unlimited cores</span></div>
                <div><strong>{flops.value ? `${(flops.value/1e9).toFixed(0)} GFLOPS` : "-"}</strong><span>Theoretical peak</span></div>
            </div>

            <Explain>GPUs have thousands of simple cores, which suits data-parallel work like graphics and neural networks. Peak FLOPS is rarely reached because memory bandwidth and serial code get in the way.</Explain>
        </SimCard>
    );
}

function PerformanceModule(){
    return (
        <div className="sim-grid">
            <PipelineDiagram/>
            <PerformanceCalculator/>
            <ParallelCalculator/>
            <SimCard title="RISC compared with CISC" description="Two approaches to instruction set design.">
                <div className="table-wrap">
                    <table className="sim-table">
                        <thead><tr><th scope="col"></th><th scope="col">RISC (e.g. MIPS, ARM)</th><th scope="col">CISC (e.g. x86)</th></tr></thead>
                        <tbody>
                            <tr><td>Instructions</td><td>Few, simple, fixed length</td><td>Many, complex, variable length</td></tr>
                            <tr><td>Memory access</td><td>Only LOAD and STORE</td><td>Many instructions can use memory</td></tr>
                            <tr><td>CPI</td><td>Close to 1, easy to pipeline</td><td>Varies widely by instruction</td></tr>
                            <tr><td>Registers</td><td>Many general-purpose registers</td><td>Fewer, some special-purpose</td></tr>
                            <tr><td>Control unit</td><td>Usually hardwired</td><td>Often microprogrammed</td></tr>
                        </tbody>
                    </table>
                </div>
                <Explain>The simulator in the CPU tab is RISC-style: only LOAD and STORE touch memory, and the ALU works on registers.</Explain>
            </SimCard>
        </div>
    );
}

export default PerformanceModule;
