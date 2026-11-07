import {motion, useMotionValue, useReducedMotion, useSpring, useTransform} from "motion/react";

const SPRING={stiffness:260,damping:24,mass:0.5};

function TiltCard({strength=6, className="", children, ...rest}){
    const reducedMotion=useReducedMotion();
    const pointerX=useMotionValue(0);
    const pointerY=useMotionValue(0);
    const springX=useSpring(pointerX, SPRING);
    const springY=useSpring(pointerY, SPRING);
    const rotateX=useTransform(springY, [-0.5, 0.5], [strength, -strength]);
    const rotateY=useTransform(springX, [-0.5, 0.5], [-strength, strength]);

    function handleMove(event){
        if(event.pointerType !== "mouse"){
            return;
        }

        const bounds=event.currentTarget.getBoundingClientRect();

        pointerX.set((event.clientX-bounds.left)/bounds.width-0.5);
        pointerY.set((event.clientY-bounds.top)/bounds.height-0.5);
    }

    function handleLeave(){
        pointerX.set(0);
        pointerY.set(0);
    }

    if(reducedMotion){
        return <div className={`tilt-card ${className}`} {...rest}>{children}</div>;
    }

    return (
        <motion.div
            className={`tilt-card ${className}`}
            style={{rotateX,rotateY,transformPerspective:900}}
            whileHover={{y:-5}}
            transition={{type:"spring",stiffness:320,damping:24}}
            onPointerMove={handleMove}
            onPointerLeave={handleLeave}
            {...rest}
        >
            {children}
        </motion.div>
    );
}

export default TiltCard;
