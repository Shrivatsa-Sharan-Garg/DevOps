import {useState} from "react";
import {Link} from "react-router";
import {motion} from "motion/react";
import {ArrowBigUp, ArrowLeft, BrainCircuit, Check, GitBranch, Info, Megaphone, RefreshCw, Sparkles, TextSearch} from "lucide-react";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import {Stagger, StaggerItem} from "../ui/Reveal";
import {CategoryBadge} from "../ui/Badges";
import {formatWait, plural, shortText} from "../../utils/format";

const CONFIRMATIONS={
    same:{
        title:"Add your report to this problem?",
        action:"Add my report",
        body:"Your full title and description are kept as a separate community report on this problem. No upvote is added, and the report shares this problem's SRS."
    },
    related:{
        title:"Publish as a related problem?",
        action:"Publish and link",
        body:"Your problem is published on its own, with its own SRS, and both problems stay independently accessible with a link between them."
    },
    none:{
        title:"Publish as a new problem?",
        action:"Publish problem",
        body:"Your problem is published on its own, with its own SRS and no link to the suggested problems."
    }
};

function AiStatusNote({analysis, onRetry}){
    const {ai, match_method:method, compared_count:compared}=analysis;

    if(ai.used){
        return (
            <p className="review-note">
                <Sparkles size={15} aria-hidden="true"/>
                Compared with {plural(compared, "existing problem")} using AI embeddings.
            </p>
        );
    }

    if(ai.reason === "consent_not_given"){
        return (
            <p className="review-note">
                <TextSearch size={15} aria-hidden="true"/>
                Keyword check only. Nothing was sent to AI providers.
            </p>
        );
    }

    const wait=formatWait(ai.retry_after);

    return (
        <div className="review-warning" role="status">
            <Info size={17} aria-hidden="true"/>

            <div>
                <strong>AI matching was unavailable, so this is a keyword check ({method}).</strong>
                <p>{ai.message}{wait ? ` Try again in ${wait}.` : ""}</p>
            </div>

            <Button variant="ghost" size="small" onClick={onRetry}>
                <RefreshCw size={14} aria-hidden="true"/>
                Retry AI check
            </Button>
        </div>
    );
}

function ModelNote({model, hasCandidates}){
    if (!model || !hasCandidates || model.used || model.reason === "needs_embeddings") {
        return null;
    }

    return (
        <p className="review-note">
            <BrainCircuit size={15} aria-hidden="true"/>
            The duplicate model is not loaded, so these are similarity suggestions only.
        </p>
    );
}

function ModelHint({assessment}){
    if (!assessment) {
        return null;
    }

    const isSame=assessment.prediction === "same_underlying";
    const percent=Math.round(assessment.probability*100);

    return (
        <p
            className={isSame ? "model-hint is-same" : "model-hint"}
            title="The model only separates same from not same. You decide whether it is related."
        >
            <BrainCircuit size={14} aria-hidden="true"/>
            <span>{isSame ? "Model: likely the same problem" : "Model: probably not the same problem"}</span>
            <strong>{percent}%</strong>
        </p>
    );
}

function CandidateCard({candidate, onChoose}){
    const {problem, method, score}=candidate;
    const isAi=method === "embedding";

    return (
        <article className="surface candidate-card">
            <div className="candidate-top">
                <span className={isAi ? "badge badge-ai" : "badge badge-keyword"}>
                    {isAi ? <Sparkles size={13} aria-hidden="true"/> : <TextSearch size={13} aria-hidden="true"/>}
                    {isAi ? "AI-suggested match" : "Keyword match"}
                </span>

                <span
                    className="candidate-score"
                    title="A relative comparison signal, not a probability that these are the same problem"
                >
                    {isAi ? "Similarity" : "Keyword overlap"} {score.toFixed(2)}
                </span>
            </div>

            <h3><Link to={`/problems/${problem.id}`} target="_blank" rel="noreferrer">{problem.title}</Link></h3>
            <p>{shortText(problem.description, 190)}</p>

            <ModelHint assessment={candidate.model_assessment}/>

            <div className="tag-row">
                <CategoryBadge category={problem.category}/>
                {problem.tags.slice(0, 4).map((tag) => <span className="tag tag-static" key={tag}>#{tag}</span>)}
            </div>

            <div className="problem-stats">
                <span className="stat"><ArrowBigUp size={16} aria-hidden="true"/>{plural(problem.upvote_count, "upvote")}</span>
                <span className="stat"><Megaphone size={15} aria-hidden="true"/>{plural(problem.report_count, "report")}</span>
            </div>

            <div className="candidate-actions">
                <Button onClick={() => onChoose("same", problem)}>
                    <Check size={16} aria-hidden="true"/>
                    Same underlying problem
                </Button>

                <Button variant="secondary" onClick={() => onChoose("related", problem)}>
                    <GitBranch size={16} aria-hidden="true"/>
                    Related, but different
                </Button>
            </div>
        </article>
    );
}

function DuplicateReview({analysis, busy, onDecide, onBack, onRetryAi}){
    const [pending, setPending]=useState(null);
    const candidates=analysis.candidates;
    const confirmation=pending ? CONFIRMATIONS[pending.decision] : null;

    function choose(decision, problem=null){
        setPending({decision,problem});
    }

    function close(){
        setPending(null);
    }

    return (
        <div className="review">
            <button type="button" className="back-link" onClick={onBack}>
                <ArrowLeft size={16} aria-hidden="true"/>
                Edit my problem
            </button>

            <header className="review-head">
                <h2>{candidates.length > 0 ? "Is one of these your problem?" : "No similar problems found"}</h2>

                <p>
                    {candidates.length > 0
                        ? "These are only suggestions. You decide whether any of them describes the same need, and nothing happens until you choose."
                        : "Nothing reached the matching threshold, so your problem can be published on its own."}
                </p>

                <AiStatusNote analysis={analysis} onRetry={onRetryAi}/>
                <ModelNote model={analysis.model} hasCandidates={candidates.length > 0}/>
            </header>

            {candidates.length > 0 && (
                <Stagger className="candidate-list" gap={0.1}>
                    {candidates.map((candidate) => (
                        <StaggerItem key={candidate.problem.id}>
                            <CandidateCard candidate={candidate} onChoose={choose}/>
                        </StaggerItem>
                    ))}
                </Stagger>
            )}

            <motion.div className="review-footer" initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.3}}>
                <Button variant={candidates.length > 0 ? "secondary" : "primary"} onClick={() => choose("none")}>
                    {candidates.length > 0 ? "None of these match my problem" : "Publish my problem"}
                </Button>
            </motion.div>

            <Modal open={Boolean(pending)} title={confirmation?.title} onClose={close}>
                <p>{confirmation?.body}</p>
                {pending?.problem && <p className="modal-target">{pending.problem.title}</p>}

                <div className="modal-actions">
                    <Button variant="ghost" onClick={close}>Go back</Button>

                    <Button loading={busy} onClick={() => onDecide(pending.decision, pending.problem?.id ?? null)}>
                        {confirmation?.action}
                    </Button>
                </div>
            </Modal>
        </div>
    );
}

export default DuplicateReview;
