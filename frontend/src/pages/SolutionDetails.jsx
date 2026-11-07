import {Link, useParams} from "react-router";
import {motion} from "motion/react";
import {ArrowLeft, ArrowRight, ExternalLink, SearchX} from "lucide-react";
import {api} from "../api";
import {useApi} from "../hooks/useApi";
import {Avatar, SyntheticBadge} from "../components/ui/Badges";
import Button from "../components/ui/Button";
import {EmptyState, ErrorState, PageSkeleton} from "../components/ui/States";
import {formatDate} from "../utils/format";

function SolutionDetails(){
    const {id}=useParams();
    const {data:solution, error, loading, reload}=useApi((signal) => api.getSolution(id, signal), [id]);

    if(loading && !solution){
        return <div className="page-shell narrow"><PageSkeleton/></div>;
    }

    if(error?.status === 404){
        return (
            <div className="page-shell">
                <EmptyState icon={SearchX} title="Solution not found" action={<Button to="/solutions">Browse solutions</Button>}/>
            </div>
        );
    }

    if(error){
        return <div className="page-shell"><ErrorState error={error} onRetry={reload}/></div>;
    }

    return (
        <div className="page-shell narrow">
            <Link className="back-link" to="/solutions">
                <ArrowLeft size={16} aria-hidden="true"/>
                All solutions
            </Link>

            <motion.article className="surface detail-article" initial={{opacity:0,y:18}} animate={{opacity:1,y:0}}>
                <div className="tag-row">
                    {solution.tech_stack.map((tech) => <span className="tag tag-static" key={tech}>{tech}</span>)}
                    {solution.source === "synthetic" && <SyntheticBadge/>}
                </div>

                <h1>{solution.title}</h1>

                <div className="byline">
                    <Avatar name={solution.author.name}/>
                    <span>
                        <strong>{solution.author.name}</strong>
                        <small>Published {formatDate(solution.created_at)}</small>
                    </span>
                </div>

                <div className="prose">
                    <h2>What it does</h2>
                    <p>{solution.description}</p>
                </div>

                {solution.repo_url && (
                    <a className="btn btn-secondary repo-link" href={solution.repo_url} target="_blank" rel="noreferrer">
                        <ExternalLink size={16} aria-hidden="true"/>
                        View repository
                    </a>
                )}

                <div className="linked-problem">
                    <span className="eyebrow">The request behind this build</span>
                    <strong>{solution.problem_title}</strong>

                    <Link className="text-link" to={`/problems/${solution.problem_id}`}>
                        Read the problem and join the discussion
                        <ArrowRight size={15} aria-hidden="true"/>
                    </Link>
                </div>
            </motion.article>
        </div>
    );
}

export default SolutionDetails;
