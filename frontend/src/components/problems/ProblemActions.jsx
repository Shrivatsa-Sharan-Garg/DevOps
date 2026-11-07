import {useState} from "react";
import {useNavigate} from "react-router";
import {motion} from "motion/react";
import {ArrowBigUp, Bell, BellRing} from "lucide-react";
import {api} from "../../api";
import {useSession} from "../../context/SessionContext";
import {useToast} from "../../context/ToastContext";

function useSignedInAction(){
    const {user}=useSession();
    const navigate=useNavigate();
    const toast=useToast();
    const [busy, setBusy]=useState(false);

    async function run(action){
        if(!user){
            navigate("/login");
            return;
        }

        setBusy(true);

        try{
            await action();
        }catch(error){
            toast.error(error.message);
        }finally{
            setBusy(false);
        }
    }

    return {busy,run};
}

export function UpvoteButton({problem, onChange, large=false}){
    const {busy, run}=useSignedInAction();
    const active=problem.viewer_has_upvoted;

    function handleClick(event){
        event.preventDefault();

        run(async () => {
            const result=await api.toggleUpvote(problem.id);

            onChange({
                viewer_has_upvoted:result.viewer_has_upvoted,
                upvote_count:result.upvote_count
            });
        });
    }

    return (
        <motion.button
            type="button"
            className={`upvote ${active ? "is-active" : ""} ${large ? "upvote-large" : ""}`}
            aria-pressed={active}
            aria-label={`${active ? "Remove upvote from" : "Upvote"} ${problem.title}`}
            disabled={busy}
            whileTap={{scale:0.86}}
            onClick={handleClick}
        >
            <motion.span
                key={String(active)}
                initial={{scale:0.6,y:4}}
                animate={{scale:1,y:0}}
                transition={{type:"spring",stiffness:600,damping:18}}
            >
                <ArrowBigUp size={large ? 22 : 18} fill={active ? "currentColor" : "none"} aria-hidden="true"/>
            </motion.span>
            <span>{problem.upvote_count}</span>
        </motion.button>
    );
}

export function FollowButton({problem, onChange}){
    const {busy, run}=useSignedInAction();
    const active=problem.viewer_is_following;

    function handleClick(){
        run(async () => {
            const result=await api.toggleFollow(problem.id);

            onChange({viewer_is_following:result.viewer_is_following});
        });
    }

    return (
        <motion.button
            type="button"
            className={active ? "btn btn-secondary is-following" : "btn btn-secondary"}
            aria-pressed={active}
            disabled={busy}
            whileTap={{scale:0.96}}
            onClick={handleClick}
        >
            {active ? <BellRing size={16} aria-hidden="true"/> : <Bell size={16} aria-hidden="true"/>}
            {active ? "Following" : "Follow updates"}
        </motion.button>
    );
}
