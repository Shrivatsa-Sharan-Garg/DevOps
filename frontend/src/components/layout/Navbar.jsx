import {useState} from "react";
import {Link, NavLink, useNavigate} from "react-router";
import {AnimatePresence, motion} from "motion/react";
import {Bell, LayoutGrid, LogOut, Menu, Moon, Plus, Sun, UserRound, X} from "lucide-react";
import {api} from "../../api";
import {useSession} from "../../context/SessionContext";
import Button from "../ui/Button";
import Dropdown from "../ui/Dropdown";
import {Avatar} from "../ui/Badges";
import {plural} from "../../utils/format";
import Brand from "./Brand";

const LINKS=[
    {to:"/problems",label:"Explore"},
    {to:"/solutions",label:"Solutions"},
    {to:"/dashboard",label:"Dashboard"},
    {to:"/#how-it-works",label:"How it works"}
];

function NavItem({to, label, onNavigate}){
    return (
        <NavLink to={to} end={to.includes("#")} className="nav-link" onClick={onNavigate}>
            {({isActive}) => (
                <>
                    {label}
                    {isActive && !to.includes("#") && (
                        <motion.span
                            className="nav-indicator"
                            layoutId="nav-indicator"
                            transition={{type:"spring",stiffness:420,damping:32}}
                        />
                    )}
                </>
            )}
        </NavLink>
    );
}

function activityHeading(followed){
    if(followed === null){
        return "Loading…";
    }

    if(followed.length === 0){
        return "You're all caught up";
    }

    return plural(followed.length, "followed problem");
}

function ActivityMenu(){
    const [followed, setFollowed]=useState(null);

    function loadFollowed(){
        api.workspace()
            .then((workspace) => setFollowed(workspace.followed))
            .catch(() => setFollowed([]));
    }

    return (
        <Dropdown label="Activity" onOpen={loadFollowed} trigger={<span className="icon-button"><Bell size={18}/></span>}>
            {(close) => (
                <div className="menu-card">
                    <span className="eyebrow">Activity</span>
                    <strong>{activityHeading(followed)}</strong>

                    <div className="menu-list">
                        {followed?.slice(0, 3).map((problem) => (
                            <Link key={problem.id} to={`/problems/${problem.id}`} onClick={close}>{problem.title}</Link>
                        ))}
                    </div>

                    {followed?.length === 0 && <p>Follow a problem to keep its activity close.</p>}
                    <Link className="text-link" to="/workspace/activity" onClick={close}>Open activity</Link>
                </div>
            )}
        </Dropdown>
    );
}

function AccountMenu(){
    const {user, signOut}=useSession();
    const navigate=useNavigate();

    function handleSignOut(close){
        signOut();
        close();
        navigate("/");
    }

    return (
        <Dropdown
            label="Account menu"
            trigger={(
                <span className="account-trigger">
                    <Avatar name={user.name}/>
                    <span className="account-name">{user.name.split(" ")[0]}</span>
                </span>
            )}
        >
            {(close) => (
                <div className="menu-card menu-actions">
                    <span className="eyebrow">Demo session</span>
                    <Link to="/workspace/overview" onClick={close}><LayoutGrid size={16}/> Workspace</Link>
                    <Link to="/workspace/profile" onClick={close}><UserRound size={16}/> Profile</Link>
                    <button type="button" onClick={() => handleSignOut(close)}><LogOut size={16}/> Exit demo session</button>
                </div>
            )}
        </Dropdown>
    );
}

function Navbar(){
    const {user, theme, toggleTheme}=useSession();
    const [menuOpen, setMenuOpen]=useState(false);
    const nextTheme=theme === "dark" ? "light" : "dark";

    function closeMenu(){
        setMenuOpen(false);
    }

    return (
        <header className="navbar">
            <div className="navbar-inner">
                <Brand/>

                <nav className="nav-links" aria-label="Main navigation">
                    {LINKS.map((link) => <NavItem key={link.to} {...link}/>)}
                </nav>

                <div className="nav-actions">
                    <button
                        type="button"
                        className="icon-button"
                        aria-label={`Switch to ${nextTheme} theme`}
                        onClick={toggleTheme}
                    >
                        {theme === "dark" ? <Sun size={18}/> : <Moon size={18}/>}
                    </button>

                    {user ? (
                        <>
                            <ActivityMenu/>
                            <AccountMenu/>
                        </>
                    ) : (
                        <Link className="nav-link nav-sign-in" to="/login">Sign in</Link>
                    )}

                    <Button to="/submit" size="small" className="nav-submit">
                        <Plus size={16} aria-hidden="true"/>
                        Share a problem
                    </Button>

                    <button
                        type="button"
                        className="icon-button nav-toggle"
                        aria-label="Toggle navigation"
                        aria-expanded={menuOpen}
                        onClick={() => setMenuOpen(!menuOpen)}
                    >
                        {menuOpen ? <X size={20}/> : <Menu size={20}/>}
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {menuOpen && (
                    <motion.nav
                        className="mobile-nav"
                        aria-label="Mobile navigation"
                        initial={{height:0,opacity:0}}
                        animate={{height:"auto",opacity:1}}
                        exit={{height:0,opacity:0}}
                    >
                        {LINKS.map((link) => <Link key={link.to} to={link.to} onClick={closeMenu}>{link.label}</Link>)}
                        <Link to="/submit" onClick={closeMenu}>Share a problem</Link>
                        {!user && <Link to="/login" onClick={closeMenu}>Sign in</Link>}
                    </motion.nav>
                )}
            </AnimatePresence>
        </header>
    );
}

export default Navbar;
