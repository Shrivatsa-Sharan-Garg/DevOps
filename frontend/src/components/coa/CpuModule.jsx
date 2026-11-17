import {useEffect, useRef, useState} from "react";
import {useSearchParams} from "react-router";
import {Pause, Play, RotateCcw, StepForward, Upload} from "lucide-react";
import {MEMORY_SIZE, assemble, createCpu, runCpu, stepCpu} from "../../sim/coa";
import {CPU_EXAMPLES} from "../../sim/cpuExamples";
import Button from "../ui/Button";
import {SelectField} from "../ui/Field";
import {Explain, SimCard, SimError} from "../sim/SimParts";

const PHASES=["fetch", "decode", "execute"];
const SPEEDS={slow:900,normal:400,fast:80};

function buildCpu(source, memory){
    try{
        const {program}=assemble(source);

        return {cpu:createCpu(program, memory),error:""};
    }catch(error){
        return {cpu:null,error:error.message};
    }
}

function RegisterFile({cpu, previous}){
    return (
        <div className="register-grid">
            {[["PC", cpu.pc], ["IR", cpu.ir ? cpu.ir.text : "-"]].map(([name, value]) => (
                <div key={name} className="register special"><span>{name}</span><strong className="mono">{value}</strong></div>
            ))}
            {cpu.registers.map((value, index) => (
                <div key={index} className={previous && previous.registers[index] !== value ? "register is-changed" : "register"}>
                    <span>R{index}</span>
                    <strong className="mono">{value}</strong>
                </div>
            ))}
            <div className="register special"><span>Z</span><strong className="mono">{cpu.flags.zero ? 1 : 0}</strong></div>
            <div className="register special"><span>N</span><strong className="mono">{cpu.flags.negative ? 1 : 0}</strong></div>
        </div>
    );
}

function MemoryView({cpu}){
    return (
        <div className="memory-grid" aria-label="Data memory">
            {cpu.memory.map((value, address) => (
                <span key={address} className={cpu.lastWrite === address ? "memory-cell is-changed" : value !== 0 ? "memory-cell is-used" : "memory-cell"}>
                    <small>{address}</small>
                    <span className="mono">{value}</span>
                </span>
            ))}
        </div>
    );
}

function CpuModule(){
    const [params]=useSearchParams();
    const initial=CPU_EXAMPLES[params.get("example")] ? params.get("example") : "sum";
    const [example, setExample]=useState(initial);
    const [source, setSource]=useState(CPU_EXAMPLES[initial].source);
    const [memoryText, setMemoryText]=useState(CPU_EXAMPLES[initial].memory.join(", "));
    const [state, setState]=useState(() => buildCpu(CPU_EXAMPLES[initial].source, CPU_EXAMPLES[initial].memory));
    const [history, setHistory]=useState([]);
    const [running, setRunning]=useState(false);
    const [speed, setSpeed]=useState("normal");
    const cpu=state.cpu;
    const finished=!cpu || cpu.halted || Boolean(cpu.error);
    const active=running && !finished;
    const listingRef=useRef(null);

    // Keep the current instruction visible inside the scrolling listing
    useEffect(() => {
        const listing=listingRef.current;
        const item=listing?.querySelector(".is-current, .is-next");

        if(item){
            listing.scrollTop=Math.max(0, item.offsetTop-listing.clientHeight/2);
        }
    }, [cpu]);

    useEffect(() => {
        if(!active){
            return undefined;
        }

        const timer=setTimeout(() => {
            setHistory((current) => [...current.slice(-200), cpu]);
            setState({cpu:stepCpu(cpu),error:""});
        }, SPEEDS[speed]);

        return () => clearTimeout(timer);
    }, [active, cpu, speed]);

    function parseMemory(){
        const values=memoryText.split(",").map((item) => item.trim()).filter(Boolean).map(Number);

        if(values.some((value) => !Number.isInteger(value))){
            throw new Error("Initial memory must be whole numbers separated by commas.");
        }

        if(values.length > MEMORY_SIZE){
            throw new Error(`Memory has ${MEMORY_SIZE} words.`);
        }

        return values;
    }

    function load(nextSource=source, nextMemory=null){
        setRunning(false);
        setHistory([]);

        try{
            setState(buildCpu(nextSource, nextMemory ?? parseMemory()));
        }catch(error){
            setState({cpu:null,error:error.message});
        }
    }

    function chooseExample(name){
        setExample(name);
        setSource(CPU_EXAMPLES[name].source);
        setMemoryText(CPU_EXAMPLES[name].memory.join(", "));
        load(CPU_EXAMPLES[name].source, CPU_EXAMPLES[name].memory);
    }

    function step(){
        setHistory((current) => [...current.slice(-200), cpu]);
        setState({cpu:stepCpu(cpu),error:""});
    }

    function runToEnd(){
        setRunning(false);
        setState({cpu:runCpu(cpu),error:""});
    }

    const previous=history[history.length-1];

    return (
        <div className="sim-grid cpu-layout">
            <SimCard title="Program" description="A small MIPS-style instruction set with 8 registers and 32 words of data memory. Load the program, then step through it.">
                <div className="sim-inputs">
                    <SelectField label="Example" value={example} onChange={(event) => chooseExample(event.target.value)}>
                        {Object.entries(CPU_EXAMPLES).map(([key, item]) => <option key={key} value={key}>{item.title}</option>)}
                    </SelectField>
                </div>

                <label className="field-label" htmlFor="cpu-source"><span>Assembly source</span></label>
                <textarea id="cpu-source" className="code-editor" rows={14} spellCheck="false" value={source} onChange={(event) => setSource(event.target.value)}/>

                <label className="field-label" htmlFor="cpu-memory"><span>Initial memory (address 0 onwards)</span></label>
                <input id="cpu-memory" className="code-editor" value={memoryText} onChange={(event) => setMemoryText(event.target.value)} placeholder="e.g. 6, 7"/>

                <Button onClick={() => load()}>
                    <Upload size={15} aria-hidden="true"/>
                    Load program
                </Button>

                <SimError message={state.error}/>
            </SimCard>

            {cpu && (
                <SimCard title="Processor" description="Each step is one phase of the instruction cycle.">
                    <div className="step-controls">
                        <Button size="small" onClick={() => setRunning(!active)} disabled={finished}>
                            {active ? <Pause size={15} aria-hidden="true"/> : <Play size={15} aria-hidden="true"/>}
                            {active ? "Pause" : "Run"}
                        </Button>
                        <Button variant="secondary" size="small" onClick={step} disabled={finished || active}>
                            <StepForward size={15} aria-hidden="true"/>
                            Step
                        </Button>
                        <Button variant="secondary" size="small" onClick={runToEnd} disabled={finished || active}>Run to end</Button>
                        <Button variant="ghost" size="small" onClick={() => load()}>
                            <RotateCcw size={15} aria-hidden="true"/>
                            Reset
                        </Button>
                        <SelectField label="Speed" value={speed} onChange={(event) => setSpeed(event.target.value)}>
                            <option value="slow">Slow</option>
                            <option value="normal">Normal</option>
                            <option value="fast">Fast</option>
                        </SelectField>
                    </div>

                    <div className="phase-row">
                        {PHASES.map((phase) => {
                            const lastPhase=PHASES[(PHASES.indexOf(cpu.phase)+2)%3];

                            return <span key={phase} className={cpu.cycle > 0 && phase === lastPhase ? "phase is-active" : "phase"}>{phase}</span>;
                        })}
                        <span className="step-count">Cycle {cpu.cycle} · {cpu.executed} instructions</span>
                    </div>

                    <p className={cpu.error ? "cpu-message is-error" : "cpu-message"} aria-live="polite">
                        {cpu.message || "Ready. Press Step to fetch the first instruction."}
                        {cpu.halted && " The program has finished."}
                    </p>

                    <ol ref={listingRef} className="program-listing">
                        {cpu.program.map((instruction, index) => (
                            <li key={index} className={cpu.ir?.address === index ? "is-current" : cpu.pc === index ? "is-next" : ""}>
                                <span className="mono">{String(index).padStart(2, "0")}</span>
                                <code>{instruction.text}</code>
                            </li>
                        ))}
                    </ol>

                    <RegisterFile cpu={cpu} previous={previous}/>

                    <div className={cpu.alu ? "alu is-active" : "alu"}>
                        <span className="eyebrow">ALU</span>
                        {cpu.alu ? (
                            <strong className="mono">{cpu.alu.left} {cpu.alu.symbol} {cpu.alu.right} = {cpu.alu.result}{cpu.alu.operation === "CMP" ? " (flags only)" : ""}</strong>
                        ) : <span className="muted small">Idle</span>}
                    </div>

                    <MemoryView cpu={cpu}/>

                    {cpu.trace.length > 0 && (
                        <details className="sim-details">
                            <summary>Execution trace ({cpu.trace.length} instructions)</summary>
                            <ol className="event-log">
                                {cpu.trace.slice(-40).map((item, index) => (
                                    <li key={index} className="event">
                                        <span className="event-type mono">PC {item.pc}</span>
                                        <code>{item.instruction}</code>
                                        <small>{item.result}</small>
                                    </li>
                                ))}
                            </ol>
                        </details>
                    )}

                    <Explain>Fetch copies the instruction at PC into IR and adds 1 to PC. Decode works out the operation and operands. Execute uses the ALU, memory or a jump that changes PC.</Explain>
                </SimCard>
            )}
        </div>
    );
}

export default CpuModule;
