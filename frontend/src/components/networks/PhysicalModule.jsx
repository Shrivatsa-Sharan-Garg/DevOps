import {useMemo, useState} from "react";
import {motion} from "motion/react";
import {OSI_LAYERS, TCPIP_LAYERS, encapsulate} from "../../sim/networks";
import {TextField, SelectField} from "../ui/Field";
import {Explain, SimCard, StepControls} from "../sim/SimParts";
import {useStepper} from "../../hooks/useStepper";

const TOPOLOGIES={
    bus:{
        label:"Bus",
        nodes:[[40, 60], [110, 60], [180, 60], [250, 60]],
        links:[[0, 1], [1, 2], [2, 3]],
        pros:"Cheap and simple to cable.",
        cons:"One cable fault stops the whole network, and collisions rise with more devices."
    },
    star:{
        label:"Star",
        nodes:[[150, 60], [60, 20], [240, 20], [60, 100], [240, 100]],
        links:[[0, 1], [0, 2], [0, 3], [0, 4]],
        pros:"A broken cable affects one device only, and faults are easy to find.",
        cons:"The central switch is a single point of failure."
    },
    ring:{
        label:"Ring",
        nodes:[[150, 15], [240, 60], [150, 105], [60, 60]],
        links:[[0, 1], [1, 2], [2, 3], [3, 0]],
        pros:"Predictable access, because data travels in one direction.",
        cons:"A single break can stop traffic unless the ring is doubled."
    },
    mesh:{
        label:"Full mesh",
        nodes:[[150, 15], [240, 60], [150, 105], [60, 60]],
        links:[[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]],
        pros:"Many redundant paths, so it survives link failures.",
        cons:"Needs n(n-1)/2 links, which becomes expensive quickly."
    }
};

const DEVICES=[
    {name:"Hub",layer:"Physical (1)",does:"Repeats incoming bits out of every port. One collision domain."},
    {name:"Switch",layer:"Data Link (2)",does:"Learns MAC addresses and forwards frames only to the right port."},
    {name:"Router",layer:"Network (3)",does:"Forwards packets between networks using IP addresses and a routing table."},
    {name:"Access point",layer:"Data Link (2)",does:"Connects wireless devices to a wired LAN."},
    {name:"Modem",layer:"Physical (1)",does:"Converts digital data to signals for the telephone, cable or fibre line."}
];

function EncapsulationPlayer(){
    const [message, setMessage]=useState("Hello DevBridge");
    const [protocol, setProtocol]=useState("TCP");
    const steps=useMemo(() => encapsulate(message || " ", {protocol}), [message, protocol]);
    const sequence=[...steps, ...steps.slice(0, -1).reverse().map((step) => ({...step,receiving:true}))];
    const stepper=useStepper(sequence.length, 1300);
    const current=sequence[stepper.index];

    return (
        <SimCard title="Encapsulation and decapsulation" description="Follow one message down the sender's stack, across the wire and back up the receiver's stack.">
            <div className="sim-inputs">
                <TextField label="Message" value={message} maxLength={40} onChange={(event) => setMessage(event.target.value)}/>
                <SelectField label="Transport protocol" value={protocol} onChange={(event) => setProtocol(event.target.value)}>
                    <option>TCP</option>
                    <option>UDP</option>
                </SelectField>
            </div>

            <StepControls stepper={stepper} total={sequence.length}/>

            <div className="encap-stage">
                <span className="eyebrow">{current.receiving ? "Receiver removes" : "Sender adds"} · {current.layer} layer · {current.pdu}</span>

                <motion.div className="pdu" key={stepper.index} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}>
                    {current.headers.map((header) => (
                        <span className="pdu-part pdu-header" key={header.label} title={header.fields.join(", ")}>{header.label}</span>
                    ))}
                    <span className={current.pdu === "Bits" ? "pdu-part pdu-bits" : "pdu-part pdu-data"}>{current.payload}</span>
                    {current.trailer && <span className="pdu-part pdu-header">{current.trailer.label}</span>}
                </motion.div>

                {current.headers[0] && (
                    <ul className="pdu-fields">
                        {current.headers[0].fields.map((field) => <li key={field}>{field}</li>)}
                    </ul>
                )}

                {current.bitCount && <Explain>The {current.bitCount} bits are sent as signals on the medium. Only the first 64 are shown.</Explain>}
            </div>
        </SimCard>
    );
}

function LayerModels(){
    const [selected, setSelected]=useState(4);
    const layer=OSI_LAYERS.find((item) => item.number === selected);

    return (
        <SimCard title="OSI and TCP/IP models" description="Select an OSI layer to see its job and where it sits in the TCP/IP model.">
            <div className="layer-models">
                <div className="layer-column">
                    <span className="eyebrow">OSI</span>
                    {OSI_LAYERS.map((item) => (
                        <button
                            type="button"
                            key={item.number}
                            className={item.number === selected ? "layer-cell is-active" : "layer-cell"}
                            onClick={() => setSelected(item.number)}
                        >
                            {item.number}. {item.name}
                        </button>
                    ))}
                </div>

                <div className="layer-column">
                    <span className="eyebrow">TCP/IP</span>
                    {TCPIP_LAYERS.map((item) => (
                        <div
                            key={item.name}
                            className={item.osi.includes(selected) ? "layer-cell layer-group is-active" : "layer-cell layer-group"}
                            style={{flexGrow:item.osi.length}}
                        >
                            {item.name}
                        </div>
                    ))}
                </div>
            </div>

            <Explain><strong>{layer.name}:</strong> {layer.role} Its data unit is called a {layer.pdu.toLowerCase()}.</Explain>
        </SimCard>
    );
}

function TopologyExplorer(){
    const [name, setName]=useState("star");
    const [broken, setBroken]=useState(null);
    const topology=TOPOLOGIES[name];

    function reachable(){
        const links=topology.links.filter((_, index) => index !== broken);
        const seen=new Set([1]);
        let grew=true;

        while(grew){
            grew=false;

            for(const [from, to] of links){
                if(seen.has(from) !== seen.has(to)){
                    seen.add(from);
                    seen.add(to);
                    grew=true;
                }
            }
        }

        return seen.size;
    }

    const connected=reachable();

    return (
        <SimCard title="Network topologies" description="Choose a topology, then click a link to break it and see who can still communicate.">
            <div className="chip-row">
                {Object.entries(TOPOLOGIES).map(([key, item]) => (
                    <button
                        type="button"
                        key={key}
                        className={key === name ? "chip is-active" : "chip"}
                        onClick={() => {
                            setName(key);
                            setBroken(null);
                        }}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            <svg className="topology" viewBox="0 0 300 120" role="img" aria-label={`${topology.label} topology`}>
                {topology.links.map(([from, to], index) => (
                    <line
                        key={index}
                        x1={topology.nodes[from][0]}
                        y1={topology.nodes[from][1]}
                        x2={topology.nodes[to][0]}
                        y2={topology.nodes[to][1]}
                        className={index === broken ? "topology-link is-broken" : "topology-link"}
                        onClick={() => setBroken(index === broken ? null : index)}
                    />
                ))}
                {topology.nodes.map(([x, y], index) => (
                    <circle key={index} cx={x} cy={y} r="10" className="topology-node"/>
                ))}
            </svg>

            <Explain>
                {broken === null ? "All links are working." : `With one link broken, device 2 can still reach ${connected} of ${topology.nodes.length} devices (including itself).`}
                {" "}<strong>Strength:</strong> {topology.pros} <strong>Weakness:</strong> {topology.cons}
            </Explain>
        </SimCard>
    );
}

function DevicesAndSwitching(){
    const [packets, setPackets]=useState(4);
    const [hops, setHops]=useState(3);
    const packetMs=10;
    const setupMs=30;
    const circuit=setupMs+packets*packetMs;
    const packet=(hops+packets-1)*packetMs;

    return (
        <SimCard title="Devices, media and switching" description="Network devices work at different layers. Compare circuit and packet switching for the same message.">
            <div className="table-wrap">
                <table className="sim-table">
                    <thead>
                        <tr><th scope="col">Device</th><th scope="col">Layer</th><th scope="col">What it does</th></tr>
                    </thead>
                    <tbody>
                        {DEVICES.map((device) => (
                            <tr key={device.name}><td>{device.name}</td><td>{device.layer}</td><td>{device.does}</td></tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="sim-inputs">
                <TextField label="Packets in the message" type="number" min="1" max="20" value={packets} onChange={(event) => setPackets(Math.min(20, Math.max(1, Number(event.target.value) || 1)))}/>
                <TextField label="Links on the path" type="number" min="1" max="10" value={hops} onChange={(event) => setHops(Math.min(10, Math.max(1, Number(event.target.value) || 1)))}/>
            </div>

            <div className="stat-row">
                <div><strong>{circuit} ms</strong><span>Circuit switching</span></div>
                <div><strong>{packet} ms</strong><span>Packet switching</span></div>
            </div>

            <Explain>
                Sending one packet onto a link takes {packetMs} ms. Circuit switching first spends {setupMs} ms reserving a path,
                then streams all packets end to end: {setupMs} + packets x {packetMs} ms. Packet switching stores and forwards
                each packet at every router, so the delay is (links + packets - 1) x {packetMs} ms, ignoring propagation and queueing.
                Guided media such as twisted pair, coaxial cable and optical fibre carry these signals along a cable; wireless media use radio waves.
            </Explain>
        </SimCard>
    );
}

function PhysicalModule(){
    return (
        <div className="sim-grid">
            <EncapsulationPlayer/>
            <LayerModels/>
            <TopologyExplorer/>
            <DevicesAndSwitching/>
        </div>
    );
}

export default PhysicalModule;
