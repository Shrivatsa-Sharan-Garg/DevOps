import {useId} from "react";
import {AnimatePresence, motion} from "motion/react";
import {CircleAlert} from "lucide-react";

function FieldShell({label, hint, error, optional, inputId, children}){
    return (
        <div className={error ? "field has-error" : "field"}>
            <label className="field-label" htmlFor={inputId}>
                <span>{label}</span>
                {optional && <small>Optional</small>}
            </label>

            <motion.div
                className="field-control"
                animate={error ? {x:[0, -5, 5, -3, 3, 0]} : {x:0}}
                transition={{duration:0.32}}
            >
                {children}
                <span className="field-focus-line" aria-hidden="true"/>
            </motion.div>

            {hint && !error && <p className="field-hint">{hint}</p>}

            <AnimatePresence initial={false}>
                {error && (
                    <motion.p
                        key="error"
                        id={`${inputId}-error`}
                        className="field-error"
                        role="alert"
                        initial={{opacity:0,height:0}}
                        animate={{opacity:1,height:"auto"}}
                        exit={{opacity:0,height:0}}
                    >
                        <CircleAlert size={14} aria-hidden="true"/>
                        {error}
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    );
}

function describedBy(error, inputId){
    return error ? `${inputId}-error` : undefined;
}

export function TextField({label, hint, error, optional, ...rest}){
    const inputId=useId();

    return (
        <FieldShell label={label} hint={hint} error={error} optional={optional} inputId={inputId}>
            <input id={inputId} aria-invalid={Boolean(error)} aria-describedby={describedBy(error, inputId)} {...rest}/>
        </FieldShell>
    );
}

export function TextArea({label, hint, error, optional, rows=4, ...rest}){
    const inputId=useId();

    return (
        <FieldShell label={label} hint={hint} error={error} optional={optional} inputId={inputId}>
            <textarea
                id={inputId}
                rows={rows}
                aria-invalid={Boolean(error)}
                aria-describedby={describedBy(error, inputId)}
                {...rest}
            />
        </FieldShell>
    );
}

export function SelectField({label, hint, error, optional, children, ...rest}){
    const inputId=useId();

    return (
        <FieldShell label={label} hint={hint} error={error} optional={optional} inputId={inputId}>
            <select id={inputId} aria-invalid={Boolean(error)} {...rest}>{children}</select>
        </FieldShell>
    );
}
