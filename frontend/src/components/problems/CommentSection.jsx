import {useState} from "react";
import {Link} from "react-router";
import {AnimatePresence, motion} from "motion/react";
import {MessageSquare} from "lucide-react";
import {api} from "../../api";
import {useSession} from "../../context/SessionContext";
import {useToast} from "../../context/ToastContext";
import Button from "../ui/Button";
import {TextArea} from "../ui/Field";
import {Avatar} from "../ui/Badges";
import {formatDate} from "../../utils/format";

function CommentSection({problemId, comments, onAdded}){
    const {user}=useSession();
    const toast=useToast();
    const [text, setText]=useState("");
    const [saving, setSaving]=useState(false);

    async function handleSubmit(event){
        event.preventDefault();

        if(text.trim() === ""){
            return;
        }

        setSaving(true);

        try{
            onAdded(await api.addComment(problemId, text.trim()));
            setText("");
        }catch(error){
            toast.error(error.message);
        }finally{
            setSaving(false);
        }
    }

    return (
        <section className="surface section-block">
            <h2 className="section-title">
                <span className="section-icon"><MessageSquare size={18} aria-hidden="true"/></span>
                Discussion
                <span className="count-chip">{comments.length}</span>
            </h2>

            {comments.length === 0 && <p className="muted">No comments yet. Start the discussion.</p>}

            <ul className="comment-list">
                <AnimatePresence initial={false}>
                    {comments.map((comment) => (
                        <motion.li key={comment.id} className="comment" layout initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}>
                            <Avatar name={comment.author.name}/>
                            <div>
                                <p className="comment-head">
                                    <strong>{comment.author.name}</strong>
                                    <time dateTime={comment.created_at}>{formatDate(comment.created_at)}</time>
                                </p>
                                <p>{comment.text}</p>
                            </div>
                        </motion.li>
                    ))}
                </AnimatePresence>
            </ul>

            {user ? (
                <form onSubmit={handleSubmit}>
                    <TextArea
                        label="Add a comment"
                        rows={3}
                        value={text}
                        placeholder="Ask a question or add more details…"
                        onChange={(event) => setText(event.target.value)}
                    />
                    <Button type="submit" loading={saving} disabled={text.trim() === ""}>Post comment</Button>
                </form>
            ) : (
                <p className="muted"><Link className="text-link" to="/login">Sign in</Link> to join the discussion.</p>
            )}
        </section>
    );
}

export default CommentSection;
