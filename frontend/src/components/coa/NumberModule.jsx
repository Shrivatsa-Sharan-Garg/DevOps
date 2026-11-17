import {useState} from "react";
import {addBinary, parseInBase, representations, signedRange, toBase, toBcd} from "../../sim/coa";
import {SelectField, TextField} from "../ui/Field";
import {Explain, SimCard, SimError} from "../sim/SimParts";

const BASES=[
    {base:2,label:"Binary"},
    {base:8,label:"Octal"},
    {base:10,label:"Decimal"},
    {base:16,label:"Hexadecimal"}
];

function safely(compute){
    try{
        return {value:compute(),error:""};
    }catch(error){
        return {value:null,error:error.message};
    }
}

function Converter(){
    const [text, setText]=useState("-45");
    const [base, setBase]=useState(10);
    const [bits, setBits]=useState(8);
    const parsed=safely(() => parseInBase(text, base));
    const value=parsed.value;
    const forms=value === null ? null : safely(() => representations(value, bits));
    const range=signedRange(bits);

    return (
        <SimCard title="Number system converter" description="Convert between bases and see how the same value is stored as signed and unsigned binary.">
            <div className="sim-inputs">
                <TextField label="Value" value={text} onChange={(event) => setText(event.target.value)}/>
                <SelectField label="Written in" value={base} onChange={(event) => setBase(Number(event.target.value))}>
                    {BASES.map((item) => <option key={item.base} value={item.base}>{item.label}</option>)}
                </SelectField>
                <SelectField label="Word size" value={bits} onChange={(event) => setBits(Number(event.target.value))}>
                    {[4, 8, 16, 32].map((size) => <option key={size} value={size}>{size} bits</option>)}
                </SelectField>
            </div>

            <SimError message={parsed.error || forms?.error}/>

            {value !== null && forms?.value && (
                <>
                    <dl className="sim-facts">
                        {value >= 0 && BASES.map((item) => (
                            <div key={item.base}><dt>{item.label}</dt><dd className="mono">{toBase(value, item.base)}</dd></div>
                        ))}
                        {value < 0 && <div><dt>Decimal</dt><dd className="mono">{value}</dd></div>}
                        <div><dt>Unsigned {bits}-bit</dt><dd className="mono">{forms.value.unsigned ?? `Does not fit (0 to ${forms.value.unsignedMax})`}</dd></div>
                        <div><dt>Sign-magnitude</dt><dd className="mono">{forms.value.signMagnitude ?? "Does not fit"}</dd></div>
                        <div><dt>1's complement</dt><dd className="mono">{forms.value.onesComplement ?? "Does not fit"}</dd></div>
                        <div><dt>2's complement</dt><dd className="mono">{forms.value.twosComplement ?? `Overflow (range ${range.min} to ${range.max})`}</dd></div>
                    </dl>

                    {forms.value.overflow && <SimError message={`${value} does not fit in ${bits} bits in any form, so it would overflow.`}/>}

                    <Explain>
                        2's complement of a negative number: write the magnitude in binary, invert every bit (1's complement), then add 1.
                        A {bits}-bit 2's complement word holds {range.min} to {range.max}; sign-magnitude and 1's complement lose one value because they have two zeros.
                    </Explain>
                </>
            )}
        </SimCard>
    );
}

function BcdDemo(){
    const [text, setText]=useState("2026");
    const result=safely(() => {
        if(!/^\d{1,10}$/.test(text.trim())){
            throw new Error("Enter up to 10 decimal digits.");
        }

        return toBcd(Number(text.trim()));
    });

    return (
        <SimCard title="Binary-coded decimal" description="BCD stores each decimal digit in its own 4-bit group, which suits displays and calculators.">
            <TextField label="Decimal number" value={text} onChange={(event) => setText(event.target.value)}/>
            <SimError message={result.error}/>

            {result.value && (
                <>
                    <div className="bcd-row">
                        {result.value.map((item, index) => (
                            <span key={index}><strong>{item.digit}</strong><code>{item.code}</code></span>
                        ))}
                    </div>
                    <Explain>BCD needs {result.value.length*4} bits here, while plain binary needs {Number(text).toString(2).length}. Codes 1010 to 1111 are never used in BCD.</Explain>
                </>
            )}
        </SimCard>
    );
}

function BinaryAdder(){
    const [left, setLeft]=useState(100);
    const [right, setRight]=useState(50);
    const [bits, setBits]=useState(8);
    const range=signedRange(bits);
    const valid=[left, right].every((value) => Number.isInteger(value) && value >= range.min && value <= range.max);
    const result=valid ? addBinary(left, right, bits) : null;

    return (
        <SimCard title="Binary addition and status flags" description="Add two signed numbers the way an ALU does and see the carry and overflow flags.">
            <div className="sim-inputs">
                <TextField label="A" type="number" value={left} onChange={(event) => setLeft(Number(event.target.value))}/>
                <TextField label="B" type="number" value={right} onChange={(event) => setRight(Number(event.target.value))}/>
                <SelectField label="Word size" value={bits} onChange={(event) => setBits(Number(event.target.value))}>
                    {[4, 8, 16].map((size) => <option key={size} value={size}>{size} bits</option>)}
                </SelectField>
            </div>

            <SimError message={valid ? "" : `Both values must be between ${range.min} and ${range.max}.`}/>

            {result && (
                <>
                    <pre className="code-block">{`  ${representations(left, bits).twosComplement}  (${left})\n+ ${representations(right, bits).twosComplement}  (${right})\n= ${result.result}  (${result.signed} as signed)`}</pre>
                    <div className="stat-row">
                        <div><strong>{result.carry ? 1 : 0}</strong><span>Carry out</span></div>
                        <div><strong>{result.overflow ? 1 : 0}</strong><span>Signed overflow</span></div>
                    </div>
                    <Explain>
                        {result.overflow
                            ? `The true sum ${left+right} is outside ${range.min} to ${range.max}, so the signed result wraps to ${result.signed}. Overflow happens when two numbers with the same sign give a result with the other sign.`
                            : "No signed overflow. A carry out on its own only matters for unsigned arithmetic."}
                    </Explain>
                </>
            )}
        </SimCard>
    );
}

function NumberModule(){
    return (
        <div className="sim-grid">
            <Converter/>
            <BinaryAdder/>
            <BcdDemo/>
            <SimCard title="Basic computer organization" description="A stored-program (von Neumann) computer keeps instructions and data in the same memory.">
                <div className="table-wrap">
                    <table className="sim-table">
                        <tbody>
                            <tr><td><strong>CPU</strong></td><td>Control unit, ALU and registers fetch and execute instructions.</td></tr>
                            <tr><td><strong>Memory</strong></td><td>Holds programs and data, addressed by number.</td></tr>
                            <tr><td><strong>I/O</strong></td><td>Keyboards, displays, storage and network devices.</td></tr>
                            <tr><td><strong>Buses</strong></td><td>Address, data and control lines connect the parts.</td></tr>
                        </tbody>
                    </table>
                </div>
                <Explain>See the CPU tab to watch a stored program run through the fetch, decode and execute cycle.</Explain>
            </SimCard>
        </div>
    );
}

export default NumberModule;
