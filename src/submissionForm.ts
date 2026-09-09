const ALLOWED_EXTENSIONS = ['.xlsx', '.xlsm', '.xlsb', '.xls'];
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
// Per the confirmed architecture assumption in the Phase B spec - this
// form calls the fm-validator VPS directly, not a separate website
// backend. Requires the website's real domain to be added to
// fm-validator's ALLOWED_ORIGIN before this will work cross-origin.
const API_BASE = 'https://plsfx.ai/fm-validator';

function formatDollars(dollars: number): string {
  return `AU$${dollars.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function isValidName(v: string): boolean {
  return /^[\p{L}\s'-]+$/u.test(v.trim()) && v.trim().length > 0;
}

/**
 * Plain fetch() has no native upload-progress event - XHR is the
 * reliable way to get real, byte-level upload progress in a browser.
 * Wrapped in a promise so the rest of the async/await flow stays clean.
 */
function uploadWithProgress(url: string, formData: FormData, onProgress: (percent: number) => void): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });
    xhr.addEventListener('load', () => {
      try {
        resolve(JSON.parse(xhr.responseText));
      } catch (err) {
        reject(new Error('Could not parse the server response.'));
      }
    });
    xhr.addEventListener('error', () => reject(new Error('Network error during upload.')));
    xhr.send(formData);
  });
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
      <p class="subform-intro">Upload your financial model. Get back a structured, professional-grade review - formula logic checked, not just numbers glanced at - for a fraction of what manual verification costs.</p>
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

      <div class="subform-field-row subform-promo-row">
        <div class="subform-field">
          <label for="sub-promo">Promo code</label>
          <input id="sub-promo" type="text" placeholder="Enter your code" />
        </div>
        <button class="subform-promo-apply" type="button" disabled>Apply</button>
      </div>
      <p class="subform-promo-error" hidden></p>

      <div class="subform-summary" style="display:none">
        <div class="subform-summary-title">Summary</div>
        <div class="subform-summary-row subform-uf-expand">
          <span>Unique formulas</span>
          <span class="subform-val">
            <span class="subform-uf-count">-</span>
            <svg class="subform-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
          </span>
        </div>
        <div class="subform-uf-breakdown">
          <div class="subform-summary-row"><span>Low</span><span class="subform-val subform-band-low">-</span></div>
          <div class="subform-summary-row"><span>Moderate</span><span class="subform-val subform-band-moderate">-</span></div>
          <div class="subform-summary-row"><span>High</span><span class="subform-val subform-band-high">-</span></div>
          <div class="subform-summary-row"><span>Critical</span><span class="subform-val subform-band-critical">-</span></div>
        </div>
        <div class="subform-summary-row"><span>Subtotal</span><span class="subform-val subform-subtotal">-</span></div>
        <div class="subform-summary-row subform-discount-row" hidden><span>Discount</span><span class="subform-val subform-discount">-</span></div>
        <div class="subform-summary-row"><span>GST</span><span class="subform-val subform-gst">-</span></div>
        <div class="subform-summary-row subform-summary-row--total"><span>Total</span><span class="subform-val subform-grand-total">-</span></div>
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

    <p class="subform-success" style="display:none">Thanks - your order <strong class="subform-order-id"></strong> is on its way. We'll email your Order ID and next steps shortly.</p>
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
  const ufCount = page.querySelector('.subform-uf-count') as HTMLElement;
  const bandLow = page.querySelector('.subform-band-low') as HTMLElement;
  const bandModerate = page.querySelector('.subform-band-moderate') as HTMLElement;
  const bandHigh = page.querySelector('.subform-band-high') as HTMLElement;
  const bandCritical = page.querySelector('.subform-band-critical') as HTMLElement;
  const subtotalEl = page.querySelector('.subform-subtotal') as HTMLElement;
  const discountRow = page.querySelector('.subform-discount-row') as HTMLElement;
  const discountEl = page.querySelector('.subform-discount') as HTMLElement;
  const gstEl = page.querySelector('.subform-gst') as HTMLElement;
  const grandTotalEl = page.querySelector('.subform-grand-total') as HTMLElement;
  const promoInput = page.querySelector('#sub-promo') as HTMLInputElement;
  const promoApplyBtn = page.querySelector('.subform-promo-apply') as HTMLButtonElement;
  const promoErrorEl = page.querySelector('.subform-promo-error') as HTMLElement;

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
  const orderIdEl = page.querySelector('.subform-order-id') as HTMLElement;

  let fileVerified = false;
  let storedAs: string | null = null;
  let quotedGrandTotal: number | null = null;
  let lastPriceData: { priceTotal: number; fscoreDist: any; uniqueFormulaTotal: number } | null = null;
  let appliedPromo: { code: string; discountType: string; discountValue: number } | null = null;

  const loadingPopup = document.createElement('div');
  loadingPopup.className = 'popup-overlay';
  loadingPopup.innerHTML = `
    <div class="popup-card">
      <img class="popup-cauldron-img" src="/cauldron-loader.svg" width="100" height="100" alt="" />
      <div class="popup-loading-text"><span class="popup-loading-label">Cooking</span><span class="popup-loading-dots"></span></div>
      <div class="popup-loading-percent"></div>
    </div>
  `;
  document.body.appendChild(loadingPopup);

  const errorPopup = document.createElement('div');
  errorPopup.className = 'popup-overlay';
  errorPopup.innerHTML = `
    <div class="popup-card popup-card--wide">
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
<p>These Terms govern each Order for the Service. Please read them
before you create an account, pay for an Order or upload a model. By
accepting these Terms you agree to be bound by them and by the documents
they incorporate (including the Privacy Policy). Capitalised terms are
defined in clause 23.</p>
<h2>1. Supplier, acceptance and eligibility</h2>
<p><strong>1.1</strong> FM Validator is a PLSFX financial-model review
tool operated by Us. These Terms apply to the Service, including the
website, the upload and payment workflow, the automated financial-model
review, the issued reports and related support.</p>
<p><strong>1.2</strong> By ticking the acceptance box, creating an
account, paying for an Order, uploading Customer Content, accessing an
Output, or otherwise using the Service, you agree to these Terms, the
Privacy Policy, the applicable Order summary and any other document
expressly incorporated into the Order.</p>
<p><strong>1.3</strong> If you use the Service for or on behalf of an
organisation, you represent and warrant that you are authorised to bind
that organisation, and Customer and you then mean that organisation and
its Authorised Users.</p>
<p><strong>1.4</strong> We may record acceptance against the applicable
Terms and Privacy Policy versions, the user or account identifier, a
timestamp, the Order identifier and a source-file reference or hash. No
oral statement, demonstration, support response or course of dealing
varies these Terms or creates a duty of care unless an authorised
representative of each party expressly agrees in Writing.</p>
<p><strong>1.5</strong> The Service is intended only for business and
professional users aged 18 years or older. It is not designed or offered
for personal, domestic or household financial planning, for retail
financial advice, or for use by children.</p>
<p><strong>1.6</strong> You acknowledge that you acquire the Service for
business or professional purposes, and that the Service is not of a kind
ordinarily acquired for personal, domestic or household use or
consumption. This acknowledgement supports the operation of clause
16.4.</p>
<p><strong>1.7</strong> You must not use the Service if you lack the
authority to enter into these Terms, are prohibited by applicable law,
or lack the rights required to submit the Customer Content. Nothing in
these Terms excludes, restricts or modifies any right or remedy that
cannot lawfully be excluded, restricted or modified, including under the
Australian Consumer Law.</p>
<h2>2. Orders, fees, GST and refunds</h2>
<p><strong>2.1</strong> Each paid submission or executed written order
form is an Order. Before payment we will display the applicable price or
pricing method and the material technical limits then disclosed. An
Order is accepted when payment is authorised and we issue an Order
confirmation, unless we notify you that the file cannot be
processed.</p>
<p><strong>2.2</strong> The Order summary identifies, as applicable: the
review objective; the submitted file name, version or hash; the
procedure families and reference frameworks to be applied; material
scope exclusions and technical limits; the intended purpose and
permitted users; the expected form of Output; the price; and any agreed
service level or human-review component. The issued Output records the
procedures actually completed and any departure from the accepted
scope.</p>
<p><strong>2.3</strong> The agreement for an Order comprises, in
descending order of precedence: an executed enterprise order form; the
Order confirmation or online Order summary; these Terms; the Privacy
Policy; and any supported-features or service-description page expressly
incorporated at acceptance. A higher-ranking document prevails only to
the extent of a direct inconsistency.</p>
<p><strong>2.4</strong> A proposal, demonstration or marketing statement
does not expand the Service beyond the procedures and deliverables
identified in the accepted Order and the issued Output. This does not
exclude a specific written representation made by our authorised
representative on which it was reasonable for you to rely, or any
liability for misleading or deceptive conduct, fraud or another
liability that cannot lawfully be excluded.</p>
<p><strong>2.5</strong> The price for an Order may reflect file size,
unique-formula count, formula complexity, the selected review mode and
other disclosed processing factors. The amount payable is shown before
payment. Unless stated otherwise, prices are in Australian dollars.</p>
<p><strong>2.6</strong> Unless expressly stated to be exclusive of GST,
prices displayed to you include any GST payable. If an amount is stated
to be exclusive of GST, you must pay, in addition, the GST payable on
that supply against a valid tax invoice. Where we are registered for
GST, we will provide a tax invoice on request in accordance with
applicable ATO requirements.</p>
<p><strong>2.7</strong> Payments may be processed by a third-party
payment provider identified at checkout or in the Privacy Policy. We do
not store complete card details. You authorise the payment provider to
charge the displayed amount and must provide accurate billing
information.</p>
<p><strong>2.8</strong> If a subscription renews automatically, checkout
and the Order confirmation will state the renewal frequency, the renewal
price or calculation method and how to cancel. We will give at least 30
days' notice before an annual automatic renewal and before a price
increase takes effect. Cancellation must be available through the
account or another reasonably simple notified method and takes effect
before the next renewal if received by the stated cut-off.</p>
<p><strong>2.9</strong> Automated processing may begin immediately after
payment and upload. Subject to non-excludable law and any express refund
policy shown before payment, an Order cannot be cancelled after
processing begins merely because no issues are identified, you disagree
with a finding, or the Output does not produce a preferred conclusion.
This is a customer-initiated online business service; it is not an
unsolicited consumer agreement, and no statutory cooling-off right
applies. This does not affect your rights under the consumer guarantees
(see clause 16).</p>
<p><strong>2.10</strong> If we cannot process a file because of a
Service failure, or an undisclosed technical incompatibility not
reasonably apparent before payment, we may retry, request a replacement
file, resupply the affected Service, provide a credit, or refund the
affected fee. If the failure results from the file, encryption,
corruption, malware, unsupported features or inaccurate information you
supplied, any refund is at our reasonable discretion, subject to
applicable law.</p>
<p><strong>2.11</strong> Where a non-excludable law gives you a remedy
for a major failure, or for a failure we do not remedy within a
reasonable time, nothing in this clause restricts that remedy, including
any right to cancel and obtain a refund for the unconsumed part of the
Service or to recover reasonably foreseeable loss where the law provides
it.</p>
<h2>3. What the Service does and the agreed scope</h2>
<p><strong>3.1</strong> The Service performs automated procedures on the
financial-model version submitted and produces a structured report of
potential findings. Depending on the selected review mode and Supported
Features, procedures may include formula-cell scanning, structural and
dependency analysis, rule-based tests, recalculation, consistency
checks, semantic analysis and domain-specific reasonableness checks.</p>
<p><strong>3.2</strong> The Order and the Output define the engagement
objective, the file reviewed, the procedures completed, the coverage
achieved, the exclusions, the detected technical limitations and the
procedures not performed. Procedures are limited exclusively to that
stated scope. Unless an Output expressly records that a procedure was
completed, you must assume it was not performed.</p>
<p><strong>3.3</strong> The Service records findings and does not modify
the source model. Any remediation, manual review, bespoke testing,
professional sign-off, implementation or verification service requires a
separate written scope.</p>
<p><strong>3.4</strong> Each Order is a separate review of the
identified file version. A recurring subscription does not create a
standing audit, a continuous-monitoring duty, or an obligation to detect
changes between submissions. We may require a refreshed Order summary or
re-acceptance where the model, purpose, procedures, intended users,
reference framework or these Terms materially change.</p>
<h2>4. Automated processing and human oversight</h2>
<p><strong>4.1</strong> The Service uses automated and machine-assisted
processing techniques to review and analyse Customer Content and to
generate the Output. Automated processing is a core part of how the
Service works. The Service is automated: it does not involve a human
expert reviewing each model.</p>
<p><strong>4.2</strong> Some of that processing is, or may be, performed
for us by Subprocessors, including providers of automated and
machine-assisted processing located outside Australia. Our current
Subprocessors, the general nature of their processing and the countries
in which it occurs are identified in our Privacy Policy and kept current
under clause 13.2. Clause 13 governs how Customer Content is handled by
Subprocessors.</p>
<p><strong>4.3</strong> You acknowledge and agree that:</p>
<blockquote>
<p>(a) automated and machine-assisted analysis is probabilistic and
assistive in nature, and the Output may be incomplete, inaccurate, out
of date, or unsuitable for a particular purpose;</p>
<p>(b) the Output is provided to support, and not to replace, your own
review and professional judgement, and must not be relied upon as
accounting, audit, financial, investment, taxation or legal advice;</p>
<p>(c) you are responsible for independently reviewing and verifying the
Output before relying or acting on it; and</p>
<p>(d) the Service returns analysis of a financial model for your
assessment; it does not make any decision about any individual, and in
particular does not make any decision, wholly or substantially by
automated means, that could reasonably be expected to significantly
affect the rights or interests of any individual.</p>
</blockquote>
<p><strong>4.4</strong> We maintain human oversight of the automated
processing used to deliver the Service, including in the selection,
configuration and monitoring of our Subprocessors. Decisions about how
you use the Output, and any decision affecting any person, remain
yours.</p>
<p><strong>4.5</strong> We remain responsible to you for the provision
of the Service in accordance with these Terms, including where part of
the Service is performed by a Subprocessor. That responsibility is
subject to the qualifications in clause 4.3 and to the limitations and
exclusions in clause 17.</p>
<h2>5. Nature and limitations of the Service</h2>
<p><strong>5.1</strong> The Service is an automated diagnostic tool. It
operates on the Customer Content as supplied and does not independently
obtain, audit or confirm any underlying data, source document or
fact.</p>
<p><strong>5.2</strong> The Service is not exhaustive. It may:</p>
<blockquote>
<p>(a) fail to detect errors, defects, inconsistencies or risks in the
Customer Content;</p>
<p>(b) misunderstand the structure, context, purpose or assumptions of
the Customer Content; and</p>
<p>(c) identify, flag or describe as an error, risk or issue a matter
that is not in fact an error, risk or issue (a false positive).</p>
</blockquote>
<p><strong>5.3</strong> The quality, accuracy and usefulness of any
Output depend entirely on the quality, accuracy, completeness, structure
and integrity of the Customer Content, which we do not verify. Without
limiting this, the following may not be identified or may be only
partially assessed: incorrect but internally consistent data,
assumptions or formulas; commercial omissions, inappropriate accounting
treatments, fraud, illegal acts and management bias; and hidden,
protected, encrypted, corrupted, inaccessible or unsupported content,
VBA, macros, add-ins, user-defined functions, external links, data
connections, charts and linked files.</p>
<p><strong>5.4</strong> Severity, materiality, confidence, pass/fail,
completeness and similar labels are automated diagnostic classifications
only; they are not professional materiality judgements or assurance
conclusions. A review applies only to the exact file version processed;
any later edit, refresh, recalculation, linked-data change or
remediation is outside scope until separately reviewed.</p>
<p><strong>5.5</strong> An Output is not a representation, warranty,
opinion, conclusion, assurance, certification or guarantee that the
Customer Content (or the financial model it describes) is accurate,
complete, error-free, reasonable, reliable, compliant or fit for any
purpose. You must not use the Service or any Output as the sole or final
basis for any material decision.</p>
<p><strong>5.6</strong> No audit, review, assurance or certification.
The Service is not, and no Output constitutes, a statutory or
financial-statement audit, review engagement, assurance engagement,
agreed-upon-procedures engagement, examination,
investigating-accountant's report, certification, attestation,
due-diligence opinion or professional sign-off. It is not conducted
under ASAE 3000, ASAE 3450, ASRS 4400, any Australian Auditing Standard
or any professional or ethical standard applicable to assurance
practitioners. We do not perform the acceptance, independence, ethical,
quality-management, professional-scepticism, materiality, evidence,
representation or reporting work required of an assurance practitioner,
and we express no audit opinion, review conclusion, reasonable- or
limited-assurance conclusion, or opinion that a model is free from error
or material misstatement. Nothing in these Terms creates an
auditor–client, assurance-practitioner–client or comparable
relationship.</p>
<p><strong>5.7</strong> References to modelling standards, accounting
concepts, professional guidance or recognised methodologies describe
only the source or design of a diagnostic rule; they do not mean the
Service is conducted under, endorsed by or compliant with any
professional or assurance standard, and a diagnostic label is not
assurance materiality. Unless a separate engagement is signed with an
appropriately qualified and independent assurance practitioner, neither
party may describe the Service or an Output using assurance terminology
such as “reasonable assurance”, “limited assurance”, “opinion”,
“conclusion”, “certified”, “audited”, “validated” or “nothing has come
to our attention”.</p>
<p><strong>5.8</strong> The Service and each Output are provided for
general diagnostic purposes only. They do not constitute, and must not
be relied on as, financial product advice or a financial product
recommendation for the purposes of Chapter 7 of the Corporations Act
2001 (Cth). In providing the Service we do not carry on a financial
services business and do not provide a financial service requiring an
Australian financial services licence.</p>
<p><strong>5.9</strong> The Service and each Output do not constitute
accounting, audit, assurance, tax, legal, valuation, investment,
actuarial, engineering or other regulated or professional advice, and
any finding, rating, priority, score or remediation suggestion concerns
the model-review process only. We do not take into account the
objectives, financial situation or needs of any person. No
professional–client, fiduciary, auditor–client or adviser–client
relationship is created. A disclaimer cannot change the legal character
of conduct; the Service must not be used or represented in a manner that
turns diagnostic information into regulated advice.</p>
<p><strong>5.10</strong> You must not configure, prompt, label, combine
or present the Service so that it evaluates, compares or recommends a
financial product, security, issuer, borrower, investment, funding
alternative or transaction, or describes one as attractive, suitable,
investable, recommended, approved or best. A workflow that may
reasonably be regarded as intended to influence a financial-product
decision must not proceed through the standard Service and requires
separate legal review and, where applicable, a properly licensed
provider.</p>
<p><strong>5.11</strong> This clause 5 is subject to clause 16.</p>
<h2>6. Forecasts, projections and prospective financial
information</h2>
<p><strong>6.1</strong> Financial models commonly contain forecasts,
projections, budgets, scenarios and assumptions about future events,
which are inherently uncertain and depend on variables outside the model
and outside our control. You are solely responsible for selecting,
evidencing, approving and maintaining every material assumption, the
basis of preparation, the methodology and forecast period, the relevant
risks and balanced sensitivities, and for determining whether there are
reasonable grounds for any prospective statement.</p>
<p><strong>6.2</strong> The Service does not, and cannot, verify that
any assumption is reasonable or appropriate, or that any forecast,
projection or modelled outcome is achievable or will be achieved.
Automated consistency, sensitivity or reasonableness checks do not
establish that assumptions will occur or that results are achievable.
Actual results will differ, and the differences may be material. We make
no representation or warranty and give no assurance as to the
reasonableness, accuracy, achievability or reliability of any forecast,
projection, budget, scenario or assumption, and accept no responsibility
for the achievement of any forecast, valuation, return, covenant or
funding outcome.</p>
<p><strong>6.3</strong> An Output prepared for one model, date,
transaction or purpose may be unsuitable for another. It must not be
included or referred to in a prospectus, information memorandum,
fundraising document, lender submission, valuation, public announcement
or other external document without our prior written consent and
independent professional review of that use. This clause 6 is subject to
clause 16.</p>
<h2>7. Customer responsibilities</h2>
<p><strong>7.1</strong> You remain responsible for the model, the
Customer Content, the assumptions, methodology, accounting policies,
outputs, decisions and all uses of the Output. You must apply competent
professional judgement and independently verify every finding, or
apparent absence of findings, that could affect a material decision. In
particular, you must:</p>
<blockquote>
<p>(a) submit the complete and correct file version intended for review,
together with supported passwords, dependencies and instructions;</p>
<p>(b) ensure information you supply is complete, accurate, lawful and
not misleading, and promptly correct anything you discover is wrong or
incomplete;</p>
<p>(c) maintain an unmodified backup of the source model and not treat
an Output as a replacement for it;</p>
<p>(d) read the entire Output, including the scope, procedures,
limitations, exclusions, uncertain findings and work not performed;</p>
<p>(e) investigate false positives, false negatives and uncertain
findings before modifying or using the model, and re-run appropriate
checks after remediation;</p>
<p>(f) obtain appropriately qualified accounting, tax, legal, financial,
valuation, technical and industry advice for the intended use; and</p>
<p>(g) ensure any distribution or description of an Output is lawful,
accurate, complete and not misleading.</p>
</blockquote>
<h2>8. Customer Content and authority to upload</h2>
<p><strong>8.1</strong> Customer Content means every file, formula,
datum, prompt, instruction, communication and other material you submit
to or through the Service, including any personal information it
contains. As between you and us, you own and retain all right, title and
interest in the Customer Content, and nothing in these Terms transfers
ownership of it to us.</p>
<p><strong>8.2</strong> You grant us a non-exclusive, worldwide,
royalty-free licence to host, store, copy, transmit, process, analyse
and display the Customer Content, to generate Output from it, and to
authorise our Subprocessors to do the same, in each case solely to the
extent necessary to provide, maintain, secure, support and improve the
Service and to comply with our legal obligations. This licence ends in
accordance with clause 13, except for de-identified and aggregated data
described in clause 13.6 and any copies we are required by law to
retain.</p>
<p><strong>8.3</strong> You represent and warrant, on each occasion you
submit Customer Content, that:</p>
<blockquote>
<p>(a) you own the Customer Content, or have all rights, licences,
consents and authorisations necessary to submit it and to grant the
licence in clause 8.2;</p>
<p>(b) where the Customer Content contains personal information
(including of your personnel, clients or counterparties), you have
collected it lawfully and given all notices and obtained all consents
required under the Privacy Act and any other applicable law for it to be
handled as described in these Terms including disclosure to, and
processing by, our Subprocessors, and overseas, as described in clauses
13 and 20 and the Privacy Policy; and</p>
<p>(c) the Customer Content, and our handling of it in accordance with
these Terms, does not and will not infringe the rights of any person or
breach any law.</p>
</blockquote>
<p><strong>8.4</strong> You should not include personal information in
the Customer Content unless it is necessary for the review you require
(see clause 13.8), and you must not submit material that is unlawful,
malicious, or that you are not entitled to submit. We rely on the
warranties in this clause; we are not obliged to review the Customer
Content to verify them, and any review we do undertake does not qualify
your warranties.</p>
<h2>9. Outputs, permitted use and no sole reliance</h2>
<p><strong>9.1</strong> Output means an issued report, issue log,
matrix, procedure record, remediation list, status, score, email,
summary or other material generated by the Service. Subject to your
payment of the applicable fees and your compliance with these Terms, we
grant you a non-exclusive, non-transferable, non-sublicensable licence
to use each Output for your own internal business or professional
purposes in connection with the Customer Content for which it was
produced.</p>
<p><strong>9.2</strong> A label such as “completed”, “reviewed”,
“passed”, “no exception identified” or similar describes only the result
of the named automated procedure. It does not mean validated, audited,
assured, certified, approved, error-free, reliance-ready,
investment-ready, lender-ready or fit for purpose.</p>
<p><strong>9.3</strong> The processing and procedure log records system
events and procedures. It is not an audit trail, and it is not evidence
that every relevant procedure operated correctly. No automated score is
a credit rating, investment rating, valuation opinion or assessment of
management quality.</p>
<p><strong>9.4</strong> Each issued Output must identify the Customer,
intended purpose and permitted users; the exact submitted file; the
issue date; the procedures completed; the material exclusions and
limitations; and its no-assurance and third-party non-reliance status.
Those statements define the Output and must be read before the findings.
Any filename or heading applied to an Output must be consistent with its
stated status and must not describe it as validated, audited or
certified.</p>
<p><strong>9.5</strong> You remain solely responsible for the Customer
Content, and for any financial model, decision, transaction or document
to which an Output relates, and for independently reviewing and
verifying the Customer Content and any Output using your own skill, care
and judgement, other appropriate tools and suitably qualified
professionals.</p>
<p><strong>9.6</strong> You must not use, or permit any person to use,
any Output as the sole or final basis for any material decision,
including any lending, investment, funding, valuation, acquisition,
disposal, financing, accounting, tax, board, disclosure or fundraising
decision. Before acting on a material finding, or on the apparent
absence of findings, you must inspect the underlying model, verify
relevant evidence, consider the procedures not performed and obtain
appropriate qualified advice.</p>
<p><strong>9.7</strong> You acknowledge that you have read and
understood the limitations in clauses 5 and 6 and the Important
Limitations panel, that those limitations are reasonable and are
reflected in the price of the Service, and that by placing an Order you
accept these Terms.</p>
<p><strong>9.8</strong> This clause 9 does not exclude, restrict or
modify any right or remedy you have under the Australian Consumer Law
(see clause 16).</p>
<h2>10. Third-party access, distribution and no duty of
care</h2>
<p><strong>10.1</strong> Each Output is prepared solely for you, as our
Customer, and solely for your own internal purposes. No other person is
our client, and no other person is entitled to rely on the Service or
any Output.</p>
<p><strong>10.2</strong> To the maximum extent permitted by law, and
subject to clause 16:</p>
<blockquote>
<p>(a) we owe no duty of care and assume no responsibility (whether in
contract, in tort including negligence, under statute or otherwise) to
any person other than you in respect of the Service or any Output;</p>
<p>(b) we do not intend, invite, consent to, or accept, reliance on any
Output by any person other than you; and</p>
<p>(c) we accept no liability to any funder, lender, investor,
financier, purchaser, guarantor, adviser or other third party for any
loss or damage arising from or in connection with the Service or any
Output, however arising.</p>
</blockquote>
<p><strong>10.3</strong> You must not provide, disclose or make
available any Output to any third party for the purpose of that third
party relying on it.</p>
<p><strong>10.4</strong> You acknowledge, and must ensure any recipient,
if despite this provision in this clause, is made aware, that it is not
reasonable for any person other than you to rely on an Output without
making their own inquiries and obtaining their own independent
professional advice, and that each such person can and should protect
their own interests by doing so.</p>
<p><strong>10.5</strong> You indemnify us under clause 18 against claims
arising from your provision of an Output to any third party or from any
third party's use of or reliance on an Output.</p>
<p><strong>10.6</strong> A person who is not a party to these Terms has
no right to enforce or rely on any of them. This clause 10 is subject to
clause 16, and nothing in it purports to exclude any liability that
cannot lawfully be excluded.</p>
<h2>11. Accounts, access and acceptable use</h2>
<p><strong>11.1</strong> You must keep credentials and download links
secure, restrict access to authorised persons, and promptly notify us of
any suspected unauthorised access. You are responsible for activity
through your account or submission link except to the extent caused by
our breach of law or these Terms.</p>
<p><strong>11.2</strong> You must not bypass security, interfere with
the Service, probe vulnerabilities without written authority, introduce
malicious code, scrape at scale, access another customer's data,
reverse-engineer protected components except as permitted by law, or use
the Service or any Output to train, develop, validate or benchmark a
competing product without our prior written consent.</p>
<h2>12. Confidentiality and electronic
communications</h2>
<p><strong>12.1</strong> Each party (the Receiving Party) must keep
confidential the other party's Confidential Information and must use it
only to exercise its rights and perform its obligations under these
Terms. As between the parties, the Customer Content is your Confidential
Information, and our software, non-public rules, detection methods,
prompts, templates, security materials and pricing methodology are our
Confidential Information.</p>
<p><strong>12.2</strong> The Receiving Party may disclose Confidential
Information only to its personnel, professional advisers and (in our
case) Subprocessors who need to know it for that purpose and who are
bound by consistent confidentiality obligations. Confidentiality does
not apply to information that is or becomes public without breach, was
already lawfully known free of any obligation of confidence, is
independently developed without use of the Confidential Information, or
is lawfully received from a third party without restriction.</p>
<p><strong>12.3</strong> If the Receiving Party is required by law, a
court or a regulator to disclose Confidential Information, it may do so,
but must (to the extent lawful and practicable) notify the Disclosing
Party beforehand and limit the disclosure to what is required. Nothing
in this clause limits our handling of personal information under clause
13 and the Privacy Policy.</p>
<p><strong>12.4</strong> We will send you communications necessary to
operate the Service and administer your Orders. We will send marketing
or promotional electronic messages only where permitted by the Spam Act
2003 (Cth); each such message will identify us and contain a functional
unsubscribe facility, and you may withdraw consent at any time without
affecting service communications.</p>
<h2>13. Data, subprocessors, privacy and security</h2>
<p><strong>13.1</strong> We engage third parties to host, store,
process, secure and support the Service, and to perform the automated
and machine-assisted processing described in clause 4 (each a
Subprocessor). We engage Subprocessors only to the extent reasonably
necessary to provide, secure and support the Service.</p>
<p><strong>13.2</strong> We maintain, and make available through our
Privacy Policy, a current list of our Subprocessors, the functions they
perform and the countries (including countries outside Australia) in
which they store or process Customer Content. This clause records the
overseas processing referred to in clause 20 and the Privacy Policy.</p>
<p><strong>13.3</strong> Before we engage a Subprocessor to handle
Customer Content, and at reasonable intervals afterwards, we will carry
out risk-based due diligence proportionate to the sensitivity of the
Customer Content, and maintain written terms requiring the Subprocessor
to protect Customer Content consistently with these Terms to use it only
to provide the relevant service to us, and to comply with clause
13.5.</p>
<p><strong>13.4</strong> We may add, replace or change a Subprocessor or
processing location, and will give reasonable prior notice of a new
material Subprocessor or processing country where practicable. If the
change materially increases the privacy, confidentiality or security
risk to your Customer Content and cannot reasonably be resolved, you may
stop new uploads and terminate the affected ongoing Service before the
change takes effect, with a pro-rata refund of prepaid fees for the
unused affected period. Emergency substitutions may be notified after
implementation where reasonably necessary for security or
continuity.</p>
<p><strong>13.5</strong> We do not, and we contractually require our
Subprocessors not to, use Customer Content to train, fine-tune or
otherwise develop or improve any general-purpose, foundation or shared
machine-learning model. Customer Content is processed only to generate
the Output and provide the Service. We will permit any other use only
where you give separate, express, informed and revocable written
consent.</p>
<p><strong>13.6</strong> We may create and use de-identified and
aggregated operational information (such as counts, performance metrics,
error rates and usage statistics) that cannot reasonably identify you,
any individual, a transaction or the contents of a model, to secure,
monitor and improve the Service. We will not attempt to re-identify that
information.</p>
<p><strong>13.7</strong> Our collection, use, disclosure, storage and
handling of personal information is governed by our Privacy Policy,
which forms part of these Terms and which we maintain in accordance with
the Australian Privacy Principles. If there is any inconsistency between
these Terms and the Privacy Policy in relation to personal information,
the Privacy Policy prevails to the extent of the inconsistency.</p>
<p><strong>13.8</strong> You should include personal information in the
Customer Content only where necessary for the review you require, and
should remove, mask, redact or de-identify any personal information
(including names, contact details, tax file numbers, dates of birth and
bank-account details) that is not necessary. We cannot control what
personal information you choose to include.</p>
<p><strong>13.9</strong> We will implement and maintain technical and
organisational security measures designed to protect Customer Content
from misuse, interference and loss and from unauthorised access,
modification or disclosure. No method of transmission or storage is
completely secure; our obligation is to take the reasonable steps
required by laws, and we do not promise absolute security.</p>
<p><strong>13.10</strong> We retain Customer Content only for as long as
necessary to provide the Service, unless a longer period is required by
law or is reasonably necessary to establish, exercise or defend a legal
claim. When Customer Content is no longer needed, we will destroy or
de-identify it, including taking reasonable steps to remove it from
backups.</p>
<p><strong>13.11</strong> If we become aware of a confirmed or
reasonably suspected unauthorised access to, disclosure of, or loss of
Customer Content that is likely to require action by you, we will act
promptly to contain and investigate it, notify your Security Contact
without undue delay (and in any event within [72 hours] of becoming
aware that an eligible data breach affecting your Customer Content has
occurred or is likely to have occurred) with the information then
reasonably available, and provide reasonable cooperation. Notice is not
an admission of fault.</p>
<p><strong>13.12</strong> The parties acknowledge that each may have
obligations under the Notifiable Data Breaches scheme in Part IIIC of
the Privacy Act. Because you determine what personal information is
included in the Customer Content and hold the relationship with affected
individuals, unless the parties agree otherwise in writing or the law
requires otherwise, as between the parties you are responsible for
making any notification to the Office of the Australian Information
Commissioner (OAIC) and to affected individuals in respect of an
eligible data breach involving Customer Content, and we will make any
notification we are required by law to make and will consult with you so
far as practicable to avoid duplicated or inconsistent notifications.
This allocation does not limit either party's obligations under the
Privacy Act.</p>
<p><strong>13.13</strong> You must nominate and keep current a contact
for security and privacy matters (your Security Contact) to whom we may
give notices under this clause 13, and must notify us promptly if
Customer Content contains personal information submitted without
authority or if you become aware of a suspected security incident
affecting the Service.</p>
<h2>14. Intellectual property</h2>
<p><strong>14.1</strong> We and our licensors retain all rights in the
Service, the software, documentation, methodologies, rule sets, prompts,
report structures, scoring systems, branding and improvements. Except
for the limited rights expressly granted, no intellectual-property right
is transferred.</p>
<p><strong>14.2</strong> To the extent an Output contains our
pre-existing materials, we grant you a non-exclusive, non-transferable
licence to use those materials only as part of the Output for the
permitted purpose. You must not extract or commercialise our
methodologies, rule sets or templates as a standalone product.</p>
<p><strong>14.3</strong> If you provide feedback or suggestions, you
grant us a perpetual, irrevocable, royalty-free licence to use them
without restriction, provided we do not disclose your Confidential
Information.</p>
<h2>15. Availability, and changes to the Service and these
Terms</h2>
<p><strong>15.1</strong> Any processing or delivery time shown for an
Order is indicative unless expressly guaranteed in a written enterprise
agreement. Processing may be delayed by file complexity, queue volume,
third-party services, maintenance, security events or matters outside
our reasonable control.</p>
<p><strong>15.2</strong> We maintain continuity and recovery
arrangements proportionate to the Service and will use reasonable
efforts to restore a material disruption. The Service is not represented
as continuously available or as a substitute for your own backups,
manual-review capacity, alternative tools or business-continuity
arrangements.</p>
<p><strong>15.3</strong> We may change, suspend or discontinue features
for security, legal, technical or commercial reasons, using reasonable
efforts not to materially reduce an accepted paid Order. If we cannot
restore or substantially resupply a prepaid affected Service within a
reasonable time, you may terminate it and receive a pro-rata refund for
the unused affected period, subject to non-excludable law.</p>
<p><strong>15.4</strong> We may update these Terms by publishing a
revised version with a new effective date. The version accepted for an
individual Order continues to govern that Order unless a change is
required by law or agreed by both parties.</p>
<p><strong>15.5</strong> A material adverse change to an ongoing
subscription or enterprise agreement applies prospectively only. We will
give at least 30 days' prior notice unless a shorter period is
reasonably required by law or to address an urgent security risk. If the
change materially reduces the Service or increases your risk or fees,
you may terminate the affected Service before it takes effect without an
early-termination charge and receive a pro-rata refund of prepaid fees
for the unused affected period. We will not impose a material
retrospective obligation under this clause.</p>
<h2>16. Warranties and the Australian Consumer Law</h2>
<p><strong>16.1</strong> Australian Consumer Law means the Competition
and Consumer Act 2010 (Cth) as applied as a law of the Commonwealth and
of New South Wales (including under the Fair Trading Act 1987 (NSW)),
and comparable provisions of the Australian Securities and Investments
Commission Act 2001 (Cth).</p>
<p><strong>16.2</strong> Certain rights, guarantees, warranties and
remedies (including the consumer guarantees in the Australian Consumer
Law) are conferred by law and cannot lawfully be excluded, restricted or
modified (Non-excludable Rights). Nothing in these Terms excludes,
restricts or modifies any Non-excludable Right, and if any provision
would do so, it does not apply to that extent. Where the Australian
Consumer Law permits us to limit the remedy for a breach of a
Non-excludable Right, our liability is limited in accordance with clause
16.4.</p>
<p><strong>16.3</strong> Subject to clause 16.2, and to the maximum
extent permitted by law, we exclude all guarantees, conditions,
warranties, representations and terms that would otherwise be implied or
imposed by statute, general law or custom, and the Service and each
Output are provided on an “as is” and “as available” basis, without any
promise that the Service will be uninterrupted, error-free, completely
secure, compatible with every workbook, suitable for every purpose or
capable of detecting every issue.</p>
<p><strong>16.4</strong> Where the Service is a service not of a kind
ordinarily acquired for personal, domestic or household use or
consumption, then, to the extent permitted by section 64A of the
Australian Consumer Law, and where it is fair and reasonable for us to
do so, our liability for failure to comply with a consumer guarantee
(other than a guarantee under section 51, 52 or 53 of the Australian
Consumer Law) is limited, at our option, to: (a) supplying the affected
Service again; or (b) paying the reasonable cost of having the affected
Service supplied again.</p>
<p><strong>16.5</strong> You acknowledge that the Service is acquired
for business or professional purposes and is not of a kind ordinarily
acquired for personal, domestic or household use or consumption. Nothing
in these Terms should be read as a representation that we may lawfully
exclude or limit a liability that we cannot lawfully exclude or
limit.</p>
<h2>17. Limitation of liability</h2>
<p><strong>17.1</strong> This clause 17 is subject to clause 16. Nothing
in it excludes, restricts or modifies any Non-excludable Right or any
liability that cannot lawfully be excluded, and where our liability for
breach of a consumer guarantee may be limited under section 64A, it is
limited as set out in clause 16.4. This clause applies to liability
arising in contract, in tort (including negligence), under statute, in
equity or otherwise, but does not limit liability for fraud, fraudulent
misrepresentation or deliberate misconduct.</p>
<p><strong>17.2</strong> To the maximum extent permitted by law, we are
not liable to you for any indirect, special, incidental or consequential
loss, or for any loss of profit or revenue, loss of anticipated savings,
loss of business, loss of opportunity, loss of goodwill or reputation,
business interruption, or loss, corruption or unavailability of data,
whether or not characterised as direct and whether or not we were
advised of the possibility.</p>
<p><strong>17.3</strong> To the maximum extent permitted by law, our
total aggregate liability for all claims arising out of or in connection
with these Terms, the Service and all Outputs is limited as follows:</p>
<blockquote>
<p>(a) for claims connected with a particular Order, the greater of (i)
the fees paid or payable for that Order and (ii) [AUD 10,000];</p>
<p>(b) for claims connected with a subscription or enterprise tier, the
total fees paid or payable for the Service in the [12-month] period
immediately before the act or omission giving rise to the first such
claim; and</p>
<p>(c) despite paragraphs (a) and (b), for claims arising from our
breach of clauses 12 and 13 (confidentiality and data) or our
infringement of a third party's intellectual-property rights, the
greater of (i) [AUD 50,000] and (ii) [two times] the amount otherwise
applicable under paragraph (a) or (b).</p>
</blockquote>
<p><strong>17.4</strong> The limits in clause 17.3 are aggregate limits,
not limits per claim; multiple claims arising from the same or a related
series of acts, omissions or events are treated as a single claim, and
our total liability never exceeds the highest single applicable
limit.</p>
<p><strong>17.5</strong> Our liability is reduced proportionately to the
extent that any loss is caused or contributed to by you, by any person
for whom you are responsible, by any third party, by use outside the
permitted purpose, by failure to follow an Output limitation, or by
inaccurate or incomplete Customer Content. Nothing in these Terms
excludes or limits the operation of Part 4 (proportionate liability) of
the Civil Liability Act 2002 (NSW).</p>
<p><strong>17.6</strong> You must take reasonable steps to avoid and
mitigate loss, and we are not liable to the extent loss could have been
avoided or reduced by your compliance with these Terms (including
clauses 5, 6, 9 and 10) or by reasonable mitigation. The parties
acknowledge that these limitations allocate risk in light of the
automated, non-assurance nature of the Service, the fees charged and
your obligation to independently verify material matters. Enterprise
customers may request a different cap before acceptance, subject to
revised scope, fees and insurance review.</p>
<h2>18. Customer indemnity</h2>
<p><strong>18.1</strong> To the maximum extent permitted by law, you
indemnify us, our related bodies corporate and our and their officers,
employees, contractors and agents (Indemnified Persons) against all
loss, damage, liability, cost and expense (including reasonable legal
costs) that an Indemnified Person suffers or incurs, to the extent
arising out of or in connection with:</p>
<blockquote>
<p>(a) Customer Content that is unlawful, or that infringes or
misappropriates the intellectual-property, confidentiality or privacy
rights of any person, or that you were not entitled to submit;</p>
<p>(b) your breach of clause 8, clause 10 or clause 11;</p>
<p>(c) your provision, disclosure or distribution of any Output to any
person, and any use of or reliance on an Output by any person other than
you (including any claim by a funder, lender or investor that relies, or
is said to rely, on an Output); and</p>
<p>(d) any representation you make about the Service or an Output that
is misleading, deceptive or unauthorised, including any representation
that an Output is an audit, or is assured, verified, validated or
certified.</p>
</blockquote>
<p><strong>18.2</strong> Your liability under clause 18.1 is reduced
proportionately to the extent the relevant loss is caused or contributed
to by the negligence, breach or wilful misconduct of an Indemnified
Person. This indemnity does not require you to indemnify against a
liability arising from an Indemnified Person's own fraud, or that cannot
lawfully be the subject of an indemnity, and nothing in this clause
excludes any Non-excludable Right.</p>
<p><strong>18.3</strong> We must give you prompt notice of a claim to
which the indemnity applies, allow you reasonable control of the defence
and settlement (provided any settlement that admits our fault or imposes
an obligation on us requires our consent, not to be unreasonably
withheld), provide reasonable cooperation at your cost, and take
reasonable steps to mitigate the relevant loss.</p>
<h2>19. Suspension, termination, support and
complaints</h2>
<p><strong>19.1</strong> We may suspend access or processing where
reasonably necessary to address a material security threat, unlawful
use, undisputed non-payment, material breach, unexpected system
behaviour or material risk to the Service or another customer. A
suspension must be proportionate and limited, where reasonably
practicable, to the affected feature, Order or account, and we will
(where practicable) give notice, reasons and an opportunity to remedy,
and restore access promptly after the reason is resolved.</p>
<p><strong>19.2</strong> Either party may terminate an ongoing account
or enterprise agreement for material breach not remedied within 14 days
after written notice, or immediately for insolvency where permitted by
law. Termination does not cancel an accepted Order already processing
unless agreed or required by law.</p>
<p><strong>19.3</strong> On termination, access rights end and amounts
already due remain payable. On request made before account closure, we
will make then-available Outputs reasonably exportable in their existing
format, and Customer Content will be returned, deleted or retained as
specified in the Order, the Privacy Policy, the technical retention
cycle and applicable law.</p>
<p><strong>19.4</strong> The following clauses survive termination or
expiry: clauses 3 to 10 (scope, limitations and reliance), 12 to 14
(confidentiality, data, privacy and intellectual property), 16 to 18
(warranties, liability and indemnity), 21 (disputes and governing law),
23 (definitions), and any other clause intended by its nature to
survive.</p>
<p><strong>19.5</strong> Questions, suspected errors and complaints may
be sent to the support contact but do not email a confidential model
unless we provide an approved secure channel.</p>
<p><strong>19.6</strong> We will investigate reasonably and may request
the source file, the issued Output and relevant evidence. We may
correct, withdraw, replace or annotate an Output if we identify a
material processing error. You must stop using and distributing a
withdrawn Output and take reasonable steps to notify anyone to whom you
supplied it.</p>
<p><strong>19.7</strong> Nothing in this clause limits your right to
contact a regulator, obtain independent advice or bring a claim.
Complaints about personal information may also be made as described in
the Privacy Policy, and ultimately to the OAIC.</p>
<h2>20. International use, cross-border data, sanctions and
regulated customers</h2>
<p><strong>20.1</strong> We are based in Australia and provide the
Service from Australia. We make no representation that the standard
Service, an Output or these Terms satisfy the financial-services,
securities, professional-services, privacy, data-residency, consumer,
records, export or other laws of any country other than Australia.</p>
<p><strong>20.2</strong> You acknowledge that, as described in clauses 4
and 13 and the Privacy Policy, some Customer Content (including any
personal information it contains) is disclosed to and processed by our
Subprocessors outside Australia. We do not represent that Customer
Content remains in, or is only processed in, Australia. Where we
disclose personal information to an overseas recipient, we will comply
with APP 8, including by taking such steps as are reasonable to ensure
the recipient does not breach the Australian Privacy Principles. You
acknowledge that, under section 16C of the Privacy Act, an act of such
an overseas recipient that would breach those principles is taken to
have been done by us.</p>
<p><strong>20.3</strong> You are responsible for assessing and complying
with the laws that apply to your upload, use, users, decisions and
distribution in each relevant country, including data-protection,
data-localisation, export-control and sanctions laws. You must not use
the Service in a jurisdiction, for a person, or for a purpose where
doing so would be unlawful, require us to hold a licence we do not hold,
or breach applicable sanctions or export controls, and you warrant that
you and your Authorised Users are not the subject of applicable trade or
economic sanctions.</p>
<p><strong>20.4</strong> A choice of New South Wales law does not
deprive any person of a protection that applicable law does not permit
the parties to exclude. Where a data-protection law requires specific
contractual terms before personal information may be processed or
transferred, you must tell us and enter into a data-processing or
transfer addendum with us before uploading that regulated personal
information; absent such an addendum, you must not upload it.</p>
<p><strong>20.5</strong> The standard online Service is not represented
as compliant with APRA Prudential Standard CPS 230 or any foreign
outsourcing or operational-resilience regime, and must not be the sole
control, review mechanism or continuity dependency for a critical
operation. You remain responsible for assessing whether the Service
triggers any regulatory notification, outsourcing, audit-access,
record-keeping, resilience or exit requirement that applies to you, and
for maintaining appropriate internal controls, competent personnel,
backups and business-continuity arrangements.</p>
<p><strong>20.6</strong> If your assessment identifies the Service as a
material or critical arrangement, you must not use it for that operation
until the parties sign an enterprise order addressing the applicable
service levels, data control, sub-contractors and locations, audit or
regulator access, incident cooperation, continuity, exit assistance and
liability. We may price and scope those obligations separately.</p>
<h2>21. Disputes and governing law</h2>
<p><strong>21.1</strong> These Terms, and any dispute or claim
(including any non-contractual dispute or claim) arising out of or in
connection with them, their subject matter or formation, are governed by
the laws in force in New South Wales, Australia.</p>
<p><strong>21.2</strong> Subject to clause 21.5, each party irrevocably
submits to the exclusive jurisdiction of the courts of New South Wales
and the courts competent to hear appeals from them, and waives any
objection to venue or forum.</p>
<p><strong>21.3</strong> Subject to clauses 21.4 and 21.5, a party must
not start court proceedings about a dispute arising out of or in
connection with these Terms unless it has first given the other written
notice describing the dispute (a Dispute Notice), the parties have met
(including by video or telephone) within [10 business days] to try in
good faith to resolve it, and, if it is not resolved within [20 business
days] of the Dispute Notice, it has been referred to mediation
administered by the [Australian Disputes Centre] under its
guidelines.</p>
<p><strong>21.4</strong> Clause 21.3 does not prevent a party from
seeking urgent injunctive or interlocutory relief, or from recovering a
debt due and payable.</p>
<p><strong>21.5</strong> Nothing in this clause limits any right you
have to make a complaint to, or seek a remedy from, the Australian
Competition and Consumer Commission, the OAIC, NSW Fair Trading, the
Australian Securities and Investments Commission, any other regulator,
or any court or tribunal, in respect of the Australian Consumer Law or
any other Non-excludable Right.</p>
<p><strong>21.6</strong> Each party must continue to perform its
obligations during a dispute, except to the extent those obligations are
the subject of the dispute.</p>
<h2>22. General</h2>
<p><strong>22.1 Assignment and subcontracting.</strong> You may not
assign or novate an ongoing agreement without our prior written consent.
We may assign or novate it as part of a bona fide reorganisation or sale
of the business on notice, and may appoint Subprocessors under clause
13, in each case subject to continued protection of the Customer
Content. Neither party's consent (where required) is to be unreasonably
withheld.</p>
<p><strong>22.2 Notices.</strong> A notice must be in Writing and given
to the contact details or the account record. Notices sent by email are
effective when sent, unless the sender receives an automated
non-delivery message, and in-Service notices are effective when made
available.</p>
<p><strong>22.3 Force majeure.</strong> Neither party is liable for any
delay or failure to perform (other than an obligation to pay money, or a
data-protection or confidentiality obligation) caused by an event beyond
its reasonable control, provided it uses reasonable efforts to mitigate
and resume performance. If the event continues for more than [30 days],
either party may terminate the affected Service, with a pro-rata refund
of prepaid fees for the unused affected period.</p>
<p><strong>22.4 Entire agreement.</strong> Each party acknowledges it
has not relied on any representation in entering into them; however,
nothing in this clause excludes liability for misleading or deceptive
conduct, fraud or another liability that cannot lawfully be
excluded.</p>
<p><strong>22.5 Variation and waiver.</strong> A variation of these
Terms is effective only if made under clause 15 or agreed in Writing by
both parties. A failure or delay in exercising a right is not a waiver,
and a single or partial exercise does not prevent further exercise.</p>
<p><strong>22.6 Severance.</strong> If a provision is invalid or
unenforceable, it is read down to the minimum extent necessary or, if
that is not possible, severed, without affecting the remaining
provisions.</p>
<p><strong>22.7 Relationship of the parties.</strong> These Terms do not
create a partnership, agency, joint venture, employment or fiduciary
relationship, and neither party may bind the other.</p>
<p><strong>22.8 Counterparts and electronic acceptance.</strong> These
Terms may be accepted electronically, and an enterprise order form may
be signed in counterparts and by electronic signature, each of which is
valid under the Electronic Transactions Act 2000 (NSW) and the
Electronic Transactions Act 1999 (Cth).</p>
<h2>23. Definitions and interpretation</h2>
<p><strong>23.1 Definitions.</strong> In these Terms:</p>
<blockquote>
<p><strong>Approved Channel</strong> the upload and messaging facilities
we make available within the Service for submitting Customer
Content.</p>
<p><strong>Australian Consumer Law</strong> the Competition and Consumer
Act 2010 (Cth), as applied under Commonwealth and New South Wales
law.</p>
<p><strong>Australian Privacy Principles or APPs</strong> the Australian
Privacy Principles to the Privacy Act.</p>
<p><strong>Authorised User</strong> a person you permit to use the
Service under your account.</p>
<p><strong>Confidential Information</strong> has the meaning given in
clause 12.</p>
<p><strong>Customer, you, your</strong> the person or organisation that
accepts these Terms and places an Order (and, where applicable, its
Authorised Users).</p>
<p><strong>Customer Content</strong> has the meaning given in clause
8.1.</p>
<p><strong>Non-excludable Rights</strong> has the meaning given in
clause 16.2.</p>
<p><strong>Order</strong> a paid submission or executed written order
form for the Service, as described in clause 2.</p>
<p><strong>Output</strong> has the meaning given in clause 9.1.</p>
<p><strong>Permitted purpose</strong> the internal business or
professional purpose expressly identified in the Order.</p>
<p><strong>Personal information</strong> has the meaning given in the
Privacy Act.</p>
<p><strong>Privacy Act</strong> the Privacy Act 1988 (Cth).</p>
<p><strong>Privacy Policy</strong> our privacy policy as updated from
time to time.</p>
<p><strong>Security Contact</strong> the contact you nominate under
clause 13.13.</p>
<p><strong>Service</strong> means the FM Validator service described in
clause 1.1 and the applicable Order.</p>
<p><strong>Subprocessor</strong> a third party we engage to host, store,
process, secure or support the Service, including providers of automated
and machine-assisted processing.</p>
<p><strong>Supplier, we, us, our</strong> the legal entity operating
under the PLSFX brand and providing FM Validator, as identified on the
website, these Terms or the Privacy Policy.</p>
<p><strong>Supported Features</strong> the file formats, functions and
technical capabilities expressly identified as supported when an Order
is accepted.</p>
<p><strong>Writing</strong> includes an electronic record capable of
being retained and reproduced.</p>
</blockquote>
<p><strong>23.2 Interpretation.</strong> Headings are for convenience
only. The singular includes the plural and vice versa; a gender includes
each gender; “including” and “for example” are not words of limitation;
a reference to a statute includes its amendments and any instrument made
under it; a reference to a party includes its permitted successors and
assigns; “$” and “AUD” mean Australian dollars; and a business day is a
day (other than a Saturday, Sunday or public holiday) in Sydney, New
South Wales.</p>

      </div>
    </div>
  `;
  document.body.appendChild(tcsPopup);

  let loadingDotsTimer: ReturnType<typeof setInterval> | null = null;
  function startLoadingDots() {
    const dotsEl = loadingPopup.querySelector('.popup-loading-dots') as HTMLElement;
    let count = 0;
    dotsEl.textContent = '';
    loadingDotsTimer = setInterval(() => {
      count = (count + 1) % 4; // cycles through 0,1,2,3 dots
      dotsEl.textContent = '.'.repeat(count);
    }, 400);
  }
  function stopLoadingDots() {
    if (loadingDotsTimer) {
      clearInterval(loadingDotsTimer);
      loadingDotsTimer = null;
    }
  }
  function setLoadingPercent(percent: number | null) {
    const percentEl = loadingPopup.querySelector('.popup-loading-percent') as HTMLElement;
    percentEl.textContent = percent === null ? '' : `${percent}%`;
  }
  function setLoadingLabel(text: string) {
    const labelEl = loadingPopup.querySelector('.popup-loading-label') as HTMLElement;
    labelEl.textContent = text;
  }

  function showPopup(el: HTMLElement) {
    [loadingPopup, errorPopup, tcsPopup].forEach((p) => p.classList.remove('show'));
    el.classList.add('show');
    stopLoadingDots();
    if (el === loadingPopup) startLoadingDots();
  }
  function hidePopups() {
    [loadingPopup, errorPopup, tcsPopup].forEach((p) => p.classList.remove('show'));
    stopLoadingDots();
    setLoadingPercent(null);
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

  async function handleFile(file: File) {
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
    setLoadingLabel('Uploading');
    setLoadingPercent(0);

    try {
      // ── Step 1: real integrity check (Instance 2) - fast, no pipeline ──
      const formData = new FormData();
      formData.append('file', file);
      const verifyData = await uploadWithProgress(`${API_BASE}/api/verify-upload`, formData, (percent) => {
        setLoadingPercent(percent);
        if (percent >= 100) {
          // Upload itself is done; the server is now scanning the file -
          // no further percentage is genuinely trackable for that part,
          // so switch the label and drop back to just the animated dots.
          setLoadingLabel('Cooking');
          setLoadingPercent(null);
        }
      });

      if (!verifyData.passed) {
        hidePopups();
        showError(verifyData.message || 'This file could not be verified. Please check it and try again.');
        return;
      }
      storedAs = verifyData.storedAs;

      // ── Step 2: real pricing, reusing the already-staged file ──
      const priceRes = await fetch(`${API_BASE}/api/unique-formulas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storedAs }),
      });
      const priceData = await priceRes.json();

      if (priceData.status !== 'success') {
        hidePopups();
        showError(priceData.message || 'Could not estimate pricing for this file. Please try again.');
        storedAs = null;
        return;
      }

      hidePopups();
      filePillName.textContent = file.name;
      filePillSize.textContent = formatFileSize(file.size);
      filePill.style.display = 'flex';
      dropzone.style.display = 'none';
      mobileUploadBtn.style.display = 'none';
      summary.style.display = 'block';

      ufCount.textContent = String(priceData.uniqueFormulaTotal);
      bandLow.textContent = String(priceData.fscoreDist.Low);
      bandModerate.textContent = String(priceData.fscoreDist.Moderate);
      bandHigh.textContent = String(priceData.fscoreDist.High);
      bandCritical.textContent = String(priceData.fscoreDist.Critical);
      lastPriceData = { priceTotal: priceData.priceTotal, fscoreDist: priceData.fscoreDist, uniqueFormulaTotal: priceData.uniqueFormulaTotal };
      appliedPromo = null;
      promoInput.value = '';
      promoApplyBtn.disabled = true;
      promoApplyBtn.textContent = 'Apply';
      promoApplyBtn.classList.remove('subform-promo-apply--applied');
      promoErrorEl.hidden = true;
      recalculateSummary();

      fileVerified = true;
      checkReady();
    } catch (err) {
      hidePopups();
      showError('Could not connect to the server. Please check your connection and try again.');
      storedAs = null;
    }
  }

  const MINIMUM_CHARGE = 10;

  function computeDiscountedTotal() {
    if (!lastPriceData) return null;
    const priceTotal = lastPriceData.priceTotal;
    let discountAmount = 0;
    if (appliedPromo) {
      if (appliedPromo.discountType === 'percent') {
        discountAmount = Math.round(priceTotal * (appliedPromo.discountValue / 100));
      } else {
        discountAmount = appliedPromo.discountValue;
      }
    }
    const discountedSubtotal = Math.max(0, priceTotal - discountAmount);
    const gstTotal = Math.round(discountedSubtotal * 0.1);
    let grandTotal = discountedSubtotal + gstTotal;
    if (grandTotal < MINIMUM_CHARGE) grandTotal = MINIMUM_CHARGE;
    return { priceTotal, discountAmount, gstTotal, grandTotal };
  }

  // Single source of truth for what the summary displays - both the
  // initial, undiscounted state and every re-render after a promo code
  // is applied go through this same function, so the displayed total
  // can never drift from what submit-order will actually be quoted.
  function recalculateSummary() {
    const result = computeDiscountedTotal();
    if (!result) return;
    subtotalEl.textContent = formatDollars(result.priceTotal);
    if (appliedPromo && result.discountAmount > 0) {
      discountRow.hidden = false;
      discountEl.textContent = `-${formatDollars(result.discountAmount)}`;
    } else {
      discountRow.hidden = true;
    }
    gstEl.textContent = formatDollars(result.gstTotal);
    grandTotalEl.textContent = formatDollars(result.grandTotal);
    quotedGrandTotal = result.grandTotal;
  }

  promoInput.addEventListener('input', () => {
    // Once a code is applied, changing the text should require a fresh
    // Apply tap, not silently keep the old discount active against
    // different text.
    if (appliedPromo) {
      appliedPromo = null;
      promoApplyBtn.textContent = 'Apply';
      promoApplyBtn.classList.remove('subform-promo-apply--applied');
      recalculateSummary();
    }
    promoApplyBtn.disabled = promoInput.value.trim().length === 0;
    promoErrorEl.hidden = true;
  });

  promoApplyBtn.addEventListener('click', async () => {
    const code = promoInput.value.trim();
    if (!code || !emailInput.value.trim()) {
      promoErrorEl.textContent = 'Enter your email above before applying a code.';
      promoErrorEl.hidden = false;
      return;
    }
    promoApplyBtn.disabled = true;
    promoErrorEl.hidden = true;
    try {
      const res = await fetch(`${API_BASE}/api/validate-promo-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, email: emailInput.value.trim() }),
      });
      const data = await res.json();
      if (!data.valid) {
        promoErrorEl.textContent = data.reason || 'That code could not be applied.';
        promoErrorEl.hidden = false;
        promoApplyBtn.disabled = false;
        return;
      }
      appliedPromo = { code, discountType: data.discountType, discountValue: data.discountValue };
      promoApplyBtn.textContent = 'Applied';
      promoApplyBtn.classList.add('subform-promo-apply--applied');
      recalculateSummary();
    } catch (err) {
      promoErrorEl.textContent = 'Could not reach the server. Please try again.';
      promoErrorEl.hidden = false;
      promoApplyBtn.disabled = false;
    }
  });

  function resetFile() {
    fileVerified = false;
    storedAs = null;
    quotedGrandTotal = null;
    lastPriceData = null;
    appliedPromo = null;
    promoInput.value = '';
    promoApplyBtn.disabled = true;
    promoApplyBtn.textContent = 'Apply';
    promoApplyBtn.classList.remove('subform-promo-apply--applied');
    promoErrorEl.hidden = true;
    discountRow.hidden = true;
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

  submitBtn.addEventListener('click', async () => {
    if (submitBtn.disabled) return;
    if (!storedAs || quotedGrandTotal === null) {
      showError('Please upload a file before submitting.');
      return;
    }
    showPopup(loadingPopup);

    // PLACEHOLDER - not real encryption. eWay's actual client-side SDK
    // integration is still blocked on their API docs, matching the same
    // honest placeholder on the backend (src/utils/eway-payment.js).
    // Real card fields should never be sent to our own backend even as
    // a placeholder - this must be replaced with whatever opaque token
    // eWay's real client SDK produces once it's wired in.
    const eWayEncryptedPayload = 'PLACEHOLDER_NOT_REAL_ENCRYPTION';

    try {
      const res = await fetch(`${API_BASE}/api/submit-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storedAs,
          fullName: nameInput.value.trim(),
          company: companyInput.value.trim(),
          email: emailInput.value.trim(),
          eWayEncryptedPayload,
          quotedGrandTotal,
          promoCode: appliedPromo ? appliedPromo.code : null,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        hidePopups();
        showError(data.message || 'Your order could not be submitted. Please try again.');
        return;
      }

      hidePopups();
      orderIdEl.textContent = data.orderId;
      page.querySelectorAll('.subform-section, .subform-footer, .demo-modal__header').forEach((el) => {
        (el as HTMLElement).style.display = 'none';
      });
      successMsg.style.display = 'block';
    } catch (err) {
      hidePopups();
      showError('Could not connect to the server. Please check your connection and try again.');
    }
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
