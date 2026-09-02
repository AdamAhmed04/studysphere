import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { authService } from '../services/authService';
import { errorMessage } from '../utils/errors';

interface ResetPasswordProps {
  onComplete: () => void;
}

export const ResetPassword: React.FC<ResetPasswordProps> = ({ onComplete }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSymbol: false,
  });

  const validatePassword = (password: string) => {
    const strength = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSymbol: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
    };
    setPasswordStrength(strength);
    return strength;
  };

  const isPasswordValid = (password: string) => {
    const strength = validatePassword(password);
    return Object.values(strength).every(Boolean);
  };

  const handlePasswordChange = (value: string) => {
    setNewPassword(value);
    validatePassword(value);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }

    if (!isPasswordValid(newPassword)) {
      setError('Password does not meet requirements');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await authService.updatePassword(newPassword);
      setSuccess(true);

      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err) {
      setError(errorMessage(err, 'Failed to reset password'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface rounded-2xl shadow-2xl p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-emerald-300" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-ink mb-2">Password Reset Successful!</h2>
            <p className="text-ink/75 mb-4">
              Your password has been updated successfully. You will be redirected to the app shortly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-ink mb-2">Reset Your Password</h2>
          <p className="text-ink/75">Enter your new password below</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="resetpassword-new-password" className="block text-sm font-medium text-ink/75 mb-2">
              New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-muted" />
              </div>
              <input id="resetpassword-new-password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => handlePasswordChange(e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-hairline rounded-lg focus:ring-2 focus:ring-sand focus:border-transparent"
                placeholder="Enter new password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-muted hover:text-ink" />
                ) : (
                  <Eye className="h-5 w-5 text-muted hover:text-ink" />
                )}
              </button>
            </div>

            {newPassword && (
              <div className="mt-3 p-3 bg-surface rounded-lg">
                <p className="text-sm font-medium text-ink/75 mb-2">Password Requirements:</p>
                <div className="space-y-1">
                  <div className={`flex items-center text-xs ${
                    passwordStrength.minLength ? 'text-emerald-300' : 'text-muted'
                  }`}>
                    <span className="mr-2">{passwordStrength.minLength ? '✓' : '○'}</span>
                    At least 8 characters
                  </div>
                  <div className={`flex items-center text-xs ${
                    passwordStrength.hasUppercase ? 'text-emerald-300' : 'text-muted'
                  }`}>
                    <span className="mr-2">{passwordStrength.hasUppercase ? '✓' : '○'}</span>
                    One uppercase letter (A-Z)
                  </div>
                  <div className={`flex items-center text-xs ${
                    passwordStrength.hasLowercase ? 'text-emerald-300' : 'text-muted'
                  }`}>
                    <span className="mr-2">{passwordStrength.hasLowercase ? '✓' : '○'}</span>
                    One lowercase letter (a-z)
                  </div>
                  <div className={`flex items-center text-xs ${
                    passwordStrength.hasNumber ? 'text-emerald-300' : 'text-muted'
                  }`}>
                    <span className="mr-2">{passwordStrength.hasNumber ? '✓' : '○'}</span>
                    One number (0-9)
                  </div>
                  <div className={`flex items-center text-xs ${
                    passwordStrength.hasSymbol ? 'text-emerald-300' : 'text-muted'
                  }`}>
                    <span className="mr-2">{passwordStrength.hasSymbol ? '✓' : '○'}</span>
                    One symbol (!@#$%^&*...)
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="resetpassword-confirm-new-password" className="block text-sm font-medium text-ink/75 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-muted" />
              </div>
              <input id="resetpassword-confirm-new-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError('');
                }}
                className="w-full pl-10 pr-12 py-3 border border-hairline rounded-lg focus:ring-2 focus:ring-sand focus:border-transparent"
                placeholder="Confirm new password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5 text-muted hover:text-ink" />
                ) : (
                  <Eye className="h-5 w-5 text-muted hover:text-ink" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 rounded-lg">
              <p className="text-sm text-red-300 text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !newPassword || !confirmPassword}
            className="w-full py-3 px-4 bg-sand text-white rounded-lg font-medium hover:bg-sand-lo focus:ring-2 focus:ring-offset-2 focus:ring-sand disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Resetting Password...
              </div>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
