function deleteCanaryOnSubmit(e) {
  const form = e.source;          // Form
  const response = e.response;    // FormResponse (forms on-submit event)
  const responseId = response.getId();
  if (!responseId) return;

  // Gather all answers into strings
  const answers = response.getItemResponses().flatMap(ir => {
    const r = ir.getResponse();
    if (Array.isArray(r)) return r.map(String);
    if (r === null || r === undefined) return [];
    return [String(r)];
  });

  const isCanary = answers.some(a => a.includes("CANARY Form Checker"));
  if (isCanary) {
    form.deleteResponse(responseId);
  }
}