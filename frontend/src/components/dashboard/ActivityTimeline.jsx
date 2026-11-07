import {Link} from "react-router";
import {Code2, FileQuestion, Megaphone, MessageSquare} from "lucide-react";
import {formatDate, shortText} from "../../utils/format";

const EVENT_TYPES={
    problem:{icon:FileQuestion,verb:"shared a problem"},
    report:{icon:Megaphone,verb:"reported the same problem"},
    comment:{icon:MessageSquare,verb:"commented on"},
    solution:{icon:Code2,verb:"published a solution"}
};

function ActivityTimeline({events}){
    return (
        <section className="surface chart-frame">
            <h2>Activity timeline</h2>

            <ol className="timeline">
                {events.map((event, index) => {
                    const {icon:Icon, verb}=EVENT_TYPES[event.type];

                    return (
                        <li key={`${event.type}-${event.created_at}-${index}`}>
                            <span className="timeline-dot"><Icon size={14} aria-hidden="true"/></span>

                            <div>
                                <p><strong>{event.actor}</strong> {verb}</p>
                                <Link to={`/problems/${event.problem_id}`}>{shortText(event.title, 54)}</Link>
                                <time dateTime={event.created_at}>{formatDate(event.created_at)}</time>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}

export default ActivityTimeline;
