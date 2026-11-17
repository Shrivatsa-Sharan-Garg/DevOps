import assert from "node:assert/strict";
import {test} from "node:test";
import {
    alohaThroughput,
    backoffRange,
    bitStuff,
    bitUnstuff,
    checkParity,
    compressIpv6,
    congestionWindow,
    crcCheck,
    crcDivide,
    demultiplex,
    dnsLookup,
    encapsulate,
    expandIpv6,
    flipBit,
    inspectLink,
    longestPrefixMatch,
    parityBit,
    respondToRequest,
    simulateArq,
    simulateCsmaCd,
    splitSubnet,
    subnetInfo,
    tcpHandshake
} from "./networks.js";

test("encapsulation adds headers layer by layer", () => {
    const steps=encapsulate("Hi");

    assert.deepEqual(steps.map((step) => step.pdu), ["Data", "Segment", "Packet", "Frame", "Bits"]);
    assert.equal(steps[3].headers[0].label, "Ethernet header");
    assert.equal(steps[3].trailer.label, "Ethernet trailer");
    assert.equal(steps[4].payload, "0100100001101001");
    assert.ok(encapsulate("Hi", {protocol:"UDP"})[1].headers[0].fields.includes("Checksum"));
});

test("parity bits and single-bit error detection", () => {
    assert.equal(parityBit("1011001", "even"), "0");
    assert.equal(parityBit("1011001", "odd"), "1");
    assert.equal(checkParity("10110010", "even").valid, true);
    assert.equal(checkParity(flipBit("10110010", 3), "even").valid, false);
    assert.equal(checkParity(flipBit(flipBit("10110010", 1), 2), "even").valid, true);
    assert.throws(() => parityBit("10a1"));
});

test("CRC matches the textbook example", () => {
    const result=crcDivide("1101011011", "10011");

    assert.equal(result.remainder, "1110");
    assert.equal(result.codeword, "11010110111110");
    assert.equal(crcCheck(result.codeword, "10011").valid, true);
    assert.equal(crcCheck(flipBit(result.codeword, 4), "10011").valid, false);
    assert.throws(() => crcDivide("1010", "0101"));
});

test("bit stuffing round trip", () => {
    const result=bitStuff("011011111111111111110010");

    assert.equal(result.stuffed, "011011111011111011111010010");
    assert.equal(bitUnstuff(result.stuffed), "011011111111111111110010");
    assert.ok(result.frame.startsWith("01111110"));
});

test("stop-and-wait resends lost frames and lost acknowledgements", () => {
    const clean=simulateArq({protocol:"stop-and-wait",frames:4});
    const lossy=simulateArq({protocol:"stop-and-wait",frames:4,lostFrames:[1],lostAcks:[2]});

    assert.equal(clean.transmissions, 4);
    assert.equal(lossy.transmissions, 6);
    assert.ok(lossy.events.some((event) => event.type === "duplicate" && event.frame === 2));
});

test("go-back-N resends the lost frame and everything after it", () => {
    const result=simulateArq({protocol:"go-back-n",frames:8,windowSize:4,lostFrames:[2]});

    assert.equal(result.transmissions, 10);
    assert.ok(result.events.some((event) => event.type === "discard" && event.frame === 3));
});

test("selective repeat resends only the lost frame", () => {
    const result=simulateArq({protocol:"selective-repeat",frames:8,windowSize:4,lostFrames:[2]});

    assert.equal(result.transmissions, 9);
    assert.ok(result.events.some((event) => event.type === "buffer" && event.frame === 3));
});

test("ARQ input limits", () => {
    assert.throws(() => simulateArq({protocol:"go-back-n",frames:0}));
    assert.throws(() => simulateArq({protocol:"go-back-n",frames:4,windowSize:0}));
});

test("ALOHA peaks at the textbook loads", () => {
    assert.ok(Math.abs(alohaThroughput(0.5, "pure")-1/(2*Math.E)) < 1e-9);
    assert.ok(Math.abs(alohaThroughput(1, "slotted")-1/Math.E) < 1e-9);
});

test("binary exponential backoff ranges", () => {
    assert.deepEqual(backoffRange(1), {min:0,max:1});
    assert.deepEqual(backoffRange(3), {min:0,max:7});
    assert.deepEqual(backoffRange(12), {min:0,max:1023});
    assert.equal(backoffRange(17), null);

    const rounds=simulateCsmaCd(2, 7);
    assert.ok(rounds.length >= 1);
    assert.ok(rounds.every((round) => round.choices.every((choice) => choice.slots <= round.range.max)));
});

test("subnet details for a /26 network", () => {
    const info=subnetInfo("192.168.10.77/26");

    assert.equal(info.network, "192.168.10.64");
    assert.equal(info.broadcast, "192.168.10.127");
    assert.equal(info.firstHost, "192.168.10.65");
    assert.equal(info.lastHost, "192.168.10.126");
    assert.equal(info.mask, "255.255.255.192");
    assert.equal(info.usableHosts, 62);
    assert.equal(info.isPrivate, true);
    assert.equal(subnetInfo("8.8.8.8/32").usableHosts, 1);
    assert.equal(subnetInfo("10.0.0.0/31").usableHosts, 2);
    assert.throws(() => subnetInfo("192.168.1.300/24"));
    assert.throws(() => subnetInfo("192.168.1.0/33"));
});

test("splitting a /24 into four subnets", () => {
    const result=splitSubnet("192.168.1.0/24", 4);

    assert.equal(result.newPrefix, 26);
    assert.deepEqual(result.subnets.map((subnet) => subnet.network), ["192.168.1.0","192.168.1.64","192.168.1.128","192.168.1.192"]);
    assert.equal(splitSubnet("10.0.0.0/24", 3).subnets.length, 4);
    assert.throws(() => splitSubnet("10.0.0.0/30", 4));
});

test("longest prefix match picks the most specific route", () => {
    const table=[
        {prefix:"0.0.0.0/0",nextHop:"ISP"},
        {prefix:"10.0.0.0/8",nextHop:"Core"},
        {prefix:"10.1.2.0/24",nextHop:"Lab"}
    ];

    assert.equal(longestPrefixMatch("10.1.2.9", table).chosen.nextHop, "Lab");
    assert.equal(longestPrefixMatch("10.9.9.9", table).chosen.nextHop, "Core");
    assert.equal(longestPrefixMatch("8.8.8.8", table).chosen.nextHop, "ISP");
    assert.equal(longestPrefixMatch("10.1.2.9", table).matches.length, 3);
});

test("IPv6 expansion and compression", () => {
    assert.equal(expandIpv6("2001:db8::1"), "2001:0db8:0000:0000:0000:0000:0000:0001");
    assert.equal(compressIpv6("2001:0db8:0000:0000:0000:0000:0000:0001"), "2001:db8::1");
    assert.equal(compressIpv6("0:0:0:0:0:0:0:0"), "::");
    assert.equal(compressIpv6("2001:db8:0:1:0:0:0:1"), "2001:db8:0:1::1");
    assert.throws(() => expandIpv6("2001::db8::1"));
    assert.throws(() => expandIpv6("12345::1"));
});

test("TCP handshake sequence and acknowledgement numbers", () => {
    const steps=tcpHandshake(100, 300);

    assert.deepEqual(steps.map((step) => step.flags), ["SYN", "SYN, ACK", "ACK"]);
    assert.equal(steps[1].ack, 101);
    assert.equal(steps[2].ack, 301);
    assert.equal(tcpHandshake(4294967295, 0)[1].ack, 0);
});

test("demultiplexing by protocol and port", () => {
    const result=demultiplex(
        [{protocol:"TCP",destinationPort:80},{protocol:"UDP",destinationPort:80}],
        [{protocol:"TCP",port:80,application:"Web server"}]
    );

    assert.equal(result[0].deliveredTo, "Web server");
    assert.equal(result[1].deliveredTo, null);
});

test("congestion window follows slow start, avoidance and loss", () => {
    const reno=congestionWindow({rounds:8,ssthresh:8,lossRounds:[6]});

    assert.deepEqual(reno.map((point) => point.cwnd), [1, 2, 4, 8, 9, 10, 5, 6]);

    const tahoe=congestionWindow({rounds:8,ssthresh:8,lossRounds:[6],variant:"tahoe"});

    assert.equal(tahoe[6].cwnd, 1);
    assert.equal(tahoe[6].ssthresh, 5);
});

test("DNS lookup walks the hierarchy and then uses the cache", () => {
    const cache=new Map();
    const first=dnsLookup("www.example.edu", cache);
    const second=dnsLookup("www.example.edu", cache);

    assert.equal(first.fromCache, false);
    assert.equal(first.steps.length, 8);
    assert.match(first.address, /^203\.0\.113\.\d+$/);
    assert.equal(second.fromCache, true);
    assert.equal(second.address, first.address);
    assert.throws(() => dnsLookup("not a domain"));
});

test("HTTP responses follow the status code rules", () => {
    assert.equal(respondToRequest({method:"GET",path:"/"}).status, 200);
    assert.equal(respondToRequest({method:"GET",path:"/missing"}).status, 404);
    assert.equal(respondToRequest({method:"DELETE",path:"/about"}).status, 405);
    assert.equal(respondToRequest({method:"POST",path:"/api/problems",body:"{\"title\":\"x\"}"}).status, 201);
    assert.equal(respondToRequest({method:"POST",path:"/api/problems",body:"oops"}).status, 400);
});

test("phishing link inspection", () => {
    assert.equal(inspectLink("https://www.google.com/search").findings.length, 0);
    assert.equal(inspectLink("http://paypa1.com/login").verdict, "Likely phishing");
    assert.equal(inspectLink("https://paypal.com.secure-login.xyz/").verdict, "Likely phishing");
    assert.equal(inspectLink("http://192.168.4.20/bank").verdict, "Likely phishing");
    assert.equal(inspectLink("http://paypa1.com.secure-update.xyz/login").verdict, "Likely phishing");
    assert.equal(inspectLink("https://www.paypal.com/signin").findings.length, 0);
    assert.throws(() => inspectLink("not a link"));
});
