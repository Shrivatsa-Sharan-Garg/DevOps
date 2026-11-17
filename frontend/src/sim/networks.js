export const OSI_LAYERS=[
    {number:7,name:"Application",pdu:"Data",role:"Network services for the user, such as HTTP, DNS and SMTP."},
    {number:6,name:"Presentation",pdu:"Data",role:"Formats, encrypts and compresses data."},
    {number:5,name:"Session",pdu:"Data",role:"Opens, manages and closes conversations."},
    {number:4,name:"Transport",pdu:"Segment",role:"End-to-end delivery with port numbers, reliability and flow control."},
    {number:3,name:"Network",pdu:"Packet",role:"Logical addressing and routing between networks."},
    {number:2,name:"Data Link",pdu:"Frame",role:"Delivery on one link using MAC addresses and error detection."},
    {number:1,name:"Physical",pdu:"Bits",role:"Transmits raw bits as electrical, light or radio signals."}
];

export const TCPIP_LAYERS=[
    {name:"Application",osi:[7, 6, 5]},
    {name:"Transport",osi:[4]},
    {name:"Internet",osi:[3]},
    {name:"Network Access",osi:[2, 1]}
];

export function textToBits(text){
    return [...new TextEncoder().encode(text)]
        .map((byte) => byte.toString(2).padStart(8, "0"))
        .join("");
}

export function encapsulate(message, {protocol="TCP",sourcePort=50432,destinationPort=80,sourceIp="192.168.1.10",destinationIp="93.184.216.34",sourceMac="3C:52:82:11:AF:01",destinationMac="F4:EC:38:9A:20:7B"}={}){
    const transport={label:`${protocol} header`,fields:[`Source port ${sourcePort}`,`Destination port ${destinationPort}`]};

    if(protocol === "TCP"){
        transport.fields.push("Sequence and acknowledgement numbers","Flags and window size");
    }else{
        transport.fields.push("Length","Checksum");
    }

    const network={label:"IP header",fields:[`Source IP ${sourceIp}`,`Destination IP ${destinationIp}`,"TTL 64",`Protocol ${protocol}`]};
    const link={label:"Ethernet header",fields:[`Source MAC ${sourceMac}`,`Destination MAC ${destinationMac}`,"Type IPv4"]};
    const trailer={label:"Ethernet trailer",fields:["Frame check sequence (CRC-32)"]};
    const bits=textToBits(message);

    return [
        {layer:"Application",pdu:"Data",headers:[],trailer:null,payload:message},
        {layer:"Transport",pdu:"Segment",headers:[transport],trailer:null,payload:message},
        {layer:"Network",pdu:"Packet",headers:[network, transport],trailer:null,payload:message},
        {layer:"Data Link",pdu:"Frame",headers:[link, network, transport],trailer,payload:message},
        {layer:"Physical",pdu:"Bits",headers:[],trailer:null,payload:bits.slice(0, 64)+(bits.length > 64 ? "…" : ""),bitCount:bits.length}
    ];
}

function isBitString(value){
    return /^[01]+$/.test(value);
}

export function parityBit(bits, mode="even"){
    if(!isBitString(bits)){
        throw new Error("Enter only 0s and 1s.");
    }

    const ones=[...bits].filter((bit) => bit === "1").length;
    const evenBit=ones%2 === 0 ? "0" : "1";

    if(mode === "even"){
        return evenBit;
    }

    return evenBit === "0" ? "1" : "0";
}

export function checkParity(codeword, mode="even"){
    if(!isBitString(codeword) || codeword.length < 2){
        throw new Error("Enter at least two bits.");
    }

    const ones=[...codeword].filter((bit) => bit === "1").length;
    const valid=mode === "even" ? ones%2 === 0 : ones%2 === 1;

    return {ones,valid};
}

export function flipBit(bits, index){
    const flipped=bits[index] === "1" ? "0" : "1";

    return bits.slice(0, index)+flipped+bits.slice(index+1);
}

function xorBits(left, right){
    let result="";

    for(let index=0;index < left.length;index++){
        result+=left[index] === right[index] ? "0" : "1";
    }

    return result;
}

export function crcDivide(data, generator){
    if(!isBitString(data) || !isBitString(generator)){
        throw new Error("Data and generator must contain only 0s and 1s.");
    }

    if(generator.length < 2 || generator[0] !== "1"){
        throw new Error("The generator must start with 1 and have at least two bits.");
    }

    const degree=generator.length-1;
    const dividend=data+"0".repeat(degree);
    const steps=[];
    let current=dividend.slice(0, generator.length);
    let position=generator.length;

    while(true){
        const divisor=current[0] === "1" ? generator : "0".repeat(generator.length);
        const result=xorBits(current, divisor);

        steps.push({window:current,divisor,result});

        if(position >= dividend.length){
            current=result.slice(1);
            break;
        }

        current=result.slice(1)+dividend[position];
        position++;
    }

    return {dividend,remainder:current,codeword:data+current,steps};
}

export function crcCheck(received, generator){
    const degree=generator.length-1;
    const data=received.slice(0, received.length-degree);
    const {remainder}=crcDivide(received, generator);
    const syndrome=remainder;

    return {valid:/^0+$/.test(syndrome),syndrome,data};
}

export function bitStuff(bits){
    if(!isBitString(bits)){
        throw new Error("Enter only 0s and 1s.");
    }

    let output="";
    let run=0;
    const stuffedAt=[];

    for(const bit of bits){
        output+=bit;
        run=bit === "1" ? run+1 : 0;

        if(run === 5){
            stuffedAt.push(output.length);
            output+="0";
            run=0;
        }
    }

    return {flag:"01111110",stuffed:output,stuffedAt,frame:`01111110${output}01111110`};
}

export function bitUnstuff(stuffed){
    let output="";
    let run=0;
    let skip=false;

    for(const bit of stuffed){
        if(skip){
            skip=false;
            run=0;
            continue;
        }

        output+=bit;
        run=bit === "1" ? run+1 : 0;

        if(run === 5){
            skip=true;
        }
    }

    return output;
}

function lostOnFirstTry(lost, frame, attempts){
    return lost.has(frame) && attempts.get(frame) === 1;
}

function countAttempt(attempts, frame){
    attempts.set(frame, (attempts.get(frame) || 0)+1);
}

function stopAndWait(total, lostFrames, lostAcks){
    const events=[];
    const attempts=new Map();
    const ackAttempts=new Map();
    let time=0;

    for(let frame=0;frame < total;frame++){
        let acknowledged=false;
        let duplicate=false;

        while(!acknowledged){
            countAttempt(attempts, frame);
            const retry=attempts.get(frame) > 1;
            events.push({time:time++,type:retry ? "retransmit" : "send",frame});

            if(lostOnFirstTry(lostFrames, frame, attempts)){
                events.push({time:time++,type:"lost",frame,note:"Frame lost, so the sender waits for a timeout."});
                events.push({time:time++,type:"timeout",frame});
                continue;
            }

            events.push({time:time++,type:duplicate ? "duplicate" : "deliver",frame,note:duplicate ? "Receiver already has this frame and discards it, but acknowledges it again." : ""});
            countAttempt(ackAttempts, frame);

            if(lostAcks.has(frame) && ackAttempts.get(frame) === 1){
                events.push({time:time++,type:"ack-lost",frame,note:"The acknowledgement is lost."});
                events.push({time:time++,type:"timeout",frame});
                duplicate=true;
                continue;
            }

            events.push({time:time++,type:"ack",frame,note:`ACK ${(frame+1)%2}`});
            acknowledged=true;
        }
    }

    return events;
}

function goBackN(total, windowSize, lostFrames){
    const events=[];
    const attempts=new Map();
    let base=0;
    let time=0;

    while(base < total){
        const end=Math.min(base+windowSize, total);
        let expected=base;
        let lossSeen=false;

        for(let frame=base;frame < end;frame++){
            countAttempt(attempts, frame);
            events.push({time:time++,type:attempts.get(frame) > 1 ? "retransmit" : "send",frame});

            if(lostOnFirstTry(lostFrames, frame, attempts)){
                events.push({time:time++,type:"lost",frame});
                lossSeen=true;
            }else if(frame === expected && !lossSeen){
                events.push({time:time++,type:"deliver",frame});
                events.push({time:time++,type:"ack",frame,note:`Cumulative ACK up to ${frame}`});
                expected++;
            }else{
                events.push({time:time++,type:"discard",frame,note:`Out of order, receiver still expects ${expected}.`});
            }
        }

        if(expected < end){
            events.push({time:time++,type:"timeout",frame:expected,note:`Go back and resend from frame ${expected}.`});
        }

        base=expected;
    }

    return events;
}

function selectiveRepeat(total, windowSize, lostFrames){
    const events=[];
    const attempts=new Map();
    const acknowledged=new Set();
    let base=0;
    let time=0;

    while(base < total){
        const end=Math.min(base+windowSize, total);
        const missing=[];

        for(let frame=base;frame < end;frame++){
            if(acknowledged.has(frame)){
                continue;
            }

            countAttempt(attempts, frame);
            events.push({time:time++,type:attempts.get(frame) > 1 ? "retransmit" : "send",frame});

            if(lostOnFirstTry(lostFrames, frame, attempts)){
                events.push({time:time++,type:"lost",frame});
                missing.push(frame);
            }else{
                const buffered=missing.length > 0;
                events.push({time:time++,type:buffered ? "buffer" : "deliver",frame,note:buffered ? "Stored until the missing frame arrives." : ""});
                events.push({time:time++,type:"ack",frame,note:`Individual ACK ${frame}`});
                acknowledged.add(frame);
            }
        }

        for(const frame of missing){
            events.push({time:time++,type:"timeout",frame,note:`Only frame ${frame} is resent.`});
        }

        while(acknowledged.has(base)){
            base++;
        }
    }

    return events;
}

export function simulateArq({protocol, frames, windowSize=4, lostFrames=[], lostAcks=[]}){
    if(!Number.isInteger(frames) || frames < 1 || frames > 16){
        throw new Error("Use between 1 and 16 frames.");
    }

    if(!Number.isInteger(windowSize) || windowSize < 1 || windowSize > 8){
        throw new Error("Use a window size between 1 and 8.");
    }

    const lost=new Set(lostFrames);
    let events;

    if(protocol === "stop-and-wait"){
        events=stopAndWait(frames, lost, new Set(lostAcks));
    }else if(protocol === "go-back-n"){
        events=goBackN(frames, windowSize, lost);
    }else{
        events=selectiveRepeat(frames, windowSize, lost);
    }

    const transmissions=events.filter((event) => event.type === "send" || event.type === "retransmit").length;

    return {events,transmissions,retransmissions:transmissions-frames,efficiency:frames/transmissions};
}

export function alohaThroughput(load, variant="pure"){
    if(variant === "pure"){
        return load*Math.exp(-2*load);
    }

    return load*Math.exp(-load);
}

export function alohaCurve(maxLoad=3, step=0.1){
    const points=[];

    for(let load=0;load <= maxLoad+1e-9;load+=step){
        const rounded=Math.round(load*100)/100;
        points.push({load:rounded,pure:alohaThroughput(rounded, "pure"),slotted:alohaThroughput(rounded, "slotted")});
    }

    return points;
}

export function backoffRange(collisions){
    if(!Number.isInteger(collisions) || collisions < 1){
        throw new Error("Collisions must be a whole number of at least 1.");
    }

    if(collisions > 16){
        return null;
    }

    const exponent=Math.min(collisions, 10);

    return {min:0,max:2**exponent-1};
}

function seededRandom(seed){
    let state=seed >>> 0;

    return () => {
        state=(state*1664525+1013904223) >>> 0;

        return state/2**32;
    };
}

export function simulateCsmaCd(stations=2, seed=7, slotMicroseconds=51.2){
    const random=seededRandom(seed);
    const rounds=[];
    let waiting=Array.from({length:stations}, (_, index) => index);
    let collisions=0;

    while(waiting.length > 1 && collisions < 16){
        collisions++;
        const range=backoffRange(collisions);
        const choices=waiting.map((station) => ({station,slots:Math.floor(random()*(range.max+1))}));
        const lowest=Math.min(...choices.map((choice) => choice.slots));
        const winners=choices.filter((choice) => choice.slots === lowest);

        rounds.push({collision:collisions,range,choices,delay:lowest*slotMicroseconds,outcome:winners.length === 1 ? `Station ${winners[0].station+1} transmits first` : "Collision again"});

        if(winners.length === 1){
            waiting=waiting.filter((station) => station !== winners[0].station);
        }
    }

    return rounds;
}

export function parseIpv4(text){
    const parts=String(text).trim().split(".");

    if(parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)){
        throw new Error(`"${text}" is not a valid IPv4 address.`);
    }

    return parts.reduce((value, part) => value*256+Number(part), 0);
}

export function formatIpv4(value){
    return [24, 16, 8, 0].map((shift) => Math.floor(value/2**shift)%256).join(".");
}

function maskFromPrefix(prefix){
    return prefix === 0 ? 0 : (2**32)-(2**(32-prefix));
}

export function parseCidr(text){
    const [address, prefixText]=String(text).trim().split("/");

    if(prefixText === undefined || !/^\d{1,2}$/.test(prefixText) || Number(prefixText) > 32){
        throw new Error("Write the network as address/prefix, for example 192.168.10.0/24.");
    }

    return {ip:parseIpv4(address),prefix:Number(prefixText)};
}

function ipv4Class(ip){
    const first=Math.floor(ip/2**24);

    if(first < 128){
        return "A";
    }

    if(first < 192){
        return "B";
    }

    if(first < 224){
        return "C";
    }

    if(first < 240){
        return "D (multicast)";
    }

    return "E (reserved)";
}

function isPrivate(ip){
    const ranges=[["10.0.0.0", 8], ["172.16.0.0", 12], ["192.168.0.0", 16]];

    return ranges.some(([network, prefix]) => {
        const block=2**(32-prefix);

        return Math.floor(ip/block) === Math.floor(parseIpv4(network)/block);
    });
}

export function subnetInfo(text){
    const {ip, prefix}=parseCidr(text);
    const size=2**(32-prefix);
    const network=Math.floor(ip/size)*size;
    const broadcast=network+size-1;
    let firstHost=network+1;
    let lastHost=broadcast-1;
    let usableHosts=size-2;

    if(prefix === 32){
        firstHost=network;
        lastHost=network;
        usableHosts=1;
    }else if(prefix === 31){
        firstHost=network;
        lastHost=broadcast;
        usableHosts=2;
    }

    return {
        address:formatIpv4(ip),
        prefix,
        mask:formatIpv4(maskFromPrefix(prefix)),
        wildcard:formatIpv4((2**32-1)-maskFromPrefix(prefix)),
        network:formatIpv4(network),
        broadcast:formatIpv4(broadcast),
        firstHost:formatIpv4(firstHost),
        lastHost:formatIpv4(lastHost),
        totalAddresses:size,
        usableHosts,
        ipClass:ipv4Class(ip),
        isPrivate:isPrivate(ip),
        isNetworkAddress:ip === network,
        binaryMask:formatIpv4(maskFromPrefix(prefix)).split(".").map((octet) => Number(octet).toString(2).padStart(8, "0")).join(".")
    };
}

export function splitSubnet(text, count){
    const {ip, prefix}=parseCidr(text);

    if(!Number.isInteger(count) || count < 2){
        throw new Error("Split into at least 2 subnets.");
    }

    const extraBits=Math.ceil(Math.log2(count));
    const newPrefix=prefix+extraBits;

    if(newPrefix > 30){
        throw new Error(`/${prefix} cannot be split into ${count} subnets that still have usable hosts.`);
    }

    const size=2**(32-newPrefix);
    const start=Math.floor(ip/2**(32-prefix))*2**(32-prefix);
    const subnets=[];

    for(let index=0;index < 2**extraBits;index++){
        subnets.push(subnetInfo(`${formatIpv4(start+index*size)}/${newPrefix}`));
    }

    return {newPrefix,borrowedBits:extraBits,subnets};
}

export function longestPrefixMatch(destination, table){
    const ip=parseIpv4(destination);
    const matches=[];

    for(const route of table){
        const {ip:network, prefix}=parseCidr(route.prefix);
        const size=2**(32-prefix);

        if(Math.floor(ip/size) === Math.floor(network/size)){
            matches.push({...route,length:prefix});
        }
    }

    matches.sort((left, right) => right.length-left.length);

    return {matches,chosen:matches[0] || null};
}

export function expandIpv6(text){
    const value=String(text).trim().toLowerCase();

    if(!/^[0-9a-f:]+$/.test(value) || (value.match(/::/g) || []).length > 1){
        throw new Error("That is not a valid IPv6 address.");
    }

    const [head, tail]=value.includes("::") ? value.split("::") : [value, null];
    const headGroups=head ? head.split(":") : [];
    const tailGroups=tail ? tail.split(":") : [];
    const missing=8-headGroups.length-tailGroups.length;

    if((tail === null && missing !== 0) || missing < 0 || (tail !== null && missing < 1)){
        throw new Error("An IPv6 address has exactly eight groups.");
    }

    const groups=[...headGroups, ...Array(tail === null ? 0 : missing).fill("0"), ...tailGroups];

    if(groups.some((group) => group.length === 0 || group.length > 4)){
        throw new Error("Each IPv6 group has one to four hexadecimal digits.");
    }

    return groups.map((group) => group.padStart(4, "0")).join(":");
}

export function compressIpv6(text){
    const groups=expandIpv6(text).split(":").map((group) => group.replace(/^0+(?=.)/, ""));
    let bestStart=-1;
    let bestLength=0;

    for(let start=0;start < 8;start++){
        let length=0;

        while(start+length < 8 && groups[start+length] === "0"){
            length++;
        }

        if(length > bestLength){
            bestStart=start;
            bestLength=length;
        }
    }

    if(bestLength < 2){
        return groups.join(":");
    }

    const left=groups.slice(0, bestStart).join(":");
    const right=groups.slice(bestStart+bestLength).join(":");

    return `${left}::${right}`;
}

export const WELL_KNOWN_PORTS=[
    {port:20,service:"FTP data",protocol:"TCP"},
    {port:21,service:"FTP control",protocol:"TCP"},
    {port:22,service:"SSH",protocol:"TCP"},
    {port:23,service:"Telnet",protocol:"TCP"},
    {port:25,service:"SMTP",protocol:"TCP"},
    {port:53,service:"DNS",protocol:"UDP/TCP"},
    {port:67,service:"DHCP server",protocol:"UDP"},
    {port:80,service:"HTTP",protocol:"TCP"},
    {port:110,service:"POP3",protocol:"TCP"},
    {port:143,service:"IMAP",protocol:"TCP"},
    {port:443,service:"HTTPS",protocol:"TCP"}
];

export function demultiplex(segments, sockets){
    return segments.map((segment) => {
        const socket=sockets.find((item) => item.port === segment.destinationPort && item.protocol === segment.protocol);

        return {
            ...segment,
            deliveredTo:socket ? socket.application : null,
            note:socket ? `Delivered to ${socket.application}` : `No ${segment.protocol} socket on port ${segment.destinationPort}, so it is dropped${segment.protocol === "TCP" ? " with a RST" : " with an ICMP port unreachable"}.`
        };
    });
}

export function tcpHandshake(clientIsn, serverIsn){
    const valid=(value) => Number.isInteger(value) && value >= 0 && value < 2**32;

    if(!valid(clientIsn) || !valid(serverIsn)){
        throw new Error("Initial sequence numbers must be whole numbers from 0 to 4294967295.");
    }

    const next=(value) => (value+1)%2**32;

    return [
        {from:"client",flags:"SYN",seq:clientIsn,ack:null,clientState:"SYN-SENT",serverState:"LISTEN",note:"Client picks its initial sequence number and asks to open a connection."},
        {from:"server",flags:"SYN, ACK",seq:serverIsn,ack:next(clientIsn),clientState:"SYN-SENT",serverState:"SYN-RECEIVED",note:"Server acknowledges the client's SYN and sends its own sequence number."},
        {from:"client",flags:"ACK",seq:next(clientIsn),ack:next(serverIsn),clientState:"ESTABLISHED",serverState:"ESTABLISHED",note:"Client acknowledges the server. Both sides can now send data."}
    ];
}

export function tcpTeardown(clientSeq, serverSeq){
    const next=(value) => (value+1)%2**32;

    return [
        {from:"client",flags:"FIN, ACK",seq:clientSeq,ack:serverSeq,clientState:"FIN-WAIT-1",serverState:"ESTABLISHED"},
        {from:"server",flags:"ACK",seq:serverSeq,ack:next(clientSeq),clientState:"FIN-WAIT-2",serverState:"CLOSE-WAIT"},
        {from:"server",flags:"FIN, ACK",seq:serverSeq,ack:next(clientSeq),clientState:"FIN-WAIT-2",serverState:"LAST-ACK"},
        {from:"client",flags:"ACK",seq:next(clientSeq),ack:next(serverSeq),clientState:"TIME-WAIT",serverState:"CLOSED"}
    ];
}

export function congestionWindow({rounds=20, ssthresh=16, lossRounds=[], variant="reno"}){
    if(!Number.isInteger(rounds) || rounds < 1 || rounds > 60){
        throw new Error("Use between 1 and 60 rounds.");
    }

    if(!Number.isInteger(ssthresh) || ssthresh < 2){
        throw new Error("The slow-start threshold must be at least 2.");
    }

    const losses=new Set(lossRounds);
    const points=[];
    let cwnd=1;
    let threshold=ssthresh;

    for(let round=1;round <= rounds;round++){
        const phase=cwnd < threshold ? "slow start" : "congestion avoidance";
        const lost=losses.has(round);
        points.push({round,cwnd,ssthresh:threshold,phase,event:lost ? (variant === "tahoe" ? "timeout" : "3 duplicate ACKs") : ""});

        if(lost){
            threshold=Math.max(Math.floor(cwnd/2), 2);
            cwnd=variant === "tahoe" ? 1 : threshold;
        }else if(cwnd < threshold){
            cwnd=Math.min(cwnd*2, threshold);
        }else{
            cwnd+=1;
        }
    }

    return points;
}

function hashText(text){
    let hash=2166136261;

    for(const char of text){
        hash=Math.imul(hash^char.charCodeAt(0), 16777619) >>> 0;
    }

    return hash;
}

export function documentationAddress(domain){
    return `203.0.113.${1+hashText(domain)%254}`;
}

export function dnsLookup(domain, cache=new Map()){
    const name=String(domain).trim().toLowerCase().replace(/\.$/, "");

    if(!/^([a-z0-9](-?[a-z0-9])*\.)+[a-z]{2,}$/.test(name)){
        throw new Error("Enter a domain name such as www.example.edu.");
    }

    const labels=name.split(".");
    const tld=labels[labels.length-1];
    const zone=labels.slice(-2).join(".");
    const address=documentationAddress(name);

    if(cache.has(name)){
        return {
            address:cache.get(name),
            fromCache:true,
            steps:[
                {from:"Browser",to:"Local resolver",message:`Where is ${name}?`},
                {from:"Local resolver",to:"Browser",message:`Cached answer: ${cache.get(name)}`}
            ]
        };
    }

    cache.set(name, address);

    return {
        address,
        fromCache:false,
        steps:[
            {from:"Browser",to:"Local resolver",message:`Where is ${name}?`},
            {from:"Local resolver",to:"Root server",message:`Where is ${name}?`},
            {from:"Root server",to:"Local resolver",message:`Ask the .${tld} TLD servers.`},
            {from:"Local resolver",to:`.${tld} TLD server`,message:`Where is ${name}?`},
            {from:`.${tld} TLD server`,to:"Local resolver",message:`Ask the authoritative servers for ${zone}.`},
            {from:"Local resolver",to:`${zone} authoritative server`,message:`Where is ${name}?`},
            {from:`${zone} authoritative server`,to:"Local resolver",message:`A record: ${address}`},
            {from:"Local resolver",to:"Browser",message:`${name} is at ${address} (now cached).`}
        ]
    };
}

const DEMO_RESOURCES={
    "/":{type:"text/html",body:"<h1>DevBridge</h1>"},
    "/api/problems":{type:"application/json",body:"[{\"id\":1,\"title\":\"Bus timings are unpredictable\"}]"},
    "/about":{type:"text/html",body:"<p>About DevBridge</p>"}
};

export function buildHttpRequest({method="GET", host="devbridge.example", path="/", headers={}, body=""}){
    const lines=[`${method} ${path} HTTP/1.1`, `Host: ${host}`];

    for(const [name, value] of Object.entries(headers)){
        lines.push(`${name}: ${value}`);
    }

    if(body){
        lines.push("Content-Type: application/json", `Content-Length: ${new TextEncoder().encode(body).length}`);
    }

    return `${lines.join("\r\n")}\r\n\r\n${body}`;
}

export function respondToRequest({method="GET", path="/", body=""}){
    const resource=DEMO_RESOURCES[path];

    if(method === "POST" && path === "/api/problems"){
        try{
            const parsed=JSON.parse(body || "");

            if(!parsed.title){
                throw new Error("missing title");
            }

            return {status:201,reason:"Created",type:"application/json",body:JSON.stringify({id:2,title:parsed.title})};
        }catch{
            return {status:400,reason:"Bad Request",type:"application/json",body:"{\"error\":\"Send JSON with a title field.\"}"};
        }
    }

    if(!resource){
        return {status:404,reason:"Not Found",type:"text/html",body:"<h1>Not Found</h1>"};
    }

    if(method !== "GET" && method !== "HEAD"){
        return {status:405,reason:"Method Not Allowed",type:"text/plain",body:"",allow:"GET, HEAD"};
    }

    return {status:200,reason:"OK",type:resource.type,body:method === "HEAD" ? "" : resource.body};
}

export const TLS_STEPS=[
    {from:"client",message:"ClientHello",detail:"Supported TLS versions, cipher suites and a random value."},
    {from:"server",message:"ServerHello",detail:"Chosen version and cipher suite, plus the server's random value."},
    {from:"server",message:"Certificate",detail:"The server's certificate, signed by a certificate authority the browser trusts."},
    {from:"client",message:"Verify certificate",detail:"The browser checks the signature, the expiry date and that the name matches the site."},
    {from:"client",message:"Key exchange",detail:"Both sides derive the same session keys without sending them over the network."},
    {from:"both",message:"Finished",detail:"Each side proves it has the keys. From here on, HTTP data is encrypted."}
];

const TRUSTED_DOMAINS=["devbridge.example","google.com","paypal.com","sbi.co.in","amazon.in","microsoft.com"];

function editDistance(left, right){
    const rows=Array.from({length:left.length+1}, (_, index) => [index]);

    for(let column=1;column <= right.length;column++){
        rows[0][column]=column;
    }

    for(let row=1;row <= left.length;row++){
        for(let column=1;column <= right.length;column++){
            const cost=left[row-1] === right[column-1] ? 0 : 1;
            rows[row][column]=Math.min(rows[row-1][column]+1, rows[row][column-1]+1, rows[row-1][column-1]+cost);
        }
    }

    return rows[left.length][right.length];
}

export function inspectLink(text){
    let url;

    try{
        url=new URL(String(text).trim());
    }catch{
        throw new Error("Enter a full link starting with http:// or https://.");
    }

    const host=url.hostname.toLowerCase();
    const findings=[];
    const registered=host.split(".").slice(-2).join(".");

    if(url.protocol !== "https:"){
        findings.push({level:"warning",text:"The link does not use HTTPS, so anything typed into the page is sent unencrypted."});
    }

    if(/^\d+\.\d+\.\d+\.\d+$/.test(host)){
        findings.push({level:"danger",text:"The link uses a raw IP address instead of a domain name."});
    }

    if(host.startsWith("xn--") || host.includes(".xn--")){
        findings.push({level:"danger",text:"The domain uses punycode, which can disguise look-alike characters."});
    }

    if(String(text).includes("@")){
        findings.push({level:"danger",text:"The link contains @, so the real destination is the part after it."});
    }

    if(host.split(".").length > 4){
        findings.push({level:"warning",text:"The domain has many subdomains, a common trick to hide the real site."});
    }

    const labels=host.split(".");

    for(const trusted of TRUSTED_DOMAINS){
        const brand=trusted.split(".")[0];
        const genuine=registered === trusted || host.endsWith(`.${trusted}`);
        const looksAlike=editDistance(registered, trusted) <= 2;
        const brandLabel=labels.some((label) => label.length > 3 && editDistance(label, brand) <= 1);

        if(!genuine && (looksAlike || brandLabel)){
            findings.push({level:"danger",text:`The site imitates ${trusted} but is really ${registered}.`});
            break;
        }
    }

    return {host,registered,findings,verdict:findings.some((item) => item.level === "danger") ? "Likely phishing" : findings.length ? "Be careful" : "No warning signs found"};
}
