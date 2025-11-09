document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Debounce guards
  let lastSignupAt = 0;
  const lastRemoveAt = new Map();

  // Function to fetch activities from API
   // ...existing code...
    async function fetchActivities() {
      try {
        const response = await fetch("/activities");
        const activities = await response.json();

        // Clear loading message
        activitiesList.innerHTML = "";

        // Populate activities list
        Object.entries(activities).forEach(([name, details]) => {
          const activityCard = document.createElement("div");
          activityCard.className = "activity-card";
  
          const spotsLeft = details.max_participants - details.participants.length;
  
         // Build participants list HTML (pretty) with remove button for each participant
         const participantsHtml = details.participants && details.participants.length
           ? `<ul class="participants-list">${details.participants
               .map(p => `<li class="participant-item"><span class="participant-email">${p}</span><button class="participant-remove" data-email="${encodeURIComponent(p)}" data-activity="${encodeURIComponent(name)}" aria-label="Remove participant"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></li>`)
               .join("")}</ul>`
           : `<p class="no-participants">No participants yet</p>`;
  
          activityCard.innerHTML = `
            <h4>${name}</h4>
            <p>${details.description}</p>
            <p><strong>Schedule:</strong> ${details.schedule}</p>
            <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
           <div class="participants-section">
             <h5>Participants</h5>
             ${participantsHtml}
           </div>
          `;
  
          activitiesList.appendChild(activityCard);
  
          // Add option to select dropdown
          const option = document.createElement("option");
          option.value = name;
          option.textContent = name;
          activitySelect.appendChild(option);
        });
      } catch (error) {
        activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
        console.error("Error fetching activities:", error);
      }
    }
 
  // Handle form submission with debounce/disable to avoid duplicate requests
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Debounce rapid submits (800ms)
    const now = Date.now();
    if (now - lastSignupAt < 800) return;
    lastSignupAt = now;

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    const submitBtn = signupForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activity list so UI shows the new participant immediately
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  // Initialize app
  fetchActivities();

  // Delegate click handler for participant remove buttons with debounce/disable
  activitiesList.addEventListener("click", async (event) => {
    const btn = event.target.closest && event.target.closest(".participant-remove");
    if (!btn) return;

    const email = decodeURIComponent(btn.dataset.email || "");
    const activity = decodeURIComponent(btn.dataset.activity || "");

    if (!email || !activity) return;

    // Confirm removal
    if (!confirm(`Remove ${email} from "${activity}"?`)) return;

    // Debounce per participant (keyed by activity|email)
    const key = `${activity}|${email}`;
    const now = Date.now();
    const last = lastRemoveAt.get(key) || 0;
    if (now - last < 800) return; // ignore rapid repeats
    lastRemoveAt.set(key, now);

    // Disable the clicked button while request is in-flight
    btn.disabled = true;
    btn.setAttribute('aria-disabled', 'true');

    try {
      const resp = await fetch(`/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`, {
        method: "DELETE",
      });

      const result = await resp.json();
      if (resp.ok) {
        messageDiv.textContent = result.message || "Participant removed";
        messageDiv.className = "success";
        messageDiv.classList.remove("hidden");
        // Refresh activities list to reflect removal
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "Failed to remove participant";
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");
      }
      setTimeout(() => messageDiv.classList.add("hidden"), 5000);
    } catch (err) {
      console.error("Error removing participant:", err);
      messageDiv.textContent = "Failed to remove participant. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
    } finally {
      btn.disabled = false;
      btn.removeAttribute('aria-disabled');
    }
  });
});
