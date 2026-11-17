import {useState} from "react";
import {Link, NavLink, Navigate, useNavigate, useParams} from "react-router";
import {motion} from "motion/react";
import {ArrowBigUp, ArrowUpRight, Bell, Code2, FileQuestion, LayoutGrid, LogOut, Plus, UserRound} from "lucide-react";
import {api} from "../api";
import {useSession} from "../context/SessionContext";
import {useToast} from "../context/ToastContext";
import {useApi} from "../hooks/useApi";
import AnimatedNumber from "../components/ui/AnimatedNumber";
import {Avatar} from "../components/ui/Badges";
import Button from "../components/ui/Button";
import {SelectField, TextArea, TextField} from "../components/ui/Field";
import {Stagger, StaggerItem} from "../components/ui/Reveal";
import {EmptyState, ErrorState, PageSkeleton} from "../components/ui/States";
import TiltCard from "../components/ui/TiltCard";
import {formatDate, plural, splitList} from "../utils/format";

const SECTIONS=[
    {id:"overview",label:"Overview",icon:LayoutGrid},
    {id:"problems",label:"My problems",icon:FileQuestion},
    {id:"supported",label:"Supported",icon:ArrowBigUp},
    {id:"solutions",label:"My solutions",icon:Code2},
    {id:"activity",label:"Activity",icon:Bell},
    {id:"profile",label:"Profile",icon:UserRound}
];

function ProblemRows({problems, emptyTitle, emptyText}){
    if(problems.length === 0){
        return (
            <EmptyState icon={FileQuestion} title={emptyTitle} action={<Button variant="secondary" to="/problems">Explore problems</Button>}>
                {emptyText}
            </EmptyState>
        );
    }

    return (
        <div className="row-list surface">
            {problems.map((problem) => (
                <Link className="row-link" key={problem.id} to={`/problems/${problem.id}`}>
                    <span className="row-main">
                        <strong>{problem.title}</strong>
                        <small>{problem.category} · {plural(problem.upvote_count, "upvote")} · {formatDate(problem.created_at)}</small>
                    </span>
                    <ArrowUpRight size={18} aria-hidden="true"/>
                </Link>
            ))}
        </div>
    );
}

function SolutionRows({solutions}){
    if(solutions.length === 0){
        return (
            <EmptyState icon={Code2} title="No solutions yet" action={<Button variant="secondary" to="/problems">Find a problem to solve</Button>}>
                Solutions you publish on a problem appear here.
            </EmptyState>
        );
    }

    return (
        <div className="row-list surface">
            {solutions.map((solution) => (
                <Link className="row-link" key={solution.id} to={`/solutions/${solution.id}`}>
                    <span className="row-main">
                        <strong>{solution.title}</strong>
                        <small>Built for {solution.problem_title}</small>
                    </span>
                    <ArrowUpRight size={18} aria-hidden="true"/>
                </Link>
            ))}
        </div>
    );
}

function Overview({user, workspace}){
    const stats=[
        {id:"problems",label:"Problems shared",value:workspace.problems.length,icon:FileQuestion},
        {id:"supported",label:"Problems supported",value:workspace.supported.length,icon:ArrowBigUp},
        {id:"solutions",label:"Solutions published",value:workspace.solutions.length,icon:Code2},
        {id:"activity",label:"Problems followed",value:workspace.followed.length,icon:Bell}
    ];

    return (
        <>
            <div className="workspace-welcome surface">
                <div>
                    <h2>Good to see you, {user.name.split(" ")[0]}.</h2>
                    <p>Keep track of the needs you care about and the ideas you're helping build.</p>
                </div>

                <Button to="/submit"><Plus size={16} aria-hidden="true"/>Share a problem</Button>
            </div>

            <Stagger className="metric-grid">
                {stats.map((stat) => (
                    <StaggerItem key={stat.id}>
                        <TiltCard className="surface metric-card">
                            <span className="section-icon"><stat.icon size={18} aria-hidden="true"/></span>
                            <strong><AnimatedNumber value={stat.value}/></strong>
                            <span>{stat.label}</span>
                            <Link className="text-link" to={`/workspace/${stat.id}`}>View</Link>
                        </TiltCard>
                    </StaggerItem>
                ))}
            </Stagger>
        </>
    );
}

function ProfileForm({user}){
    const {saveProfile, signOut}=useSession();
    const navigate=useNavigate();
    const toast=useToast();
    const [form, setForm]=useState({
        name:user.name,
        bio:user.bio || "",
        skills:(user.skills || []).join(", "),
        role:user.role
    });
    const [errors, setErrors]=useState({});
    const [saving, setSaving]=useState(false);

    function handleChange(event){
        const {name, value}=event.target;

        setForm((current) => ({...current,[name]:value}));
        setErrors({});
    }

    async function handleSubmit(event){
        event.preventDefault();

        if(form.name.trim().length < 2){
            setErrors({name:"Enter a name with at least 2 characters."});
            return;
        }

        setSaving(true);

        try{
            await saveProfile({...form,name:form.name.trim(),skills:splitList(form.skills)});
            toast.success("Profile saved.");
        }catch(error){
            toast.error(error.message);
        }finally{
            setSaving(false);
        }
    }

    function handleSignOut(){
        signOut();
        navigate("/");
    }

    return (
        <form className="surface profile-form" onSubmit={handleSubmit} noValidate>
            <p className="muted">These details are saved to your DevBridge account.</p>

            <TextField label="Display name" name="name" value={form.name} error={errors.name} onChange={handleChange}/>
            <TextArea
                label="About you"
                optional
                name="bio"
                value={form.bio}
                placeholder="What do you work on?"
                onChange={handleChange}
            />
            <TextField
                label="Skills"
                optional
                name="skills"
                value={form.skills}
                placeholder="React, Python"
                onChange={handleChange}
            />

            <SelectField label="Participation" name="role" value={form.role} onChange={handleChange}>
                <option value="user">Community member</option>
                <option value="developer">Developer</option>
            </SelectField>

            <div className="form-actions">
                <Button variant="ghost" onClick={handleSignOut}>Sign out</Button>
                <Button type="submit" loading={saving}>Save profile</Button>
            </div>
        </form>
    );
}

function SectionBody({section, user, workspace}){
    if(section === "problems"){
        return (
            <ProblemRows
                problems={workspace.problems}
                emptyTitle="You haven't shared a problem yet"
                emptyText="Problems you publish appear here."
            />
        );
    }

    if(section === "supported"){
        return (
            <ProblemRows
                problems={workspace.supported}
                emptyTitle="Nothing supported yet"
                emptyText="Upvote a problem to keep it here."
            />
        );
    }

    if(section === "solutions"){
        return <SolutionRows solutions={workspace.solutions}/>;
    }

    if(section === "activity"){
        return (
            <ProblemRows
                problems={workspace.followed}
                emptyTitle="Your activity will gather here"
                emptyText="Follow a problem to keep it close."
            />
        );
    }

    if(section === "profile"){
        return <ProfileForm user={user}/>;
    }

    return <Overview user={user} workspace={workspace}/>;
}

function Workspace(){
    const {section="overview"}=useParams();
    const {user, signedOut, signOut}=useSession();
    const navigate=useNavigate();
    const {data, error, loading, reload}=useApi(
        (signal) => user ? api.workspace(signal) : Promise.resolve(null),
        [user?.id, section]
    );

    if(!user){
        return <Navigate to={signedOut ? "/" : "/login"} replace/>;
    }

    function handleSignOut(){
        signOut();
        navigate("/");
    }

    const current=SECTIONS.find((item) => item.id === section) || SECTIONS[0];

    return (
        <div className="page-shell workspace">
            <aside className="surface workspace-nav">
                <div className="workspace-user">
                    <Avatar name={user.name} size="large"/>
                    <span>
                        <strong>{user.name}</strong>
                        <small>{user.role === "developer" ? "Developer" : "Community member"}</small>
                    </span>
                </div>

                <nav aria-label="Workspace navigation">
                    {SECTIONS.map((item) => (
                        <NavLink key={item.id} to={`/workspace/${item.id}`} className="workspace-link">
                            <item.icon size={17} aria-hidden="true"/>
                            {item.label}
                        </NavLink>
                    ))}

                    <button type="button" className="workspace-link" onClick={handleSignOut}>
                        <LogOut size={17} aria-hidden="true"/>
                        Sign out
                    </button>
                </nav>
            </aside>

            <div className="workspace-main">
                <header className="workspace-head">
                    <span className="eyebrow">Workspace</span>
                    <h1>{current.label}</h1>
                </header>

                {loading && !data && <PageSkeleton/>}
                {error && <ErrorState error={error} onRetry={reload}/>}

                {data && (
                    <motion.div key={section} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}>
                        <SectionBody section={section} user={user} workspace={data}/>
                    </motion.div>
                )}
            </div>
        </div>
    );
}

export default Workspace;
