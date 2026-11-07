import {motion} from "motion/react";
import {CloudOff, RefreshCw} from "lucide-react";
import Button from "./Button";

export function Skeleton({width="100%", height=16, radius=8, className=""}){
    return <span className={`skeleton ${className}`} style={{width,height,borderRadius:radius}} aria-hidden="true"/>;
}

export function CardSkeletons({count=6}){
    return (
        <div className="card-grid" role="status" aria-label="Loading">
            {Array.from({length:count}, (_, index) => (
                <div className="surface skeleton-card" key={index}>
                    <Skeleton width="38%" height={12}/>
                    <Skeleton width="88%" height={20}/>
                    <Skeleton width="100%"/>
                    <Skeleton width="70%"/>
                    <Skeleton width="50%" height={26} radius={999}/>
                </div>
            ))}
        </div>
    );
}

export function PageSkeleton(){
    return (
        <div className="page-skeleton" role="status" aria-label="Loading">
            <Skeleton width="24%" height={14}/>
            <Skeleton width="62%" height={38}/>
            <Skeleton width="100%" height={180} radius={18}/>
            <Skeleton width="100%" height={120} radius={18}/>
        </div>
    );
}

export function EmptyState({icon:Icon, title, children, action}){
    return (
        <motion.div className="state-card" initial={{opacity:0,scale:0.97}} animate={{opacity:1,scale:1}}>
            {Icon && (
                <motion.span
                    className="state-icon"
                    whileHover={{scale:1.12,rotate:-6}}
                    animate={{y:[0, -6, 0]}}
                    transition={{y:{duration:4,repeat:Infinity,ease:"easeInOut"}}}
                >
                    <Icon size={26} aria-hidden="true"/>
                </motion.span>
            )}

            <h2>{title}</h2>
            {children && <p>{children}</p>}
            {action}
        </motion.div>
    );
}

export function ErrorState({error, onRetry, title="We could not load this"}){
    const offline=error?.code === "network_error";

    return (
        <EmptyState
            icon={CloudOff}
            title={offline ? "The API is not reachable" : title}
            action={onRetry && (
                <Button variant="secondary" onClick={onRetry}>
                    <RefreshCw size={16} aria-hidden="true"/>
                    Try again
                </Button>
            )}
        >
            {error?.message}
        </EmptyState>
    );
}
