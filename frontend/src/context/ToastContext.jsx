import {createContext, useCallback, useContext, useMemo, useRef, useState} from "react";
import {AnimatePresence, motion} from "motion/react";
import {CheckCircle2, CircleAlert, X} from "lucide-react";

const ToastContext=createContext(null);

const TOAST_DURATION_MS=4500;

export function ToastProvider({children}){
    const [toasts, setToasts]=useState([]);
    const nextId=useRef(1);

    const dismiss=useCallback((id) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    const show=useCallback((message, tone="success") => {
        const id=nextId.current;

        nextId.current+=1;
        setToasts((current) => [...current, {id,message,tone}]);
        setTimeout(() => dismiss(id), TOAST_DURATION_MS);
    }, [dismiss]);

    const value=useMemo(() => ({
        success:(message) => show(message, "success"),
        error:(message) => show(message, "error")
    }), [show]);

    return (
        <ToastContext.Provider value={value}>
            {children}

            <div className="toast-stack" role="status" aria-live="polite">
                <AnimatePresence>
                    {toasts.map((toast) => (
                        <motion.div
                            key={toast.id}
                            className={`toast toast-${toast.tone}`}
                            layout
                            initial={{opacity:0,y:18,scale:0.96}}
                            animate={{opacity:1,y:0,scale:1}}
                            exit={{opacity:0,x:40}}
                            transition={{type:"spring",stiffness:420,damping:32}}
                        >
                            {toast.tone === "success" ? <CheckCircle2 size={18}/> : <CircleAlert size={18}/>}
                            <span>{toast.message}</span>
                            <button type="button" aria-label="Dismiss" onClick={() => dismiss(toast.id)}>
                                <X size={15}/>
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

export function useToast(){
    return useContext(ToastContext);
}
