import {useMemo, useState} from "react";
import {simulateCache, translateAddress} from "../../sim/coa";
import {SelectField, TextField} from "../ui/Field";
import {Explain, SequenceDiagram, SimCard, SimError, StepControls} from "../sim/SimParts";
import {useStepper} from "../../hooks/useStepper";

const HIERARCHY=[
    {level:"Registers",size:"Bytes to a few KB",time:"Under 1 ns",note:"Inside the CPU"},
    {level:"Cache (L1 to L3)",size:"KB to tens of MB",time:"1 to 20 ns",note:"SRAM, on or near the CPU"},
    {level:"Main memory (RAM)",size:"GB",time:"50 to 100 ns",note:"DRAM, volatile"},
    {level:"ROM / firmware",size:"MB",time:"Tens of ns",note:"Non-volatile, holds start-up code"},
    {level:"SSD",size:"Hundreds of GB",time:"About 100 µs",note:"Flash, non-volatile"},
    {level:"Hard disk",size:"TB",time:"About 10 ms",note:"Magnetic, non-volatile"}
];

const IO_METHODS={
    polling:{
        title:"Programmed I/O (polling)",
        steps:[
            {label:"Read status register",detail:"Is the device ready?",toRight:true},
            {label:"Not ready",detail:"The CPU loops and asks again, wasting cycles.",toRight:false,tone:"is-warning"},
            {label:"Read status register",detail:"Asks again.",toRight:true},
            {label:"Ready",detail:"Now the CPU transfers the data word itself.",toRight:false}
        ]
    },
    interrupt:{
        title:"Interrupt-driven I/O",
        steps:[
            {label:"Start the operation",detail:"The CPU then carries on with other work.",toRight:true},
            {label:"Interrupt request",detail:"The device signals that it is ready.",toRight:false},
            {label:"Save state, run the handler",detail:"The CPU saves PC and registers and jumps to the interrupt service routine.",toRight:true},
            {label:"Return from interrupt",detail:"The saved state is restored and the program continues.",toRight:false}
        ]
    },
    dma:{
        title:"Direct memory access",
        steps:[
            {label:"Program the DMA controller",detail:"Source, destination and byte count.",toRight:true},
            {label:"DMA transfers the block",detail:"Data moves between the device and memory without the CPU.",toRight:false},
            {label:"Interrupt when complete",detail:"The CPU is interrupted once for the whole block.",toRight:false}
        ]
    }
};

function CacheSimulator(){
    const [addresses, setAddresses]=useState("0, 4, 8, 0, 16, 4, 32, 0, 8, 4");
    const [lines, setLines]=useState(4);
    const [blockSize, setBlockSize]=useState(4);
    const [ways, setWays]=useState(1);
    const [policy, setPolicy]=useState("LRU");

    const result=useMemo(() => {
        try{
            const list=addresses.split(",").map((item) => item.trim()).filter(Boolean).map(Number);

            if(list.length === 0){
                throw new Error("Enter at least one address.");
            }

            return {value:simulateCache({addresses:list,lines,blockSize,associativity:ways,policy}),error:""};
        }catch(error){
            return {value:null,error:error.message};
        }
    }, [addresses, lines, blockSize, ways, policy]);

    return (
        <SimCard title="Cache simulator" description="Each address maps to a block, a set and a tag. Watch hits, misses and evictions.">
            <TextField label="Memory addresses (word addresses)" value={addresses} onChange={(event) => setAddresses(event.target.value)}/>

            <div className="sim-inputs">
                <SelectField label="Cache lines" value={lines} onChange={(event) => {
                    setLines(Number(event.target.value));
                    setWays(1);
                }}>
                    {[2, 4, 8, 16].map((value) => <option key={value} value={value}>{value}</option>)}
                </SelectField>
                <SelectField label="Block size (words)" value={blockSize} onChange={(event) => setBlockSize(Number(event.target.value))}>
                    {[1, 2, 4, 8].map((value) => <option key={value} value={value}>{value}</option>)}
                </SelectField>
                <SelectField label="Mapping" value={ways} onChange={(event) => setWays(Number(event.target.value))}>
                    <option value={1}>Direct mapped</option>
                    {lines >= 4 && <option value={2}>2-way set associative</option>}
                    <option value={lines}>Fully associative</option>
                </SelectField>
                <SelectField label="Replacement" value={policy} onChange={(event) => setPolicy(event.target.value)}>
                    <option value="LRU">LRU</option>
                    <option value="FIFO">FIFO</option>
                </SelectField>
            </div>

            <SimError message={result.error}/>

            {result.value && (
                <>
                    <div className="table-wrap">
                        <table className="sim-table">
                            <thead>
                                <tr><th scope="col">Address</th><th scope="col">Block</th><th scope="col">Set</th><th scope="col">Tag</th><th scope="col">Result</th><th scope="col">Cache after</th></tr>
                            </thead>
                            <tbody>
                                {result.value.accesses.map((access, index) => (
                                    <tr key={index} className={access.hit ? "is-chosen" : ""}>
                                        <td className="mono">{access.address}</td>
                                        <td className="mono">{access.block}</td>
                                        <td className="mono">{access.set}</td>
                                        <td className="mono">{access.tag}</td>
                                        <td>{access.hit ? "Hit" : access.evicted === null ? "Miss" : `Miss, evicts block ${access.evicted}`}</td>
                                        <td className="mono">{access.snapshot.map((set) => `[${set.join(",") || "-"}]`).join(" ")}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="stat-row">
                        <div><strong>{result.value.hits}</strong><span>Hits</span></div>
                        <div><strong>{result.value.misses}</strong><span>Misses</span></div>
                        <div><strong>{Math.round(result.value.hitRate*100)}%</strong><span>Hit rate</span></div>
                    </div>

                    <Explain>Block = address ÷ block size, set = block mod {result.value.sets}, tag = block ÷ {result.value.sets}. Direct mapping is fast but suffers conflict misses; more ways reduce them at the cost of extra comparators.</Explain>
                </>
            )}
        </SimCard>
    );
}

function VirtualMemory(){
    const [pageSize, setPageSize]=useState(1024);
    const [address, setAddress]=useState(5130);
    const table={0:3,1:7,2:null,3:1,4:null,5:4};
    const result=(() => {
        try{
            return {value:translateAddress(address, pageSize, table),error:""};
        }catch(error){
            return {value:null,error:error.message};
        }
    })();

    return (
        <SimCard title="Virtual memory and paging" description="The MMU splits a virtual address into a page number and an offset, then looks the page up in the page table.">
            <div className="sim-inputs">
                <TextField label="Virtual address" type="number" min="0" value={address} onChange={(event) => setAddress(Number(event.target.value))}/>
                <SelectField label="Page size" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                    {[256, 512, 1024, 4096].map((value) => <option key={value} value={value}>{value} bytes</option>)}
                </SelectField>
            </div>

            <SimError message={result.error}/>

            <div className="table-wrap">
                <table className="sim-table">
                    <thead><tr><th scope="col">Page</th><th scope="col">Frame</th></tr></thead>
                    <tbody>
                        {Object.entries(table).map(([page, frame]) => (
                            <tr key={page} className={result.value && Number(page) === result.value.page ? (frame === null ? "is-match" : "is-chosen") : ""}>
                                <td className="mono">{page}</td>
                                <td>{frame === null ? "Not in memory" : frame}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {result.value && (
                <Explain>
                    Page = {address} ÷ {pageSize} = {result.value.page}, offset = {result.value.offset} (the low {result.value.offsetBits} bits).
                    {result.value.fault
                        ? " That page is not in memory, so a page fault occurs and the operating system loads it from disk."
                        : ` Frame ${result.value.frame}, so the physical address is ${result.value.frame} x ${pageSize} + ${result.value.offset} = ${result.value.physical}.`}
                </Explain>
            )}
        </SimCard>
    );
}

function IoTechniques(){
    const [method, setMethod]=useState("interrupt");
    const steps=IO_METHODS[method].steps;

    return (
        <SimCard title="I/O techniques" description="Three ways for the CPU to exchange data with a device.">
            <div className="chip-row">
                {Object.entries(IO_METHODS).map(([key, item]) => (
                    <button type="button" key={key} className={key === method ? "chip is-active" : "chip"} onClick={() => setMethod(key)}>{item.title}</button>
                ))}
            </div>
            <IoTimeline key={method} steps={steps}/>
            <Explain>
                Memory-mapped I/O gives device registers ordinary memory addresses, so normal LOAD and STORE instructions reach them.
                I/O-mapped (isolated) I/O uses a separate address space and special IN and OUT instructions.
            </Explain>
        </SimCard>
    );
}

function IoTimeline({steps}){
    const stepper=useStepper(steps.length, 1200);

    return (
        <>
            <StepControls stepper={stepper} total={steps.length}/>
            <SequenceDiagram left="CPU" right="Device" messages={steps} visible={stepper.index+1}/>
        </>
    );
}

function MemoryModule(){
    return (
        <div className="sim-grid">
            <CacheSimulator/>
            <VirtualMemory/>
            <SimCard title="Memory hierarchy" description="Faster memory is smaller and more expensive per byte, so computers layer it.">
                <div className="table-wrap">
                    <table className="sim-table">
                        <thead><tr><th scope="col">Level</th><th scope="col">Typical size</th><th scope="col">Access time</th><th scope="col">Notes</th></tr></thead>
                        <tbody>
                            {HIERARCHY.map((item) => (
                                <tr key={item.level}><td><strong>{item.level}</strong></td><td>{item.size}</td><td>{item.time}</td><td>{item.note}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Explain>Caches work because programs show locality: recently used data is likely to be used again (temporal), and nearby data is likely to be used next (spatial).</Explain>
            </SimCard>
            <IoTechniques/>
        </div>
    );
}

export default MemoryModule;
