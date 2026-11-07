import {Link} from "react-router";
import {motion, useMotionValue, useReducedMotion, useSpring, useTransform} from "motion/react";
import {ArrowBigUp, FileText, Megaphone, Sparkles} from "lucide-react";
import {shortText} from "../../utils/format";

const SPRING={stiffness:90,damping:18,mass:0.6};

function useLayer(pointerX, pointerY, depth){
    return {
        x:useTransform(pointerX, [-0.5, 0.5], [-depth, depth]),
        y:useTransform(pointerY, [-0.5, 0.5], [-depth*0.7, depth*0.7])
    };
}

function FeaturedLayer({featured}){
    if(!featured){
        return (
            <div className="scene-card-body">
                <span className="eyebrow">Community problem</span>
                <h3>Every useful build starts with a real need</h3>
            </div>
        );
    }

    return (
        <div className="scene-card-body">
            <span className="eyebrow">Trending now</span>
            <h3><Link to={`/problems/${featured.id}`}>{shortText(featured.title, 62)}</Link></h3>

            <div className="problem-stats">
                <span className="stat"><ArrowBigUp size={16} aria-hidden="true"/>{featured.upvote_count}</span>
                <span className="stat"><Megaphone size={15} aria-hidden="true"/>{featured.report_count}</span>
            </div>
        </div>
    );
}

function HeroScene({featured}){
    const reducedMotion=useReducedMotion();
    const rawX=useMotionValue(0);
    const rawY=useMotionValue(0);
    const pointerX=useSpring(rawX, SPRING);
    const pointerY=useSpring(rawY, SPRING);
    const rotateY=useTransform(pointerX, [-0.5, 0.5], [-11, 5]);
    const rotateX=useTransform(pointerY, [-0.5, 0.5], [13, 3]);
    const back=useLayer(pointerX, pointerY, 10);
    const middle=useLayer(pointerX, pointerY, 20);
    const front=useLayer(pointerX, pointerY, 34);

    function handleMove(event){
        if(reducedMotion || event.pointerType !== "mouse"){
            return;
        }

        const bounds=event.currentTarget.getBoundingClientRect();

        rawX.set((event.clientX-bounds.left)/bounds.width-0.5);
        rawY.set((event.clientY-bounds.top)/bounds.height-0.5);
    }

    function handleLeave(){
        rawX.set(0);
        rawY.set(0);
    }

    return (
        <motion.div
            className="scene"
            initial={{opacity:0,scale:0.94}}
            animate={{opacity:1,scale:1}}
            transition={{duration:0.8,ease:[0.22, 1, 0.36, 1],delay:0.15}}
            onPointerMove={handleMove}
            onPointerLeave={handleLeave}
        >
            <motion.div className="scene-stage" style={reducedMotion ? undefined : {rotateX,rotateY}}>
                <motion.div className="scene-card scene-back" style={back}>
                    <div className="scene-card-body">
                        <span className="scene-example">Example</span>
                        <span className="eyebrow"><FileText size={13} aria-hidden="true"/>SRS draft</span>
                        <code>FR-001 The system shall show the last reported bus stop.</code>
                        <code>FR-002 The system shall …</code>
                    </div>
                </motion.div>

                <motion.div className="scene-card scene-middle" style={middle}>
                    <FeaturedLayer featured={featured}/>
                </motion.div>

                <motion.div className="scene-card scene-front" style={front}>
                    <div className="scene-card-body">
                        <span className="scene-example">Example</span>
                        <span className="badge badge-ai"><Sparkles size={13} aria-hidden="true"/>AI-suggested match</span>
                        <strong>Is this your problem?</strong>
                        <span className="scene-choice">Same underlying problem</span>
                        <span className="scene-choice scene-choice-muted">Related, but different</span>
                    </div>
                </motion.div>

                <span className="scene-orb" aria-hidden="true"/>
            </motion.div>
        </motion.div>
    );
}

export default HeroScene;
