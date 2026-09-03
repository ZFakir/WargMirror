document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('signup-form');
  const avatarPreview = document.getElementById('avatar-preview');
  const avatarUpload = document.getElementById('avatar-upload');
  const btnUploadAvatar = document.getElementById('btn-upload-avatar');
  const avatarGrid = document.getElementById('avatar-grid');

  // Pre-generated pixel avatars from DiceBear
  const avatarSeeds = ['WARG', 'Jasper', 'Nova', 'Orion', 'Lyra'];
  let currentAvatarUrl = `https://api.dicebear.com/9.x/pixel-art/svg?seed=WARG`;

  // Render starter avatars
  avatarSeeds.forEach(seed => {
    const url = `https://api.dicebear.com/9.x/pixel-art/svg?seed=${seed}`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'avatar-option';
    if (seed === 'WARG') btn.classList.add('selected'); // Default selected
    btn.innerHTML = `<img src="${url}" alt="Avatar ${seed}" />`;
    
    btn.addEventListener('click', () => {
      // Clear selected state
      document.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
      btn.classList.add('selected');
      // Update preview
      avatarPreview.src = url;
      currentAvatarUrl = url;
    });
    
    avatarGrid.appendChild(btn);
  });

  // Handle custom file upload
  btnUploadAvatar.addEventListener('click', () => {
    avatarUpload.click();
  });

  avatarUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      // Simple validation for image types
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        avatarPreview.src = e.target.result;
        currentAvatarUrl = e.target.result; // Data URL for the uploaded image
        
        // Clear selected state from generated avatars
        document.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
      };
      reader.readAsDataURL(file);
    }
  });

  // Form Validation and Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let isValid = true;

    // Reset previous errors
    document.querySelectorAll('.form-group').forEach(el => el.classList.remove('has-error'));
    document.querySelectorAll('.error-msg').forEach(el => el.textContent = '');

    const username = form.username.value.trim();
    if (username.length < 3) {
      showError('username', 'Username must be at least 3 characters.');
      isValid = false;
    }

    const email = form.email.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showError('email', 'Please enter a valid email address.');
      isValid = false;
    }

    const password = form.password.value;
    if (password.length < 6) {
      showError('password', 'Password must be at least 6 characters.');
      isValid = false;
    }

    if (isValid) {
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing...';

      try {
        const response = await fetch(`${window.API_BASE_URL || 'https://wargmirror.onrender.com'}/auth/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            username,
            email,
            password
          })
        });

        const data = await response.json();

        if (response.ok) {
          // Signup and login successful
          window.location.href = 'home.html';
        } else {
          // Handle backend validation errors
          if (data.error && data.error.toLowerCase().includes('email')) {
            showError('email', data.error);
          } else if (data.error && data.error.toLowerCase().includes('username')) {
            showError('username', data.error);
          } else {
            alert(data.error || 'An error occurred during signup.');
          }
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      } catch (error) {
        console.error('Signup error:', error);
        alert('An error occurred during signup. Please ensure the server is running.');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  });

  function showError(fieldId, message) {
    const inputElement = document.getElementById(fieldId);
    const group = inputElement.closest('.form-group');
    const msgElement = group.querySelector('.error-msg');
    
    group.classList.add('has-error');
    if (msgElement) {
      msgElement.textContent = message;
    }
  }
});
