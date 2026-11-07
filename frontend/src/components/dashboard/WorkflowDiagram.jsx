import {motion} from "motion/react";
import {CheckCircle2, Code2, FileText, GitBranch, Inbox, Layers, Megaphone} from "lucide-react";
import AnimatedNumber from "../ui/AnimatedNumber";

const ICONS={
    submitted:Inbox,
    reports:Megaphone,
    problems:Layers,
    related:GitBranch,
    srs:FileText,
    solutions:Code2,
    solved:CheckCircle2
};

const LANE_ITEM={
    hidden:{opacity:0,y:14,rotateX:-20},
    visible:{opacity:1,y:0,rotateX:0,transition:{type:"spring",stiffness:240,damping:22}}
};

function WorkflowDiagram({steps}){
    return (
        <section className="surface workflow">
            <header>
                <h2>How problems move through DevBridge</h2>
                <p className="chart-subtitle">Counts come from stored records. Submissions become either a main problem or a community report.</p>
            </header>

            <motion.ol
                className="workflow-lane"
                initial="hidden"
                whileInView="visible"
                viewport={{once:true,margin:"-40px"}}
                variants={{hidden:{},visible:{transition:{staggerChildren:0.09}}}}
            >
                {steps.map((step) => {
                    const Icon=ICONS[step.key] || Layers;

                    return (
                        <motion.li key={step.key} variants={LANE_ITEM} whileHover={{y:-4}}>
                            <span className="section-icon"><Icon size={18} aria-hidden="true"/></span>
                            <strong><AnimatedNumber value={step.count}/></strong>
                            <small>{step.label}</small>
                        </motion.li>
                    );
                })}
            </motion.ol>
        </section>
    );
}

export default WorkflowDiagram;
