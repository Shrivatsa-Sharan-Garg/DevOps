import {Link} from "react-router";
import {Beaker, CheckCircle2, CircleDot, Hammer} from "lucide-react";
import {initialOf, statusLabel} from "../../utils/format";

const STATUS_ICONS={"open":CircleDot,"in-progress":Hammer,"solved":CheckCircle2};

export function StatusBadge({status}){
    const Icon=STATUS_ICONS[status] || CircleDot;

    return (
        <span className={`badge status-${status}`}>
            <Icon size={13} aria-hidden="true"/>
            {statusLabel(status)}
        </span>
    );
}

export function CategoryBadge({category}){
    return <span className="badge badge-category">{category}</span>;
}

export function SyntheticBadge(){
    return (
        <span className="badge badge-synthetic" title="This is invented demonstration data">
            <Beaker size={12} aria-hidden="true"/>
            Demo data
        </span>
    );
}

export function Tag({children}){
    return <Link className="tag" to={`/problems?tag=${encodeURIComponent(children)}`}>#{children}</Link>;
}

export function Avatar({name, size=""}){
    return <span className={`avatar ${size ? `avatar-${size}` : ""}`} aria-hidden="true">{initialOf(name)}</span>;
}
