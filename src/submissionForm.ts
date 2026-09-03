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
  const gstEl = page.querySelector('.subform-gst') as HTMLElement;
  const grandTotalEl = page.querySelector('.subform-grand-total') as HTMLElement;

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
<p>These Terms govern each Order for the FM Validator Service. Please
read them before creating an account, paying for an Order or uploading a
model. The important limitations on the preceding page form part of
these Terms.</p>
<h2>1. Supplier, contract and
acceptance</h2>
<p>FM Validator is operated by the supplier identified in Schedule 1 (FM
Validator, we, us or our). These Terms apply to the FM Validator
website, upload and payment workflow, automated financial-model review
service, issued reports and related support (together, the Service).</p>
<p>By ticking the acceptance box, creating an account, paying for an
Order, uploading Customer Content, accessing an Output or otherwise
using the Service, you agree to these Terms, the Privacy Policy, the
Order summary and any other document expressly incorporated into the
Order. If you use the Service for an organisation, you represent that
you have authority to bind it. Customer and you then mean that
organisation and its authorised users.</p>
<p>We may require acceptance to be recorded against the applicable Terms
and Privacy Policy versions, user or account identifier, timestamp,
Order identifier and source-file hash. No oral statement, demonstration,
support response or course of dealing varies these Terms or creates a
duty of care unless an authorised representative of both parties
expressly agrees in writing.</p>
<h2>2. Business use and
eligibility</h2>
<p>The Service is intended only for business and professional users aged
18 years or older. It is not designed for personal household financial
planning, retail financial advice or use by children.</p>
<p>You must not use the Service if you lack authority to enter the
agreement, are prohibited by applicable law, or lack the rights required
to submit the Customer Content. Nothing in these Terms excludes,
restricts or modifies a right or remedy that cannot lawfully be
excluded, including under the Australian Consumer Law.</p>
<h2>3. Orders and order of
precedence</h2>
<p>Each paid submission or written order form is an Order. Before
payment, we will display the applicable price or pricing method and
material disclosed technical limits. An Order is accepted when payment
is authorised and we issue an order confirmation, unless we notify you
that the file cannot be processed.</p>
<p>The Order summary must identify, as applicable, the review objective;
the submitted file name, version or hash; the procedure families and
reference frameworks to be applied; material scope exclusions and
technical limits; the intended purpose and permitted users; the expected
Output form; the price; and any agreed service level or human-review
component. The issued Output must record the procedures actually
completed and any departure from the accepted scope.</p>
<p>The agreement for an Order comprises, in descending order of
precedence: an executed enterprise order form; the Order confirmation or
online Order summary; these Terms; the Privacy Policy; and any
supported-features or service-description page expressly incorporated at
acceptance. A higher-ranking document prevails only to the extent of a
direct inconsistency.</p>
<p>A proposal, demonstration or marketing statement does not expand the
Service beyond the procedures and deliverables identified in the
accepted Order and the issued Output. This does not exclude or override
a specific written representation made by our authorised representative
on which it was reasonable for you to rely, or liability for misleading
or deceptive conduct, fraud or another liability that cannot lawfully be
excluded.</p>
<h2>4. What the Service
does and the agreed scope</h2>
<p>The Service performs automated procedures on the financial model
version submitted and produces a structured report of potential
findings. Depending on the selected review mode and supported features,
procedures may include formula-cell scanning, structural and dependency
analysis, rule-based tests, recalculation, consistency checks, semantic
analysis and domain-specific reasonableness checks.</p>
<p>The Order and Output define the engagement objective, the file
reviewed, procedures completed, coverage achieved, exclusions, detected
technical limitations and procedures not performed. Procedures are
limited exclusively to that stated scope. Unless an Output expressly
records that a procedure was completed successfully, you must assume it
was not performed.</p>
<p>The Service ordinarily records findings and does not modify the
source model. Any remediation, manual review, bespoke testing,
professional sign-off, implementation or verification service requires a
separate written scope.</p>
<p>Each Order is a separate review of the identified file version. A
recurring subscription does not create a standing audit, continuous
monitoring duty or obligation to detect changes between submissions. We
may require a refreshed Order summary or re-acceptance where the model,
purpose, procedures, intended users, reference framework or these Terms
materially change.</p>
<h2>5.
Automation, artificial intelligence and human oversight</h2>
<p>The Service uses rules, software and artificial-intelligence systems
to analyse Customer Content and generate findings, classifications,
summaries and other Output material. Artificial-intelligence components
may be provided by contracted third parties. Their use and the material
processing locations must be disclosed consistently with the Privacy
Policy.</p>
<p>Unless the Order expressly identifies a human-review service, no
qualified professional individually examines or approves every formula,
assumption, finding or Output. Customer support, demonstrations and
responses to questions do not convert the Service into a human audit,
assurance engagement or professional advisory engagement.</p>
<p>AI-generated material may be incomplete, inaccurate or difficult to
explain. You may query a finding through the support process, but you
remain responsible for investigating and deciding whether it is valid.
We may monitor, test, update, suspend or replace automated components
where reasonably necessary to address errors, drift, security concerns,
supplier changes or unexpected outputs.</p>
<p>We remain responsible for providing the contracted Service
notwithstanding our use of providers, subject to the limitations and
exclusions in these Terms. We will use reasonable provider due
diligence, contractual controls, monitoring and contingency planning
appropriate to the provider's role and the sensitivity of Customer
Content.</p>
<h2>6. Fundamental limitations</h2>
<p>The Service assists review; it does not eliminate model risk. A
completed scan does not establish that a model, formula, assumption,
accounting treatment, forecast or Output is accurate, complete,
reasonable, compliant, commercially complete or fit for a particular
purpose.</p>
<ul>
<li><p>The Service does not independently verify contracts, invoices,
bank records, market data, source documents, management representations
or other underlying evidence unless the Order expressly says
otherwise.</p></li>
<li><p>Incorrect but internally consistent data, assumptions or formulas
may not be identified.</p></li>
<li><p>Commercial omissions, inappropriate accounting treatments, fraud,
illegal acts and management bias may not be identified.</p></li>
<li><p>Hidden, protected, encrypted, corrupted, inaccessible or
unsupported content may not be reviewed.</p></li>
<li><p>VBA, macros, add-ins, user-defined functions, external links,
data connections, charts, linked files and third-party systems may be
excluded or only partially assessed.</p></li>
<li><p>Severity, materiality, confidence, pass/fail, completeness and
similar labels are automated diagnostic classifications, not
professional materiality judgements or assurance conclusions.</p></li>
<li><p>A review applies only to the exact file version processed. Any
later edit, refresh, recalculation, linked-data change or remediation is
outside scope until separately reviewed.</p></li>
</ul>
<h2>7. No audit, review,
assurance or certification</h2>
<p>The Service and every Output are non-assurance automated diagnostic
services. They are not a statutory audit, financial-statement audit,
review engagement, assurance engagement, agreed-upon procedures
engagement performed under AUASB standards, investigating accountant's
report, certification, due-diligence opinion or professional
sign-off.</p>
<p>The Service is not conducted under ASAE 3000, ASAE 3450, ASRS 4400 or
an Australian Auditing Standard. We do not establish assurance
preconditions or perform the acceptance, independence, ethical,
quality-management, professional-scepticism, materiality, evidence,
representation, reporting or other work required of an assurance
practitioner. We express no audit opinion, review conclusion,
reasonable-assurance conclusion, limited-assurance conclusion or opinion
that a model is free from error or material misstatement.</p>
<p>Diagnostic rules and modelling references are not represented to be
suitable assurance criteria, and an automated severity or materiality
label is not assurance materiality. References to modelling standards,
accounting concepts, professional guidance or recognised methodologies
describe only the source or design of a diagnostic rule. They do not
mean the Service is conducted under, endorsed by, or compliant with a
professional or assurance standard.</p>
<p>Unless a separate engagement is signed with an appropriately
qualified and independent assurance practitioner, neither party may
describe the Service or an Output using assurance terminology such as
reasonable assurance, limited assurance, positive assurance, negative
assurance, opinion, conclusion, certified, audited or 'nothing has come
to our attention'. Outputs report automated findings and procedure
results only.</p>
<h2>8.
Forecasts, projections and prospective financial information</h2>
<p>Financial models frequently contain forecasts, projections and other
prospective financial information. You are solely responsible for
selecting, evidencing, approving and maintaining every material express
and implied assumption; the basis of preparation, methodology and
forecast period; relevant risks; and balanced sensitivities, including
reasonable downside cases. You must determine whether there are
objectively reasonable grounds for any prospective statement and
maintain the supporting evidence.</p>
<p>The Service does not test all external evidence, management
intentions or capacity, market conditions or other matters needed to
establish reasonable grounds. It does not provide assurance on the
assumptions, basis of preparation, presentation, reasonableness or
achievability of prospective financial information. Automated
consistency, sensitivity or reasonableness checks do not establish that
assumptions will occur or that forecast results are achievable. Longer
forecast periods ordinarily involve greater uncertainty and require
correspondingly stronger independent support.</p>
<p>Actual events and results are likely to differ from prospective
financial information because anticipated events frequently do not occur
as expected, and the differences may be material. We accept no
responsibility for the achievement of any forecast, projection,
valuation, return, covenant, funding outcome or other prospective
result.</p>
<p>Any Output that comments on prospective financial information must
carry, immediately adjacent to that comment and with no less prominence,
a warning that the information is predictive, depends on assumptions and
unknown risks, and that actual results may differ materially. You must
not remove or obscure that warning.</p>
<p>An Output prepared for one model, date, transaction or purpose may be
unsuitable for another purpose. It must not be included or referred to
in a prospectus, information memorandum, fundraising document, lender
submission, valuation, public announcement or other external document
without our prior written consent and independent professional review of
that use.</p>
<h2>9. No financial
product or professional advice</h2>
<p>The Service provides diagnostic information about a submitted model.
It does not provide financial product advice, investment advice, credit
advice, accounting advice, tax advice, legal advice, valuation advice,
engineering advice or any other regulated or professional advice.</p>
<p>No Output is intended to recommend or influence a person to acquire,
hold or dispose of a financial product, enter or avoid a transaction,
provide finance, invest, lend or take another course of action. Any
finding, risk rating, priority, score or remediation suggestion concerns
the model-review process only and is not a recommendation about a
financial product, security, borrower, investment or transaction.</p>
<p>We do not consider any person's objectives, financial situation or
needs. No professional-client, fiduciary, auditor-client or
adviser-client relationship is created through the Service. A disclaimer
cannot change the legal character of conduct; accordingly, the Service
must not be used or represented in a manner that turns diagnostic
information into regulated advice.</p>
<p>You must not configure, prompt, label, combine or present the Service
so that it evaluates, compares or recommends a financial product,
security, issuer, borrower, investment, funding alternative or
transaction, or describes one as attractive, suitable, investable,
recommended, approved or best. If a proposed workflow may reasonably be
regarded as intended to influence a financial-product decision, it must
not proceed through the standard Service and requires separate legal
review and, where applicable, a properly licensed provider.</p>
<h2>10. Customer responsibilities</h2>
<p>You remain responsible for the model, Customer Content, assumptions,
methodology, accounting policies, outputs, decisions and all uses of the
Output. You must apply competent professional judgement and
independently verify every finding or omission that could affect a
material decision.</p>
<ul>
<li><p>Submit the complete and correct file version intended for review,
together with supported passwords, dependencies and
instructions.</p></li>
<li><p>Ensure information supplied is complete, accurate, lawful and not
misleading, and promptly correct anything you discover is wrong or
incomplete.</p></li>
<li><p>Maintain an unmodified backup of the source model and do not
treat an Output as a replacement for it.</p></li>
<li><p>Read the entire Output, including the scope, procedures,
limitations, exclusions, uncertain findings and work not
performed.</p></li>
<li><p>Investigate false positives, false negatives and uncertain
findings before modifying or using the model.</p></li>
<li><p>Re-run appropriate checks after remediation and independently
test all material changes.</p></li>
<li><p>Obtain appropriately qualified accounting, tax, legal, financial,
valuation, technical and industry advice for the intended use.</p></li>
<li><p>Ensure any distribution or description of an Output is lawful,
accurate, complete and not misleading.</p></li>
</ul>
<h2>11. Customer Content
and authority to upload</h2>
<p>Customer Content means every file, formula, datum, prompt,
instruction, communication and other material you submit. As between the
parties, you retain ownership of Customer Content.</p>
<p>You warrant that you have all rights, authorisations, notices and
consents required to provide Customer Content and permit us and our
service providers to process it for the Service. You must not submit
material that is unlawful, malicious, infringes another person's rights,
breaches confidentiality obligations or contains sensitive personal
information unless we have expressly agreed in writing that the Service
is configured to process it.</p>
<p>You grant us a limited, non-exclusive licence to host, copy,
transmit, analyse and otherwise process Customer Content only as
reasonably necessary to provide, secure, monitor and support the
Service, comply with law and enforce the agreement.</p>
<h2>12. Outputs and status
descriptions</h2>
<p>Output means an issued report, issue log, matrix, procedure record,
remediation list, status, score, email, summary or other material
generated by the Service. Subject to payment and these Terms, you may
use the Output for the internal business purpose identified in the
relevant Order.</p>
<p>A label such as completed, reviewed, passed, no exception identified,
no critical issue identified or similar describes only the result of the
named automated procedure. It does not mean validated, audited, assured,
certified, approved, error-free, reliance-ready, investment-ready,
lender-ready or fit for purpose.</p>
<p>The processing and procedure log records system events and
procedures. It is not an audit trail or evidence that every relevant
procedure operated correctly. No automated score is a credit rating,
investment rating, valuation opinion or assessment of management
quality.</p>
<p>Each issued Output must identify the Customer, intended purpose and
permitted users; the exact submitted file; issue date; procedures
completed; material exclusions and limitations; and its no-assurance and
third-party non-reliance status. Those statements define the Output and
must be read before the findings.</p>
<h2>13. Permitted use and no
sole reliance</h2>
<p>You may use an Output as one diagnostic input into your broader
review process. You must not use it as the sole or final basis for an
investment, lending, valuation, acquisition, disposal, financing,
accounting, tax, legal, board, disclosure, fundraising or other material
decision.</p>
<p>Before acting on a material finding or on the apparent absence of
findings, you must inspect the underlying model, verify relevant
evidence, consider procedures not performed and obtain appropriate
qualified professional advice. You assume responsibility for every
decision and action taken using the model or Output.</p>
<h2>14.
Third-party access, distribution and no duty of care</h2>
<p>Unless we expressly agree otherwise in a written reliance letter or
enterprise order form, an Output is prepared solely for the Customer and
permitted purpose identified in the Order. It is not addressed to any
lender, investor, shareholder, purchaser, vendor, director, regulator,
adviser or other third party. We accept no duty of care or
responsibility to any third party who receives, reviews or uses it.</p>
<p>You may provide an Output to employees and professional advisers who
need it for the permitted purpose and are bound by confidentiality and
written non-reliance obligations. Distribution to any other person, or
inclusion in any external document, requires our prior written consent.
Access to, receipt of or discussion about an Output does not create a
duty of care or expand its purpose.</p>
<p>An Output must be supplied only in full and unaltered with its title,
scope, procedure coverage, limitations and reliance notice intact. You
must not quote it selectively, remove warnings, use our name or branding
to imply endorsement, or describe it as an audit, assurance report,
certification, validation, due-diligence report or approval of a model
or transaction.</p>
<p>If we agree to a third party's reliance, that reliance must be
documented separately and may be subject to additional scope,
procedures, fees, liability limits and insurance review. No employee or
support representative may grant reliance informally.</p>
<p>We will not be taken to have accepted responsibility to a third party
merely because we know an Output may be shown to that person, respond to
an administrative question, remain silent, or attend a meeting. If
direct communications with a third party could reasonably imply reliance
or a duty, they must be preceded by a written non-reliance
acknowledgement or separate signed engagement. The parties must not act
inconsistently with the reliance restrictions in the Order and
Output.</p>
<h2>15. Drafts, previews
and support communications</h2>
<p>A preview, draft, interim result, processing status, oral statement,
demonstration or support communication may be incomplete, unreviewed,
subject to change or produced before all automated procedures finish. It
must not be relied on or distributed as a final Output.</p>
<p>Only the issued Output identified by its Order ID, file hash and
issue timestamp records the completed automated procedures for that
Order. An issued Output remains subject to all scope and reliance
limitations and does not become an audit, assurance opinion or
professional sign-off merely because it is described as issued or
complete.</p>
<h2>16. Fees, taxes and payment</h2>
<p>The price for an Order may reflect file size, unique formula count,
formula complexity, selected review mode and other disclosed processing
factors. The amount payable will be shown before payment. Unless stated
otherwise, prices are in Australian dollars and the GST treatment is
stated at checkout or in the Order form.</p>
<p>Payments may be processed by a third-party payment provider
identified at checkout or in the Privacy Policy. We do not intend to
store complete card details. You authorise the payment provider to
charge the displayed amount and must provide accurate billing
information.</p>
<p>If a subscription renews automatically, checkout and the Order
confirmation will state the renewal frequency, renewal price or
calculation method and how to cancel. We will provide at least 30 days'
notice before an annual automatic renewal and before a price increase
takes effect. Cancellation must be available through the account or
another reasonably simple notified method and takes effect before the
next renewal if received by the stated cut-off.</p>
<h2>17. Cancellation,
processing failures and refunds</h2>
<p>Automated processing may begin immediately after payment and upload.
Subject to non-excludable law and any express refund policy shown before
payment, an Order cannot be cancelled after processing begins merely
because no issues are identified, you disagree with a finding, or the
Output does not produce a preferred conclusion.</p>
<p>If we cannot process a file because of a Service failure or an
undisclosed technical incompatibility not reasonably apparent before
payment, we may retry, request a replacement file, resupply the affected
Service, provide a credit or refund the affected fee. If failure results
from the file, encryption, corruption, malware, unsupported features or
inaccurate information you supplied, any refund is at our reasonable
discretion, subject to applicable law.</p>
<h2>18. Accounts, access and
acceptable use</h2>
<p>You must keep credentials and download links secure, restrict access
to authorised persons and promptly notify us of suspected unauthorised
access. You are responsible for activity through your account or
submission link except to the extent caused by our breach of law or
these Terms.</p>
<p>You must not bypass security, interfere with the Service, probe
vulnerabilities without written authority, introduce malicious code,
scrape at scale, access another customer's data, reverse engineer
protected components except as permitted by law, or use the Service or
Outputs to train, develop, validate or benchmark a competing product
without our prior written consent.</p>
<h2>19.
Confidentiality and electronic communications</h2>
<p>Each party must protect the other party's confidential information
using at least reasonable care and use it only for the agreement.
Customer Content is Customer confidential information. Our software,
non-public rules, detection methods, security materials and pricing
methodology are our confidential information.</p>
<p>Confidentiality does not apply to information that is public without
breach, already lawfully known, independently developed without use of
confidential information, or lawfully received without restriction. A
party may disclose information where legally required after giving
notice where lawful and practicable.</p>
<p>Electronic communications can be delayed, corrupted, intercepted or
misdirected. Use the approved upload and support channels for
confidential models and do not send a model by ordinary email unless we
expressly instruct you to do so. Each party must use reasonable malware
protection and verify unusual payment, credential or file-transfer
requests through a separate channel.</p>
<h2>20. Data use, AI
providers and model training</h2>
<p>We may use contracted hosting, storage, monitoring, payment, support
and AI providers to process Customer Content only as reasonably
necessary for the Service. The Privacy Policy, provider list or
applicable data-processing agreement must accurately describe each
material provider category, its function, the countries in which
Customer Content may be processed and any material overseas
disclosure.</p>
<p>We will conduct risk-based due diligence and maintain written terms
with providers appropriate to their role, including obligations
concerning confidentiality, privacy, security, incident notification,
permitted use, retention and deletion. We will reasonably monitor
material providers, consider their business-continuity and
error-correction arrangements, and remain responsible for their
performance of our contractual obligations as if performed by us,
subject to these Terms.</p>
<p>We will give reasonable prior notice of a new material provider or
processing country where practicable. If the change materially increases
a privacy, confidentiality or regulatory risk that cannot reasonably be
resolved, you may stop new uploads and terminate the affected ongoing
Service before the change takes effect, with a pro-rata refund of
prepaid fees for the unused affected period. Emergency substitutions may
be notified after implementation where reasonably necessary for security
or continuity.</p>
<p>We will not use Customer Content to train a general-purpose or shared
AI model, and will require contracted AI providers not to use Customer
Content for their model training, unless you give separate, express,
prior written consent to a clearly described use.</p>
<p>We may use de-identified and aggregated operational metrics that
cannot reasonably identify you, your organisation, a transaction or the
contents of a model to secure, monitor and improve the Service. We will
not attempt to re-identify that information.</p>
<h2>21. Privacy, security,
retention and deletion</h2>
<p>The Privacy Policy explains how we collect, hold, use and disclose
personal information. You acknowledge that models may contain personal
information and must remove, mask or minimise it before upload where it
is unnecessary for the review.</p>
<p>We will take technical and organisational measures appropriate to the
nature, quantity and sensitivity of information and the current risk
profile. Measures may include access controls, encryption, isolated
processing, monitoring, staff procedures, incident response and supplier
controls as accurately described in our current security materials. No
transmission, storage or processing method is completely secure, and we
do not promise absolute security.</p>
<p>We retain Customer Content, Outputs, logs and backups only for the
periods and purposes stated in the Privacy Policy, an applicable
data-processing agreement or law. When personal information is no longer
required, we will take reasonable technical and organisational steps to
destroy or de-identify it, including addressing protected backups and
verifying deletion or de-identification by relevant providers where
reasonably required. Information that cannot immediately be destroyed
must be put beyond ordinary use and protected until overwritten or
destroyed.</p>
<p>We maintain a written incident-response process designed to contain,
assess, remediate, notify and review suspected data incidents. If we
become aware of a confirmed or reasonably suspected unauthorised access
to, disclosure of or loss of Customer Content that is likely to require
action by you, we will notify your nominated contact without undue delay
and provide the material information reasonably available to us,
followed by relevant updates. Notice is not an admission of fault.</p>
<p>We will lead containment and investigation of the Service environment
and reasonably assist your assessment and legally required
notifications. Unless law requires otherwise, you are responsible for
deciding and making notifications to individuals and regulators because
you ordinarily have the direct relationship with affected individuals;
we must be consulted before a notification identifies us. Neither party
may delay urgent containment or a legally required notification. Each
party remains responsible for its own legal obligations, and the parties
may document a different allocation in a data-processing agreement.</p>
<p>Notify us promptly if Customer Content contains personal information
that was submitted without authority, or if you become aware of a
suspected security incident affecting the Service. You must nominate and
keep current a security and privacy contact authorised to receive
incident notices.</p>
<h2>22. Intellectual property</h2>
<p>We and our licensors retain all rights in the Service, software,
documentation, methodologies, rule sets, report structures, scoring
systems, branding and improvements. Except for the limited rights
expressly granted, no intellectual-property right is transferred.</p>
<p>To the extent an Output contains our pre-existing materials, we grant
you a non-exclusive, non-transferable licence to use those materials
only as part of the Output for the permitted purpose. You must not
extract or commercialise our methodologies, rule sets or templates as a
standalone product.</p>
<p>If you provide feedback, you permit us to use it without restriction
or payment, provided we do not disclose Customer confidential
information.</p>
<h2>23. Availability,
processing times and changes</h2>
<p>Any processing or delivery time shown for an Order is indicative
unless expressly guaranteed in a written enterprise agreement.
Processing may be delayed by file complexity, queue volume, third-party
services, maintenance, security events or matters outside reasonable
control.</p>
<p>We maintain continuity and recovery arrangements proportionate to the
Service and will use reasonable efforts to restore a material
disruption. The Service is not represented as continuously available or
as a substitute for your own backups, manual review capacity, alternate
tools, business-continuity plan or recovery arrangements.</p>
<p>We may change, suspend or discontinue features for security, legal,
technical or commercial reasons. We will use reasonable efforts not to
materially reduce an accepted paid Order. An immediate suspension must
be limited, where reasonably practicable, to the affected feature, Order
or account and last no longer than reasonably necessary to manage the
risk. If we cannot restore or substantially resupply a prepaid affected
Service within a reasonable time, you may terminate it and receive a
pro-rata refund for the unused affected period, subject to
non-excludable law.</p>
<h2>24. Warranties and
Australian Consumer Law</h2>
<p>To the maximum extent permitted by law, the Service is supplied using
reasonable care but without any promise that it will be uninterrupted,
error-free, completely secure, compatible with every workbook, suitable
for every purpose or capable of detecting every issue.</p>
<p>Nothing in these Terms excludes, restricts or modifies a guarantee,
condition, warranty, right or remedy that cannot lawfully be excluded,
including under the Competition and Consumer Act 2010 (Cth). Where
applicable, the Australian Consumer Law may guarantee that services are
provided with due care and skill, are reasonably fit for a disclosed
purpose and are supplied within a reasonable time where no time is
fixed. Statements elsewhere in these Terms about scope, limitations and
intended purpose describe the Service supplied; they do not remove a
non-excludable guarantee.</p>
<p>If the Service is not of a kind ordinarily acquired for personal,
domestic or household use or consumption, and it is fair and reasonable
to do so, our liability for failure to comply with a consumer guarantee
is limited, at our option, to supplying the affected Service again or
paying the reasonable cost of having it supplied again. This limitation
does not apply where the Australian Consumer Law does not permit it.</p>
<p>Where a non-excludable law gives you a remedy for a major failure or
another failure we do not remedy within a reasonable time, nothing in
our cancellation or refund terms restricts that remedy, including any
right to cancel and obtain a refund for the unconsumed part of the
Service or recover reasonably foreseeable loss where the law provides
it.</p>
<h2>25. Limitation of liability</h2>
<p>This clause applies to the maximum extent permitted by law and to
liability arising in contract, negligence, statute, equity or otherwise.
It does not limit liability that cannot lawfully be limited, fraud,
fraudulent misrepresentation or deliberate misconduct.</p>
<p>Neither party is liable to the other for indirect, special or
consequential loss. We are not liable for loss of profit, revenue,
financing, investment value, transaction opportunity, anticipated
savings, goodwill or reputation; business interruption; or loss or
corruption of data, except to the extent such loss is direct, reasonably
foreseeable and caused by our breach.</p>
<p>Our aggregate liability arising out of or in connection with an Order
and all related acts or omissions is limited to the greater of: (a) the
fees paid or payable for the affected Order; and (b) AUD 10,000. For a
subscription or enterprise engagement, the cap is the greater of AUD
10,000 and the fees paid or payable in the 12 months before the event
giving rise to liability, unless the order form states another
negotiated cap.</p>
<p>For our breach of clauses 19 to 21 or a claim that the unmodified
Service infringes a third party's intellectual-property rights, our
aggregate liability is instead limited to the greater of AUD 50,000 and
twice the otherwise applicable cap in the preceding paragraph. This
separate cap does not expand liability where none otherwise exists and
remains subject to non-excludable law.</p>
<p>Our liability is limited to the proportion of loss fairly
attributable to our breach. It is reduced to the extent the loss was
caused or contributed to by the Customer, another adviser, a third-party
provider outside our reasonable control, use outside the permitted
purpose, failure to follow an Output limitation, inaccurate or
incomplete Customer Content, or failure to mitigate loss.</p>
<p>The parties acknowledge that the limitations allocate risk in light
of the Service's automated and non-assurance nature, the fees charged
and the Customer's obligation to independently verify material matters.
Enterprise customers may request a different cap before acceptance,
subject to revised scope, fees and insurance review.</p>
<h2>26. Customer indemnity</h2>
<p>To the maximum extent permitted by law, you indemnify us against a
third-party claim to the extent caused by your unlawful Customer
Content; infringement by Customer Content of a third party's
intellectual-property, privacy or confidentiality rights; your
unauthorised or misleading distribution or description of an Output; or
your material breach of clauses 11, 14 or 18. The indemnity does not
cover, and is reduced to the extent caused by, our or our provider's
breach, negligence, fraud, wilful misconduct or unlawful act.</p>
<p>We must give prompt notice, allow you reasonable control of the
defence and settlement, and provide reasonable cooperation at your cost.
You must not settle a claim in a way that admits our fault or imposes an
obligation on us without our consent, not to be unreasonably
withheld.</p>
<h2>27. Suspension, termination
and effect</h2>
<p>We may suspend access or processing where reasonably necessary to
address a material security threat, unlawful use, undisputed
non-payment, material breach, unexpected system behaviour or material
risk to the Service or another customer. A suspension must be
proportionate and limited, where reasonably practicable, to the affected
feature, Order or account. Where practicable, we will give notice,
reasons and an opportunity to remedy, and will restore access promptly
after the reason is resolved.</p>
<p>Either party may terminate an ongoing account or enterprise agreement
for material breach not remedied within 14 days after written notice, or
immediately for insolvency where permitted by law. Termination does not
cancel an accepted Order already processing unless agreed or required by
law.</p>
<p>On termination, access rights end and amounts already due remain
payable. Provisions concerning confidentiality, data, intellectual
property, permitted use, third-party reliance, liability, disputes and
any term intended by its nature to survive will continue. On request
made before account closure, we will make then-available Outputs
reasonably exportable in their existing format. Customer Content will be
returned, deleted or retained as specified in the Order, Privacy Policy,
technical retention cycle and applicable law.</p>
<h2>28. Support, correction and
complaints</h2>
<p>Questions, suspected errors and complaints may be sent to the support
contact in Schedule 1. Include the Order ID and finding reference, but
do not email a confidential model unless we provide an approved secure
channel.</p>
<p>We will investigate reasonably and may request the source file,
issued Output and relevant evidence. We may correct, withdraw, replace
or annotate an Output if we identify a material processing error. You
must stop using and distributing a withdrawn Output and take reasonable
steps to notify anyone to whom you supplied it.</p>
<p>Nothing in this clause limits a right to contact a regulator, obtain
independent advice or bring a claim. Complaints about personal
information may also be made as described in the Privacy Policy.</p>
<h2>29. Changes to these Terms</h2>
<p>We may update these Terms by publishing a revised version with a new
effective date. The version accepted for an individual Order continues
to govern that Order unless a change is required by law or agreed by
both parties.</p>
<p>A material adverse change to an ongoing subscription or enterprise
agreement applies prospectively only. We will give at least 30 days'
prior notice unless a shorter period is reasonably required by law or to
address an urgent security risk. If the change materially reduces the
Service or increases your risk or fees, you may terminate the affected
Service before it takes effect without an early-termination charge and
receive a pro-rata refund of prepaid fees for the unused affected
period. We will not use this clause to impose a material retrospective
obligation.</p>
<h2>30. International use
and cross-border data</h2>
<p>FM Validator is based in Australia, but business customers may access
the Service from other countries where lawful. We do not represent that
the standard Service, an Output or these Terms satisfy every local
financial-services, securities, professional-services, privacy,
data-residency, employment, consumer, records, export or sector-specific
law outside Australia.</p>
<p>You are responsible for assessing the laws that apply to your upload,
use, users, decisions and distribution in each relevant country. You
must not use the Service in a jurisdiction, for a person or for a
purpose where doing so would be unlawful, require us to hold a licence
or registration we do not hold, or breach applicable sanctions or export
controls. We may decline or suspend that use to the extent reasonably
necessary to comply with law.</p>
<p>Any mandatory rights available under the law of your country remain
unaffected. A choice of New South Wales law does not deprive a person of
a protection that applicable law does not permit the parties to exclude.
Where legally required and agreed before upload, the parties will enter
an appropriate data-processing or international-transfer addendum. Do
not upload regulated personal information until any required addendum,
consent, localisation measure or transfer mechanism is in place.</p>
<h2>31. Regulated
customers and operational resilience</h2>
<p>A regulated customer remains responsible for assessing whether the
Service supports a critical operation, constitutes a material
service-provider arrangement, or triggers regulatory notification,
outsourcing, audit-access, record, resilience or exit requirements. The
standard online Service is not represented as compliant with APRA
Prudential Standard CPS 230 or any foreign outsourcing or
operational-resilience regime.</p>
<p>The Service must not be the sole control, review mechanism or
continuity dependency for a critical operation. You must maintain
appropriate internal controls, competent personnel, backups, alternative
review capability, incident escalation, business-continuity and
orderly-exit arrangements.</p>
<p>On reasonable request and subject to confidentiality and security
restrictions, we may provide available information reasonably required
for provider due diligence and monitoring. If your assessment identifies
the Service as material or critical, you must not use it for that
operation until the parties sign an enterprise order addressing
applicable service levels, data control, subcontractors and locations,
audit or regulator access, incident cooperation, continuity, exit
assistance, liability and other mandatory requirements. We may price and
scope those obligations separately.</p>
<h2>32. Disputes and governing law</h2>
<p>Before commencing proceedings, a party should give written notice
describing the dispute and allow 20 business days for good-faith
discussions, except for urgent injunctive relief, debt recovery or where
delay would prejudice a legal right.</p>
<p>These Terms are governed by the laws of New South Wales, Australia.
The parties submit to the non-exclusive jurisdiction of its courts and
courts hearing appeals from them.</p>
<h2>33. General</h2>
<p>Neither party may assign an ongoing agreement without the other's
consent, not to be unreasonably withheld, except that we may assign it
as part of a bona fide corporate reorganisation or sale of the business
on notice and subject to continued protection of Customer Content.</p>
<p>Neither party is liable for delay caused by an event beyond
reasonable control, but payment obligations and data-protection duties
are not excused merely because performance is inconvenient or more
expensive.</p>
<p>If a provision is invalid or unenforceable, it is severed to the
minimum extent necessary. Failure to enforce a provision is not a
waiver. These Terms do not create a partnership, agency, employment or
fiduciary relationship.</p>
<p>The agreement documents identified in clause 3 are the entire
agreement for the relevant Order and supersede prior discussions about
its subject matter, but nothing excludes liability for misleading or
deceptive conduct, fraud or another liability that cannot lawfully be
excluded.</p>
<h2>34. Definitions</h2>
<p>Australian Consumer Law means Schedule 2 to the Competition and
Consumer Act 2010 (Cth). Customer Content, Order, Output and Service
have the meanings given in these Terms. Permitted purpose means the
internal business purpose expressly identified in the Order. Privacy
Policy means the current FM Validator privacy policy linked in Schedule
1. Supported Features means the file formats, functions and technical
capabilities expressly identified as supported when an Order is
accepted. Writing includes an electronic record capable of being
retained and reproduced.</p>

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
      subtotalEl.textContent = formatDollars(priceData.priceTotal);
      gstEl.textContent = formatDollars(priceData.gstTotal);
      grandTotalEl.textContent = formatDollars(priceData.grandTotal);
      quotedGrandTotal = priceData.grandTotal;

      fileVerified = true;
      checkReady();
    } catch (err) {
      hidePopups();
      showError('Could not connect to the server. Please check your connection and try again.');
      storedAs = null;
    }
  }

  function resetFile() {
    fileVerified = false;
    storedAs = null;
    quotedGrandTotal = null;
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
