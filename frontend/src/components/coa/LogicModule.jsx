import {useMemo, useState} from "react";
import {GATES, implicantCoversCell, kmapLayout, minimize, truthTable} from "../../sim/coa";
import {SelectField, TextField} from "../ui/Field";
import {Explain, SimCard, SimError} from "../sim/SimParts";

const GROUP_COLOURS=["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)", "var(--series-5)", "var(--series-6)"];

function GateSimulator(){
    const [gate, setGate]=useState("XOR");
    const [a, setA]=useState(1);
    const [b, setB]=useState(0);
    const unary=gate === "NOT";
    const output=unary ? GATES.NOT(a) : GATES[gate](a, b);

    return (
        <SimCard title="Logic gates" description="Choose a gate and toggle its inputs. The full truth table is shown underneath.">
            <div className="chip-row">
                {Object.keys(GATES).map((name) => (
                    <button type="button" key={name} className={name === gate ? "chip is-active" : "chip"} onClick={() => setGate(name)}>{name}</button>
                ))}
            </div>

            <div className="gate-stage">
                <div className="gate-inputs">
                    <button type="button" className={a ? "bit-toggle is-on" : "bit-toggle"} onClick={() => setA(1-a)} aria-label={`Input A is ${a}`}>A = {a}</button>
                    {!unary && <button type="button" className={b ? "bit-toggle is-on" : "bit-toggle"} onClick={() => setB(1-b)} aria-label={`Input B is ${b}`}>B = {b}</button>}
                </div>
                <span className="gate-box">{gate}</span>
                <span className={output ? "bit-toggle is-on" : "bit-toggle"} aria-live="polite">Y = {output}</span>
            </div>

            <div className="table-wrap">
                <table className="sim-table truth-table">
                    <thead>
                        <tr>{unary ? <th>A</th> : <><th>A</th><th>B</th></>}<th>Y</th></tr>
                    </thead>
                    <tbody>
                        {(unary ? [[0], [1]] : [[0, 0], [0, 1], [1, 0], [1, 1]]).map((inputs) => {
                            const result=unary ? GATES.NOT(inputs[0]) : GATES[gate](inputs[0], inputs[1]);
                            const current=unary ? inputs[0] === a : inputs[0] === a && inputs[1] === b;

                            return (
                                <tr key={inputs.join("")} className={current ? "is-chosen" : ""}>
                                    {inputs.map((value, index) => <td key={index}>{value}</td>)}
                                    <td><strong>{result}</strong></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <Explain>NAND and NOR are universal gates: any logic circuit can be built from either one alone.</Explain>
        </SimCard>
    );
}

function ExpressionTable({onUseMinterms}){
    const [text, setText]=useState("A'B + AB' + AC");
    const result=useMemo(() => {
        try{
            return {value:truthTable(text),error:""};
        }catch(error){
            return {value:null,error:error.message};
        }
    }, [text]);
    const simplified=result.value && result.value.variables.length > 0 ? minimize(result.value.minterms, result.value.variables.length) : null;
    const sameNames=result.value && result.value.variables.join("") === "ABCD".slice(0, result.value.variables.length);

    return (
        <SimCard title="Boolean expressions and simplification" description="Write with A to D. Use + or OR, · or AND (or just AB), ' or NOT, and ^ or XOR.">
            <TextField label="Expression" value={text} onChange={(event) => setText(event.target.value)}/>
            <SimError message={result.error}/>

            {result.value && (
                <>
                    <div className="table-wrap truth-scroll">
                        <table className="sim-table truth-table">
                            <thead>
                                <tr>{result.value.variables.map((name) => <th key={name}>{name}</th>)}<th>Y</th></tr>
                            </thead>
                            <tbody>
                                {result.value.rows.map((row) => (
                                    <tr key={row.index} className={row.output ? "is-match" : ""}>
                                        {result.value.variables.map((name) => <td key={name}>{row.values[name]}</td>)}
                                        <td><strong>{row.output}</strong></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {simplified && sameNames && (
                        <Explain>
                            Minterms: Σm({result.value.minterms.join(", ") || "none"}). Simplest sum of products: <strong className="mono">{simplified.expression}</strong>
                            {" "}<button type="button" className="text-link" onClick={() => onUseMinterms(result.value.variables.length, result.value.minterms)}>Show on the K-map</button>
                        </Explain>
                    )}

                    {simplified && !sameNames && <Explain>Simplification is shown when variables start from A without gaps, for example A, B and C.</Explain>}
                </>
            )}
        </SimCard>
    );
}

function KarnaughMap({variables, setVariables, minterms, setMinterms}){
    const layout=kmapLayout(variables);
    const names="ABCD".slice(0, variables);
    const rowNames=names.slice(0, layout.rowBits);
    const columnNames=names.slice(layout.rowBits);
    const result=minimize(minterms, variables);
    const gray=(value, width) => width === 0 ? "" : value.toString(2).padStart(width, "0");

    function toggle(cell){
        setMinterms((current) => current.includes(cell) ? current.filter((item) => item !== cell) : [...current, cell].sort((a, b) => a-b));
    }

    return (
        <SimCard title="Karnaugh map" description="Click cells to set the output to 1. The map finds the largest groups and gives the simplest expression.">
            <div className="sim-inputs">
                <SelectField label="Variables" value={variables} onChange={(event) => {
                    setVariables(Number(event.target.value));
                    setMinterms([]);
                }}>
                    <option value={2}>2 (A, B)</option>
                    <option value={3}>3 (A, B, C)</option>
                    <option value={4}>4 (A, B, C, D)</option>
                </SelectField>
            </div>

            <div className="table-wrap">
                <table className="kmap">
                    <thead>
                        <tr>
                            <th scope="col">{rowNames || "-"} \ {columnNames}</th>
                            {layout.columns.map((column) => <th key={column} scope="col">{gray(column, layout.columnBits)}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {layout.rows.map((row) => (
                            <tr key={row}>
                                <th scope="row">{gray(row, layout.rowBits) || "-"}</th>
                                {layout.columns.map((column) => {
                                    const cell=layout.cell(row, column);
                                    const groups=result.implicants.map((implicant, index) => implicantCoversCell(implicant, cell) && minterms.includes(cell) ? index : -1).filter((index) => index >= 0);

                                    return (
                                        <td key={column}>
                                            <button
                                                type="button"
                                                className={minterms.includes(cell) ? "kmap-cell is-on" : "kmap-cell"}
                                                onClick={() => toggle(cell)}
                                                aria-label={`Cell ${cell} is ${minterms.includes(cell) ? 1 : 0}`}
                                            >
                                                {minterms.includes(cell) ? 1 : 0}
                                                <small>m{cell}</small>
                                                <span className="kmap-groups">
                                                    {groups.map((index) => <i key={index} style={{background:GROUP_COLOURS[index%GROUP_COLOURS.length]}}/>)}
                                                </span>
                                            </button>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Explain>
                Y = <strong className="mono">{result.expression}</strong>.
                {result.implicants.length > 0 && ` ${result.implicants.length} group${result.implicants.length === 1 ? "" : "s"}, each marked with a colour dot. Rows and columns follow Gray code, so neighbours differ by one bit and can merge.`}
            </Explain>
        </SimCard>
    );
}

function LogicModule(){
    const [variables, setVariables]=useState(3);
    const [minterms, setMinterms]=useState([1, 3, 5, 6, 7]);

    return (
        <div className="sim-grid">
            <GateSimulator/>
            <ExpressionTable onUseMinterms={(count, values) => {
                setVariables(count);
                setMinterms(values);
            }}/>
            <KarnaughMap variables={variables} setVariables={setVariables} minterms={minterms} setMinterms={setMinterms}/>
            <SimCard title="Combinational logic" description="Outputs depend only on the current inputs.">
                <div className="table-wrap">
                    <table className="sim-table">
                        <tbody>
                            <tr><td><strong>Half adder</strong></td><td className="mono">Sum = A ^ B, Carry = AB</td></tr>
                            <tr><td><strong>Full adder</strong></td><td className="mono">Sum = A ^ B ^ Cin, Cout = AB + Cin(A ^ B)</td></tr>
                            <tr><td><strong>2-to-1 multiplexer</strong></td><td className="mono">Y = S'A + SB</td></tr>
                            <tr><td><strong>2-to-4 decoder</strong></td><td className="mono">Yi = 1 only for input i</td></tr>
                        </tbody>
                    </table>
                </div>
                <Explain>Type any of these into the expression box, for example A ^ B ^ C for a full adder's sum, to see its truth table.</Explain>
            </SimCard>
        </div>
    );
}

export default LogicModule;
