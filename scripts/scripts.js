document.addEventListener("DOMContentLoaded", function () {
function loadComponent(url, containerId, callback) {
    fetch(url)
        .then(response => response.text())
        .then(html => {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = html;
                if (callback) callback(); // Call the callback function after content is loaded
            } else {
                console.error(`Container ID "${containerId}" not found.`);
            }
        })
        .catch(error => console.error(`Error loading ${url}:`, error));
}

// Load Sidebar
loadComponent('sidebar.html', 'sidebar-container');

// Load Header
loadComponent('header.html', 'header-container');

// Load Footer
loadComponent('footer.html', 'footer-container');



// Wait for the page to load before running Chart.js

    if (document.getElementById('visitorsChart')) {
        const ctx1 = document.getElementById('visitorsChart').getContext('2d');
        new Chart(ctx1, {
            type: 'line',
            data: {
                labels: ['18th', '20th', '22nd', '24th', '26th', '28th', '30th'],
                datasets: [{
                    label: 'This Week',
                    data: [100, 140, 180, 175, 190, 185, 170],
                    borderColor: 'blue',
                    borderWidth: 2
                }]
            }
        });
    } else {
        console.error("Element with ID 'visitorsChart' not found.");
    }

    if (document.getElementById('salesChart')) {
        const ctx2 = document.getElementById('salesChart').getContext('2d');
        new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: ['JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
                datasets: [{
                    label: 'This Year',
                    data: [500, 1200, 2200, 1800, 2000, 1900, 2100],
                    backgroundColor: 'blue'
                }]
            }
        });
    } else {
        console.error("Element with ID 'salesChart' not found.");
    }
});



