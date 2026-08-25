(function generateFormWrapperFromGoogleForm() {
  const TYPE = {
    SHORT_TEXT: 0,
    PARAGRAPH_TEXT: 1,
    MULTIPLE_CHOICE: 2,
    DROPDOWN: 3,
    CHECKBOXES: 4,
    DATE: 9,
  };

  const STYLE = `<link href="https://fonts.googleapis.com/css2?family=Montserrat&display=swap" rel="stylesheet">
<style>
    #form {
        font-family: 'Montserrat', sans-serif !important;
        margin: auto;
    }
    input[type="radio"],
    input[type="checkbox"] {
        accent-color: rgb(19, 79, 92);
    }
    .radio-label,
    .checkbox-label {
        font-size: 14px;
    }
    .form-element {
        margin-bottom: 15px;
    }
    label {
        display: block;
        margin-bottom: 5px;
    }
    input[type="text"],
    input[type="email"],
    input[type="tel"],
    input[type="date"],
    select,
    textarea,
    button {
        padding: 8px;
        width: 100%;
        box-sizing: border-box;
        font-family: inherit;
    }
    textarea {
        resize: vertical;
    }
    button {
        padding: 10px 20px;
        background-color: rgb(19, 79, 92);
        color: white;
        border: none;
        cursor: pointer;
        transition: background-color 0.3s linear;
    }
    button:hover {
        background-color: rgb(10, 50, 59);
    }
    #response-message {
        margin-top: 20px;
        color: green;
        font-weight: bold;
    }
</style>`;

  const fields = getFields();
  const actionUrl = getActionUrl();

  if (!fields.length) {
    throw new Error("No supported Google Form fields found on this page.");
  }

  const html = [
    STYLE,
    "",
    `<form id="form" action="${escapeAttribute(actionUrl)}" method="POST" target="_self">`,
    "",
    ...fields.map(renderField),
    "  <div class=\"form-element\">",
    "    <button type=\"submit\">Submit</button>",
    "  </div>",
    "",
    "</form>",
  ].join("\n");

  copyToClipboard(html)
    .then(function() {
      console.log("Copied generated form_wrapper.html to clipboard.");
      console.log(html);
    })
    .catch(function(error) {
      console.warn("Generated HTML, but clipboard copy failed:", error);
      console.log(html);
      window.generatedFormWrapperHtml = html;
      console.info("The HTML is also available at window.generatedFormWrapperHtml.");
    });

  return html;

  function getFields() {
    const fieldsFromData = getFieldsFromPublicLoadData();
    if (fieldsFromData.length) {
      return fieldsFromData;
    }

    return getFieldsFromDom();
  }

  function getFieldsFromPublicLoadData() {
    const loadData = window.FB_PUBLIC_LOAD_DATA_;
    const fieldsByName = new Map();

    walk(loadData, function(node) {
      if (!Array.isArray(node)) {
        return;
      }

      const label = node[1];
      const type = node[3];
      const entries = node[4];

      if (typeof label !== "string" || typeof type !== "number" || !Array.isArray(entries)) {
        return;
      }

      entries.forEach(function(entry) {
        if (!Array.isArray(entry) || !/^\d+$/.test(String(entry[0]))) {
          return;
        }

        const name = "entry." + entry[0];
        if (fieldsByName.has(name)) {
          return;
        }

        const choices = extractChoices(entry[1]);
        const field = {
          label: cleanText(label),
          name: name,
          id: uniqueId(cleanText(label), fieldsByName.size),
          type: inputTypeForQuestion(type, label, choices),
          required: Boolean(entry[2]),
          choices: choices,
        };

        if (isSupportedField(field)) {
          fieldsByName.set(name, field);
        }
      });
    });

    return Array.from(fieldsByName.values());
  }

  function getFieldsFromDom() {
    const fields = [];
    const seenNames = new Set();
    const questionElements = Array.from(document.querySelectorAll("div[role='listitem']"));

    questionElements.forEach(function(questionElement, index) {
      const namedControl = questionElement.querySelector("input[name^='entry.'], textarea[name^='entry.'], select[name^='entry.']");
      if (!namedControl || seenNames.has(namedControl.name)) {
        return;
      }

      const label = findQuestionLabel(questionElement) || namedControl.getAttribute("aria-label") || "Question " + (index + 1);
      const choices = extractDomChoices(questionElement);
      const field = {
        label: cleanText(label),
        name: namedControl.name,
        id: uniqueId(cleanText(label), fields.length),
        type: inputTypeForDomQuestion(questionElement, namedControl, label, choices),
        required: isDomRequired(questionElement, namedControl),
        choices: choices,
      };

      if (isSupportedField(field)) {
        seenNames.add(field.name);
        fields.push(field);
      }
    });

    return fields;
  }

  function getActionUrl() {
    const formElement = document.querySelector("form[action*='/formResponse']");
    if (formElement && formElement.action) {
      return formElement.action;
    }

    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/viewform\/?$/, "/formResponse");
  }

  function renderField(field) {
    if (field.type === "radio" || field.type === "checkbox") {
      return renderChoiceField(field);
    }

    if (field.type === "textarea") {
      return [
        "  <div class=\"form-element\">",
        `    <label for="${escapeAttribute(field.id)}">${escapeHtml(field.label)}</label>`,
        `    <textarea name="${escapeAttribute(field.name)}" id="${escapeAttribute(field.id)}" rows="4"${requiredAttribute(field)}></textarea>`,
        "  </div>",
        "",
      ].join("\n");
    }

    if (field.type === "select") {
      return [
        "  <div class=\"form-element\">",
        `    <label for="${escapeAttribute(field.id)}">${escapeHtml(field.label)}</label>`,
        `    <select name="${escapeAttribute(field.name)}" id="${escapeAttribute(field.id)}"${requiredAttribute(field)}>`,
        "      <option value=\"\"></option>",
        ...field.choices.map(function(choice) {
          return `      <option value="${escapeAttribute(choice)}">${escapeHtml(choice)}</option>`;
        }),
        "    </select>",
        "  </div>",
        "",
      ].join("\n");
    }

    return [
      "  <div class=\"form-element\">",
      `    <label for="${escapeAttribute(field.id)}">${escapeHtml(field.label)}</label>`,
      `    <input type="${escapeAttribute(field.type)}" name="${escapeAttribute(field.name)}" id="${escapeAttribute(field.id)}"${requiredAttribute(field)}>`,
      "  </div>",
      "",
    ].join("\n");
  }

  function renderChoiceField(field) {
    const className = field.type === "checkbox" ? "checkbox-label" : "radio-label";
    return [
      "  <div class=\"form-element\">",
      `    <label>${escapeHtml(field.label)}</label>`,
      ...field.choices.map(function(choice, index) {
        const required = field.type === "radio" && field.required && index === 0 ? " required" : "";
        return `    <label class="${className}"><input type="${field.type}" name="${escapeAttribute(field.name)}" value="${escapeAttribute(choice)}"${required}> ${escapeHtml(choice)}</label>`;
      }),
      "  </div>",
      "",
    ].join("\n");
  }

  function inputTypeForQuestion(type, label, choices) {
    if (type === TYPE.PARAGRAPH_TEXT) {
      return "textarea";
    }
    if (type === TYPE.MULTIPLE_CHOICE) {
      return "radio";
    }
    if (type === TYPE.DROPDOWN) {
      return "select";
    }
    if (type === TYPE.CHECKBOXES) {
      return "checkbox";
    }
    if (type === TYPE.DATE) {
      return "date";
    }
    if (choices.length) {
      return "radio";
    }
    return inputTypeForLabel(label);
  }

  function inputTypeForDomQuestion(questionElement, control, label, choices) {
    if (control.tagName === "TEXTAREA") {
      return "textarea";
    }
    if (control.tagName === "SELECT") {
      return "select";
    }
    if (questionElement.querySelector("[role='checkbox']")) {
      return "checkbox";
    }
    if (questionElement.querySelector("[role='radio']") || choices.length) {
      return "radio";
    }
    if (control.type === "date") {
      return "date";
    }
    return inputTypeForLabel(label);
  }

  function inputTypeForLabel(label) {
    const normalizedLabel = String(label || "").toLowerCase();
    if (normalizedLabel.includes("email")) {
      return "email";
    }
    if (normalizedLabel.includes("phone")) {
      return "tel";
    }
    if (normalizedLabel.includes("date of birth") || normalizedLabel === "dob" || normalizedLabel.includes("birth date")) {
      return "date";
    }
    return "text";
  }

  function extractChoices(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map(function(choice) {
        return Array.isArray(choice) ? choice[0] : choice;
      })
      .filter(function(choice) {
        return typeof choice === "string" && choice.trim() && choice !== "__other_option__";
      })
      .map(cleanText);
  }

  function extractDomChoices(questionElement) {
    return Array.from(questionElement.querySelectorAll("[role='radio'], [role='checkbox'], [role='option']"))
      .map(function(option) {
        return option.getAttribute("data-value") || option.getAttribute("aria-label") || option.textContent;
      })
      .map(cleanText)
      .filter(function(choice) {
        return choice && choice !== "__other_option__" && !/^other:?$/i.test(choice);
      });
  }

  function findQuestionLabel(questionElement) {
    const heading = questionElement.querySelector("[role='heading']");
    if (heading && cleanText(heading.textContent)) {
      return heading.textContent;
    }

    const labelledElement = questionElement.querySelector("[aria-labelledby]");
    if (labelledElement) {
      const ids = labelledElement.getAttribute("aria-labelledby").split(/\s+/);
      const text = ids
        .map(function(id) {
          const element = document.getElementById(id);
          return element ? element.textContent : "";
        })
        .join(" ");
      if (cleanText(text)) {
        return text;
      }
    }

    return "";
  }

  function isDomRequired(questionElement, control) {
    if (control.required || control.getAttribute("aria-required") === "true") {
      return true;
    }

    return Boolean(questionElement.querySelector("[aria-label*='Required'], [data-required='true']"));
  }

  function isSupportedField(field) {
    return field.label && field.name && (
      field.type === "text" ||
      field.type === "email" ||
      field.type === "tel" ||
      field.type === "date" ||
      field.type === "textarea" ||
      field.type === "radio" && field.choices.length ||
      field.type === "select" && field.choices.length ||
      field.type === "checkbox" && field.choices.length
    );
  }

  function walk(node, visitor) {
    visitor(node);
    if (!Array.isArray(node)) {
      return;
    }
    node.forEach(function(child) {
      walk(child, visitor);
    });
  }

  function uniqueId(label, index) {
    const slug = String(label || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return slug || "field-" + (index + 1);
  }

  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function requiredAttribute(field) {
    return field.required ? " required" : "";
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/"/g, "&quot;");
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function() {
        return legacyCopyToClipboard(text);
      });
    }

    return legacyCopyToClipboard(text);
  }

  function legacyCopyToClipboard(text) {
    return new Promise(function(resolve, reject) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "-9999px";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();

      try {
        const copied = document.execCommand("copy");
        document.body.removeChild(textarea);
        copied ? resolve() : reject(new Error("document.execCommand('copy') returned false."));
      } catch (error) {
        document.body.removeChild(textarea);
        reject(error);
      }
    });
  }
})();

