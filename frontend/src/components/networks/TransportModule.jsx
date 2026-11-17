import {useMemo, useState} from "react";
import {CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import {WELL_KNOWN_PORTS, congestionWindow, demultiplex, tcpHandshake, tcpTeardown} from "../../sim/networks";
import Button from "../ui/Button";
import {SelectField, TextField} from "../ui/Field";
import {Explain, SequenceDiagram, SimCard, SimError, StepControls} from "../sim/SimParts";
import {useStepper} from "../../hooks/useStepper";

function safely(compute){
    try{
        return {value:compute(),error:""};
    }catch(error){
        return {value:null,error:error.message};
    }
}

function randomIsn(){
    return Math.floor(Math.random()*2**32);
}

function HandshakeTimeline({steps}){
    const stepper=useStepper(steps.length, 1300);
    const current=steps[stepper.index];
    const messages=steps.map((step) => ({
        label:step.flags,
        detail:`seq=${step.seq}${step.ack === null ? "" : `, ack=${step.ack}`}`,
        toRight:step.from === "client"
    }));

    return (
        <>
            <StepControls stepper={stepper} total={steps.length}/>
            <SequenceDiagram left={`Client · ${current.clientState}`} right={`Server · ${current.serverState}`} messages={messages} visible={stepper.index+1}/>
            {current.note && <Explain>{current.note}</Explain>}
        </>
    );
}

function Handshake(){
    const [clientIsn, setClientIsn]=useState(1000);
    const [serverIsn, setServerIsn]=useState(5000);
    const [phase, setPhase]=useState("open");
    const result=safely(() => phase === "open" ? tcpHandshake(clientIsn, serverIsn) : tcpTeardown(clientIsn+101, serverIsn+201));

    return (
        <SimCard title="TCP three-way handshake and teardown" description="Watch the sequence and acknowledgement numbers. Each SYN and FIN uses up one sequence number.">
            <div className="sim-inputs">
                <SelectField label="Show" value={phase} onChange={(event) => setPhase(event.target.value)}>
                    <option value="open">Connection setup</option>
                    <option value="close">Connection teardown</option>
                </SelectField>
                <TextField label="Client ISN" type="number" value={clientIsn} onChange={(event) => setClientIsn(Number(event.target.value))}/>
                <TextField label="Server ISN" type="number" value={serverIsn} onChange={(event) => setServerIsn(Number(event.target.value))}/>
                <Button variant="secondary" onClick={() => {
                    setClientIsn(randomIsn());
                    setServerIsn(randomIsn());
                }}>Random ISNs</Button>
            </div>

            <SimError message={result.error}/>
            {result.value && <HandshakeTimeline key={`${phase}-${clientIsn}-${serverIsn}`} steps={result.value}/>}
        </SimCard>
    );
}

function deliver(protocol, count, lossRate, seed){
    let state=seed;
    const random=() => {
        state=(state*1103515245+12345)%2147483648;

        return state/2147483648;
    };
    const log=[];
    let sent=0;

    for(let segment=1;segment <= count;segment++){
        let delivered=false;
        let tries=0;

        while(!delivered){
            tries++;
            sent++;
            const lost=random() < lossRate;

            if(!lost){
                delivered=true;
                log.push({segment,tries,status:tries > 1 ? "delivered after resend" : "delivered"});
            }else if(protocol === "UDP"){
                log.push({segment,tries,status:"lost, never resent"});
                break;
            }
        }
    }

    return {log,sent,received:log.filter((item) => item.status.startsWith("delivered")).length};
}

function TcpVsUdp(){
    const [lossRate, setLossRate]=useState(0.2);
    const [seed, setSeed]=useState(11);
    const tcp=useMemo(() => deliver("TCP", 10, lossRate, seed), [lossRate, seed]);
    const udp=useMemo(() => deliver("UDP", 10, lossRate, seed), [lossRate, seed]);

    return (
        <SimCard title="TCP compared with UDP" description="Send 10 segments over a link that loses some of them.">
            <label className="range-field">
                <span>Loss rate {Math.round(lossRate*100)}%</span>
                <input type="range" min="0" max="0.6" step="0.05" value={lossRate} onChange={(event) => setLossRate(Number(event.target.value))}/>
            </label>
            <Button variant="secondary" size="small" onClick={() => setSeed((value) => value+1)}>Run again</Button>

            <div className="compare-columns">
                {[["TCP", tcp], ["UDP", udp]].map(([name, run]) => (
                    <div key={name}>
                        <h4>{name}: {run.received}/10 received, {run.sent} sent</h4>
                        <div className="segment-row">
                            {run.log.map((item) => (
                                <span key={item.segment} className={item.status.startsWith("lost") ? "segment is-lost" : item.tries > 1 ? "segment is-resent" : "segment"} title={item.status}>
                                    {item.segment}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <Explain>TCP numbers, acknowledges and resends segments, so everything arrives in order at the cost of extra traffic and delay. UDP sends each datagram once with no connection setup, which suits DNS lookups, voice and video where late data is useless.</Explain>
        </SimCard>
    );
}

const SOCKETS=[
    {protocol:"TCP",port:80,application:"Web server"},
    {protocol:"TCP",port:443,application:"HTTPS server"},
    {protocol:"TCP",port:22,application:"SSH server"},
    {protocol:"UDP",port:53,application:"DNS server"}
];

function Demultiplexing(){
    const [protocol, setProtocol]=useState("TCP");
    const [port, setPort]=useState(443);
    const [log, setLog]=useState([]);
    const valid=Number.isInteger(port) && port > 0 && port < 65536;

    function sendSegment(){
        if(!valid){
            return;
        }

        const [result]=demultiplex([{protocol,destinationPort:port,sourcePort:49152+log.length}], SOCKETS);

        setLog((current) => [result, ...current].slice(0, 6));
    }

    return (
        <SimCard title="Ports, multiplexing and demultiplexing" description="One host runs many services. The transport layer uses the protocol and destination port to hand each segment to the right application.">
            <div className="sim-inputs">
                <SelectField label="Protocol" value={protocol} onChange={(event) => setProtocol(event.target.value)}>
                    <option>TCP</option>
                    <option>UDP</option>
                </SelectField>
                <TextField label="Destination port" type="number" value={port} error={valid ? "" : "Ports run from 1 to 65535."} onChange={(event) => setPort(Number(event.target.value))}/>
                <Button onClick={sendSegment} disabled={!valid}>Send segment</Button>
            </div>

            <p className="muted small">Listening: {SOCKETS.map((socket) => `${socket.application} (${socket.protocol} ${socket.port})`).join(", ")}</p>

            <ol className="event-log">
                {log.map((item, index) => (
                    <li key={index} className={item.deliveredTo ? "event event-deliver" : "event event-lost"}>
                        <span className="event-type">{item.protocol} {item.sourcePort} → {item.destinationPort}</span>
                        <small>{item.note}</small>
                    </li>
                ))}
            </ol>

            <details className="sim-details">
                <summary>Well-known ports</summary>
                <div className="table-wrap">
                    <table className="sim-table">
                        <tbody>
                            {WELL_KNOWN_PORTS.map((item) => (
                                <tr key={item.port}><td className="mono">{item.port}</td><td>{item.service}</td><td>{item.protocol}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </details>
        </SimCard>
    );
}

function CongestionControl(){
    const [variant, setVariant]=useState("reno");
    const [ssthresh, setSsthresh]=useState(16);
    const [losses, setLosses]=useState("9, 17");
    const result=useMemo(() => safely(() => {
        const rounds=losses.split(",").map((item) => item.trim()).filter(Boolean).map(Number);

        if(rounds.some((round) => !Number.isInteger(round) || round < 1 || round > 30)){
            throw new Error("Loss rounds must be whole numbers from 1 to 30.");
        }

        return congestionWindow({rounds:30,ssthresh,lossRounds:rounds,variant});
    }), [variant, ssthresh, losses]);

    return (
        <SimCard title="Flow and congestion control" description="The congestion window grows exponentially in slow start, then by one segment per round, and shrinks when loss is detected.">
            <div className="sim-inputs">
                <SelectField label="Variant" value={variant} onChange={(event) => setVariant(event.target.value)}>
                    <option value="reno">TCP Reno (fast recovery)</option>
                    <option value="tahoe">TCP Tahoe (restart from 1)</option>
                </SelectField>
                <TextField label="Initial ssthresh" type="number" min="2" value={ssthresh} onChange={(event) => setSsthresh(Number(event.target.value))}/>
                <TextField label="Loss in rounds" value={losses} hint="Comma separated" onChange={(event) => setLosses(event.target.value)}/>
            </div>

            <SimError message={result.error}/>

            <ul className="chart-legend">
                <li><i style={{background:"var(--series-1)"}}/>Congestion window (segments)</li>
                <li><i style={{background:"var(--series-2)"}}/>Slow-start threshold</li>
            </ul>

            {result.value && (
                <div className="chart-body" role="img" aria-label="Congestion window over time">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={result.value} margin={{top:8,right:12,bottom:0,left:-18}}>
                            <CartesianGrid stroke="var(--line)" vertical={false}/>
                            <XAxis dataKey="round" tick={{fill:"var(--text-muted)",fontSize:12}}/>
                            <YAxis tick={{fill:"var(--text-muted)",fontSize:12}}/>
                            <Tooltip contentStyle={{background:"var(--surface-solid)",border:"1px solid var(--line-strong)"}}/>
                            <Line type="stepAfter" dataKey="cwnd" name="cwnd (segments)" stroke="var(--series-1)" strokeWidth={2} dot={{r:3}} isAnimationActive={false}/>
                            <Line type="stepAfter" dataKey="ssthresh" name="ssthresh" stroke="var(--series-2)" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false}/>
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            <Explain>Flow control uses the receiver's advertised window so a fast sender cannot overflow a slow receiver. Congestion control uses cwnd so senders do not overload the network. The sender may have min(cwnd, receiver window) unacknowledged segments.</Explain>
        </SimCard>
    );
}

function TransportModule(){
    return (
        <div className="sim-grid">
            <Handshake/>
            <TcpVsUdp/>
            <Demultiplexing/>
            <CongestionControl/>
        </div>
    );
}

export default TransportModule;
