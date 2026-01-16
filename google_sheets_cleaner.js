function onFormSubmit(e) {
  const nv = e.namedValues || {}; // question titles → array of answers
  const allValues = Object.values(nv).flat().map(String);

  const hasFormCheckerName = allValues.some(v => v.startsWith("Form Checker "));
  const hasAutomatedDailyCheck = allValues.some(v => v.startsWith("Automated daily check "));
  const hasDatedPlusEmail = allValues.some(v => /\+\d{8}@/.test(v));

  const isCanary = (hasFormCheckerName && hasAutomatedDailyCheck) || (hasAutomatedDailyCheck && hasDatedPlusEmail);
  if (!isCanary) return;

  // The submitted row range is provided by the event object.
  const sheet = e.range.getSheet();
  const row = e.range.getRow();
  sheet.deleteRow(row);
}