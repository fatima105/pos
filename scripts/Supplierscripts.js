document.addEventListener("DOMContentLoaded", function () {
    // Load Footer
    fetch("scripts/footer.html")
      .then((response) => response.text())
      .then((data) => {
        document.getElementById("footer-container").innerHTML = data;
        document.getElementById("year").textContent =
          new Date().getFullYear();
      })
      .catch((error) => console.error("Error loading footer:", error));
  
    // Load Sidebar
    fetch("sidebar.html")
      .then((response) => response.text())
      .then((html) => {
        document.getElementById("sidebar-container").innerHTML = html;
      });
  
    let SupplierAdd = document.getElementById("SupplierAdd");
  
    SupplierAdd.addEventListener("submit", (e) => {
        e.preventDefault();
      
        let name = document.getElementById("name").value;
        let branch = document.getElementById("branch").value;
        let cnic = document.getElementById("cnic").value;
        let email = document.getElementById("email").value;
        let mobile_no = document.getElementById("mobile_no").value;
        let city = document.getElementById("city").value;
        let city_area = document.getElementById("city_area").value;
        let status = document.getElementById("status").value;
      
        let location_id = '1';
        let company = 'XYZ';
        let coa_id = 'C-0001'; // replace this appropriately
        let deleted_at = null;
        let updated_at = null;
      
        let errorMessage = "";
      
        // Validate CNIC
        if (cnic.length < 13) {
          errorMessage += "Please enter a 13-digit CNIC.<br>";
        }
      
        // Check for empty fields
        if (!name) {
          errorMessage += "Name is required.<br>";
        }
        if (!branch) {
          errorMessage += "Branch is required.<br>";
        }
        if (!email) {
          errorMessage += "Email is required.<br>";
        }
        if (!mobile_no) {
          errorMessage += "Mobile number is required.<br>";
        }
        if (!city) {
          errorMessage += "City is required.<br>";
        }
        if (!city_area) {
          errorMessage += "City area is required.<br>";
        }
        if (!status) {
          errorMessage += "Status is required.<br>";
        }
      
        // If there are validation errors, show the error modal
        if (errorMessage) {
          document.getElementById("error-message").innerHTML = errorMessage;
          let errorModal = new bootstrap.Modal(document.getElementById('ErrorModal'));
          errorModal.show();
          return;
        }
      
        // API call to backend
        fetch(`${BASEURL}Supplier`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            location_id,
            company,
            name,
            email,
            cnic,
            contact: mobile_no,
            city,
            city_area,
            coa_id,
            status,
            deleted_at,
            updated_at
          })
        })
        .then((response) => response.json())
        .then((data) => {
          console.log("API Response:", data);
          if (data.supplier_id) {
                   localStorage.setItem('globalAlertMessage',"Supplier added successfully with code " + data.code);
localStorage.setItem('globalAlertType', 'success');
            
            SupplierAdd.reset(); // Clear form
window.location.href = './view-suppliers.html';

          } else {
                       localStorage.setItem('globalAlertMessage',`Failed to add  Supplier `);
localStorage.setItem('globalAlertType', 'danger');
          }
        })
        .catch((error) => {
          console.error("Error in API call:", error);
          alert("Something went wrong!");
        });
      });
      
  });
  