import {AnimatePresence, motion} from "motion/react";
import {CircleAlert, Pause, Play, RotateCcw, StepBack, StepForward} from "lucide-react";
import Button from "../ui/Button";

export function SimCard({title, description, children}){
    return (
        <section className="surface sim-card">
            <header className="sim-head">
                <h3>{title}</h3>
                {description && <p>{description}</p>}
            </header>
            {children}
        </section>
    );
}

export function SimError({message}){
    return (
        <AnimatePresence>
            {message && (
                <motion.p className="sim-error" role="alert" initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
                    <CircleAlert size={15} aria-hidden="true"/>
                    {message}
                </motion.p>
            )}
        </AnimatePresence>
    );
}

export function Explain({children}){
    return <p className="sim-explain">{children}</p>;
}

export function StepControls({stepper, total}){
    return (
        <div className="step-controls">
            <Button variant="secondary" size="small" onClick={stepper.back} disabled={stepper.index === 0} aria-label="Previous step">
                <StepBack size={15} aria-hidden="true"/>
            </Button>
            <Button size="small" onClick={stepper.toggle} aria-label={stepper.playing ? "Pause" : "Play"}>
                {stepper.playing ? <Pause size={15} aria-hidden="true"/> : <Play size={15} aria-hidden="true"/>}
                {stepper.playing ? "Pause" : "Play"}
            </Button>
            <Button variant="secondary" size="small" onClick={stepper.next} disabled={stepper.index >= total-1} aria-label="Next step">
                <StepForward size={15} aria-hidden="true"/>
            </Button>
            <Button variant="ghost" size="small" onClick={stepper.reset}>
                <RotateCcw size={15} aria-hidden="true"/>
                Reset
            </Button>
            <span className="step-count">Step {total === 0 ? 0 : stepper.index+1} of {total}</span>
        </div>
    );
}

export function ModuleTabs({modules, active, onChange, label}){
    return (
        <div className="tabs module-tabs" role="tablist" aria-label={label}>
            {modules.map((module) => (
                <button
                    key={module.id}
                    type="button"
                    role="tab"
                    className="tab"
                    aria-selected={active === module.id}
                    onClick={() => onChange(module.id)}
                >
                    <span className="module-number">{module.number}</span>
                    {module.title}
                    {active === module.id && <motion.span className="tab-indicator" layoutId={`${label}-tab`}/>}
                </button>
            ))}
        </div>
    );
}

export function SequenceDiagram({left, right, messages, visible}){
    return (
        <div className="sequence">
            <div className="sequence-ends">
                <strong>{left}</strong>
                <strong>{right}</strong>
            </div>

            <ol className="sequence-list">
                {messages.slice(0, visible).map((message, position) => (
                    <motion.li
                        key={position}
                        className={`sequence-message ${message.toRight ? "to-right" : "to-left"} ${message.tone || ""}`}
                        initial={{opacity:0,x:message.toRight ? -24 : 24}}
                        animate={{opacity:1,x:0}}
                    >
                        <span className="sequence-label">{message.label}</span>
                        <span className="sequence-arrow" aria-hidden="true"/>
                        {message.detail && <small>{message.detail}</small>}
                    </motion.li>
                ))}
            </ol>
        </div>
    );
}
