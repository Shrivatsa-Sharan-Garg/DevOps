import {useState} from "react";
import {Link} from "react-router";
import {motion} from "motion/react";
import {ArrowBigUp, ArrowUpRight, Beaker, Code2, FileQuestion, GitBranch, Megaphone, MessageSquare} from "lucide-react";
import {api} from "../api";
import {useApi} from "../hooks/useApi";
import ActivityTimeline from "../components/dashboard/ActivityTimeline";
import {CategoryBars, StatusDonut, TagBars, TrendLines} from "../components/dashboard/Charts";
import WorkflowDiagram from "../components/dashboard/WorkflowDiagram";
import AnimatedNumber from "../components/ui/AnimatedNumber";
import {Reveal, Stagger, StaggerItem} from "../components/ui/Reveal";
import {ErrorState, PageSkeleton} from "../components/ui/States";
import TiltCard from "../components/ui/TiltCard";
import {plural} from "../utils/format";

const SUBMISSION_SERIES=[
    {key:"problems",label:"Main problems",color:"var(--series-1)"},
    {key:"reports",label:"Community reports",color:"var(--series-2)"}
];

const ENGAGEMENT_SERIES=[
    {key:"upvotes",label:"Upvotes",color:"var(--series-1)"},
    {key:"comments",label:"Comments",color:"var(--series-2)"}
];

function MetricCards({totals}){
    const metrics=[
        {label:"Total problems",value:totals.problems,icon:FileQuestion},
        {label:"Total upvotes",value:totals.upvotes,icon:ArrowBigUp},
        {label:"Community reports",value:totals.community_reports,icon:Megaphone},
        {label:"Related links",value:totals.related_links,icon:GitBranch},
        {label:"Comments",value:totals.comments,icon:MessageSquare},
        {label:"Solutions",value:totals.solutions,icon:Code2}
    ];

    return (
        <Stagger className="metric-grid metric-grid-six">
            {metrics.map((metric) => (
                <StaggerItem key={metric.label}>
                    <TiltCard className="surface metric-card">
                        <span className="section-icon"><metric.icon size={18} aria-hidden="true"/></span>
                        <strong><AnimatedNumber value={metric.value}/></strong>
                        <span>{metric.label}</span>
                    </TiltCard>
                </StaggerItem>
            ))}
        </Stagger>
    );
}

function RankedProblems({dashboard}){
    const lists=[
        {
            id:"trending",
            label:"Trending",
            problems:dashboard.trending,
            note:`Most upvotes in the ${dashboard.trending_window_days} days up to the latest upvote`,
            value:(problem) => plural(problem.upvote_count, "upvote")
        },
        {
            id:"reported",
            label:"Most reported",
            problems:dashboard.most_reported,
            note:"Most independent submissions of the same problem",
            value:(problem) => plural(problem.report_count, "report")
        },
        {
            id:"supported",
            label:"Most supported",
            problems:dashboard.most_supported,
            note:"Most upvotes overall",
            value:(problem) => plural(problem.upvote_count, "upvote")
        }
    ];
    const [active, setActive]=useState("trending");
    const selected=lists.find((list) => list.id === active);

    return (
        <section className="surface chart-frame">
            <div className="tabs" role="tablist" aria-label="Ranked problems">
                {lists.map((list) => (
                    <button
                        key={list.id}
                        type="button"
                        role="tab"
                        className="tab"
                        aria-selected={active === list.id}
                        onClick={() => setActive(list.id)}
                    >
                        {list.label}
                        {active === list.id && <motion.span className="tab-indicator" layoutId="ranked-tab"/>}
                    </button>
                ))}
            </div>

            <p className="chart-subtitle">{selected.note}</p>

            <motion.ol className="rank-list" key={active} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
                {selected.problems.map((problem, index) => (
                    <li key={problem.id}>
                        <span className="row-index">{index+1}</span>
                        <Link to={`/problems/${problem.id}`}>{problem.title}</Link>
                        <small>{selected.value(problem)}</small>
                    </li>
                ))}
            </motion.ol>
        </section>
    );
}

function RecentSubmissions({problems}){
    return (
        <section className="surface chart-frame">
            <h2>Recent submissions</h2>

            <div className="row-list">
                {problems.map((problem) => (
                    <Link className="row-link" key={problem.id} to={`/problems/${problem.id}`}>
                        <span className="row-main">
                            <strong>{problem.title}</strong>
                            <small>{problem.category} · {problem.author.name}</small>
                        </span>
                        <ArrowUpRight size={17} aria-hidden="true"/>
                    </Link>
                ))}
            </div>
        </section>
    );
}

function DataNotice({source}){
    if(!source.includes_synthetic){
        return null;
    }

    return (
        <Reveal className="data-notice">
            <Beaker size={17} aria-hidden="true"/>
            <span>
                <strong>Synthetic demo data.</strong>
                {" "}{source.synthetic_problems} of these problems are invented for demonstration and {source.runtime_problems} were
                submitted locally. These are not real production statistics.
            </span>
        </Reveal>
    );
}

function Dashboard(){
    const {data, error, loading, reload}=useApi((signal) => api.dashboard(signal));

    if(loading && !data){
        return <div className="page-shell"><PageSkeleton/></div>;
    }

    if(error){
        return <div className="page-shell"><ErrorState error={error} onRetry={reload}/></div>;
    }

    return (
        <div className="page-shell dashboard">
            <Reveal className="page-title">
                <div>
                    <span className="eyebrow">Community overview</span>
                    <h1>Dashboard</h1>
                    <p>How problems are moving through DevBridge, calculated from stored records.</p>
                </div>
            </Reveal>

            <DataNotice source={data.data_source}/>
            <MetricCards totals={data.totals}/>
            <Reveal><WorkflowDiagram steps={data.workflow}/></Reveal>

            <div className="dashboard-grid">
                <Reveal className="span-2">
                    <TrendLines
                        title="Problem submissions"
                        subtitle="New main problems and community reports each month"
                        data={data.submission_trend}
                        series={SUBMISSION_SERIES}
                    />
                </Reveal>

                <Reveal><StatusDonut data={data.statuses} total={data.totals.problems}/></Reveal>

                <Reveal className="span-2">
                    <TrendLines
                        title="Community engagement"
                        subtitle="Upvotes and comments each week"
                        data={data.engagement_trend}
                        series={ENGAGEMENT_SERIES}
                    />
                </Reveal>

                <Reveal><TagBars data={data.tags}/></Reveal>
                <Reveal className="span-2"><CategoryBars data={data.categories}/></Reveal>
                <Reveal><ActivityTimeline events={data.activity}/></Reveal>
                <Reveal className="span-2"><RankedProblems dashboard={data}/></Reveal>
                <Reveal><RecentSubmissions problems={data.recent_submissions}/></Reveal>
            </div>
        </div>
    );
}

export default Dashboard;
