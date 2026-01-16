function deleteCanaryRowOnSubmit(e) {
  const nv = e.namedValues || {};
  const allValues = Object.values(nv).flat().map(String);

  const isCanary = allValues.some(v => v.includes("CANARY Form Checker"));
  if (!isCanary) return;

  // Delete the exact row that was just written
  e.range.getSheet().deleteRow(e.range.getRow());
}