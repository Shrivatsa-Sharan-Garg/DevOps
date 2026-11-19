import {Suspense, useEffect, useState} from "react";
import {Link, useLocation, useOutlet} from "react-router";
import {AnimatePresence, motion} from "motion/react";
import {PageSkeleton} from "../ui/States";
import Brand from "./Brand";
import Navbar from "./Navbar";

// Keep the old page during its exit animation.
function FrozenOutlet(){
    const outlet=useOutlet();
    const [frozen]=useState(outlet);

    return frozen;
}

function pageKey(pathname){
    const section=pathname.split("/")[1];

    return section === "workspace" ? section : pathname;
}

function AmbientBackground(){
    return (
        <div className="ambient" aria-hidden="true">
            <span className="ambient-glow ambient-one"/>
            <span className="ambient-glow ambient-two"/>
            <span className="ambient-glow ambient-three"/>
            <span className="ambient-grid"/>
            <span className="ambient-motes"/>
        </div>
    );
}

function Footer(){
    return (
        <footer className="footer">
            <div className="footer-inner">
                <div>
                    <Brand/>
                    <p>Real needs. Shared momentum. Useful builds.</p>
                </div>

                <nav aria-label="Footer navigation">
                    <Link to="/problems">Explore problems</Link>
                    <Link to="/solutions">Solutions</Link>
                    <Link to="/dashboard">Dashboard</Link>
                    <Link to="/submit">Share a problem</Link>
                </nav>

                <small>Demonstration build. Records marked "Demo data" are synthetic.</small>
            </div>
        </footer>
    );
}

function AppLayout(){
    const location=useLocation();

    useEffect(() => {
        if(location.hash){
            return;
        }

        window.scrollTo({top:0});
    }, [location.pathname, location.hash]);

    return (
        <div className="app">
            <AmbientBackground/>
            <a className="skip-link" href="#main">Skip to content</a>
            <Navbar/>

            <AnimatePresence mode="wait" initial={false}>
                <motion.main
                    id="main"
                    className="page"
                    key={pageKey(location.pathname)}
                    initial={{opacity:0,y:14}}
                    animate={{opacity:1,y:0}}
                    exit={{opacity:0,y:-10}}
                    transition={{duration:0.26,ease:[0.22, 1, 0.36, 1]}}
                >
                    <Suspense fallback={<PageSkeleton/>}>
                        <FrozenOutlet/>
                    </Suspense>
                </motion.main>
            </AnimatePresence>

            <Footer/>
        </div>
    );
}

export default AppLayout;
