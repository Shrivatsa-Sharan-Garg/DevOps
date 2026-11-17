import {useState} from "react";
import {Link, useLocation, useNavigate} from "react-router";
import {motion} from "motion/react";
import {ArrowRight, KeyRound} from "lucide-react";
import {api} from "../api";
import {useSession} from "../context/SessionContext";
import {useApi} from "../hooks/useApi";
import {Avatar} from "../components/ui/Badges";
import Button from "../components/ui/Button";
import {TextField} from "../components/ui/Field";

const EMAIL_PATTERN=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function AuthShell({eyebrow, heading, text, children}){
    return (
        <div className="auth-page">
            <motion.div className="auth-aside" initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}}>
                <span className="eyebrow">{eyebrow}</span>
                <h2>{heading}</h2>
                <p>{text}</p>
                <small>Passwords are stored only as salted hashes.</small>
            </motion.div>

            <motion.div className="surface auth-main" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}>
                {children}
            </motion.div>
        </div>
    );
}

function DemoAccounts({onPick}){
    const {data:accounts}=useApi((signal) => api.demoAccounts(signal));

    if(!accounts || accounts.length === 0){
        return null;
    }

    return (
        <div className="demo-accounts">
            <span className="eyebrow">Demo accounts</span>

            <div className="profile-list">
                {accounts.map((account) => (
                    <button type="button" className="profile-option" key={account.email} onClick={() => onPick(account.email)}>
                        <Avatar name={account.name}/>

                        <span>
                            <strong>{account.name}</strong>
                            <small>{account.role === "developer" ? "Developer" : "Community member"} · {account.email}</small>
                        </span>

                        <KeyRound size={16} aria-hidden="true"/>
                    </button>
                ))}
            </div>

            <p className="muted small">Choosing an account fills in its email. The demo password is listed in the README.</p>
        </div>
    );
}

export function Login(){
    const {login}=useSession();
    const navigate=useNavigate();
    const location=useLocation();
    const [form, setForm]=useState({email:"",password:""});
    const [errors, setErrors]=useState({});
    const [saving, setSaving]=useState(false);

    function handleChange(event){
        const {name, value}=event.target;

        setForm((current) => ({...current,[name]:value}));
        setErrors({});
    }

    async function handleSubmit(event){
        event.preventDefault();

        const nextErrors={};

        if(!EMAIL_PATTERN.test(form.email.trim())){
            nextErrors.email="Enter a valid email address.";
        }

        if(!form.password){
            nextErrors.password="Enter your password.";
        }

        setErrors(nextErrors);

        if(Object.keys(nextErrors).length > 0){
            return;
        }

        setSaving(true);

        try{
            await login({email:form.email.trim(),password:form.password});
            navigate(location.state?.from || "/workspace/overview");
        }catch(failure){
            setErrors({password:failure.message});
        }finally{
            setSaving(false);
        }
    }

    return (
        <AuthShell
            eyebrow="Build around what matters"
            heading="Useful software starts with listening."
            text="Join the people sharing real needs and the developers working toward practical answers."
        >
            <form onSubmit={handleSubmit} noValidate>
                <span className="eyebrow">Welcome back</span>
                <h1>Sign in to DevBridge</h1>

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
                <TextField
                    label="Password"
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    value={form.password}
                    error={errors.password}
                    onChange={handleChange}
                />

                <Button type="submit" loading={saving} className="btn-full">
                    Sign in
                    <ArrowRight size={16} aria-hidden="true"/>
                </Button>
            </form>

            <DemoAccounts onPick={(email) => setForm({email,password:""})}/>

            <p className="auth-switch">New to DevBridge? <Link className="text-link" to="/register">Create an account</Link></p>
        </AuthShell>
    );
}

function validate(form){
    const errors={};

    if(form.name.trim().length < 2){
        errors.name="Enter your name.";
    }

    if(!EMAIL_PATTERN.test(form.email.trim())){
        errors.email="Enter a valid email address.";
    }

    if(form.password.length < 8){
        errors.password="Use at least 8 characters.";
    }

    if(form.confirm !== form.password){
        errors.confirm="The passwords do not match.";
    }

    return errors;
}

export function Register(){
    const {register}=useSession();
    const navigate=useNavigate();
    const [form, setForm]=useState({name:"",email:"",password:"",confirm:"",role:"user"});
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
            await register({
                name:form.name.trim(),
                email:form.email.trim(),
                password:form.password,
                role:form.role
            });
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
                <span className="eyebrow">Create an account</span>
                <h1>Join the community</h1>

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
                <TextField
                    label="Password"
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    value={form.password}
                    error={errors.password}
                    hint="At least 8 characters."
                    onChange={handleChange}
                />
                <TextField
                    label="Confirm password"
                    type="password"
                    name="confirm"
                    autoComplete="new-password"
                    value={form.confirm}
                    error={errors.confirm}
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
                    Create account
                    <ArrowRight size={16} aria-hidden="true"/>
                </Button>

                <p className="auth-switch">Already have an account? <Link className="text-link" to="/login">Sign in</Link></p>
            </form>
        </AuthShell>
    );
}
