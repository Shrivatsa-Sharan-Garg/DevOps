import {useState} from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import {useReducedMotion} from "motion/react";
import {statusLabel} from "../../utils/format";

const AXIS_TICK={fill:"var(--text-muted)",fontSize:12};
const STATUS_COLORS={"open":"var(--series-1)","in-progress":"var(--series-2)","solved":"var(--series-6)"};
const ANIMATION_MS=900;

function ChartFrame({title, subtitle, legend, columns, rows, children}){
    const [showTable, setShowTable]=useState(false);

    return (
        <section className="surface chart-frame">
            <header className="chart-head">
                <div>
                    <h2>{title}</h2>
                    {subtitle && <p className="chart-subtitle">{subtitle}</p>}
                </div>

                <button
                    type="button"
                    className="text-link chart-toggle"
                    aria-pressed={showTable}
                    onClick={() => setShowTable(!showTable)}
                >
                    {showTable ? "View chart" : "View table"}
                </button>
            </header>

            {legend && !showTable && (
                <ul className="chart-legend">
                    {legend.map((item) => (
                        <li key={item.label}>
                            <i style={{background:item.color}}/>
                            {item.label}
                        </li>
                    ))}
                </ul>
            )}

            {showTable ? (
                <div className="chart-table-wrap">
                    <table className="chart-table">
                        <thead>
                            <tr>{columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row[0]}>{row.map((cell, index) => <td key={index}>{cell}</td>)}</tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : children}
        </section>
    );
}

function ChartTooltip({active, payload, label}){
    if(!active || !payload?.length){
        return null;
    }

    return (
        <div className="chart-tooltip">
            {label !== undefined && <strong>{label}</strong>}

            {payload.map((item) => (
                <span key={item.dataKey ?? item.name}>
                    <i style={{background:item.color || item.payload?.fill}}/>
                    {item.name}
                    <b>{item.value}</b>
                </span>
            ))}
        </div>
    );
}

export function TrendLines({title, subtitle, data, series}){
    const reducedMotion=useReducedMotion();

    return (
        <ChartFrame
            title={title}
            subtitle={subtitle}
            legend={series}
            columns={["Period", ...series.map((item) => item.label)]}
            rows={data.map((point) => [point.label, ...series.map((item) => point[item.key])])}
        >
            <div className="chart-body" role="img" aria-label={`${title}: ${subtitle}`}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{top:8,right:12,bottom:0,left:-22}}>
                        <CartesianGrid stroke="var(--line)" vertical={false}/>
                        <XAxis
                            dataKey="label"
                            tick={AXIS_TICK}
                            tickLine={false}
                            axisLine={{stroke:"var(--line)"}}
                            minTickGap={24}
                        />
                        <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false}/>
                        <Tooltip content={<ChartTooltip/>} cursor={{stroke:"var(--line-strong)"}}/>

                        {series.map((item) => (
                            <Line
                                key={item.key}
                                type="monotone"
                                dataKey={item.key}
                                name={item.label}
                                stroke={item.color}
                                strokeWidth={2}
                                dot={{r:4,fill:item.color,stroke:"var(--surface-solid)",strokeWidth:2}}
                                activeDot={{r:6,stroke:"var(--surface-solid)",strokeWidth:2}}
                                isAnimationActive={!reducedMotion}
                                animationDuration={ANIMATION_MS}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </ChartFrame>
    );
}

export function CategoryBars({data}){
    const reducedMotion=useReducedMotion();

    return (
        <ChartFrame
            title="Problems by category"
            columns={["Category", "Problems"]}
            rows={data.map((item) => [item.name, item.count])}
        >
            <div className="chart-body chart-body-tall" role="img" aria-label="Number of problems in each category">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{top:0,right:24,bottom:0,left:8}} barCategoryGap={8}>
                        <CartesianGrid stroke="var(--line)" horizontal={false}/>
                        <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false}/>
                        <YAxis type="category" dataKey="name" width={136} tick={AXIS_TICK} tickLine={false} axisLine={false}/>
                        <Tooltip content={<ChartTooltip/>} cursor={{fill:"var(--hover)"}}/>

                        <Bar
                            dataKey="count"
                            name="Problems"
                            fill="var(--series-1)"
                            barSize={18}
                            radius={[0, 4, 4, 0]}
                            isAnimationActive={!reducedMotion}
                            animationDuration={ANIMATION_MS}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </ChartFrame>
    );
}

export function StatusDonut({data, total}){
    const reducedMotion=useReducedMotion();
    const slices=data.map((item) => ({
        ...item,
        label:statusLabel(item.name),
        fill:STATUS_COLORS[item.name]
    }));

    return (
        <ChartFrame
            title="Problem status"
            legend={slices.map((item) => ({label:`${item.label}: ${item.count}`,color:item.fill}))}
            columns={["Status", "Problems"]}
            rows={slices.map((item) => [item.label, item.count])}
        >
            <div className="chart-body donut" role="img" aria-label="Share of problems in each status">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Tooltip content={<ChartTooltip/>}/>

                        <Pie
                            data={slices}
                            dataKey="count"
                            nameKey="label"
                            innerRadius="62%"
                            outerRadius="88%"
                            paddingAngle={2}
                            stroke="var(--surface-solid)"
                            strokeWidth={2}
                            isAnimationActive={!reducedMotion}
                            animationDuration={ANIMATION_MS}
                        >
                            {slices.map((item) => <Cell key={item.name} fill={item.fill}/>)}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>

                <span className="donut-total"><strong>{total}</strong>problems</span>
            </div>
        </ChartFrame>
    );
}

export function TagBars({data}){
    const highest=Math.max(...data.map((item) => item.count), 1);

    return (
        <ChartFrame title="Top tags" columns={["Tag", "Problems"]} rows={data.map((item) => [item.name, item.count])}>
            <ul className="tag-bars">
                {data.map((item) => (
                    <li key={item.name}>
                        <span>#{item.name}</span>
                        <i style={{"--bar-size":`${(item.count/highest)*100}%`}}/>
                        <b>{item.count}</b>
                    </li>
                ))}
            </ul>
        </ChartFrame>
    );
}
