import {useEffect, useState} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {AnimatePresence, motion} from "motion/react";
import {CheckCheck, CircleAlert, Download, FileText, Pencil, RefreshCw, Sparkles, TriangleAlert} from "lucide-react";
import {api} from "../../api";
import {useSession} from "../../context/SessionContext";
import {useToast} from "../../context/ToastContext";
import {useApi} from "../../hooks/useApi";
import {AI_NOTICE} from "../submit/AiConsentNotice";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import {ErrorState, Skeleton} from "../ui/States";
import {formatDate, formatWait} from "../../utils/format";

const STATUS_LABELS={ai_draft:"AI draft, not reviewed",edited:"Edited, not reviewed",reviewed:"Reviewed by a person"};
const ACTIVE_GENERATION=["pending","generating"];
const POLL_INTERVAL_MS=4000;

function storedFailure(generation){
    if (!generation || generation.status !== "failed" || !generation.error) {
        return null;
    }

    return {
        code:generation.error.code,
        message:generation.error.message,
        retryAfter:generation.error.retry_after
    };
}

function downloadMarkdown(title, markdown){
    const url=URL.createObjectURL(new Blob([markdown], {type:"text/markdown"}));
    const link=document.createElement("a");

    link.href=url;
    link.download=`${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60)}-srs.md`;
    link.click();
    URL.revokeObjectURL(url);
}

function GeneratingState({automatic=false}){
    return (
        <div className="srs-generating" role="status">
            <motion.span
                className="srs-orb"
                animate={{rotate:360}}
                transition={{duration:3,repeat:Infinity,ease:"linear"}}
                aria-hidden="true"
            />
            <strong>{automatic ? "Drafting the SRS automatically" : "Drafting your SRS"}</strong>
            <p>Free hosted models can take a minute or two. This page updates by itself when the draft is ready.</p>
            <span className="progress-track" aria-hidden="true"><span className="progress-sweep"/></span>
        </div>
    );
}

function GenerationError({error, onRetry}){
    const wait=formatWait(error.retryAfter);
    const canRetry=!["ai_not_configured","ai_paid_endpoint_blocked","ai_disabled","ai_not_permitted"].includes(error.code);

    return (
        <div className="srs-error" role="alert">
            <CircleAlert size={20} aria-hidden="true"/>

            <div>
                <strong>The SRS was not generated</strong>
                <p>{error.message}{wait ? ` Please try again in ${wait}.` : ""}</p>
                <small>The problem itself is safe and has not changed.</small>
            </div>

            {canRetry && <Button variant="secondary" size="small" onClick={onRetry}>Try again</Button>}
        </div>
    );
}

function SrsEditor({document, saving, onSave, onCancel}){
    const [markdown, setMarkdown]=useState(document.markdown);

    return (
        <div className="srs-editor">
            <label className="field-label" htmlFor="srs-markdown"><span>Markdown</span></label>
            <textarea id="srs-markdown" rows={22} value={markdown} onChange={(event) => setMarkdown(event.target.value)}/>

            <div className="srs-actions">
                <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                <Button variant="secondary" loading={saving} onClick={() => onSave(markdown, false)}>Save edits</Button>
                <Button loading={saving} onClick={() => onSave(markdown, true)}>
                    <CheckCheck size={16} aria-hidden="true"/>
                    Save and mark reviewed
                </Button>
            </div>
        </div>
    );
}

function SrsDocument({problem, data, generating, onVersion, onRegenerate, onSaved}){
    const {user}=useSession();
    const toast=useToast();
    const [editing, setEditing]=useState(false);
    const [saving, setSaving]=useState(false);
    const {document, versions}=data;

    async function save(markdown, reviewed){
        setSaving(true);

        try{
            onSaved(await api.updateSrs(problem.id, document.version, {markdown,mark_reviewed:reviewed}));
            setEditing(false);
            toast.success("SRS saved.");
        }catch(error){
            toast.error(error.message);
        }finally{
            setSaving(false);
        }
    }

    return (
        <>
            <div className="srs-notice">
                <Sparkles size={16} aria-hidden="true"/>
                <span>
                    <strong>{STATUS_LABELS[document.status]}.</strong>
                    {" "}AI-generated with {document.model}. Review it carefully before relying on it.
                    {" "}It is not a certified or compliant specification.
                </span>
            </div>

            {document.warnings.map((warning) => (
                <div className="srs-warning" key={warning}>
                    <TriangleAlert size={16} aria-hidden="true"/>
                    {warning}
                </div>
            ))}

            {editing ? (
                <SrsEditor document={document} saving={saving} onSave={save} onCancel={() => setEditing(false)}/>
            ) : (
                <>
                    <div className="srs-toolbar">
                        <label className="srs-version">
                            <span>Version</span>
                            <select value={document.version} onChange={(event) => onVersion(Number(event.target.value))}>
                                {versions.map((item) => (
                                    <option key={item.version} value={item.version}>
                                        {item.version} · {formatDate(item.updated_at)}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <div className="srs-actions">
                            <Button
                                variant="ghost"
                                size="small"
                                onClick={() => downloadMarkdown(problem.title, document.markdown)}
                            >
                                <Download size={15} aria-hidden="true"/>
                                Download
                            </Button>

                            {user && (
                                <Button variant="secondary" size="small" onClick={() => setEditing(true)}>
                                    <Pencil size={15} aria-hidden="true"/>
                                    Edit
                                </Button>
                            )}

                            <Button variant="secondary" size="small" disabled={generating} onClick={onRegenerate}>
                                <RefreshCw size={15} aria-hidden="true"/>
                                Regenerate
                            </Button>
                        </div>
                    </div>

                    <article className="prose">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{document.markdown}</ReactMarkdown>
                    </article>
                </>
            )}
        </>
    );
}

function SrsPanel({problem}){
    const {aiConsent, setAiConsent}=useSession();
    const [version, setVersion]=useState(null);
    const [generating, setGenerating]=useState(false);
    const [generationError, setGenerationError]=useState(null);
    const [modal, setModal]=useState(null);
    const {data, error, loading, reload, setData}=useApi((signal) => api.getSrs(problem.id, version, signal), [problem.id, version]);
    const generation=data?.generation;
    const autoRunning=!generating && !data?.document && ACTIVE_GENERATION.includes(generation?.status);
    const failure=generationError || (data?.document ? null : storedFailure(generation));

    useEffect(() => {
        if (!autoRunning) {
            return undefined;
        }

        const timer=setTimeout(reload,POLL_INTERVAL_MS);

        return () => {
            clearTimeout(timer);
        };
    }, [autoRunning,data,reload]);

    async function generate(){
        setModal(null);
        setGenerating(true);
        setGenerationError(null);

        try{
            const result=await api.generateSrs(problem.id, true);

            setVersion(null);
            setData(result);
        }catch(failure){
            setGenerationError(failure);
        }finally{
            setGenerating(false);
        }
    }

    function requestGeneration(){
        if(!aiConsent){
            setModal("consent");
        }else if(data?.document){
            setModal("regenerate");
        }else{
            generate();
        }
    }

    function acceptAndGenerate(){
        setAiConsent(true);
        generate();
    }

    if(loading && !data){
        return (
            <div className="srs-loading" role="status" aria-label="Loading">
                <Skeleton width="44%" height={22}/>
                <Skeleton/>
                <Skeleton width="80%"/>
            </div>
        );
    }

    if(error){
        return <ErrorState error={error} onRetry={reload}/>;
    }

    return (
        <div className="srs-panel">
            <AnimatePresence mode="wait">
                {generating || autoRunning ? (
                    <motion.div key="generating" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                        <GeneratingState automatic={autoRunning}/>
                    </motion.div>
                ) : (
                    <motion.div key="content" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                        {failure && <GenerationError error={failure} onRetry={requestGeneration}/>}

                        {data?.document ? (
                            <SrsDocument
                                problem={problem}
                                data={data}
                                generating={generating}
                                onVersion={setVersion}
                                onRegenerate={requestGeneration}
                                onSaved={setData}
                            />
                        ) : (
                            <div className="srs-empty">
                                <span className="state-icon"><FileText size={26} aria-hidden="true"/></span>
                                <h3>Generate a draft SRS</h3>
                                <p>
                                    Creates an editable requirements draft from this problem, structured with
                                    ISO/IEC/IEEE 29148:2018 as a reference. It needs a person's review.
                                </p>

                                {generation?.status === "not_requested" && (
                                    <p className="muted small">
                                        The author did not allow AI processing, so no draft was made automatically.
                                    </p>
                                )}

                                <Button onClick={requestGeneration}>
                                    <Sparkles size={16} aria-hidden="true"/>
                                    Generate SRS
                                </Button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <Modal open={modal === "consent"} title="Send this problem to an AI provider?" onClose={() => setModal(null)}>
                <p>{AI_NOTICE}</p>
                <p>The problem text is sent to OpenRouter, which forwards it to a free model host. Names and emails are never sent.</p>

                <div className="modal-actions">
                    <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
                    <Button onClick={acceptAndGenerate}>I agree, generate</Button>
                </div>
            </Modal>

            <Modal open={modal === "regenerate"} title="Regenerate this SRS?" onClose={() => setModal(null)}>
                <p>This creates a new version and uses one free daily request. Your existing versions and edits are kept.</p>

                <div className="modal-actions">
                    <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
                    <Button onClick={generate}>Regenerate</Button>
                </div>
            </Modal>
        </div>
    );
}

export default SrsPanel;
