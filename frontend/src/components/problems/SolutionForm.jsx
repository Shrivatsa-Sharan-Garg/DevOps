import {useState} from "react";
import {api} from "../../api";
import {useToast} from "../../context/ToastContext";
import Button from "../ui/Button";
import {TextArea, TextField} from "../ui/Field";
import {splitList} from "../../utils/format";

const EMPTY_FORM={title:"",description:"",repo_url:"",tech_stack:""};

function validate(form){
    const errors={};

    if(form.title.trim().length < 5){
        errors.title="Use at least 5 characters.";
    }

    if(form.description.trim().length < 20){
        errors.description="Use at least 20 characters.";
    }

    if(form.repo_url && !/^https?:\/\//.test(form.repo_url.trim())){
        errors.repo_url="Repository link should start with http:// or https://";
    }

    return errors;
}

function SolutionForm({problemId, onAdded}){
    const toast=useToast();
    const [form, setForm]=useState(EMPTY_FORM);
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
            const solution=await api.addSolution(problemId, {
                title:form.title.trim(),
                description:form.description.trim(),
                repo_url:form.repo_url.trim(),
                tech_stack:splitList(form.tech_stack)
            });

            onAdded(solution);
            setForm(EMPTY_FORM);
            toast.success("Your solution has been published.");
        }catch(error){
            setErrors(error.details || {});
            toast.error(error.message);
        }finally{
            setSaving(false);
        }
    }

    return (
        <form className="solution-form" onSubmit={handleSubmit} noValidate>
            <h3>Publish your solution</h3>
            <TextField
                label="Solution title"
                name="title"
                value={form.title}
                error={errors.title}
                placeholder="e.g. TeamUp web app"
                onChange={handleChange}
            />
            <TextArea
                label="How does it solve the problem?"
                name="description"
                value={form.description}
                error={errors.description}
                onChange={handleChange}
            />

            <div className="form-row">
                <TextField
                    label="Repository link"
                    optional
                    name="repo_url"
                    value={form.repo_url}
                    error={errors.repo_url}
                    placeholder="https://github.com/…"
                    onChange={handleChange}
                />
                <TextField
                    label="Tech stack"
                    optional
                    name="tech_stack"
                    value={form.tech_stack}
                    placeholder="React, Node.js"
                    onChange={handleChange}
                />
            </div>

            <Button type="submit" loading={saving}>Publish solution</Button>
        </form>
    );
}

export default SolutionForm;
