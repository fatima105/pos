const BASEURL = 'http://localhost:8000/api/';

function showAlert(message, type = 'danger') {
  const alertPlaceholder = document.getElementById('alertPlaceholder');
  if (!alertPlaceholder) return;

  alertPlaceholder.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;

  alertPlaceholder.scrollIntoView({ behavior: 'smooth' });

  // Auto dismiss after 5s
  setTimeout(() => {
    const alertDiv = alertPlaceholder.querySelector('.alert');
    if (alertDiv) {
      alertDiv.classList.remove('show');
      alertDiv.classList.add('fade');
      setTimeout(() => alertDiv.remove(), 300);
    }
  }, 5000);
}

// Show alert from sessionStorage if exists
document.addEventListener('DOMContentLoaded', () => {
  const message = sessionStorage.getItem('globalAlertMessage');
  const type = sessionStorage.getItem('globalAlertType') || 'danger';

  if (message) {
    showAlert(message, type);
    sessionStorage.removeItem('globalAlertMessage');
    sessionStorage.removeItem('globalAlertType');
  }
});
