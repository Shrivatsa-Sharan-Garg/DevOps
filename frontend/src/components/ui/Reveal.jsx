import {motion} from "motion/react";

const EASE=[0.22, 1, 0.36, 1];

const ITEM_VARIANTS={
    hidden:{opacity:0,y:22},
    visible:{opacity:1,y:0,transition:{duration:0.55,ease:EASE}}
};

export function Reveal({delay=0, className="", children}){
    return (
        <motion.div
            className={className}
            initial={{opacity:0,y:26}}
            whileInView={{opacity:1,y:0}}
            viewport={{once:true,margin:"-60px"}}
            transition={{duration:0.6,ease:EASE,delay}}
        >
            {children}
        </motion.div>
    );
}

export function Stagger({className="", gap=0.07, inView=false, children}){
    const trigger=inView
        ? {whileInView:"visible",viewport:{once:true,margin:"-60px"}}
        : {animate:"visible"};

    return (
        <motion.div
            className={className}
            initial="hidden"
            variants={{hidden:{},visible:{transition:{staggerChildren:gap}}}}
            {...trigger}
        >
            {children}
        </motion.div>
    );
}

export function StaggerItem({className="", children}){
    return <motion.div className={className} variants={ITEM_VARIANTS}>{children}</motion.div>;
}
