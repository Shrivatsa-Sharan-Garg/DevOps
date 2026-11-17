import {useRef, useState} from "react";
import {ShieldAlert, ShieldCheck, TriangleAlert} from "lucide-react";
import {TLS_STEPS, buildHttpRequest, dnsLookup, inspectLink, respondToRequest} from "../../sim/networks";
import Button from "../ui/Button";
import {SelectField, TextArea, TextField} from "../ui/Field";
import {Explain, SequenceDiagram, SimCard, SimError, StepControls} from "../sim/SimParts";
import {useStepper} from "../../hooks/useStepper";

function DnsTimeline({lookup}){
    const stepper=useStepper(lookup.steps.length, 900);
    const messages=lookup.steps.map((step) => ({
        label:`${step.from} → ${step.to}`,
        detail:step.message,
        toRight:step.to !== "Browser" && step.to !== "Local resolver"
    }));

    return (
        <>
            <StepControls stepper={stepper} total={lookup.steps.length}/>
            <SequenceDiagram left="Browser and resolver" right="DNS servers" messages={messages} visible={stepper.index+1}/>
        </>
    );
}

function DnsDemo(){
    const cache=useRef(new Map());
    const [domain, setDomain]=useState("www.devbridge.edu");
    const [lookup, setLookup]=useState(null);
    const [error, setError]=useState("");
    const [run, setRun]=useState(0);

    function resolve(){
        try{
            setLookup(dnsLookup(domain, cache.current));
            setError("");
            setRun((value) => value+1);
        }catch(failure){
            setError(failure.message);
        }
    }

    return (
        <SimCard title="DNS lookup" description="An iterative lookup from the root down to the authoritative server, followed by caching.">
            <div className="sim-inputs">
                <TextField label="Domain name" value={domain} onChange={(event) => setDomain(event.target.value)}/>
                <Button onClick={resolve}>Resolve</Button>
                <Button variant="ghost" onClick={() => {
                    cache.current.clear();
                    setLookup(null);
                }}>Clear cache</Button>
            </div>

            <SimError message={error}/>

            {lookup && (
                <>
                    <DnsTimeline key={run} lookup={lookup}/>
                    <Explain>
                        {lookup.fromCache ? "Answered from the resolver's cache, so no other servers were contacted." : `${lookup.steps.length} messages were needed. Resolve the same name again to see the cache at work.`}
                        {" "}Addresses come from 203.0.113.0/24, a range reserved for documentation, because this is a simulation.
                    </Explain>
                </>
            )}
        </SimCard>
    );
}

function HttpDemo(){
    const [method, setMethod]=useState("GET");
    const [path, setPath]=useState("/api/problems");
    const [body, setBody]=useState("{\"title\":\"Bus timings are unpredictable\"}");
    const [response, setResponse]=useState(null);
    const sendsBody=method === "POST";
    const raw=buildHttpRequest({method,path,headers:{Accept:"*/*"},body:sendsBody ? body : ""});

    function send(){
        const result=respondToRequest({method,path,body:sendsBody ? body : ""});
        const lines=[`HTTP/1.1 ${result.status} ${result.reason}`, `Content-Type: ${result.type}`];

        if(result.allow){
            lines.push(`Allow: ${result.allow}`);
        }

        setResponse({...result,raw:`${lines.join("\n")}\n\n${result.body}`});
    }

    return (
        <SimCard title="HTTP request and response" description="Build a request and send it to a small simulated web server. Try a missing path, a wrong method or invalid JSON.">
            <div className="sim-inputs">
                <SelectField label="Method" value={method} onChange={(event) => setMethod(event.target.value)}>
                    {["GET", "HEAD", "POST", "PUT", "DELETE"].map((item) => <option key={item}>{item}</option>)}
                </SelectField>
                <TextField label="Path" value={path} onChange={(event) => setPath(event.target.value.startsWith("/") ? event.target.value : `/${event.target.value}`)}/>
            </div>

            {sendsBody && <TextArea label="JSON body" rows={2} value={body} onChange={(event) => setBody(event.target.value)}/>}

            <div className="compare-columns">
                <div>
                    <h4>Request</h4>
                    <pre className="code-block">{raw}</pre>
                    <Button onClick={send}>Send request</Button>
                </div>

                <div>
                    <h4>Response</h4>
                    <pre className={response && response.status >= 400 ? "code-block is-error" : "code-block"}>{response ? response.raw : "Send a request to see the response."}</pre>
                </div>
            </div>

            <Explain>HTTP is stateless text over TCP, usually port 80, or 443 for HTTPS. 2xx means success, 4xx a client mistake and 5xx a server fault.</Explain>
        </SimCard>
    );
}

function TlsDemo(){
    const stepper=useStepper(TLS_STEPS.length, 1300);
    const messages=TLS_STEPS.map((step) => ({label:step.message,detail:step.detail,toRight:step.from !== "server"}));

    return (
        <SimCard title="HTTPS and the TLS handshake" description="A conceptual walk-through of how a browser and a server agree on encryption keys. No real cryptography runs here.">
            <StepControls stepper={stepper} total={TLS_STEPS.length}/>
            <SequenceDiagram left="Browser" right="Web server" messages={messages} visible={stepper.index+1}/>
            <Explain>The certificate binds the site's name to its public key, and a certificate authority's signature lets the browser trust it. This is authentication. The session keys then provide confidentiality and integrity.</Explain>
        </SimCard>
    );
}

const EMAIL_STEPS=[
    {label:"SMTP",detail:"Your mail app submits the message to your provider's server.",toRight:true},
    {label:"SMTP",detail:"Your provider looks up the recipient domain's MX record in DNS and relays the message.",toRight:true},
    {label:"IMAP or POP3",detail:"The recipient's app fetches the message. IMAP keeps it on the server; POP3 downloads it.",toRight:false}
];

function EmailAndRemote(){
    const stepper=useStepper(EMAIL_STEPS.length, 1300);

    return (
        <SimCard title="Email, FTP and remote login" description="Different application protocols for different jobs.">
            <StepControls stepper={stepper} total={EMAIL_STEPS.length}/>
            <SequenceDiagram left="Sender" right="Recipient" messages={EMAIL_STEPS} visible={stepper.index+1}/>
            <Explain>FTP uses one TCP connection for commands (port 21) and another for data (port 20 or a negotiated port). Telnet (port 23) sends everything, including passwords, in plain text; SSH (port 22) replaces it with an encrypted, authenticated session.</Explain>
        </SimCard>
    );
}

function PhishingChecker(){
    const [link, setLink]=useState("http://paypa1.com.secure-update.xyz/login");
    const [result, setResult]=useState(null);
    const [error, setError]=useState("");

    function inspect(){
        try{
            setResult(inspectLink(link));
            setError("");
        }catch(failure){
            setResult(null);
            setError(failure.message);
        }
    }

    const Icon=!result ? ShieldCheck : result.verdict === "Likely phishing" ? ShieldAlert : result.findings.length ? TriangleAlert : ShieldCheck;

    return (
        <SimCard title="Security threats: phishing, spam and spoofing" description="Check a link for common phishing tricks. The rules run in your browser; nothing is fetched.">
            <div className="sim-inputs">
                <TextField label="Link" value={link} onChange={(event) => setLink(event.target.value)}/>
                <Button onClick={inspect}>Check link</Button>
            </div>

            <SimError message={error}/>

            {result && (
                <div className="verdict">
                    <strong><Icon size={18} aria-hidden="true"/> {result.verdict}</strong>
                    <span className="muted small">Real domain: {result.registered}</span>
                    <ul>
                        {result.findings.map((finding) => <li key={finding.text} className={`finding-${finding.level}`}>{finding.text}</li>)}
                    </ul>
                </div>
            )}

            <Explain>Phishing imitates a trusted sender to steal credentials. Spam is unwanted bulk mail. Spoofing forges a sender's address, caller ID or IP address. SPF, DKIM and DMARC help mail servers detect spoofed email.</Explain>
        </SimCard>
    );
}

function ApplicationModule(){
    return (
        <div className="sim-grid">
            <DnsDemo/>
            <HttpDemo/>
            <TlsDemo/>
            <EmailAndRemote/>
            <PhishingChecker/>
        </div>
    );
}

export default ApplicationModule;
