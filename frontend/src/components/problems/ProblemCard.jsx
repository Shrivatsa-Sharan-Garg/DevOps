import {Link} from "react-router";
import {Code2, Megaphone, MessageSquare} from "lucide-react";
import TiltCard from "../ui/TiltCard";
import {Avatar, CategoryBadge, StatusBadge, SyntheticBadge, Tag} from "../ui/Badges";
import {formatDate, plural, shortText} from "../../utils/format";
import {UpvoteButton} from "./ProblemActions";

function ProblemCard({problem, onChange}){
    function handleChange(changes){
        onChange?.(problem.id, changes);
    }

    return (
        <TiltCard className="surface problem-card">
            <div className="problem-card-top">
                <CategoryBadge category={problem.category}/>
                <StatusBadge status={problem.status}/>
            </div>

            <h3><Link to={`/problems/${problem.id}`}>{problem.title}</Link></h3>
            <p className="problem-excerpt">{shortText(problem.description, 140)}</p>

            <div className="tag-row">
                {problem.tags.slice(0, 3).map((tag) => <Tag key={tag}>{tag}</Tag>)}
            </div>

            <div className="problem-stats">
                <UpvoteButton problem={problem} onChange={handleChange}/>

                <span className="stat" title="Independent submissions describing this same problem">
                    <Megaphone size={15} aria-hidden="true"/>
                    {plural(problem.report_count, "report")}
                </span>

                <span className="stat" title="Comments">
                    <MessageSquare size={15} aria-hidden="true"/>
                    {problem.comment_count}
                </span>

                {problem.solution_count > 0 && (
                    <span className="stat" title="Solutions">
                        <Code2 size={15} aria-hidden="true"/>
                        {problem.solution_count}
                    </span>
                )}
            </div>

            <div className="problem-meta">
                <Avatar name={problem.author.name} size="small"/>
                <span>{problem.author.name}</span>
                <time dateTime={problem.created_at}>{formatDate(problem.created_at)}</time>
                {problem.source === "synthetic" && <SyntheticBadge/>}
            </div>

            {problem.is_paid && <span className="paid-mark">Paid · {problem.budget_range}</span>}
        </TiltCard>
    );
}

export default ProblemCard;
