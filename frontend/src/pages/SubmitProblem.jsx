import {useRef, useState} from "react";
import {useNavigate} from "react-router";
import {AnimatePresence, motion} from "motion/react";
import {ArrowRight, CheckCircle2, Plus} from "lucide-react";
import {api} from "../api";
import {useSession} from "../context/SessionContext";
import {useToast} from "../context/ToastContext";
import {useApi} from "../hooks/useApi";
import DuplicateReview from "../components/submit/DuplicateReview";
import ProblemForm from "../components/submit/ProblemForm";
import {EMPTY_PROBLEM, validateProblem} from "../components/submit/problemDraft";
import Button from "../components/ui/Button";
import {Reveal} from "../components/ui/Reveal";
import {createRequestId, splitList} from "../utils/format";

const STEPS=["Describe","Review matches","Done"];

function Stepper({step}){
    return (
        <ol className="stepper">
            {STEPS.map((label, index) => (
                <li key={label} className={index <= step ? "is-reached" : ""} aria-current={index === step ? "step" : undefined}>
                    <span>{index+1}</span>
                    {label}
                    {index === step && <motion.i className="stepper-glow" layoutId="stepper-glow"/>}
                </li>
            ))}
        </ol>
    );
}

function Outcome({result, onAnother}){
    const navigate=useNavigate();

    return (
        <motion.div
            className="surface outcome"
            initial={{opacity:0,scale:0.94,y:18}}
            animate={{opacity:1,scale:1,y:0}}
            transition={{type:"spring",stiffness:260,damping:22}}
        >
            <motion.span
                className="outcome-icon"
                initial={{scale:0}}
                animate={{scale:1}}
                transition={{type:"spring",stiffness:400,damping:14,delay:0.15}}
            >
                <CheckCircle2 size={34} aria-hidden="true"/>
            </motion.span>

            <h2>{result.decision === "same" ? "Report added" : "Problem published"}</h2>
            <p>{result.message}</p>

            <div className="modal-actions">
                <Button variant="secondary" onClick={onAnother}>
                    <Plus size={16} aria-hidden="true"/>
                    Share another
                </Button>

                <Button onClick={() => navigate(`/problems/${result.problem_id}`)}>
                    View problem
                    <ArrowRight size={16} aria-hidden="true"/>
                </Button>
            </div>
        </motion.div>
    );
}

function fieldErrors(error){
    return error.code === "validation_failed" ? error.details || {} : {};
}

function SubmitProblem(){
    const navigate=useNavigate();
    const toast=useToast();
    const {aiConsent}=useSession();
    const meta=useApi((signal) => api.meta(signal));
    const [form, setForm]=useState(EMPTY_PROBLEM);
    const [errors, setErrors]=useState({});
    const [analysis, setAnalysis]=useState(null);
    const [result, setResult]=useState(null);
    const [busy, setBusy]=useState(false);
    const requestId=useRef(createRequestId());

    const step=result ? 2 : analysis ? 1 : 0;

    function handleChange(name, value){
        setForm((current) => ({...current,[name]:value}));
        setErrors((current) => ({...current,[name]:""}));

        // Edited text needs a fresh analysis.
        requestId.current=createRequestId();
    }

    async function runAnalysis(){
        setBusy(true);

        try{
            const response=await api.analyzeSubmission({
                ...form,
                tags:splitList(form.tags),
                ai_consent:aiConsent,
                client_request_id:requestId.current
            });

            setAnalysis(response);
        }catch(error){
            setErrors(fieldErrors(error));
            toast.error(error.message);
        }finally{
            setBusy(false);
        }
    }

    function handleSubmit(event){
        event.preventDefault();

        const nextErrors=validateProblem(form);

        setErrors(nextErrors);

        if(Object.keys(nextErrors).length === 0){
            runAnalysis();
        }
    }

    function retryAi(){
        requestId.current=createRequestId();
        runAnalysis();
    }

    async function decide(decision, targetId){
        setBusy(true);

        try{
            const response=await api.decideSubmission(analysis.session_id, {
                decision,
                target_problem_id:targetId
            });

            setResult(response);
        }catch(error){
            toast.error(error.message);
        }finally{
            setBusy(false);
        }
    }

    function startAgain(){
        setForm(EMPTY_PROBLEM);
        setAnalysis(null);
        setResult(null);
        requestId.current=createRequestId();
    }

    return (
        <div className="page-shell submit-page">
            <Reveal className="page-title">
                <div>
                    <span className="eyebrow">Start with the need</span>
                    <h1>Bring a problem to DevBridge</h1>
                    <p>A clear request helps the right people understand the need and decide if they can help.</p>
                </div>
            </Reveal>

            <Stepper step={step}/>

            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{opacity:0,x:24}}
                    animate={{opacity:1,x:0}}
                    exit={{opacity:0,x:-24}}
                    transition={{duration:0.26,ease:[0.22, 1, 0.36, 1]}}
                >
                    {step === 0 && (
                        <ProblemForm
                            form={form}
                            errors={errors}
                            categories={meta.data?.categories || [EMPTY_PROBLEM.category]}
                            busy={busy}
                            onChange={handleChange}
                            onSubmit={handleSubmit}
                            onCancel={() => navigate("/problems")}
                        />
                    )}

                    {step === 1 && (
                        <DuplicateReview
                            analysis={analysis}
                            busy={busy}
                            onDecide={decide}
                            onBack={() => setAnalysis(null)}
                            onRetryAi={retryAi}
                        />
                    )}

                    {step === 2 && <Outcome result={result} onAnother={startAgain}/>}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

export default SubmitProblem;
