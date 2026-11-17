import {useEffect, useState} from "react";

export function useStepper(total, interval=1100){
    const [index, setIndex]=useState(0);
    const [playing, setPlaying]=useState(false);
    const last=Math.max(total-1, 0);
    const current=Math.min(index, last);
    const running=playing && current < last;

    useEffect(() => {
        if(!running){
            return undefined;
        }

        const timer=setTimeout(() => setIndex((value) => value+1), interval);

        return () => clearTimeout(timer);
    }, [running, current, interval]);

    return {
        index:current,
        playing:running,
        next:() => setIndex(Math.min(current+1, last)),
        back:() => setIndex(Math.max(current-1, 0)),
        reset:() => {
            setPlaying(false);
            setIndex(0);
        },
        toggle:() => {
            if(running){
                setPlaying(false);
                return;
            }

            if(current >= last){
                setIndex(0);
            }

            setPlaying(true);
        }
    };
}
