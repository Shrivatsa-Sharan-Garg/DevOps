import {useMemo, useState} from "react";
import {CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import {alohaCurve, alohaThroughput, bitStuff, checkParity, crcCheck, crcDivide, flipBit, parityBit, simulateArq, simulateCsmaCd} from "../../sim/networks";
import {SelectField, TextField} from "../ui/Field";
import Button from "../ui/Button";
import {Explain, SimCard, SimError, StepControls} from "../sim/SimParts";
import {useStepper} from "../../hooks/useStepper";

function safely(compute){
    try{
        return {value:compute(),error:""};
    }catch(error){
        return {value:null,error:error.message};
    }
}

function BitButtons({bits, flipped, onFlip}){
    return (
        <div className="bit-row" aria-label="Received bits, click to flip">
            {[...bits].map((bit, index) => (
                <button
                    type="button"
                    key={index}
                    className={flipped.includes(index) ? "bit is-flipped" : "bit"}
                    onClick={() => onFlip(index)}
                    aria-label={`Bit ${index+1} is ${bit}`}
                >
                    {bit}
                </button>
            ))}
        </div>
    );
}

function ParityDemo(){
    const [data, setData]=useState("1011001");
    const [mode, setMode]=useState("even");
    const [flipped, setFlipped]=useState([]);
    const result=safely(() => parityBit(data, mode));
    const sent=result.value === null ? "" : data+result.value;
    const received=flipped.reduce((bits, index) => flipBit(bits, index), sent);
    const check=sent ? checkParity(received, mode) : null;

    function toggle(index){
        setFlipped((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index]);
    }

    return (
        <SimCard title="Parity check" description="Add a parity bit, then flip bits in transit to see which errors parity can detect.">
            <div className="sim-inputs">
                <TextField label="Data bits" value={data} onChange={(event) => {
                    setData(event.target.value.trim());
                    setFlipped([]);
                }}/>
                <SelectField label="Parity" value={mode} onChange={(event) => setMode(event.target.value)}>
                    <option value="even">Even</option>
                    <option value="odd">Odd</option>
                </SelectField>
            </div>

            <SimError message={result.error}/>

            {sent && (
                <>
                    <p className="mono">Sent: {data}<mark>{result.value}</mark></p>
                    <BitButtons bits={received} flipped={flipped} onFlip={toggle}/>
                    <Explain>
                        The receiver counts {check.ones} ones. {check.valid ? "Parity looks correct" : "Parity fails, so an error is detected"}.
                        {flipped.length > 0 && flipped.length%2 === 0 && " An even number of flipped bits slips past parity undetected."}
                    </Explain>
                </>
            )}
        </SimCard>
    );
}

function CrcDemo(){
    const [data, setData]=useState("1101011011");
    const [generator, setGenerator]=useState("10011");
    const [flipped, setFlipped]=useState([]);
    const result=safely(() => crcDivide(data, generator));
    const codeword=result.value?.codeword || "";
    const received=flipped.reduce((bits, index) => flipBit(bits, index), codeword);
    const check=codeword ? crcCheck(received, generator) : null;

    function toggle(index){
        setFlipped((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index]);
    }

    return (
        <SimCard title="Cyclic redundancy check" description="The sender divides by the generator using XOR and appends the remainder. The receiver divides again.">
            <div className="sim-inputs">
                <TextField label="Data bits" value={data} onChange={(event) => {
                    setData(event.target.value.trim());
                    setFlipped([]);
                }}/>
                <TextField label="Generator" value={generator} onChange={(event) => {
                    setGenerator(event.target.value.trim());
                    setFlipped([]);
                }}/>
            </div>

            <SimError message={result.error}/>

            {result.value && (
                <>
                    <details className="sim-details">
                        <summary>Show the {result.value.steps.length} division steps</summary>
                        <ol className="mono division">
                            {result.value.steps.map((step, index) => (
                                <li key={index}>{step.window} XOR {step.divisor} = {step.result}</li>
                            ))}
                        </ol>
                    </details>

                    <p className="mono">Remainder {result.value.remainder} · transmitted {data}<mark>{result.value.remainder}</mark></p>
                    <BitButtons bits={received} flipped={flipped} onFlip={toggle}/>
                    <Explain>
                        Receiver's remainder: <span className="mono">{check.syndrome}</span>.
                        {check.valid ? " It is all zeros, so the frame is accepted." : " It is not zero, so the frame is rejected as damaged."}
                    </Explain>
                </>
            )}
        </SimCard>
    );
}

function FramingDemo(){
    const [bits, setBits]=useState("0110111111111111111110010");
    const result=safely(() => bitStuff(bits));

    return (
        <SimCard title="Framing with bit stuffing" description="HDLC frames start and end with the flag 01111110. A 0 is inserted after five 1s so the flag never appears in the data.">
            <TextField label="Payload bits" value={bits} onChange={(event) => setBits(event.target.value.trim())}/>
            <SimError message={result.error}/>

            {result.value && (
                <>
                    <p className="mono stuffed">
                        <mark>{result.value.flag}</mark>
                        {[...result.value.stuffed].map((bit, index) => (
                            <span key={index} className={result.value.stuffedAt.includes(index) ? "stuffed-bit" : ""}>{bit}</span>
                        ))}
                        <mark>{result.value.flag}</mark>
                    </p>
                    <Explain>{result.value.stuffedAt.length} stuffed zero{result.value.stuffedAt.length === 1 ? "" : "s"} shown in colour. The receiver removes them after each run of five 1s.</Explain>
                </>
            )}
        </SimCard>
    );
}

const EVENT_LABELS={
    send:"Send",
    retransmit:"Resend",
    lost:"Lost",
    deliver:"Delivered",
    duplicate:"Duplicate",
    discard:"Discarded",
    buffer:"Buffered",
    ack:"ACK",
    "ack-lost":"ACK lost",
    timeout:"Timeout"
};

function ArqTimeline({result}){
    const events=result.events;
    const stepper=useStepper(events.length, 450);

    return (
        <>
            <StepControls stepper={stepper} total={events.length}/>

            <ol className="event-log">
                {events.slice(0, stepper.index+1).map((event, index) => (
                    <li key={index} className={`event event-${event.type}`}>
                        <span className="event-type">{EVENT_LABELS[event.type]}</span>
                        <span>Frame {event.frame}</span>
                        {event.note && <small>{event.note}</small>}
                    </li>
                ))}
            </ol>

            <div className="stat-row">
                <div><strong>{result.transmissions}</strong><span>Frames transmitted</span></div>
                <div><strong>{result.retransmissions}</strong><span>Retransmissions</span></div>
                <div><strong>{Math.round(result.efficiency*100)}%</strong><span>Useful transmissions</span></div>
            </div>
        </>
    );
}

function ArqSimulator(){
    const [protocol, setProtocol]=useState("go-back-n");
    const [frames, setFrames]=useState(8);
    const [windowSize, setWindowSize]=useState(4);
    const [lost, setLost]=useState("2");
    const [lostAcks, setLostAcks]=useState("");

    const parsed=useMemo(() => safely(() => {
        const toList=(text) => text.split(",").map((item) => item.trim()).filter(Boolean).map((item) => {
            const value=Number(item);

            if(!Number.isInteger(value) || value < 0 || value >= frames){
                throw new Error(`Frame numbers must be between 0 and ${frames-1}.`);
            }

            return value;
        });

        return simulateArq({protocol,frames,windowSize,lostFrames:toList(lost),lostAcks:toList(lostAcks)});
    }), [protocol, frames, windowSize, lost, lostAcks]);


    return (
        <SimCard title="Flow control: Stop-and-Wait, Go-Back-N, Selective Repeat" description="Choose which frames are lost on their first attempt and watch how each protocol recovers.">
            <div className="sim-inputs">
                <SelectField label="Protocol" value={protocol} onChange={(event) => setProtocol(event.target.value)}>
                    <option value="stop-and-wait">Stop-and-Wait</option>
                    <option value="go-back-n">Go-Back-N</option>
                    <option value="selective-repeat">Selective Repeat</option>
                </SelectField>
                <TextField label="Frames" type="number" min="1" max="16" value={frames} onChange={(event) => setFrames(Number(event.target.value))}/>
                {protocol !== "stop-and-wait" && (
                    <TextField label="Window size" type="number" min="1" max="8" value={windowSize} onChange={(event) => setWindowSize(Number(event.target.value))}/>
                )}
                <TextField label="Lost frames" value={lost} hint="Comma separated, e.g. 2, 5" onChange={(event) => setLost(event.target.value)}/>
                {protocol === "stop-and-wait" && (
                    <TextField label="Lost ACKs" value={lostAcks} onChange={(event) => setLostAcks(event.target.value)}/>
                )}
            </div>

            <SimError message={parsed.error}/>

            {parsed.value && <ArqTimeline key={JSON.stringify([protocol, frames, windowSize, lost, lostAcks])} result={parsed.value}/>}
        </SimCard>
    );
}

function AlohaDemo(){
    const [load, setLoad]=useState(0.5);
    const curve=useMemo(() => alohaCurve(3, 0.1), []);
    const pure=alohaThroughput(load, "pure");
    const slotted=alohaThroughput(load, "slotted");

    return (
        <SimCard title="Pure and Slotted ALOHA" description="Throughput S as offered load G changes. Pure: S = G e^(-2G). Slotted: S = G e^(-G).">
            <label className="range-field">
                <span>Offered load G = {load.toFixed(1)} frames per frame time</span>
                <input type="range" min="0" max="3" step="0.1" value={load} onChange={(event) => setLoad(Number(event.target.value))}/>
            </label>

            <ul className="chart-legend">
                <li><i style={{background:"var(--series-2)"}}/>Pure ALOHA</li>
                <li><i style={{background:"var(--series-1)"}}/>Slotted ALOHA</li>
            </ul>

            <div className="chart-body" role="img" aria-label="ALOHA throughput curves">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={curve} margin={{top:8,right:12,bottom:0,left:-18}}>
                        <CartesianGrid stroke="var(--line)" vertical={false}/>
                        <XAxis dataKey="load" tick={{fill:"var(--text-muted)",fontSize:12}} interval={4}/>
                        <YAxis tick={{fill:"var(--text-muted)",fontSize:12}} domain={[0, 0.4]}/>
                        <Tooltip formatter={(value) => value.toFixed(3)} contentStyle={{background:"var(--surface-solid)",border:"1px solid var(--line-strong)"}}/>
                        <Line type="monotone" dataKey="pure" name="Pure ALOHA" stroke="var(--series-2)" strokeWidth={2} dot={false} isAnimationActive={false}/>
                        <Line type="monotone" dataKey="slotted" name="Slotted ALOHA" stroke="var(--series-1)" strokeWidth={2} dot={false} isAnimationActive={false}/>
                        <ReferenceDot x={Math.round(load*10)/10} y={pure} r={5} fill="var(--series-2)"/>
                        <ReferenceDot x={Math.round(load*10)/10} y={slotted} r={5} fill="var(--series-1)"/>
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="stat-row">
                <div><strong>{(pure*100).toFixed(1)}%</strong><span>Pure ALOHA throughput</span></div>
                <div><strong>{(slotted*100).toFixed(1)}%</strong><span>Slotted ALOHA throughput</span></div>
            </div>

            <Explain>Pure ALOHA peaks at 18.4% when G = 0.5. Slotted ALOHA halves the vulnerable period and peaks at 36.8% when G = 1.</Explain>
        </SimCard>
    );
}

function CsmaCdDemo(){
    const [stations, setStations]=useState(3);
    const [seed, setSeed]=useState(7);
    const rounds=useMemo(() => simulateCsmaCd(stations, seed), [stations, seed]);

    return (
        <SimCard title="CSMA/CD and binary exponential backoff" description="Ethernet stations listen before sending. After the nth collision each picks a random wait of 0 to 2^n - 1 slot times.">
            <div className="sim-inputs">
                <TextField label="Stations that collide" type="number" min="2" max="6" value={stations} onChange={(event) => setStations(Math.min(6, Math.max(2, Number(event.target.value) || 2)))}/>
                <Button variant="secondary" onClick={() => setSeed((value) => value+1)}>New random draw</Button>
            </div>

            <ol className="event-log">
                {rounds.map((round) => (
                    <li key={round.collision} className="event">
                        <span className="event-type">Collision {round.collision}</span>
                        <span>Range 0 to {round.range.max}: {round.choices.map((choice) => `S${choice.station+1}=${choice.slots}`).join(", ")}</span>
                        <small>{round.outcome}. Wait {round.delay.toFixed(1)} µs (slot time 51.2 µs on 10 Mbps Ethernet).</small>
                    </li>
                ))}
            </ol>

            <Explain>CSMA listens before transmitting. CSMA/CD also detects a collision while sending, stops, sends a jam signal and backs off. After 16 attempts the frame is dropped.</Explain>
        </SimCard>
    );
}

function DataLinkModule(){
    return (
        <div className="sim-grid">
            <ParityDemo/>
            <CrcDemo/>
            <FramingDemo/>
            <ArqSimulator/>
            <AlohaDemo/>
            <CsmaCdDemo/>
        </div>
    );
}

export default DataLinkModule;
