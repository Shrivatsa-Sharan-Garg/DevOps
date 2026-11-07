export const EMPTY_PROBLEM={
    title:"",
    description:"",
    category:"Education",
    tags:"",
    outcome:"",
    constraints:"",
    is_paid:false,
    budget_range:""
};

export function validateProblem(form){
    const errors={};

    if(form.title.trim().length < 12){
        errors.title="Use at least 12 characters so people can understand the request.";
    }

    if(form.description.trim().length < 40){
        errors.description="Add a little more context (at least 40 characters).";
    }

    if(form.outcome.trim().length < 12){
        errors.outcome="Describe what a useful outcome would look like.";
    }

    return errors;
}
