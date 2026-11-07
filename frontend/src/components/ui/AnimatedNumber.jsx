import {useEffect, useRef, useState} from "react";
import {animate, useInView, useReducedMotion} from "motion/react";

function AnimatedNumber({value}){
    const reference=useRef(null);
    const isVisible=useInView(reference, {once:true});
    const reducedMotion=useReducedMotion();
    const [shown, setShown]=useState(0);

    useEffect(() => {
        if(!isVisible || reducedMotion){
            return undefined;
        }

        const controls=animate(0, value, {
            duration:1.1,
            ease:[0.16, 1, 0.3, 1],
            onUpdate:(latest) => setShown(Math.round(latest))
        });

        return () => controls.stop();
    }, [isVisible, reducedMotion, value]);

    const displayed=reducedMotion ? value : shown;

    return <span ref={reference}>{displayed.toLocaleString("en-IN")}</span>;
}

export default AnimatedNumber;
