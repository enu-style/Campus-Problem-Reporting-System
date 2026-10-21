import { useApp } from "../AppContext";

// ============================================================
// AUTH PAGE — login, register, forgot and reset password
// ============================================================
function AuthPage() {
  const {
    authMode,
    setAuthMode,
    email,
    setEmail,
    password,
    setPassword,
    message,
    loading,
    handleLogin,
    handleRegister,
    handleForgotPassword,
    handleResetPassword,
    forgotEmail,
    setForgotEmail,
    registerFullName,
    setRegisterFullName,
    registerEmail,
    setRegisterEmail,
    registerPassword,
    setRegisterPassword,
    confirmPassword,
    setConfirmPassword,
    resetNewPassword,
    setResetNewPassword,
    resetConfirmPassword,
    setResetConfirmPassword,
  } = useApp();

  return (
    <div className="login-page">
      <div className="login-background-shape shape-one"></div>
      <div className="login-background-shape shape-two"></div>

      <div className="login-card">
        <img
          src="/images/injibara-university-logo.png"
          alt="Injibara University Logo"
          className="university-logo"
        />

        <h1>Campus Reporting System</h1>

        {authMode === "login" && (
          <>
            <p className="login-subtitle">Sign in to your account</p>

            <form onSubmit={handleLogin}>
              <div className="input-group">
                <label htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="input-group">
                <label htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>

              <button type="submit" className="login-button" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <p className="auth-switch">
              <button
                type="button"
                className="auth-link"
                onClick={() => {
                  setForgotEmail(email);
                  setAuthMode("forgot");
                }}
              >
                Forgot your password?
              </button>
            </p>

            <p className="auth-switch">
              Don't have an account?{" "}
              <button
                type="button"
                className="auth-link"
                onClick={() => setAuthMode("register")}
              >
                Register as a student
              </button>
            </p>
          </>
        )}

        {authMode === "forgot" && (
          <>
            <p className="login-subtitle">Reset your password</p>

            <form onSubmit={handleForgotPassword}>
              <div className="input-group">
                <label htmlFor="forgot-email">Email</label>
                <input
                  id="forgot-email"
                  type="email"
                  placeholder="Enter your account email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <button type="submit" className="login-button" disabled={loading}>
                {loading ? "Requesting link..." : "Get Reset Link"}
              </button>
            </form>

            <p className="auth-switch">
              <button
                type="button"
                className="auth-link"
                onClick={() => setAuthMode("login")}
              >
                Back to Login
              </button>
            </p>
          </>
        )}

        {authMode === "reset" && (
          <>
            <p className="login-subtitle">Choose a new password</p>

            <form onSubmit={handleResetPassword}>
              <div className="input-group">
                <label htmlFor="reset-new-password">New Password</label>
                <input
                  id="reset-new-password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>

              <div className="input-group">
                <label htmlFor="reset-confirm-password">
                  Confirm New Password
                </label>
                <input
                  id="reset-confirm-password"
                  type="password"
                  placeholder="Enter the password again"
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>

              <button type="submit" className="login-button" disabled={loading}>
                {loading ? "Resetting password..." : "Reset Password"}
              </button>
            </form>

            <p className="auth-switch">
              <button
                type="button"
                className="auth-link"
                onClick={() => setAuthMode("login")}
              >
                Back to Login
              </button>
            </p>
          </>
        )}

        {authMode === "register" && (
          <>
            <p className="login-subtitle">Create your student account</p>

            <form onSubmit={handleRegister}>
              <div className="input-group">
                <label htmlFor="register-fullname">Full Name</label>
                <input
                  id="register-fullname"
                  type="text"
                  placeholder="Enter your full name"
                  value={registerFullName}
                  onChange={(e) => setRegisterFullName(e.target.value)}
                  autoComplete="name"
                  minLength={2}
                  required
                />
              </div>

              <div className="input-group">
                <label htmlFor="register-email">Email</label>
                <input
                  id="register-email"
                  type="email"
                  placeholder="Enter your email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="input-group">
                <label htmlFor="register-password">Password</label>
                <input
                  id="register-password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>

              <div className="input-group">
                <label htmlFor="confirm-password">Confirm Password</label>
                <input
                  id="confirm-password"
                  type="password"
                  placeholder="Enter the password again"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>

              <button type="submit" className="login-button" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>

            <p className="auth-switch">
              Already have an account?{" "}
              <button
                type="button"
                className="auth-link"
                onClick={() => setAuthMode("login")}
              >
                Back to Login
              </button>
            </p>
          </>
        )}

        {message && (
          <div className="login-message" role="status">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

export default AuthPage;
