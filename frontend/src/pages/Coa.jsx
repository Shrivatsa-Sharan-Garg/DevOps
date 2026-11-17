import {Navigate, useNavigate, useParams} from "react-router";
import {motion} from "motion/react";
import AssemblyModule from "../components/coa/AssemblyModule";
import CpuModule from "../components/coa/CpuModule";
import LogicModule from "../components/coa/LogicModule";
import MemoryModule from "../components/coa/MemoryModule";
import NumberModule from "../components/coa/NumberModule";
import PerformanceModule from "../components/coa/PerformanceModule";
import {Reveal} from "../components/ui/Reveal";
import {ModuleTabs} from "../components/sim/SimParts";

const MODULES=[
    {id:"numbers",number:1,title:"Number Systems",syllabus:"Computer organization and number systems",component:NumberModule},
    {id:"logic",number:2,title:"Boolean Logic",syllabus:"Boolean algebra, logic gates and Karnaugh maps",component:LogicModule},
    {id:"cpu",number:3,title:"CPU Simulator",syllabus:"CPU organization and the instruction cycle",component:CpuModule},
    {id:"memory",number:4,title:"Memory and I/O",syllabus:"Memory hierarchy, cache, virtual memory and I/O",component:MemoryModule},
    {id:"performance",number:5,title:"Performance",syllabus:"Pipelining, parallel processing and performance",component:PerformanceModule},
    {id:"assembly",number:6,title:"Assembly",syllabus:"Instruction sets and assembly language",component:AssemblyModule}
];

function Coa(){
    const {module="numbers"}=useParams();
    const navigate=useNavigate();
    const active=MODULES.find((item) => item.id === module);

    if(!active){
        return <Navigate to="/coa" replace/>;
    }

    const Module=active.component;

    return (
        <div className="page-shell simulations">
            <Reveal className="page-title">
                <div>
                    <span className="eyebrow">Computer Organization and Architecture</span>
                    <h1>COA lab</h1>
                    <p>Convert numbers, build logic, run assembly on a simulated CPU and explore memory and performance.</p>
                </div>
            </Reveal>

            <ModuleTabs label="coa-modules" modules={MODULES} active={active.id} onChange={(id) => navigate(`/coa/${id}`)}/>

            <motion.div key={active.id} className="module-body" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}>
                <p className="module-caption">Module {active.number}: {active.syllabus}</p>
                <Module/>
            </motion.div>
        </div>
    );
}

export default Coa;
