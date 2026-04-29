window.router.addRoute('login', (container) => {
    container.innerHTML = `
        <style>
            .auth-grid { display: grid; grid-template-columns: 1.1fr 1fr; min-height: calc(100vh - 80px); background: #fff; }
            .auth-img-panel { position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-end; padding: 4.5rem; color: white; }
            .auth-form-panel { display: flex; align-items: center; justify-content: center; padding: 3rem; background: #fff; }
            @media(max-width: 768px) {
                .auth-grid { grid-template-columns: 1fr; }
                .auth-img-panel { display: none; }
                .auth-form-panel { padding: 2rem 1rem; align-items: flex-start; margin-top: 2rem; }
            }
            .pw-toggle-btn {
                position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
                background: none; border: none; cursor: pointer; padding: 4px;
                color: #999; display: flex; align-items: center; transition: color 0.2s;
            }
            .pw-toggle-btn:hover { color: #555; }
        </style>
        <div class="auth-grid">
            <!-- Left Side: Aesthetic -->
            <div class="auth-img-panel">
                <div style="position: absolute; inset: 0; background: url('images/dire-dawa-hero.png?v=1143') center/cover;"></div>
                <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(14,68,44,0.9) 0%, rgba(14,68,44,0.3) 100%);"></div>
                
                <div style="position: relative; z-index: 10;">
                    <div style="background: var(--color-primary); width: 40px; height: 4px; margin-bottom: 2rem;"></div>
                    <h1 style="font-size: 3.8rem; font-weight: 800; margin-bottom: 1.5rem; line-height: 1.1; letter-spacing: -0.02em;">${__('Discover')}<br>${__('Exceptional Stays.')}</h1>
                    <p style="font-size: 1.25rem; opacity: 0.9; max-width: 450px; line-height: 1.6; font-weight: 300;">${__("Your journey through Ethiopia's finest hospitality begins here. Experience luxury and comfort redesigned.")}</p>
                </div>
            </div>

            <!-- Right Side: Interaction -->
            <div class="auth-form-panel">
                <div style="width: 100%; max-width: 400px; width: 100%;">
                    <div style="margin-bottom: 3rem;">
                        <h2 style="font-size: 2.2rem; color: var(--color-secondary); font-weight: 800; margin-bottom: 0.75rem;">${__('Welcome Back')}</h2>
                        <p style="color: var(--color-text-light); font-size: 1.05rem;">${__('Sign in to your account to manage your stays.')}</p>
                    </div>

                    <form id="login-form" autocomplete="on" onsubmit="event.preventDefault(); window.handleLogin();">
                        <div class="form-group" style="margin-bottom: 1.8rem; max-width: 100%;">
                            <label style="display: block; font-size: 0.8rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-secondary); margin-bottom: 0.75rem;">${__('Email Address')}</label>
                            <input type="email" id="login-email" name="email" required placeholder="name@company.com" 
                                style="width:100%; box-sizing: border-box; border: 2px solid #f0f0f0; border-radius: 12px; padding: 1.1rem; font-size: 1rem; transition: all 0.3s; background: #f9f9f9;">
                        </div>

                        <div class="form-group" style="margin-bottom: 0.8rem; max-width: 100%;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.75rem;">
                                <label style="font-size: 0.8rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-secondary); margin:0;">${__('Password')}</label>
                                <a href="#" onclick="event.preventDefault(); window.handleForgotPassword()" 
                                    style="font-size: 0.8rem; color: var(--color-primary); font-weight: 700; text-decoration: none;">${__('Forgot?')}</a>
                            </div>
                            <div style="position: relative;">
                                <input type="password" id="login-password" name="password" required placeholder="••••••••" 
                                    style="width:100%; box-sizing: border-box; border: 2px solid #f0f0f0; border-radius: 12px; padding: 1.1rem; padding-right: 48px; font-size: 1rem; background: #f9f9f9;">
                                <button type="button" class="pw-toggle-btn" onclick="window.togglePasswordVisibility('login-password', this)" title="Show password">
                                    <svg id="eye-icon-login" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div id="login-error-msg" style="display:none; background:#fff0f0; color:#c0392b; padding:0.8rem 1rem; border-radius:10px; font-size:0.85rem; font-weight:600; margin-top:1rem; border:1px solid #fdd;"></div>

                        <button type="submit" id="btn-email-login" class="btn-primary" 
                            style="width: 100%; padding: 1.2rem; border-radius: 12px; font-size: 1.1rem; font-weight: 800; margin-top: 2rem; box-shadow: 0 12px 24px rgba(0, 102, 68, 0.2); transition: transform 0.2s;">
                            ${__('Sign In to Michu Stays')}
                        </button>
                    </form>

                    <div style="display: flex; align-items: center; margin: 2.5rem 0;">
                        <div style="flex: 1; height: 1px; background: #eee;"></div>
                        <span style="padding: 0 1.2rem; font-size: 0.75rem; color: #aaa; font-weight: 700; letter-spacing: 0.1em;">${__('OR CONTINUE WITH')}</span>
                        <div style="flex: 1; height: 1px; background: #eee;"></div>
                    </div>

                    <button onclick="window.auth.loginWithGoogle()" 
                        style="width: 100%; box-sizing: border-box; background: white; border: 2px solid #eee; border-radius: 12px; padding: 1rem; display: flex; align-items: center; justify-content: center; gap: 0.75rem; cursor: pointer; transition: all 0.2s; font-weight: 700; color: #444;">
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20">
                        ${__('Google Account')}
                    </button>

                    <p style="text-align: center; margin-top: 2.5rem; color: #666; font-size: 1rem;">
                        ${__("Don't have an account?")} <a href="#" onclick="event.preventDefault(); window.router.navigate('signup')" 
                            style="color: var(--color-primary); font-weight: 800; text-decoration: none; border-bottom: 2px solid var(--color-primary-light);">${__('Create Account')}</a>
                    </p>
                </div>
            </div>
        </div>
    `;

    // Toggle password visibility helper
    window.togglePasswordVisibility = (inputId, btnEl) => {
        const input = document.getElementById(inputId);
        if (!input) return;
        const isHidden = input.type === 'password';
        input.type = isHidden ? 'text' : 'password';
        // Swap icon: open eye vs crossed eye
        const svg = btnEl.querySelector('svg');
        if (isHidden) {
            svg.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`;
            btnEl.title = 'Hide password';
        } else {
            svg.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
            btnEl.title = 'Show password';
        }
    };

    window.handleLogin = async () => {
        const email = document.getElementById('login-email').value.trim();
        const pass = document.getElementById('login-password').value;
        const errorDiv = document.getElementById('login-error-msg');
        if (errorDiv) { errorDiv.style.display = 'none'; errorDiv.textContent = ''; }

        if (!email || !pass) return showAlert('Email and password are required.');
        const btn = document.getElementById('btn-email-login');
        const orig = btn.innerText; btn.innerText = 'Verifying...'; btn.disabled = true;
        try { 
            await window.auth.login(email, pass); 
            // Reset button in case redirection is taking a moment (don't leave it as "Verifying...")
            btn.innerText = orig; btn.disabled = false;
        } catch(e) { 
            btn.innerText = orig; btn.disabled = false;
            // Show inline error for better UX
            if (errorDiv) {
                let msg = 'Login failed. Please check your credentials.';
                if (e.code === 'auth/user-not-found') msg = 'No account found with this email.';
                else if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential' || e.code === 'auth/invalid-login-credentials') msg = 'Incorrect email or password. Please try again.';
                else if (e.code === 'auth/too-many-requests') msg = 'Too many failed attempts. Please wait a moment and try again.';
                else if (e.code === 'auth/network-request-failed') msg = 'Network error. Check your internet connection.';
                else if (e.message) msg = e.message;
                errorDiv.textContent = msg;
                errorDiv.style.display = 'block';
            }
        }
    };

    window.handleForgotPassword = async () => {
        const email = document.getElementById('login-email').value;
        if (!email) return showAlert("Email required first.");
        await window.auth.sendPasswordReset(email);
    };
});
