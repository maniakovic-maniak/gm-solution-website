const ALLOWED_EXTENSIONS = ['.xlsx', '.xlsm', '.xlsb', '.xls'];
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

function isValidName(v: string): boolean {
  return /^[A-Za-z\s'-]+$/.test(v.trim()) && v.trim().length > 0;
}
function isNotEmpty(v: string): boolean {
  return v.trim().length > 0;
}
function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}
function isDigitsOnly(v: string): boolean {
  return /^\d+$/.test(v.trim());
}
function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface SubmissionFormPage {
  element: HTMLElement;
  hasInput: () => boolean;
  reset: () => void;
}

export function buildSubmissionFormPage(): SubmissionFormPage {
  const page = document.createElement('div');
  page.className = 'subform';

  page.innerHTML = `
    <div class="demo-modal__header">
      <p class="subform-intro">Upload your financial model. Get back a structured, professional-grade audit — formula logic checked, not just numbers glanced at — for a fraction of what a manual review costs.</p>
    </div>

    <div class="subform-section">
      <div class="subform-section-title">1. Upload an Excel file</div>

      <div class="subform-dropzone" tabindex="0">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></svg>
        <span class="subform-dropzone__main">Drag and drop your file here</span>
        <span class="subform-dropzone__sub">or</span>
        <button class="subform-browse" type="button">Browse files</button>
        <span class="subform-dropzone__hint">.xlsx · .xlsm · .xlsb · .xls · max 20 MB</span>
      </div>

      <button class="subform-mobile-upload" type="button">Upload your Excel file</button>

      <input type="file" class="subform-file-input" accept=".xlsx,.xlsm,.xlsb,.xls" hidden />

      <div class="subform-file-pill-row" style="display:none">
        <div class="subform-file-pill">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
          <span class="subform-file-pill__name"></span>
          <span class="subform-file-pill__size"></span>
          <button class="subform-file-pill__remove" type="button" aria-label="Remove file">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="5" x2="19" y2="19"></line><line x1="19" y1="5" x2="5" y2="19"></line></svg>
          </button>
        </div>
        <span class="subform-file-pill__tick">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
        </span>
      </div>
    </div>

    <div class="subform-section">
      <div class="subform-section-title">2. Add your details</div>
      <div class="subform-field-row">
        <div class="subform-field">
          <label for="sub-name">Full Name*</label>
          <input id="sub-name" type="text" placeholder="Enter your name" />
          <div class="subform-field-error" hidden>Letters only, please.</div>
        </div>
        <div class="subform-field">
          <label for="sub-company">Company*</label>
          <input id="sub-company" type="text" placeholder="Company name" />
          <div class="subform-field-error" hidden>Company name is required.</div>
        </div>
        <div class="subform-field">
          <label for="sub-email">Email*</label>
          <input id="sub-email" type="email" placeholder="Your email" />
          <div class="subform-field-error" hidden>Please enter a valid email address.</div>
        </div>
      </div>
    </div>

    <div class="subform-section">
      <div class="subform-section-title-row">
        <div class="subform-section-title">3. Payment Information</div>
        <div class="subform-card-badges">
          <svg width="30" height="19" viewBox="0 0 34 22"><rect width="34" height="22" rx="3" fill="#1434CB"/><text x="17" y="14" font-family="Arial, sans-serif" font-size="8" font-weight="700" font-style="italic" fill="white" text-anchor="middle">VISA</text></svg>
          <svg width="30" height="19" viewBox="0 0 34 22"><rect width="34" height="22" rx="3" fill="#16171a"/><circle cx="14" cy="11" r="6.5" fill="#EB001B"/><circle cx="20" cy="11" r="6.5" fill="#F79E1B"/><path d="M17 5.8a6.5 6.5 0 010 10.4 6.5 6.5 0 010-10.4z" fill="#FF5F00"/></svg>
          <svg width="30" height="19" viewBox="0 0 34 22"><rect width="34" height="22" rx="3" fill="#2E77BC"/><text x="17" y="13.5" font-family="Arial, sans-serif" font-size="6.5" font-weight="700" fill="white" text-anchor="middle">AMEX</text></svg>
        </div>
      </div>

      <div class="subform-field-row subform-card-row">
        <div class="subform-field">
          <label for="sub-card-name">Name on Card</label>
          <input id="sub-card-name" type="text" placeholder="Enter your name" />
        </div>
        <div class="subform-field">
          <label for="sub-card-number">Card Number</label>
          <input id="sub-card-number" type="text" placeholder="Enter card number" inputmode="numeric" />
        </div>
      </div>
      <div class="subform-field-row">
        <div class="subform-field subform-field--expiry">
          <label>Expiry</label>
          <div class="subform-expiry-row">
            <input id="sub-expiry-mm" type="text" placeholder="mm" inputmode="numeric" maxlength="2" />
            <span class="subform-expiry-slash">/</span>
            <input id="sub-expiry-yy" type="text" placeholder="yy" inputmode="numeric" maxlength="2" />
          </div>
        </div>
        <div class="subform-field subform-field--cvv">
          <label for="sub-cvv">CVV</label>
          <input id="sub-cvv" type="text" placeholder="3 digits" inputmode="numeric" maxlength="4" />
        </div>
      </div>

      <div class="subform-summary" style="display:none">
        <div class="subform-summary-title">Summary</div>
        <div class="subform-summary-row subform-uf-expand">
          <span>Unique formulas</span>
          <span class="subform-val">
            <span class="subform-uf-count">524</span>
            <svg class="subform-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
          </span>
        </div>
        <div class="subform-uf-breakdown">
          <div class="subform-summary-row"><span>Low</span><span class="subform-val">466</span></div>
          <div class="subform-summary-row"><span>Moderate</span><span class="subform-val">52</span></div>
          <div class="subform-summary-row"><span>High</span><span class="subform-val">4</span></div>
          <div class="subform-summary-row"><span>Critical</span><span class="subform-val">2</span></div>
        </div>
        <div class="subform-summary-row"><span>Subtotal</span><span class="subform-val">AU$1,220.50</span></div>
        <div class="subform-summary-row"><span>GST</span><span class="subform-val">AU$122.00</span></div>
        <div class="subform-summary-row subform-summary-row--total"><span>Total</span><span class="subform-val">AU$1,342.50</span></div>
      </div>

      <div class="subform-tcs-row">
        <input type="checkbox" id="sub-tcs" />
        <label for="sub-tcs">I agree on <a class="subform-tcs-link">Terms &amp; Conditions</a></label>
      </div>
    </div>

    <div class="subform-footer">
      <button class="subform-submit" type="button" disabled>
        <span class="subform-submit-roll">
          <span class="subform-submit-label">PAY NOW &amp; SUBMIT</span>
          <span class="subform-submit-label">PAY NOW &amp; SUBMIT</span>
        </span>
      </button>
    </div>

    <p class="subform-success" style="display:none">Thanks — your model is on its way. We'll email your Order ID and next steps shortly.</p>
  `;

  const dropzone = page.querySelector('.subform-dropzone') as HTMLElement;
  const browseBtn = page.querySelector('.subform-browse') as HTMLButtonElement;
  const mobileUploadBtn = page.querySelector('.subform-mobile-upload') as HTMLButtonElement;
  const fileInput = page.querySelector('.subform-file-input') as HTMLInputElement;
  const filePill = page.querySelector('.subform-file-pill-row') as HTMLElement;
  const filePillName = page.querySelector('.subform-file-pill__name') as HTMLElement;
  const filePillSize = page.querySelector('.subform-file-pill__size') as HTMLElement;
  const filePillRemove = page.querySelector('.subform-file-pill__remove') as HTMLButtonElement;
  const summary = page.querySelector('.subform-summary') as HTMLElement;
  const ufExpand = page.querySelector('.subform-uf-expand') as HTMLElement;
  const ufBreakdown = page.querySelector('.subform-uf-breakdown') as HTMLElement;

  const nameInput = page.querySelector('#sub-name') as HTMLInputElement;
  const companyInput = page.querySelector('#sub-company') as HTMLInputElement;
  const emailInput = page.querySelector('#sub-email') as HTMLInputElement;
  const cardNameInput = page.querySelector('#sub-card-name') as HTMLInputElement;
  const cardNumberInput = page.querySelector('#sub-card-number') as HTMLInputElement;
  const expiryMm = page.querySelector('#sub-expiry-mm') as HTMLInputElement;
  const expiryYy = page.querySelector('#sub-expiry-yy') as HTMLInputElement;
  const cvvInput = page.querySelector('#sub-cvv') as HTMLInputElement;
  const tcsCheckbox = page.querySelector('#sub-tcs') as HTMLInputElement;
  const tcsLink = page.querySelector('.subform-tcs-link') as HTMLElement;
  const submitBtn = page.querySelector('.subform-submit') as HTMLButtonElement;
  const successMsg = page.querySelector('.subform-success') as HTMLElement;

  let fileVerified = false;

  const loadingPopup = document.createElement('div');
  loadingPopup.className = 'popup-overlay';
  loadingPopup.innerHTML = `
    <div class="popup-card">
      <img class="popup-cauldron-img" src="/cauldron-loader.svg" width="100" height="100" alt="" />
      <div class="popup-loading-text">Cooking…</div>
    </div>
  `;
  document.body.appendChild(loadingPopup);

  const errorPopup = document.createElement('div');
  errorPopup.className = 'popup-overlay';
  errorPopup.innerHTML = `
    <div class="popup-card">
      <button class="popup-close" type="button" aria-label="Close">&times;</button>
      <div class="popup-error-icon">!</div>
      <div class="popup-error-text"></div>
    </div>
  `;
  document.body.appendChild(errorPopup);

  const tcsPopup = document.createElement('div');
  tcsPopup.className = 'popup-overlay';
  tcsPopup.innerHTML = `
    <div class="tcs-popup-card">
      <button class="popup-close" type="button" aria-label="Close">&times;</button>
      <div class="tcs-popup-header">Terms &amp; Conditions</div>
      <div class="tcs-popup-body">
        <p><strong>Placeholder — full Terms &amp; Conditions copy to be supplied.</strong></p>
        <p>Your model and personal information are used only to run the audit pipeline and are deleted no later than two weeks after submission.</p>
        <p>1. Acceptance of terms. By uploading a file and submitting payment, you agree to these placeholder terms, which stand in for the final Terms and Conditions to be supplied ahead of launch.</p>
        <p>2. Scope of service. GM-Solutions runs an automated three-tier review over the uploaded workbook — deterministic structural checks, checklist-driven rules, and a semantic review against a domain-specific rubric — and returns a structured audit report.</p>
        <p>3. Data handling. Uploaded files and the personal details submitted alongside them are used solely to run the requested audit and generate the report. They are not shared with third parties beyond what is required to operate the service.</p>
        <p>4. Data retention. Your file and personal information are deleted no later than two weeks after submission, in line with the retention policy referenced above.</p>
        <p>5. Payment. Pricing is estimated from the number of unique formulas detected in the uploaded workbook at the time of upload. Charges are processed through our payment provider once you confirm and submit.</p>
        <p>6. Report delivery. Once the pipeline run completes, a report and Order ID are emailed to the address provided. Delivery timing can vary depending on the size and complexity of the model.</p>
        <p>7. Accuracy disclaimer. The audit is intended to surface structural and logical issues in a model and does not constitute financial, legal, or investment advice.</p>
        <p>8. Liability. GM-Solutions is not liable for decisions made on the basis of the audit report, and the service is provided on an as-is basis during this stage of the product.</p>
        <p>9. Changes to these terms. These placeholder terms may be revised before the final version is published; continued use of the service after publication constitutes acceptance of the updated terms.</p>
        <p>10. Contact. Questions about these terms or a specific submission can be directed to the GM-Solutions team through the contact details provided on the site.</p>
      </div>
    </div>
  `;
  document.body.appendChild(tcsPopup);

  function showPopup(el: HTMLElement) {
    [loadingPopup, errorPopup, tcsPopup].forEach((p) => p.classList.remove('show'));
    el.classList.add('show');
  }
  function hidePopups() {
    [loadingPopup, errorPopup, tcsPopup].forEach((p) => p.classList.remove('show'));
  }
  function showError(message: string) {
    (errorPopup.querySelector('.popup-error-text') as HTMLElement).textContent = message;
    showPopup(errorPopup);
  }

  [errorPopup, tcsPopup].forEach((popup) => {
    popup.querySelector('.popup-close')?.addEventListener('click', hidePopups);
    popup.addEventListener('click', (e) => {
      if (e.target === popup) hidePopups();
    });
  });

  tcsLink.addEventListener('click', (e) => {
    e.preventDefault();
    showPopup(tcsPopup);
  });

  function validateField(input: HTMLInputElement, validator: (v: string) => boolean) {
    const errorEl = input.parentElement?.querySelector('.subform-field-error') as HTMLElement | null;
    const valid = validator(input.value);
    input.classList.toggle('invalid', input.value.length > 0 && !valid);
    if (errorEl) errorEl.hidden = valid || input.value.length === 0;
    return valid;
  }

  function checkReady() {
    const ready =
      fileVerified &&
      isValidName(nameInput.value) &&
      isNotEmpty(companyInput.value) &&
      isValidEmail(emailInput.value) &&
      isValidName(cardNameInput.value) &&
      isDigitsOnly(cardNumberInput.value.replace(/\s/g, '')) &&
      isDigitsOnly(expiryMm.value) &&
      isDigitsOnly(expiryYy.value) &&
      isDigitsOnly(cvvInput.value) &&
      tcsCheckbox.checked;
    submitBtn.disabled = !ready;
    submitBtn.classList.toggle('is-ready', ready);
  }

  nameInput.addEventListener('blur', () => { validateField(nameInput, isValidName); checkReady(); });
  companyInput.addEventListener('blur', () => { validateField(companyInput, isNotEmpty); checkReady(); });
  emailInput.addEventListener('blur', () => { validateField(emailInput, isValidEmail); checkReady(); });
  [nameInput, companyInput, emailInput, cardNameInput, cardNumberInput, expiryMm, expiryYy, cvvInput].forEach((input) => {
    input.addEventListener('input', checkReady);
  });
  tcsCheckbox.addEventListener('change', checkReady);

  cardNumberInput.addEventListener('input', () => {
    const digits = cardNumberInput.value.replace(/\D/g, '').slice(0, 19);
    cardNumberInput.value = digits.replace(/(.{4})/g, '$1 ').trim();
  });
  [expiryMm, expiryYy, cvvInput].forEach((input) => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '');
    });
  });

  function handleFile(file: File) {
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      showError("This file type isn't supported. Please upload an .xlsx, .xlsm, .xlsb, or .xls file.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      showError('This file is larger than the 20 MB limit. Please upload a smaller file.');
      return;
    }

    showPopup(loadingPopup);

    // Simulated Instance 1 check + F-score estimation -- placeholder until
    // the real pipeline is wired in. Timing and the numbers shown below
    // stand in for that real processing step.
    setTimeout(() => {
      hidePopups();
      filePillName.textContent = file.name;
      filePillSize.textContent = formatFileSize(file.size);
      filePill.style.display = 'flex';
      dropzone.style.display = 'none';
      mobileUploadBtn.style.display = 'none';
      summary.style.display = 'block';
      fileVerified = true;
      checkReady();
    }, 1400);
  }

  function resetFile() {
    fileVerified = false;
    filePill.style.display = 'none';
    dropzone.style.display = '';
    mobileUploadBtn.style.display = '';
    summary.style.display = 'none';
    fileInput.value = '';
    checkReady();
  }

  dropzone.addEventListener('click', () => fileInput.click());
  browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });
  mobileUploadBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
  });
  filePillRemove.addEventListener('click', resetFile);

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('is-dragover');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('is-dragover');
    const file = e.dataTransfer?.files[0];
    if (file) handleFile(file);
  });

  ufExpand.addEventListener('click', () => {
    ufExpand.classList.toggle('is-open');
    ufBreakdown.classList.toggle('is-open');
  });

  submitBtn.addEventListener('click', () => {
    if (submitBtn.disabled) return;
    showPopup(loadingPopup);
    // Placeholder: real submission wires to the eWay payment gateway and
    // the fm-validator pipeline once those integrations are supplied.
    setTimeout(() => {
      hidePopups();
      page.querySelectorAll('.subform-section, .subform-footer, .demo-modal__header').forEach((el) => {
        (el as HTMLElement).style.display = 'none';
      });
      successMsg.style.display = 'block';
    }, 1400);
  });

  function hasInput(): boolean {
    if (successMsg.style.display === 'block') return false; // already submitted -- nothing left to lose
    return (
      fileVerified ||
      nameInput.value.trim().length > 0 ||
      companyInput.value.trim().length > 0 ||
      emailInput.value.trim().length > 0 ||
      cardNameInput.value.trim().length > 0 ||
      cardNumberInput.value.trim().length > 0 ||
      expiryMm.value.trim().length > 0 ||
      expiryYy.value.trim().length > 0 ||
      cvvInput.value.trim().length > 0
    );
  }

  function reset() {
    resetFile();
    nameInput.value = '';
    companyInput.value = '';
    emailInput.value = '';
    cardNameInput.value = '';
    cardNumberInput.value = '';
    expiryMm.value = '';
    expiryYy.value = '';
    cvvInput.value = '';
    tcsCheckbox.checked = false;
    [nameInput, companyInput, emailInput].forEach((input) => {
      input.classList.remove('invalid');
      const errorEl = input.parentElement?.querySelector('.subform-field-error') as HTMLElement | null;
      if (errorEl) errorEl.hidden = true;
    });
    page.querySelectorAll('.subform-section, .subform-footer, .demo-modal__header').forEach((el) => {
      (el as HTMLElement).style.display = '';
    });
    successMsg.style.display = 'none';
    checkReady();
  }

  return { element: page, hasInput, reset };
}
