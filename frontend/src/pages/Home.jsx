import {useEffect, useState} from "react";
import {Link, useLocation, useNavigate} from "react-router";
import {ArrowRight, ArrowUpRight, Beaker, FileText, GitMerge, Lightbulb, Search, Users} from "lucide-react";
import {api} from "../api";
import {useApi} from "../hooks/useApi";
import HeroScene from "../components/landing/HeroScene";
import ProblemCard from "../components/problems/ProblemCard";
import AnimatedNumber from "../components/ui/AnimatedNumber";
import Button from "../components/ui/Button";
import {Reveal, Stagger, StaggerItem} from "../components/ui/Reveal";
import {CardSkeletons, ErrorState} from "../components/ui/States";
import {shortText} from "../utils/format";

const STEPS=[
    {icon:Lightbulb,title:"Describe the need",text:"Share what is hard today, who it affects and what a better outcome looks like."},
    {icon:GitMerge,title:"Find common ground",text:"Similar problems are suggested and you decide if yours is the same, related or new."},
    {icon:FileText,title:"Shape the requirements",text:"Generate an editable SRS draft that gives developers a clear place to start."},
    {icon:Users,title:"Build in the open",text:"Developers publish approaches, collect feedback and shape useful solutions together."}
];

function Hero({featured}){
    const navigate=useNavigate();
    const [query, setQuery]=useState("");

    function handleSearch(event){
        event.preventDefault();
        navigate(`/problems?q=${encodeURIComponent(query)}`);
    }

    return (
        <section className="hero">
            <Stagger className="hero-copy" gap={0.09}>
                <StaggerItem><span className="eyebrow"><span className="live-dot"/>Community-powered building</span></StaggerItem>
                <StaggerItem><h1>Real problems deserve <em>thoughtful solutions.</em></h1></StaggerItem>

                <StaggerItem>
                    <p className="hero-lead">
                        DevBridge brings the people who need something together with the developers ready to build it.
                        Start with a problem, find your people and make it real.
                    </p>
                </StaggerItem>

                <StaggerItem>
                    <form className="hero-search" role="search" onSubmit={handleSearch}>
                        <Search size={18} aria-hidden="true"/>
                        <input
                            aria-label="Search problems"
                            value={query}
                            placeholder="What problem are you trying to solve?"
                            onChange={(event) => setQuery(event.target.value)}
                        />
                        <Button type="submit" size="small">Explore</Button>
                    </form>
                </StaggerItem>

                <StaggerItem>
                    <Link className="text-link" to="/problems">Browse all problems <ArrowRight size={15} aria-hidden="true"/></Link>
                </StaggerItem>
            </Stagger>

            <HeroScene featured={featured}/>
        </section>
    );
}

function ProofStrip({dashboard}){
    const items=[
        {value:dashboard.totals.problems,label:"problems shared"},
        {value:dashboard.totals.upvotes,label:"upvotes"},
        {value:dashboard.totals.community_reports,label:"community reports"},
        {value:dashboard.totals.solutions,label:"solutions published"}
    ];

    return (
        <Reveal className="proof-strip">
            <div className="proof-values">
                {items.map((item) => (
                    <div key={item.label}>
                        <strong><AnimatedNumber value={item.value}/></strong>
                        <span>{item.label}</span>
                    </div>
                ))}
            </div>

            {dashboard.data_source.includes_synthetic && (
                <p className="proof-note">
                    <Beaker size={14} aria-hidden="true"/>
                    Figures include synthetic demo data.
                </p>
            )}
        </Reveal>
    );
}

function TrendingProblems({dashboard, onChange}){
    return (
        <section className="section">
            <Reveal className="section-heading">
                <div>
                    <span className="eyebrow">Where demand is growing</span>
                    <h2>Problems worth solving</h2>
                </div>
                <Link className="text-link" to="/problems">Explore all <ArrowRight size={15} aria-hidden="true"/></Link>
            </Reveal>

            <Stagger className="card-grid" inView>
                {dashboard.trending.slice(0, 3).map((problem) => (
                    <StaggerItem key={problem.id}>
                        <ProblemCard problem={problem} onChange={onChange}/>
                    </StaggerItem>
                ))}
            </Stagger>
        </section>
    );
}

function RecentProblems({problems}){
    return (
        <Reveal className="section">
            <div className="section-heading">
                <div>
                    <span className="eyebrow">Fresh from the community</span>
                    <h2>Recently submitted</h2>
                </div>
            </div>

            <div className="row-list surface">
                {problems.slice(0, 4).map((problem, index) => (
                    <Link className="row-link" key={problem.id} to={`/problems/${problem.id}`}>
                        <span className="row-index">0{index+1}</span>
                        <span className="row-main">
                            <strong>{problem.title}</strong>
                            <small>{problem.category} · {problem.author.name}</small>
                        </span>
                        <ArrowUpRight size={18} aria-hidden="true"/>
                    </Link>
                ))}
            </div>
        </Reveal>
    );
}

function SolutionsBand({solutions}){
    if(solutions.length === 0){
        return null;
    }

    return (
        <Reveal className="section solutions-band surface">
            <div>
                <span className="eyebrow">Built by the community</span>
                <h2>Solutions with a reason to exist.</h2>
                <p>Every build starts with a real need. Explore projects made to answer one.</p>
                <Button variant="secondary" to="/solutions">Discover solutions <ArrowRight size={16} aria-hidden="true"/></Button>
            </div>

            <div className="row-list">
                {solutions.slice(0, 3).map((solution) => (
                    <Link className="row-link" key={solution.id} to={`/solutions/${solution.id}`}>
                        <span className="glyph">{solution.title.charAt(0)}</span>
                        <span className="row-main">
                            <strong>{solution.title}</strong>
                            <small>For: {shortText(solution.problem_title, 52)}</small>
                        </span>
                        <ArrowUpRight size={18} aria-hidden="true"/>
                    </Link>
                ))}
            </div>
        </Reveal>
    );
}

function HowItWorks(){
    return (
        <section className="section how" id="how-it-works">
            <Reveal className="section-heading centered">
                <div>
                    <span className="eyebrow">A better way to build</span>
                    <h2>From "I wish this existed" to "we built it."</h2>
                </div>
            </Reveal>

            <Stagger className="steps" inView gap={0.1}>
                {STEPS.map((step, index) => (
                    <StaggerItem className="surface step" key={step.title}>
                        <span className="step-number">0{index+1}</span>
                        <span className="section-icon"><step.icon size={20} aria-hidden="true"/></span>
                        <h3>{step.title}</h3>
                        <p>{step.text}</p>
                    </StaggerItem>
                ))}
            </Stagger>

            <Reveal className="how-action">
                <Button to="/submit">Bring a problem to DevBridge <ArrowRight size={16} aria-hidden="true"/></Button>
            </Reveal>
        </section>
    );
}

function Home(){
    const location=useLocation();
    const {data, error, loading, reload, setData}=useApi(async (signal) => {
        const [dashboard, solutions]=await Promise.all([api.dashboard(signal), api.listSolutions(signal)]);

        return {dashboard,solutions};
    });

    useEffect(() => {
        if(location.hash){
            document.querySelector(location.hash)?.scrollIntoView({behavior:"smooth"});
        }
    }, [location.hash]);

    function updateTrending(problemId, changes){
        setData((current) => ({
            ...current,
            dashboard:{
                ...current.dashboard,
                trending:current.dashboard.trending.map((item) => item.id === problemId ? {...item,...changes} : item)
            }
        }));
    }

    return (
        <div className="home">
            <Hero featured={data?.dashboard.trending[0]}/>

            {loading && !data && <section className="section"><CardSkeletons count={3}/></section>}
            {error && <section className="section"><ErrorState error={error} onRetry={reload}/></section>}

            {data && (
                <>
                    <ProofStrip dashboard={data.dashboard}/>
                    <TrendingProblems dashboard={data.dashboard} onChange={updateTrending}/>
                    <RecentProblems problems={data.dashboard.recent_submissions}/>
                    <SolutionsBand solutions={data.solutions}/>
                </>
            )}

            <HowItWorks/>
        </div>
    );
}

export default Home;
