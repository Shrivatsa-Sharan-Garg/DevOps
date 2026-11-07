import {useId, useState} from "react";
import {AnimatePresence, motion} from "motion/react";
import {ChevronDown} from "lucide-react";

function Collapsible({summary, defaultOpen=false, className="", children}){
    const [open, setOpen]=useState(defaultOpen);
    const panelId=useId();

    return (
        <div className={open ? `collapsible is-open ${className}` : `collapsible ${className}`}>
            <button
                type="button"
                className="collapsible-trigger"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpen(!open)}
            >
                <span className="collapsible-summary">{summary}</span>

                <motion.span
                    className="collapsible-chevron"
                    animate={{rotate:open ? 180 : 0}}
                    transition={{type:"spring",stiffness:420,damping:28}}
                >
                    <ChevronDown size={18} aria-hidden="true"/>
                </motion.span>
            </button>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        id={panelId}
                        className="collapsible-panel"
                        initial={{height:0,opacity:0}}
                        animate={{height:"auto",opacity:1}}
                        exit={{height:0,opacity:0}}
                        transition={{duration:0.3,ease:[0.22, 1, 0.36, 1]}}
                    >
                        <div className="collapsible-body">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default Collapsible;
