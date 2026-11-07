import {motion} from "motion/react";
import {ArrowRight} from "lucide-react";
import {useSession} from "../../context/SessionContext";
import Button from "../ui/Button";
import {SelectField, TextArea, TextField} from "../ui/Field";
import {Reveal} from "../ui/Reveal";
import AiConsentNotice from "./AiConsentNotice";

function FormSection({number, title, description, children}){
    return (
        <Reveal className="surface form-section">
            <div className="form-section-head">
                <span>{number}</span>
                <div>
                    <h2>{title}</h2>
                    <p>{description}</p>
                </div>
            </div>
            {children}
        </Reveal>
    );
}

function ProblemForm({form, errors, categories, busy, onChange, onSubmit, onCancel}){
    const {aiConsent}=useSession();

    function handleChange(event){
        const {name, type, value, checked}=event.target;

        onChange(name, type === "checkbox" ? checked : value);
    }

    return (
        <form className="problem-form" onSubmit={onSubmit} noValidate>
            <FormSection
                number="01"
                title="Describe the problem"
                description="Write in everyday language. Start with the people affected and what is hard today."
            >
                <TextField
                    label="Problem title"
                    name="title"
                    value={form.title}
                    error={errors.title}
                    placeholder="e.g. Students cannot tell when the campus bus will arrive"
                    onChange={handleChange}
                />

                <TextArea
                    label="What is happening today?"
                    name="description"
                    rows={6}
                    value={form.description}
                    error={errors.description}
                    hint={`${form.description.length} characters. Specific examples help developers understand the need.`}
                    placeholder="Who runs into this problem? What do they do today? Where does the current approach fall short?"
                    onChange={handleChange}
                />

                <div className="form-row">
                    <SelectField label="Category" name="category" value={form.category} onChange={handleChange}>
                        {categories.map((category) => <option key={category}>{category}</option>)}
                    </SelectField>

                    <TextField
                        label="Tags"
                        optional
                        name="tags"
                        value={form.tags}
                        hint="Separate tags with commas."
                        placeholder="bus, commute, tracking"
                        onChange={handleChange}
                    />
                </div>
            </FormSection>

            <FormSection
                number="02"
                title="Define a better outcome"
                description="What would be meaningfully easier if this problem were solved?"
            >
                <TextArea
                    label="Desired outcome"
                    name="outcome"
                    rows={3}
                    value={form.outcome}
                    error={errors.outcome}
                    placeholder="A simple way for students to see the bus's last reported stop and estimated arrival."
                    onChange={handleChange}
                />

                <TextArea
                    label="Constraints or requirements"
                    optional
                    name="constraints"
                    rows={3}
                    value={form.constraints}
                    placeholder="Mobile-friendly, low data use, accessible to first-time users…"
                    onChange={handleChange}
                />
            </FormSection>

            <FormSection
                number="03"
                title="Opportunity details"
                description="Let developers know whether there is a budget attached."
            >
                <label className="check-field">
                    <input type="checkbox" name="is_paid" checked={form.is_paid} onChange={handleChange}/>
                    <span>This is a paid opportunity</span>
                </label>

                {form.is_paid && (
                    <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}}>
                        <TextField
                            label="Indicative budget range"
                            optional
                            name="budget_range"
                            value={form.budget_range}
                            hint="Leave this empty to show 'To be discussed'."
                            placeholder="e.g. ₹5,000–₹15,000"
                            onChange={handleChange}
                        />
                    </motion.div>
                )}
            </FormSection>

            <Reveal><AiConsentNotice/></Reveal>

            <div className="form-actions">
                <Button variant="ghost" onClick={onCancel}>Cancel</Button>

                <Button type="submit" loading={busy}>
                    {aiConsent ? "Check for similar problems" : "Check with keywords only"}
                    <ArrowRight size={16} aria-hidden="true"/>
                </Button>
            </div>
        </form>
    );
}

export default ProblemForm;
