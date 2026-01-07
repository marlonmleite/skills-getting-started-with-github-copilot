document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper to show a message inside the activity card below the participants list
  function showActivityMessage(cardEl, text, status) {
    if (!cardEl) return;
    let msg = cardEl.querySelector('.activity-message');
    if (!msg) {
      msg = document.createElement('div');
      msg.className = 'message activity-message';
      cardEl.appendChild(msg);
    }
    msg.textContent = text;
    msg.className = `message activity-message ${status}`;
    msg.classList.remove('hidden');

    // Hide after 5 seconds
    setTimeout(() => {
      try { msg.classList.add('hidden'); } catch (e) {}
    }, 5000);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset the activity select to avoid duplicate options
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <p><strong>Participants:</strong></p>
          <ul class="participants-list">
            ${details.participants.map(participant => `<li class="participant-item"><span class="participant-email">${participant}</span><button class="delete-btn" data-activity="${encodeURIComponent(name)}" data-email="${encodeURIComponent(participant)}" aria-label="Remove ${participant}">🗑️</button></li>`).join('')}
          </ul>
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

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

        if (response.ok) {
        // Reset form
        signupForm.reset();

        // Refresh activities to show the new participant and updated availability
        await fetchActivities();

        // Find the newly updated card and show a message inside it
        const cards = Array.from(activitiesList.querySelectorAll('.activity-card'));
        const targetCard = cards.find(c => c.querySelector('h4') && c.querySelector('h4').textContent === activity);
        if (targetCard) {
          showActivityMessage(targetCard, result.message, 'success');
        } else {
          // Fallback to global message
          messageDiv.textContent = result.message;
          messageDiv.className = "success";
          messageDiv.classList.remove("hidden");
          setTimeout(() => { messageDiv.classList.add("hidden"); }, 5000);
        }

      } else {
        // Show error in global message area
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");

        // Hide after 5 seconds
        setTimeout(() => {
          messageDiv.classList.add("hidden");
        }, 5000);
      }
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Handle participant removal (event delegation)
  activitiesList.addEventListener("click", async (event) => {
    if (!event.target.matches(".delete-btn")) return;

    const btn = event.target;
    const activity = decodeURIComponent(btn.dataset.activity);
    const email = decodeURIComponent(btn.dataset.email);
    const item = btn.closest('.participant-item');
    const card = btn.closest('.activity-card');

    try {
      const response = await fetch(`/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`, { method: "DELETE" });
      const result = await response.json();

      if (response.ok) {
        // Remove the participant from the DOM immediately
        if (item) item.remove();

        // Update availability text inside the card (+1 spot left)
        if (card) {
          const pElems = Array.from(card.querySelectorAll('p'));
          const ava = pElems.find(p => p.textContent.includes('Availability:'));
          if (ava) {
            const match = ava.textContent.match(/(\d+)/);
            if (match) {
              const newVal = parseInt(match[1], 10) + 1;
              ava.innerHTML = `<strong>Availability:</strong> ${newVal} spots left`;
            }
          }
        }

        showActivityMessage(card, result.message, 'success');
      } else {
        showActivityMessage(card, result.detail || 'An error occurred', 'error');
      }
    } catch (error) {
      // Show error in-card
      if (card) {
        let msg = card.querySelector('.activity-message');
        if (!msg) {
          msg = document.createElement('div');
          msg.className = 'message activity-message';
          card.appendChild(msg);
        }
        msg.textContent = 'Failed to remove participant. Please try again.';
        msg.className = 'message activity-message error';
        msg.classList.remove('hidden');

        setTimeout(() => {
          try { msg.classList.add('hidden'); } catch (e) {}
        }, 5000);
      }

      console.error("Error removing participant:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
