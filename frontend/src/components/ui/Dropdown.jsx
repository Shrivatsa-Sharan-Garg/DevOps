import {useEffect, useRef, useState} from "react";
import {AnimatePresence, motion} from "motion/react";

function Dropdown({trigger, label, align="right", onOpen, children}){
    const [open, setOpen]=useState(false);
    const rootRef=useRef(null);

    useEffect(() => {
        if(!open){
            return undefined;
        }

        function handlePointer(event){
            if(!rootRef.current?.contains(event.target)){
                setOpen(false);
            }
        }

        function handleKey(event){
            if(event.key === "Escape"){
                setOpen(false);
            }
        }

        document.addEventListener("pointerdown", handlePointer);
        document.addEventListener("keydown", handleKey);

        return () => {
            document.removeEventListener("pointerdown", handlePointer);
            document.removeEventListener("keydown", handleKey);
        };
    }, [open]);

    function toggle(){
        if(!open){
            onOpen?.();
        }

        setOpen(!open);
    }

    return (
        <div className="dropdown" ref={rootRef}>
            <button
                type="button"
                className="dropdown-trigger"
                aria-expanded={open}
                aria-haspopup="true"
                aria-label={label}
                onClick={toggle}
            >
                {trigger}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        className={`dropdown-panel dropdown-${align}`}
                        initial={{opacity:0,y:-8,scale:0.96}}
                        animate={{opacity:1,y:0,scale:1}}
                        exit={{opacity:0,y:-6,scale:0.97}}
                        transition={{type:"spring",stiffness:520,damping:34}}
                    >
                        {children(() => setOpen(false))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default Dropdown;
