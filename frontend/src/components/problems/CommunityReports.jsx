import {Megaphone} from "lucide-react";
import Collapsible from "../ui/Collapsible";
import {Avatar, SyntheticBadge} from "../ui/Badges";
import {formatDate, plural, shortText} from "../../utils/format";

function ReportItem({report}){
    return (
        <Collapsible
            className="report-item"
            summary={(
                <span className="report-summary">
                    <Avatar name={report.author.name} size="small"/>
                    <span>
                        <strong>{report.title}</strong>
                        <small>{report.author.name} · {formatDate(report.created_at)}</small>
                    </span>
                </span>
            )}
        >
            <p>{report.description}</p>

            {report.outcome && (
                <>
                    <h4>Desired outcome</h4>
                    <p>{report.outcome}</p>
                </>
            )}

            {report.constraints && (
                <>
                    <h4>Constraints</h4>
                    <p>{report.constraints}</p>
                </>
            )}

            {report.source === "synthetic" && <SyntheticBadge/>}
        </Collapsible>
    );
}

function CommunityReports({problem}){
    const reports=problem.community_reports;

    return (
        <section className="surface section-block">
            <Collapsible
                className="reports"
                defaultOpen={reports.length > 0}
                summary={(
                    <span className="reports-heading">
                        <span className="section-icon"><Megaphone size={18} aria-hidden="true"/></span>
                        <span>
                            <strong>Community reports</strong>
                            <small>{plural(reports.length, "independent report")} of this same problem</small>
                        </span>
                    </span>
                )}
            >
                <p className="section-note">
                    Reports are original submissions that their authors confirmed describe the same underlying problem.
                    They are not upvotes.
                </p>

                <div className="report-origin">
                    <span className="eyebrow">Original main problem</span>
                    <strong>{problem.title}</strong>
                    <small>{problem.author.name} · {formatDate(problem.created_at)} · {shortText(problem.description, 110)}</small>
                </div>

                {reports.length === 0 && <p className="muted">No additional reports yet.</p>}

                <div className="report-list">
                    {reports.map((report) => <ReportItem key={report.id} report={report}/>)}
                </div>
            </Collapsible>
        </section>
    );
}

export default CommunityReports;
