window.router.addRoute('signup', (container) => {
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
                    <div style="background: #fff; width: 40px; height: 4px; margin-bottom: 2rem; opacity: 0.6;"></div>
                    <h1 style="font-size: 3.8rem; font-weight: 800; margin-bottom: 1.5rem; line-height: 1.1; letter-spacing: -0.02em;">${__('Join the')}<br>${__('Elite Circle.')}</h1>
                    <p style="font-size: 1.25rem; opacity: 0.85; max-width: 450px; line-height: 1.6; font-weight: 300;">${__("Unlock exclusive access to Ethiopia's most prestigious properties and high-end hospitality services.")}</p>
                </div>
            </div>

            <!-- Right Side: Form -->
            <div class="auth-form-panel">
                <div style="width: 100%; max-width: 440px;">
                    <div style="margin-bottom: 3rem;">
                        <h2 style="font-size: 2.2rem; color: var(--color-secondary); font-weight: 800; margin-bottom: 0.75rem;">${__('Create Account')}</h2>
                        <p style="color: var(--color-text-light); font-size: 1.05rem;">${__('Enter your details to start your journey.')}</p>
                    </div>

                    <form onsubmit="event.preventDefault(); window.handleSignup();">
                        <div style="display: grid; gap: 1.5rem;">
                            <div class="form-group" style="max-width: 100%;">
                                <label style="display: block; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--color-secondary); margin-bottom: 0.6rem;">${__('Full Legal Name')}</label>
                                <input type="text" id="signup-fullname" required placeholder="Abebe Kebede" 
                                    style="width:100%; box-sizing: border-box; border: 2px solid #f0f0f0; border-radius: 12px; padding: 1.1rem; font-size: 1rem; background: #f9f9f9;">
                            </div>

                            <div class="form-group" style="max-width: 100%;">
                                <label style="display: block; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--color-secondary); margin-bottom: 0.6rem;">${__('Email Address')}</label>
                                <input type="email" id="signup-email" required placeholder="email@domain.com" 
                                    style="width:100%; box-sizing: border-box; border: 2px solid #f0f0f0; border-radius: 12px; padding: 1.1rem; font-size: 1rem; background: #f9f9f9;">
                            </div>

                            <div class="form-group" style="max-width: 100%;">
                                <label style="display: block; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--color-secondary); margin-bottom: 0.6rem;">${__('Password')}</label>
                                <div style="position: relative;">
                                    <input type="password" id="signup-password" required placeholder="••••••••" 
                                        style="width:100%; box-sizing: border-box; border: 2px solid #f0f0f0; border-radius: 12px; padding: 1.1rem; padding-right: 48px; font-size: 1rem; background: #f9f9f9;">
                                    <button type="button" class="pw-toggle-btn" onclick="window.togglePasswordVisibility('signup-password', this)" title="Show password">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                            <circle cx="12" cy="12" r="3"></circle>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button type="submit" id="btn-signup" class="btn-primary" 
                            style="width: 100%; padding: 1.2rem; border-radius: 12px; font-size: 1.1rem; font-weight: 800; margin-top: 2.5rem; box-shadow: 0 12px 24px rgba(0, 102, 68, 0.2);">
                            ${__('Create My Profile')}
                        </button>
                    </form>

                    <p style="text-align: center; margin-top: 2.5rem; color: #666; font-size: 1rem;">
                        ${__('Already joined?')} <a href="#" onclick="event.preventDefault(); window.router.navigate('login')" 
                            style="color: var(--color-primary); font-weight: 800; text-decoration: none; border-bottom: 2px solid var(--color-primary-light);">${__('Sign In')}</a>
                    </p>
                </div>
            </div>
        </div>
    `;

    // Reuse the toggle function (defined in login.js or here as fallback)
    if (!window.togglePasswordVisibility) {
        window.togglePasswordVisibility = (inputId, btnEl) => {
            const input = document.getElementById(inputId);
            if (!input) return;
            const isHidden = input.type === 'password';
            input.type = isHidden ? 'text' : 'password';
            const svg = btnEl.querySelector('svg');
            if (isHidden) {
                svg.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`;
                btnEl.title = 'Hide password';
            } else {
                svg.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
                btnEl.title = 'Show password';
            }
        };
    }

    window.handleSignup = async () => {
        const fullName = document.getElementById('signup-fullname').value.trim();
        const email    = document.getElementById('signup-email').value.trim();
        const pass     = document.getElementById('signup-password').value;
        const role     = 'customer'; // Defaulted to customer as requested
        
        if (!email || !pass || !fullName) return showAlert('All fields required.');
        if (pass.length < 6) return showAlert('Password too short.');

        const btn = document.getElementById('btn-signup');
        const orig = btn.innerText; btn.innerText = __('Creating Account...'); btn.disabled = true;
        try {
            await window.auth.signup(email, pass, role, fullName);
        } catch(e) {
            btn.innerText = orig; btn.disabled = false;
        }
    };
});
