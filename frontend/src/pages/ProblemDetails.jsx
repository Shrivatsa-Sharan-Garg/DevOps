import {useState} from "react";
import {Link, useParams} from "react-router";
import {AnimatePresence, motion} from "motion/react";
import {ArrowLeft, ArrowUpRight, Code2, GitBranch, Megaphone, SearchX} from "lucide-react";
import {api} from "../api";
import {useSession} from "../context/SessionContext";
import {useApi} from "../hooks/useApi";
import CommentSection from "../components/problems/CommentSection";
import CommunityReports from "../components/problems/CommunityReports";
import {FollowButton, UpvoteButton} from "../components/problems/ProblemActions";
import SolutionForm from "../components/problems/SolutionForm";
import SrsPanel from "../components/srs/SrsPanel";
import {Avatar, CategoryBadge, StatusBadge, SyntheticBadge, Tag} from "../components/ui/Badges";
import Button from "../components/ui/Button";
import {PageSkeleton, EmptyState, ErrorState} from "../components/ui/States";
import TiltCard from "../components/ui/TiltCard";
import {formatDate, plural, statusLabel} from "../utils/format";

const TABS=[
    {id:"overview",label:"In plain English"},
    {id:"brief",label:"Developer brief"},
    {id:"srs",label:"AI SRS draft"}
];

function Overview({problem}){
    return (
        <div className="prose">
            <h2>The problem</h2>
            <p>{problem.description}</p>
            <h2>What a better outcome looks like</h2>
            <p>{problem.outcome || "To be refined with the author and supporters."}</p>

            {problem.constraints && (
                <>
                    <h2>Things to keep in mind</h2>
                    <p>{problem.constraints}</p>
                </>
            )}
        </div>
    );
}

function DeveloperBrief({problem}){
    const commercialContext=problem.is_paid
        ? `Paid opportunity. Indicative budget: ${problem.budget_range}.`
        : "Community request with no budget specified.";

    return (
        <dl className="brief">
            <dt>Problem statement</dt>
            <dd>{problem.description}</dd>
            <dt>Intended outcome</dt>
            <dd>{problem.outcome || "To be refined with the author and supporters."}</dd>
            <dt>Category and scope</dt>
            <dd>{problem.category}{problem.tags.length > 0 && ` · ${problem.tags.join(", ")}`}</dd>
            <dt>Constraints</dt>
            <dd>{problem.constraints || "No additional constraints submitted yet."}</dd>
            <dt>Commercial context</dt>
            <dd>{commercialContext}</dd>
        </dl>
    );
}

function Tabs({active, onChange}){
    return (
        <div className="tabs" role="tablist" aria-label="Problem views">
            {TABS.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    className="tab"
                    aria-selected={active === tab.id}
                    onClick={() => onChange(tab.id)}
                >
                    {tab.label}
                    {active === tab.id && <motion.span className="tab-indicator" layoutId="problem-tab"/>}
                </button>
            ))}
        </div>
    );
}

function Solutions({problem, onAdded}){
    const {user}=useSession();

    return (
        <section className="surface section-block">
            <h2 className="section-title">
                <span className="section-icon"><Code2 size={18} aria-hidden="true"/></span>
                Solutions
                <span className="count-chip">{problem.solutions.length}</span>
            </h2>

            {problem.solutions.length === 0 && <p className="muted">No solutions published yet. Developers can propose an approach here.</p>}

            <div className="solution-list">
                {problem.solutions.map((solution) => (
                    <Link className="solution-row" key={solution.id} to={`/solutions/${solution.id}`}>
                        <span className="glyph">{solution.title.charAt(0)}</span>
                        <span className="row-main">
                            <strong>{solution.title}</strong>
                            <small>By {solution.author.name} · {solution.tech_stack.join(", ")}</small>
                        </span>
                        <ArrowUpRight size={18} aria-hidden="true"/>
                    </Link>
                ))}
            </div>

            {user?.role === "developer" && <SolutionForm problemId={problem.id} onAdded={onAdded}/>}

            {user && user.role !== "developer" && (
                <p className="muted">Have an approach? <Link className="text-link" to="/workspace/profile">Switch to a developer profile</Link></p>
            )}

            {!user && <p className="muted"><Link className="text-link" to="/login">Sign in</Link> to publish a solution.</p>}
        </section>
    );
}

function SidePanel({problem, onChange}){
    return (
        <aside className="detail-aside">
            <TiltCard strength={3} className="surface aside-panel">
                <div className="aside-metrics">
                    <div>
                        <strong>{problem.upvote_count}</strong>
                        <span>{problem.upvote_count === 1 ? "upvote" : "upvotes"}</span>
                        <small>People supporting a solution</small>
                    </div>

                    <div>
                        <strong>{problem.report_count}</strong>
                        <span>{problem.report_count === 1 ? "community report" : "community reports"}</span>
                        <small>Separate submissions of this problem</small>
                    </div>
                </div>

                <div className="aside-actions">
                    <UpvoteButton problem={problem} onChange={onChange} large/>
                    <FollowButton problem={problem} onChange={onChange}/>
                </div>

                <dl className="aside-facts">
                    <div><dt>Status</dt><dd>{statusLabel(problem.status)}</dd></div>
                    <div><dt>Opportunity</dt><dd>{problem.is_paid ? problem.budget_range : "Community-led"}</dd></div>
                </dl>
            </TiltCard>

            <section className="surface aside-panel">
                <h3 className="aside-title">
                    <GitBranch size={16} aria-hidden="true"/>
                    Related problems
                </h3>

                <p className="muted small">Connected, but separate requirements confirmed by a person.</p>

                {problem.related_problems.length === 0 && <p className="muted small">No related problems linked yet.</p>}

                {problem.related_problems.map((item) => (
                    <Link className="related-link" key={item.id} to={`/problems/${item.id}`}>
                        <strong>{item.title}</strong>
                        <small>{plural(item.upvote_count, "upvote")} · {item.category}</small>
                    </Link>
                ))}
            </section>
        </aside>
    );
}

function ProblemDetails(){
    const {id}=useParams();
    const [tab, setTab]=useState("overview");
    const {data:problem, error, loading, reload, setData}=useApi((signal) => api.getProblem(id, signal), [id]);

    if(loading && !problem){
        return <div className="page-shell"><PageSkeleton/></div>;
    }

    if(error?.status === 404){
        return (
            <div className="page-shell">
                <EmptyState icon={SearchX} title="Problem not found" action={<Button to="/problems">Explore problems</Button>}/>
            </div>
        );
    }

    if(error){
        return <div className="page-shell"><ErrorState error={error} onRetry={reload}/></div>;
    }

    function update(changes){
        setData((current) => ({...current,...changes}));
    }

    function addComment(comment){
        setData((current) => ({
            ...current,
            comments:[...current.comments, comment],
            comment_count:current.comment_count+1
        }));
    }

    function addSolution(solution){
        setData((current) => ({
            ...current,
            solutions:[solution, ...current.solutions],
            solution_count:current.solution_count+1,
            status:current.status === "open" ? "in-progress" : current.status
        }));
    }

    return (
        <div className="page-shell detail-layout">
            <div className="detail-main">
                <Link className="back-link" to="/problems">
                    <ArrowLeft size={16} aria-hidden="true"/>
                    All problems
                </Link>

                <motion.article className="surface detail-article" initial={{opacity:0,y:18}} animate={{opacity:1,y:0}}>
                    <div className="tag-row">
                        <CategoryBadge category={problem.category}/>
                        <StatusBadge status={problem.status}/>
                        {problem.source === "synthetic" && <SyntheticBadge/>}
                        {problem.is_paid && <span className="paid-mark">Paid · {problem.budget_range}</span>}
                    </div>

                    <h1>{problem.title}</h1>

                    <div className="byline">
                        <Avatar name={problem.author.name}/>
                        <span>
                            <strong>{problem.author.name}</strong>
                            <small>Posted {formatDate(problem.created_at)}</small>
                        </span>

                        <a className="byline-reports" href="#reports">
                            <Megaphone size={15} aria-hidden="true"/>
                            {plural(problem.report_count, "community report")}
                        </a>
                    </div>

                    <Tabs active={tab} onChange={setTab}/>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={tab}
                            role="tabpanel"
                            initial={{opacity:0,y:8}}
                            animate={{opacity:1,y:0}}
                            exit={{opacity:0,y:-6}}
                            transition={{duration:0.2}}
                        >
                            {tab === "overview" && <Overview problem={problem}/>}
                            {tab === "brief" && <DeveloperBrief problem={problem}/>}
                            {tab === "srs" && <SrsPanel problem={problem}/>}
                        </motion.div>
                    </AnimatePresence>

                    <div className="tag-row detail-tags">
                        {problem.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}
                    </div>
                </motion.article>

                <div id="reports"><CommunityReports problem={problem}/></div>
                <Solutions problem={problem} onAdded={addSolution}/>
                <CommentSection problemId={problem.id} comments={problem.comments} onAdded={addComment}/>
            </div>

            <SidePanel problem={problem} onChange={update}/>
        </div>
    );
}

export default ProblemDetails;
