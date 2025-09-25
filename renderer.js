const baseUrl = window.env.BASE_URL;

console.log('Base URL:', baseUrl);
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-link').forEach(item => {
      item.addEventListener('click', (event) => {
          event.preventDefault();
          const page = event.target.getAttribute('href');

          // Load different content without refreshing
          document.querySelector('.p-4').innerHTML = `<h2>Loading ${page}...</h2>`;
      });
  });
});
