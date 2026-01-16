function onFormSubmit(e) {
  const form = e.source;                 // Form object
  const response = e.response;           // FormResponse object
  const responseId = response.getId();   // needed for deleteResponse()

  if (!responseId) return;

  // Collect all answers into a flat string list (handles arrays for checkboxes, etc.)
  const answers = response.getItemResponses().flatMap(ir => {
    const r = ir.getResponse();
    if (Array.isArray(r)) return r.map(String);
    if (r === null || r === undefined) return [];
    return [String(r)];
  });

  // Make the canary match strict to avoid deleting real submissions accidentally.
  const hasFormCheckerName = answers.some(a => a.startsWith("Form Checker "));
  const hasAutomatedDailyCheck = answers.some(a => a.startsWith("Automated daily check "));
  const hasDatedPlusEmail = answers.some(a => /\+\d{8}@/.test(a)); // your local+YYYYMMDD@domain

  const isCanary = (hasFormCheckerName && hasAutomatedDailyCheck) || (hasAutomatedDailyCheck && hasDatedPlusEmail);

  if (isCanary) {
    form.deleteResponse(responseId);
  }
}