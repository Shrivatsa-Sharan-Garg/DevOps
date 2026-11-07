import {Compass} from "lucide-react";
import Button from "../components/ui/Button";
import {EmptyState} from "../components/ui/States";

function NotFound(){
    return (
        <div className="page-shell">
            <EmptyState icon={Compass} title="This page does not exist" action={<Button to="/">Back to home</Button>}>
                The link may be old, or the page may have moved.
            </EmptyState>
        </div>
    );
}

export default NotFound;
