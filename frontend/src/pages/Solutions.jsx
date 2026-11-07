import {useMemo, useState} from "react";
import {Link} from "react-router";
import {ArrowRight, Search, SearchX} from "lucide-react";
import {api} from "../api";
import {useApi} from "../hooks/useApi";
import {Avatar, SyntheticBadge} from "../components/ui/Badges";
import Button from "../components/ui/Button";
import {Reveal, Stagger, StaggerItem} from "../components/ui/Reveal";
import {CardSkeletons, EmptyState, ErrorState} from "../components/ui/States";
import TiltCard from "../components/ui/TiltCard";
import {plural} from "../utils/format";

function matchesQuery(solution, query){
    const text=`${solution.title} ${solution.description} ${solution.problem_title} ${solution.tech_stack.join(" ")}`;

    return text.toLowerCase().includes(query.toLowerCase());
}

function SolutionCard({solution}){
    return (
        <TiltCard className="surface solution-card">
            <div className="problem-card-top">
                <span className="glyph">{solution.title.charAt(0)}</span>
                {solution.source === "synthetic" && <SyntheticBadge/>}
            </div>

            <h2>{solution.title}</h2>
            <p>{solution.description}</p>
            <p className="solution-for">Built for <strong>{solution.problem_title}</strong></p>

            <div className="tag-row">
                {solution.tech_stack.map((tech) => <span className="tag tag-static" key={tech}>{tech}</span>)}
            </div>

            <div className="solution-foot">
                <Avatar name={solution.author.name} size="small"/>
                <span>{solution.author.name}</span>
                <Link className="text-link" to={`/solutions/${solution.id}`}>View project <ArrowRight size={14} aria-hidden="true"/></Link>
            </div>
        </TiltCard>
    );
}

function Solutions(){
    const [query, setQuery]=useState("");
    const [sort, setSort]=useState("newest");
    const {data, error, loading, reload}=useApi((signal) => api.listSolutions(signal));

    const results=useMemo(() => {
        const matches=(data || []).filter((solution) => matchesQuery(solution, query));

        if(sort === "az"){
            return [...matches].sort((left, right) => left.title.localeCompare(right.title));
        }

        return matches;
    }, [data, query, sort]);

    return (
        <div className="page-shell">
            <Reveal className="page-title">
                <div>
                    <span className="eyebrow">Built in response to real need</span>
                    <h1>Community solutions</h1>
                    <p>Projects and approaches connected to problems people actually face.</p>
                </div>
            </Reveal>

            <div className="toolbar toolbar-compact surface">
                <label className="search-control">
                    <Search size={17} aria-hidden="true"/>
                    <input
                        aria-label="Search solutions"
                        value={query}
                        placeholder="Search solutions, problems or technologies"
                        onChange={(event) => setQuery(event.target.value)}
                    />
                </label>

                <select aria-label="Sort solutions" value={sort} onChange={(event) => setSort(event.target.value)}>
                    <option value="newest">Recently published</option>
                    <option value="az">Title A–Z</option>
                </select>
            </div>

            <div className="results-line"><span>{data ? plural(results.length, "published solution") : "Loading…"}</span></div>

            {loading && !data && <CardSkeletons/>}
            {error && <ErrorState error={error} onRetry={reload}/>}

            {data && results.length === 0 && (
                <EmptyState
                    icon={SearchX}
                    title="No solutions match yet"
                    action={<Button variant="secondary" to="/problems">Explore open problems</Button>}
                >
                    Try a different search, or explore the problems still looking for a developer.
                </EmptyState>
            )}

            {results.length > 0 && (
                <Stagger className="card-grid solution-grid">
                    {results.map((solution) => (
                        <StaggerItem key={solution.id}><SolutionCard solution={solution}/></StaggerItem>
                    ))}
                </Stagger>
            )}
        </div>
    );
}

export default Solutions;
