import {useEffect, useId, useRef} from "react";
import {createPortal} from "react-dom";
import {AnimatePresence, motion} from "motion/react";
import {X} from "lucide-react";

const FOCUSABLE="button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled])";

function keepFocusInside(event, panel){
    const items=[...panel.querySelectorAll(FOCUSABLE)];

    if(items.length === 0){
        return;
    }

    const first=items[0];
    const last=items[items.length-1];

    if(event.shiftKey && document.activeElement === first){
        event.preventDefault();
        last.focus();
    }else if(!event.shiftKey && document.activeElement === last){
        event.preventDefault();
        first.focus();
    }
}

function Modal({open, title, onClose, children}){
    const panelRef=useRef(null);
    const closeRef=useRef(onClose);
    const titleId=useId();

    // Keep the focus setup from re-running on each render.
    useEffect(() => {
        closeRef.current=onClose;
    });

    useEffect(() => {
        if(!open){
            return undefined;
        }

        const previous=document.activeElement;

        panelRef.current?.querySelector(FOCUSABLE)?.focus();

        function handleKey(event){
            if(event.key === "Escape"){
                closeRef.current();
            }else if(event.key === "Tab" && panelRef.current){
                keepFocusInside(event, panelRef.current);
            }
        }

        document.addEventListener("keydown", handleKey);

        return () => {
            document.removeEventListener("keydown", handleKey);
            previous?.focus?.();
        };
    }, [open]);

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    className="modal-backdrop"
                    initial={{opacity:0}}
                    animate={{opacity:1}}
                    exit={{opacity:0,transition:{duration:0.16}}}
                    onClick={onClose}
                >
                    <motion.div
                        ref={panelRef}
                        className="modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={titleId}
                        initial={{opacity:0,y:28,scale:0.95,rotateX:-8}}
                        animate={{opacity:1,y:0,scale:1,rotateX:0}}
                        exit={{opacity:0,y:16,scale:0.97,transition:{duration:0.16}}}
                        transition={{type:"spring",stiffness:380,damping:30}}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <header className="modal-head">
                            <h2 id={titleId}>{title}</h2>
                            <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
                                <X size={18}/>
                            </button>
                        </header>

                        {children}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}

export default Modal;
