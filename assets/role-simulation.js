const scenarios = {
  Developer: ['Binary console', '$ unlock sandbox\nEnter 0101 to release the locked build.', 'Sandbox unlocked. Build ready for review.'],
  DevOps: ['CI/CD pipeline', 'The build is green. Run the smoke tests before deploying.', 'Smoke tests passed. Staging is ready.', 'Run smoke tests', 'Deploy to staging', 'Deployment healthy. Pipeline complete.'],
  'Data Analyst': ['Dashboard audit', 'Revenue doubled after a table join. Find the duplicate orders.', 'The join repeats order IDs. Count each order once.', 'Inspect join', 'Deduplicate orders', 'Dashboard corrected. Revenue matches the source.'],
  'Business Analyst': ['Scope review', 'Two teams give different answers about refunds. Find the missing rule.', 'Both teams agree on a 24-hour window.', 'Clarify the rule', 'Record acceptance criteria', 'The refund rule is ready for sign-off.'],
  'Data Scientist': ['Model review', 'The model scores 99%. Check whether a feature contains the answer.', 'A post-outcome field leaked into training.', 'Check the features', 'Retrain without the field', 'Validation now reflects what the model knows at prediction time.'],
  'Project Manager': ['Release planning', 'Two launch tasks need the same engineer today. Identify the blocker.', 'Checkout testing blocks the launch. The dashboard update can wait.', 'Review dependencies', 'Reschedule the dashboard', 'The launch plan now has a clear owner and deadline.'],
  'Sales & Support': ['Customer call', '☎ Incoming call from a customer whose order hasn’t arrived.', '“Hi, my delivery was due this morning. Can you check what happened?”', 'Answer call', 'Check order and confirm a callback', '“Thanks. I’ll wait for your update.” Call resolved.'],
  'HR & Admin': ['New joiner desk', 'A new hire arrives and their laptop is missing.', 'IT confirms a loaner is available.', 'Contact IT', 'Assign the loaner', 'The new hire can finish onboarding today.'],
  Finance: ['Reconciliation', 'The ledger is off by ₹1. Open the settlement statement.', 'The settlement rounded a fee to the nearest rupee.', 'Compare the statements', 'Record the rounding adjustment', 'Ledger reconciled.'],
  Operations: ['Dispatch desk', 'A courier missed the pickup. Check the next available slot.', 'The courier can collect everything at 4 PM.', 'Check pickup slots', 'Confirm 4 PM and notify the team', 'Dispatch rescheduled.'],
  'Marketing & Design': ['Campaign preview', 'Tomorrow’s campaign shows the old logo. Find the approved asset.', 'The approved logo is in the brand kit.', 'Open the brand kit', 'Replace and preview', 'The scheduled campaign now uses the approved logo.'],
  'Tech & QA': ['Release test', 'Checkout fails on a clean install. Reproduce the issue.', 'Checkout fails when no address is saved.', 'Run the clean-install test', 'File a release blocker', 'The issue is documented with reproduction steps.']
};

const byId = id => document.getElementById(id);
const form = byId('roleSimulationCode');
const actions = byId('roleSimulationActions');
const status = byId('roleSimulationStatus');
const prompt = byId('roleSimulationPrompt');

function showRoleSimulation(focus = false) {
  const role = byId('introTeam').value;
  const [title, opening, outcome, first, second, final] = scenarios[role];
  byId('roleSimulationName').textContent = role;
  byId('roleSimulationTitle').textContent = title;
  prompt.textContent = opening;
  prompt.classList.toggle('binary-console', role === 'Developer');
  status.textContent = '';
  actions.replaceChildren();
  form.reset();
  form.hidden = Boolean(first);

  function complete(message) {
    form.hidden = true;
    status.textContent = message;
    showAction('Play again', () => showRoleSimulation(true));
  }

  function showAction(label, handler, focus = true) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn primary';
    button.textContent = label;
    button.addEventListener('click', handler);
    actions.replaceChildren(button);
    if (focus) button.focus();
  }

  form.onsubmit = event => {
    event.preventDefault();
    if (form.elements.code.value !== '0101') {
      status.textContent = 'Code rejected. Check the console hint and try again.';
      form.elements.code.select();
      return;
    }
    complete(outcome);
  };

  if (first) {
    showAction(first, () => {
      prompt.textContent = outcome;
      showAction(second, () => complete(final));
    }, focus);
  } else if (focus) {
    form.elements.code.focus();
  }
}
window.addEventListener('office-punch-in', () => showRoleSimulation());
showRoleSimulation();

const opening = byId('roleOpening');
const openingVideo = opening.querySelector('video');
const openingCaption = byId('roleOpeningCaption');
let openingTimer;

window.addEventListener('office-role-opening', event => {
  const role = byId('introTeam').value;
  const [title, premise, outcome, first] = scenarios[role];
  const frames = role === 'Developer'
    ? ['> Booting binary console…', '> 0101 accepted. Sandbox unlocked.']
    : [premise, first + ' · ' + outcome];

  byId('roleOpeningRole').textContent = role;
  byId('roleOpeningTitle').textContent = title;
  openingCaption.textContent = frames[0];
  opening.showModal();
  event.preventDefault();
  openingVideo.src = '/assets/corporate-life-01.mp4';
  openingVideo.play().catch(() => {});
  openingTimer = setTimeout(() => {
    openingCaption.textContent = frames[1];
    openingCaption.dataset.frame = 'second';
    openingTimer = setTimeout(() => opening.close(), 2300);
  }, 2300);
});

byId('skipRoleOpening').addEventListener('click', () => opening.close());
opening.addEventListener('close', () => {
  clearTimeout(openingTimer);
  openingVideo.pause();
  window.enterSite();
});
