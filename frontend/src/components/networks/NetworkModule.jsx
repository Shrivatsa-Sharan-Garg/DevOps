import {useState} from "react";
import {compressIpv6, expandIpv6, longestPrefixMatch, splitSubnet, subnetInfo} from "../../sim/networks";
import {TextField} from "../ui/Field";
import {Explain, SequenceDiagram, SimCard, SimError, StepControls} from "../sim/SimParts";
import {useStepper} from "../../hooks/useStepper";

const ROUTING_TABLE=[
    {prefix:"0.0.0.0/0",nextHop:"203.0.113.1",iface:"wan0",note:"Default route to the ISP"},
    {prefix:"10.0.0.0/8",nextHop:"10.0.0.254",iface:"eth1",note:"Campus core"},
    {prefix:"10.20.0.0/16",nextHop:"10.20.0.1",iface:"eth2",note:"Engineering block"},
    {prefix:"10.20.30.0/24",nextHop:"Directly connected",iface:"eth3",note:"Networks lab"},
    {prefix:"192.168.1.0/24",nextHop:"Directly connected",iface:"eth0",note:"Office LAN"}
];

const PROTOCOLS=[
    {name:"RIP",type:"Distance vector",metric:"Hop count (max 15)",scope:"Small interior networks",updates:"Whole table every 30 seconds"},
    {name:"OSPF",type:"Link state",metric:"Cost from link bandwidth",scope:"Large interior networks, areas",updates:"Link-state changes, flooded to the area"},
    {name:"BGP",type:"Path vector",metric:"Policy and AS path",scope:"Between autonomous systems on the internet",updates:"Incremental updates over TCP port 179"}
];

function safely(compute){
    try{
        return {value:compute(),error:""};
    }catch(error){
        return {value:null,error:error.message};
    }
}

function SubnetCalculator(){
    const [cidr, setCidr]=useState("192.168.10.77/26");
    const [count, setCount]=useState(4);
    const info=safely(() => subnetInfo(cidr));
    const split=info.value ? safely(() => splitSubnet(cidr, count)) : {value:null,error:""};
    const rows=info.value ? [
        ["Network address", info.value.network],
        ["Broadcast address", info.value.broadcast],
        ["Usable host range", `${info.value.firstHost} - ${info.value.lastHost}`],
        ["Usable hosts", info.value.usableHosts.toLocaleString("en-IN")],
        ["Subnet mask", `${info.value.mask} (/${info.value.prefix})`],
        ["Mask in binary", info.value.binaryMask],
        ["Wildcard mask", info.value.wildcard],
        ["Class and scope", `Class ${info.value.ipClass} · ${info.value.isPrivate ? "private (RFC 1918)" : "public"}`]
    ] : [];

    return (
        <SimCard title="IPv4 subnet calculator" description="Enter any address with a prefix length. Then split the network into smaller subnets.">
            <div className="sim-inputs">
                <TextField label="Address / prefix" value={cidr} onChange={(event) => setCidr(event.target.value)}/>
                <TextField label="Split into" type="number" min="2" max="64" value={count} onChange={(event) => setCount(Number(event.target.value))}/>
            </div>

            <SimError message={info.error}/>

            {info.value && (
                <>
                    <dl className="sim-facts">
                        {rows.map(([label, value]) => (
                            <div key={label}><dt>{label}</dt><dd className="mono">{value}</dd></div>
                        ))}
                    </dl>

                    {!info.value.isNetworkAddress && <Explain>{info.value.address} is a host inside {info.value.network}/{info.value.prefix}. AND-ing the address with the mask gives the network address.</Explain>}

                    <SimError message={split.error}/>

                    {split.value && (
                        <div className="table-wrap">
                            <table className="sim-table">
                                <caption>Borrowing {split.value.borrowedBits} bits gives {split.value.subnets.length} subnets of /{split.value.newPrefix}</caption>
                                <thead>
                                    <tr><th scope="col">Subnet</th><th scope="col">Hosts</th><th scope="col">Broadcast</th></tr>
                                </thead>
                                <tbody>
                                    {split.value.subnets.slice(0, 16).map((subnet) => (
                                        <tr key={subnet.network}>
                                            <td className="mono">{subnet.network}/{subnet.prefix}</td>
                                            <td className="mono">{subnet.firstHost} - {subnet.lastHost}</td>
                                            <td className="mono">{subnet.broadcast}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </SimCard>
    );
}

function RoutingDemo(){
    const [destination, setDestination]=useState("10.20.30.45");
    const result=safely(() => longestPrefixMatch(destination, ROUTING_TABLE));
    const matched=new Set(result.value?.matches.map((match) => match.prefix) || []);

    return (
        <SimCard title="Datagram forwarding with a routing table" description="Routers forward each packet independently. When several routes match, the longest prefix wins.">
            <TextField label="Destination IP address" value={destination} onChange={(event) => setDestination(event.target.value)}/>
            <SimError message={result.error}/>

            <div className="table-wrap">
                <table className="sim-table">
                    <thead>
                        <tr><th scope="col">Prefix</th><th scope="col">Next hop</th><th scope="col">Interface</th><th scope="col">Match</th></tr>
                    </thead>
                    <tbody>
                        {ROUTING_TABLE.map((route) => {
                            const chosen=result.value?.chosen?.prefix === route.prefix;

                            return (
                                <tr key={route.prefix} className={chosen ? "is-chosen" : matched.has(route.prefix) ? "is-match" : ""}>
                                    <td className="mono">{route.prefix}</td>
                                    <td className="mono">{route.nextHop}</td>
                                    <td>{route.iface}</td>
                                    <td>{chosen ? "Chosen" : matched.has(route.prefix) ? "Matches" : "No"}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {result.value?.chosen && (
                <Explain>
                    {result.value.matches.length} route{result.value.matches.length === 1 ? "" : "s"} match. The /{result.value.chosen.length} route is the most specific,
                    so the packet leaves through {result.value.chosen.iface} towards {result.value.chosen.nextHop} ({result.value.chosen.note}).
                </Explain>
            )}
        </SimCard>
    );
}

function Ipv6Tool(){
    const [address, setAddress]=useState("2001:db8:0:0:0:ff00:42:8329");
    const expanded=safely(() => expandIpv6(address));
    const compressed=expanded.value ? compressIpv6(address) : "";

    return (
        <SimCard title="IPv6 addresses" description="IPv6 uses 128-bit addresses written as eight groups of hexadecimal digits.">
            <TextField label="IPv6 address" value={address} onChange={(event) => setAddress(event.target.value)}/>
            <SimError message={expanded.error}/>

            {expanded.value && (
                <dl className="sim-facts">
                    <div><dt>Full form</dt><dd className="mono">{expanded.value}</dd></div>
                    <div><dt>Shortest form</dt><dd className="mono">{compressed}</dd></div>
                </dl>
            )}

            <Explain>Leading zeros in a group can be dropped, and one run of all-zero groups can be replaced by ::. IPv6 has no broadcast, no NAT requirement and a simpler fixed header than IPv4.</Explain>
        </SimCard>
    );
}

function RoutingProtocols(){
    return (
        <SimCard title="RIP, OSPF and BGP" description="How each routing protocol learns paths.">
            <div className="table-wrap">
                <table className="sim-table">
                    <thead>
                        <tr><th scope="col">Protocol</th><th scope="col">Type</th><th scope="col">Metric</th><th scope="col">Used for</th><th scope="col">Updates</th></tr>
                    </thead>
                    <tbody>
                        {PROTOCOLS.map((protocol) => (
                            <tr key={protocol.name}>
                                <td><strong>{protocol.name}</strong></td>
                                <td>{protocol.type}</td>
                                <td>{protocol.metric}</td>
                                <td>{protocol.scope}</td>
                                <td>{protocol.updates}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </SimCard>
    );
}

const ARP_ICMP=[
    {label:"ARP request (broadcast)",detail:"Who has 192.168.1.20? Tell 192.168.1.10.",toRight:true},
    {label:"ARP reply (unicast)",detail:"192.168.1.20 is at 3C:52:82:11:AF:22.",toRight:false},
    {label:"ICMP Echo Request",detail:"ping: type 8, sequence 1",toRight:true},
    {label:"ICMP Echo Reply",detail:"type 0, sequence 1, round trip measured by the sender",toRight:false},
    {label:"Packet with TTL 1 to a far network",detail:"traceroute probe",toRight:true},
    {label:"ICMP Time Exceeded",detail:"type 11, sent by the router that dropped it",toRight:false,tone:"is-warning"}
];

function ArpIcmp(){
    const stepper=useStepper(ARP_ICMP.length);

    return (
        <SimCard title="ARP and ICMP" description="ARP finds the MAC address for an IP on the local network. ICMP carries errors and diagnostics.">
            <StepControls stepper={stepper} total={ARP_ICMP.length}/>
            <SequenceDiagram left="Host 192.168.1.10" right="192.168.1.20 / routers" messages={ARP_ICMP} visible={stepper.index+1}/>
        </SimCard>
    );
}

function NetworkModule(){
    return (
        <div className="sim-grid">
            <SubnetCalculator/>
            <RoutingDemo/>
            <Ipv6Tool/>
            <RoutingProtocols/>
            <ArpIcmp/>
        </div>
    );
}

export default NetworkModule;
