/* ===== PART 3 (Limuthu Liyanage) · SIGN-UP PAGE. Checks the form and shows a "You're in" message.
   This is a prototype, so nothing is sent anywhere and no password is saved. ===== */
const signupForm = $('signupForm');

/* PART 3 (Limuthu Liyanage) · Show a message under one box, or clear it. */
function setError(id, message) {
  const input = $(id);
  const note = $(`${id}Error`);
  note.textContent = message;
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
}

/* PART 3 (Limuthu Liyanage) · Check every box. Returns true when the whole form is fine. */
function checkForm() {
  const name = $('suName').value.trim();
  const email = $('suEmail').value.trim();
  const password = $('suPassword').value;
  const again = $('suPassword2').value;

  setError('suName', name.length >= 2 ? '' : 'Please enter your name.');
  setError('suEmail', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '' : 'Please enter a valid email address.');
  setError('suPassword', password.length >= 8 ? '' : 'Use at least 8 characters.');
  setError('suPassword2', again && again === password ? '' : 'The two passwords do not match.');
  setError('suTerms', $('suTerms').checked ? '' : 'Please agree to the Privacy Notice.');

  return !signupForm.querySelector('[aria-invalid="true"]');
}

/* PART 3 (Limuthu Liyanage) · Show or hide the password when the eye button is pressed. */
signupForm.querySelectorAll('[data-show]').forEach((button) => {
  button.addEventListener('click', () => {
    const input = $(button.dataset.show);
    const hidden = input.type === 'password';
    input.type = hidden ? 'text' : 'password';
    button.textContent = hidden ? 'Hide' : 'Show';
    button.setAttribute('aria-pressed', String(hidden));
  });
});

/* PART 3 (Limuthu Liyanage) · On submit: check the form, then swap it for a thank-you message. */
signupForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!checkForm()) {
    signupForm.querySelector('[aria-invalid="true"]').focus();
    return;
  }
  const first = $('suName').value.trim().split(' ')[0];
  $('signupPanel').innerHTML = `
    <div class="signup-done" role="status">
      <svg class="news-star" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 0C12.9 8.2 15.8 11.1 24 12 15.8 12.9 12.9 15.8 12 24 11.1 15.8 8.2 12.9 0 12 8.2 11.1 11.1 8.2 12 0Z"/></svg>
      <h2>You're in, ${esc(first)}.</h2>
      <p>We'll email you when tickets open. This is a prototype, so nothing was sent.</p>
      <a class="btn btn-primary" href="index.html#events">Browse events</a>
    </div>`;
});

/* Once someone has tried to submit, re-check each box as they fix it. */
signupForm.addEventListener('input', () => {
  if (signupForm.querySelector('[aria-invalid="true"]')) checkForm();
});
