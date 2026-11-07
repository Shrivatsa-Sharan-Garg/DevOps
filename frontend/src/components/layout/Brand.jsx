import {Link} from "react-router";

function Brand(){
    return (
        <Link className="brand" to="/" aria-label="DevBridge home">
            <span className="brand-mark" aria-hidden="true">
                <svg viewBox="0 0 32 32" width="20" height="20" fill="none">
                    <path d="M3 22c6-13 20-13 26 0" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/>
                    <path d="M9 22V14M16 22V10.5M23 22V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
            </span>
            <span className="brand-name">DevBridge</span>
        </Link>
    );
}

export default Brand;
