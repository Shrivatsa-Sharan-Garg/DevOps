import {ShieldAlert} from "lucide-react";
import {useSession} from "../../context/SessionContext";

export const AI_NOTICE=
    "AI-powered analysis sends your problem description to external AI providers for processing. "
    +"Please avoid including passwords, personal identifiers or confidential information.";

function AiConsentNotice(){
    const {aiConsent, setAiConsent}=useSession();

    return (
        <div className="consent-panel">
            <span className="section-icon"><ShieldAlert size={18} aria-hidden="true"/></span>

            <div>
                <strong>AI processing notice</strong>
                <p>{AI_NOTICE}</p>
                <p className="consent-providers">
                    Duplicate checks use Cloudflare Workers AI. SRS drafts use OpenRouter, which forwards text to its model hosts.
                    Your name and email are never sent.
                </p>

                <label className="check-field">
                    <input type="checkbox" checked={aiConsent} onChange={(event) => setAiConsent(event.target.checked)}/>
                    <span>I understand, and I agree to AI processing of this text</span>
                </label>

                {!aiConsent && <p className="consent-hint">Without this, only a local keyword check runs and nothing is sent to AI providers.</p>}
            </div>
        </div>
    );
}

export default AiConsentNotice;
