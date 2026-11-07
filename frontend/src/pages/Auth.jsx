import {useState} from "react";
import {Link, useNavigate} from "react-router";
import {motion} from "motion/react";
import {ArrowRight} from "lucide-react";
import {api} from "../api";
import {useSession} from "../context/SessionContext";
import {useToast} from "../context/ToastContext";
import {useApi} from "../hooks/useApi";
import {Avatar} from "../components/ui/Badges";
import Button from "../components/ui/Button";
import {TextField} from "../components/ui/Field";
import {ErrorState, Skeleton} from "../components/ui/States";

function AuthShell({eyebrow, heading, text, children}){
    return (
        <div className="auth-page">
            <motion.div className="auth-aside" initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}}>
                <span className="eyebrow">{eyebrow}</span>
                <h2>{heading}</h2>
                <p>{text}</p>
                <small>Demo profiles are not real accounts. No password is collected.</small>
            </motion.div>

            <motion.div className="surface auth-main" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}>
                {children}
            </motion.div>
        </div>
    );
}

export function Login(){
    const {startDemo}=useSession();
    const navigate=useNavigate();
    const toast=useToast();
    const [activeId, setActiveId]=useState(null);
    const {data:profiles, error, loading, reload}=useApi((signal) => api.demoProfiles(signal));

    async function choose(profile){
        setActiveId(profile.id);

        try{
            await startDemo(profile.id);
            navigate("/workspace/overview");
        }catch(failure){
            toast.error(failure.message);
            setActiveId(null);
        }
    }

    return (
        <AuthShell
            eyebrow="Build around what matters"
            heading="Useful software starts with listening."
            text="Join the people sharing real needs and the developers working toward practical answers."
        >
            <span className="eyebrow">Demo workspace</span>
            <h1>Step into DevBridge</h1>
            <p>Choose a sample profile to explore. Your actions are saved to the local demo data.</p>

            {loading && <Skeleton height={76} radius={14}/>}
            {error && <ErrorState error={error} onRetry={reload}/>}

            <div className="profile-list">
                {profiles?.map((profile) => (
                    <div className="profile-option" key={profile.id}>
                        <Avatar name={profile.name} size="large"/>

                        <span>
                            <strong>{profile.name}</strong>
                            <small>{profile.role === "developer" ? "Developer" : "Community member"}</small>
                        </span>

                        <Button size="small" loading={activeId === profile.id} onClick={() => choose(profile)}>
                            Continue
                            <ArrowRight size={14} aria-hidden="true"/>
                        </Button>
                    </div>
                ))}
            </div>

            <p className="auth-switch">New to DevBridge? <Link className="text-link" to="/register">Create a demo profile</Link></p>
        </AuthShell>
    );
}

function validate(form){
    const errors={};

    if(form.name.trim().length < 2){
        errors.name="Enter your name.";
    }

    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)){
        errors.email="Enter a valid email address.";
    }

    return errors;
}

export function Register(){
    const {register}=useSession();
    const navigate=useNavigate();
    const [form, setForm]=useState({name:"",email:"",role:"user"});
    const [errors, setErrors]=useState({});
    const [saving, setSaving]=useState(false);

    function handleChange(event){
        const {name, value}=event.target;

        setForm((current) => ({...current,[name]:value}));
        setErrors((current) => ({...current,[name]:""}));
    }

    async function handleSubmit(event){
        event.preventDefault();

        const nextErrors=validate(form);

        setErrors(nextErrors);

        if(Object.keys(nextErrors).length > 0){
            return;
        }

        setSaving(true);

        try{
            await register({...form,name:form.name.trim()});
            navigate("/workspace/overview");
        }catch(failure){
            setErrors(failure.code === "email_in_use" ? {email:failure.message} : failure.details || {email:failure.message});
        }finally{
            setSaving(false);
        }
    }

    return (
        <AuthShell
            eyebrow="Good to have you"
            heading="Make your expertise useful to someone."
            text="Support a problem, share your own, or publish a solution shaped by real community feedback."
        >
            <form onSubmit={handleSubmit} noValidate>
                <span className="eyebrow">Create a demo profile</span>
                <h1>Join the community</h1>
                <p>This profile is stored only in the local development data.</p>

                <TextField
                    label="Full name"
                    name="name"
                    autoComplete="name"
                    value={form.name}
                    error={errors.name}
                    placeholder="Your name"
                    onChange={handleChange}
                />
                <TextField
                    label="Email address"
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={form.email}
                    error={errors.email}
                    placeholder="you@example.com"
                    onChange={handleChange}
                />

                <fieldset className="role-picker">
                    <legend>How would you like to participate?</legend>

                    <label className={form.role === "user" ? "role-card is-selected" : "role-card"}>
                        <input type="radio" name="role" value="user" checked={form.role === "user"} onChange={handleChange}/>
                        <strong>I have a problem</strong>
                        <small>Share, support and discuss</small>
                    </label>

                    <label className={form.role === "developer" ? "role-card is-selected" : "role-card"}>
                        <input
                            type="radio"
                            name="role"
                            value="developer"
                            checked={form.role === "developer"}
                            onChange={handleChange}
                        />
                        <strong>I'm a developer</strong>
                        <small>Also publish solutions</small>
                    </label>
                </fieldset>

                <Button type="submit" loading={saving} className="btn-full">
                    Create demo profile
                    <ArrowRight size={16} aria-hidden="true"/>
                </Button>

                <p className="auth-switch">Already exploring? <Link className="text-link" to="/login">Continue as demo</Link></p>
            </form>
        </AuthShell>
    );
}
